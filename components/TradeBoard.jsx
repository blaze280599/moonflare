'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeftRight, Clock, Inbox, Repeat, Send } from 'lucide-react';
import { toast } from 'sonner';
import { CARD_BY_ID } from '@/lib/cards';
import { canSee, describeWant, offerOptions } from '@/lib/trade';
import { acceptOffer, cancelListing, createListing, declineOffer, loadBoard, makeOffer, withdrawOffer } from '@/app/actions/trade';
import { useGameContext } from '@/components/GameProvider';
import { ListCardDialog } from '@/components/ListCardDialog';
import { MakeOfferDialog } from '@/components/MakeOfferDialog';
import { CardFacts, TradeCardThumb, cardName } from '@/components/TradeCardThumb';
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
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const daysLeft = iso => Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 86_400_000));
const left = iso => {
  const d = daysLeft(iso);
  return d <= 1 ? 'Closes today' : `${d} days left`;
};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// /trade: the board of other players' listings, your listings with their offers, your offers, and history.
// `initialBoard` comes from the server (getTradeBoard); every action returns the board as it is now.
export default function TradeBoard({ initialBoard }) {
  const { state, loaded, artReady, run, inspect } = useGameContext();
  const [data, setData] = useState(initialBoard);
  const [fillable, setFillable] = useState(false);
  const owned = state.owned;

  // Runs a trade action through useGame's queue, so its { state } is adopted like any other save change.
  const act = async (action, done) => {
    const res = await run(action);
    if (res?.error) {
      toast.error(res.error);
      // The board may have moved on (a listing closed, an offer was answered), so show the latest.
      if (res.board) setData(res.board);
      else run(loadBoard).then(r => r?.board && setData(r.board));
      return false;
    }
    setData(res.board);
    if (done) toast.success(done);
    return true;
  };

  if (!data) {
    return (
      <Page>
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>The trade board didn’t load</EmptyTitle>
            <EmptyDescription>Reload the page to try again.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Page>
    );
  }

  const canFill = l => offerOptions(owned, l.want).length > 0;
  const board = data.board.filter(l => !l.myOffer && (!fillable || canFill(l))).sort((a, b) => canFill(b) - canFill(a));
  const myOffers = data.board.filter(l => l.myOffer);
  const incoming = data.mine.reduce((n, l) => n + l.offers.length, 0);
  const thumb = (card, visible) => <TradeCardThumb card={card} visible={visible} artReady={artReady} onInspect={inspect} />;

  return (
    <Page action={loaded && <ListCardDialog owned={owned} artReady={artReady} onList={(id, want) => act(() => createListing(id, want), 'Card listed')} />}>
      <Tabs defaultValue="board" className="gap-6">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="mine">
            Yours
            {incoming > 0 && <Badge className="tabular-nums">{incoming}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch id="fillable" checked={fillable} onCheckedChange={setFillable} />
            <Label htmlFor="fillable">Only listings I can fill</Label>
          </div>
          {board.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {board.map(l => {
                const card = CARD_BY_ID[l.cardId];
                return (
                  <ListingCard key={l.id} card={card} thumb={thumb(card, canSee(owned, card.id))} listing={l} by={l.lister}>
                    <span className="text-xs text-muted-foreground">{l.offerCount ? `${plural(l.offerCount, 'offer')} so far` : 'No offers yet'}</span>
                    <MakeOfferDialog
                      listing={l}
                      card={card}
                      owned={owned}
                      artReady={artReady}
                      onOffer={(id, cards) => act(() => makeOffer(id, cards), 'Offer sent')}
                    />
                  </ListingCard>
                );
              })}
            </div>
          ) : (
            <Nothing icon={<ArrowLeftRight />} title={fillable ? 'Nothing you can fill right now' : 'No listings from other players'}>
              {fillable ? 'Open more albums, or turn the filter off to see every listing.' : 'When someone lists a card, it shows up here.'}
            </Nothing>
          )}
        </TabsContent>

        <TabsContent value="mine" className="space-y-4">
          {data.mine.length ? (
            data.mine.map(l => {
              const card = CARD_BY_ID[l.cardId];
              return (
                <ListingCard key={l.id} card={card} thumb={thumb(card, true)} listing={l} by="you">
                  <span className="text-xs text-muted-foreground">{l.offers.length ? plural(l.offers.length, 'offer') : 'Waiting for offers'}</span>
                  <Confirm
                    trigger={<Button variant="outline">Cancel listing</Button>}
                    title="Cancel this listing?"
                    body={`${cardName(card)} goes back to your binder${l.offers.length ? ' and every offer on it is returned' : ''}.`}
                    confirm="Cancel listing"
                    keep="Keep it listed"
                    onConfirm={() => act(() => cancelListing(l.id), 'Listing cancelled')}
                  />
                  {l.offers.length > 0 && (
                    <ItemGroup className="w-full gap-2 border-t pt-4">
                      {l.offers.map(o => (
                        <Item key={o.id} variant="muted" className="items-start">
                          <ItemContent className="min-w-0 basis-full gap-3">
                            <ItemTitle>{o.offerer} offers</ItemTitle>
                            <OfferedCards ids={o.cards} owned={owned} thumb={thumb} />
                          </ItemContent>
                          <ItemActions className="w-full justify-end">
                            <Button variant="ghost" onClick={() => act(() => declineOffer(o.id), 'Offer declined')}>
                              Decline
                            </Button>
                            <Confirm
                              trigger={<Button>Accept</Button>}
                              title="Make this trade?"
                              body={`${cardName(card)} goes to ${o.offerer}, and their ${plural(o.cards.length, 'card')} go into your binder. Any other offers are returned. This can’t be undone.`}
                              confirm="Trade"
                              keep="Not yet"
                              onConfirm={() => act(() => acceptOffer(o.id), 'Traded! The new cards are in your binder.')}
                            />
                          </ItemActions>
                        </Item>
                      ))}
                    </ItemGroup>
                  )}
                </ListingCard>
              );
            })
          ) : (
            <Nothing icon={<Inbox />} title="You have no listings">
              List a duplicate and say what you’d like for it.
            </Nothing>
          )}
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          {myOffers.length ? (
            myOffers.map(l => {
              const card = CARD_BY_ID[l.cardId];
              return (
                <ListingCard key={l.id} card={card} thumb={thumb(card, canSee(owned, card.id))} listing={l} by={l.lister}>
                  <div className="w-full space-y-3">
                    <p className="text-sm font-medium">You offered</p>
                    <OfferedCards ids={l.myOffer.cards} owned={owned} thumb={thumb} mine />
                  </div>
                  <Button variant="outline" onClick={() => act(() => withdrawOffer(l.myOffer.id), 'Offer withdrawn. Your cards are back.')}>
                    Withdraw offer
                  </Button>
                </ListingCard>
              );
            })
          ) : (
            <Nothing icon={<Send />} title="No offers waiting">
              Offers you make on the board show up here until the lister answers.
            </Nothing>
          )}
        </TabsContent>

        <TabsContent value="history">
          {data.history.length ? (
            <ItemGroup className="gap-2">
              {data.history.map(h => (
                <HistoryRow key={h.id} entry={h} owned={owned} thumb={thumb} />
              ))}
            </ItemGroup>
          ) : (
            <Nothing icon={<Repeat />} title="No trades yet">
              Finished, declined and expired trades show up here.
            </Nothing>
          )}
        </TabsContent>
      </Tabs>
    </Page>
  );
}

