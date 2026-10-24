'use client';

import { useRef, useState } from 'react';
import { ArrowLeft, Eraser, RotateCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Toploader, { STICKER_SIZE, stickerStyle } from '@/components/Toploader';
import { MAX_SCALE, MAX_STICKERS, MAX_TOPLOADERS, MIN_SCALE, cleanSticker } from '@/lib/deco';
import { STICKERS, STICKER_BY_ID, TINTS } from '@/lib/stickers';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const ASPECT = 63 / 88; // toploader width / height
const KEY_MOVES = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

const SAVE_ERRORS = {
  too_many: `You can decorate up to ${MAX_TOPLOADERS} toploaders. Clear one first.`,
  not_owned: 'You don’t own this card any more.',
  unknown_card: 'That card doesn’t exist.'
};

// Decorate mode: drag stickers around the toploader, pull the round handle to resize and turn one, pick a tint.
// Works with mouse, touch (the stage has touch-action: none) and keyboard (arrows, + and -, [ and ], Delete).
export default function ToploaderEditor({ card, image, initial, onSave, onBack }) {
  const [tint, setTint] = useState(initial?.t || 'clear');
  // Each sticker gets a local uid so its element (and pointer capture) survives being lifted to the top.
  const nextUid = useRef(initial?.s?.length || 0);
  const [stickers, setStickers] = useState(() => (initial?.s || []).map((s, uid) => ({ ...s, uid })));
  const [sel, setSel] = useState(null);
  const [saving, setSaving] = useState(false);
  const frame = useRef(null);
  const drag = useRef(null);
  const selected = sel === null ? null : stickers[sel];
  const who = card.member ? card.member.name : card.era.group.name;

  const update = (i, patch) => setStickers(list => list.map((s, j) => (j === i ? { ...(cleanSticker({ ...s, ...patch }) || s), uid: s.uid } : s)));
  const remove = i => {
    setStickers(list => list.filter((_, j) => j !== i));
    setSel(null);
  };

  const add = id => {
    if (stickers.length >= MAX_STICKERS) return;
    const n = stickers.length;
    // Fan new stickers out a little so they don't land exactly on top of each other.
    setStickers([...stickers, { id, x: 0.5 + ((n % 5) - 2) * 0.07, y: 0.42 + ((n % 3) - 1) * 0.08, k: 1, r: 0, uid: nextUid.current++ }]);
    setSel(n);
  };

  // Grabbing a sticker lifts it to the top of the pile. Elements stay in uid order and stack by z-index,
  // because moving a DOM node mid-drag would drop its pointer capture.
  const raise = i => {
    if (i === stickers.length - 1) return i;
    setStickers([...stickers.slice(0, i), ...stickers.slice(i + 1), stickers[i]]);
    return stickers.length - 1;
  };

  const startDrag = (e, i, mode) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    // preventDefault stops the browser focusing it, and keys should work after a click. Focus first:
    // onFocus selects the old index, and the setSel below overrides it.
    if (mode === 'move') e.currentTarget.focus({ preventScroll: true });
    const rect = frame.current.getBoundingClientRect();
    const s = stickers[i];
    const index = mode === 'move' ? raise(i) : i;
    setSel(index);
    drag.current = {
      mode,
      index,
      pointer: e.pointerId,
      rect,
      startX: e.clientX,
      startY: e.clientY,
      x: s.x,
      y: s.y,
      cx: rect.left + s.x * rect.width,
      cy: rect.top + s.y * rect.height
    };
  };

  const moveDrag = e => {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    if (d.mode === 'move') {
      update(d.index, { x: d.x + (e.clientX - d.startX) / d.rect.width, y: d.y + (e.clientY - d.startY) / d.rect.height });
    } else {
      // The handle sits on the sticker's corner, 45° from its right edge, half a diagonal from its center.
      const dx = e.clientX - d.cx;
      const dy = e.clientY - d.cy;
      const k = Math.hypot(dx, dy) / ((STICKER_SIZE * d.rect.width * Math.SQRT2) / 2);
      update(d.index, { k, r: (Math.atan2(dy, dx) * 180) / Math.PI - 45 });
    }
  };

  const endDrag = e => {
    if (drag.current?.pointer === e.pointerId) drag.current = null;
  };

  const onKey = (e, i) => {
    const s = stickers[i];
    const step = e.shiftKey ? 0.05 : 0.01;
    if (KEY_MOVES[e.key]) {
      const [mx, my] = KEY_MOVES[e.key];
      update(i, { x: s.x + mx * step, y: s.y + my * step });
    } else if (e.key === '+' || e.key === '=') update(i, { k: s.k + 0.1 });
    else if (e.key === '-') update(i, { k: s.k - 0.1 });
    else if (e.key === '[') update(i, { r: s.r - 15 });
    else if (e.key === ']') update(i, { r: s.r + 15 });
    else if (e.key === 'Delete' || e.key === 'Backspace') remove(i);
    else return;
    e.preventDefault();
  };

  const save = async () => {
    setSaving(true);
    const res = await onSave({ t: tint, s: stickers.map(({ uid, ...s }) => s) });
    setSaving(false);
    if (res.error) {
      toast.error('Couldn’t save your toploader', { description: SAVE_ERRORS[res.error] || res.error });
      return;
    }
    toast.success(stickers.length || tint !== 'clear' ? 'Toploader saved' : 'Toploader cleared');
    onBack();
  };

  // The handle's spot, as fractions of the toploader. Heights are scaled by the toploader's shape.
  const handle = selected && (() => {
    const reach = (STICKER_SIZE * selected.k * Math.SQRT2) / 2;
    const a = ((selected.r + 45) * Math.PI) / 180;
    return { left: `${(selected.x + reach * Math.cos(a)) * 100}%`, top: `${(selected.y + reach * Math.sin(a) * ASPECT) * 100}%` };
  })();

  return (
    <div className="grid items-start gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:gap-8">
      <DialogHeader className="gap-1 text-left md:col-start-2 md:row-start-1">
        <span className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
          {card.num} · {card.era.group.name} {card.era.name}
        </span>
        <DialogTitle className="font-heading text-3xl leading-none font-semibold tracking-tight">Decorate {who}&apos;s toploader</DialogTitle>
        <DialogDescription>Tap a sticker to add it. Drag to move it, and pull its round handle to resize and turn it.</DialogDescription>
      </DialogHeader>

      <div className="flex justify-center md:row-span-2 md:row-start-1">
        <Toploader
          ref={frame}
          image={image}
          tint={tint}
          className="w-[min(300px,68vw)] touch-none"
          onPointerDown={e => {
            if (!e.target.closest('[data-sticker]')) setSel(null);
          }}
        >
          {stickers
            .map((s, i) => [s, i])
            .sort(([a], [b]) => a.uid - b.uid)
            .map(([s, i]) => (
            <button
              key={s.uid}
              type="button"
              data-sticker
              aria-label={`${STICKER_BY_ID[s.id]?.label} sticker`}
              aria-pressed={sel === i}
              onPointerDown={e => startDrag(e, i, 'move')}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onFocus={() => setSel(i)}
              onKeyDown={e => onKey(e, i)}
              className="absolute aspect-square cursor-grab rounded-md outline-offset-2 active:cursor-grabbing aria-pressed:outline-2 aria-pressed:outline-primary aria-pressed:outline-dashed"
              style={{ ...stickerStyle(s), zIndex: i + 1 }}
            >
              <img alt="" src={STICKER_BY_ID[s.id]?.src} draggable={false} className="pointer-events-none size-full" />
            </button>
          ))}
          {handle && (
            <Button
              type="button"
              data-sticker
              size="icon-sm"
              aria-label="Resize and turn sticker"
              tabIndex={-1}
              onPointerDown={e => startDrag(e, sel, 'turn')}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="absolute size-8 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize rounded-full shadow-lg shadow-black/40"
              style={{ ...handle, zIndex: stickers.length + 1 }}
            >
              <RotateCw />
            </Button>
          )}
        </Toploader>
      </div>

      <div className="space-y-5 md:col-start-2">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label>Stickers</Label>
            <span className="font-mono text-xs text-muted-foreground">
              {stickers.length}/{MAX_STICKERS}
            </span>
          </div>
          <div className="grid grid-cols-8 gap-1.5 max-sm:grid-cols-6">
            {STICKERS.map(s => (
              <Button
                key={s.id}
                type="button"
                variant="outline"
                aria-label={`Add ${s.label}`}
                title={s.label}
                disabled={stickers.length >= MAX_STICKERS}
                onClick={() => add(s.id)}
                className="aspect-square h-auto p-1"
              >
                <img alt="" src={s.src} className="size-full" />
              </Button>
            ))}
          </div>
        </div>

        {selected ? (
          <div className="space-y-4 rounded-lg border p-3">
            <div className="space-y-2">
              <Label htmlFor="stickerSize">Size</Label>
              <Slider
                id="stickerSize"
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={0.05}
                value={[selected.k]}
                onValueChange={([k]) => update(sel, { k })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stickerTurn">Turn</Label>
              <Slider id="stickerTurn" min={-180} max={180} step={1} value={[selected.r]} onValueChange={([r]) => update(sel, { r })} />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => remove(sel)}>
              <Trash2 />
              Remove sticker
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground max-sm:hidden">
            Keyboard: Tab to a sticker, then arrows move it, + and − resize, [ and ] turn, Delete removes.
          </p>
        )}

        <div className="space-y-2">
          <Label>Toploader</Label>
          <ToggleGroup type="single" variant="outline" size="sm" value={tint} onValueChange={v => v && setTint(v)} className="flex-wrap">
            {TINTS.map(t => (
              <ToggleGroupItem key={t.id} value={t.id} aria-label={`${t.label} toploader`}>
                <span className="size-3 rounded-full border" style={{ background: t.rim }} />
                {t.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save toploader'}
          </Button>
          <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
            <ArrowLeft />
            Back to card
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={saving || (!stickers.length && tint === 'clear')}
            onClick={() => {
              setStickers([]);
              setTint('clear');
              setSel(null);
            }}
          >
            <Eraser />
            Remove all
          </Button>
        </div>
      </div>
    </div>
  );
}
