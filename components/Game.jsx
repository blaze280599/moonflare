'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Gift, Hand, MoonStar, Package, RotateCcw, Sparkles, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import HoloCard from '@/components/HoloCard/HoloCard';
import OpeningStage from '@/components/OpeningStage';
import InspectModal from '@/components/InspectModal';
import Binder from '@/components/Binder';
import { CARD_BY_ID, ERAS, foilFor } from '@/lib/cards';
import { getArt, getBack, getCover, loadArtFonts } from '@/lib/art';
import { DAILY_STARS, NEW_GAME, PACK_COST, PITY_AT, RATES } from '@/lib/gacha';
import { useGame } from '@/lib/useGame';
import { RARITY_DOT } from '@/lib/rarity-styles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

const HERO_CARD = CARD_BY_ID['NB-HN-lucky'];

const CARD_KIND = { common: 'Album PC', rare: 'Selfie PC', epic: 'POB', legendary: 'Lucky draw', mythic: 'Group special' };

// Built from RATES in lib/gacha.js so the table can't drift from the real odds.
const PULL_RATES = RATES.map(r => ({ rarity: r.rarity, card: CARD_KIND[r.rarity], rate: `${r.pct}%` }));

export default function Game() {
  const { state, loaded, openPack, claimDaily, reset, dailyClaimed } = useGame();
  const [artReady, setArtReady] = useState(false);
  const [pack, setPack] = useState(null); // { id, era, pulls }
  const [inspecting, setInspecting] = useState(null);
  const [binderEra, setBinderEra] = useState(ERAS[0]);

  // Card art is drawn on canvas, so wait for the fonts it uses.
  useEffect(() => {
    loadArtFonts().then(() => setArtReady(true));
  }, []);

  const startPack = era => {
    const pulls = openPack(era);
    if (!pulls) {
      toast(`You need ${PACK_COST} ★`, { description: 'Claim your daily stars, or open albums to earn stars from duplicates.' });
      return;
    }
    setPack({ id: Date.now(), era, pulls });
  };

  useEffect(() => {
    document.body.style.overflow = pack ? 'hidden' : '';
  }, [pack]);

  // Escape closes the stage, unless a card dialog is open on top of it. The listener runs in the
  // capture phase on window, before Radix's own Escape handler closes the dialog and clears `inspecting`.
  const inspectingRef = useRef(null);
  inspectingRef.current = inspecting;
  useEffect(() => {
    if (!pack) return;
    const onKey = e => {
      if (e.key === 'Escape' && !inspectingRef.current) setPack(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [pack]);

  const canAfford = state.coins >= PACK_COST;
  const pityLeft = PITY_AT - state.pity;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/75 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <MoonStar className="size-5 text-primary" />
            <span className="font-heading text-lg font-semibold tracking-tight">Moonflare</span>
            <Badge variant="outline" className="hidden font-mono text-[10px] tracking-wider text-muted-foreground uppercase sm:inline-flex">
              Photocard Club
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-bold tabular-nums">
                  <Star className="size-4 fill-star text-star" />
                  {loaded ? state.coins.toLocaleString() : '—'}
                </div>
              </TooltipTrigger>
              <TooltipContent>Stars buy albums. Duplicate cards give stars back.</TooltipContent>
            </Tooltip>
            <Button
              size="lg"
              className="px-3"
              disabled={!loaded || dailyClaimed}
              onClick={() => {
                if (claimDaily()) toast.success(`+${DAILY_STARS} stars added`, { description: 'Come back tomorrow for more.' });
              }}
            >
              <Gift />
              {dailyClaimed ? 'Claimed today' : `Daily ${DAILY_STARS}`}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-x-clip">
          <div aria-hidden className="pointer-events-none absolute -top-48 right-[-10%] size-[640px] rounded-full bg-primary/15 blur-[140px]" />
          <div aria-hidden className="pointer-events-none absolute top-40 left-[-15%] size-[520px] rounded-full bg-rarity-epic/10 blur-[140px]" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-14 md:py-16">
            <div className="order-2 space-y-7 md:order-1">
              <div className="space-y-4">
                <Badge variant="secondary" className="gap-1.5">
                  <Sparkles className="size-3 text-primary" />
                  Neon Bloom is out now
                </Badge>
                <h1 className="font-heading text-[clamp(2.25rem,5.5vw,3.75rem)] leading-[1.05] font-semibold tracking-tight text-balance">
                  Open an album, chase your <span className="text-primary">bias</span>.
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
                  Every album holds five photocards from the five-member group MOONFLARE. Album PCs are plain, selfies glitter,
                  POBs shimmer, and lucky draws catch the light like real holo foil.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {ERAS.map(era => (
                  <Card key={era.code} className="flex-row items-center gap-4 p-3 transition hover:ring-primary/40">
                    {/* Wrapped so Card's first-child img rules (no top padding, square top corners) don't apply. */}
                    <div className="size-24 shrink-0">
                      {artReady ? (
                        <img alt={`${era.name} album cover`} src={getCover(era)} className="size-full rounded-lg object-cover shadow-lg shadow-black/40" />
                      ) : (
                        <div className="size-full rounded-lg bg-muted" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-base">{era.name}</CardTitle>
                      <CardDescription className="text-xs">{era.sub} · 5 photocards</CardDescription>
                      <Button className="mt-2 px-3" disabled={!loaded || !artReady || !canAfford} onClick={() => startPack(era)}>
                        <Package />
                        Open · {PACK_COST} ★
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <Card size="sm">
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Lucky-draw pity</span>
                    <span className="text-muted-foreground tabular-nums">
                      {state.pity} / {PITY_AT}
                    </span>
                  </div>
                  <Progress value={(state.pity / PITY_AT) * 100} className="h-1.5 *:data-[slot=progress-indicator]:bg-rarity-legendary" />
                  <p className="text-xs text-muted-foreground">
                    {pityLeft} album{pityLeft === 1 ? '' : 's'} until a guaranteed lucky draw · {state.packs} album{state.packs === 1 ? '' : 's'} opened
                  </p>
                  <Separator />
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="group -ml-2 text-muted-foreground">
                        Pull rates
                        <ChevronDown className="transition group-data-[state=open]:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rarity</TableHead>
                            <TableHead>Card</TableHead>
                            <TableHead className="text-right">Chance per card</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {PULL_RATES.map(r => (
                            <TableRow key={r.rarity}>
                              <TableCell className="capitalize">
                                <span className={cn('mr-2 inline-block size-2 rounded-full', RARITY_DOT[r.rarity])} />
                                {r.rarity}
                              </TableCell>
                              <TableCell>{r.card}</TableCell>
                              <TableCell className="text-right tabular-nums">{r.rate}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <p className="text-xs text-muted-foreground">
                        Card 5 in every album is Rare or better. A lucky draw is guaranteed by your {PITY_AT}th album without one.
                        Duplicates turn into stars.
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            </div>

            <div className="order-1 grid justify-items-center gap-4 md:order-2">
              {artReady ? (
                <HoloCard
                  image={getArt(HERO_CARD)}
                  backImage={getBack(HERO_CARD.era)}
                  alt="Haneul lucky draw photocard, tap to flip"
                  tiltMax={16}
                  style={{ '--hc-w': 'clamp(220px, 28vw, 320px)' }}
                  {...foilFor(HERO_CARD)}
                />
              ) : (
                <div className="aspect-[63/88] w-[clamp(220px,28vw,320px)] animate-pulse rounded-[14px] bg-muted" />
              )}
              <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                <Hand className="size-3.5" />
                Hover or drag to tilt · tap to flip
              </p>
            </div>
          </div>
        </section>

        <Binder era={binderEra} onEraChange={setBinderEra} owned={state.owned} artReady={artReady} onInspect={setInspecting} />
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-muted-foreground">
          <span>MOONFLARE is a made-up group. Your collection saves in this browser only.</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="-mx-2 text-muted-foreground">
                <RotateCcw />
                Reset collection
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Erase your whole collection?</AlertDialogTitle>
                <AlertDialogDescription>
                  Every card, your stars and your pity progress are deleted from this browser. You start again with {NEW_GAME.coins} stars.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my cards</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    reset();
                    toast('Collection reset', { description: `You have ${NEW_GAME.coins} stars.` });
                  }}
                >
                  Erase collection
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </footer>

      {pack && (
        <OpeningStage
          key={pack.id}
          era={pack.era}
          pulls={pack.pulls}
          canAffordAnother={canAfford}
          onOpenAnother={startPack}
          onInspect={setInspecting}
          onGoToBinder={era => {
            setBinderEra(era);
            setPack(null);
            requestAnimationFrame(() => document.getElementById('binder')?.scrollIntoView({ behavior: 'smooth' }));
          }}
          onClose={() => setPack(null)}
        />
      )}

      {inspecting && (
        <InspectModal
          key={inspecting.id}
          card={inspecting}
          owned={state.owned[inspecting.id] || 0}
          onClose={() => setInspecting(null)}
          onError={msg => toast.error(msg)}
        />
      )}
    </div>
  );
}