function Page({ action, children }) {
  return (
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
              <BreadcrumbPage>Trade</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">Trade board</h1>
            <p className="max-w-xl text-muted-foreground">
              Swap duplicates with other players. Cards you haven’t pulled stay face down until they’re yours.
            </p>
          </div>
          {action}
        </div>
      </header>
      <div className="pt-8">{children}</div>
    </div>
  );
}

// One listing: the card (face down unless `thumb` was made visible), its facts, what the lister wants.
function ListingCard({ card, thumb, listing, by, children }) {
  return (
    <Card>
      <CardContent className="flex gap-4">
        {thumb}
        <div className="min-w-0 flex-1 space-y-3">
          <CardFacts card={card} />
          <div className="space-y-1 text-sm">
            <p className="text-xs font-medium text-muted-foreground">Wants</p>
            <p>{describeWant(listing.want)}</p>
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            Listed by {by} · {left(listing.expiresAt)}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-3">{children}</CardFooter>
    </Card>
  );
}

// Cards in an offer. Your own offered cards always show; anyone else's follow the no-spoiler rule.
function OfferedCards({ ids, owned, thumb, mine = false }) {
  return (
    <div className="flex flex-wrap gap-3">
      {ids.map((id, i) => {
        const card = CARD_BY_ID[id];
        return (
          <div key={`${id}-${i}`} className="flex w-full items-center gap-3 sm:w-auto">
            {thumb(card, mine || canSee(owned, id))}
            <CardFacts card={card} />
          </div>
        );
      })}
    </div>
  );
}

const STATUS = {
  traded: ['Traded', 'default'],
  accepted: ['Traded', 'default'],
  declined: ['Declined', 'secondary'],
  withdrawn: ['Withdrawn', 'secondary'],
  cancelled: ['Cancelled', 'secondary'],
  expired: ['Expired', 'outline']
};

function HistoryRow({ entry: h, owned, thumb }) {
  const card = CARD_BY_ID[h.cardId];
  const [label, variant] = STATUS[h.status];
  const traded = label === 'Traded';
  let text;
  if (h.role === 'lister') {
    text = traded ? `You traded ${cardName(card)} to ${h.other} for ${plural(h.cards.length, 'card')}` : `Your listing of ${cardName(card)}`;
  } else {
    text = traded
      ? `You got ${cardName(card)} from ${h.other} for ${plural(h.cards.length, 'card')}`
      : `Your offer for ${h.other}’s ${cardName(card)}`;
  }
  return (
    <Item variant="outline" className="items-start">
      <ItemContent className="min-w-0 basis-full gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={variant}>{label}</Badge>
          <ItemTitle className="min-w-0">{text}</ItemTitle>
        </div>
        {h.closedAt && <ItemDescription>{new Date(h.closedAt).toLocaleDateString()}</ItemDescription>}
        {traded && (
          <div className="flex flex-wrap gap-2">
            {/* The listed card is the lister's own; what they received is theirs now. Same for the offerer. */}
            {thumb(card, h.role === 'lister' || canSee(owned, card.id))}
            {h.cards.map((id, i) => (
              <span key={`${id}-${i}`}>{thumb(CARD_BY_ID[id], h.role === 'offerer' || canSee(owned, id))}</span>
            ))}
          </div>
        )}
      </ItemContent>
    </Item>
  );
}

function Nothing({ icon, title, children }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function Confirm({ trigger, title, body, confirm, keep, onConfirm }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{keep}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
