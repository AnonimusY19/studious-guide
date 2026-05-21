// Gestione tema e palette colori.
// Ritorna solo oggetti colore, non tocca canvas né DOM.

export const isDark = () => matchMedia('(prefers-color-scheme: dark)').matches;

export function col() {
  return isDark()
    ? { bg: '#111110', tri: '#3a3a36', text: '#c2c0b6', grid: '#1e1e1c', accent: '#7F77DD' }
    : { bg: '#eef2ff', tri: '#e5e3db', text: '#3d3d3a', grid: '#e5e4e0', accent: '#534AB7' };
}
