// Escena 2D vista lateral, estilo minimalista: fondo azul noche plano, contornos blancos,
// manchitas de colores. Todo se dibuja con formas simples en un buffer chico (1 celda = 1 píxel
// del arte) y se escala con un factor entero sin suavizado. No hay sprites ni fotogramas:
// los honguitos son un bitmap diminuto que se mueve con rebotes y estiramientos por código.

const MAX_VISUALES = 28; // honguitos dibujados (el número real puede ser enorme)
const MAX_PARTICULAS = 300;
const ANCHO_REF = 300; // celdas del lado corto de la pantalla
const VEL = 28; // celdas/seg al caminar
const TAU = Math.PI * 2;

const BG = "#272736";
const BG_SUELO = "#1d1d2a";
const COL_COLINA = ["#2d2d40", "#33334a"];
const BLANCO = "#fff";
const PALETA = ["#ff6fb5", "#2eaaf5", "#b5e61d", "#ff5a14", "#3fe08a", "#fadc28", "#ffffff"];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const suave = (k) => k * k * (3 - 2 * k);

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

// Honguito: c = sombrero (color), w = cuerpo blanco, e = ojo. Dos poses de patitas.
const HW = 9, HH = 9;
const HONGO = [
  "..ccccc..",
  ".ccccccc.",
  "ccccccccc",
  "ccccccccc",
  ".wwwwwww.",
  ".wewwwew.",
  ".wwwwwww.",
  ".wwwwwww.",
];
const PATAS = [".ww...ww.", "..ww.ww.."];

// medidas del hongo madre por etapa: ancho del sombrero, alto del sombrero, ancho y alto del tallo
const MADRE = [
  { w: 30, ch: 17, sw: 14, sh: 12 },
  { w: 46, ch: 26, sw: 20, sh: 18 },
  { w: 66, ch: 38, sw: 28, sh: 26 },
  { w: 92, ch: 54, sw: 38, sh: 36 },
];

