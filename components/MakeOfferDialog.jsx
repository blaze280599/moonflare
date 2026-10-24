'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { describeWant, offerOptions } from '@/lib/trade';
import { CardFacts, TradeCardThumb, cardName } from '@/components/TradeCardThumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia } from '@/components/ui/item';

// Pick want.count of your own cards that fit a listing. Your cards always show their art: they're yours.
export function MakeOfferDialog({ listing, card, owned, artReady, onOffer }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState({});
  const [busy, setBusy] = useState(false);
  const options = offerOptions(owned, listing.want);
  const total = Object.values(picked).reduce((a, n) => a + n, 0);
  const need = listing.want.count;
  const add = (id, d) => setPicked(p => ({ ...p, [id]: Math.max(0, (p[id] || 0) + d) }));

  const submit = async () => {
    setBusy(true);
    const ids = Object.entries(picked).flatMap(([id, n]) => Array(n).fill(id));
    const ok = await onOffer(listing.id, ids);
    setBusy(false);
    if (ok) setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (next) setPicked({});
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={!options.length}>{options.length ? 'Make an offer' : 'Nothing that fits'}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Offer for {cardName(card)}</DialogTitle>
          <DialogDescription>
            {listing.lister} wants {describeWant(listing.want)}. Your offered cards leave your binder until they answer, and come
            back if they decline.
          </DialogDescription>
        </DialogHeader>
        <ItemGroup className="gap-2">
          {options.map(({ card: c, copies }) => {
            const n = picked[c.id] || 0;
            return (
              <Item key={c.id} variant="outline" size="sm" className="flex-nowrap">
                <ItemMedia>
                  <TradeCardThumb card={c} artReady={artReady} className="w-12 sm:w-14" />
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <CardFacts card={c} />
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="tabular-nums">
                      You have {copies}
                    </Badge>
                    {n > 0 && n === copies && <Badge variant="destructive">Your last copy</Badge>}
                  </div>
                </ItemContent>
                <ItemActions className="gap-1">
                  <Button size="icon-sm" variant="outline" aria-label={`One fewer ${cardName(c)}`} disabled={!n} onClick={() => add(c.id, -1)}>
                    <Minus />
                  </Button>
                  <span className="w-5 text-center text-sm tabular-nums">{n}</span>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label={`Add ${cardName(c)}`}
                    disabled={n >= copies || total >= need}
                    onClick={() => add(c.id, 1)}
                  >
                    <Plus />
                  </Button>
                </ItemActions>
              </Item>
            );
          })}
        </ItemGroup>
        <DialogFooter>
          <Button size="lg" disabled={total !== need || busy} onClick={submit}>
            {busy ? 'Sending…' : `Offer ${total} of ${need} card${need === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
