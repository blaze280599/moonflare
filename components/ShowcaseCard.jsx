'use client';

import { cn } from '@/lib/utils';
import { getArt } from '@/lib/art';
import { RARITY_BADGE, RARITY_RING } from '@/lib/rarity-styles';
import Toploader from '@/components/Toploader';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export const cardName = card => `${card.member ? card.member.name : card.era.group.name} · ${card.label}`;

// A showcased card: its toploader if it's decorated, otherwise a sleeve like the binder's. Plain <img> only.
export default function ShowcaseCard({ card, deco, artReady, onInspect, className }) {
  if (!artReady) return <Skeleton className={cn('aspect-[63/88] rounded-lg', className)} />;
  const label = `${cardName(card)}, ${card.era.name}${deco ? ', in a decorated toploader' : ''}`;
  if (deco) {
    return (
      <button
        aria-label={label}
        onClick={() => onInspect?.(card)}
        className={cn('rounded-lg transition duration-200 hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none', className)}
      >
        <Toploader image={getArt(card)} tint={deco.t} stickers={deco.s} />
      </button>
    );
  }
  return (
    <button
      aria-label={label}
      onClick={() => onInspect?.(card)}
      className={cn(
        'sleeve-shine relative aspect-[63/88] overflow-hidden rounded-lg ring-2 transition duration-200 hover:-translate-y-1 focus-visible:ring-4 focus-visible:outline-none',
        RARITY_RING[card.rarity],
        className
      )}
    >
      <img alt="" src={getArt(card)} draggable={false} className="absolute inset-0 size-full object-cover" />
      <Badge className={cn('absolute bottom-1.5 left-1.5 font-mono text-[9px] tracking-wider uppercase', RARITY_BADGE[card.rarity])}>{card.label}</Badge>
    </button>
  );
}
