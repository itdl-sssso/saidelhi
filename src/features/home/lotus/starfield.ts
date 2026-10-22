// Sky layer (port of docs/design/wireframes/starfield.js): a twinkling starfield over the
// night that gives way to drifting pink petals once the lotus has opened.

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

type Star = { x: number; y: number; r: number; a: number; sp: number; ph: number; dx: number; dy: number; hue: number };
type FallingPetal = {
  x: number;
  y: number;
  L: number;
  a: number;
  vy: number;
  sway: number;
  swaySp: number;
  ph: number;
  rot: number;
  rotSp: number;
  hue: number;
  sat: number;
  lig: number;
};

export class Starfield {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private stars: Star[] = [];
  private petals: FallingPetal[] = [];
  private raf = 0;
  private target = { dawn: 0, petals: 0 };
  private shown = { dawn: 0, petals: 0 };

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
  }

  resize(w: number, h: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.stars = [];
    this.petals = [];
    const ns = Math.round(Math.min(300, (w * h) / 4200));
    for (let i = 0; i < ns; i++) {
      const near = Math.random() < 0.16;
      this.stars.push({
        x: rnd(0, w),
        y: rnd(0, h),
        r: near ? rnd(1.1, 1.8) : rnd(0.35, 1),
        a: rnd(0.3, 0.95),
        sp: rnd(0.35, 1.5),
        ph: rnd(0, Math.PI * 2),
        dx: rnd(-0.006, 0.006),
        dy: rnd(0.002, 0.012),
        hue: Math.random() < 0.22 ? rnd(24, 44) : rnd(200, 224),
      });
    }
    const np = Math.round(Math.min(90, (w * h) / 14000));
    for (let i = 0; i < np; i++) this.petals.push(this.newPetal(rnd(-h * 0.2, h)));
  }

  set(next: Partial<{ dawn: number; petals: number }>) {
    Object.assign(this.target, next);
  }

  start() {
    if (this.raf) return;
    const loop = (t: number) => {
      this.draw(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private newPetal(y: number): FallingPetal {
    return {
      x: rnd(0, this.w),
      y,
      L: rnd(5, 11),
      a: rnd(0.35, 0.85),
      vy: rnd(0.16, 0.42),
      sway: rnd(0.25, 0.75),
      swaySp: rnd(0.0006, 0.0016),
      ph: rnd(0, 6.28),
      rot: rnd(0, 6.28),
      rotSp: rnd(-0.006, 0.006),
      hue: rnd(340, 358),
      sat: rnd(38, 64),
      lig: rnd(78, 90),
    };
  }

  private draw(t: number) {
    const { ctx, shown, target, w, h } = this;
    shown.dawn += (target.dawn - shown.dawn) * 0.08;
    shown.petals += (target.petals - shown.petals) * 0.08;
    const sa = Math.max(0, 1 - shown.dawn);
    const pa = shown.petals;
    ctx.clearRect(0, 0, w, h);
    if (sa > 0.004) {
      for (const p of this.stars) {
        p.x += p.dx;
        p.y += p.dy;
        if (p.y > h + 2) {
          p.y = -2;
          p.x = rnd(0, w);
        }
        if (p.x < -2) p.x = w + 2;
        if (p.x > w + 2) p.x = -2;
        const a = p.a * (0.62 + 0.38 * Math.sin(t * 0.001 * p.sp + p.ph)) * sa;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = `hsla(${p.hue.toFixed(0)},70%,${p.hue < 60 ? 84 : 92}%,${a.toFixed(3)})`;
        ctx.fill();
        if (p.r > 1) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3.4, 0, 6.2832);
          ctx.fillStyle = `hsla(${p.hue.toFixed(0)},70%,88%,${(a * 0.09).toFixed(3)})`;
          ctx.fill();
        }
      }
    }
    if (pa > 0.004) {
      for (const p of this.petals) {
        p.y += p.vy;
        p.x += Math.sin(t * p.swaySp + p.ph) * p.sway;
        p.rot += p.rotSp;
        if (p.y > h + 16) Object.assign(p, this.newPetal(-16));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(0.55 + 0.45 * Math.abs(Math.cos(p.rot * 0.9)), 1);
        const W = p.L * 0.62;
        ctx.beginPath();
        ctx.moveTo(0, -p.L);
        ctx.bezierCurveTo(W, -p.L * 0.45, W * 0.72, p.L * 0.5, 0, p.L);
        ctx.bezierCurveTo(-W * 0.72, p.L * 0.5, -W, -p.L * 0.45, 0, -p.L);
        ctx.closePath();
        ctx.fillStyle = `hsla(${p.hue.toFixed(0)},${p.sat.toFixed(0)}%,${p.lig.toFixed(0)}%,${(p.a * pa).toFixed(3)})`;
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
