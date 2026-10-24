// Game sounds, synthesized with the Web Audio API, so there are no audio files to ship or license.
// Browsers only allow audio after a user gesture: call unlockAudio() from a pointerdown or keydown.
// Until then, and while sound is off, every play function does nothing.

let ctx = null;
let out = null;
let noise = null;
let on = false;
let lastGrain = 0;

export function setSoundOn(value) {
  on = value;
  if (!on && ctx?.state === 'running') ctx.suspend().catch(() => {});
}

export function unlockAudio() {
  if (!on) return;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      // A compressor keeps overlapping rip grains and chimes from clipping.
      out = ctx.createDynamicsCompressor();
      out.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
}

const live = () => on && ctx?.state === 'running';

// A burst of band-passed noise. Tearing foil is mostly noise in the upper mids.
function burst({ at, dur, gain, freq, freqEnd = freq, q = 1 }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, at);
  f.frequency.exponentialRampToValueAtTime(freqEnd, at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(out);
  src.start(at, Math.random() * 0.8, dur + 0.02);
}

function tone({ at, freq, dur, gain, type = 'sine' }) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + dur + 0.05);
}

// One grain of the cut as it grows. `speed` is 0 to 1: a fast drag rips louder, brighter and denser.
export function playRip(speed) {
  if (!live()) return;
  const now = ctx.currentTime;
  if (now - lastGrain < 0.03 - speed * 0.015) return;
  lastGrain = now;
  burst({ at: now, dur: 0.035 + speed * 0.04, gain: 0.05 + speed * 0.3, freq: 1400 + speed * 2600 + Math.random() * 800, q: 0.9 });
}

// The strip coming off once the cut spans the pack.
export function playTear() {
  if (!live()) return;
  const now = ctx.currentTime;
  burst({ at: now, dur: 0.28, gain: 0.45, freq: 4200, freqEnd: 900, q: 0.7 });
  burst({ at: now + 0.02, dur: 0.12, gain: 0.25, freq: 7000, freqEnd: 3000, q: 1.5 });
}

const CHIME = [1318.5, 1568, 1760, 2093, 2349.3, 2637]; // E6 G6 A6 C7 D7 E7, a pentatonic run
const CHIMES = [0, 2, 3, 5, 6]; // per rarity rank: Rare 2, Epic 3, Legendary 5, Mythic 6

// The sparkle of a Rare-or-better card being revealed. Rarer cards get a longer run of chimes.
export function playSparkle(rank) {
  if (!live() || !CHIMES[rank]) return;
  const now = ctx.currentTime;
  for (let i = 0; i < CHIMES[rank]; i++) {
    const at = now + i * 0.07;
    tone({ at, freq: CHIME[i], dur: 0.7, gain: 0.12 });
    tone({ at, freq: CHIME[i] * 2, dur: 0.25, gain: 0.03, type: 'triangle' });
  }
}
