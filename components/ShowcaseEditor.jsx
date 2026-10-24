'use client';

import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, GripVertical, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CARDS, CARD_BY_ID, ERAS, GROUPS } from '@/lib/cards';
import { getArt } from '@/lib/art';
import { MAX_SHOWCASE } from '@/lib/profile';
import { toploaderFor } from '@/lib/deco';
import { RARITY_RING } from '@/lib/rarity-styles';
import { saveShowcase } from '@/app/actions/profile';
import { useGameContext } from '@/components/GameProvider';
import ShowcaseCard, { cardName } from '@/components/ShowcaseCard';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

const move = (list, from, to) => {
  const next = [...list];
  const [id] = next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
};

// Edit mode for the showcase: drag cards to reorder (mouse), or use the arrow buttons under each one (keyboard and
// touch), remove with ×, and add from the binder. Nothing is saved until Save; the server re-checks ownership.
export default function ShowcaseEditor({ initial, onSaved, onCancel }) {
  const { state, artReady } = useGameContext();
  const [ids, setIds] = useState(() => initial.filter(id => state.owned[id]));
  const [dragging, setDragging] = useState(null);
  const [saving, setSaving] = useState(false);
  const [announce, setAnnounce] = useState('');

  const reorder = (from, to) => {
    if (to < 0 || to >= ids.length || from === to) return;
    setIds(move(ids, from, to));
    setAnnounce(`${cardName(CARD_BY_ID[ids[from]])} moved to slot ${to + 1} of ${ids.length}.`);
  };

  const onSave = async () => {
    setSaving(true);
    const res = await saveShowcase(ids).catch(() => ({ error: 'Couldn’t save your profile. Try again.' }));
    setSaving(false);
    if (res.error) return toast.error('Couldn’t save the showcase', { description: res.error });
    toast.success('Showcase saved');
    onSaved(res.profile);
  };

  return (
    <div className="space-y-5">
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <ol className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:gap-4 md:grid-cols-[repeat(auto-fill,minmax(130px,1fr))]">
        {ids.map((id, i) => {
          const card = CARD_BY_ID[id];
          return (
            <li
              key={id}
              draggable
              onDragStart={e => {
                setDragging(i);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', id);
              }}
              onDragEnd={() => setDragging(null)}
              onDragOver={e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={e => {
                e.preventDefault();
                if (dragging !== null) reorder(dragging, i);
                setDragging(null);
              }}
              className={cn('space-y-2', dragging === i && 'opacity-40')}
            >
              <div className="relative cursor-grab active:cursor-grabbing">
                <ShowcaseCard card={card} deco={toploaderFor(state, id)} artReady={artReady} className="pointer-events-none w-full" />
                <GripVertical className="absolute top-1.5 right-1.5 size-5 rounded bg-background/80 p-0.5 text-muted-foreground" aria-hidden />
              </div>
              <ButtonGroup className="w-full" aria-label={`Slot ${i + 1}: ${cardName(card)}`}>
                <Button variant="outline" size="icon-sm" className="flex-1" disabled={i === 0} onClick={() => reorder(i, i - 1)} aria-label={`Move ${cardName(card)} earlier`}>
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="flex-1"
                  disabled={i === ids.length - 1}
                  onClick={() => reorder(i, i + 1)}
                  aria-label={`Move ${cardName(card)} later`}
                >
                  <ChevronRight />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="flex-1"
                  onClick={() => {
                    setIds(ids.filter(x => x !== id));
                    setAnnounce(`${cardName(card)} removed.`);
                  }}
                  aria-label={`Remove ${cardName(card)}`}
                >
                  <X />
                </Button>
              </ButtonGroup>
            </li>
          );
        })}
        {ids.length < MAX_SHOWCASE && (
          <li>
            <CardPicker chosen={ids} onChange={setIds}>
              <Button variant="outline" className="aspect-[63/88] h-auto w-full flex-col border-dashed text-muted-foreground">
                <Plus />
                Add cards
              </Button>
            </CardPicker>
          </li>
        )}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground tabular-nums">
          {ids.length} of {MAX_SHOWCASE} slots used
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            <Check />
            {saving ? 'Saving…' : 'Save showcase'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Pick owned cards, one album at a time. Tapping a card adds or removes it; full slots stop new picks.
function CardPicker({ chosen, onChange, children }) {
  const { state, artReady, binderEra } = useGameContext();
  const firstOwned = ERAS.find(e => CARDS.some(c => c.era === e && state.owned[c.id]));
  const [era, setEra] = useState(() => (CARDS.some(c => c.era === binderEra && state.owned[c.id]) ? binderEra : firstOwned));
  const albums = ERAS.filter(e => CARDS.some(c => c.era === e && state.owned[c.id]));
  const cards = era ? CARDS.filter(c => c.era === era && state.owned[c.id]) : [];
  const full = chosen.length >= MAX_SHOWCASE;

  const toggle = id => onChange(chosen.includes(id) ? chosen.filter(x => x !== id) : full ? chosen : [...chosen, id]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add to your showcase</DialogTitle>
          <DialogDescription className="tabular-nums">
            {chosen.length} of {MAX_SHOWCASE} picked. Only cards in your binder can go on show.
          </DialogDescription>
        </DialogHeader>
        {albums.length ? (
          <>
            <Select value={era?.code} onValueChange={code => setEra(ERAS.find(e => e.code === code))}>
              <SelectTrigger aria-label="Album" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUPS.map(g => {
                  const mine = albums.filter(e => e.group === g);
                  return mine.length ? (
                    <SelectGroup key={g.code}>
                      <SelectLabel>{g.name}</SelectLabel>
                      {mine.map(e => (
                        <SelectItem key={e.code} value={e.code}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null;
                })}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {cards.map(c => {
                const on = chosen.includes(c.id);
                return (
                  <button
                    key={c.id}
                    aria-pressed={on}
                    aria-label={cardName(c)}
                    disabled={!on && full}
                    onClick={() => toggle(c.id)}
                    className={cn(
                      'relative aspect-[63/88] overflow-hidden rounded-lg ring-2 transition focus-visible:ring-4 focus-visible:outline-none disabled:opacity-40',
                      on ? 'ring-primary' : RARITY_RING[c.rarity]
                    )}
                  >
                    {artReady && <img alt="" src={getArt(c)} className="absolute inset-0 size-full object-cover" />}
                    {on && (
                      <span className="absolute inset-0 grid place-items-center bg-background/50">
                        <Check className="size-8 rounded-full bg-primary p-1.5 text-primary-foreground" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>Your binder is empty</EmptyTitle>
              <EmptyDescription>Open an album first, then put your favourite pulls on show.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
