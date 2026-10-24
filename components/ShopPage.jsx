'use client';

import Link from 'next/link';
import { Gift } from 'lucide-react';
import PackInfo from '@/components/PackInfo';
import PackTile from '@/components/PackTile';
import { useGameContext } from '@/components/GameProvider';
import { DAILY_STARS } from '@/lib/gacha';
import { packFor, shopPacks } from '@/lib/shop';
import { useNow } from '@/lib/useNow';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';

// The shop: every pack on sale, plus any the player still holds that aren't sold any more (an ended event's).
export default function ShopPage() {
  const { state, loaded } = useGameContext();
  const now = useNow();
  const forSale = shopPacks(now);
  const held = Object.keys(state.inventory || {})
    .filter(kind => state.inventory[kind] > 0 && !forSale.some(p => p.kind === kind))
    .map(packFor)
    .filter(Boolean);
  const packs = [...forSale, ...held];
  const total = Object.values(state.inventory || {}).reduce((s, n) => s + n, 0);

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
                <BreadcrumbPage>Shop</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">Shop</h1>
          <p className="max-w-xl text-muted-foreground">
            A standard pack can be any group. To choose who you open, buy that group’s pack. Every pack holds five photocards from one album.
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {loaded ? `You have ${total} unopened pack${total === 1 ? '' : 's'}.` : '—'}
          </p>
        </header>

        <div className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {packs.map(pack => (
              <PackTile key={pack.kind} pack={pack} now={now} />
            ))}
          </div>

          <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
            <Card size="sm">
              <CardContent className="flex gap-3 text-sm">
                <Gift className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  Your daily reward is {DAILY_STARS} ★ and a free standard pack, from the button at the top.
                </p>
              </CardContent>
            </Card>
            <PackInfo />
          </aside>
        </div>
      </div>
    </div>
  );
}
