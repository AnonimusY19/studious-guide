// Stato globale della simulazione.
// NON legge il DOM, NON disegna nulla.

export const state = {
  // Proprietà piano
  theta: 30,       // angolo in gradi
  mu: 0.30,        // coefficiente di attrito

  // Proprietà oggetto
  mass: 5,         // kg
  shape: 'cube',   // 'cube' | 'sphere' | 'cylinder'

  // Ambiente
  grav: 9.81,      // m/s²

  // UI
  activePanel: null,  // 'plane' | 'obj' | null

  // Regioni di click (aggiornate da render.js ogni frame)
  planeRegion: null,  // array di 4 punti {x,y}
  objRegion: null,    // { cx, cy, radius }
};
