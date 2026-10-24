// Preset banner looks, keyed by the ids in BANNERS (lib/profile.js). Whole class names so Tailwind finds them,
// built from theme tokens only.
export const BANNER_CLASS = {
  moonrise: 'bg-linear-to-br from-primary/70 via-rarity-epic/50 to-background',
  aurora: 'bg-linear-to-r from-rarity-rare/60 via-rarity-epic/40 to-rarity-mythic/60',
  gold: 'bg-linear-to-br from-rarity-legendary/70 via-star/30 to-background',
  lightstick: 'bg-card bg-[radial-gradient(var(--primary)_1.5px,transparent_1.5px)] bg-size-[18px_18px]',
  midnight: 'bg-linear-to-b from-muted to-background'
};
