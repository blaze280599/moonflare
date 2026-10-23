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
