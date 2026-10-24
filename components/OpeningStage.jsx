'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BookOpen, Layers, Scissors, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import HoloCard from '@/components/HoloCard/HoloCard';
import { RARITY, foilFor } from '@/lib/cards';
import { PACK, getArt, getBack } from '@/lib/art';
import { PACK_COST } from '@/lib/gacha';
import { celebrate } from '@/lib/celebrate';
import { RARITY_BADGE } from '@/lib/rarity-styles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const CARD_RATIO = 88 / 63;
const SINK = 0.3; // how far the pack drops (in pack heights) before the cards slide out of it
const TEAR_Y = PACK.tear - 0.5; // the tear line, in pack heights above the pack's center

// Pack and card sizes for the stage area. Cards are sized to fit inside the pack.
function measure(w, h) {
  const packH = Math.min(h * 0.74, (w * 0.9) / PACK.ratio, 640);
  const cardW = (packH * PACK.ratio) / 1.16;
  const cardH = cardW * CARD_RATIO;
  return {
    packH,
    cardW,
    cardH,
    // Card-stack centers, in px below the area's center: tucked inside the sunk pack, mostly out of it, and at rest.
    insideY: (-TEAR_Y + 0.012 + SINK) * packH + cardH / 2,
    outY: (-TEAR_Y + 0.012 + SINK) * packH + cardH / 2 - cardH * 0.72,
    restY: -Math.min(36, h * 0.05)
  };
}

const captionFor = (era, { card, isNew, refund }) => (
  <>
    <span className="text-sm font-bold">
      {card.member ? (
        <>
          {card.member.name} <span className="font-medium text-white/55">{card.member.kr}</span>
        </>
      ) : (
        era.group.name
      )}
    </span>
    <span className="flex items-center gap-1.5">
      <Badge className={cn('font-mono text-[9px] tracking-wider uppercase', RARITY_BADGE[card.rarity])}>{card.label}</Badge>
      {isNew ? (
        <Badge variant="outline" className="border-star/50 font-mono text-[9px] text-star">
          NEW
        </Badge>
      ) : (
        <Badge variant="outline" className="border-white/20 font-mono text-[9px] text-white/60">
          +{refund} ★
        </Badge>
      )}
    </span>
  </>
);

