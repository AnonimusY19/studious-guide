// Gestione eventi utente — versione 3D fullscreen.
// Niente più raycasting: la selezione avviene tramite il menu overlay.

import { state } from './state.js';
import { getVal, syncFrom } from './ui.js';

export function initInput(canvas, redraw) {

  // =========================
  // SHAPE
  // =========================
  function setShape(s, btn) {
    state.shape = s;
    document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    redraw();
  }

  // =========================
  // ANGLE
  // =========================
  function onAngleSlider() {
    syncFrom('angle-slider', 'angle-num', 0, 75, 1);
    state.theta = getVal('angle-slider');
    redraw();
  }

  function onAngleNumber() {
    syncFrom('angle-num', 'angle-slider', 0, 75, 1);
    state.theta = getVal('angle-num');
    redraw();
  }

  // =========================
  // MU
  // =========================
  function onMuSlider() {
    syncFrom('mu-slider', 'mu-num', 0, 1, 2);
    state.mu = getVal('mu-slider');
    redraw();
  }

  function onMuNumber() {
    syncFrom('mu-num', 'mu-slider', 0, 1, 2);
    state.mu = getVal('mu-num');
    redraw();
  }

  // =========================
  // MASS
  // =========================
  function onMassSlider() {
    syncFrom('mass-slider', 'mass-num', 0.1, 100, 2);
    state.mass = getVal('mass-slider');
    redraw();
  }

  function onMassNumber() {
    syncFrom('mass-num', 'mass-slider', 0.1, 100, 2);
    state.mass = getVal('mass-num');
    redraw();
  }

  // =========================
  // GRAVITY
  // =========================
  function onGravSlider() {
    syncFrom('g-slider', 'g-num', 1, 25, 2);
    state.grav = getVal('g-slider');
    redraw();
  }

  function onGravNumber() {
    syncFrom('g-num', 'g-slider', 1, 25, 2);
    state.grav = getVal('g-num');
    redraw();
  }

  return {
    setShape,
    onAngleSlider, onAngleNumber,
    onMuSlider,    onMuNumber,
    onMassSlider,  onMassNumber,
    onGravSlider,  onGravNumber,
  };
}
