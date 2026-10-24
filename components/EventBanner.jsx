'use client';

import Link from 'next/link';
import { ArrowRight, CalendarClock, Sparkles } from 'lucide-react';
import { useGameContext } from '@/components/GameProvider';
import { EVENT_ERAS } from '@/lib/cards';
import { eventPhase, formatCountdown, msUntilChange } from '@/lib/events';
import { getCover } from '@/lib/art';
import { useNow } from '@/lib/useNow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';

// "Ends in 3d 4h", "Starts in 5h 02m 09s" or "Event ended". The text differs between server and client by a
// second or so, hence suppressHydrationWarning.
export function EventCountdown({ era, now, className }) {
  const phase = eventPhase(era, now);
  const text =
    phase === 'live' ? `Ends in ${formatCountdown(msUntilChange(era, now))}` : phase === 'upcoming' ? `Starts in ${formatCountdown(msUntilChange(era, now))}` : 'Event ended';
  return (
    <Badge variant={phase === 'live' ? 'default' : 'outline'} className={className}>
      <CalendarClock />
      <span suppressHydrationWarning className="tabular-nums">
        {text}
      </span>
    </Badge>
  );
}

// Live and upcoming comeback events, optionally for one group. Renders nothing when there are none.
// `linkToGroup` adds a button to the group's page (the landing page); a group page shows the album in its grid.
export default function EventBanner({ group, linkToGroup = false, className }) {
  const { artReady } = useGameContext();
  const now = useNow();
  const eras = EVENT_ERAS.filter(e => (!group || e.group === group) && ['live', 'upcoming'].includes(eventPhase(e, now)));
  if (!eras.length) return null;

  return (
    <ul className={className} aria-label="Comeback events">
      {eras.map(era => (
        <li key={era.code}>
          <Item variant="outline" className="flex-nowrap border-primary/40 bg-primary/5 max-sm:flex-wrap">
            <ItemMedia variant="image" className="size-16 rounded-md">
              {artReady ? <img alt={`${era.name} album cover`} src={getCover(era)} /> : <Skeleton className="size-full" />}
            </ItemMedia>
            <ItemContent className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="text-primary" />
                  Comeback event
                </Badge>
                <EventCountdown era={era} now={now} />
              </div>
              <ItemTitle className="text-base">
                {era.group.name} · {era.name}
              </ItemTitle>
              <ItemDescription>{era.event.blurb}</ItemDescription>
            </ItemContent>
            {linkToGroup && (
              <ItemActions className="max-sm:w-full">
                <Button asChild size="sm" className="max-sm:w-full">
                  <Link href={`/groups/${era.group.slug}`}>
                    {eventPhase(era, now) === 'live' ? 'Open it' : 'See the group'}
                    <ArrowRight />
                  </Link>
                </Button>
              </ItemActions>
            )}
          </Item>
        </li>
      ))}
    </ul>
  );
}
