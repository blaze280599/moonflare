'use client';

import { useState } from 'react';
import { ImageUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import HoloCard from '@/components/HoloCard/HoloCard';
import { HOLO_PRESETS, RARITY, foilFor } from '@/lib/cards';
import { getArt, getBack, photoToCard } from '@/lib/art';
import { RARITY_BADGE } from '@/lib/rarity-styles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';

// Large card view: flip to the back, try every foil preset, or preview your own photo.
export default function InspectModal({ card, owned, onClose, onError }) {
  const base = foilFor(card);
  const [foil, setFoil] = useState('default');
  const [photo, setPhoto] = useState(null);

  const foilProps =
    foil === 'default'
      ? base
      : foil === 'none'
        ? { ...base, intensity: 0, edgeSparkle: 0, glare: 0.35 }
        : { preset: foil, intensity: 0.9, edgeSparkle: 0.85, glare: 0.55, frame: 4, foilColor: foil === 'gold' ? '#ffd27a' : '#e2e6ec' };

  const onPhoto = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhoto(await photoToCard(file));
    } catch {
      onError('That file could not be read as an image. Try a JPG or PNG.');
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-w-3xl">
        <div className="grid items-center gap-8 md:grid-cols-[auto_minmax(0,1fr)]">
          <div className="flex justify-center">
            <HoloCard
              image={photo ?? getArt(card)}
              backImage={getBack(card.era)}
              alt="Photocard, tap to flip"
              tiltMax={18}
              hoverScale={1.03}
              style={{ '--hc-w': 'min(320px, 70vw)' }}
              {...foilProps}
            />
          </div>

          <div className="space-y-5">
            <DialogHeader className="gap-2 text-left">
              <span className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
                {card.num} · {card.era.name}
              </span>
              <DialogTitle className="font-heading text-4xl leading-none font-normal">
                {card.member ? card.member.name : 'MOONFLARE'}
                {card.member && <span className="ml-2 align-middle font-sans text-lg font-bold text-muted-foreground">{card.member.kr}</span>}
              </DialogTitle>
              <DialogDescription>
                {card.era.sub} · {card.label}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn('font-mono text-[10px] tracking-wider uppercase', RARITY_BADGE[card.rarity])}>
                {RARITY[card.rarity].label}
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px] tracking-wider uppercase">
                Owned ×{owned}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="foilSelect">Foil</Label>
              <Select value={foil} onValueChange={setFoil}>
                <SelectTrigger id="foilSelect" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">This card&apos;s foil ({base.intensity ? base.preset : 'none'})</SelectItem>
                  <SelectSeparator />
                  {HOLO_PRESETS.map(p => (
                    <SelectItem key={p} value={p}>
                      {p[0].toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="none">No foil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Button variant="outline" size="lg" className="relative w-full" asChild>
                <label htmlFor="photoInput">
                  <ImageUp />
                  Try it with your own photo
                  <input type="file" id="photoInput" accept="image/*" onChange={onPhoto} className="sr-only" />
                </label>
              </Button>
              <p className="text-xs text-muted-foreground">
                Your photo stays on this device and only replaces the art in this preview. Tap the card to see its back.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
