import { SPRITES, sombra } from './sprites.js';
import { ETAPAS } from './data.js';

const TAU = Math.PI * 2;
const MAX_VISUALES = 40; // honguitos dibujados por tipo (el número real puede ser enorme)
const MAX_PARTICULAS = 260;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, k) => a + (b - a) * k;

export function crearEscena(canvas) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1, m = 0;
  let fondo = null;
  let t = 0;

  const madre = { x: 0, y: 0, s: 0, sTarget: 0, pulso: 0 };
  const visuales = []; // honguitos en pantalla
  const particulas = [];

  function pintarFondo() {
    fondo = document.createElement("canvas");
    fondo.width = Math.ceil(w * dpr);
    fondo.height = Math.ceil(h * dpr);
    const g = fondo.getContext("2d");
    g.scale(dpr, dpr);
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#c9eeb0");
    grad.addColorStop(0.45, "#8fd081");
    grad.addColorStop(1, "#4fa062");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    const halo = g.createRadialGradient(madre.x, madre.y - m * 0.1, 0, madre.x, madre.y - m * 0.1, m * 0.7);
    halo.addColorStop(0, "rgba(255,255,220,0.35)");
    halo.addColorStop(1, "rgba(255,255,220,0)");
    g.fillStyle = halo;
    g.fillRect(0, 0, w, h);

    const r = rng(7);
    g.lineCap = "round";
    const matas = Math.floor((w * h) / 2600);
    for (let i = 0; i < matas; i++) {
      const x = r() * w, y = r() * h, k = 0.6 + (y / h) * 0.9;
      g.strokeStyle = `rgba(${40 + r() * 40},${110 + r() * 50},${50 + r() * 30},0.5)`;
      g.lineWidth = 1.4 * k;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 3 * k, y - 7 * k);
      g.moveTo(x, y);
      g.lineTo(x + 3 * k, y - 8 * k);
      g.stroke();
    }
    const colores = ["#fff7c2", "#ffd1e3", "#ffffff", "#d6c8ff"];
    const flores = Math.floor((w * h) / 22000);
    for (let i = 0; i < flores; i++) {
      const x = r() * w, y = r() * h, k = 0.7 + (y / h) * 0.7;
      g.fillStyle = colores[Math.floor(r() * colores.length)];
      for (let p = 0; p < 5; p++) {
        g.beginPath();
        g.arc(x + Math.cos((p * TAU) / 5) * 3 * k, y + Math.sin((p * TAU) / 5) * 3 * k, 2.2 * k, 0, TAU);
        g.fill();
      }
      g.fillStyle = "#f2b33d";
      g.beginPath();
      g.arc(x, y, 1.8 * k, 0, TAU);
      g.fill();
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    m = Math.min(w, h);
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);
    madre.x = w / 2;
    madre.y = h * 0.56;
    pintarFondo();
  }

  // Posición de reposo del honguito i: espiral áurea sobre una corona elíptica entre
  // el hongo madre y los bordes de la pantalla. El radio se mapea contra
  // MAX_VISUALES, así que los primeros quedan cerca del madre y el resto va
  // llenando hacia afuera sin salirse de pantalla ni mover a los anteriores.
  function hogar(i) {
    const sh = m * 0.04;
    const cy = madre.y - madre.s * 0.7;
    const rx0 = madre.s * 1.2 + sh * 1.2;
    const ry0 = madre.s * 1.55 + sh;
    const margen = sh * 1.5;
    const RX = Math.max(rx0 + sh * 2, w / 2 - margen);
    const RY = Math.max(ry0 + sh * 2, Math.min(cy - h * 0.2, h - margen * 1.5 - cy));
    const u = Math.sqrt((i + 0.5) / MAX_VISUALES);
    const a = i * 2.399963 + 0.6;
    return {
      x: madre.x + Math.cos(a) * (rx0 + (RX - rx0) * u),
      y: cy + Math.sin(a) * (ry0 + (RY - ry0) * u) + sh * 0.5,
    };
  }

  function sincronizarVisuales(state) {
    const n = Math.min(state.honguitos.basico || 0, MAX_VISUALES);
    while (visuales.length < n) {
      const i = visuales.length;
      const p = hogar(i);
      visuales.push({
        tipo: "basico",
        i,
        x: madre.x, // los nuevos brotan desde el hongo madre
        y: madre.y - madre.s * 0.2,
        hx: p.x,
        hy: p.y,
        fase: Math.random() * TAU,
        emite: 1 + Math.random() * 2,
        salto: 0,
        brota: 0,
      });
    }
  }

  function emitirEspora(v) {
    if (particulas.length >= MAX_PARTICULAS) return;
    const s = m * 0.04;
    particulas.push({
      tipo: "viaje",
      x0: v.x,
      y0: v.y - s * 1.8,
      x1: madre.x + (Math.random() - 0.5) * madre.s * 0.6,
      y1: madre.y - madre.s * 1.5,
      t: 0,
      dur: 1.1 + Math.random() * 0.5,
      arco: m * (0.08 + Math.random() * 0.08),
    });
    v.salto = 1;
  }

  function motas(x, y, n) {
    for (let i = 0; i < n && particulas.length < MAX_PARTICULAS; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = m * (0.05 + Math.random() * 0.09);
      particulas.push({
        tipo: "mota",
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        t: 0,
        dur: 0.9 + Math.random() * 0.8,
      });
    }
  }

  function update(dt, state, etapa) {
    t += dt;
    madre.sTarget = m * 0.1 * ETAPAS[etapa].escala;
    if (madre.s === 0) madre.s = madre.sTarget;
    const creciendo = Math.abs(madre.sTarget - madre.s) > 0.3;
    madre.s = lerp(madre.s, madre.sTarget, 1 - Math.exp(-dt * 3));
    madre.pulso = Math.max(0, madre.pulso - dt * 4);

    sincronizarVisuales(state);
    for (const v of visuales) {
      if (creciendo) {
        const p = hogar(v.i);
        v.hx = p.x;
        v.hy = p.y;
      }
      v.brota = Math.min(1, v.brota + dt * 2.5);
      const k = 1 - Math.exp(-dt * 5);
      v.x = lerp(v.x, v.hx, k);
      v.y = lerp(v.y, v.hy, k);
      v.salto = Math.max(0, v.salto - dt * 3.5);
      v.emite -= dt;
      if (v.emite <= 0 && v.brota > 0.8) {
        emitirEspora(v);
        v.emite = 2 + Math.random() * 2.2;
      }
    }

    // motas ambientales del hongo madre
    if (Math.random() < dt * (1.2 + etapa * 0.8)) motas(madre.x + (Math.random() - 0.5) * madre.s, madre.y - madre.s * 1.7, 1);

    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i];
      p.t += dt;
      if (p.t >= p.dur) {
        if (p.tipo === "viaje") {
          madre.pulso = Math.min(1, madre.pulso + 0.45);
          motas(p.x1, p.y1, 2);
        }
        particulas.splice(i, 1);
        continue;
      }
      if (p.tipo === "mota") {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += m * 0.03 * dt;
      }
    }
  }

  function esporaEn(p) {
    const k = p.t / p.dur;
    const e = k * k * (3 - 2 * k);
    const cx = (p.x0 + p.x1) / 2;
    const cy = Math.min(p.y0, p.y1) - p.arco;
    const u = 1 - e;
    return {
      x: u * u * p.x0 + 2 * u * e * cx + e * e * p.x1,
      y: u * u * p.y0 + 2 * u * e * cy + e * e * p.y1,
      k,
    };
  }

  function brillo(x, y, r, a, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${a})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(fondo, 0, 0, w, h);

    // honguitos y hongo madre ordenados por profundidad (y)
    const cola = visuales.map((v) => ({ y: v.y, v }));
    cola.push({ y: madre.y, madre: true });
    cola.sort((a, b) => a.y - b.y);
    const sh = m * 0.04;
    for (const it of cola) {
      if (it.madre) {
        sombra(ctx, madre.x, madre.y + 2, madre.s * 1.1, madre.s * 0.3);
        SPRITES.madre(ctx, madre.x, madre.y, madre.s, {
          aplasta: 1 + madre.pulso * 0.07 - Math.sin(t * 1.6) * 0.012,
          balanceo: Math.sin(t * 0.9) * 0.015,
        });
      } else {
        const v = it.v;
        const e = v.brota * v.brota * (3 - 2 * v.brota);
        const rebote = v.salto > 0 ? Math.sin(v.salto * Math.PI) * sh * 0.8 : 0;
        sombra(ctx, v.x, v.y + 1, sh * 1.0 * e, sh * 0.28 * e, 0.16);
        SPRITES[v.tipo](ctx, v.x, v.y - rebote, sh * e, {
          aplasta: 1 + Math.sin(t * 2.4 + v.fase) * 0.03 - (v.salto > 0.7 ? 0.1 : 0),
          balanceo: Math.sin(t * 1.3 + v.fase) * 0.04,
        });
      }
    }

    // partículas encima
    for (const p of particulas) {
      if (p.tipo === "viaje") {
        const q = esporaEn(p);
        brillo(q.x, q.y, 9, 0.55, "255,247,170");
        ctx.fillStyle = "#fffbe0";
        ctx.beginPath();
        ctx.arc(q.x, q.y, 2.6, 0, TAU);
        ctx.fill();
      } else {
        const k = p.t / p.dur;
        brillo(p.x, p.y, 6, 0.6 * (1 - k), "255,247,190");
      }
    }
  }

  // Devuelve "madre", "honguito" (con el índice) o null.
  function toque(px, py) {
    const dx = px - madre.x;
    const dy = py - (madre.y - madre.s * 1.05);
    if (dx * dx + dy * dy < (madre.s * 1.3) ** 2) return { quien: "madre" };
    const sh = m * 0.04;
    for (let i = visuales.length - 1; i >= 0; i--) {
      const v = visuales[i];
      const ddx = px - v.x;
      const ddy = py - (v.y - sh);
      if (ddx * ddx + ddy * ddy < (sh * 1.6) ** 2) {
        v.salto = 1;
        return { quien: "honguito", v };
      }
    }
    return null;
  }

  function pulsoMadre() {
    madre.pulso = 1;
    motas(madre.x, madre.y - madre.s * 1.6, 10);
  }

  return { resize, update, draw, toque, pulsoMadre };
}
