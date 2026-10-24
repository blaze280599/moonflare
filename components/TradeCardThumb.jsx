'use client';

import { EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RARITY } from '@/lib/cards';
import { getArt, getBack } from '@/lib/art';
import { foilLabel } from '@/lib/trade';
import { RARITY_BADGE, RARITY_RING } from '@/lib/rarity-styles';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export const cardName = card => `${card.member ? card.member.name : 'Group'} · ${card.label}`;

// A card on the trade board. `visible` is the no-spoiler rule (canSee in lib/trade.js, or the player's own
// card): hidden cards show their album's card back, never the art, and can't be opened in the card dialog.
export function TradeCardThumb({ card, visible, artReady, onInspect, className }) {
  const label = `${cardName(card)}, ${card.era.name}${visible ? '' : ', face down: not in your binder yet'}`;
  if (!artReady) return <Skeleton className={cn('aspect-[63/88] w-20 shrink-0 rounded-md sm:w-24', className)} />;
  if (!visible) {
    return (
      <div role="img" aria-label={label} className={cn('relative aspect-[63/88] w-20 shrink-0 overflow-hidden rounded-md sm:w-24', className)}>
        <img alt="" src={getBack(card.era)} className="size-full object-cover" />
        <span className="absolute inset-x-0 bottom-1.5 flex justify-center">
          <Badge variant="secondary" className="gap-1 bg-black/60 text-white">
            <EyeOff />
            Face down
          </Badge>
        </span>
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
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

// The facts every player may see about a card, owned or not.
export function CardFacts({ card }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="truncate font-medium">{cardName(card)}</div>
      <div className="truncate text-xs text-muted-foreground">
        {card.era.group.name} · {card.era.name}
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge className={RARITY_BADGE[card.rarity]}>{RARITY[card.rarity].label}</Badge>
        <Badge variant="outline">{foilLabel(card)}</Badge>
      </div>
    </div>
  );
}
