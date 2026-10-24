'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, Gift, Hand, Package, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import EventBanner from '@/components/EventBanner';
import HoloCard from '@/components/HoloCard/HoloCard';
import { useGameContext } from '@/components/GameProvider';
import { CARD_KIND } from '@/components/PackInfo';
import { CARD_BY_ID, CARDS, ERAS, GROUPS, GROUP_BY_SLUG, foilFor } from '@/lib/cards';
import { getArt, getBack, getCover } from '@/lib/art';
import { DAILY_STARS, PACK_COST, PITY_AT, RATES } from '@/lib/gacha';
import { RARITY_DOT } from '@/lib/rarity-styles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

const HERO_CARD = CARD_BY_ID['HT-CW-lucky'];
const FEATURED = GROUP_BY_SLUG['le-sserafim'];

const STEPS = [
  {
    icon: Gift,
    title: 'Claim your stars',
    body: `${DAILY_STARS} free stars every day, reset at your midnight. Each album costs ${PACK_COST} ★.`
  },
  {
    icon: Package,
    title: 'Open an album',
    body: 'Tear off the shrink-wrap and flip five photocards from one comeback era, one at a time.'
  },
  {
    icon: BookOpen,
    title: 'Fill your binder',
    body: 'New cards go into your binder. Duplicates turn back into stars toward the next album.'
  }
];

export default function Landing() {
  const { state, loaded, artReady } = useGameContext();

  return (
    <>
      <section className="relative overflow-x-clip">
        <div aria-hidden className="pointer-events-none absolute -top-48 right-[-10%] size-[640px] rounded-full bg-primary/15 blur-[140px]" />
        <div aria-hidden className="pointer-events-none absolute top-40 left-[-15%] size-[520px] rounded-full bg-rarity-epic/10 blur-[140px]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16 md:py-24">
          <div className="order-2 space-y-8 md:order-1">
            <div className="space-y-5">
              <Badge variant="secondary" className="gap-1.5">
                <Sparkles className="size-3 text-primary" />
                {FEATURED.name} just joined the club
              </Badge>
              <h1 className="font-heading text-[clamp(2.5rem,6vw,4.25rem)] leading-[1.02] font-semibold tracking-tight text-balance">
                Open an album, chase your <span className="text-primary">bias</span>.
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                A photocard club for collecting K-pop PCs the way the hobby really works. Album PCs are plain, selfies glitter, POBs
                shimmer, and lucky draws catch the light like real holo foil.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-11 px-5">
                <Link href={`/groups/${FEATURED.slug}`}>
                  Start opening
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5">
                <Link href="/collection">View collection</Link>
              </Button>
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {[
                [GROUPS.length, GROUPS.length === 1 ? 'group' : 'groups'],
                [ERAS.length, 'albums'],
                [CARDS.length, 'photocards']
              ].map(([n, label]) => (
                <div key={label} className="flex items-baseline gap-1.5">
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-heading text-2xl font-semibold tabular-nums">{n}</dd>
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </dl>
          </div>

          <div className="order-1 grid justify-items-center gap-4 md:order-2">
            {artReady ? (
              <HoloCard
                image={getArt(HERO_CARD)}
                backImage={getBack(HERO_CARD.era)}
                alt={`${HERO_CARD.member.name} lucky draw photocard, tap to flip`}
                tiltMax={16}
                style={{ '--hc-w': 'clamp(220px, 28vw, 320px)' }}
                {...foilFor(HERO_CARD)}
              />
            ) : (
              <Skeleton className="aspect-[63/88] w-[clamp(220px,28vw,320px)] rounded-[14px]" />
            )}
            <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
              <Hand className="size-3.5" />
              Hover or drag to tilt · tap to flip
            </p>
          </div>
        </div>
        <EventBanner linkToGroup className="relative mx-auto max-w-6xl space-y-2 px-4 pb-12 md:-mt-8" />
      </section>

      <section className="border-t bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <SectionHeading eyebrow="How it works" title="Three steps, every day" />
          <ol className="mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <Card className="h-full">
                  <CardHeader className="gap-3">
                    <div className="flex items-center justify-between">
                      <span className="grid size-10 place-items-center rounded-lg border bg-background">
                        <step.icon className="size-4.5 text-primary" />
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                    </div>
                    <CardTitle className="font-heading text-lg">{step.title}</CardTitle>
                    <CardDescription className="leading-relaxed">{step.body}</CardDescription>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="groups" className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <SectionHeading eyebrow="Groups" title="Pick a group to start collecting" />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {GROUPS.map(g => {
              const eras = ERAS.filter(e => e.group === g);
              const cards = CARDS.filter(c => c.era.group === g);
              const owned = cards.filter(c => state.owned[c.id]).length;
              // The group's newest regular album; event albums come and go.
              const latest = eras.filter(e => !e.event).at(-1);
              return (
                <Link
                  key={g.code}
                  href={`/groups/${g.slug}`}
                  className="group rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Card className="h-full flex-row gap-5 p-4 transition group-hover:ring-primary/40">
                    <div className="relative size-28 shrink-0 sm:size-32">
                      {artReady ? (
                        <img
                          alt={`${latest.name} album cover`}
                          src={getCover(latest)}
                          className="size-full rounded-lg object-cover shadow-lg shadow-black/40 transition duration-300 group-hover:-rotate-2 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <Skeleton className="size-full rounded-lg" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading text-xl font-semibold tracking-tight">{g.name}</h3>
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">{g.blurb}</p>
                      <p className="text-xs text-muted-foreground">
                        {eras.length} albums · {g.members.length} members · {cards.length} cards
                      </p>
                      <div className="mt-auto space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Your progress</span>
                          <span className="tabular-nums">{loaded ? `${owned} / ${cards.length}` : '—'}</span>
                        </div>
                        <Progress value={loaded ? (owned / cards.length) * 100 : 0} className="h-1" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <SectionHeading
            eyebrow="Rarity"
            title="Five tiers, straight from the hobby"
            body={`Odds are per card and the same for every album. A lucky draw is guaranteed within ${PITY_AT} albums.`}
          />
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {RATES.map(r => (
              <Card key={r.rarity} size="sm">
                <CardHeader>
                  <span className={cn('mb-2 block h-1 w-8 rounded-full', RARITY_DOT[r.rarity])} />
                  <CardTitle className="capitalize">{r.rarity}</CardTitle>
                  <CardDescription className="text-xs">{CARD_KIND[r.rarity]}</CardDescription>
                </CardHeader>
                <CardContent className="font-heading text-2xl font-semibold tabular-nums">{r.pct}%</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ eyebrow, title, body }) {
  return (
    <div className="max-w-2xl space-y-3">
      <p className="font-mono text-xs tracking-wider text-primary uppercase">{eyebrow}</p>
      <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {body && <p className="text-muted-foreground">{body}</p>}
    </div>
  );
}
