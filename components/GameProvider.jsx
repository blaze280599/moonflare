'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import InspectModal from '@/components/InspectModal';
import { ERAS } from '@/lib/cards';
import { loadArtFonts } from '@/lib/art';
import { useGame } from '@/lib/useGame';

const GameContext = createContext(null);

// Shared by every page, so the save, the card dialog and the chosen binder album survive navigation.
// Mounted once in app/layout.js.
export function GameProvider({ children }) {
  const game = useGame();
  const [artReady, setArtReady] = useState(false);
  const [inspecting, setInspecting] = useState(null);
  const [binderEra, setBinderEra] = useState(() => ERAS.find(e => e.group.code === 'LS'));

  // Card art is drawn on canvas, so wait for the fonts it uses.
  useEffect(() => {
    loadArtFonts().then(() => setArtReady(true));
  }, []);

  const value = { ...game, artReady, inspecting, inspect: setInspecting, binderEra, setBinderEra };

  return (
    <GameContext.Provider value={value}>
      {children}
      {inspecting && (
        <InspectModal
          key={inspecting.id}
          card={inspecting}
          owned={game.state.owned[inspecting.id] || 0}
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
