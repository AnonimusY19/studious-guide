// Calcoli fisici del piano inclinato.
// Input: valori numerici. Output: oggetto con tutte le forze.
// NON legge DOM, NON disegna nulla.

import { toRad } from './utils.js';

// Il coefficiente cinetico è tipicamente 80% dello statico
const KINETIC_FRICTION_RATIO = 0.80;

export function kineticMu(muStatic) {
  return Math.max(0, muStatic * KINETIC_FRICTION_RATIO);
}

/**
 * Momento d'inerzia adimensionale k tale che I = k·m·r².
 *   Cubo/blocco:  k = 0   (trattato come punto — nessun rotolamento)
 *   Sfera solida: k = 2/5
 *   Cilindro pieno: k = 1/2
 */
export function inertiaFactor(shape) {
  if (shape === 'sphere')   return 2 / 5;
  if (shape === 'cylinder') return 1 / 2;
  return 0;
}

/**
 * Calcola tutte le forze agenti sull'oggetto sul piano inclinato.
 *
 * @param {number} theta  angolo in gradi
 * @param {number} mu     coefficiente di attrito statico
 * @param {number} mass   massa in kg
 * @param {number} grav   accelerazione di gravità m/s²
 * @param {string} shape  'cube' | 'sphere' | 'cylinder'
 * @returns {{ rad, Fg, Fn, Fpara, Ff, Fr, maxF, status }}
 *
 * Convenzioni:
 *   Fg    = peso (sempre verso il basso, positivo)
 *   Fn    = forza normale (perpendicolare al piano, positiva)
 *   Fpara = componente del peso parallela al piano (positiva = verso il basso del piano)
 *   Ff    = attrito (si oppone al moto, positivo = verso l'alto del piano)
 *   Fr    = forza risultante lungo il piano (positiva = accelera verso il basso)
 *   status: 'still' | 'limit' | 'slide' | 'roll'
 */
export function computePhysics(theta, mu, mass, grav, shape = 'cube') {
  const rad   = toRad(theta);
  const Fg    = mass * grav;
  const Fn    = Fg * Math.cos(rad);
  const Fpara = Fg * Math.sin(rad);
  const FfMax = mu * Fn;          // attrito statico massimo
  const muK   = kineticMu(mu);
  const k     = inertiaFactor(shape);

  let Ff;
  let Fr;
  let status;

  // Angolo praticamente zero → tutto fermo
  if (Fpara < 1e-6) {
    return { rad, Fg, Fn, Fpara: 0, Ff: 0, Fr: 0, maxF: Fg + 1, status: 'still' };
  }

  if (k > 0) {
    // ── Corpo rotolante ──────────────────────────────────────────────────
    // Forza di attrito necessaria per rotolare senza scivolare:
    //   Ff_roll = Fpara * k / (1 + k)
    const FfRoll = Fpara * k / (1 + k);

    if (FfRoll <= FfMax) {
      // Rotolamento puro: l'attrito è quello strettamente necessario
      Ff     = FfRoll;
      Fr     = Fpara - Ff;  // accelerazione netta lungo il piano
      status = 'roll';
    } else {
      // Slittamento: l'attrito statico non è sufficiente
      Ff     = muK * Fn;
      Fr     = Fpara - Ff;
      status = Fr > 1e-3 ? 'slide' : 'limit';
    }
  } else {
    // ── Blocco scorrevole ────────────────────────────────────────────────
    if (Fpara <= FfMax) {
      // L'attrito statico bilancia la componente gravitazionale
      Ff = Fpara;
      Fr = 0;
      // "limit" se siamo esattamente al limite dell'attrito statico
      status = (FfMax - Fpara) < 0.05 * FfMax ? 'limit' : 'still';
    } else {
      // Attrito cinetico: il blocco scivola
      Ff     = muK * Fn;
      Fr     = Fpara - Ff;
      status = Fr > 1e-3 ? 'slide' : 'limit';
    }
  }

  // maxF serve per normalizzare le barre nell'UI — usiamo un margine del 20%
  const maxF = Fg * 1.2 + 1;

  return { rad, Fg, Fn, Fpara, Ff, Fr, maxF, status };
}
