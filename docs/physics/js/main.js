// Orchestratore principale.

import { state }            from './state.js';
import { computePhysics }   from './physics.js';
import { initRenderer, render } from './render.js';
import { updateForceDisplay }   from './ui.js';
import { initInput }            from './input.js';

window.addEventListener('DOMContentLoaded', () => {

  const canvas = document.getElementById('sim-canvas');
  const ctx    = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  function resizeCanvas() {
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function redraw() {
    const physics = computePhysics(state.theta, state.mu, state.mass, state.grav);
    updateForceDisplay(physics);
    render(physics);
  }

  initRenderer(canvas, ctx);

  // initInput registra il click sul canvas e restituisce i callback
  // da esporre su window, già "chiusi" sulla redraw corretta.
  const { setShape, closePanelBtn,
          onAngleChange, onMuChange,
          onMassChange, onGravChange } = initInput(canvas, redraw);

  // Esponi su window per i callback inline dell'HTML
  window.setShape      = setShape;
  window.closePanelBtn = closePanelBtn;
  window.onAngleChange = onAngleChange;
  window.onMuChange    = onMuChange;
  window.onMassChange  = onMassChange;
  window.onGravChange  = onGravChange;

  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); redraw(); });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);

  redraw();
});
