'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { CARDS, CARD_BY_ID, ERAS, GROUPS, RARITY } from '@/lib/cards';
import { FOILS, LISTING_DAYS, MAX_WANT, NO_CRITERIA, describeWant, matchesWant, sanitizeWant } from '@/lib/trade';
import { CardFacts, TradeCardThumb, cardName } from '@/components/TradeCardThumb';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const ANY = 'any';
// Outline toggles barely change when pressed, so chosen filters get the primary color.
const ON = 'data-[state=on]:border-primary data-[state=on]:bg-primary/15';

// Put a card up for trade and describe what you want back. Wants are criteria, never specific cards.
export function ListCardDialog({ owned, artReady, onList }) {
  const [open, setOpen] = useState(false);
  const [cardId, setCardId] = useState('');
  const [want, setWant] = useState(NO_CRITERIA);
  const [busy, setBusy] = useState(false);

  const mine = useMemo(() => CARDS.filter(c => owned[c.id] > 0), [owned]);
  const spares = mine.filter(c => owned[c.id] > 1);
  const singles = mine.filter(c => owned[c.id] === 1);
  const card = CARD_BY_ID[cardId];
  const checked = sanitizeWant(want);
  const fits = checked.want ? CARDS.filter(c => matchesWant(c, checked.want)).length : 0;
  const set = patch => setWant(w => ({ ...w, ...patch }));

  const reset = next => {
    setOpen(next);
    if (next) {
      setCardId(spares[0]?.id || '');
      setWant(NO_CRITERIA);
    }
  };

  const submit = async e => {
    e.preventDefault();
    if (!card || !checked.want) return;
    setBusy(true);
    const ok = await onList(card.id, checked.want);
    setBusy(false);
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button size="lg" disabled={!mine.length}>
          <Plus />
          List a card
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>List a card for trade</DialogTitle>
            <DialogDescription>
              Pick a card, then say what you’d take for it.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="list-card">Your card</FieldLabel>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger id="list-card" className="w-full">
                  <SelectValue placeholder="Choose a card" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ['Duplicates', spares],
                    ['Your only copy', singles]
                  ].map(
                    ([label, cards]) =>
                      cards.length > 0 && (
                        <SelectGroup key={label}>
                          <SelectLabel>{label}</SelectLabel>
                          {cards.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {cardName(c)} · {c.era.name}
                              {owned[c.id] > 1 && ` ×${owned[c.id]}`}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )
                  )}
                </SelectContent>
              </Select>
              {card && (
                <div className="flex items-center gap-3 pt-1">
                  <TradeCardThumb card={card} artReady={artReady} className="w-14 sm:w-16" />
                  <CardFacts card={card} />
                </div>
              )}
              {card && owned[card.id] === 1 && (
                <Alert>
                  <AlertDescription>This is your only copy. It leaves your binder until the listing closes.</AlertDescription>
                </Alert>
              )}
            </Field>

            <FieldSet>
              <FieldLegend>What you want back</FieldLegend>
              <FieldDescription>Leave a filter empty to accept anything.</FieldDescription>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="want-group">Group</FieldLabel>
                  <Select value={want.group || ANY} onValueChange={g => set({ group: g === ANY ? null : g, eras: [], members: [] })}>
                    <SelectTrigger id="want-group" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>Any group</SelectItem>
                      {GROUPS.map(g => (
                        <SelectItem key={g.code} value={g.code}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {want.group && (
                  <>
                    <Choice label="Albums" value={want.eras} onChange={eras => set({ eras })}>
                      {ERAS.filter(e => e.group.code === want.group).map(e => (
                        <ToggleGroupItem key={e.code} value={e.code} className={ON}>
                          {e.name}
                        </ToggleGroupItem>
                      ))}
                    </Choice>
                    <Choice label="Members" value={want.members} onChange={members => set({ members })}>
                      {GROUPS.find(g => g.code === want.group).members.map(m => (
                        <ToggleGroupItem key={m.code} value={m.code} className={ON}>
                          {m.name}
                        </ToggleGroupItem>
                      ))}
                    </Choice>
                  </>
                )}
                <Choice label="Rarity" value={want.rarities} onChange={rarities => set({ rarities })}>
                  {Object.entries(RARITY).map(([key, r]) => (
                    <ToggleGroupItem key={key} value={key} className={ON}>
                      {r.label}
                    </ToggleGroupItem>
                  ))}
                </Choice>
                <Choice label="Foil" value={want.foils} onChange={foils => set({ foils })}>
                  {FOILS.map(f => (
                    <ToggleGroupItem key={f.key} value={f.key} className={ON}>
                      {f.label}
                    </ToggleGroupItem>
                  ))}
                </Choice>
                <Field>
                  <FieldTitle>How many cards</FieldTitle>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={String(want.count)}
                    onValueChange={v => v && set({ count: Number(v) })}
                    aria-label="How many cards"
                  >
                    {Array.from({ length: MAX_WANT }, (_, i) => (
                      <ToggleGroupItem key={i} value={String(i + 1)} className={`tabular-nums ${ON}`}>
                        {i + 1}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>

          <Alert variant={checked.error ? 'destructive' : 'default'}>
            <AlertDescription>
              {checked.error ||
                `${describeWant(checked.want)}. ${fits} card${fits === 1 ? '' : 's'} in the game fit. Listings close after ${LISTING_DAYS} days.`}
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="submit" size="lg" disabled={!card || !checked.want || busy}>
              {busy ? 'Listing…' : 'List card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Choice({ label, value, onChange, children }) {
  return (
    <Field>
      <FieldTitle>{label}</FieldTitle>
      <ToggleGroup type="multiple" variant="outline" size="sm" value={value} onValueChange={onChange} aria-label={label} className="flex-wrap">
        {children}
      </ToggleGroup>
    </Field>
  );
}
