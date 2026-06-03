// Motore fisico cannon-es.
// Gestisce il mondo fisico, i corpi e il loro aggiornamento.
// NON tocca DOM, NON disegna nulla.

import * as CANNON from 'cannon-es';
import { state } from './state.js';
import { computePhysics } from './physics.js';

let world       = null;
let planeBody   = null;
let objectBody  = null;

const PLANE_LEN    = 5;
const PLANE_HEIGHT = 0.15;
const PLANE_DEPTH  = 2;
const OBJ_SIZE     = 0.45;

export function initWorld() {
  world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -state.grav, 0),
  });

  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 20;

  const planeMat = new CANNON.Material('plane');
  const objMat   = new CANNON.Material('object');

  // L'attrito di contatto di cannon-es viene applicato per ogni punto di
  // contatto: su un cubo può risultare molto più alto del valore didattico μN.
  // Lo lasciamo a zero e applichiamo sotto la forza tangenziale coerente con
  // le forze mostrate nella UI.
  const contact = new CANNON.ContactMaterial(planeMat, objMat, {
    friction:    0.0,
    restitution: 0.0,
  });
  world.defaultContactMaterial.friction = 0.0;
  world.defaultContactMaterial.restitution = 0.0;
  world.addContactMaterial(contact);

  const rad = state.theta * Math.PI / 180;

  // --- Piano (corpo statico) ---
  const planeShape = new CANNON.Box(
    new CANNON.Vec3(PLANE_LEN / 2, PLANE_HEIGHT / 2, PLANE_DEPTH / 2)
  );
  planeBody = new CANNON.Body({ mass: 0, material: planeMat });
  planeBody.addShape(planeShape);
  planeBody.position.set(
    Math.cos(rad) * PLANE_LEN / 2,
    Math.sin(rad) * PLANE_LEN / 2,
    0
  );
  planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), rad);
  world.addBody(planeBody);

  // --- Oggetto (corpo dinamico) ---
  let objectShape;
  if (state.shape === 'sphere') {
    objectShape = new CANNON.Sphere(OBJ_SIZE / 2);
  } else if (state.shape === 'cylinder') {
    objectShape = new CANNON.Cylinder(OBJ_SIZE / 2.5, OBJ_SIZE / 2.5, OBJ_SIZE, 16);
  } else {
    objectShape = new CANNON.Box(
      new CANNON.Vec3(OBJ_SIZE / 2, OBJ_SIZE / 2, OBJ_SIZE / 2)
    );
  }

  const offset = PLANE_HEIGHT / 2 + OBJ_SIZE / 2;
  const along  = PLANE_LEN * 0.5;

  objectBody = new CANNON.Body({
    mass:     state.mass,
    material: objMat,
    // FIX: sveglia il corpo subito — di default cannon-es mette i corpi in sleep
    sleepSpeedLimit:      0.01,
    sleepTimeLimit:       0.1,
    linearDamping:        0.01,
    angularDamping:       0.01,
  });
  objectBody.addShape(objectShape);
  objectBody.position.set(
    along * Math.cos(rad) - offset * Math.sin(rad),
    along * Math.sin(rad) + offset * Math.cos(rad),
    0
  );
  objectBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), rad);

  // FIX: forza il corpo sveglio al via
  objectBody.wakeUp();

  world.addBody(objectBody);
}

export function stepWorld(dt) {
  if (!world) return;
  applyInclineFriction();
  world.step(1 / 60, dt, 3);
}

function applyInclineFriction() {
  if (!objectBody || !isObjectNearPlane()) return;

  const { rad, Fpara, Ff } = computePhysics(state.theta, state.mu, state.mass, state.grav);
  const tx = Math.cos(rad);
  const ty = Math.sin(rad);
  const speedUpSlope = objectBody.velocity.x * tx + objectBody.velocity.y * ty;
  const speedEps = 0.015;

  let forceUpSlope;
  if (speedUpSlope < -speedEps) {
    forceUpSlope = Ff;
  } else if (speedUpSlope > speedEps) {
    forceUpSlope = -Ff;
  } else if (Fpara > Ff) {
    forceUpSlope = Ff;
  } else {
    forceUpSlope = Fpara;
    objectBody.velocity.x -= speedUpSlope * tx;
    objectBody.velocity.y -= speedUpSlope * ty;
  }

  if (Math.abs(forceUpSlope) < 0.001) return;

  objectBody.applyForce(
    new CANNON.Vec3(forceUpSlope * tx, forceUpSlope * ty, 0),
    objectBody.position
  );
}

function isObjectNearPlane() {
  if (!objectBody) return false;

  const rad = state.theta * Math.PI / 180;
  const tx = Math.cos(rad);
  const ty = Math.sin(rad);
  const nx = -Math.sin(rad);
  const ny = Math.cos(rad);
  const p = objectBody.position;

  const along = p.x * tx + p.y * ty;
  const normalDistance = p.x * nx + p.y * ny;
  const contactDistance = PLANE_HEIGHT / 2 + OBJ_SIZE / 2;

  return along > -OBJ_SIZE &&
         along < PLANE_LEN + OBJ_SIZE &&
         normalDistance > PLANE_HEIGHT / 2 - 0.08 &&
         normalDistance < contactDistance + OBJ_SIZE;
}

export function getObjTransform() {
  if (!objectBody) return null;
  return {
    position:   objectBody.position,
    quaternion: objectBody.quaternion,
  };
}

export function destroyWorld() {
  world       = null;
  planeBody   = null;
  objectBody  = null;
}

export function isRunning() {
  return world !== null;
}
