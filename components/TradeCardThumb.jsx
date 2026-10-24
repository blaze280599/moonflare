'use client';

import { cn } from '@/lib/utils';
import { RARITY } from '@/lib/cards';
import { getArt } from '@/lib/art';
import { foilLabel } from '@/lib/trade';
import { RARITY_BADGE, RARITY_RING } from '@/lib/rarity-styles';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export const cardName = card => `${card.member ? card.member.name : 'Group'} · ${card.label}`;

// A card on the trade board. Every card shows its art, owned or not: you can't trade for a card you can't see.
export function TradeCardThumb({ card, artReady, onInspect, className }) {
  if (!artReady) return <Skeleton className={cn('aspect-[63/88] w-20 shrink-0 rounded-md sm:w-24', className)} />;
  return (
    <button
      type="button"
      aria-label={`${cardName(card)}, ${card.era.name}`}
      onClick={() => onInspect?.(card)}
      className={cn(
        'relative aspect-[63/88] w-20 shrink-0 overflow-hidden rounded-md ring-2 transition hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:outline-none sm:w-24',
        RARITY_RING[card.rarity],
        className
      )}
    >
      <img alt="" src={getArt(card)} className="absolute inset-0 size-full object-cover" />
    </button>
  );
}

// A card's facts. `missing` marks a card the player doesn't have yet (inBinder in lib/trade.js), a reason to trade.
export function CardFacts({ card, missing = false }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="truncate font-medium">{cardName(card)}</div>
      <div className="truncate text-xs text-muted-foreground">
        {card.era.group.name} · {card.era.name}
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge className={RARITY_BADGE[card.rarity]}>{RARITY[card.rarity].label}</Badge>
        <Badge variant="outline">{foilLabel(card)}</Badge>
        {missing && <Badge variant="secondary">Not in your binder</Badge>}
      </div>
    </div>
  );
}
