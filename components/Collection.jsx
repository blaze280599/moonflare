'use client';

import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Binder from '@/components/Binder';
import { useGameContext } from '@/components/GameProvider';
import { CARDS, ERAS, GROUPS } from '@/lib/cards';
import { getCover } from '@/lib/art';
import { NEW_GAME } from '@/lib/gacha';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
          <p className="font-mono text-xs tracking-wider text-primary uppercase">Collection</p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">Your collection</h1>
          <p className="text-muted-foreground">
            {loaded ? (
              <>
                {total} of {CARDS.length} photocards collected · {state.packs} album{state.packs === 1 ? '' : 's'} opened
              </>
            ) : (
              'Loading your collection…'
            )}
          </p>
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
                    <button
                      key={era.code}
                      onClick={() => pickEra(era)}
                      aria-pressed={active}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border bg-card p-2 text-left transition hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        active && 'border-primary/60 ring-1 ring-primary/40'
                      )}
                    >
                      {artReady ? (
                        <img alt="" src={getCover(era)} className="size-11 shrink-0 rounded-md object-cover" />
                      ) : (
                        <div className="size-11 shrink-0 rounded-md bg-muted" />
                      )}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="truncate text-sm font-medium">{era.name}</div>
                        <div className="flex items-center gap-2">
                          <Progress value={(owned / cards.length) * 100} className="h-1 flex-1" />
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {owned}/{cards.length}
                          </span>
                        </div>
                      </div>
                    </button>
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
                Every card, your stars and your pity progress are deleted from this browser. You start again with {NEW_GAME.coins} stars.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my cards</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  reset();
                  toast('Collection reset', { description: `You have ${NEW_GAME.coins} stars.` });
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
