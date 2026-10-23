'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Gift, Menu, MoonStar, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { GROUPS } from '@/lib/cards';
import { DAILY_STARS, PACK_COST } from '@/lib/gacha';
import { useGameContext } from '@/components/GameProvider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// One link per group for now. Switch to a "Groups" dropdown once there are more than three or so.
const NAV = [
  { href: '/', label: 'Home' },
  ...GROUPS.map(g => ({ href: `/groups/${g.slug}`, label: g.name })),
  { href: '/collection', label: 'Collection' }
];

const isActive = (pathname, href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

export default function SiteHeader() {
  const pathname = usePathname();
  const { state, loaded, claimDaily, dailyClaimed } = useGameContext();

  const onDaily = () => {
    if (claimDaily()) toast.success(`+${DAILY_STARS} stars added`, { description: 'Come back tomorrow for more.' });
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-background/75 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-4 flex items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <MoonStar className="size-5 text-primary" />
          <span className="font-heading text-lg font-semibold tracking-tight">Moonflare</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                isActive(pathname, item.href) && 'bg-muted text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-bold tabular-nums">
                <Star className="size-4 fill-star text-star" />
                {loaded ? state.coins.toLocaleString() : '—'}
              </div>
            </TooltipTrigger>
            <TooltipContent>Stars buy albums. Duplicate cards give stars back.</TooltipContent>
          </Tooltip>
          <Button
            size="lg"
            className="px-3"
            disabled={!loaded || dailyClaimed}
            onClick={onDaily}
            aria-label={dailyClaimed ? 'Daily stars claimed today' : `Claim ${DAILY_STARS} daily stars`}
          >
            {dailyClaimed ? <Check /> : <Gift />}
            <span className="max-sm:hidden">{dailyClaimed ? 'Claimed today' : `Daily ${DAILY_STARS}`}</span>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-lg" className="md:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <MoonStar className="size-4 text-primary" />
                  Moonflare
                </SheetTitle>
              </SheetHeader>
              <nav aria-label="Main" className="grid gap-1 px-2">
                {NAV.map(item => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                      className={cn(
                        'rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                        isActive(pathname, item.href) && 'bg-muted text-foreground'
                      )}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <Separator className="mx-4 w-auto" />
              <p className="px-4 text-xs text-muted-foreground">
                {DAILY_STARS} free stars every day. Albums cost {PACK_COST} ★.
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
