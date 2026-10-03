// Escena 2D vista lateral en pixel art.
// Todo se dibuja en un buffer chico (1 celda = 1 píxel del arte) y se escala con
// un factor entero y sin suavizado, así los sprites nunca se ven borrosos.
import { ETAPAS } from './data.js';

const MAX_VISUALES = 24; // honguitos dibujados (el número real puede ser enorme)
const MAX_PARTICULAS = 220;
const ANCHO_REF = 390; // celdas del lado corto de la pantalla
const GROSOR_PASTO = 46;
const CARRILES = [10, 22, 34]; // y de los pies bajo el borde del pasto (profundidad)

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
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mezcla = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));

export function crearEscena(canvas, assets) {
  const ctx = canvas.getContext("2d");
  const lo = document.createElement("canvas"); // buffer en celdas
  const g = lo.getContext("2d");
  let dpr = 1, S = 1, Wc = 0, Hc = 0, extra = 0, groundY = 0;
  let cielo = null, frente = null;
  let t = 0, cam = 0, etapaPrev = null, inicial = true;

  const madre = { x: 0, pulso: 0 };
  const visuales = [];
  const particulas = [];
  const nubes = [];

  // ---------- fondo ----------
  function pino(c, x, base, h, col, luz, tronco) {
    const tw = Math.max(3, Math.round(h / 24));
    const th = Math.round(h * 0.12);
    c.fillStyle = rgb(tronco);
    c.fillRect(Math.round(x - tw / 2), base - th, tw, th);
    const y0 = base - Math.round(h * 0.08), y1 = base - h;
    const maxW = h * 0.34, n = 4 + Math.round(h / 45);
    for (let y = y0; y > y1; y -= 2) {
      const f = (y0 - y) / (y0 - y1);
      const saw = (f * n) % 1;
      const w = Math.max(2, Math.round(maxW * (1 - f) * (0.5 + 0.5 * (1 - saw))));
      c.fillStyle = rgb(col);
      c.fillRect(Math.round(x - w), y, w * 2, 2);
      if (saw > 0.78 || saw < 0.08) {
        c.fillStyle = rgb(luz);
        c.fillRect(Math.round(x - w), y, Math.max(2, Math.round(w * 0.5)), 2);
      }
    }
  }

  function montañas(c, r, base, amp, col, paso) {
    const f1 = 0.011 + r() * 0.006, f2 = 0.031 + r() * 0.01, p1 = r() * 9, p2 = r() * 9;
    c.fillStyle = rgb(col);
    for (let x = 0; x < Wc; x += paso) {
      const hgt = amp * (0.55 + 0.3 * Math.sin(x * f1 + p1) + 0.18 * Math.sin(x * f2 + p2)) + r() * 3;
      const y = base - Math.round(hgt / 3) * 3;
      c.fillRect(x, y, paso, base - y);
    }
  }

  function pintarFondo() {
    const r = rng(11);
    const H = Hc + extra;
    // cielo
    cielo = document.createElement("canvas");
    cielo.width = Wc; cielo.height = H;
    const s = cielo.getContext("2d");
    const top = [112, 142, 142], bot = [196, 212, 196];
    const banda = 7;
    for (let y = 0; y < groundY; y += banda) {
      s.fillStyle = rgb(mezcla(top, bot, Math.pow(y / groundY, 0.85)));
      s.fillRect(0, y, Wc, banda);
    }
    s.fillStyle = rgb(bot);
    s.fillRect(0, groundY - 2, Wc, H);

    // frente (transparente donde se ve el cielo)
    frente = document.createElement("canvas");
    frente.width = Wc; frente.height = H;
    const c = frente.getContext("2d");
    montañas(c, r, groundY - 6, Hc * 0.2, [150, 172, 172], 3);
    montañas(c, r, groundY - 2, Hc * 0.15, [126, 154, 152], 3);
    // bruma
    for (let i = 0; i < 5; i++) {
      c.fillStyle = `rgba(226,236,226,${0.1})`;
      c.fillRect(0, groundY - 70 + i * 12, Wc, 12 * (5 - i) * 0.4 + 8);
    }
    // pinos lejanos
    for (let x = -10; x < Wc + 20; x += 22 + Math.floor(r() * 26)) {
      pino(c, x, groundY + 2, 56 + r() * 60, [86, 124, 118], [104, 142, 134], [70, 90, 84]);
    }
    c.fillStyle = "rgba(226,236,226,0.22)";
    c.fillRect(0, groundY - 40, Wc, 44);
    // pinos grandes
    pino(c, Wc * 0.1, groundY + 4, Math.min(Hc * 0.36, 300), [38, 112, 80], [62, 150, 98], [94, 52, 34]);
    pino(c, Wc * 0.97, groundY + 4, Math.min(Hc * 0.3, 250), [38, 112, 80], [62, 150, 98], [94, 52, 34]);
    // roca clara
    c.fillStyle = "rgb(168,182,190)";
    c.fillRect(Wc * 0.74, groundY - 14, 40, 16);
    c.fillRect(Wc * 0.74 + 6, groundY - 22, 26, 10);
    c.fillStyle = "rgb(204,214,220)";
    c.fillRect(Wc * 0.74 + 6, groundY - 22, 14, 4);
    c.fillRect(Wc * 0.74, groundY - 14, 10, 4);

    // pasto
    c.fillStyle = "rgb(66,142,86)";
    c.fillRect(0, groundY, Wc, GROSOR_PASTO);
    c.fillStyle = "rgb(96,176,98)";
    c.fillRect(0, groundY, Wc, 4);
    const rp = rng(5);
    for (let i = 0; i < (Wc * GROSOR_PASTO) / 90; i++) {
      const x = Math.floor(rp() * Wc), y = groundY + 6 + Math.floor(rp() * (GROSOR_PASTO - 8));
      c.fillStyle = rp() < 0.5 ? "rgb(56,126,78)" : "rgb(82,158,92)";
      c.fillRect(x, y, 3 + Math.floor(rp() * 4), 2);
    }
    for (let x = 0; x < Wc; x += 3) {
      const h = 2 + Math.floor(rp() * 4);
      c.fillStyle = rp() < 0.3 ? "rgb(120,196,108)" : "rgb(76,156,92)";
      c.fillRect(x, groundY - h, 1, h);
    }
    const flores = ["rgb(255,244,190)", "rgb(255,196,214)", "rgb(255,255,255)", "rgb(214,200,255)"];
    for (let i = 0; i < Wc / 14; i++) {
      const x = Math.floor(rp() * Wc), y = groundY + 8 + Math.floor(rp() * (GROSOR_PASTO - 10));
      c.fillStyle = flores[Math.floor(rp() * flores.length)];
      c.fillRect(x, y - 1, 1, 3); c.fillRect(x - 1, y, 3, 1);
      c.fillStyle = "rgb(242,179,61)";
      c.fillRect(x, y, 1, 1);
    }
    // tierra
    const ys = groundY + GROSOR_PASTO;
    c.fillStyle = "rgb(58,46,52)";
    c.fillRect(0, ys, Wc, H - ys);
    c.fillStyle = "rgb(40,32,40)";
    c.fillRect(0, ys, Wc, 4);
    for (let i = 0; i < (Wc * (H - ys)) / 420; i++) {
      const x = Math.floor(rp() * Wc), y = ys + 6 + Math.floor(rp() * (H - ys - 6));
      const w = 6 + Math.floor(rp() * 14), h = 4 + Math.floor(rp() * 6);
      c.fillStyle = rp() < 0.55 ? "rgb(72,58,64)" : "rgb(46,36,44)";
      c.fillRect(x, y, w, h);
      c.fillRect(x + 2, y - 2, Math.max(2, w - 4), 2);
    }
    for (let y = ys; y < H; y += 8) {
      c.fillStyle = `rgba(20,14,24,${Math.min(0.5, ((y - ys) / (H - ys)) * 0.5)})`;
      c.fillRect(0, y, Wc, 8);
    }

    nubes.length = 0;
    for (let i = 0; i < 5; i++) {
      nubes.push({ x: (Wc / 5) * i + r() * 40, y: groundY * (0.1 + r() * 0.45), w: 50 + r() * 70, v: 1.2 + r() * 2 });
    }
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    S = Math.max(1, Math.round((dpr * Math.min(cw, ch)) / ANCHO_REF));
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    Wc = Math.ceil(canvas.width / S);
    Hc = Math.ceil(canvas.height / S);
    lo.width = Wc; lo.height = Hc;
    extra = Math.round(Hc * 0.14);
    groundY = Math.round(Hc * 0.58);
    madre.x = Math.round(Wc / 2);
    pintarFondo();
  }

  // ---------- helpers de entidades ----------
  const pies = (carril) => groundY + CARRILES[carril];
  const madreY = () => groundY + 16;

  function nuevoVisual(i, desdePuerta) {
    const carril = i % CARRILES.length;
    const mw = assets.madre[etapaPrev ?? 0].width;
    const margen = 40;
    let x = margen + Math.random() * (Wc - margen * 2);
    if (desdePuerta) x = madre.x + (Math.random() - 0.5) * 24;
    const v = {
      i, carril, x, dx: 0, hop: 0, hopT: 1, hopDur: 0.34, x0: x, x1: x,
      reposo: Math.random() * 1.5,
      entrega: 4 + Math.random() * 6,
      yendoAEntregar: false,
      alfa: desdePuerta ? 0 : 1,
    };
    return v;
  }

  function sincronizarVisuales(state) {
    const n = Math.min(state.honguitos.basico || 0, MAX_VISUALES);
    while (visuales.length < n) {
      visuales.push(nuevoVisual(visuales.length, !inicial));
    }
    inicial = false;
  }

  function saltar(v, hacia) {
    const d = Math.max(-26, Math.min(26, hacia - v.x));
    v.x0 = v.x;
    v.x1 = v.x + d;
    v.hopT = 0;
    v.hopDur = 0.3 + Math.random() * 0.1;
  }

  function mitadMadre() {
    return assets.madre[etapaPrev ?? 0].width / 2;
  }

  function emitirEspora(v) {
    if (particulas.length >= MAX_PARTICULAS) return;
    const img = assets.madre[etapaPrev ?? 0];
    particulas.push({
      tipo: "viaje",
      x0: v.x, y0: pies(v.carril) - assets.honguito.height - 4,
      x1: madre.x + (Math.random() - 0.5) * img.width * 0.4,
      y1: madreY() - img.height * 0.7,
      t: 0, dur: 1.0 + Math.random() * 0.4,
      arco: 30 + Math.random() * 30,
    });
  }

  function motas(x, y, n, fuerza = 1) {
    for (let i = 0; i < n && particulas.length < MAX_PARTICULAS; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const v = (18 + Math.random() * 40) * fuerza;
      particulas.push({ tipo: "mota", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, dur: 0.8 + Math.random() * 0.9 });
    }
  }

  // ---------- update ----------
  function update(dt, state, etapa, alturaHojaCss = 0) {
    t += dt;
    if (etapaPrev === null) etapaPrev = etapa;
    if (etapa !== etapaPrev) {
      etapaPrev = etapa;
      madre.pulso = 1;
      motas(madre.x, madreY() - assets.madre[etapa].height * 0.6, 50, 1.6);
    }
    madre.pulso = Math.max(0, madre.pulso - dt * 3.5);

    // cámara: sube la escena para que el panel no tape el prado
    const hojaC = (alturaHojaCss * dpr) / S;
    const objetivo = Math.max(0, Math.min(extra, groundY + 42 - (Hc - hojaC)));
    cam += (objetivo - cam) * (1 - Math.exp(-dt * 6));

    sincronizarVisuales(state);
    const mHalf = mitadMadre();
    for (const v of visuales) {
      v.alfa = Math.min(1, v.alfa + dt * 3);
      if (v.hopT < 1) {
        v.hopT = Math.min(1, v.hopT + dt / v.hopDur);
        v.x = v.x0 + (v.x1 - v.x0) * v.hopT;
        v.hop = Math.sin(v.hopT * Math.PI) * 7;
        continue;
      }
      v.hop = 0;
      v.entrega -= dt;
      v.reposo -= dt;
      if (v.reposo > 0) continue;

      if (v.yendoAEntregar) {
        const meta = madre.x + (v.i % 2 ? -1 : 1) * (6 + (v.i % 5) * 4);
        if (Math.abs(meta - v.x) < 3) {
          v.yendoAEntregar = false;
          v.entrega = 6 + Math.random() * 6;
          v.reposo = 0.6 + Math.random();
          emitirEspora(v);
        } else {
          saltar(v, meta);
          v.reposo = 0.05 + Math.random() * 0.15;
        }
        continue;
      }
      if (v.entrega <= 0) {
        v.yendoAEntregar = true;
        continue;
      }
      // pasear
      let meta = v.x + (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 70);
      meta = Math.max(24, Math.min(Wc - 24, meta));
      if (v.carril === 0 && Math.abs(meta - madre.x) < mHalf - 8) meta = madre.x + Math.sign(meta - madre.x || 1) * (mHalf + 14);
      saltar(v, meta);
      v.reposo = Math.random() < 0.35 ? 0.9 + Math.random() * 2 : 0.1 + Math.random() * 0.4;
    }

    // nubes y motas ambientales
    for (const n of nubes) {
      n.x += n.v * dt;
      if (n.x > Wc + 20) n.x = -n.w - 20;
    }
    if (Math.random() < dt * 1.5) motas(Math.random() * Wc, groundY + 10, 1, 0.5);

    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i];
      p.t += dt;
      if (p.t >= p.dur) {
        if (p.tipo === "viaje") {
          madre.pulso = Math.min(1, madre.pulso + 0.5);
          motas(p.x1, p.y1, 4);
        }
        particulas.splice(i, 1);
        continue;
      }
      if (p.tipo === "mota") {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 22 * dt;
      }
    }
  }

  // ---------- draw ----------
  function nube(n) {
    const x = Math.round(n.x), y = Math.round(n.y), w = Math.round(n.w);
    g.fillStyle = "rgba(236,242,238,0.8)";
    g.fillRect(x, y + 10, w, 8);
    g.fillRect(x + 8, y + 4, w - 22, 8);
    g.fillRect(x + 20, y, Math.max(8, w - 50), 6);
    g.fillStyle = "rgba(200,214,210,0.7)";
    g.fillRect(x + 4, y + 16, w - 8, 3);
  }

  function sombra(x, y, w) {
    g.fillStyle = "rgba(20,40,24,0.28)";
    g.fillRect(Math.round(x - w / 2), Math.round(y) - 1, w, 3);
    g.fillRect(Math.round(x - w / 2) + 3, Math.round(y) + 2, w - 6, 2);
  }

  function draw() {
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, Wc, Hc);
    const oy = -Math.round(cam);
    g.drawImage(cielo, 0, oy);
    for (const n of nubes) nube({ ...n, y: n.y + oy });
    g.drawImage(frente, 0, oy);
    g.save();
    g.translate(0, oy);

    const cola = visuales.map((v) => ({ y: pies(v.carril), v }));
    cola.push({ y: madreY(), madre: true });
    cola.sort((a, b) => a.y - b.y);
    const hw = assets.honguito.width, hh = assets.honguito.height;
    for (const it of cola) {
      if (it.madre) {
        const img = assets.madre[etapaPrev ?? 0];
        const sq = Math.round(madre.pulso * 3);
        const dh = img.height - sq;
        sombra(madre.x, madreY(), img.width - 10);
        g.drawImage(img, Math.round(madre.x - img.width / 2), madreY() - dh, img.width, dh);
      } else {
        const v = it.v;
        const fy = pies(v.carril);
        g.globalAlpha = v.alfa;
        sombra(v.x, fy, 30 - Math.round(v.hop * 0.6));
        g.drawImage(assets.honguito, Math.round(v.x - hw / 2), Math.round(fy - hh - v.hop));
        g.globalAlpha = 1;
      }
    }

    for (const p of particulas) {
      if (p.tipo === "viaje") {
        const k = p.t / p.dur, e = k * k * (3 - 2 * k), u = 1 - e;
        const cx = (p.x0 + p.x1) / 2, cy = Math.min(p.y0, p.y1) - p.arco;
        const x = u * u * p.x0 + 2 * u * e * cx + e * e * p.x1;
        const y = u * u * p.y0 + 2 * u * e * cy + e * e * p.y1;
        g.fillStyle = "rgba(255,245,170,0.35)";
        g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 6, 6);
        g.fillStyle = "rgb(255,252,224)";
        g.fillRect(Math.round(x), Math.round(y), 2, 2);
      } else {
        const k = p.t / p.dur;
        g.fillStyle = `rgba(255,248,196,${0.9 * (1 - k)})`;
        const s = k < 0.5 ? 2 : 1;
        g.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      }
    }
    g.restore();

    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lo, 0, 0, Wc * S, Hc * S);
  }

  // ---------- toques ----------
  function toque(px, py) {
    const cx = (px * dpr) / S;
    const cy = (py * dpr) / S + Math.round(cam);
    const img = assets.madre[etapaPrev ?? 0];
    if (cx > madre.x - img.width / 2 && cx < madre.x + img.width / 2 && cy > madreY() - img.height && cy < madreY()) {
      return { quien: "madre" };
    }
    for (let i = visuales.length - 1; i >= 0; i--) {
      const v = visuales[i];
      const fy = pies(v.carril);
      if (Math.abs(cx - v.x) < assets.honguito.width / 2 && cy > fy - assets.honguito.height && cy < fy + 2) {
        if (v.hopT >= 1) {
          v.x0 = v.x; v.x1 = v.x; v.hopT = 0; v.hopDur = 0.3;
        }
        return { quien: "honguito", v };
      }
    }
    return null;
  }

  function pulsoMadre() {
    madre.pulso = 1;
    motas(madre.x, madreY() - assets.madre[etapaPrev ?? 0].height * 0.7, 12);
  }

  return { resize, update, draw, toque, pulsoMadre };
}
