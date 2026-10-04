// Escena 2D vista lateral, estilo minimalista: fondo azul noche plano, contornos blancos,
// manchitas de colores. Todo se dibuja con formas simples en un buffer chico (1 celda = 1 píxel
// del arte) y se escala con un factor entero sin suavizado. No hay sprites ni fotogramas:
// los honguitos son un bitmap diminuto que se mueve con rebotes y estiramientos por código.

const MAX_VISUALES = { basico: 28, musico: 16, jardinero: 10, atleta: 10 }; // honguitos dibujados por tipo (el número real puede ser enorme)
const MAX_PARTICULAS = 300;
const MAX_BROTES = 40; // honguitos pasajeros que dejan los jardineros
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

const VIOLETA = "#a77bff";
const BONUS_CONSERV = 1.15; // el conservatorio agranda al hongo madre
const VERDE = "#2fa84f";
const NARANJA = "#ff8a1f";
const GIGANTE = "#222232"; // hongos gigantes del fondo: apenas más oscuros que el cielo
const GIGANTE_MANCHA = "#252535";
// medidas de los edificios (mismo formato que MADRE)
const TAM = {
  conservatorio: { w: 36, ch: 19, sw: 15, sh: 13 },
  vivero: { w: 38, ch: 20, sw: 16, sh: 14 },
  gimnasio: { w: 42, ch: 20, sw: 18, sh: 14 },
};
const NOTA = ["..##.", "..#.#", "..#..", "..#..", "###..", "###.."];

// medidas del hongo madre por etapa: ancho del sombrero, alto del sombrero, ancho y alto del tallo
const MADRE = [
  { w: 30, ch: 17, sw: 14, sh: 12 },
  { w: 46, ch: 26, sw: 20, sh: 18 },
  { w: 66, ch: 38, sw: 28, sh: 26 },
  { w: 92, ch: 54, sw: 38, sh: 36 },
];

import { EDIFICIOS, HONGUITOS } from './data.js';

const MADRE_GRANDE = MADRE.map((m) => ({ w: Math.round(m.w * BONUS_CONSERV), ch: Math.round(m.ch * BONUS_CONSERV), sw: Math.round(m.sw * BONUS_CONSERV), sh: Math.round(m.sh * BONUS_CONSERV) }));

