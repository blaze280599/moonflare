'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import HoloCard from '@/components/HoloCard/HoloCard';
import { RARITY, foilFor } from '@/lib/cards';
import { getArt, getBack, getCover } from '@/lib/art';
import { PACK_COST } from '@/lib/gacha';
import { celebrate } from '@/lib/celebrate';
import { RARITY_BADGE } from '@/lib/rarity-styles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const TAPS_TO_OPEN = 3;

// Full-screen album opening: rip the shrink-wrap, then flip five face-down HoloCards.
// Remount with a new `key` for each album so the state starts fresh.
export default function OpeningStage({ era, pulls, canAffordAnother, onOpenAnother, onInspect, onGoToBinder, onClose }) {
  const [phase, setPhase] = useState('unbox');
  const [taps, setTaps] = useState(0);
  const [revealed, setRevealed] = useState(() => pulls.map(() => false));
  const coverRef = useRef(null);
  const timers = useRef([]);

  useEffect(() => {
    coverRef.current?.focus();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const tapCover = () => {
    if (taps >= TAPS_TO_OPEN) return;
    const next = taps + 1;
    setTaps(next);
    const el = coverRef.current;
    el.classList.remove('shake');
    void el.offsetWidth; // restart the animation
    el.classList.add('shake');
    if (next === TAPS_TO_OPEN) {
      el.classList.add('burst');
      later(() => setPhase('spread'), 420);
    }
  };

  const reveal = i => {
    setRevealed(prev => {
      if (prev[i]) return prev;
      const rarity = pulls[i].card.rarity;
      if (RARITY[rarity].rank >= 3) later(() => celebrate(rarity), 240);
      return prev.map((v, k) => (k === i ? true : v));
    });
  };

  const revealAll = () => pulls.forEach((_, i) => later(() => reveal(i), i * 280));

  return (
    <div className="stage" role="dialog" aria-modal="true" aria-label="Album opening">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs tracking-wider text-white/55 uppercase">
          MOONFLARE · {era.name} · {era.sub}
        </span>
        <Button variant="ghost" size="icon-lg" onClick={onClose} aria-label="Close" className="text-white hover:bg-white/10">
          <X />
        </Button>
      </div>

      <div className="grid flex-1 place-items-center py-4">
        {phase === 'unbox' ? (
          <div className="grid justify-items-center gap-5 text-center">
            <button ref={coverRef} className="cover" data-taps={taps} onClick={tapCover} aria-label="Tap to open the album">
              <img alt="" src={getCover(era)} />
              <span className="wrapfilm" />
            </button>
            <div className="flex gap-2">
              {Array.from({ length: TAPS_TO_OPEN }, (_, i) => (
                <span key={i} className={cn('size-2.5 rounded-full border border-white/50 transition', i < taps && 'border-white bg-white')} />
              ))}
            </div>
            <p className="font-mono text-xs tracking-wider text-white/55 uppercase">
              Tap the album {TAPS_TO_OPEN} times to rip the shrink-wrap
            </p>
          </div>
        ) : (
          <div className="grid justify-items-center">
            <p className="mb-6 text-center font-mono text-xs tracking-wider text-white/55 uppercase">
              Tap a card to flip it · a glow means Epic or better
            </p>
            <div className="flex max-w-[1100px] flex-wrap justify-center gap-[clamp(10px,2vw,22px)]">
              {pulls.map(({ card, isNew, refund }, i) => (
                <div
                  key={i}
                  className={cn('slot', revealed[i] && 'revealed')}
                  style={{ animationDelay: `${i * 110}ms` }}
                  data-tell={RARITY[card.rarity].rank >= 2 ? card.rarity : undefined}
                >
                  <div className="aura" />
                  <HoloCard
                    image={getArt(card)}
                    backImage={getBack(era)}
                    flipped={!revealed[i]}
                    onClick={() => (revealed[i] ? onInspect(card) : reveal(i))}
                    alt={revealed[i] ? `${card.member?.name ?? 'MOONFLARE'} ${card.label}` : `Face-down photocard ${i + 1}`}
                    radius={10}
                    tiltMax={16}
                    style={{ '--hc-w': 'clamp(104px, 16vw, 188px)' }}
                    {...foilFor(card)}
                  />
                  <div className="cap grid justify-items-center gap-1.5 text-center">
                    <span className="text-sm font-bold">
                      {card.member ? (
                        <>
                          {card.member.name} <span className="font-medium text-white/55">{card.member.kr}</span>
                        </>
                      ) : (
                        'MOONFLARE'
                      )}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Badge className={cn('font-mono text-[9px] tracking-wider uppercase', RARITY_BADGE[card.rarity])}>{card.label}</Badge>
                      {isNew ? (
                        <span className="font-mono text-[10px] text-star">NEW</span>
                      ) : (
                        <span className="font-mono text-[10px] text-white/55">+{refund} ★</span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-2.5">
              {!revealed.every(Boolean) && (
                <Button size="lg" className="px-4" onClick={revealAll}>
                  <Sparkles />
                  Reveal all
                </Button>
              )}
              <Button size="lg" variant="outline" className="px-4" disabled={!canAffordAnother} onClick={() => onOpenAnother(era)}>
                Open another · {PACK_COST} ★
              </Button>
              <Button size="lg" variant="ghost" className="px-4 text-white hover:bg-white/10" onClick={() => onGoToBinder(era)}>
                <BookOpen />
                Go to binder
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
