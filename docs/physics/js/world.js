// Motore fisico — piano inclinato con attrito realistico.
// Integrazione analitica/semi-analitica sulla direzione del piano;
// volo parabolico con rimbalzo anelastico dopo la caduta dal piano.
// NON tocca DOM, NON disegna nulla.

import * as CANNON from 'cannon-es';
import { state } from './state.js';
import { inertiaFactor, kineticMu } from './physics.js';

let world      = null;
let planeBody  = null;
let objectBody = null;
let sim        = null;

// Devono combaciare con render3d.js
const PLANE_LEN    = 5;
const PLANE_HEIGHT = 0.15;
const PLANE_DEPTH  = 2;
const OBJ_SIZE     = 0.45;

const START_ALONG   = PLANE_LEN * 0.5;
const STEP_MAX      = 1 / 240;   // substep massimo
const SPEED_EPS     = 1e-4;
const GROUND_Y      = 0;
const RESTITUTION   = 0.18;
const GROUND_MU     = 0.35;
const Z_AXIS        = new CANNON.Vec3(0, 0, 1);

// ─────────────────────────────────────────────
//  API pubblica
// ─────────────────────────────────────────────

export function initWorld() {
  world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, 0) });
  world.broadphase        = new CANNON.NaiveBroadphase();
  world.solver.iterations = 20;

  const planeMat = new CANNON.Material('plane');
  const objMat   = new CANNON.Material('object');
  world.addContactMaterial(
    new CANNON.ContactMaterial(planeMat, objMat, { friction: 0, restitution: 0 })
  );

  const rad = currentRad();
  planeBody = new CANNON.Body({ mass: 0, material: planeMat });
  planeBody.addShape(new CANNON.Box(
    new CANNON.Vec3(PLANE_LEN / 2, PLANE_HEIGHT / 2, PLANE_DEPTH / 2)
  ));
  planeBody.position.set(
    Math.cos(rad) * PLANE_LEN / 2,
    Math.sin(rad) * PLANE_LEN / 2,
    0
  );
  planeBody.quaternion.setFromAxisAngle(Z_AXIS, rad);
  world.addBody(planeBody);

  objectBody = new CANNON.Body({
    mass: state.mass,
    type: CANNON.Body.KINEMATIC,
    material: objMat,
    collisionResponse: false,
  });
  objectBody.addShape(buildObjectShape());
  world.addBody(objectBody);

  // qRot: quaternione 3D che accumula la rotazione dell'oggetto in volo.
  // Sul piano usa setFromAxisAngle(Z, rad) — aggiornato in syncBodyPose.
  sim = {
    mode:       'plane',   // 'plane' | 'air' | 'settled'
    along:      START_ALONG,
    speed:      0,
    rollAngle:  0,          // angolo 2D accumulato (usato solo su piano)
    omega:      0,          // velocità angolare Z (rad/s)
    position:   new CANNON.Vec3(),
    velocity:   new CANNON.Vec3(),
    // Quaternione 3D per la rotazione in volo (cubo che tumbles)
    qRot:       new CANNON.Quaternion(0, 0, 0, 1),
    // Velocità angolare 3D in volo (rads/s, world space)
    angVel3:    new CANNON.Vec3(0, 0, 0),
    // Flag: primo frame di contatto col suolo
    justLanded: false,
    onGround:   false,
  };

  syncBodyPose();
}

export function stepWorld(dt) {
  if (!world || !sim || !objectBody) return;

  sim.justLanded = false;

  let remaining = Math.min(Math.max(dt, 0), 0.05);
  while (remaining > SPEED_EPS) {
    const h = Math.min(remaining, STEP_MAX);
    if (sim.mode === 'plane') {
      stepOnPlane(h);
    } else if (sim.mode === 'air') {
      stepAirborne(h);
    }
    // 'settled' → nessuna integrazione
    remaining -= h;
  }

  syncBodyPose();
}

export function destroyWorld() {
  world      = null;
  planeBody  = null;
  objectBody = null;
  sim        = null;
}

export function isRunning() {
  return world !== null;
}

/** Ritorna true nel frame in cui l'oggetto tocca terra per la prima volta. */
export function hasJustLanded() {
  return sim ? sim.justLanded : false;
}

export function getObjTransform() {
  if (!objectBody || !sim) return null;
  return {
    position:   objectBody.position,
    quaternion: objectBody.quaternion,
    onPlane:    sim.mode === 'plane',
    speed:      sim.mode === 'plane' ? sim.speed : sim.velocity.length(),
  };
}

// ─────────────────────────────────────────────
//  Integrazione sul piano
// ─────────────────────────────────────────────

function stepOnPlane(dt) {
  const rad  = currentRad();
  const sinA = Math.sin(rad);
  const cosA = Math.cos(rad);
  const g    = state.grav;
  const k    = inertiaFactor(state.shape);
  const muS  = Math.max(0, state.mu);
  const muK  = kineticMu(muS);

  if (k > 0) {
    integrateRolling(dt, g, sinA, cosA, k, muS, muK);
  } else {
    integrateSliding(dt, g, sinA, cosA, muS, muK);
  }

  if (sim.along < 0 || sim.along > PLANE_LEN) {
    leavePlane();
  }
}

