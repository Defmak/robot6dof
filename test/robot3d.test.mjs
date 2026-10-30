import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import * as THREE from 'three';
import { JOINTS, LINK_LENGTHS } from '../js/kinematics.js';
import { buildRobot, applyAngles, tcpWorldPosition } from '../js/robot3d.js';

test('le robot a 7 groupes d’articulation et un TCP', () => {
  const r = buildRobot();
  assert.equal(r.joints.length, 7);
  assert.ok(r.tcp.isObject3D);
  assert.ok(r.group.children.length > 0);
});

test('applyAngles applique la rotation sur le bon axe', () => {
  const r = buildRobot();
  const angles = [10, 20, 30, 40, 50, 60, 70];
  applyAngles(r.joints, angles);
  JOINTS.forEach((j, i) => {
    const expected = (angles[i] * Math.PI) / 180;
    assert.ok(Math.abs(r.joints[i].rotation[j.axis] - expected) < 1e-9, `axe ${j.id}`);
  });
});

test('applyAngles borne les valeurs hors limites', () => {
  const r = buildRobot();
  applyAngles(r.joints, [99999, -99999, 0, 0, 0, 0, 0]);
  assert.ok(Math.abs(r.joints[0].rotation.z - (JOINTS[0].max * Math.PI) / 180) < 1e-9);
  assert.ok(Math.abs(r.joints[1].rotation.y - (JOINTS[1].min * Math.PI) / 180) < 1e-9);
});

test('le robot est perpendiculaire au sol : axe du bras selon Y (vertical)', () => {
  const r = buildRobot();
  applyAngles(r.joints, [0, 0, 0, 0, 0, 0, 0]);
  const up = tcpWorldPosition(r);
  const total = 0.36 + LINK_LENGTHS.reduce((s, l) => s + l, 0) + 0.34;
  assert.ok(Math.abs(up.y - total) < 1e-6, `TCP y=${up.y}, attendu ${total}`);
  assert.ok(Math.abs(up.x) < 1e-9 && Math.abs(up.z) < 1e-9, 'TCP sur l’axe vertical');
  assert.ok(up.y > 0, 'le bras se dresse au-dessus du sol (y > 0)');

  applyAngles(r.joints, [0, 90, 0, 0, 0, 0, 0]);
  const horiz = tcpWorldPosition(r);
  const reach = LINK_LENGTHS.slice(1).reduce((s, l) => s + l, 0) + 0.34;
  const d = Math.hypot(horiz.x, horiz.z);
  assert.ok(Math.abs(d - reach) < 1e-6, `portée horizontale ${d} vs ${reach}`);
  assert.ok(Math.abs(horiz.y - LINK_LENGTHS[0] - 0.36) < 1e-6, `hauteur ${horiz.y}`);
});

test('rotation J1 déplace le TCP autour de l’axe vertical Y', () => {
  const r = buildRobot();
  applyAngles(r.joints, [0, 45, -45, 0, 0, 0, 0]);
  const p0 = tcpWorldPosition(r);
  applyAngles(r.joints, [90, 45, -45, 0, 0, 0, 0]);
  const p90 = tcpWorldPosition(r);
  assert.ok(Math.abs(p0.y - p90.y) < 1e-9, 'y inchangé');
  const r0 = Math.hypot(p0.x, p0.z);
  const r90 = Math.hypot(p90.x, p90.z);
  assert.ok(Math.abs(r0 - r90) < 1e-9, 'même rayon');
  assert.ok(r0 > 0.05, 'TCP hors de l’axe');
  const angle = Math.atan2(p90.z, p90.x) - Math.atan2(p0.z, p0.x);
  const norm = ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
  assert.ok(Math.abs(Math.abs(norm) - Math.PI / 2) < 1e-6, `rotation de 90° (obtenu ${norm})`);
});

test('la position du TCP reste dans l’enveloppe atteignable', () => {
  const r = buildRobot();
  const reachMax = 0.36 + LINK_LENGTHS.reduce((s, l) => s + l, 0) + 0.34;
  for (let i = 0; i < 200; i++) {
    const angles = JOINTS.map((j) => j.min + Math.random() * (j.max - j.min));
    applyAngles(r.joints, angles);
    const p = tcpWorldPosition(r);
    const d = p.length();
    assert.ok(d <= reachMax + 1e-6, `hors enveloppe: ${d} > ${reachMax}`);
  }
});

test('la base est un cône solidaire de J1 et posée sur le sol', () => {
  const r = buildRobot();
  const cone = r.joints[0].children.find((c) => c.isMesh && c.geometry.type === 'CylinderGeometry');
  assert.ok(cone, 'cône présent dans le groupe J1');
  assert.ok(Math.abs(cone.geometry.parameters.radiusTop - 0.24) < 1e-9, 'petit rayon au sommet');
  assert.ok(Math.abs(cone.geometry.parameters.radiusBottom - 0.52) < 1e-9, 'grand rayon à la base');
  assert.ok(cone.geometry.parameters.radiusBottom > cone.geometry.parameters.radiusTop, 'base évasée vers le sol');
  assert.ok(Math.abs(cone.rotation.x - Math.PI / 2) < 1e-9, 'axe du cône vertical (local Z)');
  r.group.updateMatrixWorld(true);
  const h = cone.geometry.parameters.height / 2;
  const topWorld = cone.localToWorld(new THREE.Vector3(0, h, 0));
  const botWorld = cone.localToWorld(new THREE.Vector3(0, -h, 0));
  assert.ok(Math.abs(botWorld.y) < 1e-9, `grand rayon au sol (y=${botWorld.y})`);
  assert.ok(Math.abs(topWorld.y - 0.36) < 1e-9, `petit rayon au niveau de la sphère J1 (y=${topWorld.y})`);

  applyAngles(r.joints, [90, 0, 0, 0, 0, 0]);
  assert.ok(Math.abs(r.joints[0].rotation.z - Math.PI / 2) < 1e-9, 'le cône tourne avec J1');
});

test('les maillons sont des meshes 3D', () => {
  const r = buildRobot();
  let meshes = 0;
  r.group.traverse((o) => {
    if (o.isMesh) meshes++;
  });
  assert.ok(meshes >= 10, `${meshes} meshes`);
  const v = new THREE.Vector3();
  r.group.updateMatrixWorld(true);
  r.group.getWorldPosition(v);
  assert.deepEqual([v.x, v.y, v.z], [0, 0, 0]);
});
