// Orchestratore principale — versione 3D.

import { state }              from './state.js';
import { computePhysics }     from './physics.js';
import { updateForceDisplay } from './ui.js';
import { initInput }          from './input.js';
import { initScene, getScene, getCamera, getRenderer, getControls } from './scene.js';
import { buildScene, updateScene } from './render3d.js';

window.addEventListener('DOMContentLoaded', () => {

  const canvas = document.getElementById('sim-canvas');

  // --- Init Three.js ---
  initScene(canvas);
  buildScene();

  // --- Funzione update (chiamata dagli input) ---
  function update() {
    const physics = computePhysics(state.theta, state.mu, state.mass, state.grav);
    updateForceDisplay(physics);
    updateScene(physics);
  }

  // --- Render loop continuo ---
  function loop() {
    requestAnimationFrame(loop);
    getControls().update();  // damping OrbitControls
    update();
    getRenderer().render(getScene(), getCamera());
  }
  loop();

  // --- Input ---
  const {
    setShape,
    closePanelBtn,
    onAngleSlider, onAngleNumber,
    onMuSlider,    onMuNumber,
    onMassSlider,  onMassNumber,
    onGravSlider,  onGravNumber,
  } = initInput(canvas, update);

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
});
