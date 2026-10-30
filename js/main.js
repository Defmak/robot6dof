import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { JOINTS, clampAll, demoPoseAt, demoCycleDuration } from './kinematics.js';
import { buildRobot, applyAngles, tcpWorldPosition, setGripper } from './robot3d.js';
import { buildTargets, findGrabbable, handleWorldPosition, setHighlight } from './objects.js';

const canvasContainer = document.getElementById('scene');
const slidersEl = document.getElementById('sliders');
const demoBtn = document.getElementById('demo-btn');
const resetBtn = document.getElementById('reset-btn');
const gripBtn = document.getElementById('grip-btn');
const tcpEl = document.getElementById('tcp-readout');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
canvasContainer.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10141b);
scene.fog = new THREE.Fog(0x10141b, 8, 22);

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
camera.position.set(2.8, 2.1, 3.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.6;
controls.maxDistance = 12;
controls.maxPolarAngle = Math.PI * 0.52;
controls.target.set(0, 1.0, 0);

scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x1a1d24, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(4, 6, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -3;
key.shadow.camera.right = 3;
key.shadow.camera.top = 3;
key.shadow.camera.bottom = -3;
key.shadow.camera.far = 20;
scene.add(key);
const rim = new THREE.DirectionalLight(0x88aaff, 0.7);
rim.position.set(-5, -2, -4);
scene.add(rim);

const ground = new THREE.Mesh(
  new THREE.CylinderGeometry(4, 4, 0.06, 64),
  new THREE.MeshStandardMaterial({ color: 0x1b2029, metalness: 0.1, roughness: 0.9 })
);
ground.position.y = -0.03;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.PolarGridHelper(4, 16, 8, 64, 0x3a4356, 0x262c38);
grid.position.y = 0.001;
scene.add(grid);

const robot = buildRobot();
robot.group.traverse((o) => {
  if (o.isMesh) o.castShadow = true;
});
scene.add(robot.group);
setGripper(robot, 1);

const targets = buildTargets(scene);

const tcpMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.035, 16, 12),
  new THREE.MeshBasicMaterial({ color: 0x00e5ff })
);
scene.add(tcpMarker);
const tcpRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.07, 0.006, 10, 40),
  new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.7 })
);
scene.add(tcpRing);

const trail = [];
const trailMax = 260;
const trailGeo = new THREE.BufferGeometry();
const trailLine = new THREE.Line(
  trailGeo,
  new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.45 })
);
trailLine.frustumCulled = false;
scene.add(trailLine);

const state = {
  angles: JOINTS.map((j) => j.home),
  demo: false,
  demoStart: 0,
  gripOpen: true,
  gripAmount: 1,
};

function setGripOpen(open) {
  state.gripOpen = open;
  gripBtn.textContent = open ? '🤏 Fermer la pince' : '✋ Ouvrir la pince';
  gripBtn.classList.toggle('active', !open);
}

gripBtn.addEventListener('click', () => {
  stopDemo();
  setGripOpen(!state.gripOpen);
});

JOINTS.forEach((j, i) => {
  const row = document.createElement('div');
  row.className = 'joint-row';
  row.innerHTML = `
    <div class="joint-head">
      <span class="joint-name">${j.id} · ${j.name}</span>
      <span class="joint-val" id="val-${j.id}">${j.home.toFixed(0)}°</span>
    </div>
    <input type="range" id="slider-${j.id}" min="${j.min}" max="${j.max}" step="0.1" value="${j.home}"
      aria-label="${j.id} ${j.name}">
  `;
  slidersEl.appendChild(row);
  const slider = row.querySelector(`#slider-${j.id}`);
  slider.addEventListener('input', () => {
    stopDemo();
    state.angles[i] = parseFloat(slider.value);
    row.querySelector(`#val-${j.id}`).textContent = `${state.angles[i].toFixed(1)}°`;
  });
});

function syncSliders() {
  JOINTS.forEach((j, i) => {
    const slider = document.getElementById(`slider-${j.id}`);
    slider.value = state.angles[i];
    document.getElementById(`val-${j.id}`).textContent = `${state.angles[i].toFixed(1)}°`;
  });
}

function stopDemo() {
  if (!state.demo) return;
  state.demo = false;
  demoBtn.textContent = '▶ Mode démo';
  demoBtn.classList.remove('active');
}

demoBtn.addEventListener('click', () => {
  state.demo = !state.demo;
  demoBtn.textContent = state.demo ? '⏸ Arrêter la démo' : '▶ Mode démo';
  demoBtn.classList.toggle('active', state.demo);
  if (state.demo) state.demoStart = clock.elapsedTime;
});

resetBtn.addEventListener('click', () => {
  stopDemo();
  state.angles = JOINTS.map((j) => j.home);
  syncSliders();
});

function resize() {
  const w = canvasContainer.clientWidth;
  const h = canvasContainer.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvasContainer);
resize();

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  if (state.demo) {
    state.angles = clampAll(demoPoseAt(t - state.demoStart));
    syncSliders();
  }
  applyAngles(robot.joints, state.angles);

  const tcp = tcpWorldPosition(robot);
  tcpMarker.position.copy(tcp);
  tcpRing.position.copy(tcp);
  tcpRing.lookAt(camera.position);
  tcpEl.textContent = `TCP : x ${tcp.x.toFixed(2)} · y ${tcp.y.toFixed(2)} · z ${tcp.z.toFixed(2)} m`;

  if (state.demo) setGripOpen(findGrabbable(tcp, targets) === null);
  state.gripAmount += ((state.gripOpen ? 1 : 0) - state.gripAmount) * 0.2;
  setGripper(robot, state.gripAmount);

  const held = targets.find((t) => t.held);
  if (state.gripAmount < 0.5 && !held) {
    const g = findGrabbable(tcp, targets);
    if (g) g.held = true;
  }
  if (state.gripAmount > 0.5 && held) held.held = false;
  if (held) {
    held.group.position.copy(tcp).sub(held.handle.position);
  }
  setHighlight(targets, state.gripAmount < 0.5 ? null : findGrabbable(tcp, targets));

  if (state.demo) {
    trail.push(tcp.clone());
    if (trail.length > trailMax) trail.shift();
    const pos = new Float32Array(trail.length * 3);
    trail.forEach((p, i) => pos.set([p.x, p.y, p.z], i * 3));
    trailGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  } else if (trail.length > 0) {
    trail.length = 0;
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

export { state, demoCycleDuration };
