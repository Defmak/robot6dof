import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import * as THREE from 'three';
import { buildTargets, releaseTarget, stepFall, GRAVITY, FALL_SPEEDUP } from '../js/objects.js';

function freshTarget() {
  const scene = new THREE.Scene();
  return buildTargets(scene)[0];
}

test('un objet lâché retombe à la verticale et s’arrête au sol', () => {
  const t = freshTarget();
  t.group.position.set(0.5, 1.2, 0.3);
  releaseTarget(t);
  assert.equal(t.held, false);
  assert.equal(t.falling, true);
  const x0 = t.group.position.x;
  const z0 = t.group.position.z;
  let time = 0;
  const dt = 1 / 120;
  while (t.falling && time < 5) {
    stepFall(t, dt);
    time += dt;
    assert.equal(t.group.position.x, x0, 'pas de déplacement horizontal');
    assert.equal(t.group.position.z, z0, 'pas de déplacement en profondeur');
  }
  assert.equal(t.falling, false, 'chute terminée');
  assert.equal(t.group.position.y, 0, 'objet posé au sol');
  assert.ok(time < 1.5, `chute rapide (${time.toFixed(2)} s depuis 1.2 m)`);
});

test('la chute accélère (gravité accélérée x3)', () => {
  const t = freshTarget();
  t.group.position.y = 2;
  releaseTarget(t);
  const dt = 0.01;
  stepFall(t, dt);
  assert.ok(Math.abs(t.vy - GRAVITY * FALL_SPEEDUP * dt) < 1e-9);
  const y1 = t.group.position.y;
  stepFall(t, dt);
  const dy1 = 2 - y1;
  const dy2 = y1 - t.group.position.y;
  assert.ok(dy2 > dy1, 'la vitesse augmente à chaque pas');
});

test('stepFall ne touche pas un objet tenu ou au sol', () => {
  const t = freshTarget();
  t.held = true;
  t.group.position.y = 0.5;
  stepFall(t, 0.016);
  assert.equal(t.group.position.y, 0.5, 'objet tenu inchangé');
  const u = freshTarget();
  u.group.position.y = 0;
  stepFall(u, 0.016);
  assert.equal(u.group.position.y, 0, 'objet au sol inchangé');
  assert.equal(u.falling, false);
});
