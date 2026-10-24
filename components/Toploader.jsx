'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { STICKER_BY_ID, TINT_BY_ID } from '@/lib/stickers';

// A sticker's width as a fraction of the toploader's width, at scale 1.
export const STICKER_SIZE = 0.22;

// Cuts the thumb notch out of the toploader's open top edge.
const NOTCH = '[mask-image:radial-gradient(14%_4%_at_50%_0,transparent_96%,#000_100%)]';

// Places a sticker by its stored center (fractions of the toploader), scale and rotation.
export function stickerStyle({ x, y, k, r }) {
  return {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: `${k * STICKER_SIZE * 100}%`,
    transform: `translate(-50%, -50%) rotate(${r}deg)`
  };
}

// A card in a toploader, with its stickers. Plain DOM and <img>, no WebGL, so the binder can show many.
// The toploader has the card's 63:88 shape, with the card inset and a little more room at the open top.
// Pass `children` instead of `stickers` to draw interactive stickers (the editor does).
const Toploader = forwardRef(function Toploader({ image, tint = 'clear', stickers, className, children, ...props }, ref) {
  const t = TINT_BY_ID[tint] || TINT_BY_ID.clear;
  return (
    <div ref={ref} className={cn('relative aspect-[63/88] drop-shadow-lg select-none', className)} {...props}>
      <div className={cn('absolute inset-0 rounded-[7%/5%]', NOTCH)} style={{ background: t.fill }} />
      <img alt="" src={image} draggable={false} className="absolute top-[7.5%] left-[6%] h-[88%] w-[88%] rounded-[4%/3%] object-cover" />
      {/* The plastic: tinted rim and glare, with the thumb notch cut out of the open top edge. */}
      <div
        className={cn('pointer-events-none absolute inset-0 rounded-[7%/5%] border-[3px]', NOTCH)}
        style={{
          borderColor: t.rim,
          background: 'linear-gradient(125deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 32%, transparent 55%, rgba(255,255,255,0.12) 80%)'
        }}
      />
      {stickers?.map((s, i) =>
        STICKER_BY_ID[s.id] ? (
          <img key={i} alt="" src={STICKER_BY_ID[s.id].src} draggable={false} className="pointer-events-none absolute aspect-square" style={stickerStyle(s)} />
        ) : null
      )}
      {children}
    </div>
  );
});

export default Toploader;
