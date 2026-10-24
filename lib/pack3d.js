// The 3D booster pack on the opening stage: a puffy foil pillow wrapped in the era's art. Press on the
// dashed line near the top and drag along it to cut the pack open; grab it anywhere else to
// turn it. Plain three.js, browser-only. World units are CSS pixels at z = 0 with the origin at the
// canvas center, so DOM cards behind the canvas line up with the pack.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PACK, getPackArt } from './art.js';

// Geometry is built one unit tall and scaled to the pack's pixel height.
const W = PACK.ratio;
const SEAL = PACK.crimp;
const TEAR = PACK.tear;
const TEAR_Y = TEAR - 0.5; // the cut line, in pack heights above the pack's center
const BULGE = 0.05; // how far each face puffs out at most
const COLS = 72;
const FOV = 30;
const GRAVITY = 2600; // px/s²
const FLAKES = 120;
// The cutting zone, in pack heights from the line: a press must land within START to begin cutting,
// and the cut keeps going while the pointer stays within HOLD.
const CUT_START = 0.07;
const CUT_HOLD = 0.12;
const EDGE = 0.03; // a cut this close to a side counts as reaching it

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// Zigzag along the cut row, shared by the body's top edge and the strip's bottom edge so they meet.
const jag = i => (i % 2 ? 1 : -1) * 0.0035 * (0.6 + ((i * 7919) % 13) / 13);

// Smooth value noise, so each pack's wrinkles are irregular but repeatable for its seed.
const hash = n => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const noise = x => {
  const i = Math.floor(x), f = x - i, t = f * f * (3 - 2 * f);
  return hash(i) * (1 - t) + hash(i + 1) * t;
};
const noise2 = (x, y) => {
  const j = Math.floor(y), f = y - j, t = f * f * (3 - 2 * f);
  return noise(x + j * 57.3) * (1 - t) + noise(x + (j + 1) * 57.3) * t;
};
const easeOut = t => Math.sin(clamp(t, 0, 1) * Math.PI * 0.5);

// The pack's surface, as a function of (u, v) across its width and up its height. Built in two parts:
// - the puff, which pushes the front and back faces apart: zero along the seals, rising through a rounded
//   shoulder, with pinch wrinkles fanning out where the body is squeezed into each seal and a faint
//   all-over crinkle in the film;
// - a warp that moves both faces together (they're sealed, so they have to stay in contact at the seals):
//   rippled seals that curl a little away from flat, and a slight bend through the whole pack.
function packShape(seed) {
  const r = n => hash(seed * 13.7 + n);
  const curlTop = (r(1) - 0.3) * 0.05, curlBottom = (r(2) - 0.7) * 0.04;
  const bend = (r(3) - 0.5) * 0.02;
  // Wrinkles along the seal's width: a few irregular ridges, sharper than a sine.
  const pinch = (u, end) => {
    const o = seed + end * 9.1;
    const ridges = Math.abs(Math.sin(u * Math.PI * (6 + 3 * r(end + 4)) + noise(u * 4 + o) * 3));
    const fine = Math.abs(Math.sin(u * Math.PI * (13 + 4 * r(end + 6)) + o));
    return (0.6 * ridges + 0.4 * fine) * (0.3 + 1.1 * noise(u * 6 + o + 3)); // some creases deep, some barely there
  };
  return (u, v, side, col = -1) => {
    const bottom = (v - SEAL) / 0.11, top = (1 - v - SEAL) / 0.11;
    const round = easeOut(bottom) * easeOut(top);
    let puff = Math.pow(Math.sin(Math.PI * u), 0.5) * round;
    // Pinch wrinkles: strongest at the shoulder and fading into the body.
    const nearBottom = bottom > 0 ? Math.pow(1 - clamp(bottom / 1.6, 0, 1), 1.6) : 0;
    const nearTop = top > 0 ? Math.pow(1 - clamp(top / 1.6, 0, 1), 1.6) : 0;
    puff *= 1 - 0.32 * (nearBottom * pinch(u, 0) + nearTop * pinch(u, 1));
    puff *= 1 + 0.08 * (noise2(u * 7 + seed, v * 11) - 0.5);

    const sealBottom = clamp(-bottom * 0.11 / SEAL, 0, 1); // 0 at the seal's inner edge, 1 at the cut end
    const sealTop = clamp(-top * 0.11 / SEAL, 0, 1);
    const sealness = 1 - smooth(0, 0.6, Math.min(bottom, top));
    let warp = sealness * 0.007 * (noise(u * 10 + seed * 3) - 0.5) * 2;
    warp += curlTop * sealTop * sealTop + curlBottom * sealBottom * sealBottom;
    warp += bend * Math.sin(Math.PI * v) * (0.6 + 0.4 * Math.sin(Math.PI * u));

    return [
      (u - 0.5) * W * (1 - 0.03 * round), // the puffed body pulls the sides in a little
      v - 0.5 + (col >= 0 ? jag(col) : 0),
      side * BULGE * puff + warp
    ];
  };
}

