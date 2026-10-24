'use client';

import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Binder from '@/components/Binder';
import { useGameContext } from '@/components/GameProvider';
import { CARDS, ERAS, GROUPS } from '@/lib/cards';
import { getCover } from '@/lib/art';
import { NEW_GAME } from '@/lib/gacha';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Item, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

// Overall progress per album, then the binder for the chosen album.
export default function Collection() {
  const { state, loaded, artReady, reset, inspect, binderEra, setBinderEra } = useGameContext();
  const total = CARDS.filter(c => state.owned[c.id]).length;

  const pickEra = era => {
    setBinderEra(era);
    requestAnimationFrame(() => document.getElementById('binder')?.scrollIntoView({ behavior: 'smooth' }));
  };

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
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
                <BreadcrumbPage>Collection</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">Your collection</h1>
          {loaded ? (
            <p className="text-muted-foreground">
              {total} of {CARDS.length} photocards collected · {state.packs} album{state.packs === 1 ? '' : 's'} opened
            </p>
          ) : (
            <Skeleton className="h-6 w-72 max-w-full" />
          )}
        </header>

        <div className="space-y-8 pt-8">
          {GROUPS.map(g => (
            <section key={g.code} className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">{g.name}</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                {ERAS.filter(e => e.group === g).map(era => {
                  const cards = CARDS.filter(c => c.era === era);
                  const owned = cards.filter(c => state.owned[c.id]).length;
                  const active = binderEra.code === era.code;
                  return (
                    <Item
                      key={era.code}
                      asChild
                      variant="outline"
                      size="sm"
                      className={cn('flex-nowrap bg-card p-2 text-left hover:border-primary/40', active && 'border-primary/60 ring-1 ring-primary/40')}
                    >
                      <button onClick={() => pickEra(era)} aria-pressed={active}>
                        <ItemMedia variant="image" className="size-11 rounded-md">
                          {artReady ? <img alt="" src={getCover(era)} /> : <Skeleton className="size-full" />}
                        </ItemMedia>
                        <ItemContent className="min-w-0 gap-1.5">
                          <ItemTitle className="truncate">{era.name}</ItemTitle>
                          <div className="flex items-center gap-2">
                            <Progress value={(owned / cards.length) * 100} className="h-1 flex-1" />
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {owned}/{cards.length}
                            </span>
                          </div>
                        </ItemContent>
                      </button>
                    </Item>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <Binder era={binderEra} onEraChange={setBinderEra} owned={state.owned} artReady={artReady} onInspect={inspect} />

      <div className="mx-auto max-w-6xl px-4 pb-12">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="-mx-2 text-muted-foreground">
              <RotateCcw />
              Reset collection
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Erase your whole collection?</AlertDialogTitle>
              <AlertDialogDescription>
                Every card, your stars and your pity progress are deleted from your account, and your trade listings and offers are
                withdrawn. You start again with {NEW_GAME.coins} stars.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my cards</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={async () => {
                  const { error } = await reset();
                  if (error) toast.error('Couldn’t reset your collection', { description: error });
                  else toast('Collection reset', { description: `You have ${NEW_GAME.coins} stars.` });
                }}
              >
                Erase collection
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
