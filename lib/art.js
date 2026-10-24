// Card art: photo URLs for cards and covers, plus card backs and booster pack wrappers drawn on a canvas.
// Browser-only: call these after mount, once loadArtFonts() has resolved.

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
        ['700 40px "Geist"', '500 40px "Geist"', '500 20px "Geist Mono"'].map(f =>
          document.fonts.load(f, 'LE SSERAFIM ·')
        )
      ),
      new Promise(r => setTimeout(r, 2500))
    ]);
  } catch {}
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

// Photos are hotlinked from the wiki CDN, already cropped to card shape.
export const getArt = card => card.photo;

const backCache = new Map();
export function getBack(era) {
  if (backCache.has(era.code)) return backCache.get(era.code);
  const c = mk(), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1A0B2E'); g.addColorStop(1, '#4A0E4E');
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

export const getCover = era => era.cover;

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

// A gold "LIMITED EDITION" sticker on event packs. Drawn on the color map and again as foil on the metalness map.
function paintLimited(ctx, fill, text) {
  ctx.save();
  ctx.translate(PW - 200, TEAR_Y + 110); ctx.rotate(0.12);
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(-140, -30, 280, 60, 30); ctx.fill();
  if (text) {
    ctx.fillStyle = text; ctx.textAlign = 'center'; ctx.font = '700 20px "Geist Mono", monospace'; spacing(ctx, 3);
    ctx.fillText('LIMITED EDITION', 0, 7);
  }
  ctx.restore();
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

// Draws both faces of an era's pack. Resolves to canvases: `front` and `back` are color;
// `frontOrm` and `backOrm` hold roughness (green) and metalness (blue), the channels three.js reads,
// so the bands and lettering shine like foil while the art stays print-matte; `alpha` is the cut outline.
export async function getPackArt(era) {
  // The pack wears the album cover. If it doesn't load, the art area keeps the plain hue fill.
  const art = await loadImage(era.cover);
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
  if (era.event) paintLimited(f, '#F2C14E', '#2A1A00');
  paintTitle(f, era, '#FFFFFF', `hsl(${h} 70% 28%)`);
  paintCrimps(f, h);
  f.fillStyle = 'rgba(255,255,255,.4)'; f.fillRect(0, 0, 3, PH); f.fillRect(PW - 3, 0, 3, PH);

  const frontOrm = mk(PW, PH), fo = frontOrm.getContext('2d');
  orm(fo, 0.42, 0.08, 0, 0, PW, PH);
  orm(fo, 0.22, 0.85, 0, 0, PW, TEAR_Y);
  orm(fo, 0.3, 0.75, 0, PH - CRIMP, PW, CRIMP);
  if (era.event) paintLimited(fo, 'rgb(0,40,240)', null);
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
  b.globalAlpha = 0.7; b.font = '500 17px "Geist Mono", monospace'; b.fillText(era.event ? '5 EVENT-EXCLUSIVE PHOTOCARDS · LIMITED TIME' : '5 RANDOM PHOTOCARDS FROM THIS ERA', PW / 2, 896);
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
