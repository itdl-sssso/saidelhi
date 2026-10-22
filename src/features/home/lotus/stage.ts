// The 3D lotus stage (port of docs/design/wireframes/lotus-stage.js). Loaded lazily
// by the journey island only when the device can afford it; never part of the LCP path.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export type StageState = { bloom: number; exposure: number; focus: number; shift: number; spin: number };

const VALUES = ["sathya", "dharma", "shanti", "prema", "ahimsa"];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const REST = 0.3;
type Row = { start: number; closed: number; open: number; size: number; t0?: number };
const rowsTemplate = (): Record<"outer" | "mid" | "inner" | "heart", Row> => ({
  outer: { start: 0, closed: -0.01, open: 1.14, size: 0.94 },
  mid: { start: 0.15, closed: -0.02, open: 1.05, size: 0.72 },
  inner: { start: 0.34, closed: -0.06, open: 0.86, size: 0.6 },
  heart: { start: 0.5, closed: -0.1, open: 0.78, size: 0.54 },
});
const rowT = (row: Row, b: number) => easeIO(clamp((b - row.start) / 0.5, 0, 1));
const rowX = (row: Row, t: number) => row.closed + (row.open - row.closed) * t;

// ease-serene, matching the page's --ease-serene, for the act → petal camera move
const SERENE: [number, number, number, number] = [0.22, 0.61, 0.36, 1];
const FOCUS_DUR = 1250;
function bezier(x: number, [p1x, p1y, p2x, p2y]: [number, number, number, number]) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const fx = ((ax * t + bx) * t + cx) * t - x;
    const d = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(fx) < 1e-5 || !d) break;
    t -= fx / d;
  }
  return ((ay * t + by) * t + cy) * t;
}
type Tween = { from: number; to: number; t0: number };
const tw = (t: Tween) => t.from + (t.to - t.from) * bezier(clamp((performance.now() - t.t0) / FOCUS_DUR, 0, 1), SERENE);

