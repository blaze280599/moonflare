'use client';

import { ChevronDown, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ERAS } from '@/lib/cards';
import { BIAS_BOOST, PITY_AT, RATES, memberRates } from '@/lib/gacha';
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
const PULL_RATES = RATES.map(r => ({ rarity: r.rarity, card: CARD_KIND[r.rarity], rate: `${r.pct}%` }));

// Pity progress and the pull-rate table, shown next to the albums. With a `group`, it also lists each
// member's per-card odds with the player's bias applied, from memberRates() (the same shares rollPack uses).
export default function PackInfo({ group, defaultOpen = false }) {
  const { state } = useGameContext();
  const pityLeft = PITY_AT - state.pity;
  const members = group ? memberRates(ERAS.find(e => e.group === group), state.bias?.[group.code]) : [];

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
            {members.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead className="text-right">Per card</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(({ member, pct, isBias }) => (
                    <TableRow key={member.code}>
                      <TableCell className={cn(isBias && 'font-medium')}>
                        <span className="mr-2 inline-block size-2 rounded-full" style={{ background: member.color }} />
                        {member.name}
                        {isBias && <Heart className="ml-1.5 inline size-3 fill-primary text-primary" aria-label="Your bias" />}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{pct.toFixed(2)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <p className="text-xs text-muted-foreground">
              Card 5 in every album is Rare or better. A lucky draw is guaranteed by your {PITY_AT}th album without one. Duplicates
              turn into stars.{group && ` Your bias gets ${BIAS_BOOST} points more of each member card, taken evenly from the others; group specials belong to no one.`}
            </p>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
