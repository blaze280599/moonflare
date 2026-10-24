// The 3D booster pack on the opening stage: a puffy foil pillow wrapped in the era's art, torn open
// by dragging across its top. Plain three.js, browser-only. World units are CSS pixels at z = 0 with
// the origin at the canvas center, so DOM cards behind the canvas line up with the pack.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PACK, getPackArt } from './art.js';

// Geometry is built one unit tall and scaled to the pack's pixel height.
const W = PACK.ratio;
const SEAL = PACK.crimp;
const TEAR = PACK.tear;
const TEAR_Y = TEAR - 0.5; // the tear line, in pack heights above the pack's center
const BULGE = 0.045; // how far each face puffs out
const COLS = 40;
const FOV = 30;
const GRAVITY = 2600; // px/s²
const FLAKES = 120;

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// Zigzag along the tear row, shared by the body's top edge and the strip's bottom edge so they meet.
const jag = i => (i % 2 ? 1 : -1) * 0.0035 * (0.6 + ((i * 7919) % 13) / 13);

// One face of a section of the pack, v0..v1 of its height. side is 1 for the front, -1 for the back.
function sheet(v0, v1, rows, side, tearRow) {
  const n = (COLS + 1) * (rows + 1);
  const pos = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const us = new Float32Array(n);
  const index = [];
  for (let j = 0; j <= rows; j++) {
    const v = v0 + ((v1 - v0) * j) / rows;
    const seal = smooth(SEAL, SEAL + 0.07, v) * smooth(SEAL, SEAL + 0.07, 1 - v);
    for (let i = 0; i <= COLS; i++) {
      const k = j * (COLS + 1) + i;
      const u = i / COLS;
      pos[k * 3] = (u - 0.5) * W * (1 - 0.03 * seal);
      pos[k * 3 + 1] = v - 0.5 + (j === tearRow ? jag(i) : 0);
      pos[k * 3 + 2] = side * BULGE * Math.pow(Math.sin(Math.PI * u), 0.55) * seal;
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
  constructor(canvas, { era, reducedMotion, onReady, onTearStart, onTorn, onError }) {
    this.canvas = canvas;
    this.cb = { onReady, onTearStart, onTorn, onError };
    this.reducedMotion = reducedMotion;
    this.alive = true;
    this.state = 'loading'; // loading → ready → torn → present → drop
    this.progress = 0;
    this.dir = 0;
    this.t = 0;
    this.w = this.h = this.size = 1;
    this.tilt = { x: 0, y: 0 };
    this.spin = { x: 0, y: 0 };
    this.pointer = new THREE.Vector3(0, 0, 0);
    this.bob = 1;

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
    add(body, sheet(0, TEAR, 44, 1, 44), frontMat);
    add(body, sheet(0, TEAR, 44, -1, 44), backMat);
    this.stripGeos = [sheet(TEAR, 1, 8, 1, 0), sheet(TEAR, 1, 8, -1, 0)];
    this.strip = new THREE.Group();
    add(this.strip, this.stripGeos[0], frontMat);
    add(this.strip, this.stripGeos[1], backMat);
    this.pack.add(body, this.strip);

    // Swing in from below.
    this.s.y.v = -this.h * 0.75;
    this.s.rz.v = 0.35;
    this.s.rx.v = -0.5;
    this.s.squash.v = 0.9;
    this.pack.visible = true;
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

  // Foil glitter thrown off the tear. `at` is in pack space.
  spawn(count, at, spread = 0) {
    const F = this.flakes;
    const p = new THREE.Vector3();
    const color = new THREE.Color();
    for (let n = 0; n < count; n++) {
      const i = F.next;
      F.next = (F.next + 1) % FLAKES;
      p.set(at.x + (Math.random() - 0.5) * spread, at.y, at.z);
      this.pack.localToWorld(p);
      F.pos.set([p.x, p.y, p.z], i * 3);
      F.vel.set([(Math.random() - 0.5) * 420 + this.dir * 120, 120 + Math.random() * 380, 80 + Math.random() * 200], i * 3);
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

  // Peels the torn part of the strip up and toward the viewer, hinged on the tear line.
  // Behind the tear front the strip curls more the further back it is.
  deformStrip() {
    const lift = 0.5 + 0.5 * this.s.lift.v;
    for (const g of this.stripGeos) {
      const { base, u } = g.userData;
      const pos = g.attributes.position.array;
      for (let i = 0; i < u.length; i++) {
        const k = i * 3;
        const x = base[k], y = base[k + 1], z = base[k + 2];
        const s = this.dir > 0 ? u[i] : 1 - u[i];
        const a = smooth(0, 0.5, this.progress - s) * lift;
        const th = a * 1.3, dy = y - TEAR_Y;
        pos[k] = x + this.dir * a * 0.05;
        pos[k + 1] = TEAR_Y + dy * Math.cos(th) + a * 0.025;
        pos[k + 2] = z + dy * Math.sin(th) + a * 0.03;
      }
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals();
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

  onDown = e => {
    if (this.state !== 'ready' || this.drag) return;
    const [wx, wy] = this.toWorld(e);
    const [, py] = this.toPack(wx, wy);
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {}
    this.drag = {
      id: e.pointerId,
      touch: e.pointerType !== 'mouse',
      mode: py > TEAR_Y - 0.16 ? 'tear' : 'spin',
      x0: wx, y0: wy, x: wx, y: wy, vx: 0, vy: 0,
      t: performance.now()
    };
    this.tilt = { x: 0, y: 0 };
    this.canvas.style.cursor = 'grabbing';
  };

  onMove = e => {
    const [wx, wy] = this.toWorld(e);
    const [px, py] = this.toPack(wx, wy);
    this.pointer.set(wx, wy, 0);
    const d = this.drag;
    if (!d) {
      if (e.pointerType === 'mouse' && this.state === 'ready') {
        this.tilt = { x: clamp(-py * 0.45, -0.22, 0.22), y: clamp(px * 0.7, -0.3, 0.3) };
        this.canvas.style.cursor = py > TEAR_Y - 0.16 && Math.abs(px) < W * 0.7 ? 'grab' : '';
      }
      return;
    }
    if (d.id !== e.pointerId) return;
    const now = performance.now();
    const dx = wx - d.x, dy = wy - d.y, ms = Math.max(1, now - d.t);
    d.vx = d.vx * 0.5 + ((dx / ms) * 1000) * 0.5;
    d.vy = d.vy * 0.5 + ((dy / ms) * 1000) * 0.5;
    Object.assign(d, { x: wx, y: wy, t: now });
    if (this.state !== 'ready') return;

    if (d.mode === 'spin') {
      this.spin = { x: clamp(-(wy - d.y0) * 0.004, -0.6, 0.6), y: clamp((wx - d.x0) * 0.006, -1.1, 1.1) };
      return;
    }
    if (!this.dir) {
      if (Math.abs(wx - d.x0) < 8) return;
      this.dir = Math.sign(wx - d.x0);
    }
    this.s.lift.target = clamp((py - TEAR_Y) / 0.15, 0, 1);
    if (Math.abs(py - TEAR_Y) > 0.35) return;
    const step = (Math.max(0, dx * this.dir) / (W * this.size)) * 1.1;
    if (step > 0) this.advance(step, d);
  };

  onUp = e => {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    this.drag = null;
    if (d.mode === 'spin') {
      // Let go with a flick and it keeps spinning a little before the springs settle it.
      this.s.ry.vel += clamp(d.vx * 0.004, -6, 6);
      this.s.rx.vel += clamp(-d.vy * 0.003, -4, 4);
    }
    this.spin = { x: 0, y: 0 };
    this.s.lift.target = 0.25;
    this.canvas.style.cursor = '';
  };

  onLeave = () => {
    if (this.drag) return;
    this.tilt = { x: 0, y: 0 };
    this.pointer.set(-this.w * 0.25, this.h * 0.3, 0);
  };

  onLost = e => {
    e.preventDefault();
    if (this.alive) this.cb.onError?.();
  };

  advance(step, d) {
    if (!this.progress) this.cb.onTearStart?.();
    const before = this.progress;
    this.progress = Math.min(1, this.progress + step);
    this.stripDirty = true;
    // The pack gets tugged along by the tear.
    this.s.rz.vel -= this.dir * step * 3;
    this.s.x.vel += this.dir * step * 260;
    const front = this.dir > 0 ? -W / 2 + this.progress * W : W / 2 - this.progress * W;
    this.spawn(Math.ceil(step * 90), { x: front, y: TEAR_Y, z: BULGE });
    if (d?.touch && Math.floor(before * 8) !== Math.floor(this.progress * 8)) {
      try {
        navigator.vibrate?.(8);
      } catch {}
    }
    if (this.progress >= 1) this.release(d?.vx ?? this.dir * 900, d?.vy ?? 300);
  }

  release(vx, vy) {
    this.state = 'torn';
    this.drag = null;
    this.tilt = { x: 0, y: 0 };
    for (const s of [this.s.rx, this.s.ry, this.s.rz, this.s.x]) s.target = 0;
    this.canvas.style.cursor = '';
    this.deformStrip();
    this.scene.attach(this.strip);
    this.free = {
      vel: new THREE.Vector3(clamp(vx * 0.6 + this.dir * 380, -1600, 1600), clamp(vy * 0.4, -200, 900) + 700, 260),
      spin: new THREE.Vector3(-2.5 - Math.random(), this.dir * 1.5, -this.dir * (4 + Math.random() * 3))
    };
    this.s.squash.vel = -2.6;
    this.s.rz.vel += this.dir * 1.2;
    this.spawn(40, { x: 0, y: TEAR_Y, z: BULGE }, W);
    this.cb.onTorn?.();
  }

  // Tears the pack open by itself (the "Rip it for me" button).
  rip() {
    if (this.state !== 'ready') return;
    this.dir = 1;
    this.state = 'auto';
    this.s.lift.target = 0.7;
    this.cb.onTearStart?.();
  }

  // Square the pack up to face the camera at `y`, so the cards can slide out of it.
  present(y) {
    this.state = 'present';
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

    if (this.state === 'auto') this.advance(dt / 0.7);
    if (this.state === 'ready' || this.state === 'auto') {
      S.rx.target = this.tilt.x + this.spin.x;
      S.ry.target = this.tilt.y + this.spin.y;
      S.rz.target = 0;
      S.x.target = 0;
    }
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
