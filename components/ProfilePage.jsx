'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Award, Camera, Crown, Gem, Heart, Layers, Library, PackageOpen, Pencil, Repeat, Sparkles, Star, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CARD_BY_ID, ERAS, GROUPS, RARITY } from '@/lib/cards';
import { getArt, getCover } from '@/lib/art';
import { BADGES, MAX_SHOWCASE } from '@/lib/profile';
import { BANNER_CLASS } from '@/lib/profile-styles';
import { useGameContext } from '@/components/GameProvider';
import PlayerAvatar from '@/components/PlayerAvatar';
import ProfileEditDialog from '@/components/ProfileEditDialog';
import AvatarDialog from '@/components/AvatarDialog';
import ShowcaseEditor from '@/components/ShowcaseEditor';
import ShowcaseCard, { cardName } from '@/components/ShowcaseCard';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Fixed locale and zone, so the server and the browser render the same text.
const JOINED = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const BADGE_ICON = {
  'first-album': PackageOpen,
  'lucky-draw': Star,
  mythic: Gem,
  'album-done': Trophy,
  collector: Library,
  regular: Layers,
  event: Sparkles,
  trader: Repeat,
  'bias-wrecked': Heart
};

// /players/<username>: banner, picture, bio and favourites, the showcase, stats, the bias wall and badges.
// `initialProfile` is built on the server (lib/supabase/profiles.js); the owner's edits replace it with the view
// each Server Action returns.
export default function ProfilePage({ initialProfile, isOwner }) {
  const { artReady, inspect } = useGameContext();
  const [profile, setProfile] = useState(initialProfile);
  const [editingShowcase, setEditingShowcase] = useState(false);
  const group = GROUPS.find(g => g.code === profile.favGroup);
  const member = group?.members.find(m => m.code === profile.favMember);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{profile.username}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="mt-4">
        <Banner banner={profile.banner} artReady={artReady} />
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3 px-2 sm:px-6">
          <PlayerAvatar
            username={profile.username}
            src={profile.avatarUrl}
            className="-mt-12 size-24 ring-4 ring-background sm:-mt-14 sm:size-28"
            fallbackClassName="text-3xl"
          />
          <div className="min-w-0 flex-1 space-y-1 pt-2">
            <h1 className="truncate font-heading text-3xl font-semibold tracking-tight">{profile.username}</h1>
            <p className="text-sm text-muted-foreground">Collecting since {JOINED.format(new Date(profile.joined))}</p>
          </div>
          {isOwner && (
            <div className="flex flex-wrap gap-2">
              <AvatarDialog profile={profile} onSaved={setProfile}>
                <Button variant="outline">
                  <Camera />
                  Picture
                </Button>
              </AvatarDialog>
              <ProfileEditDialog profile={profile} onSaved={setProfile}>
                <Button>
                  <Pencil />
                  Edit profile
                </Button>
              </ProfileEditDialog>
            </div>
          )}
        </div>
        <div className="mt-4 space-y-3 px-2 sm:px-6">
          {profile.bio ? (
            <p className="max-w-2xl text-pretty break-words">{profile.bio}</p>
          ) : (
            isOwner && <p className="text-sm text-muted-foreground">Add a short bio or status line with Edit profile.</p>
          )}
          {group && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                <Heart className="text-primary" />
                {member ? `${member.name} · ${group.name}` : group.name}
              </Badge>
            </div>
          )}
        </div>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Showcase</CardTitle>
            <CardDescription>
              {isOwner ? `Your favourite cards, up to ${MAX_SHOWCASE}. Decorated cards show in their toploader.` : `${profile.username}’s favourite cards.`}
            </CardDescription>
            {isOwner && !editingShowcase && (
              <CardAction>
                <Button variant="outline" size="sm" onClick={() => setEditingShowcase(true)}>
                  <Pencil />
                  Edit
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {editingShowcase ? (
              <ShowcaseEditor
                initial={profile.showcase.map(s => s.id)}
                onSaved={next => {
                  setProfile(next);
                  setEditingShowcase(false);
                }}
                onCancel={() => setEditingShowcase(false)}
              />
            ) : profile.showcase.length ? (
              <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-[repeat(auto-fill,minmax(130px,1fr))]">
                {profile.showcase.map(({ id, deco }) => (
                  <ShowcaseCard key={id} card={CARD_BY_ID[id]} deco={deco} artReady={artReady} onInspect={inspect} />
                ))}
              </div>
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Award />
                  </EmptyMedia>
                  <EmptyTitle>Nothing on show yet</EmptyTitle>
                  <EmptyDescription>
                    {isOwner ? 'Press Edit to pick cards from your binder.' : `${profile.username} hasn’t picked any cards to show.`}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 self-start">
          <StatsCard stats={profile.stats} artReady={artReady} onInspect={inspect} />
          {(member || isOwner) && <BiasWall wall={profile.wall} member={member} group={group} artReady={artReady} onInspect={inspect} />}
          <BadgesCard earned={profile.badges} isOwner={isOwner} />
        </div>
      </div>
    </div>
  );
}

// The banner: a preset gradient, or one of the player's cards or album covers with a fade into the page.
function Banner({ banner, artReady }) {
  const era = banner.kind === 'album' && ERAS.find(e => e.code === banner.id);
  const card = banner.kind === 'card' && CARD_BY_ID[banner.id];
  const image = artReady && (card ? getArt(card) : era ? getCover(era) : null);
  return (
    <div className={cn('relative h-36 overflow-hidden rounded-xl border sm:h-52', banner.kind === 'preset' ? BANNER_CLASS[banner.id] : 'bg-muted')}>
      {image && <img alt="" src={image} className="absolute inset-0 size-full scale-110 object-cover object-[50%_30%] blur-[2px]" />}
      {banner.kind !== 'preset' && <div className="absolute inset-0 bg-linear-to-t from-background/80 via-background/10 to-transparent" />}
    </div>
  );
}

function StatsCard({ stats, artReady, onInspect }) {
  const rarest = stats.rarest && CARD_BY_ID[stats.rarest];
  const rows = [
    ['Cards collected', stats.cards],
    ['Copies in binder', stats.copies],
    ['Albums completed', stats.albumsDone],
    ['Mythics', stats.mythics],
    ['Albums opened', stats.packs],
    ['Trades', stats.trades]
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Collection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-heading text-2xl font-semibold tabular-nums">{value.toLocaleString('en')}</dd>
            </div>
          ))}
        </dl>
        {rarest && (
          <div className="flex items-center gap-3">
            <ShowcaseCard card={rarest} artReady={artReady} onInspect={onInspect} className="w-14 shrink-0" />
            <div className="min-w-0 text-sm">
              <p className="text-xs text-muted-foreground">Rarest pull</p>
              <p className="truncate font-medium">{cardName(rarest)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {rarest.era.name} · {RARITY[rarest.rarity].label}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// The favourite member's cards, rarest first.
function BiasWall({ wall, member, group, artReady, onInspect }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-xl">
          <Crown className="size-5 text-primary" />
          Bias wall
        </CardTitle>
        <CardDescription>
          {member ? `${member.name} · ${group.name} · ${wall.count} of ${wall.total} cards` : 'Pick a favourite member with Edit profile to fill this wall.'}
        </CardDescription>
      </CardHeader>
      {member && wall.ids.length > 0 && (
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {wall.ids.map(id => (
              <ShowcaseCard key={id} card={CARD_BY_ID[id]} artReady={artReady} onInspect={onInspect} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Earned badges. The owner also sees the ones still to earn, dimmed.
function BadgesCard({ earned, isOwner }) {
  const shown = isOwner ? BADGES : BADGES.filter(b => earned.includes(b.id));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Badges</CardTitle>
        <CardDescription>{earned.length ? `${earned.length} of ${BADGES.length} earned` : 'None earned yet.'}</CardDescription>
      </CardHeader>
      {shown.length > 0 && (
        <CardContent className="flex flex-wrap gap-2">
          {shown.map(b => {
            const Icon = BADGE_ICON[b.id] || Award;
            const has = earned.includes(b.id);
            return (
              <Tooltip key={b.id}>
                <TooltipTrigger asChild>
                  <Badge
                    variant={has ? 'secondary' : 'outline'}
                    tabIndex={0}
                    className={cn(!has && 'text-muted-foreground opacity-60')}
                    aria-label={`${b.label}: ${b.description}${has ? '' : ' Not earned yet.'}`}
                  >
                    <Icon className={cn(has && 'text-primary')} />
                    {b.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{b.description}</TooltipContent>
              </Tooltip>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
