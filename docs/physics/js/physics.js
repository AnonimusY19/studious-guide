// Calcoli fisici del piano inclinato.
// Input: valori numerici. Output: oggetto con tutte le forze.
// NON legge DOM, NON disegna nulla.

import { toRad } from './utils.js';

/**
 * @param {number} theta  angolo in gradi
 * @param {number} mu     coefficiente di attrito
 * @param {number} mass   massa in kg
 * @param {number} grav   accelerazione di gravità m/s²
 * @returns {{ rad, Fg, Fn, Fpara, Ff, Fr, maxF, status }}
 */
export function computePhysics(theta, mu, mass, grav) {
  const rad   = toRad(theta);
  const Fg    = mass * grav;
  const Fn    = Fg * Math.cos(rad);
  const Fpara = Fg * Math.sin(rad);
  const Ff    = mu * Fn;
  const Fr    = Fpara - Ff;
  const maxF  = Fg + 10;

  let status;
  if (Math.abs(Fr) < 0.01)  status = 'limit';
  else if (Fr > 0)           status = 'slide';
  else                       status = 'still';

  return { rad, Fg, Fn, Fpara, Ff, Fr, maxF, status };
}
