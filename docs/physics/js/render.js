// Disegno canvas.
// Usa solo ctx, state e dati di physics/theme.
// NON legge input, NON tocca DOM al di fuori del canvas.

import { state } from './state.js';
import { col, isDark } from './theme.js';

let _canvas, _ctx;

export function initRenderer(canvas, ctx) {
  _canvas = canvas;
  _ctx = ctx;
}

// --- Primitive ---

function drawArrow(x1, y1, x2, y2, color) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 5) return;
  _ctx.save();
  _ctx.strokeStyle = color; _ctx.fillStyle = color;
  _ctx.lineWidth = 2.5; _ctx.lineCap = 'round';
  _ctx.beginPath(); _ctx.moveTo(x1, y1); _ctx.lineTo(x2, y2); _ctx.stroke();
  const a = Math.atan2(dy, dx), hs = 10;
  _ctx.beginPath(); _ctx.moveTo(x2, y2);
  _ctx.lineTo(x2 - hs * Math.cos(a - 0.4), y2 - hs * Math.sin(a - 0.4));
  _ctx.lineTo(x2 - hs * Math.cos(a + 0.4), y2 - hs * Math.sin(a + 0.4));
  _ctx.closePath(); _ctx.fill(); _ctx.restore();
}

function drawObject(cx, cy, rad, sz) {
  const fill   = isDark() ? '#3C3489' : '#AFA9EC';
  const stroke = isDark() ? '#7F77DD' : '#534AB7';
  const top    = isDark() ? '#4a4480' : '#c8c4e8';

  _ctx.save(); _ctx.translate(cx, cy); _ctx.rotate(-rad);
  if (state.activePanel === 'obj') { _ctx.shadowColor = stroke; _ctx.shadowBlur = 14; }

  if (state.shape === 'cube') {
    _ctx.fillStyle = fill; _ctx.strokeStyle = stroke; _ctx.lineWidth = 1.5;
    _ctx.beginPath(); _ctx.roundRect(-sz/2, -sz/2, sz, sz, 4); _ctx.fill(); _ctx.stroke();
    _ctx.shadowBlur = 0; _ctx.fillStyle = top;
    _ctx.beginPath();
    _ctx.moveTo(-sz/2, -sz/2); _ctx.lineTo(-sz/2+6, -sz/2-6);
    _ctx.lineTo(sz/2+6, -sz/2-6); _ctx.lineTo(sz/2, -sz/2);
    _ctx.closePath(); _ctx.fill(); _ctx.strokeStyle = stroke; _ctx.stroke();

  } else if (state.shape === 'sphere') {
    _ctx.fillStyle = fill; _ctx.strokeStyle = stroke; _ctx.lineWidth = 1.5;
    _ctx.beginPath(); _ctx.arc(0, 0, sz/2, 0, Math.PI * 2); _ctx.fill(); _ctx.stroke();
    _ctx.shadowBlur = 0;
    _ctx.strokeStyle = isDark() ? '#5a50a0' : '#c0bcdc'; _ctx.lineWidth = 0.5;
    _ctx.beginPath(); _ctx.ellipse(0, 0, sz/2, sz/6, 0, 0, Math.PI * 2); _ctx.stroke();

  } else { // cylinder
    _ctx.fillStyle = fill; _ctx.strokeStyle = stroke; _ctx.lineWidth = 1.5;
    _ctx.beginPath(); _ctx.roundRect(-sz/3, -sz/2, sz*2/3, sz, 4); _ctx.fill(); _ctx.stroke();
    _ctx.shadowBlur = 0; _ctx.fillStyle = top;
    _ctx.beginPath(); _ctx.ellipse(0, -sz/2, sz/3, sz/9, 0, 0, Math.PI * 2);
    _ctx.fill(); _ctx.strokeStyle = stroke; _ctx.stroke();
  }
  _ctx.restore();
}

// --- Frame principale ---

