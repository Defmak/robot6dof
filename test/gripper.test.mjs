import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import * as THREE from 'three';
import { buildRobot, setGripper, GRIPPER_REST_X, GRIPPER_MAX_OPEN_X } from '../js/robot3d.js';
import { buildTargets, findGrabbable, handleWorldPosition, setHighlight, GRAB_DISTANCE } from '../js/objects.js';

test('la pince a deux doigts et setGripper les écarte/referme', () => {
  const r = buildRobot();
  assert.ok(r.gripper.left && r.gripper.right);
  setGripper(r, 0);
  assert.ok(Math.abs(r.gripper.left.position.x - GRIPPER_REST_X) < 1e-9, 'fermée au repos');
  assert.ok(Math.abs(r.gripper.right.position.x + GRIPPER_REST_X) < 1e-9);
  setGripper(r, 1);
  assert.ok(Math.abs(r.gripper.left.position.x - (GRIPPER_REST_X + GRIPPER_MAX_OPEN_X)) < 1e-9, 'ouverte au max');
  setGripper(r, 0.5);
  assert.ok(Math.abs(r.gripper.left.position.x - (GRIPPER_REST_X + GRIPPER_MAX_OPEN_X / 2)) < 1e-9);
  setGripper(r, 99);
  assert.ok(Math.abs(r.gripper.left.position.x - (GRIPPER_REST_X + GRIPPER_MAX_OPEN_X)) < 1e-9, 'borné à 1');
  setGripper(r, -5);
  assert.ok(Math.abs(r.gripper.left.position.x - GRIPPER_REST_X) < 1e-9, 'borné à 0');
});

test('trois objets avec poignée sont placés au sol', () => {
  const scene = new THREE.Scene();
  const targets = buildTargets(scene);
  assert.equal(targets.length, 3);
  for (const t of targets) {
    assert.ok(Math.abs(t.group.position.y) < 1e-9, 'objet posé au sol');
    const hp = handleWorldPosition(t);
    assert.ok(hp.y > 0.15 && hp.y < 0.35, `poignée au-dessus de l’objet (y=${hp.y})`);
    assert.ok(Math.hypot(hp.x, hp.z) > 0.3, 'poignée éloignée de la base du robot');
  }
});

test('findGrabbable ne saisit que si le TCP est assez proche', () => {
  const scene = new THREE.Scene();
  const targets = buildTargets(scene);
  const near = handleWorldPosition(targets[0]);
  const g = findGrabbable(near, targets);
  assert.equal(g, targets[0], 'poignée proche saisie');
  const far = near.clone().add(new THREE.Vector3(GRAB_DISTANCE + 0.1, 0, 0));
  assert.equal(findGrabbable(far, targets), null, 'trop loin : rien');
  targets[1].held = true;
  const p = handleWorldPosition(targets[1]);
  assert.equal(findGrabbable(p, targets), null, 'objet déjà tenu ignoré');
});

test('setHighlight colore uniquement la cible active', () => {
  const scene = new THREE.Scene();
  const targets = buildTargets(scene);
  setHighlight(targets, targets[2]);
  assert.equal(targets[2].handleMat.emissive.getHex(), 0x00e5ff);
  assert.equal(targets[0].handleMat.emissive.getHex(), 0x000000);
  setHighlight(targets, null);
  assert.equal(targets[2].handleMat.emissive.getHex(), 0x000000);
});
