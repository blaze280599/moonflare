'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CARDS, CARD_BY_ID, ERAS, GROUPS } from '@/lib/cards';
import { getArt, getCover } from '@/lib/art';
import { BANNERS, MAX_BIO, sanitizeBanner } from '@/lib/profile';
import { BANNER_CLASS } from '@/lib/profile-styles';
import { saveProfile } from '@/app/actions/profile';
import { useGameContext } from '@/components/GameProvider';
import { cardName } from '@/components/ShowcaseCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const NONE = 'none';

// Bio, favourite group and member, and the banner. The server cleans all of it again (lib/profile.js).
export default function ProfileEditDialog({ profile, onSaved, children }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        {open && (
          <EditForm
            profile={profile}
            onSaved={next => {
              onSaved(next);
              setOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({ profile, onSaved }) {
  const { state, artReady } = useGameContext();
  const [bio, setBio] = useState(profile.bio);
  const [favGroup, setFavGroup] = useState(profile.favGroup);
  const [favMember, setFavMember] = useState(profile.favMember);
  const [banner, setBanner] = useState(profile.bannerValue);
  const [saving, setSaving] = useState(false);
  const group = GROUPS.find(g => g.code === favGroup);

  // Banner choices: the presets, covers of albums the player has a card from, and the cards on show.
  const albums = ERAS.filter(e => CARDS.some(c => c.era === e && state.owned[c.id]));
  const showcase = profile.showcase.map(s => s.id).filter(id => state.owned[id]);
  const choices = [
    ...BANNERS.map(b => ({ value: `preset:${b.id}`, label: b.label, className: BANNER_CLASS[b.id] })),
    ...albums.map(e => ({ value: `album:${e.code}`, label: `${e.name} cover`, image: artReady && getCover(e) })),
    ...showcase.map(id => ({ value: `card:${id}`, label: cardName(CARD_BY_ID[id]), image: artReady && getArt(CARD_BY_ID[id]) }))
  ].filter(c => sanitizeBanner(c.value, state.owned));

  const onSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    const res = await saveProfile({ bio, favGroup, favMember, banner }).catch(() => ({ error: 'Couldn’t save your profile. Try again.' }));
    setSaving(false);
    if (res.error) return toast.error('Couldn’t save your profile', { description: res.error });
    toast.success('Profile saved');
    onSaved(res.profile);
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <DialogHeader>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>Every signed-in player can see your profile.</DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="profile-bio">Bio</FieldLabel>
          <Textarea
            id="profile-bio"
            value={bio}
            maxLength={MAX_BIO}
            onChange={e => setBio(e.target.value.replace(/\n/g, ' '))}
            placeholder="Kazuha stan · trading FEARLESS dupes"
            className="min-h-20 resize-none"
          />
          <FieldDescription className="tabular-nums">
            One line, {[...bio].length} / {MAX_BIO}
          </FieldDescription>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="profile-group">Favourite group</FieldLabel>
            <Select
              value={favGroup || NONE}
              onValueChange={v => {
                setFavGroup(v === NONE ? null : v);
                setFavMember(null);
              }}
            >
              <SelectTrigger id="profile-group" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No favourite</SelectItem>
                <SelectSeparator />
                {GROUPS.map(g => (
                  <SelectItem key={g.code} value={g.code}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field data-disabled={!group || undefined}>
            <FieldLabel htmlFor="profile-member">Favourite member</FieldLabel>
            <Select value={favMember || NONE} onValueChange={v => setFavMember(v === NONE ? null : v)} disabled={!group}>
              <SelectTrigger id="profile-member" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No favourite</SelectItem>
                {group && <SelectSeparator />}
                {group?.members.map(m => (
                  <SelectItem key={m.code} value={m.code}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <FieldSet>
          <FieldLegend variant="label">Banner</FieldLegend>
          <FieldDescription>A preset, a cover from an album you collect, or a card from your showcase.</FieldDescription>
          <div role="radiogroup" aria-label="Banner" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {choices.map(c => {
              const on = banner === c.value;
              return (
                <Button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={c.label}
                  variant="outline"
                  onClick={() => setBanner(c.value)}
                  className={cn('relative h-16 overflow-hidden p-0', on && 'ring-2 ring-primary')}
                >
                  <span className={cn('absolute inset-0', c.className || 'bg-muted')} />
                  {c.image && <img alt="" src={c.image} className="absolute inset-0 size-full object-cover object-[50%_30%]" />}
                  <span className="relative mt-auto w-full truncate bg-background/75 px-2 py-0.5 text-left text-xs">{c.label}</span>
                  {on && <Check className="absolute top-1 right-1 rounded-full bg-primary p-0.5 text-primary-foreground" />}
                </Button>
              );
            })}
          </div>
        </FieldSet>
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </DialogFooter>
    </form>
  );
}