export function render(physics) {
  const { rad, Fg, Fn, Ff, Fr } = physics;
  const W = _canvas.width / (window.devicePixelRatio || 1);
  const H = _canvas.height / (window.devicePixelRatio || 1);
  const c = col();
  const theta = state.theta;
  const mass  = state.mass;

  // Background + griglia
  _ctx.clearRect(0, 0, W, H);
  _ctx.fillStyle = c.bg; _ctx.fillRect(0, 0, W, H);
  _ctx.strokeStyle = c.grid; _ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 40) { _ctx.beginPath(); _ctx.moveTo(x, 0); _ctx.lineTo(x, H); _ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { _ctx.beginPath(); _ctx.moveTo(0, y); _ctx.lineTo(W, y); _ctx.stroke(); }

  // Piano inclinato
  const pivX = 70, pivY = H - 50, planeLen = 400;
  const tipX = pivX + planeLen * Math.cos(rad);
  const tipY = pivY - planeLen * Math.sin(rad);
  const THICKNESS = 14;
  const nx = Math.sin(rad), ny = Math.cos(rad);

  const p0 = { x: pivX,              y: pivY };
  const p1 = { x: tipX,              y: tipY };
  const p2 = { x: tipX + nx * THICKNESS, y: tipY + ny * THICKNESS };
  const p3 = { x: pivX + nx * THICKNESS, y: pivY + ny * THICKNESS };

  _ctx.fillStyle = c.tri; _ctx.strokeStyle = c.text; _ctx.lineWidth = 0.5;
  _ctx.beginPath();
  _ctx.moveTo(p0.x, p0.y); _ctx.lineTo(p1.x, p1.y);
  _ctx.lineTo(p2.x, p2.y); _ctx.lineTo(p3.x, p3.y);
  _ctx.closePath(); _ctx.fill(); _ctx.stroke();

  // Texture superficie
  _ctx.strokeStyle = isDark() ? '#2e2e2b' : '#d0cfc8'; _ctx.lineWidth = 0.5;
  for (let i = 0.1; i < 1; i += 0.12) {
    const sx = pivX + planeLen * i * Math.cos(rad);
    const sy = pivY - planeLen * i * Math.sin(rad);
    _ctx.beginPath(); _ctx.moveTo(sx, sy);
    _ctx.lineTo(sx + 6 * Math.sin(rad), sy + 6 * Math.cos(rad)); _ctx.stroke();
  }

  // Highlight piano selezionato
  if (state.activePanel === 'plane') {
    _ctx.save(); _ctx.strokeStyle = c.accent; _ctx.lineWidth = 2; _ctx.setLineDash([6, 4]);
    _ctx.beginPath();
    _ctx.moveTo(p0.x, p0.y); _ctx.lineTo(p1.x, p1.y);
    _ctx.lineTo(p2.x, p2.y); _ctx.lineTo(p3.x, p3.y);
    _ctx.closePath(); _ctx.stroke(); _ctx.restore();
  }

  // Aggiorna hit region piano nello state
  state.planeRegion = [p0, p1, p2, p3];

  // Arco angolo
  _ctx.strokeStyle = c.accent; _ctx.lineWidth = 1.5;
  _ctx.beginPath(); _ctx.arc(pivX, pivY, 44, -rad, 0); _ctx.stroke();
  _ctx.font = '500 13px "Anthropic Sans",sans-serif'; _ctx.fillStyle = c.accent;
  _ctx.fillText('θ = ' + theta.toFixed(1) + '°', pivX + 48, pivY - 12);

  // Oggetto
  const t = 0.52;
  const baseX = pivX + planeLen * t * Math.cos(rad);
  const baseY = pivY - planeLen * t * Math.sin(rad);
  const sz = Math.max(28, Math.min(46, 28 + Math.sqrt(mass) * 3));
  const onx = -Math.sin(rad), ony = -Math.cos(rad);
  const ox = baseX + onx * (sz / 2);
  const oy = baseY + ony * (sz / 2);

  // Aggiorna hit region oggetto nello state
  state.objRegion = { cx: ox, cy: oy, radius: sz / 2 + 10 };

  drawObject(ox, oy, rad, sz);

  // Highlight oggetto selezionato
  if (state.activePanel === 'obj') {
    _ctx.save(); _ctx.strokeStyle = c.accent; _ctx.lineWidth = 1.5; _ctx.setLineDash([4, 3]);
    _ctx.beginPath(); _ctx.arc(ox, oy, sz / 2 + 12, 0, Math.PI * 2); _ctx.stroke(); _ctx.restore();
  }

  // Frecce forze
  const sc = 0.45;
  drawArrow(ox, oy, ox, oy + Math.min(Fg * sc, 100), '#E24B4A');
  drawArrow(ox, oy, ox + onx * Math.min(Fn * sc, 85), oy + ony * Math.min(Fn * sc, 85), '#378ADD');
  const pdx = Math.cos(rad), pdy = -Math.sin(rad);
  if (Ff > 0.5) {
    const d = Fr > 0 ? 1 : -1;
    drawArrow(ox, oy, ox + pdx * Math.min(Ff * sc, 75) * d, oy + pdy * Math.min(Ff * sc, 75) * d, '#1D9E75');
  }
  const frL = Math.min(Math.abs(Fr) * sc, 65);
  if (frL > 4) {
    const d = Fr > 0 ? -1 : 1;
    drawArrow(ox + 6, oy + 6, ox + 6 + pdx * frL * d, oy + 6 + pdy * frL * d, '#EF9F27');
  }

  // Legenda
  const leg = [['#E24B4A', 'Fg'], ['#378ADD', 'N'], ['#1D9E75', 'Ff'], ['#EF9F27', 'Fr']];
  _ctx.font = '400 11px "Anthropic Sans",sans-serif';
  leg.forEach(([color, label], i) => {
    const lx = 12 + i * 68, ly = H - 12;
    _ctx.fillStyle = color; _ctx.fillRect(lx, ly - 8, 14, 3);
    _ctx.fillStyle = c.text; _ctx.fillText(label, lx + 18, ly);
  });
}
