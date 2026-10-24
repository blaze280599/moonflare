# Moonflare Photocard Club

A K-pop photocard pack-opening game built with Next.js and the React Bits
[HoloCard](https://reactbits.dev/components/holo-card) component.

## Direction

A card-opening site built around the K-pop photocard hobby, where collectors chase random cards and trade for their favorite member (their "bias"). Most of the game design comes from how that hobby already works.

### Core loop

1. **Earn currency.** Daily login, small minigames, or finishing a collection set.
2. **Buy an album pack.** Each album is a pack themed on a comeback era, like Summer Era or Debut Era.
3. **Open it.** Tear the foil pack open, watch the cards slide out, then flip them one at a time. The reveal is where most of the fun is.
4. **Collect, trade and show off.** Fill binders, swap duplicates, display your favorites.

### Rarity, built on real photocard culture

| Tier | Real-world equivalent | Planned visual effect | In this build |
|---|---|---|---|
| Common | Standard album PC | Plain matte | Album PC, no foil, light glare |
| Rare | Selfie PC | Glossy shine | Selfie PC, light glitter foil |
| Epic | Pre-order benefit (POB) | Holographic shimmer that follows the mouse or tilt | POB, shards / swirl / rainbow foil |
| Legendary | Lucky draw / fansign PC | Animated, signed, with a glitter border | Lucky draw, stars / cosmos / bursts foil, gold signature |
| Mythic | 1-of-1 "misprint" or "B-side" | Full animated card with sound | Group special, gold foil, the longest chime run and the most sparkle (no animation yet) |

### Features that make it feel K-pop specific

- **Pick your bias.** Choose a favorite member and get a small boost to their pull rate. *(Built: one bias per group, picked on the group page. Their share of each member rarity goes up by 2 percentage points (20% → 22%), taken evenly from the other members, so about 21.9% of cards instead of 19.9%. Rarity odds don't change. The boost is capped at 1–2 points on purpose.)*
- **Binder pages.** Collections shown as plastic sleeves in a binder, the way collectors really display PCs. *(Basic version built.)*
- **Decorate your toploader.** Sticker and deco customization for favorite cards. This is huge in the real hobby. *(Built: put any owned card in a tinted toploader and place, move, resize and turn up to 16 stickers from a built-in set. Decorated cards show in their toploader in the binder.)*
- **Duplicate trading.** A trade board, or "WTT" (want to trade) posts between users. *(Built: see [Trading](#trading).)*
- **Comeback events.** Limited-time packs with era-exclusive cards, which keeps people coming back. *(Built: see [Comeback events](#comeback-events). Event albums use the normal pull rates and pity.)*
- **Pity system.** A guaranteed high-rarity pull after a run of bad luck, so it never feels unfair. *(Built: a lucky draw is guaranteed within 15 albums. The original idea was an Epic every 10 packs.)*
- **Player profiles.** A page per player to show off. *(Built: see [Player profiles](#player-profiles).)*

### Tech stack

- **Prototype:** a single HTML page with the foil shader, card flips and confetti. Kept in `prototype/`.
- **Full website:** Next.js (this repo), with Supabase for accounts, per-account saves and trades (built), hosted on Vercel.
- **Game feel:** the pack is a real 3D object built with three.js (`lib/pack3d.js`), cut open by pressing on the dotted line near its top and dragging along it, in the spirit of Pokémon TCG Pocket. Sound is synthesized in the browser with the Web Audio API (`lib/sound.js`, no audio files): a rip that follows how fast you cut, and chimes when a Rare-or-better card is revealed.

### MVP (version 1)

- [x] Real groups only. The made-up MOONFLARE group (drawn card art) was removed in October 2026; its codes are retired (see `lib/cards.js`)
- [x] A real group: LE SSERAFIM, 7 eras from FEARLESS to PUREFLOW Pt.1, 147 photo cards (see [Real groups](#real-groups))
- [x] A second group: aespa, 8 eras from SAVAGE to LEMONADE (Korean minis and studio albums), 136 photo cards
- [x] A third group: NewJeans, 4 eras from New Jeans to How Sweet (both EPs and both single albums), 84 photo cards
- [x] A fourth group: IVE, 6 eras from I've IVE to REVIVE+ (EPs and studio albums), 150 photo cards
- [x] A fifth group: ITZY, 6 eras from CRAZY IN LOVE to MOTTO, 126 photo cards. The wiki has too few photos of
  their 2019–2022 minis (and Lia sat out BORN TO BE), so those are left out for now
- [x] Album opening: a 3D foil booster pack you cut open by click-dragging along its cut line (and can grab to turn it around), then a one-by-one card reveal
- [x] Binder collection view with completion %
- [x] Landing page, nav bar, and a page per group plus a collection page
- [x] Accounts: sign up, log in and sign out (Supabase Auth). Every game page needs a signed-in player
- [x] Forgot password (an emailed reset link) and Change password in the account menu
- [x] Saves on the server, per account (Supabase `saves` table), with every album roll, daily claim and reset done in Server Actions. A browser's old localStorage save can be brought into an account once
- [x] Pick your bias: a favourite member per group (saved in `saves.bias`) gets 2 points more of the member cards
- [x] Sound and sparkle: the cut rips louder and brighter the faster you drag, and Rare-or-better reveals chime and sparkle (more for rarer cards). A switch on the opening stage turns sound off, remembered per browser
- [x] Toploader decorating: a decorate mode in the card dialog, 16 built-in SVG stickers, 6 tints, saved per account
- [x] Player profiles: a page per player with a picture, banner, bio, favourites, a showcase of up to 9 cards, stats, a bias wall and badges
- [x] Daily reward: 300 stars a day instead of a free pack (enough for 3 albums), resetting at midnight in the time zone the player signed up from
- [x] Comeback events: limited-time albums with a countdown, refused by the server outside their window
- [x] Trading: list a card with criteria for what you want back, offer matching cards, accept or decline, with escrow (see [Trading](#trading))

### Comeback events

An event album is an ordinary entry in `ERAS` (`lib/cards.js`) with an `event: { starts, ends, blurb }` window, written as
ISO timestamps with an explicit offset. Its cards follow the usual layout, rates and pity. While it's live, a banner with a
countdown shows on the landing page and the group's page, and the album sits in the group's grid with a Limited badge. Before
it starts it's hidden everywhere. After it ends, the album shows as closed ("Event ended") and owned cards stay in the binder
with a sparkle marking them event-exclusive. `openPack` checks the window with the server's clock; the browser's countdown
is only a display.

To run a new event, add an era with a new code, an `event` window and its photos, as for any era. No event is scheduled
right now (the old sample, MOONFLARE's Starlight Encore, went with that group), so the banner and Encore badge stay hidden
until one is added. Retiring an event needs no change: it
closes when its window ends. Don't delete or rename an event era once anyone owns its cards, since its card ids are save keys.

### Trading

`/trade` is a WTT board between players.

- **A listing** offers one card and says what the lister wants back as **criteria**, never as specific cards:
  a group, albums, members, rarities and foils (any of them left empty means "any"), plus how many cards (1 to 3).
  The criteria must match at least one real card. Listings close after 7 days. A player can have 10 open at once.
- **An offer** is exactly that many of your own cards that fit the criteria. The board shows which listings you can
  fill, and the offer dialog only lists your cards that fit. One offer per listing per player, and up to 10 waiting.
- **The lister accepts or declines.** Accepting swaps the cards and returns every other offer on that listing.
  Listers can cancel a listing and offerers can withdraw an offer at any time; both give the cards back.
  A listing past its date closes as expired and returns everything (checked whenever anyone loads the board or
  trades, so it doesn't need a scheduled job).

**Every card shows.** The board and offers show each card's art, so you always see what you'd give and get. Cards
you don't have yet carry a "Not in your binder" badge, which is how you spot the ones worth trading for. (An earlier
version kept unowned cards face down to avoid spoilers; it was dropped because nobody can judge a trade blind, and the
text already named the card.) Wants are still criteria rather than specific cards, so one listing can be filled by many
different cards.

**Escrow.** Listing or offering a card takes that copy out of your binder straight away, and it sits in the listing
or offer until the trade closes. A copy is always in exactly one place, so it can't be offered twice, and nothing can
duplicate or lose it. The binder and NEW labels count only cards you hold. Reset collection first withdraws your
listings and offers (returning the cards, and other players' offers on your listings), then erases.

Every trade change is one Postgres function (`supabase/migrations/*_trading.sql`) that runs in a single transaction,
locks the saves it touches, and bumps their `version`. The Server Actions in `app/actions/trade.js` check the player
and validate cards and criteria against the catalog (`lib/trade.js`) before calling them with the secret key.

### Player profiles

Every player has a page at `/players/<username>`, and `/profile` goes to your own. Any signed-in player can view
one; only its owner sees the edit controls. Usernames on the trade board and the header's account menu link here.

- **Picture.** Upload a photo, drag and zoom it into a round frame (arrow keys work too), and it's saved as a
  256px WebP (JPEG where the browser can't encode WebP) in a private Supabase Storage bucket, `avatars`, under
  the player's own folder. Pages show it through signed links that last a day. No picture, or an expired link, shows
  initials instead.
- **Banner.** One of five preset gradients built from theme colours, the cover of an album you own a card from,
  or a card from your showcase. If you lose that card, the default preset shows instead.
- **Bio and favourites.** A one-line bio (160 characters), a favourite group and a favourite member. The favourite
  member is only for the profile; the pull-rate boost is still the per-group bias on each group's page.
- **Showcase.** Up to 9 owned cards in your order: drag to reorder with a mouse, or use the arrow buttons under each
  card (keyboard and touch). Decorated cards show in their toploader. A showcased card you no longer own (traded,
  in escrow, reset) is hidden but stays stored, and comes back if the card does.
- **Stats, bias wall and badges.** Collection numbers (cards, copies, completed albums, Mythics, albums opened,
  trades, rarest pull), up to 6 of your favourite member's cards, and 9 badges. All of it is worked out from the
  save each time the page loads, so nothing can be granted by hand, and it follows a Reset.

Other players' saves never reach the browser: the server reads the profile and save with the secret key and sends
only what the page shows (`lib/supabase/profiles.js`). Every change goes through `app/actions/profile.js`, which
cleans it against the player's save with `lib/profile.js` (tested in `tests/profile.test.js`).

Ideas not built yet: an uploaded banner image, a pinned "currently looking for" trade list, profile comments or
guestbook stickers, showing which badges are rare across all players, and a "pity survivor" badge (it needs a record
of past pity streaks, which the save doesn't keep).

### Real groups

Moonflare is a private site for two people, so real groups use real photos. Each card hotlinks an
official concept photo from the [K-pop Fandom wiki](https://kpop.fandom.com), cropped to card shape
by the wiki's image CDN. Nothing is downloaded or committed; `lib/photos/<group>.js` only lists
URLs. Every era has the same layout: per member an album PC, selfie PC,
POB and lucky draw (four different photos from that era's shoot), plus one group special. That's 21 cards
for a five-member group, 17 for aespa's four and 25 for IVE's six. Each group's set covers its Korean minis and studio
albums, not digital singles or Japanese releases. NewJeans also gets its two single albums (it has only two EPs),
and an album's photos include its pre-release single's shoot (OMG pools Ditto's, How Sweet pools Bubble Gum's).

One script, `scripts/fetch-photos.mjs`, builds every group's list from a config in `scripts/groups/<group>.js`:
each member's gallery page, each era's album page and cover file, and optional hand-picked `overrides` for any
card slot. It prints how many photos it found per era and member, and which other album pages the galleries
link to (handy for finding the right page names), and it writes nothing if any card would be missing a photo.

- **Refresh or add a comeback:** add the era to the group's config and to `ERAS` in `lib/cards.js`, then
  `npm run photos -- lesserafim`.
- **Another group:** a new `scripts/groups/<group>.js`, then `npm run photos -- <group>`, then a member list
  and a `GROUPS` entry in `lib/cards.js` importing `<GROUP>_PHOTOS` from `lib/photos/<group>.js`. Look each
  member's gallery page up on the wiki; names aren't predictable (`Kim Chaewon (LE SSERAFIM)/Gallery`).
- **Dead photos:** `npm run photos:check` asks the wiki whether every listed file still exists and names any
  that were deleted or renamed. Run it now and then; a missing file shows as a blank card.

If this site ever goes public, the photos have to go: they belong to the groups' labels (Source Music / HYBE for LE SSERAFIM, SM Entertainment for aespa, ADOR / HYBE for NewJeans, Starship Entertainment for IVE, JYP Entertainment for ITZY). Swap them
for licensed art or player-uploaded photos first.

## Run it

Needs Node.js 18.18 or newer, and a Supabase project for sign-in (the free tier is plenty).

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in the project URL, the publishable key and the secret key
   (Project Settings → API Keys).
   The secret key is for the server only: never give it a `NEXT_PUBLIC_` prefix or commit it.
3. Apply the SQL in `supabase/migrations/` in order (SQL Editor, or `supabase db push` with the CLI). It creates the
   `profiles` and `saves` tables, their row-level security, and the trigger that gives every new account a save.
4. In the Supabase dashboard, under Authentication → URL Configuration, set the Site URL to `http://localhost:3000`
   (your real domain once deployed) and add `http://localhost:3000/auth/confirm**` to the redirect URLs. The `**`
   matters: password reset links carry `?next=/reset-password`, and a redirect URL that doesn't match falls back to
   the bare Site URL, where the link does nothing.

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Without the env vars every page redirects to `/login`, which says what's missing.

Confirmation emails come from Supabase's built-in mailer, which only sends a few an hour. That's fine for a
private club; add your own SMTP under Authentication → Emails if it isn't. The default email's link only works
in the browser that signed up. To make it work on any device, change the template's link to
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`. Do the same for the Reset password
template with `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`.

## UI stack

- [shadcn/ui](https://ui.shadcn.com) (Radix, "nova" preset) for the app's buttons, cards, tabs, dialogs, select, tooltips, table and toasts. The components live in `components/ui/`; add more with `npx shadcn@latest add <name>`.
- Tailwind CSS v4. Theme tokens (Claude Code-style warm charcoal neutrals, a pink primary in place of its orange, and rarity colors) are in `app/globals.css`. The app always renders in dark mode (`<html class="dark">`).
- `app/globals.css` imports Tailwind with `source("..")`, so class scanning works even when the dev server starts from another folder.
- The opening stage keeps its own CSS in `globals.css`, because its animations are specific to the game.

## Layout

- `components/HoloCard/` holds the React Bits HoloCard (JS-CSS variant). It has four small changes, each marked with a comment:
  a controlled `flipped` prop, an `onClick` prop, starting face-down without a flip animation, and releasing the WebGL context on unmount.
- Pages: `/` is the landing page (`components/Landing.jsx`), `/groups/<slug>` is one group's albums (`components/GroupPage.jsx`), and `/collection` is the binder (`components/Collection.jsx`).
- `components/SiteHeader.jsx` is the nav bar shown on every page: a shadcn Navigation Menu with a Groups dropdown, plus stars and the daily button. `components/GameProvider.jsx` shares the save between pages.
- `components/OpeningStage.jsx` runs an opening: the 3D pack, the cards sliding out of it, the stack you flip and swipe through, and the spread of all five at the end.
- `lib/pack3d.js` is the 3D booster pack (three.js, loaded only when a pack opens): a puffy foil pillow with rounded shoulders, pinch wrinkles fanning into rippled, slightly curled seals (seeded per era, so each pack crinkles its own way), and a dotted cut line. Press on the line and drag along it: the cut grows only from its own ends, so it has to be traced, and once it reaches a side the strip above it peels up, then flies off when the cut spans the pack. Pressing anywhere else on the pack grabs it to turn it around; it stays nearly in place, giving only a little toward the pointer (springs bring it back). The five pulls sit inside the pack (art facing the back, with the first card to be revealed at the back, so a peek only shows the card you would flip first), and are hidden once the DOM stack takes over. Plus foil glitter. Its wrapper art is drawn by `getPackArt()` in `lib/art.js` from the album cover.
- `lib/sound.js` makes the game's sounds with the Web Audio API. Audio starts only after a press on the opening stage, and the stage's sound switch is kept in localStorage (`lib/usePref.js`). `sparkle()` in `lib/celebrate.js` draws the stars over a revealed card in plain DOM and CSS.
- `components/InspectModal.jsx` is the large card view, with a foil picker and a "try your own photo" preview.
- `components/InspectModal.jsx` is the large card view, with a foil picker and a "try your own photo" preview. For owned cards it also opens decorate mode (`components/ToploaderEditor.jsx`).
- `components/Toploader.jsx` draws a card in its toploader with stickers, in plain DOM (no WebGL), for the editor and the binder. The stickers and tints are SVG drawn in code in `lib/stickers.js`; `lib/deco.js` holds the rules the server applies (owned cards only, known ids, clamped positions, at most 16 stickers and 60 toploaders), tested in `tests/deco.test.js`. Decorations live in `saves.deco` and are written by the `saveToploader` Server Action.
- `lib/cards.js` is the card catalog (groups, eras, cards) and the foil each rarity gets.
- `lib/photos/<group>.js` lists each group's photo URLs. They're generated by `scripts/fetch-photos.mjs` from `scripts/groups/<group>.js`.
- `tests/cards.test.js` checks the catalog: unique ids and codes, four cards per member plus a group special in each era, a photo for every card, and that MOONFLARE's retired codes stay unused.
- `lib/gacha.js` holds pull rates, pity, the bias boost (`BIAS_BOOST`, `memberRates()`) and pack rolling. Duplicate refunds are in `RARITY` in `lib/cards.js`: 5 / 10 / 20 / 40 / 100 ★ from Common to Mythic, so an album of all duplicates returns about half its cost.
- `tests/gacha.test.js` covers the odds, pity and economy. Run it with `npm test`.
- `lib/events.js` has the comeback-event helpers (`eventPhase`, `canOpenEra`, countdown text), tested in `tests/events.test.js`. `components/EventBanner.jsx` is the banner and countdown badge; `lib/useNow.js` ticks the clock for them.
- `lib/art.js` returns the photo URLs for cards and covers, and draws card backs and pack wrappers on canvas.
- `lib/useGame.js` holds the game state on the client. It starts from the save the `(game)` layout reads on the server, and every change goes through a Server Action in `app/actions/game.js` (open an album, claim the daily stars, reset, import a browser's old save), which runs `lib/gacha.js` on the server and writes the save with optimistic locking (`version`). `lib/save.js` has the pure helpers (row mapping, dates in a time zone, cleaning an imported save), tested in `tests/save.test.js`.
- `supabase/migrations/` is the database schema. Players can only `select` their own `profiles` and `saves` rows; all writes use the secret key in `lib/supabase/admin.js`. The trade tables (`trade_listings`, `trade_offers`) have no client grants at all: the board is read on the server.
- `/trade` is `components/TradeBoard.jsx` (tabs for the board, your listings, your offers and history), with `ListCardDialog.jsx`, `MakeOfferDialog.jsx` and `TradeCardThumb.jsx` (the face-down rule). `lib/trade.js` has the criteria and matching rules, tested in `tests/trade.test.js`; `lib/supabase/trades.js` reads the board; `app/actions/trade.js` holds the actions.

## Notes

- Each live HoloCard uses one WebGL context, and browsers allow about 16. The binder shows plain thumbnails for that reason. The 3D pack is one more context, released as soon as the cards are out.
- React strict mode is off because HoloCard releases its WebGL context on unmount (see `next.config.mjs`).
