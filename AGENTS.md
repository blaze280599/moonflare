# AGENTS.md

Instructions for AI agents working on Moonflare Photocard Club.

**This project is built and maintained entirely by AI agents. No human reviews code, tests changes, or catches mistakes before they ship.** You are the developer, the reviewer and the QA. Treat every change as going straight to production, and verify it yourself before you call it done.

Read `README.md` first. Its **Direction** section is the product spec: the core loop, rarity tiers, planned features and the MVP checklist. This file covers how to work on the code.

## Ground rules

1. **Verify everything you change.** Run the build, open the app in a browser, and click through what you touched (see [Verifying a change](#verifying-a-change)). "It should work" is not done.
3. **Keep the game fair and honest.** Pull rates shown in the UI must match the code in `lib/gacha.js`. The odds table in `components/PackInfo.jsx` and the rarity tiles in `components/Landing.jsx` are built from `RATES`, so don't hard-code numbers there. If you change rates, pity or refunds, update the README and `tests/gacha.test.js` in the same commit.
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
- **three.js** (pinned) for the 3D booster pack in `lib/pack3d.js` only. It is imported dynamically from `OpeningStage`, so it stays out of every page bundle until a pack opens.
- **Real-group photos** are hotlinked from the K-pop Fandom wiki's CDN (see README, "Real groups"). The site is private, for two people; don't deploy it publicly with these photos.
- **Accounts:** Supabase Auth through `@supabase/ssr` (cookie sessions). Email + password; anyone who can reach the site can sign up. See README, "Run it", for setup.
- **Persistence:** one save per account in Supabase (`public.saves`, plus `public.profiles` for username and time zone), schema in `supabase/migrations/`. The `(game)` layout reads it as the player (RLS); every write goes through a Server Action in `app/actions/game.js` using the secret key. Trading (`trade_listings`, `trade_offers`) is written only by Postgres functions that Server Actions in `app/actions/trade.js` call with the secret key.

## Project map

| Path | What it is |
|---|---|
| `app/layout.js` | Root layout: Google Fonts link, `<html class="dark">`, TooltipProvider, Toaster |
| `app/(game)/layout.js` | Layout for every game page: reads the signed-in player, GameProvider, header, footer. `force-dynamic` |
| `app/(game)/page.js` | `/`: the landing page (`components/Landing.jsx`) |
| `app/(game)/groups/[slug]/page.js` | `/groups/<slug>`: one group's albums (`components/GroupPage.jsx`). Params from `GROUPS` |
| `app/(game)/collection/page.js` | `/collection`: album progress, the binder and Reset (`components/Collection.jsx`) |
| `app/(auth)/` | `/login`, `/signup`, `/forgot-password` and `/reset-password` with their own centered layout (no game header). Forms are `components/LoginForm.jsx`, `SignupForm.jsx`, `ForgotPasswordForm.jsx` and `ResetPasswordForm.jsx` |
| `app/auth/actions.js` | Server Actions: `logIn`, `signUp` (validates the form, rejects taken usernames, sends the time zone), `signOut`, `requestPasswordReset`, `updatePassword` |
| `app/auth/confirm/route.js` | Where the confirmation and password reset emails' links land; starts the session, then goes to `next` |
| `middleware.js` | Refreshes the Supabase session and redirects signed-out visitors to `/login?next=…` (`lib/supabase/middleware.js`) |
| `lib/supabase/` | `config.js` (env vars), `server.js` (`createClient`, `getPlayer`, `getGame`), `admin.js` (secret-key client, server-only), `middleware.js`, `safe-next.js` |
| `app/actions/game.js` | Server Actions that change a save: `openPack`, `setBias`, `claimDaily`, `reset`, `saveToploader`, `importLocalSave`, `skipLocalImport`, `setTimeZone` |
| `app/actions/trade.js` | Trade Server Actions: `createListing`, `cancelListing`, `makeOffer`, `withdrawOffer`, `acceptOffer`, `declineOffer`, `loadBoard`. Each returns `{ state, board }` |
| `app/(game)/trade/page.js` | `/trade`: the trade board (`components/TradeBoard.jsx`), read on the server by `lib/supabase/trades.js` |
| `components/TradeBoard.jsx` | Trade tabs: board, your listings and their offers, your offers, history. `ListCardDialog.jsx` and `MakeOfferDialog.jsx` are its dialogs |
| `components/TradeCardThumb.jsx` | A card on the trade board: art if you may see it, the album's card back if not |
| `lib/trade.js` | Pure trade rules: criteria (`sanitizeWant`), matching, `checkOffer`, `inBinder` (the "Not in your binder" badge), limits |
| `supabase/migrations/` | Database schema: `profiles`, `saves`, RLS, the new-user trigger. Apply new migrations through the Supabase MCP server or CLI, and commit the SQL |
| `.env.example` | The env vars `.env.local` needs |
| `app/globals.css` | Tailwind import, theme tokens (colors, fonts, rarity colors), opening-stage CSS |
| `components/GameProvider.jsx` | Context shared by every page: `useGame(initial)`, `artReady`, the card dialog (`inspect`) and the binder's chosen album |
| `components/LocalSaveImport.jsx` | One-time dialog offering to bring a browser's pre-account localStorage save into the account |
| `components/SiteHeader.jsx` | Sticky nav bar: shadcn NavigationMenu with a Groups dropdown, stars + daily button (ButtonGroup); a Sheet menu below `md` |
| `components/SiteFooter.jsx` | Disclaimer and footer links |
| `components/Landing.jsx` | Landing page: hero HoloCard, how it works, groups, rarity tiers |
| `components/GroupPage.jsx` | A group's album grid, pity/odds sidebar, and the opening stage; owns the Escape handling |
| `components/PackInfo.jsx` | Pity progress, the pull-rate table built from `RATES`, and per-member odds from `memberRates()` |
| `components/BiasPicker.jsx` | Pick your bias for one group (shadcn Select), saved through `setBias` |
| `components/Collection.jsx` | Per-album progress tiles, the Binder and Reset collection |
| `components/OpeningStage.jsx` | Full-screen album opening: tear the 3D pack, cards slide out into a stack, flip and swipe each one, then a spread of all five |
| `lib/pack3d.js` | The 3D booster pack (three.js): mesh, foil materials, click-and-drag cutting along the line, grab to turn it (it barely moves), springs, the flying strip and glitter |
| `components/InspectModal.jsx` | Card detail dialog: foil picker, flip, try-your-own-photo |
| `components/Binder.jsx` | Collection grid with an era picker; decorated cards show in their toploader |
| `components/Toploader.jsx` | A card in a toploader with its stickers (plain DOM, no WebGL) |
| `components/ToploaderEditor.jsx` | Decorate mode inside the card dialog: add, drag, resize/turn (round handle), tint, save |
| `components/HoloCard/` | React Bits HoloCard with local changes (see below) |
| `components/ui/` | shadcn components. Add new ones with the CLI rather than hand-writing them |
| `lib/cards.js` | Card catalog (groups, members, eras, variants), rarity table, `foilFor()` |
| `lib/photos/` | Generated photo URL lists for real groups. Don't edit by hand |
| `scripts/fetch-lesserafim.mjs` | Rebuilds `lib/photos/lesserafim.js` from the K-pop Fandom wiki API (`npm run photos:lesserafim`) |
| `lib/stickers.js` | Built-in sticker set (SVG in code, as data URLs) and toploader tints |
| `lib/deco.js` | Toploader rules: `sanitizeToploader`, `applyToploader` (owned cards only, caps, clamps), `toploaderFor` |
| `lib/gacha.js` | Pack rolling, pull rates, pity, refunds, constants |
| `lib/events.js` | Comeback-event helpers: `eventPhase`, `canOpenEra`, `msUntilChange`, `formatCountdown` |
| `lib/useNow.js` | `useNow(ms)`: a ticking clock for countdowns |
| `components/EventBanner.jsx` | Live and upcoming event banner (landing and group pages) and the `EventCountdown` badge |
| `lib/useGame.js` | Client game state: starts from the server's save, calls the Server Actions, adopts the state they return |
| `lib/save.js` | Pure save helpers: row ↔ state, `dateInZone`, `isTimeZone`, `sanitizeImport`, `mergeImport`, `resetState` |
| `tests/` | Unit tests for game logic (`npm test`) |
| `lib/art.js` | MOONFLARE card art drawn on canvas, real-group photo URLs, album covers, card backs, booster pack wrappers (`getPackArt`, `PACK`), photo cropping |
| `lib/celebrate.js` | Flash and confetti for Legendary and Mythic pulls, and `sparkle()` stars over a revealed Rare-or-better card |
| `lib/sound.js` | Sounds made with the Web Audio API: the rip (scaled by cut speed), the tear, reveal chimes |
| `lib/usePref.js` | `usePref(key, default)`: a per-browser setting in localStorage, read in an effect (the stage's sound switch) |
| `lib/rarity-styles.js` | Tailwind class maps per rarity |
| `prototype/` | The original single-file HTML prototype. Reference only; don't develop it further |

## Conventions

- **Match the surrounding code:** 2-space indent, single quotes in app code (shadcn files use double quotes; leave them as generated), and comments only where the reason isn't obvious.
- **Styling:** use Tailwind utilities and shadcn components. Use theme tokens (`bg-primary`, `text-muted-foreground`, `bg-rarity-epic`) and never hard-code colors in components. The only exceptions are the opening stage and card art, which are always dark.
- **Use a shadcn component for every piece of app UI.** Don't hand-roll a bordered div, pill or link row when a component fits: `Card` for tiles, `Item` for list rows with media, `Badge` for chips and labels, `Skeleton` for loading placeholders, `Breadcrumb` at the top of inner pages, `Button` (including `variant="link"` / `"ghost"` with `asChild` around a Next `Link`) for links that should look like controls. Hand-written markup is only for card art, the binder's card sleeves and the opening stage's pack, card stack and flip visuals.
- **Tailwind class names must appear whole in the source.** Don't build them from strings (`'bg-rarity-' + r`). Add them to a map like `lib/rarity-styles.js` instead.
- **New shadcn components:** `npx shadcn@latest add <name>`. Check `components.json` and don't change the preset or the `cn` import.
- **Copy:** plain, specific UI text from the player's side ("Open · 100 ★", "Erase collection"). K-pop terms like PC, POB, bias and lucky draw are fine; that's the audience's language.
- **Dependencies:** pin exact versions, prefer what's already installed, and check `npm warn` output for security advisories. Next.js had a CVE in 15.3.x, which is why it's on 15.5.x. `npm audit` still flags the `postcss` copy bundled inside Next 15 (only fixed in Next 16, a major upgrade). It runs at build time on our own CSS, never on player input, so it's accepted for now; don't `npm audit fix --force` it.

## Gotchas

These have all bitten us before. Read them before touching the related code.

- **WebGL context limit.** Each mounted `HoloCard` holds one WebGL2 context, and browsers allow about 16 before dropping the oldest. Only mount HoloCards where foil matters: the hero card, the card dialog, and on the opening stage the top card of the stack (plus one still flying away) and the 5 cards in the final spread. Cards lower in the stack are plain `<img>` backs. The 3D pack holds one more context and `PackScene.dispose()` releases it (`forceContextLoss`) once the cards are out. The binder uses plain `<img>` thumbnails on purpose. Never render a HoloCard per binder slot.
- **React strict mode is off** (`next.config.mjs`). HoloCard calls `loseContext()` on unmount, and strict mode's double mount in dev would leave the canvas blank. Don't turn it back on unless HoloCard changes.
- **HoloCard has local changes**, each marked with a comment: a controlled `flipped` prop, an `onClick` prop, starting face-down without animating, and `loseContext()` on unmount. If you update it from React Bits, re-apply all four.
- **HoloCard's `width` prop sets `--hc-w` inline**, which beats CSS. Set responsive widths by passing `style={{ '--hc-w': 'clamp(...)' }}`.
- **Card art needs fonts and the browser.** `lib/art.js` draws on canvas using Google Fonts by family name, so fonts are loaded with a plain `<link>` in `layout.js`, not `next/font` (which renames families). Only call `getArt` / `getBack` / `getCover` after `loadArtFonts()` resolves on the client; `GameProvider` exposes `artReady`, and every page gates card art on it. Calling them during server render will crash.
- **Game state lives in a ref too.** `useGame` keeps `stateRef` in sync through `commit()`. Always change state through `commit()`, never a bare `setState`. Server Actions run one at a time through `run()` (a promise queue), so a double-tapped "Open another" can't apply two answers out of order.
- **Rolls happen only in Server Actions.** Never roll, add stars or edit `owned` in the browser; the client just adopts the `state` an action returns. Each action checks the player with `getPlayer()` and writes with `update … where version = <read version>`, retrying once (`updateSave` in `app/actions/game.js`). Add new save changes the same way.
- **The secret key stays on the server.** `lib/supabase/admin.js` imports `server-only` and bypasses RLS. Only import it from Server Actions or other server code that has already checked who's asking, and never name the env var `NEXT_PUBLIC_…`. Clients get `select` on their own rows and no write grants; keep it that way when adding tables (this project doesn't expose new tables automatically, so grant explicitly), and run the Supabase security advisors after any schema change.
- **Daily reward uses the profile's time zone** (`profiles.timezone`, an IANA name set at sign-up from a hidden field). It's set once: older accounts have none until their browser fills it in through `setTimeZone`, which only writes when it's empty, so nobody can hop zones for a second reward. Reset keeps `last_daily` for the same reason.
- **The daily button re-checks the date** every minute and on tab focus (`useGame`), so it unlocks after midnight without a reload. The server decides; the button is only a hint.
- **Hydration:** the save arrives from the server with the page, so `loaded` is true on first render unless it couldn't be read. Don't read localStorage during render (only `LocalSaveImport` reads it, in an effect).
- **Tailwind source scanning:** `globals.css` uses `@import "tailwindcss" source("..")`. Without it, Tailwind scans the dev server's working folder, which may not be the project, and most utilities disappear.
- **Stale CSS after config changes:** if styles look wrong after changing PostCSS or Tailwind config, stop the dev server, delete `.next/` and restart.
- **Don't build while the dev server runs.** Both use `.next/`, and `npm run build` then fails with `Invariant: no direct app page entry found for /_not-found`. Stop the dev server, delete `.next/`, and build again.
- **The pack and the cards are two layers.** The pack is a transparent WebGL canvas *above* the DOM card stack, and its world units are CSS pixels centered on the stage area. That's how the cards appear to slide out of the opening: they rise from behind the opaque pack body. After the cards are out, the empty wrapper falls away in free flight; the canvas stays mounted (with `pointer-events-none`, so the stack is already playable) until `PackScene` calls `onGone` once the wrapper is below the bottom edge, and only then is the scene disposed. Don't dispose it when the emerge animation ends, or the wrapper vanishes mid-fall. `measure()` in `OpeningStage.jsx` and the mesh both work from `PACK` in `lib/art.js` (width, seals, tear line), so change those numbers in one place only, and recheck the emerge by pausing it mid-way.
- **Fast Refresh and the pack.** Editing `lib/pack3d.js` triggers a full page reload, and editing `OpeningStage.jsx` re-runs its effects, which disposes the scene and leaves a blank canvas. Reopen the pack after either; it isn't a bug in the game.
- **The in-app browser pane throttles animation when hidden.** requestAnimationFrame barely runs while the preview pane is hidden, so the pack can look frozen mid-swing in screenshots. Take another screenshot (it wakes the page) before assuming it's broken.
- **Stacking order:** the opening stage is `z-40`, and shadcn dialogs and their overlays are `z-50`, so the card dialog opens on top of the stage. Keep it that way.
- **Real-group photos are hotlinked, never downloaded.** The wiki's image CDN (`static.wikia.nocookie.net`) serves real browsers with CORS, so HoloCard can use the photos as WebGL textures. It shows a Cloudflare bot check to scripts, so `fetch-lesserafim.mjs` reads only the MediaWiki API and builds URLs. Don't spoof a browser user agent to get around that check. Don't commit the images either: the repo is public. The `/smart/width/630/height/880` URL suffix is the CDN's own card-shaped crop.
- **Era and member codes are save keys.** Card ids (`FL-KZ-pob`) are keys in `saves.owned` (and in old localStorage saves), so never rename an era or member code. Add new ones instead.
- **If a photo stops loading** (the wiki renamed or deleted a file), that card shows blank. Re-run `npm run photos:lesserafim`; `tests/cards.test.js` only checks that URLs exist, not that they load.
- **One provider, many pages.** Game state lives in `GameProvider` (mounted in `app/(game)/layout.js`), so it survives client-side navigation. Read it with `useGameContext()`; never call `useGame()` in a page, or that page gets its own copy of the save and the two drift apart. The card dialog is rendered by the provider, so any page can open it with `inspect(card)`.
- **Group URLs use `slug`, not `code`.** `GROUPS[].slug` is the `/groups/<slug>` path. A new group needs a slug and a blurb; its page, nav link, footer link and landing card appear automatically. The nav lists groups in the NavigationMenu's Groups dropdown and under a Groups heading in the phone Sheet.
- **Every page is private by default.** The middleware lets signed-out visitors reach only `/login`, `/signup`, `/forgot-password` and `/auth/*` (`PUBLIC` in `lib/supabase/middleware.js`). A new page is gated automatically; add it to `PUBLIC` only on purpose. If the Supabase env vars are missing, nobody gets in (fail closed).
- **Trust `getClaims()`, not `getSession()`, on the server.** `getClaims()` verifies the session token; `getSession()` just reads the cookie, which the visitor controls. `getPlayer()` in `lib/supabase/server.js` wraps it.
- **Sign-up is open.** There's no invite code (removed on purpose): anyone who can reach the site can make an account, so keep it private (see Stack). The username and time zone go in `user_metadata`, and the `on_auth_user_created` trigger copies them into `profiles`.
- **Password reset.** `/forgot-password` is public and guest-only; it always shows the same "if that email has an account" screen, so it can't be used to find players (Supabase also answers unknown emails with a success). The emailed link goes to `/auth/confirm?next=/reset-password`, which signs the player in. `/reset-password` is deliberately *not* in `PUBLIC`: it needs that session, and the account menu's Change password uses the same page. A dead link goes back to `/forgot-password?error=link`. The `?next=` in the link only survives if the Supabase redirect allowlist matches it (`…/auth/confirm**`, see README "Run it"); otherwise Supabase quietly sends the player to the bare Site URL. Don't test by spamming reset emails: the built-in mailer sends only a few an hour.
- **Redirect targets go through `safeNext()`**, so `?next=//evil.com` can't send a player off-site. Keep using it for any redirect built from user input.
- **Old browser saves import once per account.** `saves.local_import_at` records the answer (import or start fresh). The server re-cleans the localStorage data (`sanitizeImport`: known card ids only, capped counts and stars), and the browser clears `moonflare-save-v1` only after an import, so a second account on the same browser can still claim it.
- **The bias boost picks the member, never the rarity.** `pickCard()` in `lib/gacha.js` gives the bias `BIAS_BOOST` (2) extra percentage points of each member rarity and uses one `rng()` call either way, so rarity odds, pity and refunds are unchanged and rolls without a bias are identical to before. The user's hard limit is 1–2 points; `tests/gacha.test.js` enforces it. Show odds through `memberRates()`, never hand-computed numbers. `saves.bias` is `{ groupCode: memberCode }`; Reset keeps it.
- **Comeback events are eras with a window.** An event album is an `ERAS` entry with `event: { starts, ends, blurb }` (ISO strings with an offset). The server decides: `openPack` refuses it outside the window with `event_closed`, using `Date.now()` on the server. Pages filter out `upcoming` eras with `eventPhase()` and show ended ones as closed; never drop an ended event's era, its card ids are save keys. Countdown text comes from `useNow()`, which starts from the render's own clock, so the phase matches between server and client but the seconds don't: keep `suppressHydrationWarning` on the countdown text. Drawn art keys palettes on era codes in `lib/art.js` (`PM`, `NB`, `SE`); a new MOONFLARE event era falls back to the Neon Bloom background unless you add one.
- **Sound needs a gesture.** Browsers block audio until the player presses something, so the stage calls `unlockAudio()` from `onPointerDownCapture` / `onKeyDownCapture`. Every `play*` in `lib/sound.js` is silent until then and while sound is off, and no `AudioContext` is created while it's off. The rip is driven by `onRip(speed)` from `PackScene.grow()` (where the cut extends), and `lib/sound.js` throttles the grains. Sounds aren't skipped for reduced motion; the sparkle is.
- **Toploader decorations** live in `saves.deco` (card id → `{ t: tint, s: [{ id, x, y, k, r }] }`, positions as fractions of the toploader). Sticker and tint ids are save keys like era codes: never rename or remove one in `lib/stickers.js`, add new ones. The server re-cleans everything through `applyToploader`; a plain clear toploader removes the entry. Decorations on a card the player no longer owns stay stored but are hidden (`toploaderFor`), and Reset clears them (`NEW_GAME.deco`). Decorate mode replaces the dialog's HoloCard rather than adding a canvas, and the binder draws toploaders with `<img>` only.
- **Dragging stickers:** the editor uses pointer events with `setPointerCapture` and `touch-action: none` on the stage, so mouse and touch share one path. Stickers render in a fixed (uid) order and stack by z-index: reordering DOM nodes mid-drag drops pointer capture. `pointerdown` calls `preventDefault`, so the sticker is focused by hand to keep keyboard controls working after a click.
- **Trading uses escrow.** Listing or offering a card removes that copy from `saves.owned` until the listing or offer closes, so a binder can be one copy short while a card is up for trade. Never move cards between saves in JS: every trade change is a function in `supabase/migrations/*_trading.sql`, which locks the listing row, then the saves (in `user_id` order), then offer rows, and bumps each save's `version`. Keep that lock order in new functions, or two trades can deadlock. Reset calls `trade_release_all` before erasing, so escrowed cards and other players' offers go home.
- **The trade board shows every card's art, on purpose.** Hiding unowned cards was tried and dropped: players couldn't see what they were trading for. `inBinder(owned, id)` from `lib/trade.js` only adds the "Not in your binder" badge, and only for other players' cards (escrowed copies are out of `owned`, so your own listed card would look missing). Wants stay criteria, not card ids, so a listing can be filled many ways.
- **Trade tables have no client grants.** RLS is on with no policies (the advisor's "RLS enabled, no policy" notice is expected), and `lib/supabase/trades.js` reads the board with the secret key, sending only what that player may see: other players' offers on other players' listings appear only as a count. The `trade_*` functions are executable by `service_role` only.
- **Expiry is lazy.** `trade_expire()` runs before every board read; the accept and offer functions also refuse a listing past `expires_at`. There's no cron job.
- **Decorations outlive a traded card.** Trades and escrow only touch `saves.owned`, so a toploader in `saves.deco` stays behind when its last copy leaves. The binder only draws toploaders on owned slots, so it reappears if the card comes back. Clean `deco` in the trade functions if that ever matters.
- **Escape key:** `GroupPage.jsx` listens for Escape in the capture phase on `window`, so Escape closes the card dialog without also closing the stage underneath. Keep the capture listener if you change this.

## Verifying a change

Do all of these before committing. Nobody else will.

1. `npm run build` and `npm test` pass with no errors.
2. Start the dev server and open http://localhost:3000. Check the browser console for errors.
3. Click through the flows your change touches. For anything game-related, do a full loop:
   - Open an album. Grab the pack below the line and drag it around (it should turn, barely move, and spring back). Then press on the dotted line and drag along it to cut it; stop halfway and resume from the cut's end; try **Cut it for me** with the keyboard. Confirm the strip flies off, the cards slide out face-down and the pack drops away.
   - Flip each card, swipe it away, and check the captions, NEW and duplicate-refund labels. Try **Show all** too, and check the rarest card comes last.
   - Open a revealed card in the dialog, switch foils, flip it, then press Escape. The dialog should close and the stage should stay open.
   - Close the stage, or use **Go to binder**, which should land on `/collection` showing that album. Check the binder updated and open a binder card.
   - Click every nav link (desktop and the phone-width menu) and check the active link is highlighted.
   - Reload the page and confirm stars, cards and pity persist. Check the `saves` row changed too (Supabase MCP `execute_sql`, or the Table Editor).
4. Check a phone-width viewport (about 375px wide) for overflow or clipped text.
5. If you changed odds or the economy, check the numbers in the UI match `lib/gacha.js`, and that pity still forces a Legendary on the 15th dry album.

If you can't verify something (no browser available, say), state that in the commit message.

## Git

- Work on `main` unless told otherwise. Make one commit per logical change, and only commit when the build passes.
- Commit message: a short imperative summary line, then a body explaining why, for anything non-trivial.
- Never commit `node_modules/`, `.next/`, `.env*` files or secrets.
- Don't rewrite published history or force-push.

## Roadmap pointers

The README's Direction section lists planned features. Notes for the likely next ones:

- **Real card art** → return image URLs from `getArt()` in `lib/art.js`.
