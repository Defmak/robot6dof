import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  JOINTS,
  LINK_LENGTHS,
  clampDeg,
  clampAll,
  demoPoseAt,
  demoCycleDuration,
  DEMO_KEYFRAMES,
  DEMO_MOVE_TIME,
} from '../js/kinematics.js';

test('6 degrés de liberté définis avec limites cohérentes', () => {
  assert.equal(JOINTS.length, 6);
  for (const j of JOINTS) {
    assert.ok(j.min < j.max, `${j.id}: min < max`);
    assert.ok(j.home >= j.min && j.home <= j.max, `${j.id}: home dans les limites`);
    assert.ok(['x', 'y', 'z'].includes(j.axis), `${j.id}: axe valide`);
  }
});

test('5 longueurs de maillons pour 6 articulations', () => {
  assert.equal(LINK_LENGTHS.length, JOINTS.length - 1);
  for (const l of LINK_LENGTHS) assert.ok(l > 0);
});

test('clampDeg respecte les butées', () => {
  const j = JOINTS[0];
  assert.equal(clampDeg(j, 9999), j.max);
  assert.equal(clampDeg(j, -9999), j.min);
  assert.equal(clampDeg(j, 42), 42);
});

test('clampAll borne chaque angle et complète les valeurs manquantes', () => {
  const clamped = clampAll([9999, -9999, 10, undefined, 0, 5000]);
  assert.equal(clamped[0], JOINTS[0].max);
  assert.equal(clamped[1], JOINTS[1].min);
  assert.equal(clamped[2], 10);
  assert.equal(clamped[3], JOINTS[3].home);
  assert.equal(clamped[5], JOINTS[5].max);
});

test('la démo est périodique et bornée', () => {
  const total = demoCycleDuration();
  assert.ok(total > 0);
  const a = demoPoseAt(0);
  const b = demoPoseAt(total);
  a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9, `pose périodique axe ${i}`));
  for (let t = 0; t < total; t += 0.05) {
    const p = demoPoseAt(t);
    p.forEach((v, i) => {
      assert.ok(v >= JOINTS[i].min - 1e-9 && v <= JOINTS[i].max + 1e-9, `t=${t} axe ${i}=${v}`);
    });
  }
});

test('la démo atteint chaque image clé', () => {
  const total = demoCycleDuration();
  const dt = 0.01;
  const seen = DEMO_KEYFRAMES.map(() => false);
  for (let t = 0; t < total; t += dt) {
    const p = demoPoseAt(t);
    DEMO_KEYFRAMES.forEach((k, ki) => {
      if (p.every((v, j) => Math.abs(v - k.pose[j]) < 1e-6)) seen[ki] = true;
    });
  }
  seen.forEach((s, ki) => assert.ok(s, `image clé ${ki} atteinte`));
});

test('demoPoseAt gère les temps négatifs et le wrap', () => {
  const total = demoCycleDuration();
  const p1 = demoPoseAt(-0.5);
  const p2 = demoPoseAt(total - 0.5);
  p1.forEach((v, i) => assert.ok(Math.abs(v - p2[i]) < 1e-9));
  assert.equal(DEMO_MOVE_TIME > 0, true);
});
