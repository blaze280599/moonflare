'use client';

import { Lock, Sparkles, Sticker } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CARDS, ERAS, GROUPS } from '@/lib/cards';
import { getArt } from '@/lib/art';
import { eventPhase } from '@/lib/events';
import { useNow } from '@/lib/useNow';
import Toploader from '@/components/Toploader';
import { RARITY_BADGE, RARITY_RING } from '@/lib/rarity-styles';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

// Static thumbnails only: every live HoloCard holds a WebGL context, and browsers cap them at ~16.
// Decorated cards show in their toploader (plain DOM too) with a sticker badge.
export default function Binder({ era, onEraChange, owned, deco, artReady, onInspect }) {
  const cards = CARDS.filter(c => c.era.code === era.code);
  const count = cards.filter(c => owned[c.id]).length;
  // Upcoming event albums aren't listed until they open. Minute ticks are plenty for the picker.
  const now = useNow(60_000);
  const listed = g => ERAS.filter(e => e.group === g && eventPhase(e, now) !== 'upcoming');

  return (
    <section id="binder" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-16">
      <Card>
        <CardHeader className="border-b max-sm:flex max-sm:flex-col">
          <CardTitle className="font-heading text-2xl font-semibold tracking-tight">Your binder</CardTitle>
          <CardDescription>
            {count} of {cards.length} {era.group.name} {era.name} cards collected
            {era.event && (eventPhase(era, now) === 'ended' ? ' · event ended, these cards can’t be pulled any more' : ' · limited event album')}
          </CardDescription>
          <Progress value={(count / cards.length) * 100} className="mt-1.5 h-1.5 max-w-xs max-sm:max-w-none" />
          <CardAction className="max-sm:mt-2">
            <Select value={era.code} onValueChange={code => onEraChange(ERAS.find(e => e.code === code))}>
              <SelectTrigger aria-label="Binder album" className="w-56 max-sm:w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUPS.map(g => (
                  <SelectGroup key={g.code}>
                    <SelectLabel>{g.name}</SelectLabel>
                    {listed(g).map(e => (
                      <SelectItem key={e.code} value={e.code}>
                        {e.name}
                        {e.event && <Sparkles className="text-primary" />}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] sm:gap-4">
            {cards.map(c => {
              const n = owned[c.id] || 0;
              const who = c.member ? c.member.name : 'Group';
              if (!n || !artReady) {
                return (
                  <div
                    key={c.id}
                    className="grid aspect-[63/88] place-items-center rounded-lg border border-dashed bg-muted/30 p-2 text-center"
                  >
                    <div className="space-y-1.5">
                      <Lock className="mx-auto size-4 text-muted-foreground/60" />
                      <div className="font-mono text-[11px] tracking-wider text-muted-foreground">{c.num}</div>
                      <div className="text-xs leading-tight text-muted-foreground">
                        {who}
                        <br />
                        {c.label}
                      </div>
                    </div>
                  </div>
                );
              }
              const top = deco[c.id];
              if (top) {
                return (
                  <button
                    key={c.id}
                    aria-label={`${who} ${c.label}${c.era.event ? ', event exclusive' : ''}, owned ${n}, in a decorated toploader`}
                    onClick={() => onInspect(c)}
                    className="relative rounded-lg transition duration-200 hover:-translate-y-1 hover:-rotate-1 focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Toploader image={getArt(c)} tint={top.t} stickers={top.s} />
                    <Badge className="absolute top-1.5 left-1.5 z-10 bg-primary px-1 text-primary-foreground" aria-hidden>
                      <Sticker />
                    </Badge>
                    {n > 1 && (
                      <Badge variant="secondary" className="absolute top-1.5 right-1.5 z-10 bg-black/70 font-mono text-[10px] text-white">
                        ×{n}
                      </Badge>
                    )}
                  </button>
                );
              }
              return (
                <button
                  key={c.id}
                  aria-label={`${who} ${c.label}${c.era.event ? ', event exclusive' : ''}, owned ${n}`}
                  onClick={() => onInspect(c)}
                  className={cn(
                    'sleeve-shine relative aspect-[63/88] overflow-hidden rounded-lg ring-2 transition duration-200 hover:-translate-y-1 hover:-rotate-1 hover:shadow-2xl hover:shadow-black/50 focus-visible:outline-none focus-visible:ring-4',
                    RARITY_RING[c.rarity]
                  )}
                >
                  <img alt="" src={getArt(c)} className="absolute inset-0 size-full object-cover" />
                  {n > 1 && (
                    <Badge variant="secondary" className="absolute top-1.5 right-1.5 bg-black/70 font-mono text-[10px] text-white">
                      ×{n}
                    </Badge>
                  )}
                  {c.era.event && (
                    <Badge variant="secondary" className="absolute top-1.5 left-1.5 bg-black/70 px-1 text-white" aria-label="Event exclusive">
                      <Sparkles className="text-primary" />
                    </Badge>
                  )}
                  <Badge className={cn('absolute bottom-1.5 left-1.5 font-mono text-[9px] tracking-wider uppercase', RARITY_BADGE[c.rarity])}>
                    {c.label}
                  </Badge>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
