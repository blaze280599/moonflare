'use client';

import { useEffect, useState } from 'react';
import { Loader2, Package, Percent, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GROUPS } from '@/lib/cards';
import { getCover, getPackPreview } from '@/lib/art';
import { albumOdds, canBuy, packsOf } from '@/lib/shop';
import { EventCountdown } from '@/components/EventBanner';
import { useGameContext } from '@/components/GameProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function packBlurb(pack) {
  if (pack.type === 'standard') return `Any group, any album. Each of the ${GROUPS.length} groups is equally likely.`;
  if (pack.type === 'group') return `A random ${pack.group.name} album, from ${pack.eras.length}.`;
  return pack.era.event.blurb || `${pack.group.name}'s limited ${pack.era.name} album.`;
}

// The pack's wrapper, drawn by lib/art.js. Falls back to an album cover if the canvas can't be read.
function PackPreview({ pack, className }) {
  const { artReady } = useGameContext();
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!artReady) return;
    let live = true;
    getPackPreview(pack).then(url => live && setSrc(url ?? getCover(pack.eras[pack.eras.length - 1])));
    return () => {
      live = false;
    };
  }, [artReady, pack]);
  return src ? (
    <img alt={`${pack.name} wrapper`} src={src} className={cn('aspect-[31/50] w-full rounded-lg object-cover shadow-lg shadow-black/40', className)} />
  ) : (
    <Skeleton className={cn('aspect-[31/50] w-full rounded-lg', className)} />
  );
}

// Which album a pack can open as, from albumOdds(): the same shares the server's pickAlbum() uses.
function OddsDialog({ pack }) {
  const odds = albumOdds(pack);
  const groups = pack.type === 'standard' ? GROUPS.filter(g => odds.some(o => o.era.group === g)) : [];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Percent />
          Album odds
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pack.name}</DialogTitle>
          <DialogDescription>
            {pack.type === 'standard'
              ? 'The pack picks a group first, each one equally, then one of its albums. Card odds and pity are the same in every album.'
              : 'Each album is equally likely. Card odds and pity are the same in every album.'}
          </DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Album</TableHead>
              <TableHead className="text-right">Chance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pack.type === 'standard'
              ? groups.map(g => {
                  const rows = odds.filter(o => o.era.group === g);
                  return [
                    <TableRow key={g.code} className="bg-muted/40 font-medium">
                      <TableCell>{g.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{rows.reduce((s, o) => s + o.pct, 0).toFixed(1)}%</TableCell>
                    </TableRow>,
                    ...rows.map(o => (
                      <TableRow key={o.era.code}>
                        <TableCell className="pl-6 text-muted-foreground">{o.era.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">{o.pct.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))
                  ];
                })
              : odds.map(o => (
                  <TableRow key={o.era.code}>
                    <TableCell>{o.era.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{o.pct.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

// One pack: its wrapper, how many the player holds, and Open / Buy. `now` decides whether an event pack is on sale.
export default function PackTile({ pack, now, compact = false }) {
  const { state, loaded, artReady, buyPack, openPack, opening } = useGameContext();
  const [buying, setBuying] = useState(false);
  const have = packsOf(state, pack.kind);
  const onSale = canBuy(pack, now);

  const buy = async () => {
    setBuying(true);
    await buyPack(pack.kind);
    setBuying(false);
  };

  return (
    <Card className={cn('gap-0 p-0', compact && 'flex-row', pack.type === 'album' && 'ring-primary/50')}>
      {/* Wrapped so Card's first-child img rules don't apply. */}
      <div className={cn('relative p-3', compact ? 'w-28 shrink-0 pr-0' : 'pb-0')}>
        <PackPreview pack={pack} />
        {have > 0 && <Badge className={cn('absolute tabular-nums', compact ? 'top-4 left-4' : 'top-5 left-5')}>{have} owned</Badge>}
      </div>
      <CardContent className={cn('flex min-w-0 flex-1 flex-col gap-1 p-3', !compact && 'sm:p-4')}>
        <CardTitle className="text-base leading-snug">{pack.name}</CardTitle>
        <CardDescription className="text-xs">{packBlurb(pack)}</CardDescription>
        {pack.type === 'album' && <EventCountdown era={pack.era} now={now} className="mt-1 max-w-full" />}
        <div className="mt-auto grid gap-2 pt-3">
          {have > 0 && (
            <Button disabled={!loaded || !artReady || Boolean(opening)} onClick={() => openPack(pack.kind)}>
              {opening === pack.kind ? <Loader2 className="animate-spin" /> : <Package />}
              {opening === pack.kind ? 'Opening…' : 'Open'}
            </Button>
          )}
          {onSale && (
            <Button variant={have > 0 ? 'outline' : 'default'} disabled={!loaded || buying || state.coins < pack.price} onClick={buy}>
              {buying ? <Loader2 className="animate-spin" /> : <ShoppingBag />}
              {`Buy · ${pack.price} ★`}
            </Button>
          )}
          <OddsDialog pack={pack} />
        </div>
      </CardContent>
    </Card>
  );
}
