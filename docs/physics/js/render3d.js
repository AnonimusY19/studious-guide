// Disegno 3D con Three.js.

import * as THREE from 'three';
import { getScene } from './scene.js';
import { state } from './state.js';

let pivotGroup = null;
let planeMesh  = null;
let objectMesh = null;
let arrowGroup = null;

const PLANE_LEN    = 5;
const PLANE_HEIGHT = 0.15;
const PLANE_DEPTH  = 2;

const COLORS = {
  Fg: 0xE24B4A,
  Fn: 0x378ADD,
  Ff: 0x1D9E75,
  Fr: 0xEF9F27,
};

const planeMat   = new THREE.MeshLambertMaterial({ color: 0xd8d6ce, side: THREE.DoubleSide });
const planeMatHL = new THREE.MeshLambertMaterial({ color: 0x9993dd, side: THREE.DoubleSide });
const objMat     = new THREE.MeshLambertMaterial({ color: 0xAFA9EC });
const objMatHL   = new THREE.MeshLambertMaterial({ color: 0x7F77DD });

// Dimensione fissa dell'oggetto — NON scala con la massa
// La massa è un dato fisico, non visivo: influenza le forze, non la dimensione
const OBJ_SIZE = 0.45;

export function buildScene() {
  const scene = getScene();

  pivotGroup = new THREE.Group();
  scene.add(pivotGroup);

  const planeGeo = new THREE.BoxGeometry(PLANE_LEN, PLANE_HEIGHT, PLANE_DEPTH);
  planeMesh = new THREE.Mesh(planeGeo, planeMat);
  planeMesh.position.set(PLANE_LEN / 2, 0, 0);
  planeMesh.receiveShadow = true;
  planeMesh.userData.type = 'plane';
  pivotGroup.add(planeMesh);

  objectMesh = buildObjectMesh(state.shape);
  objectMesh.castShadow = true;
  scene.add(objectMesh);

  arrowGroup = new THREE.Group();
  scene.add(arrowGroup);

  const grid = new THREE.GridHelper(12, 12, 0x444466, 0x333355);
  grid.position.set(2, -0.01, 0);
  scene.add(grid);
}

export function updateScene(physics) {
  if (!pivotGroup || !planeMesh || !objectMesh) return;

  const { rad, Fg, Fn, Ff, Fr } = physics;
  const scene = getScene();

  // Piano
  pivotGroup.rotation.z = rad;
  planeMesh.material = state.activePanel === 'plane' ? planeMatHL : planeMat;

  // Ricostruisci oggetto solo se la forma cambia
  if (objectMesh.userData.shape !== state.shape) {
    scene.remove(objectMesh);
    objectMesh = buildObjectMesh(state.shape);
    objectMesh.castShadow = true;
    scene.add(objectMesh);
  }
  objectMesh.material = state.activePanel === 'obj' ? objMatHL : objMat;

  // Offset = metà spessore piano + metà dimensione oggetto
  // Costante perché OBJ_SIZE è costante
  const offset = PLANE_HEIGHT / 2 + OBJ_SIZE / 2;
  const along  = PLANE_LEN * 0.5;

  // Posizione nel sistema mondo: ruota il vettore (along, offset) di rad
  const ox = along * Math.cos(rad) - offset * Math.sin(rad);
  const oy = along * Math.sin(rad) + offset * Math.cos(rad);

  objectMesh.position.set(ox, oy, 0);
  objectMesh.rotation.z = rad;

  updateArrows(physics, ox, oy);
}

export function getClickTargets() {
  return [planeMesh, objectMesh].filter(Boolean);
}

function buildObjectMesh(shape) {
  let geo;
  if (shape === 'sphere') {
    geo = new THREE.SphereGeometry(OBJ_SIZE / 2, 32, 32);
  } else if (shape === 'cylinder') {
    geo = new THREE.CylinderGeometry(OBJ_SIZE / 2.5, OBJ_SIZE / 2.5, OBJ_SIZE, 32);
  } else {
    geo = new THREE.BoxGeometry(OBJ_SIZE, OBJ_SIZE, OBJ_SIZE);
  }
  const mesh = new THREE.Mesh(geo, objMat.clone());
  mesh.userData.shape = shape;
  mesh.userData.type  = 'obj';
  return mesh;
}

function updateArrows(physics, ox, oy) {
  const { rad, Fg, Fn, Ff, Fr } = physics;
  while (arrowGroup.children.length) arrowGroup.remove(arrowGroup.children[0]);

  const sc = 0.035;

  addArrow(ox, oy, 0, -Fg * sc, 0, COLORS.Fg);

  const nLen = Fn * sc;
  addArrow(ox, oy, -Math.sin(rad) * nLen, Math.cos(rad) * nLen, 0, COLORS.Fn);

  if (Ff > 0.5) {
    const fLen = Ff * sc;
    const dir  = Fr > 0 ? 1 : -1;
    addArrow(ox, oy, Math.cos(rad) * fLen * dir, Math.sin(rad) * fLen * dir, 0, COLORS.Ff);
  }

  const frLen = Math.abs(Fr) * sc;
  if (frLen > 0.04) {
    const dir = Fr > 0 ? -1 : 1;
    addArrow(ox, oy, Math.cos(rad) * frLen * dir, Math.sin(rad) * frLen * dir, 0, COLORS.Fr);
  }
}

function addArrow(ox, oy, dx, dy, dz, color) {
  const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
  if (len < 0.04) return;
  const dir    = new THREE.Vector3(dx, dy, dz).normalize();
  const origin = new THREE.Vector3(ox, oy, 0);
  const arrow  = new THREE.ArrowHelper(dir, origin, len, color, len * 0.3, len * 0.15);
  arrowGroup.add(arrow);
}
