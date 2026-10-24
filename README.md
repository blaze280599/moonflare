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
| Mythic | 1-of-1 "misprint" or "B-side" | Full animated card with sound | Group special, gold foil (no animation or sound yet) |

### Features that make it feel K-pop specific

- **Pick your bias.** Choose a favorite member and get a small boost to their pull rate. *(Built: one bias per group, picked on the group page. Their share of each member rarity goes up by 2 percentage points (20% → 22%), taken evenly from the other members, so about 21.9% of cards instead of 19.9%. Rarity odds don't change. The boost is capped at 1–2 points on purpose.)*
- **Binder pages.** Collections shown as plastic sleeves in a binder, the way collectors really display PCs. *(Basic version built.)*
- **Decorate your toploader.** Sticker and deco customization for favorite cards. This is huge in the real hobby.
- **Duplicate trading.** A trade board, or "WTT" (want to trade) posts between users.
- **Comeback events.** Limited-time packs with era-exclusive cards, which keeps people coming back.
- **Pity system.** A guaranteed high-rarity pull after a run of bad luck, so it never feels unfair. *(Built: a lucky draw is guaranteed within 15 albums. The original idea was an Epic every 10 packs.)*
- **Fan chant / lightstick mode.** Shake or tap during a Legendary reveal and a lightstick glows in the group's color.

### Tech stack

- **Prototype:** a single HTML page with the foil shader, card flips and confetti. Kept in `prototype/`.
- **Full website:** Next.js (this repo), with Supabase for accounts and per-account saves (built) and, next, trades, hosted on Vercel.
- **Game feel:** the pack is a real 3D object built with three.js (`lib/pack3d.js`), cut open by pressing on the dotted line near its top and dragging along it, in the spirit of Pokémon TCG Pocket. Planned: Howler.js for the rip of the pack and the sparkle of a rare card.

### MVP (version 1)

- [x] One fictional group of 5 members, about 40 cards (42, across 5 rarities)
- [x] A real group: LE SSERAFIM, 7 eras from FEARLESS to PUREFLOW Pt.1, 147 photo cards (see [Real groups](#real-groups))
- [x] Album opening: a 3D foil booster pack you cut open by click-dragging along its cut line (and can grab to turn it around), then a one-by-one card reveal
- [x] Binder collection view with completion %
- [x] Landing page, nav bar, and a page per group plus a collection page
- [x] Accounts: sign up, log in and sign out (Supabase Auth). Every game page needs a signed-in player
- [x] Forgot password (an emailed reset link) and Change password in the account menu
- [x] Saves on the server, per account (Supabase `saves` table), with every album roll, daily claim and reset done in Server Actions. A browser's old localStorage save can be brought into an account once
- [x] Pick your bias: a favourite member per group (saved in `saves.bias`) gets 2 points more of the member cards
- [x] Daily reward: 300 stars a day instead of a free pack (enough for 3 albums), resetting at midnight in the time zone the player signed up from

### Real groups

Moonflare is a private site for two people, so real groups use real photos. Each card hotlinks an
official concept photo from the [K-pop Fandom wiki](https://kpop.fandom.com), cropped to card shape
by the wiki's image CDN. Nothing is downloaded or committed; `lib/photos/lesserafim.js` only lists
URLs. Every real-group era has the same 21-card layout as MOONFLARE: per member an album PC, selfie PC,
POB and lucky draw (four different photos from that era's shoot), plus one group special.

To refresh the URLs or add a comeback, add the album to `ERAS` in `scripts/fetch-lesserafim.mjs` and
`lib/cards.js`, then run `npm run photos:lesserafim`. Adding another group means a script like it, a
member list and a `GROUPS` entry in `lib/cards.js`.

If this site ever goes public, the photos have to go: they belong to Source Music / HYBE. Swap them
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
- `lib/pack3d.js` is the 3D booster pack (three.js, loaded only when a pack opens): a puffy foil pillow with rounded shoulders, pinch wrinkles fanning into rippled, slightly curled seals (seeded per era, so each pack crinkles its own way), and a dotted cut line. Press on the line and drag along it: the cut grows only from its own ends, so it has to be traced, and once it reaches a side the strip above it peels up, then flies off when the cut spans the pack. Pressing anywhere else on the pack grabs it to turn it around; it stays nearly in place, giving only a little toward the pointer (springs bring it back). The five pulls sit inside the pack (art facing the back, with the first card to be revealed at the back, so a peek only shows the card you would flip first), and are hidden once the DOM stack takes over. Plus foil glitter. Its wrapper art is drawn by `getPackArt()` in `lib/art.js` from the album cover (real groups) or a member lineup (MOONFLARE).
- `components/InspectModal.jsx` is the large card view, with a foil picker and a "try your own photo" preview.
- `lib/cards.js` is the card catalog (groups, eras, cards) and the foil each rarity gets.
- `lib/photos/lesserafim.js` lists LE SSERAFIM photo URLs. It's generated by `scripts/fetch-lesserafim.mjs`.
- `tests/cards.test.js` checks the catalog: unique ids, 21 cards per era, a photo for every real-group card.
- `lib/gacha.js` holds pull rates, pity, the bias boost (`BIAS_BOOST`, `memberRates()`) and pack rolling. Duplicate refunds are in `RARITY` in `lib/cards.js`: 5 / 10 / 20 / 40 / 100 ★ from Common to Mythic, so an album of all duplicates returns about half its cost.
- `tests/gacha.test.js` covers the odds, pity and economy. Run it with `npm test`.
- `lib/art.js` draws MOONFLARE's card art on canvas, and returns the photo URL for real groups' cards and covers.
- `lib/useGame.js` holds the game state on the client. It starts from the save the `(game)` layout reads on the server, and every change goes through a Server Action in `app/actions/game.js` (open an album, claim the daily stars, reset, import a browser's old save), which runs `lib/gacha.js` on the server and writes the save with optimistic locking (`version`). `lib/save.js` has the pure helpers (row mapping, dates in a time zone, cleaning an imported save), tested in `tests/save.test.js`.
- `supabase/migrations/` is the database schema. Players can only `select` their own `profiles` and `saves` rows; all writes use the secret key in `lib/supabase/admin.js`.

## Notes

- Each live HoloCard uses one WebGL context, and browsers allow about 16. The binder shows plain thumbnails for that reason. The 3D pack is one more context, released as soon as the cards are out.
- React strict mode is off because HoloCard releases its WebGL context on unmount (see `next.config.mjs`).