// One face of a section of the pack, v0..v1 of its height. side is 1 for the front, -1 for the back.
function sheet(shape, v0, v1, rows, side, tearRow) {
  const n = (COLS + 1) * (rows + 1);
  const pos = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const us = new Float32Array(n);
  const index = [];
  for (let j = 0; j <= rows; j++) {
    const v = v0 + ((v1 - v0) * j) / rows;
    for (let i = 0; i <= COLS; i++) {
      const k = j * (COLS + 1) + i;
      const u = i / COLS;
      pos.set(shape(u, v, side, j === tearRow ? i : -1), k * 3);
      uv[k * 2] = side > 0 ? u : 1 - u;
      uv[k * 2 + 1] = v;
      us[k] = u;
      if (i < COLS && j < rows) {
        const a = k, b = k + 1, c = k + COLS + 1, d = c + 1;
        index.push(...(side > 0 ? [a, b, d, a, d, c] : [a, d, b, a, c, d]));
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  g.userData = { base: pos.slice(), u: us };
  return g;
}

// A thin band lying on the front face along the cut line: dashed for the guide, solid for the cut itself.
function ribbon(shape, half, dashed) {
  const pos = [];
  const index = [];
  for (let i = 0; i <= COLS; i++) {
    const [x, y, z] = shape(i / COLS, TEAR, 1, i);
    pos.push(x, y - half, z + 0.004, x, y + half, z + 0.004);
    if (i < COLS && (!dashed || i % 4 < 2)) {
      const a = i * 2;
      index.push(a, a + 2, a + 3, a, a + 3, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  return g;
}

// A damped spring; the pack's position, tilt and squash all ride on these.
class Spring {
  constructor(v, k = 90, c = 11) {
    Object.assign(this, { v, target: v, vel: 0, k, c });
  }
  step(dt) {
    this.vel += (this.k * (this.target - this.v) - this.c * this.vel) * dt;
    this.v += this.vel * dt;
  }
}

export class PackScene {
  // Throws if WebGL isn't available; the caller skips straight to the cards.
  // `cards` is the pulls in reveal order, as { art, back } image URLs; they're drawn inside the pack.
  constructor(canvas, { era, cards, reducedMotion, onReady, onTearStart, onTorn, onError }) {
    this.cardImages = cards;
    this.canvas = canvas;
    this.era = era;
    this.cb = { onReady, onTearStart, onTorn, onError };
    this.reducedMotion = reducedMotion;
    this.alive = true;
    this.state = 'loading'; // loading → ready (→ auto) → torn → present → drop
    // The cut so far, as a span of the pack's width (0 = left side, 1 = right side).
    this.lo = this.hi = null;
    this.t = 0;
    this.w = this.h = this.size = 1;
    this.tilt = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 }; // smoothed pointer velocity while the pack is held, px/s
    this.pointer = new THREE.Vector3(0, 0, 0);
    this.bob = 1;
    this.hoverCut = false;

    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setClearColor(0x000000, 0);
    r.toneMapping = THREE.NeutralToneMapping;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10000);
    const pmrem = new THREE.PMREMGenerator(r);
    const room = new RoomEnvironment();
    this.env = pmrem.fromScene(room, 0.04).texture;
    room.dispose?.();
    pmrem.dispose();
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.9;
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-0.4, 0.8, 1);
    this.light = new THREE.PointLight(0xfff1f8, 0.55, 0, 0);
    this.scene.add(key, this.light);

    this.pack = new THREE.Group();
    this.pack.visible = false;
    this.scene.add(this.pack);
    this.s = {
      x: new Spring(0),
      y: new Spring(0),
      rx: new Spring(0),
      ry: new Spring(0),
      rz: new Spring(0),
      lift: new Spring(0, 60, 12),
      squash: new Spring(1, 260, 9)
    };
    this.initFlakes();

    getPackArt(era).then(art => {
      if (!this.alive) return;
      this.build(art);
      this.state = 'ready';
      this.cb.onReady?.();
    });

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('pointerleave', this.onLeave);
    canvas.addEventListener('webglcontextlost', this.onLost);
    this.raf = requestAnimationFrame(this.frame);
  }

  build(art) {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const tex = (canvas, color) => {
      const t = new THREE.CanvasTexture(canvas);
      t.anisotropy = Math.min(8, maxAniso);
      if (color) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    this.textures = [tex(art.front, true), tex(art.back, true), tex(art.frontOrm), tex(art.backOrm), tex(art.alpha)];
    const [front, back, frontOrm, backOrm, alpha] = this.textures;
    // Roughness and metalness come from the maps; 1 here means "use the map as is".
    const foil = (map, orm) =>
      new THREE.MeshPhysicalMaterial({
        map,
        roughnessMap: orm,
        metalnessMap: orm,
        roughness: 1,
        metalness: 1,
        alphaTest: 0.5,
        clearcoat: 0.7,
        clearcoatRoughness: 0.14,
        iridescence: 0.35,
        iridescenceIOR: 1.4,
        iridescenceThicknessRange: [180, 520]
      });
    // The silver inside of the wrapper, seen through the opening. Pushed back so it never shows through the seals.
    const inner = new THREE.MeshStandardMaterial({
      color: 0xb8b6c4,
      metalness: 0.9,
      roughness: 0.35,
      alphaMap: alpha,
      alphaTest: 0.5,
      side: THREE.BackSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 2
    });
    const frontMat = foil(front, frontOrm);
    const backMat = foil(back, backOrm);
    const add = (parent, geo, mat) => parent.add(new THREE.Mesh(geo, mat), new THREE.Mesh(geo, inner));

    const body = new THREE.Group();
    // Each era's pack crinkles its own way, the same way every time.
    const shape = packShape([...this.era.code].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7));
    add(body, sheet(shape, 0, TEAR, 96, 1, 96), frontMat);
    add(body, sheet(shape, 0, TEAR, 96, -1, 96), backMat);
    this.stripGeos = [sheet(shape, TEAR, 1, 16, 1, 0), sheet(shape, TEAR, 1, 16, -1, 0)];
    this.strip = new THREE.Group();
    add(this.strip, this.stripGeos[0], frontMat);
    add(this.strip, this.stripGeos[1], backMat);

    const glow = opacity =>
      new THREE.MeshBasicMaterial({ color: 0xffd9ee, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    this.guide = new THREE.Mesh(ribbon(shape, 0.0028, true), glow(0.4));
    this.cut = new THREE.Mesh(ribbon(shape, 0.0045, false), glow(1));
    this.cut.geometry.setDrawRange(0, 0);
    this.cardStack = this.buildCards(shape, maxAniso);
    this.pack.add(body, this.strip, this.guide, this.cut, this.cardStack);

    // Swing in from below.
    this.s.y.v = -this.h * 0.75;
    this.s.rz.v = 0.35;
    this.s.rx.v = -0.5;
    this.s.squash.v = 0.9;
    this.pack.visible = true;
  }

  // The album's actual pulls, stacked inside the pack, so a peek through the opening finds real cards.
  // Backs face the pack's front and art faces its back. The card revealed first sits at the back, so
  // peeking from behind only shows the card the player is about to flip anyway. Sized and placed like
  // the DOM stack that slides out later: top just under the cut line, width a 1.16th of the pack's.
  buildCards(shape, maxAniso) {
    const group = new THREE.Group();
    if (!this.cardImages?.length) return group;
    const corners = document.createElement('canvas');
    corners.width = 128;
    corners.height = 179;
    const ctx = corners.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(0, 0, 128, 179, 5);
    ctx.fill();
    const alpha = new THREE.CanvasTexture(corners);
    const loader = new THREE.TextureLoader().setCrossOrigin('anonymous');
    const load = src => {
      const t = loader.load(src);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(4, maxAniso);
      return t;
    };
    const cw = W / 1.16, ch = (cw * 88) / 63;
    const geo = new THREE.PlaneGeometry(cw, ch);
    const back = load(this.cardImages[0].back);
    this.textures.push(alpha, back);
    const face = map => new THREE.MeshStandardMaterial({ map, roughness: 0.45, metalness: 0, alphaMap: alpha, alphaTest: 0.5 });
    const backMat = face(back);
    const n = this.cardImages.length;
    const mid = shape(0.5, TEAR - 0.012 - ch / 2 + 0.5, 0)[2]; // follow the pack's bend at the stack's center
    this.cardImages.forEach(({ art }, k) => {
      const artTex = load(art);
      this.textures.push(artTex);
      const card = new THREE.Group();
      const front = new THREE.Mesh(geo, backMat);
      const rear = new THREE.Mesh(geo, face(artTex));
      front.position.z = 0.0004;
      rear.position.z = -0.0004;
      rear.rotation.y = Math.PI;
      card.add(front, rear);
      // k = 0 is revealed first, so it goes at the back; a little jitter keeps the stack from looking machined.
      const j = hash(k * 7.3 + 1);
      card.position.set((j - 0.5) * 0.008, TEAR_Y - 0.012 - ch / 2 - j * 0.006, mid + (k - (n - 1) / 2) * 0.0035);
      card.rotation.z = (hash(k * 3.1 + 2) - 0.5) * 0.02;
      group.add(card);
    });
    return group;
  }

  initFlakes() {
    const geo = new THREE.BufferGeometry();
    this.flakes = {
      pos: new Float32Array(FLAKES * 3).fill(-1e5),
      col: new Float32Array(FLAKES * 3),
      base: new Float32Array(FLAKES * 3),
      vel: new Float32Array(FLAKES * 3),
      life: new Float32Array(FLAKES),
      next: 0,
      geo
    };
    geo.setAttribute('position', new THREE.BufferAttribute(this.flakes.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.flakes.col, 3));
    const mat = new THREE.PointsMaterial({
      size: 5 * Math.min(window.devicePixelRatio || 1, 2),
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    this.scene.add(points);
  }

  // Foil glitter thrown off the cut. `at` is in pack space; `push` nudges it sideways.
  spawn(count, at, spread = 0, push = 0) {
    const F = this.flakes;
    const p = new THREE.Vector3();
    const color = new THREE.Color();
    for (let n = 0; n < count; n++) {
      const i = F.next;
      F.next = (F.next + 1) % FLAKES;
      p.set(at.x + (Math.random() - 0.5) * spread, at.y, at.z);
      this.pack.localToWorld(p);
      F.pos.set([p.x, p.y, p.z], i * 3);
      F.vel.set([(Math.random() - 0.5) * 420 + push * 120, 120 + Math.random() * 380, 80 + Math.random() * 200], i * 3);
      color.setHSL(Math.random(), 0.9, 0.78);
      F.base.set([color.r, color.g, color.b], i * 3);
      F.life[i] = 0.6 + Math.random() * 0.5;
    }
  }

  stepFlakes(dt) {
    const F = this.flakes;
    for (let i = 0; i < FLAKES; i++) {
      if (F.life[i] <= 0) continue;
      F.life[i] -= dt;
      const k = i * 3;
      if (F.life[i] <= 0) {
        F.pos[k + 1] = -1e5;
        F.col.fill(0, k, k + 3);
        continue;
      }
      F.vel[k + 1] -= 900 * dt;
      for (let a = 0; a < 3; a++) {
        F.pos[k + a] += F.vel[k + a] * dt;
        F.col[k + a] = F.base[k + a] * Math.min(1, F.life[i] * 2);
      }
    }
    F.geo.attributes.position.needsUpdate = true;
    F.geo.attributes.color.needsUpdate = true;
  }

  // Shapes the strip above the cut. A slit in the middle only gapes a little; once the cut reaches a side,
  // that end of the strip is free and peels up toward the viewer, curling more the further it is from
  // where the cut stops.
  deformStrip() {
    const lift = 0.5 + 0.5 * this.s.lift.v;
    const { lo, hi } = this;
    const fromLeft = lo !== null && lo <= EDGE;
    const fromRight = hi !== null && hi >= 1 - EDGE;
    for (const g of this.stripGeos) {
      const { base, u } = g.userData;
      const pos = g.attributes.position.array;
      for (let i = 0; i < u.length; i++) {
        const k = i * 3;
        const x = base[k], y = base[k + 1], z = base[k + 2];
        let a = 0, push = 0;
        if (lo !== null && u[i] >= lo && u[i] <= hi) a = 0.07 * Math.min(smooth(lo, lo + 0.08, u[i]), smooth(hi, hi - 0.08, u[i]));
        if (fromLeft && u[i] <= hi) {
          const p = smooth(0, 0.5, hi - u[i]) * lift;
          if (p > a) [a, push] = [p, 1];
        }
        if (fromRight && u[i] >= lo) {
          const p = smooth(0, 0.5, u[i] - lo) * lift;
          if (p > a) [a, push] = [p, -1];
        }
        const th = a * 1.3, dy = y - TEAR_Y;
        pos[k] = x + push * a * 0.05;
        pos[k + 1] = TEAR_Y + dy * Math.cos(th) + a * 0.025;
        pos[k + 2] = z + dy * Math.sin(th) + a * 0.03;
      }
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals();
    }
    if (lo !== null) {
      const a = Math.floor(lo * COLS), b = Math.ceil(hi * COLS);
      this.cut.geometry.setDrawRange(a * 6, (b - a) * 6);
    }
  }

  resize(w, h, packHeight) {
    this.w = w;
    this.h = h;
    this.size = packHeight;
    if (!this.drag) this.pointer.set(-w * 0.25, h * 0.3, 0); // the highlight rests top-left until a pointer moves
    this.renderer.setSize(w, h, false);
    const dist = h / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    Object.assign(this.camera, { aspect: w / h, near: dist * 0.1, far: dist * 4 });
    this.camera.position.set(0, 0, dist);
    this.camera.updateProjectionMatrix();
  }

  toWorld(e) {
    const r = this.canvas.getBoundingClientRect();
    return [e.clientX - r.left - r.width / 2, -(e.clientY - r.top - r.height / 2)];
  }

  // Pack-space position of a world point, ignoring the pack's tilt.
  toPack(wx, wy) {
    return [(wx - this.s.x.v) / this.size, (wy - this.s.y.v) / this.size];
  }

  inCutZone(px, py, band) {
    return Math.abs(py - TEAR_Y) < band && Math.abs(px) < W / 2 + 0.1;
  }

  onPack(px, py) {
    return Math.abs(px) < W / 2 + 0.03 && Math.abs(py) < 0.53;
  }

  onDown = e => {
    if (this.state !== 'ready' || this.drag) return;
    const [wx, wy] = this.toWorld(e);
    const [px, py] = this.toPack(wx, wy);
    const cutting = this.inCutZone(px, py, CUT_START);
    if (!cutting && !this.onPack(px, py)) return;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {}
    this.drag = {
      id: e.pointerId,
      touch: e.pointerType !== 'mouse',
      mode: cutting ? 'cut' : 'grab',
      x0: wx, y0: wy, x: wx, y: wy,
      t: performance.now(),
      gx: px, gy: py, // where on the pack it was grabbed
      u: null
    };
    this.tilt = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    if (cutting) this.cutAt(px, py);
    this.canvas.style.cursor = cutting ? 'crosshair' : 'grabbing';
  };

  onMove = e => {
    const [wx, wy] = this.toWorld(e);
    const [px, py] = this.toPack(wx, wy);
    this.pointer.set(wx, wy, 0);
    const d = this.drag;
    if (!d) {
      if (e.pointerType === 'mouse' && this.state === 'ready') {
        this.tilt = { x: clamp(-py * 0.45, -0.22, 0.22), y: clamp(px * 0.7, -0.3, 0.3) };
        this.hoverCut = this.inCutZone(px, py, CUT_START);
        this.canvas.style.cursor = this.hoverCut ? 'crosshair' : this.onPack(px, py) ? 'grab' : '';
      }
      return;
    }
    if (d.id !== e.pointerId) return;
    const now = performance.now(), ms = Math.max(1, now - d.t);
    this.vel.x = this.vel.x * 0.6 + ((wx - d.x) / ms) * 1000 * 0.4;
    this.vel.y = this.vel.y * 0.6 + ((wy - d.y) / ms) * 1000 * 0.4;
    Object.assign(d, { x: wx, y: wy, t: now });
    if (this.state === 'ready' && d.mode === 'cut') this.cutAt(px, py);
  };

  // Extends the cut to the pointer, if it's on the line. The cut only grows from its own ends, so it has
  // to be traced along the line rather than jumped across.
  cutAt(px, py) {
    const d = this.drag;
    if (!this.inCutZone(px, py, CUT_HOLD)) {
      d.u = null;
      return;
    }
    const u = clamp(px / W + 0.5, 0, 1);
    const prev = d.u ?? u;
    d.u = u;
    this.s.lift.target = clamp((py - TEAR_Y) / CUT_HOLD, 0, 1);
    const a = Math.min(prev, u), b = Math.max(prev, u);
    if (this.lo === null) [this.lo, this.hi] = [a, b];
    else if (b >= this.lo - 0.06 && a <= this.hi + 0.06) [this.lo, this.hi] = [Math.min(this.lo, a), Math.max(this.hi, b)];
    else return;
    this.grow(u, Math.sign(u - prev), d.touch);
  }

  // Bookkeeping after the cut changes: glitter, a tug on the pack, haptics, and the tear once it spans the pack.
  grow(at, dir, touch) {
    const span = this.hi - this.lo;
    const added = span - (this.span ?? 0);
    if (added <= 0) return;
    if (!this.span && span > 0.01) this.cb.onTearStart?.();
    const before = this.span ?? 0;
    this.span = span;
    this.stripDirty = true;
    this.s.rz.vel -= dir * added * 3;
    this.s.x.vel += dir * added * 220;
    this.spawn(Math.ceil(added * 90), { x: (at - 0.5) * W, y: TEAR_Y, z: BULGE }, 0, dir);
    if (touch && Math.floor(before * 8) !== Math.floor(span * 8)) {
      try {
        navigator.vibrate?.(8);
      } catch {}
    }
    if (this.lo <= EDGE && this.hi >= 1 - EDGE) this.release(dir || 1);
  }

  onUp = e => {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    this.drag = null;
    if (d.mode === 'grab') {
      // Let go with a flick and it keeps turning a little before the springs settle it.
      this.s.ry.vel += clamp(this.vel.x * 0.004, -7, 7);
      this.s.rx.vel += clamp(-this.vel.y * 0.003, -5, 5);
    }
    this.vel = { x: 0, y: 0 };
    this.s.lift.target = 0.25;
    this.canvas.style.cursor = '';
  };

  onLeave = () => {
    if (this.drag) return;
    this.tilt = { x: 0, y: 0 };
    this.hoverCut = false;
    this.pointer.set(-this.w * 0.25, this.h * 0.3, 0);
  };

  onLost = e => {
    e.preventDefault();
    if (this.alive) this.cb.onError?.();
  };

  release(dir) {
    this.state = 'torn';
    this.drag = null;
    this.tilt = { x: 0, y: 0 };
    for (const s of [this.s.rx, this.s.ry, this.s.rz, this.s.x, this.s.y]) s.target = 0;
    this.canvas.style.cursor = '';
    this.deformStrip();
    this.guide.visible = this.cut.visible = false;
    this.scene.attach(this.strip);
    this.free = {
      vel: new THREE.Vector3(clamp(this.vel.x * 0.6 + dir * 380, -1600, 1600), clamp(this.vel.y * 0.4, -200, 900) + 700, 260),
      spin: new THREE.Vector3(-2.5 - Math.random(), dir * 1.5, -dir * (4 + Math.random() * 3))
    };
    this.s.squash.vel = -2.6;
    this.s.rz.vel += dir * 1.2;
    this.spawn(40, { x: 0, y: TEAR_Y, z: BULGE }, W, dir);
    this.cb.onTorn?.();
  }

  // Cuts the pack open by itself (the "Cut it for me" button).
  rip() {
    if (this.state !== 'ready' || this.drag) return;
    if (this.lo === null) this.lo = this.hi = 0;
    this.state = 'auto';
    this.s.lift.target = 0.7;
  }

  // Square the pack up to face the camera at `y`, so the cards can slide out of it.
  present(y) {
    this.state = 'present';
    // From here the DOM card stack takes over (it slides out of the pack), so the cards in here go.
    if (this.cardStack) this.cardStack.visible = false;
    for (const s of Object.values(this.s)) {
      s.k = 170;
      s.c = 26;
      s.target = 0;
    }
    this.s.squash.target = 1;
    this.s.y.target = y;
  }

  drop() {
    this.state = 'drop';
    this.vy = 260;
  }

  frame = now => {
    if (!this.alive) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = clamp((now - (this.last ?? now)) / 1000, 0, 1 / 30);
    this.last = now;
    this.t += dt;
    const S = this.s;

    if (this.state === 'auto') {
      // Finishes whatever cut is there, outward toward both sides.
      this.lo = Math.max(0, this.lo - dt / 0.7);
      this.hi = Math.min(1, this.hi + dt / 0.7);
      this.grow(this.hi, 1, false);
    }
    const grab = this.drag?.mode === 'grab' && this.state === 'ready' ? this.drag : null;
    if (grab) {
      // Held: dragging turns the pack (far enough to see the back) while it stays roughly where it is,
      // giving a little toward the pointer and swinging slightly with the motion.
      const dx = grab.x - grab.x0, dy = grab.y - grab.y0;
      const give = this.size * 0.05;
      S.x.target = clamp(dx * 0.08, -give, give);
      S.y.target = clamp(dy * 0.08, -give, give);
      S.ry.target = clamp(dx * 0.009, -Math.PI, Math.PI);
      S.rx.target = clamp(-dy * 0.006, -1.1, 1.1);
      S.rz.target = clamp(-this.vel.x * grab.gy * 0.0006 + this.vel.y * grab.gx * 0.0006, -0.2, 0.2);
      const decay = Math.exp(-dt * 8);
      this.vel.x *= decay;
      this.vel.y *= decay;
    } else if (this.state === 'ready' || this.state === 'auto') {
      S.rx.target = this.tilt.x;
      S.ry.target = this.tilt.y;
      S.rz.target = 0;
      S.x.target = 0;
      S.y.target = 0;
    }
    S.x.k = S.y.k = grab ? 240 : 90;
    S.x.c = S.y.c = grab ? 24 : 9;
    for (const s of Object.values(S)) s.step(dt);
    if (this.state === 'drop') {
      this.vy -= GRAVITY * dt;
      S.y.v += this.vy * dt;
      S.rx.v -= 0.6 * dt;
      if (S.y.v < -this.h * 1.2) this.pack.visible = false;
    }

    const calm = this.state === 'ready' && !this.drag && !this.reducedMotion ? 1 : 0;
    this.bob += (calm - this.bob) * Math.min(1, dt * 3);
    this.pack.position.set(S.x.v, S.y.v + Math.sin(this.t * 1.7) * 5 * this.bob, 0);
    this.pack.rotation.set(S.rx.v, S.ry.v + Math.sin(this.t * 0.9) * 0.06 * this.bob, S.rz.v);
    const sq = S.squash.v;
    this.pack.scale.set(this.size * (2 - sq), this.size * sq, this.size);

    if (this.guide) {
      // The dashed guide pulses until the cut starts, and lights up under the pointer.
      const cutting = this.drag?.mode === 'cut';
      const pulse = this.reducedMotion ? 0.5 : 0.35 + 0.25 * Math.sin(this.t * 4);
      this.guide.material.opacity = this.hoverCut || cutting ? 0.95 : this.span ? 0.3 : pulse;
    }
    if (this.stripDirty && (this.state === 'ready' || this.state === 'auto')) {
      this.stripDirty = false;
      this.deformStrip();
    }
    if (this.state === 'ready' && Math.abs(S.lift.vel) > 1e-3) this.stripDirty = true;
    if (this.free) {
      const { vel, spin } = this.free;
      vel.y -= GRAVITY * dt;
      this.strip.position.addScaledVector(vel, dt);
      this.strip.rotation.x += spin.x * dt;
      this.strip.rotation.y += spin.y * dt;
      this.strip.rotation.z += spin.z * dt;
      if (this.strip.position.y < -this.h) this.strip.visible = false;
    }
    this.stepFlakes(dt);
    this.light.position.set(this.pointer.x, this.pointer.y, this.size * 1.4);
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onUp);
    c.removeEventListener('pointerleave', this.onLeave);
    c.removeEventListener('webglcontextlost', this.onLost);
    this.scene.traverse(o => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    this.textures?.forEach(t => t.dispose());
    this.env.dispose();
    this.renderer.dispose();
    // Free the context right away; browsers cap live WebGL contexts at ~16.
    this.renderer.forceContextLoss();
  }
}
