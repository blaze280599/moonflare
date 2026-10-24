'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AVATAR_SIZE, MAX_AVATAR_BYTES } from '@/lib/profile';
import { removeAvatar, uploadAvatar } from '@/app/actions/profile';
import PlayerAvatar from '@/components/PlayerAvatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

// The crop frame's size in CSS pixels. The exported picture is AVATAR_SIZE square.
const FRAME = 240;
const MAX_ZOOM = 4;

// Change or remove the profile picture. The photo is cropped square and downscaled here in the browser (WebP,
// or JPEG where the browser can't encode WebP), so only a small file is uploaded; uploadAvatar checks it again.
export default function AvatarDialog({ profile, onSaved, children }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {open && (
          <AvatarForm
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

function AvatarForm({ profile, onSaved }) {
  const router = useRouter();
  const input = useRef(null);
  const [image, setImage] = useState(null); // { img, url, w, h }
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef(null);

  useEffect(() => () => image && URL.revokeObjectURL(image.url), [image]);

  // Scale that makes the photo just cover the frame, times the zoom.
  const scale = image ? Math.max(FRAME / image.w, FRAME / image.h) * zoom : 1;
  // Keeps the photo covering the frame: it can't be dragged past its own edges.
  const clamp = (o, s = scale) => {
    if (!image) return o;
    const mx = Math.max(0, (image.w * s - FRAME) / 2);
    const my = Math.max(0, (image.h * s - FRAME) / 2);
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
  };

  const onFile = e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('That file isn’t an image. Try a JPG or PNG.');
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage({ img, url, w: img.naturalWidth, h: img.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error('That file could not be read as an image. Try a JPG or PNG.');
    };
    img.src = url;
  };

  const onZoom = ([z]) => {
    const s = Math.max(FRAME / image.w, FRAME / image.h) * z;
    setZoom(z);
    setOffset(o => clamp(o, s));
  };

  const onPointerDown = e => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, start: offset };
  };
  const onPointerMove = e => {
    if (!drag.current) return;
    const { x, y, start } = drag.current;
    setOffset(clamp({ x: start.x + e.clientX - x, y: start.y + e.clientY - y }));
  };
  const onKeyDown = e => {
    const step = e.shiftKey ? 40 : 10;
    const d = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (!d) return;
    e.preventDefault();
    setOffset(o => clamp({ x: o.x + d[0], y: o.y + d[1] }));
  };

  // Draws the framed part of the photo onto an AVATAR_SIZE canvas and encodes it.
  const exportBlob = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    const side = FRAME / scale;
    const sx = image.w / 2 - (FRAME / 2 + offset.x) / scale;
    const sy = image.h / 2 - (FRAME / 2 + offset.y) / scale;
    ctx.drawImage(image.img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    const encode = (type, q) => new Promise(resolve => canvas.toBlob(resolve, type, q));
    let blob = await encode('image/webp', 0.85);
    if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg', 0.88);
    return blob;
  };

  const finish = (res, done) => {
    setBusy(false);
    if (res.error) return toast.error('Couldn’t update your picture', { description: res.error });
    toast.success(done);
    onSaved(res.profile);
    // The header's account button shows the picture too; it's rendered by the server layout.
    router.refresh();
  };

  const onSave = async () => {
    setBusy(true);
    const blob = await exportBlob();
    if (!blob || blob.size > MAX_AVATAR_BYTES) {
      setBusy(false);
      return toast.error('Couldn’t shrink that picture enough. Try another one.');
    }
    const form = new FormData();
    form.append('avatar', blob, blob.type === 'image/webp' ? 'avatar.webp' : 'avatar.jpg');
    finish(await uploadAvatar(form).catch(() => ({ error: 'Couldn’t reach the server. Try again.' })), 'Picture updated');
  };

  const onRemove = async () => {
    setBusy(true);
    finish(await removeAvatar().catch(() => ({ error: 'Couldn’t reach the server. Try again.' })), 'Picture removed');
  };

  return (
    <div className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Profile picture</DialogTitle>
        <DialogDescription>Pick a photo, then drag it and zoom to frame it. It’s saved as a small square.</DialogDescription>
      </DialogHeader>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {image ? (
        <div className="grid justify-items-center gap-4">
          <div
            role="img"
            tabIndex={0}
            aria-label="Crop frame. Drag the photo, or use the arrow keys to move it."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={onKeyDown}
            className="relative cursor-grab touch-none overflow-hidden rounded-full bg-muted ring-2 ring-border select-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
            style={{ width: FRAME, height: FRAME }}
          >
            <img
              alt=""
              src={image.url}
              draggable={false}
              className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
              style={{
                width: image.w * scale,
                height: image.h * scale,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`
              }}
            />
          </div>
          <div className="grid w-full max-w-60 gap-2">
            <Label htmlFor="avatar-zoom">Zoom</Label>
            <Slider id="avatar-zoom" min={1} max={MAX_ZOOM} step={0.05} value={[zoom]} onValueChange={onZoom} aria-label="Zoom" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <PlayerAvatar username={profile.username} src={profile.avatarUrl} className="size-20" fallbackClassName="text-2xl" />
          <p className="text-sm text-muted-foreground">
            {profile.avatarUrl ? 'This is your picture now.' : 'No picture yet, so your initials show instead.'}
          </p>
        </div>
      )}
      <DialogFooter className="gap-2 sm:justify-between">
        {profile.avatarUrl && !image ? (
          <Button variant="ghost" onClick={onRemove} disabled={busy}>
            <Trash2 />
            Remove picture
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => input.current?.click()} disabled={busy}>
            <ImageUp />
            {image ? 'Pick another' : 'Choose a photo'}
          </Button>
          {image && (
            <Button onClick={onSave} disabled={busy}>
              {busy ? 'Saving…' : 'Save picture'}
            </Button>
          )}
        </div>
      </DialogFooter>
    </div>
  );
}
