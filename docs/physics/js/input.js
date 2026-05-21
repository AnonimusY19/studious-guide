// Gestione eventi utente.

import { state }                        from './state.js';
import { openPanel, closePanel, getVal, syncFrom } from './ui.js';
import { pointInCircle, pointInQuad }   from './utils.js';

/**
 * Inizializza gli eventi sul canvas.
 * Ritorna i callback da esporre su window per i handler inline dell'HTML.
 */
export function initInput(canvas, redraw) {

  // --- Click sul canvas ---
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    const sx   = (canvas.width / dpr) / rect.width;
    const sy   = (canvas.height / dpr) / rect.height;
    const mx   = (e.clientX - rect.left) * sx;
    const my   = (e.clientY - rect.top)  * sy;

    if (state.objRegion && pointInCircle(mx, my, state.objRegion)) {
      openPanel('obj'); redraw(); return;
    }
    if (state.planeRegion && pointInQuad(mx, my, state.planeRegion)) {
      openPanel('plane'); redraw(); return;
    }
  });

  // --- Callback da esporre su window ---

  function setShape(s, btn) {
    state.shape = s;
    document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    redraw();
  }

  function closePanelBtn(which) {
    closePanel(which);
    redraw();
  }

  function onAngleChange() {
    syncFrom('angle-slider', 'angle-num', 0, 75, 1);
    state.theta = getVal('angle-slider');
    redraw();
  }

  function onMuChange() {
    syncFrom('mu-slider', 'mu-num', 0, 1, 2);
    state.mu = getVal('mu-slider');
    redraw();
  }

  function onMassChange() {
    syncFrom('mass-slider', 'mass-num', 0.1, 100, 2);
    state.mass = getVal('mass-slider');
    redraw();
  }

  function onGravChange() {
    syncFrom('g-slider', 'g-num', 1, 25, 2);
    state.grav = getVal('g-slider');
    redraw();
  }

  return { setShape, closePanelBtn, onAngleChange, onMuChange, onMassChange, onGravChange };
}
