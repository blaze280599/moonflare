'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, CircleUser, Gift, KeyRound, LogOut, Menu, MoonStar, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CARDS, ERAS, GROUPS } from '@/lib/cards';
import { getCover } from '@/lib/art';
import { DAILY_STARS, PACK_COST } from '@/lib/gacha';
import { signOut } from '@/app/auth/actions';
import { useGameContext } from '@/components/GameProvider';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const isActive = (pathname, href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

const groupHref = g => `/groups/${g.slug}`;

export default function SiteHeader({ player }) {
  const pathname = usePathname();
  const [signingOut, startSignOut] = useTransition();
  const onSignOut = () => startSignOut(() => signOut());
  const { state, loaded, artReady, claimDaily, dailyClaimed } = useGameContext();

  const [claiming, setClaiming] = useState(false);
  const onDaily = async () => {
    setClaiming(true);
    const { error } = await claimDaily();
    setClaiming(false);
    if (!error) toast.success(`+${DAILY_STARS} stars added`, { description: 'Come back tomorrow for more.' });
    else if (error !== 'already_claimed') toast.error('Couldn’t claim your stars', { description: error });
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-background/75 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-4 flex items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <MoonStar className="size-5 text-primary" />
          <span className="font-heading text-lg font-semibold tracking-tight">Moonflare</span>
        </Link>

        <NavigationMenu aria-label="Main" className="max-md:hidden">
          <NavigationMenuList className="gap-1">
            <NavigationMenuItem>
              <NavigationMenuLink asChild active={isActive(pathname, '/')} className={navigationMenuTriggerStyle()}>
                <Link href="/">Home</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger className={cn(isActive(pathname, '/groups') && 'bg-muted/50')}>Groups</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[420px] gap-1 p-1">
                  {GROUPS.map(g => (
                    <li key={g.code}>
                      <GroupLink group={g} active={isActive(pathname, groupHref(g))} owned={state.owned} loaded={loaded} artReady={artReady} />
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild active={isActive(pathname, '/collection')} className={navigationMenuTriggerStyle()}>
                <Link href="/collection">Collection</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild active={isActive(pathname, '/trade')} className={navigationMenuTriggerStyle()}>
                <Link href="/trade">Trade</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center gap-2">
          <ButtonGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <ButtonGroupText className="bg-card font-bold tabular-nums" tabIndex={0} aria-label={loaded ? `${state.coins} stars` : 'Stars'}>
                  <Star className="fill-star text-star" />
                  {loaded ? state.coins.toLocaleString() : '—'}
                </ButtonGroupText>
              </TooltipTrigger>
              <TooltipContent>Stars buy albums. Duplicate cards give stars back.</TooltipContent>
            </Tooltip>
            <Button
              size="lg"
              className="px-3"
              disabled={!loaded || dailyClaimed || claiming}
              onClick={onDaily}
              aria-label={dailyClaimed ? 'Daily stars claimed today' : `Claim ${DAILY_STARS} daily stars`}
            >
              {dailyClaimed ? <Check /> : <Gift />}
              <span className="max-sm:hidden">{dailyClaimed ? 'Claimed today' : `Daily ${DAILY_STARS}`}</span>
            </Button>
          </ButtonGroup>

          {player && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="lg" className="max-w-40 px-2 max-md:hidden" aria-label={`Account: ${player.username}`}>
                  <CircleUser />
                  <span className="truncate">{player.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{player.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/reset-password">
                    <KeyRound />
                    Change password
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={signingOut} onSelect={onSignOut}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
                <MobileLink href="/" pathname={pathname}>
                  Home
                </MobileLink>
                <p className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">Groups</p>
                {GROUPS.map(g => (
                  <MobileLink key={g.code} href={groupHref(g)} pathname={pathname}>
                    {g.name}
                  </MobileLink>
                ))}
                <Separator className="my-2" />
                <MobileLink href="/collection" pathname={pathname}>
                  Collection
                </MobileLink>
                <MobileLink href="/trade" pathname={pathname}>
                  Trade
                </MobileLink>
              </nav>
              {player && (
                <div className="mt-auto grid gap-1 px-2">
                  <Separator className="mb-2" />
                  <p className="truncate px-3 text-xs text-muted-foreground">Signed in as {player.username}</p>
                  <SheetClose asChild>
                    <Button asChild variant="ghost" size="lg" className="justify-start text-muted-foreground">
                      <Link href="/reset-password">
                        <KeyRound />
                        Change password
                      </Link>
                    </Button>
                  </SheetClose>
                  <Button variant="ghost" size="lg" className="justify-start text-muted-foreground" disabled={signingOut} onClick={onSignOut}>
                    <LogOut />
                    Sign out
                  </Button>
                </div>
              )}
              <p className={cn('px-4 pb-4 text-xs text-muted-foreground', !player && 'mt-auto')}>
                {DAILY_STARS} free stars every day. Albums cost {PACK_COST} ★.
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

// A group in the Groups dropdown: latest album cover, blurb and the player's progress.
function GroupLink({ group, active, owned, loaded, artReady }) {
  const eras = ERAS.filter(e => e.group === group);
  const cards = CARDS.filter(c => c.era.group === group);
  const have = cards.filter(c => owned[c.id]).length;
  return (
    <NavigationMenuLink asChild active={active} className="items-start gap-3">
      <Link href={groupHref(group)}>
        {artReady ? (
          <img alt="" src={getCover(eras[eras.length - 1])} className="size-14 shrink-0 rounded-md object-cover" />
        ) : (
          <Skeleton className="size-14 shrink-0" />
        )}
        <div className="min-w-0 space-y-1">
          <div className="font-medium">{group.name}</div>
          <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">{group.blurb}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {eras.length} albums · {loaded ? `${have} / ${cards.length}` : '—'} collected
          </p>
        </div>
      </Link>
    </NavigationMenuLink>
  );
}

function MobileLink({ href, pathname, children }) {
  const active = isActive(pathname, href);
  return (
    <SheetClose asChild>
      <Button asChild variant="ghost" size="lg" className={cn('justify-start text-muted-foreground', active && 'bg-muted text-foreground')}>
        <Link href={href} aria-current={active ? 'page' : undefined}>
          {children}
        </Link>
      </Button>
    </SheetClose>
  );
}
