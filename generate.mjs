import fs from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const SRC = 'https://mydramalist.com/widgets/B7BV57/list_updates?status=1&header=Currently%20Watching&limit=1&type=1&seen=1';
const UA = { 'User-Agent': 'Mozilla/5.0' };

const esc = s => s.replace(/&amp;/g, '&').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

let raw = await (await fetch(SRC, { headers: UA })).text();
raw = raw.replace(/\\"/g, '"').replace(/\\\//g, '/').replace(/\\n/g, '');

const b = raw.split('mdlw-item-B7BV57"')[1];
if (!b) throw new Error('Nenhum item encontrado. O MDL pode ter bloqueado a requisição.');

const m = re => (b.match(re) || [])[1] || '';
const ep = m(/mdlw-ep-seen">\((.*?)\)/);
const [seen, total] = ep.split('/').map(Number);
const it = {
  cover: m(/<img src="(.*?)"/),
  title: m(/title="(.*?)"/),
  ep,
  pct: total ? seen / total : 0,
  type: m(/mdlw-ctype-B7BV57">(.*?)</),
  rating: parseFloat(m(/mdlw-rating-B7BV57">(.*?)</)) || 0,
  time: m(/mdlw-time-B7BV57">(.*?)</),
};

const star = (cx, cy, R = 7, r = 3) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

let cover = '';
try {
  const buf = Buffer.from(await (await fetch(it.cover, { headers: UA })).arrayBuffer());
  cover = `<image x="14" y="48" width="84" height="118" preserveAspectRatio="xMidYMid slice" clip-path="url(#c)" href="data:image/jpeg;base64,${buf.toString('base64')}"/>`;
} catch {}

const W = 460, H = 182, TX = 114;
const starsRow = [0, 1, 2, 3, 4].map(i => star(TX + 7 + i * 18, 134)).map(p => p);
const grayStars = starsRow.map(p => `<polygon points="${p}" fill="#44444c"/>`).join('');
const goldStars = starsRow.map(p => `<polygon points="${p}" fill="#ffd600"/>`).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="DejaVu Sans, sans-serif">
  <defs>
    <clipPath id="c"><rect x="14" y="48" width="84" height="118" rx="6"/></clipPath>
    <clipPath id="s"><rect x="${TX}" y="120" width="${90 * (it.rating / 10)}" height="30"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" rx="10" fill="#1b1b1f" stroke="#F9A200" stroke-width="2"/>
  <text x="14" y="32" font-size="16" font-weight="700" fill="#F9A200">Currently Watching</text>
  ${cover}
  <text x="${TX}" y="72" font-size="18" font-weight="700" fill="#fff">${esc(it.title.slice(0, 28))}</text>
  <text x="${TX}" y="92" font-size="12" fill="#9a9aa5">${esc(it.type)}</text>
  <rect x="${TX}" y="102" width="250" height="7" rx="3.5" fill="#33333b"/>
  <rect x="${TX}" y="102" width="${250 * it.pct}" height="7" rx="3.5" fill="#F9A200"/>
  <text x="${TX + 262}" y="109" font-size="12" fill="#fff">${esc(it.ep)}</text>
  ${grayStars}
  <g clip-path="url(#s)">${goldStars}</g>
  <text x="${TX + 98}" y="139" font-size="13" fill="#fff">${it.rating}</text>
  <text x="${TX}" y="160" font-size="11" fill="#77777f">${esc(it.time)}</text>
</svg>`;

fs.writeFileSync('card.svg', svg);
fs.writeFileSync('card.png', new Resvg(svg, { fitTo: { mode: 'width', value: W * 2 } }).render().asPng());
