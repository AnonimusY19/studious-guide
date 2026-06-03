// Orchestratore principale — versione 3D fullscreen con cannon-es.

import { state }              from './state.js';
import { computePhysics }     from './physics.js';
import { updateForceDisplay } from './ui.js';
import { initInput }          from './input.js';
import { initScene, getScene, getCamera, getRenderer, getControls } from './scene.js';
import { buildScene, updateScene, syncObjToPhysics } from './render3d.js';
import { initWorld, stepWorld, destroyWorld, isRunning, hasJustLanded } from './world.js';

window.addEventListener('DOMContentLoaded', () => {

  const canvas = document.getElementById('sim-canvas');
  const ui     = document.getElementById('ui');

  // ── Timer ────────────────────────────────────────────────────────────────
  const timerEl = document.getElementById('sim-timer');
  let timerStart   = null;   // performance.now() al click Start
  let timerStopped = false;  // true dopo il primo atterraggio
  let timerValue   = 0;      // secondi mostrati (aggiornato ogni frame)

  function startTimer() {
    timerStart   = performance.now();
    timerStopped = false;
    timerValue   = 0;
    timerEl.style.display = 'block';
    updateTimerDisplay(0);
  }

  function stopTimer() {
    timerStopped = true;
  }

  function resetTimer() {
    timerStart   = null;
    timerStopped = false;
    timerValue   = 0;
    timerEl.style.display = 'none';
    updateTimerDisplay(0);
  }

  function tickTimer(now) {
    if (!timerStart || timerStopped) return;
    timerValue = (now - timerStart) / 1000;
    updateTimerDisplay(timerValue);
  }

  function updateTimerDisplay(secs) {
    const m  = Math.floor(secs / 60);
    const s  = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    timerEl.textContent =
      (m > 0 ? String(m).padStart(2, '0') + ':' : '') +
      String(s).padStart(2, '0') + '.' +
      String(ms).padStart(2, '0');
  }
  // ─────────────────────────────────────────────────────────────────────────

  initScene(canvas);
  buildScene();

  const initPhysics = computePhysics(state.theta, state.mu, state.mass, state.grav, state.shape);
  updateForceDisplay(initPhysics);
  updateScene(initPhysics);

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

    const physics = computePhysics(state.theta, state.mu, state.mass, state.grav, state.shape);
    updateForceDisplay(physics);

    if (isRunning()) {
      tickTimer(timestamp);
      stepWorld(dt);
      syncObjToPhysics();

      // Ferma il timer al primo atterraggio
      if (hasJustLanded()) {
        stopTimer();
      }
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
      const physics = computePhysics(state.theta, state.mu, state.mass, state.grav, state.shape);
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
    startTimer();
  });

  document.getElementById('btn-reset').addEventListener('click', function () {
    destroyWorld();
    setUILocked(false);
    this.style.display = 'none';
    document.getElementById('btn-start').style.display = 'block';
    resetTimer();
    const physics = computePhysics(state.theta, state.mu, state.mass, state.grav, state.shape);
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
