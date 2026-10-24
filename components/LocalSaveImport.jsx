'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { importLocalSave, skipLocalImport } from '@/app/actions/game';
import { sanitizeImport } from '@/lib/save';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

// Where saves lived before accounts. Read once here, then cleared after an import.
const LOCAL_SAVE_KEY = 'poca-save-v1';

// One-time offer to bring a browser's pre-account collection into the signed-in account. Rendered by
// GameProvider only while the account hasn't answered it (saves.local_import_at is null). The server
// re-cleans the save (sanitizeImport) and refuses a second import, so this preview is only for the copy.
export default function LocalSaveImport({ player, run }) {
  const [local, setLocal] = useState(null); // { raw, cards, coins }
  const [busy, setBusy] = useState(null); // 'import' | 'skip'

  useEffect(() => {
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(LOCAL_SAVE_KEY));
    } catch {
      return;
    }
    const clean = sanitizeImport(raw);
    const cards = Object.keys(clean.owned).length;
    if (cards || clean.packs) setLocal({ raw, cards, coins: clean.coins });
  }, []);

  const answer = async kind => {
    setBusy(kind);
    const res = await run(() => (kind === 'import' ? importLocalSave(local.raw) : skipLocalImport()));
    setBusy(null);
    if (res.error && res.error !== 'already_imported') {
      toast.error('Couldn’t save your answer', { description: res.error });
      return;
    }
    if (kind === 'import' && !res.error) {
      try {
        localStorage.removeItem(LOCAL_SAVE_KEY);
      } catch {}
      toast.success('Collection added', { description: `${local.cards} cards are in your account now.` });
    }
    setLocal(null);
  };

  if (!local) return null;
  const name = player?.username ? `${player.username}’s` : 'your';

  return (
    <AlertDialog open onOpenChange={open => !open && !busy && setLocal(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bring this browser’s collection?</AlertDialogTitle>
          <AlertDialogDescription>
            This browser has {local.cards} {local.cards === 1 ? 'card' : 'cards'} and {local.coins.toLocaleString()} ★ saved from before
            accounts. Add them to {name} account? You can only do this once per account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={Boolean(busy)} onClick={e => (e.preventDefault(), answer('skip'))}>
              {busy === 'skip' && <Loader2 className="animate-spin" />}
              Start fresh
            </Button>
          </AlertDialogCancel>
          <Button disabled={Boolean(busy)} onClick={() => answer('import')}>
            {busy === 'import' && <Loader2 className="animate-spin" />}
            Bring this browser’s collection
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
