import * as THREE from 'three';
import { JOINTS, LINK_LENGTHS, deg2rad, clampDeg } from './kinematics.js';

const L = LINK_LENGTHS;
const TOOL_LENGTH = 0.2;

const matBody = new THREE.MeshStandardMaterial({ color: 0xff7a1a, metalness: 0.35, roughness: 0.4 });
const matDark = new THREE.MeshStandardMaterial({ color: 0x2b2f36, metalness: 0.6, roughness: 0.35 });
const matSteel = new THREE.MeshStandardMaterial({ color: 0xb8bec8, metalness: 0.9, roughness: 0.25 });

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function zCylinder(r, h, material) {
  const m = mesh(new THREE.CylinderGeometry(r, r, h, 32), material);
  m.rotation.x = Math.PI / 2;
  return m;
}

function jointSphere(r, material = matSteel) {
  return mesh(new THREE.SphereGeometry(r, 24, 18), material);
}

export function buildRobot() {
  const robot = new THREE.Group();
  robot.rotation.x = -Math.PI / 2;

  const j1 = new THREE.Group();
  j1.position.z = 0.36;
  robot.add(j1);
  const baseCone = mesh(new THREE.CylinderGeometry(0.24, 0.52, 0.36, 40), matDark, 0, 0, -0.18);
  baseCone.rotation.x = Math.PI / 2;
  j1.add(baseCone);
  j1.add(jointSphere(0.21));
  const link1 = zCylinder(0.15, L[0], matBody);
  link1.position.z = L[0] / 2;
  j1.add(link1);

  const j2 = new THREE.Group();
  j2.position.z = L[0];
  j1.add(j2);
  j2.add(jointSphere(0.19));
  const link2 = zCylinder(0.125, L[1], matBody);
  link2.position.z = L[1] / 2;
  j2.add(link2);

  const j3 = new THREE.Group();
  j3.position.z = L[1];
  j2.add(j3);
  j3.add(jointSphere(0.16));
  const link3 = zCylinder(0.1, L[2], matBody);
  link3.position.z = L[2] / 2;
  j3.add(link3);

  const j4 = new THREE.Group();
  j4.position.z = L[2];
  j3.add(j4);
  j4.add(jointSphere(0.11, matDark));
  const link4 = zCylinder(0.075, L[3], matSteel);
  link4.position.z = L[3] / 2;
  j4.add(link4);

  const j5 = new THREE.Group();
  j5.position.z = L[3];
  j4.add(j5);
  j5.add(jointSphere(0.1, matDark));
  const link5 = zCylinder(0.055, L[4], matSteel);
  link5.position.z = L[4] / 2;
  j5.add(link5);

  const j6 = new THREE.Group();
  j6.position.z = L[4];
  j5.add(j6);
  j6.add(jointSphere(0.085, matDark));

  const outil = zCylinder(0.04, TOOL_LENGTH, matDark);
  outil.position.z = TOOL_LENGTH / 2;
  j6.add(outil);
  const doigtG = mesh(new THREE.BoxGeometry(0.05, 0.09, 0.16), matSteel, 0.055, 0, TOOL_LENGTH + 0.06);
  const doigtD = mesh(new THREE.BoxGeometry(0.05, 0.09, 0.16), matSteel, -0.055, 0, TOOL_LENGTH + 0.06);
  j6.add(doigtG, doigtD);

  const tcp = new THREE.Object3D();
  tcp.position.z = TOOL_LENGTH + 0.14;
  j6.add(tcp);

  const joints = [j1, j2, j3, j4, j5, j6];
  return { group: robot, joints, tcp };
}

export function applyAngles(joints, anglesDeg) {
  for (let i = 0; i < JOINTS.length; i++) {
    joints[i].rotation[JOINTS[i].axis] = deg2rad(clampDeg(JOINTS[i], anglesDeg[i]));
  }
}

export function tcpWorldPosition(robot) {
  robot.group.updateMatrixWorld(true);
  return robot.tcp.getWorldPosition(new THREE.Vector3());
}

export { TOOL_LENGTH };
