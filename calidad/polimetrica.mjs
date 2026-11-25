// Genera docs/evidencias/polimetrica.svg desde las mediciones guardadas.
// Ancho = funciones, alto = LOC, color = complejidad ciclomática total.
import fs from 'node:fs';
import path from 'node:path';

const ev = path.resolve(import.meta.dirname, '../docs/evidencias');
const leer = (e) => JSON.parse(fs.readFileSync(path.join(ev, e, 'componentes.json'), 'utf8'));
const COMPONENTES = ['services/order.service.ts', 'services/quote.service.ts', 'controllers/order.controller.ts', 'controllers/material.controller.ts'];
const color = (cc) => (cc > 45 ? '#b42318' : cc > 30 ? '#e07b39' : cc > 20 ? '#f2c14e' : '#4f9d69');
const ALTO = 0.75, ANCHO = 5, BASE = 380;

let x = 40;
let cuerpo = '';
for (const nombre of COMPONENTES) {
  const inicio = x;
  for (const etapa of ['antes', 'despues']) {
    const c = leer(etapa).find((k) => k.archivo === `backend/src/${nombre}`);
    const w = c.funciones * ANCHO, h = c.loc * ALTO;
    const cx = x + Math.max(w, 80) / 2;
    cuerpo += `<rect x="${cx - w / 2}" y="${BASE - h}" width="${w}" height="${h}" fill="${color(c.ccTotal)}" stroke="#333"/>
<text x="${cx}" y="${BASE - h - 6}" class="v">${c.loc} LOC / ${c.funciones} f</text>
<text x="${cx}" y="${BASE + 16}" class="v">${etapa === 'antes' ? 'Antes' : 'Después'}</text>
<text x="${cx}" y="${BASE + 31}" class="v">CC ${c.ccTotal}</text>\n`;
    x += Math.max(w, 80) + 20;
  }
  cuerpo += `<text x="${(inicio + x - 20) / 2}" y="${BASE + 54}" class="n">${nombre.split('/')[1]}</text>\n`;
  x += 25;
}
const ley = [['#4f9d69', 'CC hasta 20'], ['#f2c14e', '21 a 30'], ['#e07b39', '31 a 45'], ['#b42318', 'más de 45']];
const leyenda = ley.map(([c, t], i) => `<rect x="${40 + i * 120}" y="455" width="14" height="14" fill="${c}"/><text x="${60 + i * 120}" y="467" class="l">${t}</text>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} 490" width="${x}" height="490" font-family="Arial, sans-serif">
<style>.v{font-size:11px;text-anchor:middle}.n{font-size:13px;font-weight:bold;text-anchor:middle}.l{font-size:12px}</style>
<rect width="100%" height="100%" fill="#fff"/>
<text x="40" y="24" font-size="15" font-weight="bold">Representación polimétrica: ancho = funciones, alto = LOC, color = complejidad ciclomática total (CC)</text>
${cuerpo}${leyenda}
</svg>
`;
fs.writeFileSync(path.join(ev, 'polimetrica.svg'), svg);