// Full-screen album opening: tear the 3D pack open (lib/pack3d.js), the cards slide out into a stack,
// then flip each card and swipe it away to see the next. Ends on a spread of all five.
// Remount with a new `key` for each album so the state starts fresh.
export default function OpeningStage({ era, pulls, canAffordAnother, onOpenAnother, onInspect, onGoToBinder, onClose }) {
  // Reveal the rarest card last, so each pack builds up to its best pull. Array sort is stable.
  const [deck] = useState(() => [...pulls].sort((a, b) => RARITY[a.card.rarity].rank - RARITY[b.card.rarity].rank));
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [phase, setPhase] = useState('pack'); // pack → emerge → stack → spread
  const [box, setBox] = useState(null);
  const [packReady, setPackReady] = useState(false);
  const [tearing, setTearing] = useState(false);
  const [top, setTop] = useState(0);
  const [flying, setFlying] = useState([]);
  const [revealed, setRevealed] = useState(() => deck.map(() => false));

  const areaRef = useRef(null);
  const canvasRef = useRef(null);
  const stackRef = useRef(null);
  const ripRef = useRef(null);
  const sceneRef = useRef(null);
  const dragRef = useRef(null);
  const tappedRef = useRef(false);
  const timers = useRef([]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const L = box && measure(box.w, box.h);
  const layoutRef = useRef(L);
  layoutRef.current = L;

  useLayoutEffect(() => {
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox(b => (b && b.w === width && b.h === height ? b : { w: width, h: height }));
    });
    ro.observe(areaRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      endScene();
    },
    []
  );

  const endScene = () => {
    sceneRef.current?.dispose();
    sceneRef.current = null;
  };

  // The 3D pack. three.js is loaded only once a pack is opened, so the group page stays light.
  // Without WebGL the stage skips straight to the card stack.
  useEffect(() => {
    if (!box || sceneRef.current || phase !== 'pack') return;
    let cancelled = false;
    import('@/lib/pack3d')
      .then(({ PackScene }) => {
        if (cancelled || sceneRef.current) return;
        sceneRef.current = new PackScene(canvasRef.current, {
          era,
          reducedMotion,
          onReady: () => setPackReady(true),
          onTearStart: () => setTearing(true),
          onTorn: () => {
            later(() => sceneRef.current?.present(-SINK * layoutRef.current.packH), 220);
            later(() => setPhase('emerge'), 680);
          },
          onError: () => {
            endScene();
            setPhase('stack');
          }
        });
        sceneRef.current.resize(box.w, box.h, layoutRef.current.packH);
      })
      .catch(() => {
        if (!cancelled) setPhase('stack');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, phase]);

  useEffect(() => {
    if (box && sceneRef.current) sceneRef.current.resize(box.w, box.h, layoutRef.current.packH);
  }, [box, phase]);

  useEffect(() => {
    if (packReady) ripRef.current?.focus({ preventScroll: true });
  }, [packReady]);

  // The cards slide up out of the open pack, the pack drops away, and the stack settles in the middle.
  useEffect(() => {
    if (phase !== 'emerge') return;
    const { insideY, outY, restY } = layoutRef.current;
    const el = stackRef.current;
    const duration = reducedMotion ? 500 : 1300;
    const anim = el.animate(
      [
        { transform: `translateY(${insideY}px)`, easing: 'cubic-bezier(.2,.75,.3,1)' },
        { transform: `translateY(${outY}px)`, offset: 0.5, easing: 'cubic-bezier(.5,0,.25,1)' },
        { transform: `translateY(${restY}px)` }
      ],
      { duration }
    );
    el.querySelectorAll('[data-depth]').forEach(card =>
      card.animate([{ translate: `0 ${card.dataset.depth * 26}px` }, { translate: '0 0' }], {
        duration: duration * 0.55,
        easing: 'cubic-bezier(.2,.8,.3,1)'
      })
    );
    later(() => sceneRef.current?.drop(), duration * 0.45);
    anim.onfinish = () => {
      el.style.transform = `translateY(${restY}px)`;
      endScene();
      setPhase('stack');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== 'stack') return;
    if (top >= deck.length) later(() => setPhase('spread'), 300);
    else stackRef.current?.querySelector('[data-top] .holo-card')?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, top]);

  const flip = i => {
    setRevealed(prev => {
      if (prev[i]) return prev;
      const rarity = deck[i].card.rarity;
      if (RARITY[rarity].rank >= 3) later(() => celebrate(rarity), 240);
      return prev.map((v, k) => (k === i ? true : v));
    });
  };

  // Springs a dragged card back to the middle of the stack.
  const settle = el => {
    el.style.transition = 'transform .5s cubic-bezier(.3,1.5,.5,1)';
    el.style.transform = 'none';
    later(() => (el.style.transition = ''), 520);
  };

  // Throws the top card off-screen in the direction it was swiped, and brings up the next one.
  const fling = (el, d) => {
    let { vx, vy } = d;
    if (Math.hypot(vx, vy) < 0.6) {
      const len = Math.hypot(d.x, d.y);
      [vx, vy] = len > 20 ? [d.x / len, d.y / len] : [-1, -0.2];
    }
    const n = Math.hypot(vx, vy);
    const dist = Math.max(box.w, box.h) * 1.1;
    const i = top;
    setFlying(f => [...f, i]);
    setTop(t => t + 1);
    el.style.transition = 'none';
    el.animate(
      [
        { transform: el.style.transform || 'none' },
        { transform: `translate(${d.x + (vx / n) * dist}px, ${d.y + (vy / n) * dist}px) rotate(${(vx / n) * 50}deg)` }
      ],
      { duration: reducedMotion ? 160 : 420, easing: 'cubic-bezier(.25,.7,.4,1)', fill: 'forwards' }
    ).onfinish = () => setFlying(f => f.filter(k => k !== i));
  };

  const onCardDown = e => {
    if (e.button > 0 || dragRef.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    e.currentTarget.style.transition = 'none';
    tappedRef.current = false;
    dragRef.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: 0, y: 0, vx: 0, vy: 0, t: performance.now(), moved: false };
  };

  const onCardMove = e => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    let x = e.clientX - d.x0, y = e.clientY - d.y0;
    if (Math.hypot(x, y) > 6) d.moved = true;
    // A face-down card only wobbles: it has to be flipped before it can be swiped away.
    if (!revealed[top]) [x, y] = [x * 0.25, y * 0.25];
    const now = performance.now(), ms = Math.max(1, now - d.t);
    d.vx = d.vx * 0.5 + ((x - d.x) / ms) * 0.5;
    d.vy = d.vy * 0.5 + ((y - d.y) / ms) * 0.5;
    Object.assign(d, { x, y, t: now });
    e.currentTarget.style.transform = `translate(${x}px, ${y}px) rotate(${x * 0.05}deg)`;
  };

  const onCardUp = e => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;
    // The click that follows this pointerup has been handled here.
    tappedRef.current = true;
    setTimeout(() => (tappedRef.current = false), 0);
    const el = e.currentTarget;
    if (e.type === 'pointercancel') return settle(el);
    if (!revealed[top]) {
      settle(el);
      flip(top);
    } else if (!d.moved || Math.hypot(d.x, d.y) > 90 || Math.hypot(d.vx, d.vy) > 0.6) {
      fling(el, d);
    } else {
      settle(el);
    }
  };

  // Keyboard: Enter or Space on the top card flips it, then sends it away.
  const onCardKey = () => {
    if (tappedRef.current) return;
    const el = stackRef.current?.querySelector('[data-top]');
    if (!el) return;
    if (!revealed[top]) flip(top);
    else fling(el, { x: 0, y: 0, vx: 0, vy: 0 });
  };

  const showAll = () => {
    const best = deck.filter((_, i) => !revealed[i]).reduce((a, p) => Math.max(a, RARITY[p.card.rarity].rank), -1);
    const rarity = Object.keys(RARITY).find(r => RARITY[r].rank === best);
    if (best >= 3) later(() => celebrate(rarity), 200);
    setRevealed(deck.map(() => true));
    setPhase('spread');
  };

  const current = deck[top];
  const tell = current && !revealed[top] && RARITY[current.card.rarity].rank >= 2;
  let hint = '';
  if (phase === 'pack' && packReady && !tearing) hint = 'Drag across the top of the pack to tear it open';
  else if (phase === 'stack' && current) {
    hint = !revealed[top]
      ? `Tap to flip · card ${top + 1} of ${deck.length}${tell ? ' · a glow means Epic or better' : ''}`
      : top === deck.length - 1
        ? 'Swipe it away to see all five'
        : 'Swipe it away for the next card';
  }

  return (
    <div className="stage" role="dialog" aria-modal="true" aria-label="Album opening">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate font-mono text-xs tracking-wider text-white/55 uppercase">
          {era.group.name} · {era.name}
          <span className="max-sm:hidden"> · {era.sub}</span>
        </span>
        <Button variant="ghost" size="icon-lg" onClick={onClose} aria-label="Close" className="text-white hover:bg-white/10">
          <X />
        </Button>
      </div>

      <div ref={areaRef} className={cn('relative min-h-[420px] flex-1', phase !== 'spread' && 'overflow-hidden select-none')}>
        {phase === 'spread' ? (
          <div className="grid min-h-full content-center justify-items-center py-4">
            <div className="flex max-w-[1100px] flex-wrap justify-center gap-[clamp(10px,2vw,22px)]">
              {deck.map((pull, i) => (
                <div key={i} className="slot revealed" style={{ animationDelay: `${i * 90}ms` }}>
                  <HoloCard
                    image={getArt(pull.card)}
                    flipped={false}
                    onClick={() => onInspect(pull.card)}
                    alt={`${pull.card.member?.name ?? era.group.name} ${pull.card.label}`}
                    radius={10}
                    tiltMax={16}
                    style={{ '--hc-w': 'clamp(104px, 16vw, 188px)' }}
                    {...foilFor(pull.card)}
                  />
                  <div className="cap grid justify-items-center gap-1.5 text-center">{captionFor(era, pull)}</div>
                </div>
              ))}
            </div>
            <p className="mt-5 font-mono text-xs tracking-wider text-white/55 uppercase">Tap a card for a closer look</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <Button size="lg" className="px-4" disabled={!canAffordAnother} onClick={() => onOpenAnother(era)}>
                Open another · {PACK_COST} ★
              </Button>
              <Button size="lg" variant="ghost" className="px-4 text-white hover:bg-white/10" onClick={() => onGoToBinder(era)}>
                <BookOpen />
                Go to binder
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div aria-hidden className="stage-glow" />

            {L && (
              <div
                ref={stackRef}
                className="absolute top-1/2 left-1/2"
                style={{
                  width: L.cardW,
                  height: L.cardH,
                  marginLeft: -L.cardW / 2,
                  marginTop: -L.cardH / 2,
                  transform: `translateY(${phase === 'stack' ? L.restY : L.insideY}px)`,
                  visibility: phase === 'pack' ? 'hidden' : undefined
                }}
              >
                {deck.map((pull, i) => {
                  const depth = i - top;
                  if (depth < 0 && !flying.includes(i)) return null;
                  if (depth > 4) return null;
                  const live = depth <= 0;
                  return (
                    <div
                      key={i}
                      data-depth={Math.max(0, depth)}
                      data-top={depth === 0 ? '' : undefined}
                      data-tell={depth === 0 && tell ? pull.card.rarity : undefined}
                      className={cn('deck-card', depth < 0 && 'pointer-events-none', depth === 0 && phase === 'stack' && 'touch-none')}
                      style={{
                        zIndex: depth < 0 ? 20 : 10 - depth,
                        transform: depth > 0 ? `translate(${depth * 2}px, ${depth * 5}px) rotate(${(depth % 2 ? 1.2 : -1.2) * Math.min(depth, 2)}deg)` : 'none'
                      }}
                      onPointerDown={depth === 0 && phase === 'stack' ? onCardDown : undefined}
                      onPointerMove={depth === 0 ? onCardMove : undefined}
                      onPointerUp={depth === 0 ? onCardUp : undefined}
                      onPointerCancel={depth === 0 ? onCardUp : undefined}
                    >
                      <div className="aura" />
                      {live && phase === 'stack' ? (
                        <HoloCard
                          image={getArt(pull.card)}
                          backImage={getBack(era)}
                          flipped={!revealed[i]}
                          onClick={depth === 0 ? onCardKey : undefined}
                          alt={revealed[i] ? `${pull.card.member?.name ?? era.group.name} ${pull.card.label}` : `Face-down photocard ${i + 1}`}
                          radius={10}
                          tiltMax={14}
                          style={{ '--hc-w': `${L.cardW}px` }}
                          {...foilFor(pull.card)}
                        />
                      ) : (
                        <img alt="" src={getBack(era)} draggable={false} className="size-full rounded-[10px] shadow-xl shadow-black/50" />
                      )}
                    </div>
                  );
                })}
                {phase === 'stack' && current && revealed[top] && (
                  <div
                    key={top}
                    className="absolute inset-x-[-40px] z-30 grid animate-in justify-items-center gap-1.5 text-center duration-300 fade-in-0 slide-in-from-bottom-2"
                    style={{ top: L.cardH + 30 }}
                  >
                    {captionFor(era, current)}
                  </div>
                )}
              </div>
            )}

            {(phase === 'pack' || phase === 'emerge') && <canvas ref={canvasRef} className="absolute inset-0 z-10 size-full touch-none" />}

            <p
              aria-live="polite"
              className="pointer-events-none absolute inset-x-0 top-1 z-20 px-4 text-center font-mono text-xs tracking-wider text-balance text-white/60 uppercase"
            >
              {hint}
            </p>

            <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center">
              {phase === 'pack' && packReady && !tearing && (
                <Button ref={ripRef} variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={() => sceneRef.current?.rip()}>
                  <Scissors />
                  Rip it for me
                </Button>
              )}
              {phase === 'stack' && current && (
                <Button variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={showAll}>
                  <Layers />
                  Show all
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
