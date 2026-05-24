// Gestione eventi utente — versione 3D.

import * as THREE from 'three';
import { state } from './state.js';
import { openPanel, closePanel, getVal, syncFrom } from './ui.js';
import { getCamera } from './scene.js';
import { getClickTargets } from './render3d.js';

const raycaster = new THREE.Raycaster();
const pointer   = new THREE.Vector2();

export function initInput(canvas, redraw) {

  let downX = 0, downY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    downY = e.clientY;
  });

  canvas.addEventListener('pointerup', (e) => {
    const dx   = e.clientX - downX;
    const dy   = e.clientY - downY;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist > 5) return;

    const rect = canvas.getBoundingClientRect();
    pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, getCamera());

    const targets = getClickTargets();
    console.log('[input] targets:', targets.map(t => t?.userData));

    // intersectObjects con recursive:true per trovare anche figli del pivotGroup
    const hits = raycaster.intersectObjects(targets, true);
    console.log('[input] hits:', hits.length, hits.map(h => h.object?.userData));

    if (hits.length === 0) return;

    // Risali la gerarchia finché trovi un nodo con userData.type
    let obj = hits[0].object;
    while (obj && !obj.userData.type && obj.parent) {
      obj = obj.parent;
    }
    console.log('[input] tipo rilevato:', obj?.userData?.type);

    if (obj?.userData?.type === 'plane') {
      openPanel('plane');
      redraw();
    } else if (obj?.userData?.type === 'obj') {
      openPanel('obj');
      redraw();
    }
  });

  // =========================
  // SHAPE
  // =========================

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
    closePanelBtn,
    onAngleSlider, onAngleNumber,
    onMuSlider,    onMuNumber,
    onMassSlider,  onMassNumber,
    onGravSlider,  onGravNumber,
  };
}
