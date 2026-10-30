export const JOINTS = [
  { id: 'J1', name: 'Base — rotation verticale', axis: 'z', min: -170, max: 170, home: 0 },
  { id: 'J2', name: 'Épaule', axis: 'y', min: -65, max: 120, home: 30 },
  { id: 'J3', name: 'Coude', axis: 'y', min: -140, max: 140, home: -60 },
  { id: 'J4', name: 'Poignet — rotation (roll)', axis: 'z', min: -180, max: 180, home: 0 },
  { id: 'J5', name: 'Poignet — inclinaison (pitch)', axis: 'y', min: -120, max: 120, home: -40 },
  { id: 'J6', name: 'Outil — rotation (roll)', axis: 'z', min: -270, max: 270, home: 0 },
];

export const LINK_LENGTHS = [0.5, 0.75, 0.62, 0.28, 0.22];

export const DEMO_MOVE_TIME = 2.2;

export const DEMO_KEYFRAMES = [
  { pose: [0, 30, -60, 0, -40, 0], hold: 1.0 },
  { pose: [-45, 75, -95, 0, -15, 0], hold: 0.8 },
  { pose: [-45, 25, -55, 0, -35, 90], hold: 0.8 },
  { pose: [65, 40, -85, 45, -50, 180], hold: 0.8 },
  { pose: [65, 80, -105, 45, -15, 180], hold: 0.8 },
  { pose: [0, 30, -60, 0, -40, 0], hold: 1.2 },
];

export function deg2rad(deg) {
  return (deg * Math.PI) / 180;
}

export function clampDeg(joint, deg) {
  return Math.min(joint.max, Math.max(joint.min, deg));
}

export function clampAll(anglesDeg) {
  return JOINTS.map((j, i) => clampDeg(j, anglesDeg[i] ?? j.home));
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

export function demoCycleDuration() {
  const holds = DEMO_KEYFRAMES.reduce((s, k) => s + k.hold, 0);
  return DEMO_KEYFRAMES.length * DEMO_MOVE_TIME + holds;
}

export function demoPoseAt(t) {
  const n = DEMO_KEYFRAMES.length;
  const total = demoCycleDuration();
  let time = ((t % total) + total) % total;
  for (let i = 0; i < n; i++) {
    const from = DEMO_KEYFRAMES[i].pose;
    const to = DEMO_KEYFRAMES[(i + 1) % n].pose;
    if (time < DEMO_MOVE_TIME) {
      const s = smoothstep(time / DEMO_MOVE_TIME);
      return from.map((v, j) => v + (to[j] - v) * s);
    }
    time -= DEMO_MOVE_TIME;
    const hold = DEMO_KEYFRAMES[(i + 1) % n].hold;
    if (time < hold) return [...to];
    time -= hold;
  }
  return [...DEMO_KEYFRAMES[0].pose];
}
