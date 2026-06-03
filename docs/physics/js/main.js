// Orchestratore principale — versione 3D fullscreen con cannon-es.

import { state }              from './state.js';
import { computePhysics }     from './physics.js';
import { updateForceDisplay } from './ui.js';
import { initInput }          from './input.js';
import { initScene, getScene, getCamera, getRenderer, getControls } from './scene.js';
import { buildScene, updateScene, syncObjToPhysics } from './render3d.js';
import { initWorld, stepWorld, destroyWorld, isRunning } from './world.js';

window.addEventListener('DOMContentLoaded', () => {

  const canvas = document.getElementById('sim-canvas');
  const ui     = document.getElementById('ui');

  initScene(canvas);
  buildScene();

  // Render iniziale statico
  const initPhysics = computePhysics(state.theta, state.mu, state.mass, state.grav);
  updateForceDisplay(initPhysics);
  updateScene(initPhysics);

  // FIX CORRETTO: intercettiamo gli eventi sul CANVAS in fase capture,
  // e li annulliamo solo se l'evento proviene dall'area dell'UI overlay.
  // stopPropagation sull'#ui invece bloccava i click sui bottoni figli.
  function isOverUI(e) {
    const r = ui.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right &&
           e.clientY >= r.top  && e.clientY <= r.bottom;
  }

  canvas.addEventListener('pointerdown', e => { if (isOverUI(e)) e.stopImmediatePropagation(); }, true);
  canvas.addEventListener('wheel',       e => { if (isOverUI(e)) e.stopImmediatePropagation(); }, true);

  let lastTime = null;

  function update(timestamp) {
    const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 1/60;
    lastTime = timestamp;

    const physics = computePhysics(state.theta, state.mu, state.mass, state.grav);
    updateForceDisplay(physics);

    if (isRunning()) {
      stepWorld(dt);
      syncObjToPhysics();
    } else {
      updateScene(physics);
    }
  }

  function loop(timestamp) {
    requestAnimationFrame(loop);
    getControls().update();
    update(timestamp);
    getRenderer().render(getScene(), getCamera());
  }
  loop(0);

  // --- Callbacks input ---
  const {
    setShape,
    onAngleSlider, onAngleNumber,
    onMuSlider,    onMuNumber,
    onMassSlider,  onMassNumber,
    onGravSlider,  onGravNumber,
  } = initInput(canvas, () => {
    if (!isRunning()) {
      const physics = computePhysics(state.theta, state.mu, state.mass, state.grav);
      updateForceDisplay(physics);
      updateScene(physics);
    }
  });

  window.setShape      = setShape;
  window.onAngleSlider = onAngleSlider;
  window.onAngleNumber = onAngleNumber;
  window.onMuSlider    = onMuSlider;
  window.onMuNumber    = onMuNumber;
  window.onMassSlider  = onMassSlider;
  window.onMassNumber  = onMassNumber;
  window.onGravSlider  = onGravSlider;
  window.onGravNumber  = onGravNumber;

  document.getElementById('btn-start').addEventListener('click', function () {
    if (isRunning()) return;
    initWorld();
    setUILocked(true);
    this.style.display = 'none';
    document.getElementById('btn-reset').style.display = 'block';
  });

  document.getElementById('btn-reset').addEventListener('click', function () {
    destroyWorld();
    setUILocked(false);
    this.style.display = 'none';
    document.getElementById('btn-start').style.display = 'block';
    const physics = computePhysics(state.theta, state.mu, state.mass, state.grav);
    updateForceDisplay(physics);
    updateScene(physics);
  });
});

function setUILocked(locked) {
  const inputs = document.querySelectorAll(
    '#g-slider, #g-num, #angle-slider, #angle-num, ' +
    '#mu-slider, #mu-num, #mass-slider, #mass-num, ' +
    '.shape-btn'
  );
  inputs.forEach(el => {
    el.disabled = locked;
    el.style.opacity = locked ? '0.4' : '1';
    el.style.pointerEvents = locked ? 'none' : '';
  });
}