function integrateSliding(dt, g, sinA, cosA, muS, muK) {
  const aGrav  = -g * sinA;
  const aNorm  = g * cosA;
  const FfMaxS = muS * aNorm;

  if (Math.abs(sim.speed) < SPEED_EPS) {
    if (Math.abs(aGrav) <= FfMaxS + SPEED_EPS) { sim.speed = 0; return; }
    sim.speed = 0;
  }

  const frDir  = sim.speed > 0 ? -1 : 1;
  const accel  = aGrav + frDir * muK * aNorm;
  const prev   = sim.speed;
  sim.speed   += accel * dt;

  if (prev !== 0 && Math.sign(sim.speed) !== Math.sign(prev)) {
    if (Math.abs(aGrav) <= FfMaxS + SPEED_EPS) { sim.speed = 0; return; }
    sim.speed = aGrav > 0 ? SPEED_EPS : -SPEED_EPS;
  }

  sim.along += sim.speed * dt;
}

function integrateRolling(dt, g, sinA, cosA, k, muS, muK) {
  const r          = objectRadius();
  const muRequired = (k * Math.abs(sinA)) / (1 + k);

  if (muS >= muRequired) {
    const accel    = -g * sinA / (1 + k);
    sim.speed     += accel * dt;
    sim.along     += sim.speed * dt;
    sim.omega      = -sim.speed / r;
    sim.rollAngle += sim.omega * dt;
    return;
  }

  const vContact = sim.speed + sim.omega * r;
  const aNorm    = g * cosA;
  let frDir;
  if (Math.abs(vContact) > SPEED_EPS) {
    frDir = -Math.sign(vContact);
  } else if (Math.abs(sinA) > SPEED_EPS) {
    frDir = sinA > 0 ? 1 : -1;
  } else {
    frDir = 0;
  }

  sim.speed     += (-g * sinA + frDir * muK * aNorm) * dt;
  sim.omega     += (frDir * muK * aNorm / (k * r)) * dt;
  sim.along     += sim.speed * dt;
  sim.rollAngle += sim.omega * dt;
}

// ─────────────────────────────────────────────
//  Lancio dal piano → volo libero
// ─────────────────────────────────────────────

function leavePlane() {
  const rad         = currentRad();
  const launchAlong = Math.max(0, Math.min(PLANE_LEN, sim.along));

  sim.position.copy(positionFromAlong(launchAlong));
  sim.velocity.set(
    sim.speed * Math.cos(rad),
    sim.speed * Math.sin(rad),
    0
  );

  // Imposta il quaternione 3D al valore corrente sul piano, poi lascialo
  // girare liberamente con la velocità angolare accumulata.
  const angleOnPlane = (state.shape === 'cube') ? rad : rad + sim.rollAngle;
  sim.qRot.setFromAxisAngle(Z_AXIS, angleOnPlane);

  // Per il cubo: quando lascia il piano ha omega intorno all'asse Z pari
  // alla sua velocità angolare di scivolamento (piccola ma non zero).
  // Per sfera/cilindro omega è già aggiornato da integrateRolling.
  sim.angVel3.set(0, 0, sim.omega);

  sim.mode = 'air';
}

// ─────────────────────────────────────────────
//  Volo parabolico
// ─────────────────────────────────────────────

function stepAirborne(dt) {
  // Gravità
  sim.velocity.y -= state.grav * dt;

  sim.position.x += sim.velocity.x * dt;
  sim.position.y += sim.velocity.y * dt;
  sim.position.z += sim.velocity.z * dt;

  // Rotazione 3D libera: integra il quaternione con angVel3
  integrateQuaternion(sim.qRot, sim.angVel3, dt);

  // ── Collisione con il pavimento ───────────────────────────────────────
  const floorY = GROUND_Y + contactOffset();

  if (sim.position.y <= floorY) {
    const firstContact = !sim.onGround;

    sim.position.y = floorY;

    if (sim.velocity.y < 0) {
      sim.velocity.y *= -RESTITUTION;
      if (Math.abs(sim.velocity.y) < 0.04) sim.velocity.y = 0;
    }

    // Attrito orizzontale per contatto
    const frictionDecel = GROUND_MU * state.grav;
    const hSpeed = Math.sqrt(sim.velocity.x ** 2 + sim.velocity.z ** 2);
    if (hSpeed > SPEED_EPS) {
      const reduction = Math.min(hSpeed, frictionDecel * dt);
      sim.velocity.x *= (hSpeed - reduction) / hSpeed;
      sim.velocity.z *= (hSpeed - reduction) / hSpeed;
    } else {
      sim.velocity.x = 0;
      sim.velocity.z = 0;
    }

    // ── Al primo contatto: "settling" del cubo ────────────────────────
    // Ruotiamo il quaternione verso la faccia più vicina al basso.
    // Per sfera e cilindro la forma è simmetrica — nessuna correzione.
    if (firstContact && state.shape === 'cube') {
      snapCubeToFloor();
    }

    // Smorzamento rotazione
    sim.angVel3.x *= 0.55;
    sim.angVel3.y *= 0.55;
    sim.angVel3.z *= 0.55;

    if (firstContact) {
      sim.justLanded = true;
      // Se il rimbalzo è trascurabile, considera l'oggetto fermo
      if (Math.abs(sim.velocity.y) < 0.02 && hSpeed < 0.02) {
        sim.mode = 'settled';
      }
    }

    sim.onGround = true;
  } else {
    sim.onGround = false;
  }
}

