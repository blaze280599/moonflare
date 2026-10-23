# Moonflare Photocard Club

A K-pop photocard pack-opening game built with Next.js and the React Bits
[HoloCard](https://reactbits.dev/components/holo-card) component.

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