export function crearEscena(canvas) {
  const ctx = canvas.getContext("2d");
  const lo = document.createElement("canvas");
  const g = lo.getContext("2d");
  let dpr = 1, S = 1, Wc = 0, Hc = 0, groundY = 0;
  let fondo = null;
  let t = 0, etapaPrev = null, inicial = true, flash = 0;

  const madre = { x: 0, pulso: 0, brillo: 0 };
  const visuales = [];
  const particulas = [];
  const flotantes = [];
  const estrellas = [];

  // ---------- sprites de honguito precalculados (un canvas por color y pose) ----------
  const spritesHongo = PALETA.map((col) =>
    [0, 1].map((pose) => {
      const c = document.createElement("canvas");
      c.width = HW; c.height = HH;
      const x = c.getContext("2d");
      const filas = [...HONGO, PATAS[pose]];
      filas.forEach((fila, y) => {
        for (let i = 0; i < HW; i++) {
          const ch = fila[i];
          if (ch === ".") continue;
          x.fillStyle = ch === "c" ? col : ch === "e" ? BG : BLANCO;
          x.fillRect(i, y, 1, 1);
        }
      });
      return c;
    })
  );

  // ---------- primitivas ----------
  function disco(x, y, r, color) {
    g.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.5));
      g.fillRect(Math.round(x) - w, Math.round(y) + dy, w * 2 + 1, 1);
    }
  }
  // media elipse con la base en baseY; `ins` = 1 dibuja el interior de un contorno de 1 celda
  function semi(cx, baseY, rx, ry, color, ins = 0) {
    g.fillStyle = color;
    const ancho = (dy) => Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    for (let dy = ins; dy < ry - ins; dy++) {
      const w = ins ? ancho(dy + 1) - 1 : ancho(dy);
      if (w > 0) g.fillRect(cx - w, baseY - dy - 1, w * 2, 1);
    }
  }
  function aro(cx, cy, r, color) {
    const n = Math.max(10, Math.round(r * 5));
    g.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
    }
  }

  // ---------- fondo estático: colinas planas, suelo y línea blanca ----------
  function colinas(c, r, base, amp, col) {
    const f1 = 0.008 + r() * 0.005, f2 = 0.02 + r() * 0.008, p1 = r() * 9, p2 = r() * 9;
    c.fillStyle = col;
    for (let x = 0; x < Wc; x += 2) {
      const h = amp * (0.6 + 0.3 * Math.sin(x * f1 + p1) + 0.12 * Math.sin(x * f2 + p2));
      const y = base - Math.round(h);
      c.fillRect(x, y, 2, base - y + 1);
    }
  }

  function pintarFondo() {
    const r = rng(11);
    const H = Hc;
    fondo = document.createElement("canvas");
    fondo.width = Wc; fondo.height = H;
    const c = fondo.getContext("2d");
    c.fillStyle = BG;
    c.fillRect(0, 0, Wc, H);
    colinas(c, r, groundY, Hc * 0.2, COL_COLINA[0]);
    colinas(c, r, groundY, Hc * 0.11, COL_COLINA[1]);
    c.fillStyle = BG_SUELO;
    c.fillRect(0, groundY + 1, Wc, H - groundY);
    c.fillStyle = BLANCO;
    c.fillRect(0, groundY, Wc, 1);

    estrellas.length = 0;
    for (let i = 0; i < 40; i++) estrellas.push({ x: Math.floor(r() * Wc), y: Math.floor(r() * groundY * 0.8), ph: r() * TAU });
    flotantes.length = 0;
    for (let i = 0; i < 70; i++) {
      flotantes.push({
        x: r() * Wc, y: r() * groundY, vy: 1 + r() * 2.5, ax: 3 + r() * 8, sp: 0.3 + r() * 0.5, ph: r() * TAU,
        col: PALETA[Math.floor(r() * PALETA.length)], r: r() < 0.15 ? 2 : 1,
      });
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
    groundY = Math.round(Hc * 0.74);
    madre.x = Math.round(Wc / 2);
    pintarFondo();
  }

  // ---------- entidades ----------
  const medidas = () => MADRE[etapaPrev ?? 0];
  const alturaMadre = () => { const m = medidas(); return m.ch + m.sh; };

  function nuevoVisual(i, desdePuerta) {
    const x = desdePuerta ? madre.x + (Math.random() - 0.5) * 12 : 14 + Math.random() * (Wc - 28);
    return {
      i, x, dir: Math.random() < 0.5 ? -1 : 1, col: i % PALETA.length,
      modo: "idle", animT: Math.random() * 4, espera: desdePuerta ? 0.3 : 0.5 + Math.random() * 2,
      meta: x, entrega: 5 + Math.random() * 7, llevando: false, hop: 0, estira: 0,
      alfa: desdePuerta ? 0 : 1, tDar: 0,
    };
  }

  function sincronizarVisuales(state) {
    const n = Math.min(state.honguitos.basico || 0, MAX_VISUALES);
    while (visuales.length < n) {
      const v = nuevoVisual(visuales.length, !inicial);
      if (!inicial) { motas(v.x, groundY - 6, 6, 0.6, PALETA[v.col]); aroPart(v.x, groundY - 4, 9, 0.4); }
      visuales.push(v);
    }
    inicial = false;
  }

  function part(x, y, vx, vy, extraP) {
    if (particulas.length < MAX_PARTICULAS) particulas.push({ x, y, vx, vy, t: 0, ...extraP });
  }
  function motas(x, y, n, fuerza = 1, col) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.8;
      const v = (14 + Math.random() * 40) * fuerza;
      part(x, y, Math.cos(a) * v, Math.sin(a) * v, {
        tipo: "mota", dur: 0.6 + Math.random() * 0.8, col: col || PALETA[Math.floor(Math.random() * PALETA.length)], r: Math.random() < 0.3 ? 2 : 1,
      });
    }
  }
  function aroPart(x, y, r1, dur = 0.5) { part(x, y, 0, 0, { tipo: "aro", r1, dur }); }

  function emitirEspora(v) {
    const m = medidas();
    part(v.x, groundY - 14, 0, 0, {
      tipo: "viaje", col: PALETA[v.col],
      x0: v.x, y0: groundY - 14,
      x1: madre.x + (Math.random() - 0.5) * m.w * 0.5, y1: groundY - m.sh - m.ch * 0.5,
      dur: 0.8 + Math.random() * 0.3, arco: 20 + Math.random() * 24, estela: 0,
    });
  }

  function puntoViaje(p) {
    const k = p.t / p.dur, e = suave(k), u = 1 - e;
    const cx = (p.x0 + p.x1) / 2, cy = Math.min(p.y0, p.y1) - p.arco;
    return { x: u * u * p.x0 + 2 * u * e * cx + e * e * p.x1, y: u * u * p.y0 + 2 * u * e * cy + e * e * p.y1 };
  }

  // ---------- update ----------
  function update(dt, state, etapa) {
    t += dt;
    if (etapaPrev === null) etapaPrev = etapa;
    if (etapa !== etapaPrev) {
      etapaPrev = etapa;
      const cy = groundY - alturaMadre() * 0.6;
      madre.pulso = 1;
      flash = 1;
      motas(madre.x, cy, 60, 1.8);
      aroPart(madre.x, cy, 90, 0.9);
      setTimeout(() => aroPart(madre.x, cy, 60, 0.7), 160);
    }
    madre.pulso = Math.max(0, madre.pulso - dt * 3);
    madre.brillo = Math.max(0, madre.brillo - dt * 2);
    flash = Math.max(0, flash - dt * 2);

    sincronizarVisuales(state);
    const mHalf = medidas().w / 2;
    for (const v of visuales) {
      v.alfa = Math.min(1, v.alfa + dt * 2.5);
      v.animT += dt;
      v.hop = 0;
      v.estira = 0;
      if (v.modo === "idle") {
        v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
        v.espera -= dt;
        if (v.espera <= 0) {
          if (v.entrega <= 0) {
            v.llevando = true;
            v.meta = madre.x + (v.i % 2 ? -1 : 1) * (mHalf * 0.2 + (v.i % 5) * 3);
            v.dir = Math.sign(v.meta - v.x) || 1;
            v.modo = "walk";
          } else if (Math.random() < 0.2) {
            v.modo = "salto"; v.animT = 0;
          } else {
            const meta = clamp(v.x + (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 70), 12, Wc - 12);
            v.meta = meta;
            v.dir = Math.sign(meta - v.x) || 1;
            v.modo = "walk";
          }
        }
      } else if (v.modo === "walk") {
        v.hop = Math.abs(Math.sin(v.animT * 11)) * 1.5;
        const d = v.meta - v.x;
        const paso = VEL * dt;
        if (Math.abs(d) <= paso) {
          v.x = v.meta;
          if (v.llevando) { v.modo = "dar"; v.tDar = 0; }
          else { v.modo = "idle"; v.espera = Math.random() < 0.3 ? 0.4 : 1 + Math.random() * 3; }
        } else v.x += Math.sign(d) * paso;
      } else if (v.modo === "dar") {
        v.tDar += dt;
        v.hop = Math.abs(Math.sin(v.tDar * 8)) * 2;
        if (v.tDar > 0.7) {
          v.llevando = false;
          v.entrega = 7 + Math.random() * 6;
          emitirEspora(v);
          v.modo = "idle";
          v.espera = 0.5;
        }
      } else if (v.modo === "salto") {
        const u = clamp(v.animT / 0.5, 0, 1);
        v.hop = Math.sin(u * Math.PI) * 9;
        if (u >= 1) { v.modo = "idle"; v.espera = 0.4 + Math.random(); }
      }
    }

    for (const f of flotantes) {
      f.y -= f.vy * dt;
      if (f.y < -6) { f.y = groundY - 2; f.x = Math.random() * Wc; }
    }
    if (Math.random() < dt * 1.5) motas(Math.random() * Wc, groundY - 2, 1, 0.4);

    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i];
      p.t += dt;
      if (p.t >= p.dur) {
        if (p.tipo === "viaje") {
          madre.pulso = Math.min(1, madre.pulso + 0.5);
          madre.brillo = 1;
          motas(p.x1, p.y1, 6, 0.9, p.col);
          aroPart(p.x1, p.y1, 12, 0.4);
        }
        particulas.splice(i, 1);
        continue;
      }
      if (p.tipo === "mota") {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt;
      } else if (p.tipo === "viaje") {
        p.estela -= dt;
        if (p.estela <= 0) {
          p.estela = 0.04;
          const q = puntoViaje(p);
          part(q.x, q.y, 0, 0, { tipo: "estela", dur: 0.3, col: p.col });
        }
      }
    }
  }

  // ---------- draw ----------
  function dibujarMadre() {
    const m = medidas();
    const sq = Math.round(madre.pulso * 3);
    const cx = Math.round(madre.x);
    const capBase = groundY - m.sh;
    const ch = m.ch - sq;
    const rx = Math.round(m.w / 2);
    const idx = etapaPrev ?? 0;

    // tallo: contorno blanco, interior oscuro, abierto hacia el sombrero (liso, sin puerta)
    const sx = cx - Math.round(m.sw / 2);
    g.fillStyle = BLANCO;
    g.fillRect(sx, capBase, m.sw, m.sh);
    g.fillStyle = BG;
    g.fillRect(sx + 1, capBase, m.sw - 2, m.sh - 1);

    // sombrero: contorno blanco
    semi(cx, capBase, rx, ch, BLANCO);
    g.fillStyle = BLANCO;
    g.fillRect(cx - rx, capBase - 1, rx * 2, 1);
    semi(cx, capBase, rx, ch, BG, 1);
    // destello al recibir esporas
    if (madre.brillo > 0.02) {
      g.globalAlpha = madre.brillo * 0.35;
      semi(cx, capBase, rx, ch, BLANCO, 1);
      g.globalAlpha = 1;
    }
    // manchas de colores en el sombrero: más grandes y numerosas con cada etapa
    const n = 3 + idx * 2;
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      const px = cx + Math.round((u - 0.5) * (rx * 1.55));
      const arco = Math.sqrt(Math.max(0, 1 - ((u - 0.5) * 1.55) ** 2));
      const py = capBase - 4 - Math.round((ch - 8) * arco * (0.25 + 0.45 * ((k * 7) % 3) / 2));
      disco(px, py, idx >= 2 && k % 2 ? 3 : 2, PALETA[k % PALETA.length]);
    }
  }

  function dibujarHonguito(v) {
    const base = Math.round(groundY - v.hop);
    const pose = v.modo === "walk" ? (Math.floor(v.animT * 11) % 2) : 0;
    const spr = spritesHongo[v.col][pose];
    const alto = HH + Math.round(v.estira);
    const x = Math.round(v.x);
    g.globalAlpha = v.alfa;
    g.save();
    if (v.dir < 0) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); }
    g.drawImage(spr, x - 4, base - alto, HW, alto);
    g.restore();
    g.globalAlpha = 1;
    if (v.llevando) {
      const ox = x + (v.dir > 0 ? 1 : -1), oy = base - alto - 3 + Math.round(Math.sin(t * 6 + v.i));
      disco(ox, oy, 2, PALETA[v.col]);
    }
  }

  function dibujarParticulas() {
    for (const p of particulas) {
      const k = p.t / p.dur;
      if (p.tipo === "viaje") {
        const q = puntoViaje(p);
        disco(q.x, q.y, 2, p.col);
      } else if (p.tipo === "estela") {
        g.globalAlpha = 0.7 * (1 - k);
        g.fillStyle = p.col;
        g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        g.globalAlpha = 1;
      } else if (p.tipo === "mota") {
        g.globalAlpha = 1 - k * k;
        g.fillStyle = p.col;
        g.fillRect(Math.round(p.x), Math.round(p.y), p.r, p.r);
        g.globalAlpha = 1;
      } else if (p.tipo === "aro") {
        g.globalAlpha = 1 - k;
        aro(p.x, p.y, p.r1 * (1 - (1 - k) * (1 - k)), BLANCO);
        g.globalAlpha = 1;
      }
    }
  }

  function draw() {
    g.imageSmoothingEnabled = false;
    g.globalAlpha = 1;
    g.clearRect(0, 0, Wc, Hc);
        g.drawImage(fondo, 0, 0);
    // estrellitas y manchas flotantes (fondo)
    for (const s of estrellas) {
      const a = 0.25 + 0.45 * Math.sin(t * 1.5 + s.ph) ** 2;
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.fillRect(s.x, s.y, 1, 1);
    }
    g.globalAlpha = 0.55;
    for (const f of flotantes) { g.fillStyle = f.col; g.fillRect(Math.round(f.x + Math.sin(t * f.sp + f.ph) * f.ax), Math.round(f.y), f.r, f.r); }
    g.globalAlpha = 1;

    dibujarMadre();
    for (const v of visuales) dibujarHonguito(v);
    dibujarParticulas();

    if (flash > 0.01) { g.globalAlpha = flash * 0.3; g.fillStyle = BLANCO; g.fillRect(0, 0, Wc, Hc); g.globalAlpha = 1; }
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lo, 0, 0, Wc * S, Hc * S);
  }

  // ---------- toques ----------
  function toque(px, py) {
    const cx = (px * dpr) / S;
    const cy = (py * dpr) / S;
    const m = medidas();
    if (Math.abs(cx - madre.x) < m.w / 2 && cy > groundY - alturaMadre() && cy < groundY + 2) return { quien: "madre" };
    for (let i = visuales.length - 1; i >= 0; i--) {
      const v = visuales[i];
      if (Math.abs(cx - v.x) < 8 && cy > groundY - 16 && cy < groundY + 2) {
        if (v.modo === "idle") { v.modo = "salto"; v.animT = 0; }
        return { quien: "honguito", v };
      }
    }
    return null;
  }

  function pulsoMadre() {
    madre.pulso = 1;
    madre.brillo = 1;
    motas(madre.x, groundY - alturaMadre(), 12);
    aroPart(madre.x, groundY - alturaMadre() * 0.6, 34, 0.5);
  }

  return { resize, update, draw, toque, pulsoMadre };
}
