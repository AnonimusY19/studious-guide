// Orchestratore principale.

import { state }                from './state.js';
import { computePhysics }       from './physics.js';
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

  const {
    setShape,
    closePanelBtn,
    onAngleSlider,
    onAngleNumber,
    onMuSlider,
    onMuNumber,
    onMassSlider,
    onMassNumber,
    onGravSlider,
    onGravNumber,
  } = initInput(canvas, redraw);

  window.setShape      = setShape;
  window.closePanelBtn = closePanelBtn;
  window.onAngleSlider = onAngleSlider;
  window.onAngleNumber = onAngleNumber;
  window.onMuSlider    = onMuSlider;
  window.onMuNumber    = onMuNumber;
  window.onMassSlider  = onMassSlider;
  window.onMassNumber  = onMassNumber;
  window.onGravSlider  = onGravSlider;
  window.onGravNumber  = onGravNumber;

  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); redraw(); });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);

  redraw();
});
