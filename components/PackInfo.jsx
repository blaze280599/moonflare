'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PITY_AT, RATES } from '@/lib/gacha';
import { RARITY_DOT } from '@/lib/rarity-styles';
import { useGameContext } from '@/components/GameProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const CARD_KIND = { common: 'Album PC', rare: 'Selfie PC', epic: 'POB', legendary: 'Lucky draw', mythic: 'Group special' };

// Built from RATES in lib/gacha.js so the tables can't drift from the real odds.
export const PULL_RATES = RATES.map(r => ({ rarity: r.rarity, card: CARD_KIND[r.rarity], rate: `${r.pct}%` }));

// Pity progress and the pull-rate table, shown next to the albums.
export default function PackInfo({ defaultOpen = false }) {
  const { state } = useGameContext();
  const pityLeft = PITY_AT - state.pity;

  return (
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
        <Collapsible defaultOpen={defaultOpen}>
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
                  <TableHead className="text-right">Per card</TableHead>
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
              Card 5 in every album is Rare or better. A lucky draw is guaranteed by your {PITY_AT}th album without one. Duplicates
              turn into stars.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
