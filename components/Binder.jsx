'use client';

import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CARDS, ERAS, GROUPS } from '@/lib/cards';
import { getArt } from '@/lib/art';
import { RARITY_BADGE, RARITY_RING } from '@/lib/rarity-styles';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

// Static thumbnails only: every live HoloCard holds a WebGL context, and browsers cap them at ~16.
export default function Binder({ era, onEraChange, owned, artReady, onInspect }) {
  const cards = CARDS.filter(c => c.era.code === era.code);
  const count = cards.filter(c => owned[c.id]).length;

  return (
    <section id="binder" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-16">
      <Card>
        <CardHeader className="border-b max-sm:flex max-sm:flex-col">
          <CardTitle className="font-heading text-2xl font-semibold tracking-tight">Your binder</CardTitle>
          <CardDescription>
            {count} of {cards.length} {era.group.name} {era.name} cards collected
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
                    {ERAS.filter(e => e.group === g).map(e => (
                      <SelectItem key={e.code} value={e.code}>
                        {e.name}
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
              return (
                <button
                  key={c.id}
                  aria-label={`${who} ${c.label}, owned ${n}`}
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
