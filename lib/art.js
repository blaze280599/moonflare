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
