import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildRobot, applyAngles, tcpWorldPosition, tryAngles, GROUND_MIN_Y } from '../js/robot3d.js';

test('tryAngles accepte une pose valide au-dessus du sol', () => {
  const r = buildRobot();
  const ok = tryAngles(r, [0, 30, -60, 0, 0, -40, 0]);
  assert.equal(ok, true);
  assert.ok(tcpWorldPosition(r).y >= GROUND_MIN_Y);
});

test('tryAngles refuse et restaure la pose si le TCP passe sous le sol', () => {
  const r = buildRobot();
  applyAngles(r.joints, [0, 30, -60, 0, 0, -40, 0]);
  const before = tcpWorldPosition(r).clone();
  const bad = [139, 120, 54, -19, 7, 40, 99];
  const ok = tryAngles(r, bad);
  assert.equal(ok, false, 'pose sous le sol refusée');
  const after = tcpWorldPosition(r);
  assert.ok(Math.abs(after.x - before.x) < 1e-9 && Math.abs(after.y - before.y) < 1e-9 && Math.abs(after.z - before.z) < 1e-9,
    'pose précédente restaurée');
});

test('tryAngles respecte un seuil personnalisé', () => {
  const r = buildRobot();
  applyAngles(r.joints, [0, 60, -40, 0, 0, -20, 0]);
  const y = tcpWorldPosition(r).y;
  const ok = tryAngles(r, [0, 60, -40, 0, 0, -20, 0], y + 0.001);
  assert.equal(ok, false, 'seuil plus haut que la hauteur actuelle refuse');
  const ok2 = tryAngles(r, [0, 60, -40, 0, 0, -20, 0], y - 0.001);
  assert.equal(ok2, true, 'seuil plus bas accepte');
});

test('aucune combinaison extrême ne fait passer le TCP sous GROUND_MIN_Y via tryAngles', () => {
  const r = buildRobot();
  const poses = [
    [139, 120, 54, -19, 7, 40, 99],
    [170, -65, 140, 180, 60, 120, 270],
    [-170, 120, -140, -180, -60, -120, -270],
    [45, -65, 140, 0, 30, 120, 0],
  ];
  for (const p of poses) {
    applyAngles(r.joints, [0, 30, -60, 0, 0, -40, 0]);
    tryAngles(r, p);
    assert.ok(tcpWorldPosition(r).y >= GROUND_MIN_Y - 1e-9, `pose ${p} : y=${tcpWorldPosition(r).y}`);
  }
});
