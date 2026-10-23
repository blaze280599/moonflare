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

### Whose faces go on the cards

Using real idols' photos and names gets into copyright (the photos belong to the agencies and photographers) and likeness rights. That's fine for a private project, but risky if it goes public or makes money. The options:

- **Original fictional idols (best if it might launch).** Your own groups, with their own names, members, lore and art. It's fully yours, and fans get attached to fictional groups too (think Ensemble Stars). **This build uses this option: MOONFLARE is made up.**
- **Fan-art style.** Commissioned or user-drawn art. A gray area, but a common one.
- **Personal use only.** Upload your own photos for a private binder, and don't distribute it. The card view's "try your own photo" preview fits here.

### Tech stack

- **Prototype:** a single HTML page with the foil shader, card flips and confetti. Kept in `prototype/`.
- **Full website:** Next.js (this repo), with Supabase planned for accounts, inventories and trades, hosted on Vercel.
- **Game feel (planned):** Framer Motion or GSAP for animation, and Howler.js for the pop of the album opening and the sparkle of a rare card.

### MVP (version 1)

- [x] One fictional group of 5 members, about 40 cards (42, across 5 rarities)
- [x] Album opening animation with a 5-card reveal
- [x] Binder collection view with completion %
- [ ] Daily free pack, saved in localStorage (the build gives 300 daily stars instead, enough for 3 albums)

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
- `components/Game.jsx` is the page: stats bar, hero card, albums and binder.
- `components/OpeningStage.jsx` handles ripping the shrink-wrap and flipping the five cards.
- `components/InspectModal.jsx` is the large card view, with a foil picker and a "try your own photo" preview.
- `lib/cards.js` is the card catalog and the foil each rarity gets.
- `lib/gacha.js` holds pull rates, pity and duplicate refunds.
- `lib/art.js` draws the placeholder card art on canvas. Replace `getArt()` to use real artwork.
- `lib/useGame.js` saves progress to localStorage.

## Notes

- Each live HoloCard uses one WebGL context, and browsers allow about 16. The binder shows plain thumbnails for that reason.
- React strict mode is off because HoloCard releases its WebGL context on unmount (see `next.config.mjs`).
