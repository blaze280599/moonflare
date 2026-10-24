'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import InspectModal from '@/components/InspectModal';
import LocalSaveImport from '@/components/LocalSaveImport';
import OpeningStage from '@/components/OpeningStage';
import { ERAS } from '@/lib/cards';
import { toploaderFor } from '@/lib/deco';
import { loadArtFonts } from '@/lib/art';
import { MAX_PACKS, canBuy, packFor, packsOf } from '@/lib/shop';
import { useGame } from '@/lib/useGame';

const GameContext = createContext(null);

// Toasts for the shop's errors (lib/shop.js); anything else is text from the server.
function packError(error, pack) {
  if (error === 'not_enough_stars') toast(`You need ${pack.price} ★`, { description: 'Claim your daily reward, or open packs to earn stars from duplicates.' });
  else if (error === 'event_closed') toast('This pack isn’t on sale', { description: `The ${pack.era?.name ?? ''} event isn’t on right now.` });
  else if (error === 'too_many_packs') toast(`You can hold ${MAX_PACKS} of one pack`, { description: 'Open some first.' });
  else if (error === 'no_pack') toast('You don’t have that pack', { description: 'Buy one in the shop.' });
  else toast.error('Something went wrong', { description: error });
}

// Shared by every page, so the save, the card dialog, the opening stage and the chosen binder album survive
// navigation. Mounted once in app/(game)/layout.js, which reads the save on the server and passes it in as `initial`.
export function GameProvider({ initial, player, children }) {
  const game = useGame(initial);
  const router = useRouter();
  const [artReady, setArtReady] = useState(false);
  const [inspecting, setInspecting] = useState(null);
  const [binderEra, setBinderEra] = useState(() => ERAS.find(e => e.group.code === 'LS'));
  const [stage, setStage] = useState(null); // { id, pack, era, pulls }
  const [opening, setOpening] = useState(null); // the pack kind being rolled on the server
  const openingRef = useRef(null);

  useEffect(() => {
    if (!initial) toast.error('Couldn’t load your save', { description: 'Reload the page to try again.', duration: Infinity });
  }, [initial]);

  // Card art is drawn on canvas, so wait for the fonts it uses.
  useEffect(() => {
    loadArtFonts().then(() => setArtReady(true));
  }, []);

  // Buys a pack into the inventory. Resolves to true if it worked.
  const buyPack = async kind => {
    const pack = packFor(kind);
    const { error } = await game.buyPack(kind);
    if (error) packError(error, pack);
    else toast.success(`${pack.name} added`, { description: 'Open it from your packs whenever you like.' });
    return !error;
  };

  // Opens a pack from the inventory (or buys and opens one, with `buy`) and shows the stage.
  const openPack = async (kind, { buy = false } = {}) => {
    if (openingRef.current) return;
    const pack = packFor(kind);
    openingRef.current = kind;
    setOpening(kind);
    const res = await game.openPack(kind, { buy });
    openingRef.current = null;
    setOpening(null);
    if (res.error) packError(res.error, pack);
    else setStage({ id: Date.now(), pack, era: res.era, pulls: res.pulls });
  };

  useEffect(() => {
    document.body.style.overflow = stage ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [stage]);

  // Escape closes the stage, unless a card dialog is open on top of it. The listener runs in the
  // capture phase on window, before Radix's own Escape handler closes the dialog and clears `inspecting`.
  const inspectingRef = useRef(null);
  inspectingRef.current = inspecting;
  useEffect(() => {
    if (!stage) return;
    const onKey = e => {
      if (e.key === 'Escape' && !inspectingRef.current) setStage(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [stage]);

  // The spread's button: another of the same pack if there's one left, else buy one if it's still sold.
  let another = null;
  if (stage) {
    const { pack } = stage;
    const left = packsOf(game.state, pack.kind);
    if (left) another = { label: `Open another · ${left} left`, onClick: () => openPack(pack.kind) };
    else if (canBuy(pack, Date.now())) {
      another = { label: `Buy another · ${pack.price} ★`, disabled: game.state.coins < pack.price, onClick: () => openPack(pack.kind, { buy: true }) };
    }
  }

  const value = { ...game, buyPack, openPack, opening, artReady, inspecting, inspect: setInspecting, binderEra, setBinderEra };

  return (
    <GameContext.Provider value={value}>
      {children}
      {initial?.needsImport && <LocalSaveImport player={player} run={game.run} />}
      {stage && (
        <OpeningStage
          key={stage.id}
          pack={stage.pack}
          era={stage.era}
          pulls={stage.pulls}
          another={another}
          opening={Boolean(opening)}
          onInspect={setInspecting}
          onGoToBinder={era => {
            setBinderEra(era);
            setStage(null);
            router.push('/collection');
          }}
          onClose={() => setStage(null)}
        />
      )}
      {inspecting && (
        <InspectModal
          key={inspecting.id}
          card={inspecting}
          owned={game.state.owned[inspecting.id] || 0}
          toploader={toploaderFor(game.state, inspecting.id)}
          onSaveToploader={game.saveToploader}
          onClose={() => setInspecting(null)}
          onError={msg => toast.error(msg)}
        />
      )}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  return useContext(GameContext);
}
