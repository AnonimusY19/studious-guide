// Funzioni di utilità generiche.
// NON conosce canvas, DOM o stato della simulazione.

export function clamp(v, mn, mx) {
  return Math.max(mn, Math.min(mx, v));
}

export function toRad(deg) {
  return deg * Math.PI / 180;
}

// --- Hit testing geometrico ---

function sign2(p1, p2, p3) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

export function pointInCircle(mx, my, r) {
  const dx = mx - r.cx, dy = my - r.cy;
  return Math.sqrt(dx * dx + dy * dy) < r.radius;
}

export function pointInTriangle(mx, my, pts) {
  const [A, B, C] = pts;
  const d1 = sign2({ x: mx, y: my }, A, B);
  const d2 = sign2({ x: mx, y: my }, B, C);
  const d3 = sign2({ x: mx, y: my }, C, A);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}

export function pointInQuad(mx, my, pts) {
  return pointInTriangle(mx, my, [pts[0], pts[1], pts[2]]) ||
         pointInTriangle(mx, my, [pts[0], pts[2], pts[3]]);
}
