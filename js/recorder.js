import { JOINTS, clampAll } from './kinematics.js';

export const MACRO_SLOTS = 6;

export function createRecorder() {
  return { recording: false, t0: 0, samples: [] };
}

export function recorderStart(rec, t, angles) {
  rec.recording = true;
  rec.t0 = t;
  rec.samples = [{ t: 0, angles: clampAll(angles) }];
}

export function recorderSample(rec, t, angles) {
  if (!rec.recording) return;
  const time = t - rec.t0;
  const last = rec.samples[rec.samples.length - 1];
  if (last && time - last.t < 1 / 60) return;
  rec.samples.push({ t: time, angles: clampAll(angles) });
}

export function recorderStop(rec, t, angles) {
  if (!rec.recording) return null;
  recorderSample(rec, t, angles);
  rec.recording = false;
  return normalizeMacro(rec.samples);
}

export function normalizeMacro(samples) {
  if (!samples || samples.length < 2) return null;
  const clean = samples
    .filter((s, i) => i === 0 || s.t > samples[i - 1].t)
    .map((s) => ({ t: s.t, angles: clampAll(s.angles) }));
  if (clean.length < 2) return null;
  return clean;
}

export function macroDuration(macro) {
  return macro && macro.length ? macro[macro.length - 1].t : 0;
}

export function macroPoseAt(macro, t) {
  if (!macro || macro.length === 0) return JOINTS.map((j) => j.home);
  if (t <= macro[0].t) return [...macro[0].angles];
  const last = macro[macro.length - 1];
  if (t >= last.t) return [...last.angles];
  let lo = 0;
  let hi = macro.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (macro[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = macro[lo];
  const b = macro[hi];
  const s = (t - a.t) / (b.t - a.t);
  return a.angles.map((v, i) => v + (b.angles[i] - v) * s);
}
