// Gestione interfaccia HTML.
// Aggiorna testi, badge, barre delle forze, pannelli.
// NON disegna canvas, NON contiene logica fisica.

import { clamp } from './utils.js';
import { state } from './state.js';

// --- Sincronizzazione slider ↔ input numerico ---

export function syncFrom(srcId, tgtId, mn, mx, dec) {
  const src = document.getElementById(srcId);
  const tgt = document.getElementById(tgtId);
  let v = parseFloat(src.value);
  if (isNaN(v)) v = mn;
  v = clamp(v, mn, mx);
  src.value = v;
  tgt.value = parseFloat(v.toFixed(dec));
}

export function getVal(id) {
  return parseFloat(document.getElementById(id).value);
}

// --- Pannelli ---

export function openPanel(which) {
  if (state.activePanel && state.activePanel !== which) {
    document.getElementById('panel-' + state.activePanel).classList.remove('open');
  }
  state.activePanel = which;
  document.getElementById('panel-' + which).classList.add('open');
  document.getElementById('hint-text').style.display = 'none';
}

export function closePanel(which) {
  document.getElementById('panel-' + which).classList.remove('open');
  if (state.activePanel === which) state.activePanel = null;
}

// --- Aggiornamento valori forze e badge ---

export function updateForceDisplay(physics) {
  const { Fg, Fn, Ff, Fr, maxF, status } = physics;

  document.getElementById('f-fg').textContent = Fg.toFixed(2) + ' N';
  document.getElementById('f-fn').textContent = Fn.toFixed(2) + ' N';
  document.getElementById('f-ff').textContent = Ff.toFixed(2) + ' N';
  document.getElementById('f-fr').textContent = Math.abs(Fr).toFixed(2) + ' N';

  document.getElementById('b-fg').style.width = (Fg / maxF * 100).toFixed(0) + '%';
  document.getElementById('b-fn').style.width = (Fn / maxF * 100).toFixed(0) + '%';
  document.getElementById('b-ff').style.width = (Ff / maxF * 100).toFixed(0) + '%';
  document.getElementById('b-fr').style.width = (Math.abs(Fr) / maxF * 100).toFixed(0) + '%';

  const badge = document.getElementById('status-badge');
  const map = {
    limit: ['Equilibrio limite', 'badge badge-limit'],
    slide: ['Scivola ↓',         'badge badge-slide'],
    still: ['Fermo ✓',           'badge badge-still'],
  };
  const [text, cls] = map[status];
  badge.textContent = text;
  badge.className = cls;
}
