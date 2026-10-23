# Moonflare Photocard Club

A K-pop photocard pack-opening game built with Next.js and the React Bits
[HoloCard](https://reactbits.dev/components/holo-card) component.

## Direction

A card-opening site built around the K-pop photocard hobby, where collectors chase random cards and trade for their favorite member (their "bias"). Most of the game design comes from how that hobby already works.

### Core loop

1. **Earn currency.** Daily login, small minigames, or finishing a collection set.
2. **Buy an album pack.** Each album is a pack themed on a comeback era, like Summer Era or Debut Era.
3. **Open it.** Peel the shrink-wrap, open the album, then flip the cards one at a time. The reveal is where most of the fun is.
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

- **Pick your bias.** Choose a favorite member and get a small boost to their pull rate.
- **Binder pages.** Collections shown as plastic sleeves in a binder, the way collectors really display PCs. *(Basic version built.)*
- **Decorate your toploader.** Sticker and deco customization for favorite cards. This is huge in the real hobby.
- **Duplicate trading.** A trade board, or "WTT" (want to trade) posts between users.
- **Comeback events.** Limited-time packs with era-exclusive cards, which keeps people coming back.
- **Pity system.** A guaranteed high-rarity pull after a run of bad luck, so it never feels unfair. *(Built: a lucky draw is guaranteed within 15 albums. The original idea was an Epic every 10 packs.)*
- **Fan chant / lightstick mode.** Shake or tap during a Legendary reveal and a lightstick glows in the group's color.

### Tech stack

- **Prototype:** a single HTML page with the foil shader, card flips and confetti. Kept in `prototype/`.
- **Full website:** Next.js (this repo), with Supabase planned for accounts, inventories and trades, hosted on Vercel.
- **Game feel (planned):** Framer Motion or GSAP for animation, and Howler.js for the pop of the album opening and the sparkle of a rare card.

### MVP (version 1)

- [x] One fictional group of 5 members, about 40 cards (42, across 5 rarities)
- [x] A real group: LE SSERAFIM, 7 eras from FEARLESS to PUREFLOW Pt.1, 147 photo cards (see [Real groups](#real-groups))
- [x] Album opening animation with a 5-card reveal
- [x] Binder collection view with completion %
- [x] Landing page, nav bar, and a page per group plus a collection page
- [ ] Daily free pack, saved in localStorage (the build gives 300 daily stars instead, enough for 3 albums, resetting at the player's local midnight)

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

Needs Node.js 18.18 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## UI stack

- [shadcn/ui](https://ui.shadcn.com) (Radix, "nova" preset) for the app's buttons, cards, tabs, dialogs, select, tooltips, table and toasts. The components live in `components/ui/`; add more with `npx shadcn@latest add <name>`.
- Tailwind CSS v4. Theme tokens (a dark plum background, a lightstick-pink primary and rarity colors) are in `app/globals.css`. The app always renders in dark mode (`<html class="dark">`).
- `app/globals.css` imports Tailwind with `source("..")`, so class scanning works even when the dev server starts from another folder.
- The opening stage keeps its own CSS in `globals.css`, because its animations are specific to the game.

## Layout

- `components/HoloCard/` holds the React Bits HoloCard (JS-CSS variant). It has four small changes, each marked with a comment:
  a controlled `flipped` prop, an `onClick` prop, starting face-down without a flip animation, and releasing the WebGL context on unmount.
- Pages: `/` is the landing page (`components/Landing.jsx`), `/groups/<slug>` is one group's albums (`components/GroupPage.jsx`), and `/collection` is the binder (`components/Collection.jsx`).
- `components/SiteHeader.jsx` is the nav bar shown on every page: a shadcn Navigation Menu with a Groups dropdown, plus stars and the daily button. `components/GameProvider.jsx` shares the save between pages.
- `components/OpeningStage.jsx` handles ripping the shrink-wrap and flipping the five cards.
- `components/InspectModal.jsx` is the large card view, with a foil picker and a "try your own photo" preview.
- `lib/cards.js` is the card catalog (groups, eras, cards) and the foil each rarity gets.
- `lib/photos/lesserafim.js` lists LE SSERAFIM photo URLs. It's generated by `scripts/fetch-lesserafim.mjs`.
- `tests/cards.test.js` checks the catalog: unique ids, 21 cards per era, a photo for every real-group card.
- `lib/gacha.js` holds pull rates, pity and pack rolling. Duplicate refunds are in `RARITY` in `lib/cards.js`: 5 / 10 / 20 / 40 / 100 ★ from Common to Mythic, so an album of all duplicates returns about half its cost.
- `tests/gacha.test.js` covers the odds, pity and economy. Run it with `npm test`.
- `lib/art.js` draws MOONFLARE's card art on canvas, and returns the photo URL for real groups' cards and covers.
- `lib/useGame.js` saves progress to localStorage.

## Notes

- Each live HoloCard uses one WebGL context, and browsers allow about 16. The binder shows plain thumbnails for that reason.
- React strict mode is off because HoloCard releases its WebGL context on unmount (see `next.config.mjs`).
