// Screen flash plus a short confetti burst for Legendary and Mythic pulls.
export function celebrate(rarity) {
  const flash = document.createElement('div');
  flash.className = 'flash go';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 800);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  document.body.appendChild(cv);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);

  const colors =
    rarity === 'mythic'
      ? ['#FF5FA2', '#FFC24B', '#5EE6B0', '#5CC8FF', '#B98CFF']
      : ['#FFD45C', '#FFF1C2', '#F2A93B', '#FFFFFF'];
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2,
    y: innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 4,
    r: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.4,
    s: 4 + Math.random() * 6,
    c: colors[Math.floor(Math.random() * colors.length)]
  }));

  const start = performance.now();
  const step = now => {
    const t = now - start;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - t / 1800);
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (t < 1800) requestAnimationFrame(step);
    else cv.remove();
  };
  requestAnimationFrame(step);
}

const SPARKLE = {
  rare: { n: 8, colors: ['#FFFFFF', '#DCE6FF'] },
  epic: { n: 14, colors: ['#C9A8FF', '#8A4DFF', '#FFFFFF'] },
  legendary: { n: 22, colors: ['#FFD45C', '#FFF1C2', '#FFFFFF'] },
  mythic: { n: 30, colors: ['#FF5FA2', '#FFC24B', '#5EE6B0', '#5CC8FF', '#B98CFF'] }
};

// Twinkling stars over a card that was just revealed, for Rare and up. Plain DOM and CSS (`.sparkles` in
// globals.css), so it costs no WebGL context. Skipped entirely for reduced motion.
export function sparkle(el, rarity, delay = 0) {
  const kind = SPARKLE[rarity];
  if (!kind || !el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = el.getBoundingClientRect();
  const box = document.createElement('div');
  box.className = 'sparkles';
  Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  for (let i = 0; i < kind.n; i++) {
    // Most stars sit along the card's edge, a few across its face.
    let x = Math.random() * 100, y = Math.random() * 100;
    if (Math.random() < 0.7) {
      const side = Math.floor(Math.random() * 4);
      const off = (Math.random() - 0.5) * 16;
      if (side === 0) y = off;
      else if (side === 1) y = 100 + off;
      else if (side === 2) x = off;
      else x = 100 + off;
    }
    const s = document.createElement('span');
    s.style.setProperty('--x', `${x}%`);
    s.style.setProperty('--y', `${y}%`);
    s.style.setProperty('--s', `${8 + Math.random() * 14}px`);
    s.style.setProperty('--c', kind.colors[i % kind.colors.length]);
    s.style.setProperty('--d', `${700 + Math.random() * 600}ms`);
    s.style.setProperty('--w', `${delay + Math.random() * 500}ms`);
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), delay + 1900);
}