// per-value camera offsets so each petal zoom reads as its own frame despite 5-fold symmetry
const V_RAD = [2.32, 2.44, 2.22, 2.4, 2.26];
const V_AZ = [0, 0.07, -0.06, 0.05, -0.08];
const TOP = Math.PI / 2;
const unwrap = (target: number, prev: number) => {
  const d = ((((target - prev + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  return prev + d;
};
const pick = (arr: number[], f: number) => {
  const i = clamp(Math.floor(f), 0, 4);
  const j = clamp(i + 1, 0, 4);
  return lerp(arr[i], arr[j], clamp(f - i, 0, 1));
};

function orbit(out: THREE.Vector3, tgt: THREE.Vector3, az: number, pitch: number, r: number) {
  const cp = Math.cos(pitch);
  out.set(tgt.x + Math.sin(az) * cp * r, tgt.y + Math.sin(pitch) * r, tgt.z + Math.cos(az) * cp * r);
}

type Petal = {
  o: THREE.Object3D;
  base: THREE.Quaternion;
  axis: THREE.Vector3;
  tilt: number;
  row: Row;
  lean: number;
  q: THREE.Quaternion;
};

export class LotusStage {
  /** Screen-space centre and apparent size of the flower's heart, for the 2D emblem overlay. */
  readonly heart = { x: 0, y: 0, size: 0 };
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  private ambient = new THREE.HemisphereLight(0xdfe9ff, 0x3a3340, 0);
  private dirLight = new THREE.DirectionalLight(0xfff3dc, 0);
  private rimLight = new THREE.DirectionalLight(0xbcd4ff, 0);
  private fillLight = new THREE.DirectionalLight(0xffe9d2, 0);
  private coreLight = new THREE.PointLight(0xffd79a, 0, 4, 2);
  private petals: Petal[] = [];
  private glowMats: THREE.MeshStandardMaterial[] = [];
  private rows = rowsTemplate();
  private state: StageState = { bloom: REST, exposure: 0, focus: -1, shift: 0, spin: 0 };
  private shown: StageState = { bloom: REST, exposure: 0, focus: -1, shift: 0, spin: 0 };
  private fTween: Tween = { from: -1, to: -1, t0: 0 };
  private sTween: Tween = { from: 0, to: 0, t0: 0 };
  private azPrev = 0;
  private shownFov = 42;
  private w = 1;
  private h = 1;
  private running = false;
  private v = {
    camUp: new THREE.Vector3(0, 0, 1),
    camPos: new THREE.Vector3(),
    camTgt: new THREE.Vector3(),
    pA: new THREE.Vector3(),
    tA: new THREE.Vector3(),
    pB: new THREE.Vector3(),
    tB: new THREE.Vector3(),
    hp: new THREE.Vector3(),
  };
  /** Called after each rendered frame (first call = the model is visible). */
  onFrame: (() => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.add(this.ambient);
    this.dirLight.position.set(3.1, 3.6, 1.7);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    const c = this.dirLight.shadow.camera;
    c.left = -3;
    c.right = 3;
    c.top = 3;
    c.bottom = -3;
    c.near = 0.5;
    c.far = 12;
    this.dirLight.shadow.bias = -0.0016;
    this.scene.add(this.dirLight);
    this.rimLight.position.set(-3, 1.6, -2.5);
    this.scene.add(this.rimLight);
    this.fillLight.position.set(-1.4, 1.1, 3.2);
    this.scene.add(this.fillLight);
    this.coreLight.position.set(0, 0.62, 0);
    this.scene.add(this.coreLight);
  }

  async load(url: string): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(url);
    const root = gltf.scene;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const src = mesh.material as THREE.MeshStandardMaterial;
      const mat = src.clone();
      if (/gold/.test(src.name || "")) {
        mat.emissive = new THREE.Color(0xffc46b);
        mat.emissiveIntensity = 0;
        this.glowMats.push(mat);
      } else {
        mat.emissive = new THREE.Color(0xff9ec2);
        mat.emissiveIntensity = 0;
      }
      mesh.material = mat;
    });
    this.scene.add(root);
    this.makeSets(root);
  }

  private makeSets(model: THREE.Object3D) {
    const up = new THREE.Vector3(0, 1, 0);
    const list: Omit<Petal, "lean">[] = [];
    const add = (name: string, row: Row) => {
      const o = model.getObjectByName(name);
      if (!o) return;
      const base = o.quaternion.clone();
      const tip = up.clone().applyQuaternion(base);
      // tilt axis comes from where the petal sits in the ring, not from its tip:
      // near-vertical petals give a degenerate tip×up cross product
      const radial = new THREE.Vector3(o.position.x, 0, o.position.z);
      if (radial.lengthSq() < 1e-8) radial.set(tip.x, 0, tip.z);
      if (radial.lengthSq() < 1e-8) radial.set(1, 0, 0);
      radial.normalize();
      const axis = new THREE.Vector3().crossVectors(up, radial).normalize();
      const tilt = Math.atan2(new THREE.Vector3(tip.x, 0, tip.z).dot(radial), tip.y);
      list.push({ o, base, axis, tilt, row, q: new THREE.Quaternion() });
    };
    VALUES.forEach((v) => add(`petal_pivot_${v}`, this.rows.outer));
    for (let i = 0; i < 9; i++) add(`petal_pivot_mid_${i}`, this.rows.mid);
    for (let i = 0; i < 12; i++) add(`petal_pivot_inner_${i}`, this.rows.inner);
    for (let i = 0; i < 10; i++) add(`petal_pivot_heart_${i}`, this.rows.heart);
    // calibrate against the pose the GLB was baked at, per row, so lean and jitter survive
    const byRow = new Map<Row, typeof list>();
    for (const p of list) byRow.set(p.row, [...(byRow.get(p.row) ?? []), p]);
    byRow.forEach((items, row) => {
      const avg = items.reduce((s, p) => s + p.tilt, 0) / items.length;
      const t0 = clamp((avg - row.closed) / (row.open - row.closed), 0, 1);
      for (const p of items) this.petals.push({ ...p, lean: p.tilt - rowX(row, t0) });
    });
  }

  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
  }

  set(next: Partial<StageState>) {
    const s = this.state;
    if (next.focus !== undefined && Math.abs(next.focus - s.focus) > 0.01) {
      let to = next.focus;
      // non-adjacent jumps (rail clicks) take the shortest way round the ring
      if (this.shown.focus >= 0 && to >= 0 && Math.abs(to - this.shown.focus) > 1.2) {
        const d = ((((to - this.shown.focus + 2.5) % 5) + 5) % 5) - 2.5;
        to = this.shown.focus + d;
      }
      this.fTween = { from: this.shown.focus, to, t0: performance.now() };
    }
    if (next.shift !== undefined && Math.abs(next.shift - s.shift) > 0.005) {
      this.sTween = { from: this.shown.shift, to: next.shift, t0: performance.now() };
    }
    Object.assign(s, next);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.renderer.setAnimationLoop(() => this.frame());
  }

  stop() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  dispose() {
    this.stop();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) m.dispose();
    });
    this.renderer.dispose();
  }

  private frame() {
    const k = 0.12;
    const { shown, state, v } = this;
    shown.bloom = lerp(shown.bloom, state.bloom, k);
    shown.spin = lerp(shown.spin, state.spin, k);
    shown.exposure = lerp(shown.exposure, state.exposure, k);
    shown.shift = tw(this.sTween);
    shown.focus = tw(this.fTween);

    const b = shown.bloom;
    const e = shown.exposure;
    for (const p of this.petals) {
      const target = rowX(p.row, rowT(p.row, b)) + p.lean;
      p.q.setFromAxisAngle(p.axis, target - p.tilt);
      p.o.quaternion.copy(p.q).multiply(p.base);
    }

    this.ambient.intensity = lerp(0, 0.52, e);
    this.ambient.color.setHSL(lerp(0.62, 0.11, e), lerp(0.35, 0.3, e), lerp(0.42, 0.8, e));
    this.dirLight.intensity = lerp(0, 1.45, e);
    this.dirLight.color.setHSL(lerp(0.6, 0.1, e), lerp(0.3, 0.32, e), lerp(0.6, 0.74, e));
    this.rimLight.intensity = lerp(0, 0.5, e);
    this.fillLight.intensity = lerp(0, 0.34, e);
    this.coreLight.intensity = lerp(0, 4.6, smooth(clamp((b - 0.25) / 0.75, 0, 1))) * Math.min(1, e * 2.2);
    const glow = smooth(clamp((b - 0.35) / 0.65, 0, 1));
    for (const m of this.glowMats) m.emissiveIntensity = glow * 0.42 * Math.min(1, e * 2.2);

    // Act I: a low three-quarter view climbs to look down into the opening bloom.
    const bs = smooth(clamp((b - REST) / (1 - REST), 0, 1));
    const azA = lerp(-0.22 + shown.spin * 0.6, 0, bs);
    v.tA.set(0, lerp(0.4, 0.66, bs), 0);
    orbit(v.pA, v.tA, azA, lerp(0.1, 1.03, bs), lerp(6.9, 3.55, bs));
    // Petal acts: a plan view straight overhead, rolled so the focused petal points up.
    const f = shown.focus < 0 ? 0 : shown.focus;
    const a2 = clamp(shown.focus + 1, 0, 1);
    const fm = ((f % 5) + 5) % 5;
    const azB = (this.azPrev = unwrap(fm * ((Math.PI * 2) / 5) + pick(V_AZ, fm), this.azPrev));
    v.tB.set(Math.sin(azB) * 0.58, 0.55, Math.cos(azB) * 0.58);
    orbit(v.pB, v.tB, azB, TOP, pick(V_RAD, fm));
    v.camPos.copy(v.pA).lerp(v.pB, a2);
    v.camTgt.copy(v.tA).lerp(v.tB, a2);
    v.camUp.set(-Math.cos(azB) * a2, 1 - a2, Math.sin(azB) * a2);
    if (v.camUp.lengthSq() < 1e-6) v.camUp.set(0, 1, 0);
    this.camera.up.copy(v.camUp.normalize());
    // Narrow (portrait) screens pull the camera back so the whole bloom stays in frame.
    const portrait = this.w / this.h < 0.8 ? lerp(1, 1.35, clamp((0.8 - this.w / this.h) / 0.35, 0, 1)) : 1;
    const fov = lerp(42, 36, a2) * portrait;
    if (Math.abs(fov - this.shownFov) > 0.01) {
      this.shownFov = fov;
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.copy(v.camPos);
    this.camera.lookAt(v.camTgt);
    this.camera.translateX(shown.shift);
    this.renderer.render(this.scene, this.camera);

    v.hp.set(0, 0.62, 0);
    const dist = this.camera.position.distanceTo(v.hp);
    v.hp.project(this.camera);
    this.heart.x = (v.hp.x * 0.5 + 0.5) * this.w;
    this.heart.y = (-v.hp.y * 0.5 + 0.5) * this.h;
    this.heart.size = 0.95 * (this.h / (2 * Math.tan((this.camera.fov * Math.PI) / 360) * Math.max(0.001, dist)));
    this.onFrame?.();
  }
}
