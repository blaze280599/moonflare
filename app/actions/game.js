'use server';

import { getRandomValues } from 'node:crypto';
import { GROUPS } from '@/lib/cards';
import { applyToploader } from '@/lib/deco';
import { DAILY_STARS, rollPack } from '@/lib/gacha';
import { buyPack as buyOne, givePacks, packFor, pickAlbum, takePack } from '@/lib/shop';
import { dateInZone, isTimeZone, mergeImport, resetState, rowToState, sanitizeImport, stateToRow } from '@/lib/save';
import { adminConfigured, createAdminClient } from '@/lib/supabase/admin';
import { getPlayer } from '@/lib/supabase/server';

// Every change to a save happens here, on the server: the browser only ever reads its own row.
// Each action returns { state } (the new save) plus its own result, or { error } with text to show.

const NOT_SET_UP = 'Saving isn’t set up on this site yet.';
const BUSY = 'Your save changed in another tab. Try again.';
const FAILED = 'Couldn’t reach the save server. Try again.';

// Rolls use the server's crypto RNG, not Math.random.
const rng = () => getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

// Reads the player's save, lets `change` compute the next state, and writes it only if nobody else wrote in
// between (`version` still matches). On a clash it reads again and retries once.
// `change(state, row)` returns { state, ...extra } to write, or { error } to stop.
async function updateSave(playerId, change, extraColumns = {}) {
  const db = createAdminClient();
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: row, error: readError } = await db.from('saves').select('*').eq('user_id', playerId).single();
    if (readError || !row) return { error: FAILED };
    const { state, error, ...extra } = await change(rowToState(row), row);
    if (error) return { error };
    const { data: saved, error: writeError } = await db
      .from('saves')
      .update({ ...stateToRow(state), ...extraColumns, version: row.version + 1, updated_at: new Date().toISOString() })
      .eq('user_id', playerId)
      .eq('version', row.version)
      .select()
      .maybeSingle();
    if (writeError) return { error: FAILED };
    if (saved) return { ...extra, state: rowToState(saved) };
  }
  return { error: BUSY };
}

async function withPlayer(run) {
  if (!adminConfigured) return { error: NOT_SET_UP };
  const player = await getPlayer();
  if (!player) return { error: 'Your session ended. Log in again.' };
  try {
    return await run(player);
  } catch (err) {
    console.error(err);
    return { error: FAILED };
  }
}

// Buys one pack into the player's inventory. Event album packs sell only inside their window, by the server's clock.
export async function buyPack(kind) {
  const pack = packFor(kind);
  if (!pack) return { error: 'That pack doesn’t exist.' };
  return withPlayer(player => updateSave(player.id, state => buyOne(state, pack, Date.now())));
}

// Opens one pack from the inventory, or with `buy`, buys one and opens it straight away (the stage's
// "Buy another"). The server picks the album, then rolls it. An event pack bought in time opens any time.
export async function openPack(kind, { buy = false } = {}) {
  const pack = packFor(kind);
  if (!pack) return { error: 'That pack doesn’t exist.' };
  return withPlayer(player =>
    updateSave(player.id, state => {
      const bought = buy ? buyOne(state, pack, Date.now()) : { state };
      if (bought.error) return bought;
      const taken = takePack(bought.state, kind);
      if (taken.error) return taken;
      const era = pickAlbum(pack, rng);
      const result = rollPack(taken.state, era, rng);
      // Card objects link back to their era and group, so send ids and let the browser look them up.
      return { state: result.state, era: era.code, pulls: result.pulls.map(p => ({ id: p.card.id, isNew: p.isNew, refund: p.refund })) };
    })
  );
}

// Pick your bias: one member per group (a member code), or null to clear it. rollPack reads it from the save.
export async function setBias(groupCode, memberCode) {
  const group = GROUPS.find(g => g.code === groupCode);
  if (!group) return { error: 'That group doesn’t exist.' };
  if (memberCode !== null && !group.members.some(m => m.code === memberCode)) return { error: 'That member isn’t in this group.' };
  return withPlayer(player =>
    updateSave(player.id, state => {
      const bias = { ...state.bias };
      if (memberCode) bias[group.code] = memberCode;
      else delete bias[group.code];
      return { state: { ...state, bias } };
    })
  );
}

export async function claimDaily() {
  return withPlayer(async player => {
    const { data: profile } = await createAdminClient().from('profiles').select('timezone').eq('id', player.id).single();
    const today = dateInZone(new Date(), profile?.timezone);
    return updateSave(player.id, state => {
      if (state.lastDaily === today) return { error: 'already_claimed' };
      return { state: { ...givePacks(state, 'standard'), coins: state.coins + DAILY_STARS, lastDaily: today } };
    });
  });
}

// Open listings and offers are withdrawn first, so the cards in escrow come back (and are erased with the rest)
// and other players' offers on this player's listings go home.
export async function reset() {
  return withPlayer(async player => {
    const { error } = await createAdminClient().rpc('trade_release_all', { p_player: player.id });
    if (error) return { error: FAILED };
    return updateSave(player.id, state => ({ state: resetState(state) }));
  });
}

// Brings an old browser save (localStorage `moonflare-save-v1`) into the account, once.
export async function importLocalSave(raw) {
  const imported = sanitizeImport(raw);
  return withPlayer(player =>
    updateSave(
      player.id,
      (state, row) => (row.local_import_at ? { error: 'already_imported' } : { state: mergeImport(state, imported) }),
      { local_import_at: new Date().toISOString() }
    )
  );
}

// The player chose to start fresh. Marks the offer as answered so it doesn't come back.
export async function skipLocalImport() {
  return withPlayer(player =>
    updateSave(player.id, (state, row) => (row.local_import_at ? { error: 'already_imported' } : { state }), {
      local_import_at: new Date().toISOString()
    })
  );
}

// Saves one card's toploader (tint and stickers), or removes it when it's plain. lib/deco.js cleans the input
// and checks the player owns the card.
export async function saveToploader(cardId, toploader) {
  return withPlayer(player => updateSave(player.id, state => applyToploader(state, cardId, toploader)));
}

// Players from before timezones were stored have none. Their browser fills it in once; after that it's fixed,
// so nobody can hop zones to claim the daily reward twice.
export async function setTimeZone(tz) {
  if (!isTimeZone(tz)) return { error: 'Unknown time zone.' };
  return withPlayer(async player => {
    const { error } = await createAdminClient().from('profiles').update({ timezone: tz }).eq('id', player.id).is('timezone', null);
    return error ? { error: FAILED } : { ok: true };
  });
}
