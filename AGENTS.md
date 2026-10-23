# AGENTS.md

Instructions for AI agents working on Moonflare Photocard Club.

**This project is built and maintained entirely by AI agents. No human reviews code, tests changes, or catches mistakes before they ship.** You are the developer, the reviewer and the QA. Treat every change as going straight to production, and verify it yourself before you call it done.

Read `README.md` first. Its **Direction** section is the product spec: the core loop, rarity tiers, planned features and the MVP checklist. This file covers how to work on the code.

## Ground rules

1. **Verify everything you change.** Run the build, open the app in a browser, and click through what you touched (see [Verifying a change](#verifying-a-change)). "It should work" is not done.
2. **Never put real people on cards.** All idols, groups, agencies and stores are fictional. Don't use real K-pop idols' names, photos, likenesses, logos or song titles, and don't add tools that fetch them. The "try your own photo" preview stays local to the user's device and is never uploaded or saved.
3. **Keep the game fair and honest.** Pull rates shown in the UI must match the code in `lib/gacha.js`. The odds table in `components/Game.jsx` is built from `RATES`, so don't hard-code numbers there. If you change rates, pity or refunds, update the README and `tests/gacha.test.js` in the same commit.
4. **Stay inside the spec.** Build features from the README's Direction section. If you add or drop a planned feature, update the README so the next agent sees the current plan. When the README and the code disagree, fix whichever is wrong in the same change.
5. **Small, focused commits.** One logical change per commit, with a message that says what changed and why. Never commit a broken build.
6. **Leave a trail.** Future agents only know what's in the repo. Record decisions, gotchas and anything non-obvious in this file, the README or code comments, not just in your session.

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server on http://localhost:3000
npm run build      # production build; must pass before every commit
npm start          # serve the production build
npm test           # unit tests (Node's built-in runner, tests/*.test.js)
```

There is no linter script. `npm run build` type-checks and lints, and `npm test` covers `lib/gacha.js` (rates, pity, refunds, and an economy check that an all-duplicate album refunds well under its cost). Both must pass before every commit. Add tests when you add logic that can break silently. Tests use `node:test` with no extra dependencies, so `package.json` has `"type": "module"`, and any `lib/` file a test imports must use explicit `.js` extensions in its relative imports (Node won't resolve `./cards`).

On Windows, Node is installed at `C:\Program Files\nodejs`. If `node` isn't found, add that folder to `PATH` for the shell.

## Stack

- **Next.js 15 (App Router), React 19, plain JavaScript** (`.js`/`.jsx`, no TypeScript). Keep it JavaScript unless the README says otherwise.
- **Tailwind CSS v4** and **shadcn/ui** (Radix, "nova" preset) for all app chrome. Icons come from `lucide-react`. Toasts use `sonner`.
- **HoloCard** (React Bits, WebGL2) for every card that shows foil.
- **Persistence:** `localStorage` only, through `lib/useGame.js`. Accounts and trading (Supabase) are planned but not built.

## Project map

| Path | What it is |
|---|---|
| `app/layout.js` | Root layout: Google Fonts link, `<html class="dark">`, TooltipProvider, Toaster |
| `app/globals.css` | Tailwind import, theme tokens (colors, fonts, rarity colors), opening-stage CSS |
| `components/Game.jsx` | The page: header, hero, albums, odds, binder, footer; owns stage and dialog state |
| `components/OpeningStage.jsx` | Full-screen album opening: rip the shrink-wrap, flip 5 cards |
| `components/InspectModal.jsx` | Card detail dialog: foil picker, flip, try-your-own-photo |
| `components/Binder.jsx` | Collection grid with era tabs |
| `components/HoloCard/` | React Bits HoloCard with local changes (see below) |
| `components/ui/` | shadcn components. Add new ones with the CLI rather than hand-writing them |
| `lib/cards.js` | Card catalog (members, eras, variants), rarity table, `foilFor()` |
| `lib/gacha.js` | Pack rolling, pull rates, pity, refunds, constants |
| `lib/useGame.js` | Game state hook and localStorage save |
| `tests/` | Unit tests for game logic (`npm test`) |
| `lib/art.js` | Placeholder card art drawn on canvas; also album covers, card backs, photo cropping |
| `lib/celebrate.js` | Flash and confetti for Legendary and Mythic pulls |
| `lib/rarity-styles.js` | Tailwind class maps per rarity |
| `prototype/` | The original single-file HTML prototype. Reference only; don't develop it further |

## Conventions

- **Match the surrounding code:** 2-space indent, single quotes in app code (shadcn files use double quotes; leave them as generated), and comments only where the reason isn't obvious.
- **Styling:** use Tailwind utilities and shadcn components. Use theme tokens (`bg-primary`, `text-muted-foreground`, `bg-rarity-epic`) and never hard-code colors in components. The only exceptions are the opening stage and card art, which are always dark.
- **Tailwind class names must appear whole in the source.** Don't build them from strings (`'bg-rarity-' + r`). Add them to a map like `lib/rarity-styles.js` instead.
- **New shadcn components:** `npx shadcn@latest add <name>`. Check `components.json` and don't change the preset or the `cn` import.
- **Copy:** plain, specific UI text from the player's side ("Open · 100 ★", "Erase collection"). K-pop terms like PC, POB, bias and lucky draw are fine; that's the audience's language.
- **Dependencies:** pin exact versions, prefer what's already installed, and check `npm warn` output for security advisories. Next.js had a CVE in 15.3.x, which is why it's on 15.5.x.

## Gotchas

These have all bitten us before. Read them before touching the related code.

- **WebGL context limit.** Each mounted `HoloCard` holds one WebGL2 context, and browsers allow about 16 before dropping the oldest. Only mount HoloCards where foil matters: the hero card, the 5 cards on the opening stage and the card dialog. The binder uses plain `<img>` thumbnails on purpose. Never render a HoloCard per binder slot.
- **React strict mode is off** (`next.config.mjs`). HoloCard calls `loseContext()` on unmount, and strict mode's double mount in dev would leave the canvas blank. Don't turn it back on unless HoloCard changes.
- **HoloCard has local changes**, each marked with a comment: a controlled `flipped` prop, an `onClick` prop, starting face-down without animating, and `loseContext()` on unmount. If you update it from React Bits, re-apply all four.
- **HoloCard's `width` prop sets `--hc-w` inline**, which beats CSS. Set responsive widths by passing `style={{ '--hc-w': 'clamp(...)' }}`.
- **Card art needs fonts and the browser.** `lib/art.js` draws on canvas using Google Fonts by family name, so fonts are loaded with a plain `<link>` in `layout.js`, not `next/font` (which renames families). Only call `getArt` / `getBack` / `getCover` after `loadArtFonts()` resolves on the client; `Game.jsx` gates rendering on `artReady`. Calling them during server render will crash.
- **Game state lives in a ref too.** `useGame` keeps `stateRef` in sync through `commit()`, so two actions in the same tick (a double-tapped "Open another") each build on the latest state. Always change state through `commit()`, never a bare `setState`.
- **Daily reward uses the player's local date** (`toLocaleDateString('en-CA')`), and `useGame` re-checks the date every minute and on tab focus so the button unlocks after midnight without a reload.
- **Hydration:** game state loads from localStorage after mount (`loaded` flag in `useGame`). Don't read localStorage during render.
- **Tailwind source scanning:** `globals.css` uses `@import "tailwindcss" source("..")`. Without it, Tailwind scans the dev server's working folder, which may not be the project, and most utilities disappear.
- **Stale CSS after config changes:** if styles look wrong after changing PostCSS or Tailwind config, stop the dev server, delete `.next/` and restart.
- **Stacking order:** the opening stage is `z-40`, and shadcn dialogs and their overlays are `z-50`, so the card dialog opens on top of the stage. Keep it that way.
- **Escape key:** `Game.jsx` listens for Escape in the capture phase on `window`, so Escape closes the card dialog without also closing the stage underneath. Keep the capture listener if you change this.

## Verifying a change

Do all of these before committing. Nobody else will.

1. `npm run build` and `npm test` pass with no errors.
2. Start the dev server and open http://localhost:3000. Check the browser console for errors.
3. Click through the flows your change touches. For anything game-related, do a full loop:
   - Open an album, tap the cover 3 times, and confirm the cards deal face-down with no front showing.
   - Reveal the cards one by one and with **Reveal all**, and check the captions, NEW and duplicate-refund labels.
   - Open a revealed card in the dialog, switch foils, flip it, then press Escape. The dialog should close and the stage should stay open.
   - Close the stage, check the binder updated, and open a binder card.
   - Reload the page and confirm stars, cards and pity persist.
4. Check a phone-width viewport (about 375px wide) for overflow or clipped text.
5. If you changed odds or the economy, check the numbers in the UI match `lib/gacha.js`, and that pity still forces a Legendary on the 15th dry album.

If you can't verify something (no browser available, say), state that in the commit message.

## Git

- Work on `main` unless told otherwise. Make one commit per logical change, and only commit when the build passes.
- Commit message: a short imperative summary line, then a body explaining why, for anything non-trivial.
- Never commit `node_modules/`, `.next/`, `.env*` files or secrets. Never commit real people's photos.
- Don't rewrite published history or force-push.

## Roadmap pointers

The README's Direction section lists planned features. Notes for the likely next ones:

- **Real accounts and trading** → Supabase (auth, inventories, trades), deployed on Vercel. Swap `lib/useGame.js` for a server-backed hook with the same return shape, so components don't change. Rolls must happen server-side once inventories are shared, or players can cheat.
- **Pick your bias** → a pull-rate boost in `rollPack()`, with the UI table showing the adjusted rates.
- **Real card art** → return image URLs from `getArt()` in `lib/art.js`. Art must be original or properly licensed, never photos of real idols.
- **Sound and lightstick mode** → only start audio from a user gesture, and respect `prefers-reduced-motion`.