export function crearEscena(canvas) {
  const ctx = canvas.getContext("2d");
  const lo = document.createElement("canvas");
  const g = lo.getContext("2d");
  let dpr = 1, S = 1, Wc = 0, Hc = 0, groundY = 0;
  let fondo = null;
  let t = 0, etapaPrev = null, inicial = true, flash = 0;

  const madre = { x: 0, pulso: 0, brillo: 0 };
  const edif = {}; // id -> { x } en celdas, para los edificios construidos
  const brillos = {}; // id -> destello del edificio (0..1)
  const brotes = []; // honguitos pasajeros regados por los jardineros
  const gigantes = []; // hongos gigantes oscuros del fondo: { x, s, v, p (0..1 crecimiento), cv (canvas) }
  let bonusMadre = false;
  let colocando = null; // { id, x } mientras el jugador elige dónde ponerlo
  const visuales = [];
  const particulas = [];
  const flotantes = [];
  const estrellas = [];

  // ---------- sprites precalculados (un canvas por color y pose) ----------
  function hacerSprite(col, patas, boca) {
    const c = document.createElement("canvas");
    c.width = HW; c.height = HH;
    const x = c.getContext("2d");
    const filas = [...HONGO, patas];
    // boca solo al cantar (fuera de eso no tiene), siempre en una sola fila para no tocar las patas:
    // 1 = entreabierta, 2 = abierta
    if (boca === 1) filas[6] = ".wwwmwww.";
    if (boca === 2) filas[6] = ".wwmmmww.";
    filas.forEach((fila, y) => {
      for (let i = 0; i < HW; i++) {
        const ch = fila[i];
        if (ch === ".") continue;
        x.fillStyle = ch === "c" ? col : ch === "e" || ch === "m" ? BG : BLANCO;
        x.fillRect(i, y, 1, 1);
      }
    });
    return c;
  }
  const spritesHongo = PALETA.map((col) => [0, 1].map((pose) => hacerSprite(col, PATAS[pose], false)));
  const spritesMusico = [hacerSprite(VIOLETA, PATAS[0], false), hacerSprite(VIOLETA, PATAS[1], false), hacerSprite(VIOLETA, PATAS[0], 1), hacerSprite(VIOLETA, PATAS[0], 2)];
  const spritesJard = [0, 1].map((pose) => hacerSprite(VERDE, PATAS[pose], 0));
  const spritesAtl = [0, 1].map((pose) => hacerSprite(NARANJA, PATAS[pose], 0));
  const BROTE = [".ccc.", "ccccc", ".www.", ".www."];
  const spritesBrote = PALETA.map((col) => {
    const c = document.createElement("canvas");
    c.width = 5; c.height = 4;
    const x = c.getContext("2d");
    BROTE.forEach((fila, y) => { for (let i = 0; i < 5; i++) { if (fila[i] === ".") continue; x.fillStyle = fila[i] === "c" ? col : BLANCO; x.fillRect(i, y, 1, 1); } });
    return c;
  });
  const spritesNota = PALETA.map((col) => {
    const c = document.createElement("canvas");
    c.width = 5; c.height = 6;
    const x = c.getContext("2d");
    x.fillStyle = col;
    NOTA.forEach((fila, y) => { for (let i = 0; i < 5; i++) if (fila[i] === "#") x.fillRect(i, y, 1, 1); });
    return c;
  });

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

  // ---------- hongos gigantes del fondo (siluetas muy oscuras que brotan con los hitos) ----------
  function construirGigante(gi) {
    const r = rng(gi.v);
    const base = Math.min(groundY * 0.2, Wc * 0.12) * gi.s; // se achica en pantallas angostas
    const ch = Math.round(base), sh = Math.round(base * 1.4);
    const w = Math.round(ch * (1.9 + r() * 0.5)), sw = Math.round(w * (0.28 + r() * 0.12));
    const c = document.createElement("canvas");
    c.width = w; c.height = ch + sh;
    const x = c.getContext("2d");
    x.fillStyle = GIGANTE;
    x.fillRect(Math.round((w - sw) / 2), ch - 1, sw, sh + 1); // tallo
    for (let dy = 0; dy < ch; dy++) { // sombrero: media elipse
      const hw = Math.round((w / 2) * Math.sqrt(1 - (dy / ch) ** 2));
      x.fillRect(Math.round(w / 2) - hw, ch - dy - 1, hw * 2, 1);
    }
    x.fillStyle = GIGANTE_MANCHA; // manchas apenas más claras
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const u = 0.18 + r() * 0.64, v = 0.25 + r() * 0.5;
      const px = Math.round(u * w), py = Math.round(ch - v * ch * Math.sqrt(1 - ((u - 0.5) * 2) ** 2));
      const rr = 2 + Math.floor(r() * (ch / 7));
      for (let dy = -rr; dy <= rr; dy++) { const hw = Math.floor(Math.sqrt(rr * rr - dy * dy)); x.fillRect(px - hw, py + dy, hw * 2 + 1, 1); }
    }
    gi.cv = c;
  }

  function sincronizarGigantes(state, instantaneo) {
    const f = state.fondo;
    if (f.length < gigantes.length) { gigantes.length = 0; instantaneo = true; } // partida reemplazada
    while (gigantes.length < f.length) {
      const gi = { ...f[gigantes.length], p: instantaneo ? 1 : 0 };
      construirGigante(gi);
      gigantes.push(gi);
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
    for (const gi of gigantes) construirGigante(gi);
  }

  // ---------- entidades ----------
  const medidas = () => (bonusMadre ? MADRE_GRANDE : MADRE)[etapaPrev ?? 0];
  const alturaMadre = () => { const m = medidas(); return m.ch + m.sh; };

  function nuevoVisual(i, tipo, desdePuerta) {
    const casa = HONGUITOS[tipo].casa;
    const origen = casa ? edif[casa].x : madre.x;
    const x = desdePuerta ? origen + (Math.random() - 0.5) * 12 : casa ? origen + (Math.random() - 0.5) * 50 : 14 + Math.random() * (Wc - 28);
    return {
      i, tipo, cantaEn: 2 + Math.random() * 4, tCanta: 0, notaT: 0, x, dir: Math.random() < 0.5 ? -1 : 1, col: i % PALETA.length,
      modo: "idle", animT: Math.random() * 4, espera: desdePuerta ? 0.3 : 0.5 + Math.random() * 2,
      meta: x, entrega: 5 + Math.random() * 7, llevando: false, hop: 0, estira: 0,
      alfa: desdePuerta ? 0 : 1, tDar: 0,
    };
  }

  function sincronizarVisuales(state) {
    for (const tipo of Object.keys(MAX_VISUALES)) {
      const casa = HONGUITOS[tipo].casa;
      if (casa && !edif[casa]) continue;
      const n = Math.min(state.honguitos[tipo] || 0, MAX_VISUALES[tipo]);
      let cuenta = visuales.filter((v) => v.tipo === tipo).length;
      while (cuenta < n) {
        const v = nuevoVisual(visuales.length, tipo, !inicial);
        if (!inicial) { motas(v.x, groundY - 6, 6, 0.6, PALETA[v.col]); aroPart(v.x, groundY - 4, 9, 0.4); }
        visuales.push(v);
        cuenta++;
      }
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

  const emitirEspora = (v) => lanzarEspora(v.x, groundY - 14, PALETA[v.col]);
  function lanzarEspora(x, y, col) {
    const m = medidas();
    part(x, y, 0, 0, {
      tipo: "viaje", col,
      x0: x, y0: y,
      x1: madre.x + (Math.random() - 0.5) * m.w * 0.5, y1: groundY - m.sh - m.ch * 0.5,
      dur: 0.8 + Math.random() * 0.3, arco: 20 + Math.random() * 24, estela: 0,
    });
  }

  function puntoViaje(p) {
    const k = p.t / p.dur, e = suave(k), u = 1 - e;
    const cx = (p.x0 + p.x1) / 2, cy = Math.min(p.y0, p.y1) - p.arco;
    return { x: u * u * p.x0 + 2 * u * e * cx + e * e * p.x1, y: u * u * p.y0 + 2 * u * e * cy + e * e * p.y1 };
  }

  // Posición libre de algo de `ancho` celdas: dentro de la pantalla y sin pisar a los obstáculos
  // (hongo madre y edificios), corriéndolo al lado libre más cercano.
  function xLibre(x, ancho, obst) {
    const lim = ancho / 2 + 4;
    x = clamp(x, lim, Wc - lim);
    for (let pasada = 0; pasada < 4; pasada++) {
      let movido = false;
      for (const o of obst) {
        const hueco = o.w / 2 + ancho / 2 + 6;
        if (Math.abs(x - o.x) >= hueco) continue;
        const der = o.x + hueco, izq = o.x - hueco;
        const okDer = der <= Wc - lim, okIzq = izq >= lim;
        x = okDer && (!okIzq || Math.abs(der - x) <= Math.abs(izq - x)) ? der : izq;
        x = clamp(x, lim, Wc - lim);
        movido = true;
      }
      if (!movido) break;
    }
    return x;
  }
  const obstaculos = () => [{ x: madre.x, w: medidas().w }, ...Object.entries(edif).map(([id, e]) => ({ x: e.x, w: TAM[id].w }))];

  // Jardinero: camina a un punto libre del piso, lo riega y ahí brota un honguito pasajero.
  function actualizarJardinero(v, dt) {
    v.alfa = Math.min(1, v.alfa + dt * 2.5);
    v.animT += dt;
    v.hop = 0;
    v.estira = 0;
    if (v.modo === "idle") {
      v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
      v.espera -= dt;
      if (v.espera <= 0) {
        if (brotes.length >= MAX_BROTES) { v.espera = 2; return; }
        v.meta = xLibre(12 + Math.random() * (Wc - 24), 30, obstaculos());
        v.dir = Math.sign(v.meta - v.x) || 1;
        v.modo = "walk";
      }
    } else if (v.modo === "walk") {
      v.hop = Math.abs(Math.sin(v.animT * 11)) * 1.5;
      const d = v.meta - v.x, paso = VEL * 0.8 * dt;
      if (Math.abs(d) <= paso) { v.x = v.meta; v.modo = "riega"; v.tRiega = 0; v.gotaT = 0; }
      else v.x += Math.sign(d) * paso;
    } else if (v.modo === "riega") {
      v.tRiega += dt;
      v.gotaT -= dt;
      if (v.gotaT <= 0) {
        v.gotaT = 0.07;
        part(v.x + v.dir * 12, groundY - 5, v.dir * (4 + Math.random() * 4), 8, { tipo: "gota", dur: 1 });
      }
      if (v.tRiega > 1.5) {
        brotes.push({ x: Math.round(v.x + v.dir * 12), t: 0, vida: 12 + Math.random() * 6, col: Math.floor(Math.random() * PALETA.length) });
        motas(v.x + v.dir * 12, groundY - 3, 4, 0.4, PALETA[brotes[brotes.length - 1].col]);
        v.modo = "idle"; v.espera = 2 + Math.random() * 3;
      }
    } else if (v.modo === "salto") {
      const u = clamp(v.animT / 0.5, 0, 1);
      v.hop = Math.sin(u * Math.PI) * 9;
      if (u >= 1) { v.modo = "idle"; v.espera = 0.4 + Math.random(); }
    }
  }

  // Atleta: camina cerca del gym, saca las mancuernas, hace series transpirando y suelta una espora.
  function actualizarAtleta(v, dt) {
    v.alfa = Math.min(1, v.alfa + dt * 2.5);
    v.animT += dt;
    v.hop = 0;
    v.estira = 0;
    if (v.modo === "idle") {
      v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
      v.espera -= dt;
      if (v.espera <= 0) {
        const gx = edif.gimnasio.x, mw = TAM.gimnasio.w / 2;
        v.meta = clamp(gx + (Math.random() < 0.5 ? -1 : 1) * (mw + 6 + Math.random() * 28), 12, Wc - 12);
        v.dir = Math.sign(v.meta - v.x) || 1;
        v.modo = "walk";
      }
    } else if (v.modo === "walk") {
      v.hop = Math.abs(Math.sin(v.animT * 11)) * 1.5;
      const d = v.meta - v.x, paso = VEL * 0.7 * dt;
      if (Math.abs(d) <= paso) {
        v.x = v.meta; v.modo = "entrena"; v.tEnt = 0; v.sudorT = 0; v.reps = 0;
        v.dir = Math.sign(edif.gimnasio.x - v.x) || 1; // mira hacia el gym
      } else v.x += Math.sign(d) * paso;
    } else if (v.modo === "entrena") {
      v.tEnt += dt;
      const ciclo = (v.tEnt * 1.6) % 1; // una repetición cada ~0.6 s
      v.barra = ciclo < 0.5 ? ciclo * 2 : (1 - ciclo) * 2; // 0 abajo .. 1 arriba
      v.estira = -Math.sin(ciclo * TAU) * 0.8;
      v.hop = 0;
      brillos.gimnasio = Math.max(brillos.gimnasio || 0, 0.35);
      v.sudorT -= dt;
      if (v.sudorT <= 0) {
        v.sudorT = 0.12 + Math.random() * 0.1;
        const lado = Math.random() < 0.5 ? -1 : 1;
        part(v.x + lado * 4, groundY - HH - 1, lado * (8 + Math.random() * 10), -14 - Math.random() * 8, { tipo: "sudor", dur: 0.9 });
      }
      if (v.tEnt > 3.6) {
        emitirEspora(v);
        motas(v.x, groundY - 12, 4, 0.5, NARANJA);
        v.modo = "idle"; v.espera = 1.5 + Math.random() * 3;
      }
    }
  }

  function actualizarMusico(v, dt) {
    v.alfa = Math.min(1, v.alfa + dt * 2.5);
    v.animT += dt;
    v.hop = 0;
    v.estira = 0;
    if (v.modo === "idle") {
      v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
      v.cantaEn -= dt;
      v.espera -= dt;
      if (v.cantaEn <= 0) {
        v.modo = "canta"; v.tCanta = 0; v.notaT = 0;
        emitirEspora(v);
      } else if (v.espera <= 0) {
        v.meta = clamp(edif.conservatorio.x + (Math.random() - 0.5) * 80, 12, Wc - 12);
        v.dir = Math.sign(v.meta - v.x) || 1;
        v.modo = "walk";
      }
    } else if (v.modo === "walk") {
      v.hop = Math.abs(Math.sin(v.animT * 11)) * 1.5;
      const d = v.meta - v.x, paso = VEL * 0.7 * dt;
      if (Math.abs(d) <= paso) { v.x = v.meta; v.modo = "idle"; v.espera = 1 + Math.random() * 2.5; }
      else v.x += Math.sign(d) * paso;
    } else if (v.modo === "canta") {
      v.tCanta += dt;
      v.hop = Math.abs(Math.sin(v.tCanta * 7)) * 1.5;
      brillos.conservatorio = Math.max(brillos.conservatorio || 0, 0.5);
      v.notaT -= dt;
      if (v.notaT <= 0) {
        v.notaT = 0.42;
        part(v.x + v.dir * 3, groundY - HH - 3, (Math.random() - 0.5) * 6, -15, { tipo: "nota", dur: 1.5, col: Math.floor(Math.random() * PALETA.length), fase: Math.random() * TAU });
      }
      if (v.tCanta > 1.7) { v.modo = "idle"; v.cantaEn = 4 + Math.random() * 5; v.espera = 0.6; }
    } else if (v.modo === "salto") {
      const u = clamp(v.animT / 0.5, 0, 1);
      v.hop = Math.sin(u * Math.PI) * 9;
      if (u >= 1) { v.modo = "idle"; v.espera = 0.4 + Math.random(); }
    }
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

    // edificios (el jugador los ubica; la posición se guarda como fracción del ancho)
    bonusMadre = Object.keys(state.edificios).some((id) => EDIFICIOS[id]?.crecimientoMadre);
    coloresMadre = ["#ff4d4d", ...Object.keys(state.edificios).filter((id) => EDIFICIOS[id]).map((id) => EDIFICIOS[id].color)];
    const obst = [{ x: madre.x, w: medidas().w }];
    for (const id of Object.keys(EDIFICIOS)) {
      const ec = state.edificios[id];
      if (!ec) { delete edif[id]; continue; }
      const nuevo = !edif[id];
      const x = xLibre(ec.x * Wc, TAM[id].w, obst);
      edif[id] = { x };
      obst.push({ x, w: TAM[id].w });
      if (nuevo && !inicial) {
        const cy = groundY - TAM[id].ch - TAM[id].sh * 0.5;
        flash = 0.6;
        motas(x, cy, 40, 1.4);
        aroPart(x, cy, 50, 0.7);
        if (EDIFICIOS[id].crecimientoMadre) {
          madre.pulso = 1;
          aroPart(madre.x, groundY - alturaMadre() * 0.6, 70, 0.8);
          motas(madre.x, groundY - alturaMadre(), 30, 1.4);
        }
      }
    }
    for (const id in brillos) brillos[id] = Math.max(0, brillos[id] - dt * 2);

    sincronizarGigantes(state, inicial);
    for (const gi of gigantes) if (gi.p < 1) gi.p = Math.min(1, gi.p + dt / 5);
    sincronizarVisuales(state);
    const mHalf = medidas().w / 2;
    for (const v of visuales) {
      if (v.tipo === "musico") { actualizarMusico(v, dt); continue; }
      if (v.tipo === "jardinero") { actualizarJardinero(v, dt); continue; }
      if (v.tipo === "atleta") { actualizarAtleta(v, dt); continue; }
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

    // los brotes se desvanecen con el tiempo y se vuelven una espora que viaja al hongo madre
    for (let i = brotes.length - 1; i >= 0; i--) {
      const b = brotes[i];
      b.t += dt;
      if (b.t < b.vida) continue;
      lanzarEspora(b.x, groundY - 4, PALETA[b.col]);
      motas(b.x, groundY - 3, 4, 0.5, PALETA[b.col]);
      brotes.splice(i, 1);
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
      } else if (p.tipo === "gota") {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 140 * dt;
        if (p.y >= groundY) p.t = p.dur;
      } else if (p.tipo === "sudor") {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 110 * dt; p.vx *= 1 - dt * 0.8;
        if (p.y >= groundY) p.t = p.dur;
      } else if (p.tipo === "nota") {
        p.x += p.vx * dt; p.y += p.vy * dt;
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
  // Hongo de contorno blanco. Lo usan el hongo madre y los edificios.
  // acento = color del faldón (anillo bajo el sombrero); null = blanco.
  const TALLO_L = "#34344a", TALLO_D = "#2a2a3c", SOMBRERO = "#2e2e45", SOMBRERO_D = "#222233", LAMINA = "#3b3b58";
  function hongoBase(cx, m, sq, brillo, acento = null, tinte = null) {
    const capBase = groundY - m.sh;
    const ch = m.ch - sq;
    const rx = Math.round(m.w / 2);
    const mitad = Math.round(m.sw / 2);

    // sombra en el piso
    g.globalAlpha *= 0.55;
    g.fillStyle = "#14141d";
    g.fillRect(cx - Math.round(m.w * 0.42), groundY, Math.round(m.w * 0.84), 1);
    g.fillRect(cx - Math.round(m.w * 0.3), groundY + 1, Math.round(m.w * 0.6), 1);
    g.globalAlpha /= 0.55;

    // tallo: se ensancha hacia la base, con luz a la izquierda
    for (let y = capBase; y < groundY; y++) {
      const flare = groundY - y <= 3 ? 3 - (groundY - y) + 1 : 0;
      const w = mitad + flare;
      g.fillStyle = BLANCO;
      g.fillRect(cx - w, y, 1, 1);
      g.fillRect(cx + w - 1, y, 1, 1);
      g.fillStyle = TALLO_D;
      g.fillRect(cx - w + 1, y, w * 2 - 2, 1);
      g.fillStyle = TALLO_L;
      g.fillRect(cx - w + 1, y, Math.max(1, Math.round(w * 0.55)), 1);
    }
    g.fillStyle = BLANCO;
    g.fillRect(cx - mitad - 3, groundY - 1, mitad * 2 + 6, 1);

    // sombrero: contorno blanco + relleno + lámina oscura abajo
    semi(cx, capBase, rx, ch, BLANCO);
    g.fillStyle = BLANCO;
    g.fillRect(cx - rx, capBase - 1, rx * 2, 1);
    semi(cx, capBase, rx, ch, tinte ? mezcla(SOMBRERO, tinte, 0.6) : SOMBRERO, 1);
    const ancho = (dy) => Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ch) ** 2))) - 2;
    const banda = Math.max(3, Math.round(ch * 0.16));
    for (let dy = 0; dy < banda; dy++) {
      const w = ancho(dy);
      if (w <= 0) continue;
      g.fillStyle = tinte ? mezcla(SOMBRERO_D, tinte, 0.35) : SOMBRERO_D;
      g.fillRect(cx - w, capBase - 2 - dy, w * 2, 1);
      g.fillStyle = LAMINA;
      for (let x = -w + 1; x < w; x += 3) g.fillRect(cx + x, capBase - 2 - dy, 1, 1);
    }
    // reflejo arriba a la izquierda
    g.globalAlpha *= 0.55;
    g.fillStyle = BLANCO;
    for (let a = 2.0; a < 2.75; a += 0.07) {
      g.fillRect(cx + Math.round((rx - 4) * Math.cos(a)), capBase - Math.round((ch - 4) * Math.sin(a)), 1, 1);
    }
    g.globalAlpha /= 0.55;
    // faldón: anillo bajo el sombrero
    g.fillStyle = acento || BLANCO;
    g.fillRect(cx - mitad, capBase + 1, mitad * 2, 1);
    g.fillStyle = "#14141d";
    g.fillRect(cx - mitad + 1, capBase + 2, mitad * 2 - 2, 1);

    if (brillo > 0.02) {
      const a = g.globalAlpha;
      g.globalAlpha = a * brillo * 0.35;
      semi(cx, capBase, rx, ch, BLANCO, 1);
      g.globalAlpha = a;
    }
    return { capBase, ch, rx, mitad };
  }

  function mezcla(c1, c2, t) {
    const n = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const a = n(c1), b = n(c2);
    return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }

  // mancha recortada al interior del sombrero (si cae en el borde queda cortada)
  function manchaCap(cx, capBase, rx, ch, px, py, r, col, borde = true) {
    const lim = (y) => { const dy = capBase - 2 - y; return dy < 0 ? -1 : Math.round(rx * Math.sqrt(Math.max(0, 1 - ((dy + 1) / ch) ** 2))) - 2; };
    const fila = (yy, w, color) => {
      const L = lim(yy);
      if (L <= 0) return;
      const x0 = Math.max(px - w, cx - L), x1 = Math.min(px + w, cx + L);
      if (x1 < x0) return;
      g.fillStyle = color;
      g.fillRect(x0, yy, x1 - x0 + 1, 1);
    };
    for (const [rr, color] of borde ? [[r + 1, SOMBRERO_D], [r, col]] : [[r, col]]) {
      for (let dy = -rr; dy <= rr; dy++) fila(py + dy, Math.floor(Math.sqrt(rr * rr - dy * dy + rr * 0.5)), color);
    }
    const hx = px - Math.floor(r / 2), hy = py - Math.floor(r / 2);
    if (r >= 2 && Math.abs(hx - cx) <= lim(hy)) { g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(hx, hy, 1, 1); }
  }

  // Posiciones aleatorias (deterministas por semilla) de manchas en el sombrero, en coordenadas
  // normalizadas: u -1..1 a lo ancho, h 0..1 en alto, f = tamaño relativo. Pueden quedar en el borde.
  const cacheManchas = {};
  function manchasDe(clave, semilla, n) {
    const lista = cacheManchas[clave] || (cacheManchas[clave] = []);
    while (lista.length < n) {
      const r2 = rng(semilla * 7919 + lista.length * 104729 + 17);
      let mejor = null, mejorD = -1;
      for (let i = 0; i < 14; i++) {
        const ang = r2() * Math.PI, rad = Math.sqrt(r2()) * 1.02;
        const u = Math.cos(ang) * rad, h = Math.sin(ang) * rad;
        if (h < 0.12) continue;
        const dmin = lista.reduce((d, q) => Math.min(d, Math.hypot(q.u - u, (q.h - h) * 1.4)), 9);
        if (dmin > mejorD) { mejorD = dmin; mejor = { u, h }; }
      }
      lista.push({ ...(mejor || { u: 0, h: 0.5 }), f: 0.07 + r2() * 0.12, v: r2() });
    }
    return lista;
  }

  let coloresMadre = ["#ff4d4d"];

  function dibujarMadre() {
    const m = medidas();
    const cx = Math.round(madre.x);
    const { capBase, ch, rx } = hongoBase(cx, m, Math.round(madre.pulso * 3), madre.brillo);
    // un punto rojo al principio; cada edificio suma su color. Posición y tamaño al azar (fijos por semilla)
    const pos = manchasDe("madre", 31, coloresMadre.length);
    coloresMadre.forEach((col, k) => {
      const q = pos[k];
      manchaCap(cx, capBase, rx, ch, cx + Math.round(q.u * rx), capBase - 2 - Math.round(q.h * ch), Math.max(1, Math.round(ch * q.f * 1.2)), col);
    });
    // brotecitos y pasto en la base, más con cada etapa
    const idx = etapaPrev ?? 0;
    g.fillStyle = "#4a5a6a";
    for (let k = 0; k <= idx + 2; k++) {
      const dx = (k % 2 ? 1 : -1) * (Math.round(m.sw / 2) + 5 + k * 3);
      g.fillRect(cx + dx, groundY - 2, 1, 2);
      g.fillRect(cx + dx + 1, groundY - 1, 1, 1);
    }
  }

  // Edificios: hongo con decoración propia en el sombrero y en el tallo.
  function dibujarEdificio(id, x, alfa = 1) {
    const m = TAM[id];
    const cx = Math.round(x);
    g.globalAlpha = alfa;
    const col = EDIFICIOS[id].color;
    const { capBase, ch, rx, mitad } = hongoBase(cx, m, 0, brillos[id] || 0, col, col);
    manchasDe(id, id === "conservatorio" ? 5 : id === "vivero" ? 11 : 23, 7).forEach((q) => {
      const c2 = q.v < 0.5 ? mezcla(col, "#ffffff", 0.35) : mezcla(col, "#000000", 0.45);
      manchaCap(cx, capBase, rx, ch, cx + Math.round(q.u * rx), capBase - 2 - Math.round(q.h * ch), Math.max(1, Math.round(ch * q.f * 0.7)), c2, false);
    });
    if (id === "conservatorio") {
      // pentagrama con notas de colores y una nota blanca arriba
      g.fillStyle = "#4a4a66";
      for (let k = 0; k < 5; k++) {
        const h = 4 + k * 3;
        const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (h / ch) ** 2))) - 3;
        if (w > 2) g.fillRect(cx - w, capBase - h - 2, w * 2, 1);
      }
      [[-10, 1], [-3, 3], [4, 0], [11, 2]].forEach(([dx, linea], k) => disco(cx + dx, capBase - 6 - linea * 3, 1, PALETA[(k + 1) % PALETA.length]));
      g.drawImage(spritesNota[PALETA.length - 1], cx - 2, capBase - ch - 8);
      // tallo: ventanitas, puerta en arco que brilla y teclas de piano en la base
      g.fillStyle = col;
      for (const dx of [-5, 4]) { g.fillRect(cx + dx, capBase + 4, 2, 2); }
      g.fillStyle = "#3b2d66";
      g.fillRect(cx - 2, groundY - 7, 5, 6);
      g.fillRect(cx - 1, groundY - 8, 3, 1);
      g.fillStyle = col;
      g.fillRect(cx - 3, groundY - 7, 1, 6); g.fillRect(cx + 3, groundY - 7, 1, 6);
      g.fillRect(cx - 2, groundY - 8, 1, 1); g.fillRect(cx + 2, groundY - 8, 1, 1); g.fillRect(cx - 1, groundY - 9, 3, 1);
      g.fillStyle = "#fff";
      g.fillRect(cx, groundY - 5, 1, 1);
      for (let i = 0; i < mitad - 3; i++) {
        g.fillStyle = i % 2 ? "#14141d" : "#fff";
        g.fillRect(cx - 4 - i, groundY - 2, 1, 1);
        g.fillRect(cx + 4 + i, groundY - 2, 1, 1);
      }
    } else if (id === "gimnasio") {
      // cinta de sudor en el sombrero y una barra con discos arriba
      const bw = (dy) => Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ch) ** 2))) - 2;
      g.fillStyle = col;
      for (const dy of [Math.round(ch * 0.45), Math.round(ch * 0.45) + 1]) g.fillRect(cx - bw(dy), capBase - 2 - dy, bw(dy) * 2, 1);
      g.fillStyle = BLANCO;
      const by = capBase - ch - 6;
      g.fillRect(cx - 7, by + 2, 15, 1);
      g.fillRect(cx - 9, by, 2, 5); g.fillRect(cx + 8, by, 2, 5);
      g.fillStyle = col;
      g.fillRect(cx - 11, by + 1, 2, 3); g.fillRect(cx + 10, by + 1, 2, 3);
      // tallo: portón con tablillas y un espejo; mancuernas apoyadas al costado
      g.fillStyle = "#3a2410";
      g.fillRect(cx - 3, groundY - 9, 7, 8);
      g.fillStyle = col;
      for (let y = groundY - 8; y < groundY - 1; y += 2) g.fillRect(cx - 3, y, 7, 1);
      g.fillStyle = "#cfe8ff";
      g.fillRect(cx - mitad + 2, capBase + 4, 2, 4);
      g.fillRect(cx + mitad - 4, capBase + 4, 2, 4);
      const dx = cx + mitad + 4;
      g.fillStyle = BLANCO; g.fillRect(dx + 1, groundY - 3, 3, 1);
      g.fillStyle = col; g.fillRect(dx, groundY - 4, 1, 3); g.fillRect(dx + 4, groundY - 4, 1, 3);
      g.fillStyle = BLANCO; g.fillRect(dx + 1, groundY - 7, 3, 1);
      g.fillStyle = col; g.fillRect(dx, groundY - 8, 1, 3); g.fillRect(dx + 4, groundY - 8, 1, 3);
    } else if (id === "vivero") {
      // brotes verdes en el sombrero, gota de agua arriba y hojas colgando del borde
      [[-9, 3], [-3, 5], [4, 3], [10, 5]].forEach(([dx, h]) => {
        g.fillStyle = "#3fe08a";
        g.fillRect(cx + dx, capBase - 4 - h, 1, h);
        g.fillRect(cx + dx - 1, capBase - 4 - h, 1, 1);
        g.fillRect(cx + dx + 1, capBase - 5 - h, 1, 1);
      });
      g.fillStyle = "#2eaaf5";
      const top = capBase - ch - 7;
      g.fillRect(cx, top, 1, 1); g.fillRect(cx - 1, top + 1, 3, 1); g.fillRect(cx - 2, top + 2, 5, 2); g.fillRect(cx - 1, top + 4, 3, 1);
      g.fillStyle = col;
      for (const sx of [-rx + 3, rx - 4]) { g.fillRect(cx + sx, capBase, 1, 3); g.fillRect(cx + sx + (sx < 0 ? -1 : 1), capBase + 2, 1, 1); }
      // tallo: invernadero de vidrio con rejilla verde
      g.fillStyle = "#1e3b30";
      g.fillRect(cx - mitad + 2, capBase + 4, mitad * 2 - 4, m.sh - 6);
      g.fillStyle = "#3fe08a";
      g.globalAlpha = alfa * 0.6;
      g.fillRect(cx - 1, capBase + 4, 1, m.sh - 6);
      g.fillRect(cx - mitad + 2, capBase + 4 + Math.round((m.sh - 6) / 2), mitad * 2 - 4, 1);
      g.globalAlpha = alfa;
      g.fillStyle = "#3fe08a";
      g.fillRect(cx - 4, groundY - 5, 1, 3); g.fillRect(cx - 5, groundY - 5, 1, 1);
      g.fillRect(cx + 3, groundY - 4, 1, 2); g.fillRect(cx + 4, groundY - 5, 1, 1);
      // maceta con brote al costado
      g.fillStyle = "#c8673a";
      g.fillRect(cx + mitad + 3, groundY - 3, 5, 3);
      g.fillStyle = "#3fe08a";
      g.fillRect(cx + mitad + 5, groundY - 7, 1, 4); g.fillRect(cx + mitad + 4, groundY - 6, 1, 1); g.fillRect(cx + mitad + 6, groundY - 7, 1, 1);
    }
    g.globalAlpha = 1;
  }

  function dibujarHonguito(v) {
    const base = Math.round(groundY - v.hop);
    const pose = v.modo === "walk" ? (Math.floor(v.animT * 11) % 2) : 0;
    const spr = v.tipo === "musico" ? spritesMusico[v.modo === "canta" ? [0, 2, 3, 2][Math.floor(v.tCanta * 8) % 4] : pose]
      : v.tipo === "jardinero" ? spritesJard[pose] : v.tipo === "atleta" ? spritesAtl[pose] : spritesHongo[v.col][pose];
    const alto = HH + Math.round(v.estira);
    const x = Math.round(v.x);
    g.globalAlpha = v.alfa;
    g.save();
    if (v.dir < 0) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); }
    g.drawImage(spr, x - 4, base - alto, HW, alto);
    g.restore();
    g.globalAlpha = 1;
    if (v.modo === "entrena") {
      // mancuerna: sube y baja sobre la cabeza; los brazos son dos palitos blancos hasta la barra
      const bajo = base - 5, alto2 = base - alto - 5;
      const by = Math.round(bajo + (alto2 - bajo) * suave(v.barra));
      g.fillStyle = BLANCO;
      g.fillRect(x - 3, by + 1, 1, Math.max(0, base - 5 - by - 1));
      g.fillRect(x + 3, by + 1, 1, Math.max(0, base - 5 - by - 1));
      g.fillRect(x - 6, by, 13, 1);
      g.fillStyle = NARANJA;
      g.fillRect(x - 8, by - 2, 2, 5); g.fillRect(x + 7, by - 2, 2, 5);
      g.fillStyle = BLANCO;
      g.fillRect(x - 9, by - 1, 1, 3); g.fillRect(x + 9, by - 1, 1, 3);
    }
    if (v.modo === "riega") {
      // regadera: cuerpo blanco con pico y asa, apoyada al costado
      const s = v.dir, bx = x + s * 7, by = base - 9;
      g.fillStyle = BLANCO;
      g.fillRect(bx - 2, by, 5, 3);
      g.fillRect(bx + 3 * s, by + 1, 1, 1);
      g.fillRect(bx + 4 * s, by + 2, 1, 1);
      g.fillRect(bx - 3 * s, by - 1, 1, 3);
    }
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
      } else if (p.tipo === "gota") {
        g.fillStyle = "#2eaaf5";
        g.fillRect(Math.round(p.x), Math.round(p.y), 1, 2);
      } else if (p.tipo === "sudor") {
        g.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
        g.fillStyle = "#8fe0ff";
        g.fillRect(Math.round(p.x), Math.round(p.y), 1, 2);
        g.globalAlpha = 1;
      } else if (p.tipo === "nota") {
        g.globalAlpha = k < 0.65 ? 1 : (1 - k) / 0.35;
        g.drawImage(spritesNota[p.col], Math.round(p.x + Math.sin(p.t * 5 + p.fase) * 2), Math.round(p.y));
        g.globalAlpha = 1;
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
    for (const gi of gigantes) {
      const hT = gi.cv.height, h = Math.max(1, Math.round(hT * suave(gi.p)));
      g.drawImage(gi.cv, 0, hT - h, gi.cv.width, h, Math.round(gi.x * Wc - gi.cv.width / 2), groundY - h, gi.cv.width, h);
    }
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
    for (const id in edif) dibujarEdificio(id, edif[id].x);
    for (const b of brotes) {
      const falta = b.vida - b.t;
      if (falta < 1.5 && Math.floor(b.t * 8) % 2) continue;
      if (b.t < 0.25) { g.fillStyle = BLANCO; g.fillRect(b.x, groundY - 1, 1, 1); }
      else if (b.t < 0.5) { g.fillStyle = BLANCO; g.fillRect(b.x, groundY - 2, 1, 2); }
      else g.drawImage(spritesBrote[b.col], b.x - 2, groundY - 4);
    }
    for (const v of visuales) dibujarHonguito(v);
    dibujarParticulas();
    if (colocando) dibujarEdificio(colocando.id, xLibre(colocando.x, TAM[colocando.id].w, obstaculos()), 0.55);

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
    for (const id in edif) {
      const m = TAM[id];
      if (Math.abs(cx - edif[id].x) < m.w / 2 && cy > groundY - m.ch - m.sh - 8 && cy < groundY + 2) return { quien: id };
    }
    for (let i = visuales.length - 1; i >= 0; i--) {
      const v = visuales[i];
      if (Math.abs(cx - v.x) < 8 && cy > groundY - 16 && cy < groundY + 2) {
        if (v.modo === "idle") { v.modo = "salto"; v.animT = 0; }
        return { quien: "honguito", v };
      }
    }
    return null;
  }

  // rectángulo del hongo madre en px CSS (para anclar su ventana de mejoras al costado)
  function rectMadre() {
    const m = medidas(), k = S / dpr;
    return { x0: (madre.x - m.w / 2) * k, x1: (madre.x + m.w / 2) * k, y0: (groundY - alturaMadre()) * k, y1: groundY * k };
  }

  function rectEdificio(id) {
    const k = S / dpr, m = TAM[id], x = edif[id].x;
    return { x0: (x - m.w / 2) * k, x1: (x + m.w / 2) * k, y0: (groundY - m.ch - m.sh) * k, y1: groundY * k };
  }

  // ---- colocación: el jugador elige dónde poner un edificio comprado ----
  const aCeldas = (px) => (px * dpr) / S;
  const iniciarColocacion = (id) => { colocando = { id, x: Wc * 0.8 }; };
  const moverColocacion = (px) => { if (colocando) colocando.x = aCeldas(px); };
  const cancelarColocacion = () => { colocando = null; };
  function confirmarColocacion(px) {
    if (!colocando) return null;
    const x = xLibre(aCeldas(px), TAM[colocando.id].w, obstaculos());
    colocando = null;
    return x / Wc;
  }

  function pulsoMadre() {
    madre.pulso = 1;
    madre.brillo = 1;
    motas(madre.x, groundY - alturaMadre(), 12);
    aroPart(madre.x, groundY - alturaMadre() * 0.6, 34, 0.5);
  }

  return { resize, update, draw, toque, pulsoMadre, rectMadre, rectEdificio, iniciarColocacion, moverColocacion, cancelarColocacion, confirmarColocacion };
}