/**
 * Orienta il cubo in modo che la faccia più vicina al piano XZ
 * sia perfettamente parallela al suolo (snap alla rotazione più vicina
 * multipla di 90°). Si applica solo al primo impatto.
 */
function snapCubeToFloor() {
  // Trova quale delle 6 facce del cubo è più vicina al "su" (+Y world)
  // moltiplicando il quaternione per ciascuno dei 24 orientamenti canonici
  // e scegliendo quello con l'asse Y locale più allineato con +Y world.

  // L'approccio più semplice: ruota di un angolo multiplo di π/2 intorno a Z
  // per minimizzare la differenza col prossimo multiplo di 90°.
  const q = sim.qRot;

  // Estrai l'angolo attuale intorno a Z (approssimazione 2D, sufficiente qui)
  // da quaternione (0, 0, sin(a/2), cos(a/2))
  const currentAngle = 2 * Math.atan2(q.z, q.w);
  const snapped = Math.round(currentAngle / (Math.PI / 2)) * (Math.PI / 2);

  sim.qRot.setFromAxisAngle(Z_AXIS, snapped);
  // Azzera la rotazione residua per evitare continui rimbalzi di correzione
  sim.angVel3.set(0, 0, 0);
}

// ─────────────────────────────────────────────
//  Integrazione quaternione
// ─────────────────────────────────────────────

/**
 * Integra q += 0.5 * Ω ⊗ q * dt   (formula standard quaternione-rate)
 * dove Ω = (wx, wy, wz, 0).
 */
function integrateQuaternion(q, w, dt) {
  const hdt = 0.5 * dt;
  const dqx = (w.y * q.z - w.z * q.y + w.x * q.w) * hdt;
  const dqy = (w.z * q.x - w.x * q.z + w.y * q.w) * hdt;
  const dqz = (w.x * q.y - w.y * q.x + w.z * q.w) * hdt;
  const dqw = (-w.x * q.x - w.y * q.y - w.z * q.z) * hdt;

  q.x += dqx;
  q.y += dqy;
  q.z += dqz;
  q.w += dqw;

  // Normalizza per evitare deriva numerica
  const len = Math.sqrt(q.x**2 + q.y**2 + q.z**2 + q.w**2);
  if (len > 1e-6) { q.x /= len; q.y /= len; q.z /= len; q.w /= len; }
}

// ─────────────────────────────────────────────
//  Sincronizzazione pose → objectBody
// ─────────────────────────────────────────────

function syncBodyPose() {
  if (!objectBody || !sim) return;

  if (sim.mode === 'plane') {
    objectBody.position.copy(positionFromAlong(sim.along));

    // Sul piano: cubo allineato al piano, sfera/cilindro accumulano rollAngle
    const rad   = currentRad();
    const angle = (state.shape === 'cube') ? rad : rad + sim.rollAngle;
    objectBody.quaternion.setFromAxisAngle(Z_AXIS, angle);
    objectBody.velocity.copy(velocityOnPlane());
    objectBody.angularVelocity.set(0, 0, sim.omega);

  } else {
    // 'air' o 'settled': usa quaternione 3D
    objectBody.position.copy(sim.position);
    objectBody.quaternion.copy(sim.qRot);
    objectBody.velocity.copy(sim.velocity);
    objectBody.angularVelocity.copy(sim.angVel3);
  }
}

function velocityOnPlane() {
  const rad = currentRad();
  return new CANNON.Vec3(
    sim.speed * Math.cos(rad),
    sim.speed * Math.sin(rad),
    0
  );
}

function positionFromAlong(along) {
  const rad    = currentRad();
  const offset = contactOffset();
  return new CANNON.Vec3(
    along * Math.cos(rad) - offset * Math.sin(rad),
    along * Math.sin(rad) + offset * Math.cos(rad),
    0
  );
}

// ─────────────────────────────────────────────
//  Utility
// ─────────────────────────────────────────────

function buildObjectShape() {
  if (state.shape === 'sphere')   return new CANNON.Sphere(OBJ_SIZE / 2);
  if (state.shape === 'cylinder') return new CANNON.Cylinder(OBJ_SIZE / 2.5, OBJ_SIZE / 2.5, OBJ_SIZE, 24);
  return new CANNON.Box(new CANNON.Vec3(OBJ_SIZE / 2, OBJ_SIZE / 2, OBJ_SIZE / 2));
}

function objectRadius() {
  if (state.shape === 'cylinder') return OBJ_SIZE / 2.5;
  return OBJ_SIZE / 2;
}

function contactOffset() {
  return PLANE_HEIGHT / 2 + objectRadius();
}

function currentRad() {
  return state.theta * Math.PI / 180;
}
