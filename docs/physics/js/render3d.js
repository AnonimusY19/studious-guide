// Disegno 3D con Three.js.
// Il piano ruota attorno alla sua estremità sinistra (pivot = base del piano).

import * as THREE from 'three';
import { getScene } from './scene.js';
import { state } from './state.js';

let pivotGroup  = null;   // gruppo che fa da pivot per la rotazione del piano
let planeMesh   = null;
let objectMesh  = null;
let arrowGroup  = null;

const PLANE_LEN      = 5;     // lunghezza piano in unità Three.js
const PLANE_HEIGHT   = 0.15;  // spessore piano
const PLANE_DEPTH    = 2;     // profondità piano (asse Z)

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

export function buildScene() {
  const scene = getScene();

  // --- Pivot group: ruota attorno all'origine (base sinistra del piano) ---
  pivotGroup = new THREE.Group();
  scene.add(pivotGroup);

  // Il piano è centrato a (PLANE_LEN/2, 0, 0) nel gruppo,
  // così il pivot è alla sua estremità sinistra
  const planeGeo = new THREE.BoxGeometry(PLANE_LEN, PLANE_HEIGHT, PLANE_DEPTH);
  planeMesh = new THREE.Mesh(planeGeo, planeMat);
  planeMesh.position.set(PLANE_LEN / 2, 0, 0);
  planeMesh.receiveShadow = true;
  planeMesh.userData.type = 'plane';
  pivotGroup.add(planeMesh);

  // --- Oggetto ---
  objectMesh = buildObjectMesh(state.shape);
  objectMesh.castShadow = true;
  scene.add(objectMesh);

  // --- Frecce ---
  arrowGroup = new THREE.Group();
  scene.add(arrowGroup);

  // --- Griglia a terra ---
  const grid = new THREE.GridHelper(12, 12, 0xcccccc, 0xe8e8e8);
  grid.position.set(2, -0.01, 0);
  scene.add(grid);
}

export function updateScene(physics) {
  if (!pivotGroup || !planeMesh || !objectMesh) return;

  const { rad, Fg, Fn, Ff, Fr } = physics;
  const scene = getScene();

  // --- Rotazione piano attorno al pivot (origine) ---
  pivotGroup.rotation.z = rad;

  // Highlight
  planeMesh.material = state.activePanel === 'plane' ? planeMatHL : planeMat;

  // --- Ricostruisci oggetto se forma cambiata ---
  if (objectMesh.userData.shape !== state.shape) {
    scene.remove(objectMesh);
    objectMesh = buildObjectMesh(state.shape);
    objectMesh.castShadow = true;
    scene.add(objectMesh);
  }

  objectMesh.material = state.activePanel === 'obj' ? objMatHL : objMat;

  // --- Posizione oggetto sul piano ---
  // L'oggetto si trova a t=0.5 lungo il piano, sopra la sua superficie.
  // Nel sistema ruotato del pivot:
  //   - lungo il piano: distanza = PLANE_LEN * 0.5
  //   - perpendicolare: PLANE_HEIGHT/2 + objSize/2
  const t       = 0.5;
  const objSize = getObjSize();
  const along   = PLANE_LEN * t;                    // distanza lungo il piano
  const perp    = PLANE_HEIGHT / 2 + objSize / 2;   // sopra la superficie

  // Converti in coordinate mondo applicando la rotazione del pivot
  const ox = along * Math.cos(rad) - perp * Math.sin(rad);
  const oy = along * Math.sin(rad) + perp * Math.cos(rad);

  objectMesh.position.set(ox, oy, 0);
  objectMesh.rotation.z = rad;

  // --- Frecce forze ---
  updateArrows(physics, ox, oy);
}

export function getClickTargets() {
  // Includi planeMesh (figlio del pivotGroup) e objectMesh
  return [planeMesh, objectMesh].filter(Boolean);
}

// --- Helper privati ---

function buildObjectMesh(shape) {
  const size = getObjSize();
  let geo;
  if (shape === 'sphere') {
    geo = new THREE.SphereGeometry(size / 2, 32, 32);
  } else if (shape === 'cylinder') {
    geo = new THREE.CylinderGeometry(size / 2.5, size / 2.5, size, 32);
  } else {
    geo = new THREE.BoxGeometry(size, size, size);
  }
  const mesh = new THREE.Mesh(geo, objMat.clone());
  mesh.userData.shape = shape;
  mesh.userData.type  = 'obj';
  return mesh;
}

function getObjSize() {
  return Math.max(0.25, Math.min(0.6, 0.25 + Math.sqrt(state.mass) * 0.03));
}

function updateArrows(physics, ox, oy) {
  const { rad, Fg, Fn, Ff, Fr } = physics;
  while (arrowGroup.children.length) arrowGroup.remove(arrowGroup.children[0]);

  const sc = 0.035; // scala N → unità Three.js

  // Peso: verso il basso (asse -Y)
  addArrow(ox, oy, 0, -Fg * sc, 0, COLORS.Fg);

  // Normale: perpendicolare al piano (ruotata di rad rispetto a Y)
  const nLen = Fn * sc;
  addArrow(ox, oy, -Math.sin(rad) * nLen, Math.cos(rad) * nLen, 0, COLORS.Fn);

  // Attrito: lungo il piano, opposto al moto potenziale
  if (Ff > 0.5) {
    const fLen = Ff * sc;
    const dir  = Fr > 0 ? 1 : -1;
    addArrow(ox, oy,
      Math.cos(rad) * fLen * dir,
      Math.sin(rad) * fLen * dir,
      0, COLORS.Ff);
  }

  // Risultante: lungo il piano
  const frLen = Math.abs(Fr) * sc;
  if (frLen > 0.04) {
    const dir = Fr > 0 ? -1 : 1;
    addArrow(ox, oy,
      Math.cos(rad) * frLen * dir,
      Math.sin(rad) * frLen * dir,
      0, COLORS.Fr);
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
