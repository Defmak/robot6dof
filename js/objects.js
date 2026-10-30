import * as THREE from 'three';

export const GRAB_DISTANCE = 0.14;

const TARGET_DEFS = [
  { color: 0x4fc3f7, pos: [0.9, 0, 0.45] },
  { color: 0xaed581, pos: [-0.85, 0, 0.55] },
  { color: 0xffb74d, pos: [0.25, 0, -0.95] },
];

export function buildTargets(scene) {
  const targets = [];
  for (const d of TARGET_DEFS) {
    const group = new THREE.Group();
    group.position.set(d.pos[0], d.pos[1], d.pos[2]);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: d.color, metalness: 0.3, roughness: 0.5 })
    );
    body.position.y = 0.09;
    body.castShadow = true;
    body.receiveShadow = true;

    const handleMat = new THREE.MeshStandardMaterial({
      color: 0xeceff1,
      metalness: 0.8,
      roughness: 0.3,
    });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 16), handleMat);
    handle.position.y = 0.24;
    handle.castShadow = true;

    group.add(body, handle);
    scene.add(group);
    targets.push({ group, handle, handleMat, held: false });
  }
  return targets;
}

export function handleWorldPosition(target) {
  target.group.updateMatrixWorld(true);
  return target.handle.getWorldPosition(new THREE.Vector3());
}

export function findGrabbable(tcpPos, targets) {
  let best = null;
  let bestD = GRAB_DISTANCE;
  for (const t of targets) {
    if (t.held) continue;
    const d = tcpPos.distanceTo(handleWorldPosition(t));
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

export function setHighlight(targets, active) {
  for (const t of targets) {
    t.handleMat.emissive.setHex(t === active ? 0x00e5ff : 0x000000);
  }
}

export const GRAVITY = 9.81;
export const FALL_SPEEDUP = 3;

export function releaseTarget(t) {
  t.held = false;
  t.falling = true;
  t.vy = 0;
}

export function stepFall(t, dt) {
  if (!t.falling || t.held) return;
  t.vy += GRAVITY * FALL_SPEEDUP * dt;
  t.group.position.y -= t.vy * dt;
  if (t.group.position.y <= 0) {
    t.group.position.y = 0;
    t.falling = false;
    t.vy = 0;
  }
}
