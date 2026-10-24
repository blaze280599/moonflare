'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Heart, Sparkles } from 'lucide-react';
import BiasPicker from '@/components/BiasPicker';
import EventBanner, { EventCountdown } from '@/components/EventBanner';
import PackInfo from '@/components/PackInfo';
import PackTile from '@/components/PackTile';
import { useGameContext } from '@/components/GameProvider';
import { cn } from '@/lib/utils';
import { CARDS, ERAS, GROUP_BY_SLUG } from '@/lib/cards';
import { getCover } from '@/lib/art';
import { canOpenEra, eventPhase } from '@/lib/events';
import { groupKind, packFor, shopPacks } from '@/lib/shop';
import { useNow } from '@/lib/useNow';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

// One group's albums, newest first, with the group's pack (and any live event pack) in the sidebar.
// Packs open on the stage the GameProvider hosts; the albums here are for browsing.
export default function GroupPage({ slug }) {
  const group = GROUP_BY_SLUG[slug];
  const router = useRouter();
  const { state, loaded, artReady, setBinderEra } = useGameContext();

  const now = useNow();

  // Upcoming event albums stay hidden until they open; ended ones stay, closed, so their cards still count.
  const eras = ERAS.filter(e => e.group === group && eventPhase(e, now) !== 'upcoming').reverse();
  const groupCards = CARDS.filter(c => eras.includes(c.era));
  const groupOwned = groupCards.filter(c => state.owned[c.id]).length;
  const packs = [packFor(groupKind(group)), ...shopPacks(now).filter(p => p.type === 'album' && p.group === group)];

  const toBinder = era => {
    setBinderEra(era);
    router.push('/collection');
  };

  return (
    <div className="relative overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute -top-56 right-[-10%] size-[560px] rounded-full bg-primary/10 blur-[140px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-14">
        <header className="space-y-4 border-b pb-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{group.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">{group.name}</h1>
          <p className="max-w-xl text-muted-foreground">{group.blurb}</p>
          <ul className="flex flex-wrap gap-2" aria-label="Members">
            {group.members.map(m => (
              <li key={m.code}>
                <Badge variant="outline" className="h-6 gap-1.5 px-2.5">
                  {/* Member colors are data, so they're set inline rather than as theme tokens. */}
                  <span className="size-2 rounded-full" style={{ background: m.color }} />
                  {m.name}
                  {state.bias?.[group.code] === m.code && <Heart className="fill-primary text-primary" aria-label="Your bias" />}
                </Badge>
              </li>
            ))}
          </ul>
          <div className="max-w-xs space-y-1.5 pt-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Collected</span>
              <span className="tabular-nums">{loaded ? `${groupOwned} / ${groupCards.length}` : '—'}</span>
            </div>
            <Progress value={loaded ? (groupOwned / groupCards.length) * 100 : 0} className="h-1" />
          </div>
          <EventBanner group={group} className="space-y-2 pt-2" />
        </header>

        <div className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {eras.map(era => {
              const cards = groupCards.filter(c => c.era === era);
              const owned = cards.filter(c => state.owned[c.id]).length;
              const open = canOpenEra(era, now);
              return (
                <Card key={era.code} className={cn('gap-0 p-0', era.event && open && 'ring-primary/50')}>
                  {/* Wrapped so Card's first-child img rules don't apply. */}
                  <div className="relative p-2 pb-0 sm:p-3 sm:pb-0">
                    {artReady ? (
                      <img alt={`${era.name} album cover`} src={getCover(era)} className="aspect-square w-full rounded-lg object-cover shadow-lg shadow-black/40" />
                    ) : (
                      <Skeleton className="aspect-square w-full rounded-lg" />
                    )}
                    {era.event && (
                      <Badge className="absolute top-3.5 left-3.5 gap-1 sm:top-5 sm:left-5">
                        <Sparkles />
                        Limited
                      </Badge>
                    )}
                  </div>
                  <CardContent className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
                    <CardTitle className="truncate text-base">{era.name}</CardTitle>
                    <CardDescription className="text-xs">{era.sub}</CardDescription>
                    {era.event && <EventCountdown era={era} now={now} className="mt-1 max-w-full" />}
                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                      <Progress value={(owned / cards.length) * 100} className="h-1 flex-1" />
                      <span className="tabular-nums">{loaded ? `${owned}/${cards.length}` : '—'}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2 w-full text-muted-foreground" onClick={() => toBinder(era)}>
                      <BookOpen />
                      View in binder
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <aside className="space-y-3 max-lg:order-first lg:sticky lg:top-20 lg:self-start">
            {packs.map(pack => (
              <PackTile key={pack.kind} pack={pack} now={now} compact />
            ))}
            <BiasPicker group={group} />
            <PackInfo group={group} />
            <Button asChild variant="link" className="px-1 text-muted-foreground">
              <Link href="/shop">All packs in the shop</Link>
            </Button>
          </aside>
        </div>
      </div>
    </div>
  );
}
