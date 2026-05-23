# Metaverso a Scuola — Piano Inclinato

Progetto scolastico open source dell'**IIS G.L. Lagrange di Milano**.
Simulazione didattica del piano inclinato con attrito, destinata a visori **Meta Quest** tramite WebXR.

Repository: https://github.com/aab016/studious-guide
Sito: https://aab016.github.io/studious-guide/

---

## Scadenza

**7 giugno 2026** — versione 3D funzionante sul Meta Quest

### Roadmap
| Giorni | Date | Task |
|--------|------|------|
| 1-2 | 23-24 mag | ✅ Chiudi il 2D |
| 3-5 | 25-27 mag | Three.js: scena 3D statica |
| 6-8 | 28-30 mag | WebXR sul Meta Quest |
| 9-11 | 31 mag - 2 giu | cannon-es: fisica reale |
| 12-13 | 3-4 giu | Interazione VR con controller |
| 14-15 | 5-6 giu | Buffer: bug fix e test |

---

## Struttura del progetto

```
docs/physics/
├── piano-inclinato-attrito.html   # pagina principale simulazione
├── index.html                     # hub fisica con link app terze parti
├── css/
│   └── style.css
├── js/
│   ├── main.js       # orchestratore
│   ├── state.js      # stato globale
│   ├── physics.js    # calcoli fisici
│   ├── render.js     # disegno canvas 2D
│   ├── ui.js         # aggiornamento DOM
│   ├── input.js      # eventi utente
│   ├── theme.js      # palette colori + isDark()
│   └── utils.js      # helper puri
├── cert.pem           # certificato HTTPS locale (per WebXR)
├── key.pem            # chiave privata HTTPS locale
└── server.py          # server HTTPS locale su porta 4443
```

---

## Architettura JS (moduli ES6)

### Flusso dati
```
input.js → state.js → physics.js → ui.js + render.js → DOM + canvas
```

### Responsabilità

**`state.js`** — stato globale, nessun accesso a DOM o canvas
```js
export const state = {
  theta: 30,        // angolo piano (gradi)
  mu: 0.30,         // coefficiente attrito
  mass: 5,          // massa oggetto (kg)
  shape: 'cube',    // 'cube' | 'sphere' | 'cylinder'
  grav: 9.81,       // gravità (m/s²)
  activePanel: null,   // 'plane' | 'obj' | null
  planeRegion: null,   // array 4 punti {x,y} — aggiornato da render.js
  objRegion: null,     // { cx, cy, radius } — aggiornato da render.js
}
```

**`physics.js`** — calcoli puri, input numeri → output oggetto forze
```js
computePhysics(theta, mu, mass, grav)
// → { rad, Fg, Fn, Fpara, Ff, Fr, maxF, status }
// status: 'still' | 'slide' | 'limit'
```

**`render.js`** — disegno canvas 2D, usa state + physics + theme
```js
initRenderer(canvas, ctx)
render(physics)
```

**`ui.js`** — aggiornamento DOM (badge, barre forze, pannelli)
```js
syncFrom(srcId, tgtId, mn, mx, dec)  // sync slider ↔ input numerico
getVal(id)                            // legge valore da input
openPanel(which) / closePanel(which)
updateForceDisplay(physics)
```

**`input.js`** — eventi canvas + callback esposti su window
```js
initInput(canvas, redraw)
// ritorna: { setShape, closePanelBtn,
//            onAngleSlider, onAngleNumber,
//            onMuSlider, onMuNumber,
//            onMassSlider, onMassNumber,
//            onGravSlider, onGravNumber }
```

**`main.js`** — orchestratore, tutto dentro DOMContentLoaded
- inizializza canvas con devicePixelRatio
- chiama initRenderer + initInput
- espone tutti i callback su window.*
- gestisce resize e cambio tema

**`theme.js`** — palette colori
```js
isDark()  // → boolean
col()     // → { bg, tri, text, grid, accent }
```

**`utils.js`** — helper puri
```js
clamp(v, mn, mx)
toRad(deg)
pointInCircle(mx, my, r)
pointInTriangle(mx, my, pts)
pointInQuad(mx, my, pts)
```

---

## HTML — callback inline

I callback HTML chiamano funzioni globali esposte da `main.js`:

| Elemento | Evento | Funzione |
|----------|--------|----------|
| `g-slider` | oninput | `onGravSlider()` |
| `g-num` | onchange | `onGravNumber()` |
| `angle-slider` | oninput | `onAngleSlider()` |
| `angle-num` | onchange | `onAngleNumber()` |
| `mu-slider` | oninput | `onMuSlider()` |
| `mu-num` | onchange | `onMuNumber()` |
| `mass-slider` | oninput | `onMassSlider()` |
| `mass-num` | onchange | `onMassNumber()` |
| `.shape-btn` | onclick | `setShape('cube'\|'sphere'\|'cylinder', this)` |
| `.panel-close` | onclick | `closePanelBtn('plane'\|'obj')` |

Script tag: `<script type="module" src="js/main.js"></script>`

---

## Server HTTPS locale

Necessario per WebXR (richiede HTTPS anche su localhost).

```bash
cd docs/physics
python server.py
# → https://localhost:4443
```

Certificato self-signed valido fino a maggio 2027.

---

## UX della simulazione 2D

- Il canvas mostra piano inclinato + oggetto + frecce delle forze sempre visibili
- **Click sul piano** → apre pannello con angolo (θ) e coefficiente attrito (μ)
- **Click sull'oggetto** → apre pannello con massa, forma e tabella forze
- **Barra ambiente** → sempre visibile, gravità modificabile (simula altri pianeti)
- Un solo pannello aperto per volta
- Piano ha spessore minimo 14px (cliccabile anche a θ=0°)
- Ogni proprietà ha slider + input numerico sincronizzati

### Forze visualizzate
| Colore | Forza |
|--------|-------|
| 🔴 `#E24B4A` | Peso (Fg) |
| 🔵 `#378ADD` | Normale (N) |
| 🟢 `#1D9E75` | Attrito (Ff) |
| 🟠 `#EF9F27` | Risultante (Fr) |

---

## Prossimo step: Three.js 3D

Quando si inizia la versione 3D:
- `physics.js` rimane invariato (calcoli puri, indipendenti da 2D/3D)
- `state.js` rimane invariato
- `render.js` viene sostituito con Three.js
- `ui.js` rimane invariato (pannelli HTML overlay sulla scena 3D)
- Aggiungere `cannon-es` per fisica reale dopo la scena statica