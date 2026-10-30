import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  createRecorder,
  recorderStart,
  recorderSample,
  recorderStop,
  normalizeMacro,
  macroPoseAt,
  macroDuration,
  MACRO_SLOTS,
} from '../js/recorder.js';
import { JOINTS } from '../js/kinematics.js';

const HOME = JOINTS.map((j) => j.home);

test('6 slots de macros prévus', () => {
  assert.equal(MACRO_SLOTS, 6);
});

test('enregistrement : start, échantillons, stop renvoie une macro normalisée', () => {
  const rec = createRecorder();
  recorderStart(rec, 100, HOME);
  assert.equal(rec.recording, true);
  recorderSample(rec, 100.5, [10, 40, -50, 0, -40, 0]);
  recorderSample(rec, 101.0, [20, 50, -40, 5, -30, 10]);
  const macro = recorderStop(rec, 101.2, [20, 50, -40, 5, -30, 10]);
  assert.equal(rec.recording, false);
  assert.ok(Array.isArray(macro));
  assert.ok(macro.length >= 3, `${macro.length} échantillons`);
  assert.equal(macro[0].t, 0, 'macro démarre à t=0');
  assert.ok(macroDuration(macro) >= 1.2, `durée ${macroDuration(macro)}`);
  for (const s of macro) {
    s.angles.forEach((v, i) => {
      assert.ok(v >= JOINTS[i].min && v <= JOINTS[i].max, `angle ${i}=${v} borné`);
    });
  }
});

test('stop sans start ne renvoie rien', () => {
  const rec = createRecorder();
  assert.equal(recorderStop(rec, 1, HOME), null);
});

test('macroPoseAt interpole entre les échantillons et borne les extrémités', () => {
  const macro = [
    { t: 0, angles: [0, 0, 0, 0, 0, 0] },
    { t: 2, angles: [10, 20, 30, 40, 50, 60] },
  ];
  const at0 = macroPoseAt(macro, 0);
  assert.deepEqual(at0, [0, 0, 0, 0, 0, 0]);
  const at1 = macroPoseAt(macro, 1);
  at1.forEach((v, i) => assert.ok(Math.abs(v - (i + 1) * 5) < 1e-9, `intermédiaire axe ${i}`));
  const atEnd = macroPoseAt(macro, 99);
  assert.deepEqual(atEnd, [10, 20, 30, 40, 50, 60], 'borne après la fin');
  const before = macroPoseAt(macro, -5);
  assert.deepEqual(before, [0, 0, 0, 0, 0, 0], 'borne avant le début');
});

test('normalizeMacro refuse les enregistrements trop courts et nettoie les doublons de temps', () => {
  assert.equal(normalizeMacro([{ t: 0, angles: HOME }]), null);
  assert.equal(normalizeMacro([]), null);
  const dirty = [
    { t: 0, angles: HOME },
    { t: 0, angles: HOME },
    { t: 1, angles: [9999, 0, 0, 0, 0, 0] },
  ];
  const m = normalizeMacro(dirty);
  assert.equal(m.length, 2);
  assert.equal(m[1].angles[0], JOINTS[0].max, 'angles bornés à la normalisation');
});

test('recorderSample ignore les échantillons trop rapprochés (< 1/60 s)', () => {
  const rec = createRecorder();
  recorderStart(rec, 0, HOME);
  recorderSample(rec, 0.001, [1, 1, 1, 1, 1, 1]);
  assert.equal(rec.samples.length, 1, 'échantillon ignoré');
  recorderSample(rec, 0.02, [2, 2, 2, 2, 2, 2]);
  assert.equal(rec.samples.length, 2, 'échantillon accepté');
  recorderSample(rec, 0.5, HOME);
  assert.equal(rec.samples.length, 3);
});
