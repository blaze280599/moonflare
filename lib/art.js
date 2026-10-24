// Procedural photocard art drawn on a canvas and cached as data URLs.
// Browser-only: call these after mount, once loadArtFonts() has resolved.
// To use real artwork, return an image URL from getArt() instead.

import { MEMBERS } from './cards';

const W = 630;
const H = 880;
const TAU = Math.PI * 2;

const mk = (w = W, h = H) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
const hashStr = s => {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const rng = seed => {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
};
const spacing = (ctx, px) => {
  if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px';
};

export async function loadArtFonts() {
  try {
    await Promise.race([
      Promise.all(
        ['700 40px "Geist"', '500 40px "Geist"', '600 30px "Gothic A1"', '500 20px "Geist Mono"'].map(f =>
          document.fonts.load(f, '하늘 Haneul ♡')
        )
      ),
      new Promise(r => setTimeout(r, 2500))
    ]);
  } catch {}
}

function paintBackground(ctx, era, m, R, w = W, h = H) {
  const tint = m ? m.color : '#FF5FA2';
  if (era.code === 'PM') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#F8DCE8'); g.addColorStop(0.55, '#C9C6F2'); g.addColorStop(1, '#8FA8EC');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.22; ctx.fillStyle = tint; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
    const moon = ctx.createRadialGradient(w * 0.5, h * 0.4, 10, w * 0.5, h * 0.4, w * 0.42);
    moon.addColorStop(0, 'rgba(255,248,226,1)'); moon.addColorStop(0.82, 'rgba(255,240,214,.95)'); moon.addColorStop(1, 'rgba(255,240,214,0)');
    ctx.fillStyle = moon; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.4, w * 0.42, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(R() * w, h * (0.15 + R() * 0.7), 60 + R() * 90, 16 + R() * 14, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(R() * w, R() * h * 0.7, R() * 2.2 + 0.4, 0, TAU); ctx.fill(); }
  } else {
    const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
    g.addColorStop(0, '#171034'); g.addColorStop(1, '#2C0C3E');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    for (let y = h * 0.62; y < h; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.restore();
    for (let i = 0; i < 26; i++) {
      ctx.globalAlpha = 0.08 + R() * 0.18; ctx.fillStyle = R() > 0.5 ? tint : '#FF4FD8';
      ctx.beginPath(); ctx.arc(R() * w, R() * h, 10 + R() * 50, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 7; i++) {
      const x = R() * w, y = R() * h, r = 24 + R() * 44, rot = R() * TAU, col = R() > 0.4 ? tint : '#FF4FD8';
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.shadowColor = col; ctx.shadowBlur = 18;
      for (let p = 0; p < 6; p++) { ctx.rotate(TAU / 6); ctx.beginPath(); ctx.ellipse(0, r * 0.55, r * 0.26, r * 0.55, 0, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
  }
}

const silCache = new Map();
function silhouette(m, fill) {
  const key = m.code + fill;
  if (silCache.has(key)) return silCache.get(key);
  const c = mk(), x = c.getContext('2d');
  const R = rng(hashStr(m.code + 'sil'));
  x.fillStyle = fill;
  x.translate(315, H); x.rotate((R() - 0.5) * 0.09); x.translate(-315, -H);
  x.beginPath(); x.moveTo(40, H); x.bezierCurveTo(50, 650, 190, 592, 315, 586); x.bezierCurveTo(440, 592, 580, 650, 590, H); x.closePath(); x.fill();
  x.fillRect(279, 430, 72, 180);
  x.beginPath(); x.ellipse(315, 370, 82, 102, 0, 0, TAU); x.fill();
  x.beginPath();
  switch (m.hair) {
    case 'long':
      x.ellipse(315, 352, 116, 124, 0, 0, TAU); x.fill();
      x.beginPath(); x.moveTo(200, 352); x.quadraticCurveTo(170, 620, 214, 712); x.lineTo(416, 712); x.quadraticCurveTo(460, 620, 430, 352); x.closePath(); x.fill();
      break;
    case 'bob':
      x.ellipse(315, 368, 124, 122, 0, 0, TAU); x.fill();
      x.fillRect(191, 368, 248, 136);
      break;
    case 'short':
      x.ellipse(315, 336, 104, 94, -0.12, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(250, 312, 60, 40, -0.6, 0, TAU); x.fill();
      break;
    case 'pony':
      x.ellipse(315, 344, 108, 100, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(440, 300, 46, 82, 0.5, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(470, 380, 30, 70, 0.2, 0, TAU); x.fill();
      break;
    default: // wavy
      x.ellipse(315, 350, 118, 122, 0, 0, TAU); x.fill();
      for (let y = 380; y <= 700; y += 44) {
        const off = Math.sin(y / 30) * 10;
        x.beginPath(); x.arc(206 + off, y, 44, 0, TAU); x.fill();
        x.beginPath(); x.arc(424 - off, y, 44, 0, TAU); x.fill();
      }
  }
  silCache.set(key, c);
  return c;
}

function paintFigure(ctx, m, era, dx = 0, dy = 0, s = 1) {
  const neon = era.code === 'NB';
  const body = silhouette(m, neon ? '#07060E' : '#26214E');
  const rim = silhouette(m, neon ? m.color : '#FFFFFF');
  ctx.save();
  ctx.shadowColor = neon ? m.color : 'rgba(255,255,255,.9)';
  ctx.shadowBlur = 46 * s;
  ctx.globalAlpha = neon ? 0.95 : 0.6;
  ctx.drawImage(rim, dx - 5 * s, dy - 3 * s, W * s, H * s);
  ctx.restore();
  ctx.drawImage(body, dx + 3 * s, dy + 2 * s, W * s, H * s);
}

// Crescent = circle minus an offset circle, cut with an even-odd clip so the art underneath stays intact.
function paintCrescent(ctx, cx, cy, r, ox, oy, rCut, color) {
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - r * 2, cy - r * 2, r * 4, r * 4); ctx.arc(cx + ox, cy + oy, rCut, 0, TAU); ctx.clip('evenodd');
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  ctx.restore();
}

function paintLogo(ctx, x, y, color, size = 22) {
  paintCrescent(ctx, x + size * 0.45, y - size * 0.36, size * 0.42, size * 0.17, -size * 0.1, size * 0.36, color);
  ctx.save();
  ctx.fillStyle = color; ctx.font = `500 ${size}px "Geist Mono", monospace`; spacing(ctx, size * 0.22);
  ctx.textBaseline = 'alphabetic'; ctx.fillText('MOONFLARE', x + size * 1.15, y);
  ctx.restore();
}

function paintName(ctx, card) {
  const m = card.member;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 18;
  ctx.font = '600 30px "Gothic A1", sans-serif';
  ctx.fillText(m.kr, 44, 768);
  ctx.font = '700 80px "Geist", sans-serif'; spacing(ctx, -3);
  ctx.fillText(m.name, 40, 844);
  ctx.restore();
}

function paintStar(ctx, x, y, r, color) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function paintHeart(ctx, x, y, s, color) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(0, 6); ctx.bezierCurveTo(-14, -6, -6, -18, 0, -9); ctx.bezierCurveTo(6, -18, 14, -6, 0, 6); ctx.fill(); ctx.restore();
}

const artCache = new Map();
export function getArt(card) {
  // Real groups' photos are hotlinked from the wiki CDN, already cropped to card shape.
  if (card.photo) return card.photo;
  if (artCache.has(card.id)) return artCache.get(card.id);
  const c = mk(), ctx = c.getContext('2d');
  const R = rng(hashStr(card.id));
  const era = card.era, m = card.member;

  if (card.variant === 'group') {
    paintBackground(ctx, era, null, R);
    const order = [3, 1, 0, 2, 4];
    order.forEach((idx, k) => {
      const s = k === 2 ? 0.62 : 0.52;
      const x = [-40, 90, 160, 250, 360][k], y = H - H * s - (k === 2 ? 70 : 40);
      paintFigure(ctx, MEMBERS[idx], era, x, y, s);
    });
    ctx.fillStyle = 'rgba(10,6,24,.35)'; ctx.fillRect(0, 0, W, 150);
    paintLogo(ctx, 44, 70, '#FFFFFF', 22);
    ctx.save(); ctx.fillStyle = '#FFE7A6'; ctx.font = '500 18px "Geist Mono", monospace'; spacing(ctx, 4); ctx.fillText('GROUP SPECIAL · ' + era.name.toUpperCase(), 44, 114); ctx.restore();
    ctx.save(); ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20; ctx.font = '700 84px "Geist", sans-serif'; spacing(ctx, -2); ctx.textAlign = 'center'; ctx.fillText('MOONFLARE', W / 2, 330); ctx.restore();
    for (let i = 0; i < 18; i++) paintStar(ctx, R() * W, 160 + R() * 260, 4 + R() * 9, '#FFE7A6');
  } else if (card.variant === 'selfie') {
    ctx.fillStyle = '#FBFAF6'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.rect(34, 34, W - 68, 662); ctx.clip();
    ctx.translate(34, 34); ctx.scale((W - 68) / W, (W - 68) / W);
    paintBackground(ctx, era, m, R); paintFigure(ctx, m, era, 0, 30);
    ctx.restore();
    for (let i = 0; i < 4; i++) paintHeart(ctx, 70 + R() * 480, 70 + R() * 240, 1.4 + R() * 1.4, m.color);
    ctx.save(); ctx.fillStyle = '#FF8A3D'; ctx.font = '500 26px "Geist Mono", monospace'; ctx.shadowColor = '#FF8A3D'; ctx.shadowBlur = 8; ctx.textAlign = 'right';
    ctx.fillText(era.code === 'PM' ? "'26 03 14" : "'26 09 02", W - 58, 672); ctx.restore();
    ctx.save(); ctx.fillStyle = '#2B2340';
    let size = 32; ctx.font = `500 ${size}px "Geist", "Gothic A1", sans-serif`;
    const caption = `${m.msg} — ${m.kr}`;
    while (ctx.measureText(caption).width > W - 110 && size > 20) { size -= 2; ctx.font = `500 ${size}px "Geist", "Gothic A1", sans-serif`; }
    ctx.fillText(caption, 56, 790); ctx.restore();
    ctx.save(); ctx.fillStyle = '#8E879E'; ctx.font = '500 16px "Geist Mono", monospace'; spacing(ctx, 3); ctx.fillText(`${card.num} · SELFIE`, 54, 840); ctx.restore();
  } else {
    paintBackground(ctx, era, m, R);
    paintFigure(ctx, m, era, 0, 0);
    const shade = ctx.createLinearGradient(0, H * 0.62, 0, H);
    shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(10,6,24,.55)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
    paintLogo(ctx, 40, 66, era.code === 'PM' ? '#2B2552' : '#FFFFFF', 20);
    ctx.save(); ctx.fillStyle = era.code === 'PM' ? '#2B2552' : '#FFFFFF'; ctx.font = '500 16px "Geist Mono", monospace'; ctx.textAlign = 'right'; spacing(ctx, 3); ctx.fillText(card.num, W - 40, 62); ctx.restore();
    if (card.variant === 'pob') {
      ctx.save(); ctx.translate(W - 112, 168); ctx.rotate(0.22);
      ctx.fillStyle = m.color; ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(0, 0, 58, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.font = '700 40px "Geist", sans-serif'; ctx.fillText('POB', 0, 10);
      ctx.font = '500 11px "Geist Mono", monospace'; spacing(ctx, 2); ctx.fillText('MOON RECORDS', 0, 32);
      ctx.restore();
      for (let i = 0; i < 3; i++) paintStar(ctx, 60 + R() * 500, 140 + R() * 400, 12 + R() * 10, '#FFFFFF');
    }
    if (card.variant === 'lucky') {
      for (let i = 0; i < 30; i++) paintStar(ctx, R() * W, R() * H * 0.75, 2 + R() * 7, '#FFE7A6');
      ctx.save(); ctx.fillStyle = '#F2C14E'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(40, 86, 176, 34, 17) : ctx.rect(40, 86, 176, 34); ctx.fill();
      ctx.fillStyle = '#2A1A00'; ctx.font = '500 16px "Geist Mono", monospace'; spacing(ctx, 3); ctx.fillText('LUCKY DRAW', 58, 109); ctx.restore();
      ctx.save(); ctx.strokeStyle = '#F7CF6A'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = '#F7CF6A'; ctx.shadowBlur = 12;
      ctx.beginPath(); let px = 330, py = 650; ctx.moveTo(px, py);
      for (let i = 0; i < 5; i++) { const nx = px + 40 + R() * 28, ny = 620 + R() * 60; ctx.bezierCurveTo(px + R() * 30, py - 70 * R(), nx - 20, ny + 50 * R(), nx, ny); px = nx; py = ny; }
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(320, 700); ctx.quadraticCurveTo(450, 728, 590, 680); ctx.stroke();
      ctx.restore();
    }
    paintName(ctx, card);
  }
  const url = c.toDataURL('image/jpeg', 0.9);
  artCache.set(card.id, url);
  return url;
}

const backCache = new Map();
export function getBack(era) {
  if (backCache.has(era.code)) return backCache.get(era.code);
  const c = mk(), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, W, H);
  if (era.code === 'PM') { g.addColorStop(0, '#2A2458'); g.addColorStop(1, '#4B3A7A'); } else { g.addColorStop(0, '#1A0B2E'); g.addColorStop(1, '#4A0E4E'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.5);
  const name = era.group.name;
  ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.font = '500 22px "Geist Mono", monospace'; spacing(ctx, 6);
  for (let y = -900; y < 900; y += 46) ctx.fillText(`${name} `.repeat(4), -700 + (y % 92 === 0 ? 0 : 60), y);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.strokeRect(28, 28, W - 56, H - 56);
  paintCrescent(ctx, W / 2, 380, 96, 46, -28, 84, '#FFFFFF');
  ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.arc(W / 2 + 46, 352, 84, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.font = '700 60px "Geist", sans-serif'; spacing(ctx, -1.5); ctx.fillText(name, W / 2, 580);
  ctx.font = '500 18px "Geist Mono", monospace'; spacing(ctx, 5); ctx.fillText(`${era.name.toUpperCase()} · ${era.sub.toUpperCase()}`, W / 2, 626);
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '500 14px "Geist Mono", monospace'; ctx.fillText('OFFICIAL PHOTOCARD', W / 2, 800);
  const url = c.toDataURL('image/jpeg', 0.9);
  backCache.set(era.code, url);
  return url;
}

const coverCache = new Map();
export function getCover(era) {
  if (era.cover) return era.cover;
  if (coverCache.has(era.code)) return coverCache.get(era.code);
  const S = 600, c = mk(S, S), ctx = c.getContext('2d');
  const R = rng(hashStr(era.code + 'cover'));
  paintBackground(ctx, era, MEMBERS[era.code === 'PM' ? 1 : 0], R, S, S);
  ctx.save(); ctx.fillStyle = era.code === 'PM' ? '#26214E' : '#FFFFFF'; ctx.textAlign = 'center';
  ctx.font = '700 80px "Geist", sans-serif'; spacing(ctx, -3); ctx.fillText(era.name.split(' ')[0], S / 2, 290);
  ctx.fillText(era.name.split(' ')[1], S / 2, 380);
  ctx.font = '500 20px "Geist Mono", monospace'; spacing(ctx, 6); ctx.fillText('MOONFLARE · ' + era.sub.toUpperCase(), S / 2, 470);
  ctx.restore();
  const url = c.toDataURL('image/jpeg', 0.9);
  coverCache.set(era.code, url);
  return url;
}

// Crops an uploaded photo to the card's 63:88 shape.
export function photoToCard(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = mk(), ctx = c.getContext('2d');
      const s = Math.max(W / img.width, H / img.height);
      ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable image'));
    };
    img.src = url;
  });
}

// ---------- booster pack wrapper, for the 3D pack in lib/pack3d.js ----------

// Pack shape as fractions of its height: width, the crimped seal at each end, and the tear line
// (measured up from the bottom). The 3D mesh and these textures both read it, so they line up.
export const PACK = { ratio: 0.62, crimp: 0.055, tear: 0.84 };
const PW = 800;
const PH = Math.round(PW / PACK.ratio);
const CRIMP = Math.round(PH * PACK.crimp);
const TEAR_Y = Math.round(PH * (1 - PACK.tear));

const loadImage = src =>
  new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

// A hue taken from the cover's average color, so each era's pack gets its own foil.
function hueFrom(img) {
  let r = 0, g = 0, b = 0;
  try {
    const c = mk(8, 8), x = c.getContext('2d');
    x.drawImage(img, 0, 0, 8, 8);
    const d = x.getImageData(0, 0, 8, 8).data;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  } catch {
    return 330;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b), span = max - min;
  if (span < 8 * 64) return 330;
  let h;
  if (max === r) h = 60 * ((g - b) / span);
  else if (max === g) h = 60 * ((b - r) / span) + 120;
  else h = 60 * ((r - g) / span) + 240;
  return Math.round((h + 360) % 360);
}

// Zigzag cut along both seals, plus a tear notch on each side. Cleared pixels are alpha-tested away.
function cutEdges(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const n = 44, step = PW / n, depth = 14;
  for (const [edge, dir] of [[0, 1], [PH, -1]]) {
    ctx.beginPath(); ctx.moveTo(0, edge);
    for (let i = 0; i <= n; i++) ctx.lineTo(i * step, edge + (i % 2 ? depth : 0) * dir);
    ctx.lineTo(PW, edge); ctx.closePath(); ctx.fill();
  }
  for (const [x, dir] of [[0, 1], [PW, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, TEAR_Y - 10); ctx.lineTo(x + 16 * dir, TEAR_Y); ctx.lineTo(x, TEAR_Y + 10); ctx.fill();
  }
  ctx.restore();
}

function paintCrimps(ctx, h) {
  for (const y0 of [0, PH - CRIMP]) {
    ctx.fillStyle = `hsl(${h} 40% 72%)`; ctx.fillRect(0, y0, PW, CRIMP);
    for (let x = 0; x < PW; x += 6) {
      ctx.fillStyle = x % 12 ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.16)';
      ctx.fillRect(x, y0, 3, CRIMP);
    }
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(0, y0 ? y0 : CRIMP - 3, PW, 3);
  }
}

function paintBand(ctx, h, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, PW, y1);
  g.addColorStop(0, `hsl(${h} 70% 60%)`); g.addColorStop(0.5, `hsl(${(h + 30) % 360} 80% 74%)`); g.addColorStop(1, `hsl(${h} 70% 54%)`);
  ctx.fillStyle = g; ctx.fillRect(0, y0, PW, y1 - y0);
  ctx.save(); ctx.beginPath(); ctx.rect(0, y0, PW, y1 - y0); ctx.clip();
  ctx.globalAlpha = 0.14; ctx.fillStyle = '#FFFFFF';
  const slant = (y1 - y0) * 0.6;
  for (let x = -slant; x < PW; x += 90) {
    ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x + 40, y1); ctx.lineTo(x + 40 + slant, y0); ctx.lineTo(x + slant, y0); ctx.fill();
  }
  ctx.restore();
}

function paintTearLine(ctx) {
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(0, TEAR_Y - 2, PW, 3);
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(0, TEAR_Y + 1, PW, 3);
}

// The era title block. Drawn twice: in color on the front, and as foil on the front's metalness map.
function paintTitle(ctx, era, fill, stroke) {
  const base = PH - CRIMP;
  ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = fill;
  ctx.font = '500 26px "Geist Mono", monospace'; spacing(ctx, 8);
  ctx.fillText(era.group.name, PW / 2, base - 188);
  let size = 112;
  ctx.font = `700 ${size}px "Geist", sans-serif`; spacing(ctx, -3);
  while (ctx.measureText(era.name).width > PW - 90 && size > 48) { size -= 4; ctx.font = `700 ${size}px "Geist", sans-serif`; }
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = stroke; ctx.strokeText(era.name, PW / 2, base - 86); }
  ctx.fillText(era.name, PW / 2, base - 86);
  ctx.font = '500 20px "Geist Mono", monospace'; spacing(ctx, 6);
  ctx.fillText('5 PHOTOCARDS', PW / 2, base - 38);
  ctx.restore();
}

function lineup(era) {
  const c = mk(W, 800), ctx = c.getContext('2d');
  paintBackground(ctx, era, null, rng(hashStr(era.code + 'pack')), W, 800);
  [3, 1, 0, 2, 4].forEach((idx, k) => {
    const s = k === 2 ? 0.66 : 0.56;
    paintFigure(ctx, MEMBERS[idx], era, [-60, 80, 140, 240, 370][k], 800 - H * s - (k === 2 ? 150 : 110), s);
  });
  return c;
}

// Draws both faces of an era's pack. Resolves to canvases: `front` and `back` are color;
// `frontOrm` and `backOrm` hold roughness (green) and metalness (blue), the channels three.js reads,
// so the bands and lettering shine like foil while the art stays print-matte; `alpha` is the cut outline.
export async function getPackArt(era) {
  // Real groups wear their album cover. Drawn eras get a member lineup instead, since their cover already has a title on it.
  const art = era.cover ? await loadImage(era.cover) : lineup(era);
  const h = art ? hueFrom(art) : 330;
  const top = TEAR_Y, bottom = PH - CRIMP, mid = CRIMP + (TEAR_Y - CRIMP) / 2;
  const orm = (ctx, rough, metal, x, y, w, hh) => {
    ctx.fillStyle = `rgb(0,${Math.round(rough * 255)},${Math.round(metal * 255)})`;
    ctx.fillRect(x, y, w, hh);
  };

  const front = mk(PW, PH), f = front.getContext('2d');
  f.fillStyle = `hsl(${h} 50% 18%)`; f.fillRect(0, 0, PW, PH);
  if (art) {
    const s = Math.max(PW / art.width, (bottom - top) / art.height);
    f.drawImage(art, (PW - art.width * s) / 2, top + (bottom - top - art.height * s) / 2, art.width * s, art.height * s);
  } else {
    f.save(); f.translate(0, top); paintBackground(f, era, null, rng(hashStr(era.code)), PW, bottom - top); f.restore();
  }
  const shade = f.createLinearGradient(0, bottom - 340, 0, bottom);
  shade.addColorStop(0, 'rgba(8,4,20,0)'); shade.addColorStop(1, 'rgba(8,4,20,.85)');
  f.fillStyle = shade; f.fillRect(0, bottom - 340, PW, 340);
  const glow = f.createLinearGradient(0, top, 0, top + 70);
  glow.addColorStop(0, 'rgba(255,255,255,.35)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  f.fillStyle = glow; f.fillRect(0, top, PW, 70);
  paintBand(f, h, CRIMP, TEAR_Y);
  paintLogo(f, 44, mid + 12, '#FFFFFF', 30);
  f.save();
  f.fillStyle = '#16121F'; f.beginPath(); f.roundRect(PW - 128, mid - 24, 84, 48, 10); f.fill();
  f.fillStyle = '#FFFFFF'; f.font = '700 26px "Geist Mono", monospace'; f.textAlign = 'center'; f.fillText(era.code, PW - 86, mid + 9);
  f.restore();
  paintTearLine(f);
  paintTitle(f, era, '#FFFFFF', `hsl(${h} 70% 28%)`);
  paintCrimps(f, h);
  f.fillStyle = 'rgba(255,255,255,.4)'; f.fillRect(0, 0, 3, PH); f.fillRect(PW - 3, 0, 3, PH);

  const frontOrm = mk(PW, PH), fo = frontOrm.getContext('2d');
  orm(fo, 0.42, 0.08, 0, 0, PW, PH);
  orm(fo, 0.22, 0.85, 0, 0, PW, TEAR_Y);
  orm(fo, 0.3, 0.75, 0, PH - CRIMP, PW, CRIMP);
  paintTitle(fo, era, 'rgb(0,50,235)', null);

  const back = mk(PW, PH), b = back.getContext('2d');
  paintBand(b, h, 0, PH);
  b.fillStyle = 'rgba(10,6,24,.3)'; b.fillRect(0, 0, PW, PH);
  b.save(); b.translate(PW / 2, PH / 2); b.rotate(-0.5);
  b.fillStyle = 'rgba(255,255,255,.08)'; b.font = '500 24px "Geist Mono", monospace'; spacing(b, 6);
  for (let y = -1100; y < 1100; y += 52) b.fillText('MOONFLARE '.repeat(5), -900 + (y % 104 === 0 ? 0 : 70), y);
  b.restore();
  paintCrescent(b, PW / 2, 470, 120, 56, -34, 104, '#FFFFFF');
  b.save(); b.fillStyle = '#FFFFFF'; b.textAlign = 'center';
  b.font = '700 66px "Geist", sans-serif'; spacing(b, -2); b.fillText('MOONFLARE', PW / 2, 700);
  b.font = '500 22px "Geist Mono", monospace'; spacing(b, 8); b.fillText('PHOTOCARD CLUB', PW / 2, 744);
  spacing(b, 3); b.fillText(`${era.group.name} · ${era.name}`.toUpperCase(), PW / 2, 860);
  b.globalAlpha = 0.7; b.font = '500 17px "Geist Mono", monospace'; b.fillText('5 RANDOM PHOTOCARDS FROM THIS ERA', PW / 2, 896);
  b.restore();
  const R = rng(hashStr(era.code + 'bar'));
  b.fillStyle = '#FFFFFF'; b.fillRect(PW - 250, bottom - 150, 190, 100);
  b.fillStyle = '#111111';
  for (let x = PW - 236; x < PW - 76;) { const w = 2 + Math.floor(R() * 4); b.fillRect(x, bottom - 138, w, 62); x += w + 2 + Math.floor(R() * 3); }
  b.font = '500 13px "Geist Mono", monospace'; b.fillText(`8 809 ${String(hashStr(era.code)).slice(0, 6)}`, PW - 232, bottom - 60);
  paintTearLine(b);
  paintCrimps(b, h);

  const backOrm = mk(PW, PH), bo = backOrm.getContext('2d');
  orm(bo, 0.26, 0.8, 0, 0, PW, PH);
  orm(bo, 0.6, 0, PW - 250, bottom - 150, 190, 100);

  const alpha = mk(PW, PH), a = alpha.getContext('2d');
  a.fillStyle = '#FFFFFF'; a.fillRect(0, 0, PW, PH);
  for (const ctx of [f, b, a]) cutEdges(ctx);

  return { front, back, frontOrm, backOrm, alpha };
}
