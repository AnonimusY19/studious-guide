// Setup scena Three.js fullscreen + WebXR.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton }      from 'three/addons/webxr/VRButton.js';

let renderer, scene, camera, controls;

export function initScene(canvas) {

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Abilita WebXR
  renderer.xr.enabled = true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 15, 30);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(5, 4, 7);
  camera.lookAt(2, 1, 0);

  // Luce ambiente
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  // Luce principale
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(6, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 40;
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  scene.add(sun);

  // Luce di riempimento
  const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
  fill.position.set(-4, 2, -4);
  scene.add(fill);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(2, 1, 0);
  controls.minDistance = 2;
  controls.maxDistance = 20;

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // Inizializza il pulsante VR personalizzato nell'HTML
  // (non usiamo VRButton.createButton perché vogliamo il nostro stile)
  _initVRButton();
}

/**
 * Collega il pulsante #btn-vr al ciclo WebXR.
 * - Se il browser/dispositivo non supporta WebXR, nasconde il pulsante.
 * - Al click richiede la sessione immersive-vr.
 * - All'uscita dalla sessione VR ripristina lo stato normale.
 */
function _initVRButton() {
  const btn = document.getElementById('btn-vr');
  if (!btn) return;

  if (!navigator.xr) {
    // WebXR non disponibile (browser desktop senza supporto)
    btn.textContent = '🥽 VR non supportato';
    btn.disabled = true;
    btn.style.opacity = '0.4';
    btn.style.cursor = 'not-allowed';
    return;
  }

  navigator.xr.isSessionSupported('immersive-vr').then(supported => {
    if (!supported) {
      btn.textContent = '🥽 VR non disponibile';
      btn.disabled = true;
      btn.style.opacity = '0.4';
      btn.style.cursor = 'not-allowed';
      return;
    }

    // VR disponibile
    btn.addEventListener('click', () => {
      if (renderer.xr.isPresenting) {
        // Esci dalla VR
        renderer.xr.getSession().end();
      } else {
        // Entra in VR
        navigator.xr.requestSession('immersive-vr', {
          optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
        }).then(session => {
          renderer.xr.setSession(session);
          btn.textContent = '✕ Esci dalla VR';
          btn.style.background = 'rgba(185,28,28,0.85)';

          session.addEventListener('end', () => {
            btn.textContent = '🥽 Avvia VR';
            btn.style.background = 'rgba(83,74,183,0.85)';
          });
        }).catch(err => {
          console.error('Errore avvio sessione VR:', err);
        });
      }
    });
  });
}

export function getScene()    { return scene;    }
export function getCamera()   { return camera;   }
export function getRenderer() { return renderer; }
export function getControls() { return controls; }