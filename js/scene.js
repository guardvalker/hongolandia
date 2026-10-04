// Escena 2D vista lateral, estilo minimalista: fondo azul noche plano, contornos blancos,
// manchitas de colores. Todo se dibuja con formas simples en un buffer chico (1 celda = 1 píxel
// del arte) y se escala con un factor entero sin suavizado. No hay sprites ni fotogramas:
// los honguitos son un bitmap diminuto que se mueve con rebotes y estiramientos por código.

const TIPOS_VISUALES = ['basico', 'musico', 'jardinero', 'atleta', 'trader', 'astronauta', 'maestro', 'obrero', 'cientifico', 'mago', 'minero']; // el número dibujado por tipo lo da el ajuste "honguitos visibles" (el real puede ser enorme)
let limiteVisibles = 20; // honguitos dibujados por tipo (Ajustes)
const maxParticulas = () => 150 + limiteVisibles * 8;
const maxBrotes = () => Math.max(6, limiteVisibles * 2); // honguitos pasajeros que dejan los jardineros
const ANCHO_REF = 300; // celdas del lado corto de la pantalla
const VEL = 28; // celdas/seg al caminar
const TAU = Math.PI * 2;
const MUNDO = 6000; // ancho total del mundo en celdas; el hongo madre queda en el centro
const C0 = MUNDO / 2;

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

const ROJO = "#e8362f";
const VIOLETA = "#a77bff";
const BONUS_CONSERV = 1.15; // el conservatorio agranda al hongo madre
const VERDE = "#2fa84f";
const NARANJA = "#ff8a1f";
const DORADO = "#f5c518";
const CELESTE = "#4fb4ff";
const LIMA = "#b5e61d";
const VERDE_ACIDO = "#9dff4a";
const CICLO_BOLSA = 18; // segundos entre cobros (igual que BOLSA.ciclo en data.js)
const GIGANTE = "#222232"; // hongos gigantes del fondo: apenas más oscuros que el cielo
const GIGANTE_MANCHA = "#252535";
// medidas de los edificios (mismo formato que MADRE)
const TAM_BASE = {
  conservatorio: { w: 36, ch: 19, sw: 15, sh: 13 },
  vivero: { w: 38, ch: 20, sw: 16, sh: 14 },
  gimnasio: { w: 42, ch: 20, sw: 18, sh: 14 },
  trade: { w: 42, ch: 20, sw: 18, sh: 15 },
  astropuerto: { w: 44, ch: 21, sw: 18, sh: 15 },
  escuela: { w: 40, ch: 19, sw: 17, sh: 14 },
  fabrica: { w: 46, ch: 21, sw: 20, sh: 15 },
  universidad: { w: 44, ch: 21, sw: 20, sh: 16 },
  mina: { w: 42, ch: 18, sw: 18, sh: 15 },
  torre: { w: 34, ch: 15, sw: 12, sh: 26, extra: 20 }, // extra: alto del sombrero de mago sobre el sombrero
};
const NOTA = ["..##.", "..#.#", "..#..", "..#..", "###..", "###.."];

// medidas del hongo madre por etapa: ancho del sombrero, alto del sombrero, ancho y alto del tallo
const MADRE = [
  { w: 30, ch: 17, sw: 14, sh: 12 },
  { w: 46, ch: 26, sw: 20, sh: 18 },
  { w: 66, ch: 38, sw: 28, sh: 26 },
  { w: 92, ch: 54, sw: 38, sh: 36 },
];

import { EDIFICIOS, HONGUITOS, ACIDO, EVENTOS, EVENTO_CFG } from './data.js';
import { improd, velocidad, eventos, buffTipoActivo, efectos } from './engine.js';

const MADRE_GRANDE = MADRE.map((m) => ({ w: Math.round(m.w * BONUS_CONSERV), ch: Math.round(m.ch * BONUS_CONSERV), sw: Math.round(m.sw * BONUS_CONSERV), sh: Math.round(m.sh * BONUS_CONSERV) }));

export function crearEscena(canvas, opciones = {}) {
  const ctx = canvas.getContext("2d");
  const lo = document.createElement("canvas");
  const g = lo.getContext("2d");
  let dpr = 1, S = 1, Wc = 0, Hc = 0, groundY = 0;
  // cámara: Wc/Hc = celdas visibles; S = px por celda (niveles enteros para que el pixel art quede nítido)
  let groundRef = 220, S0 = 1, Wc0 = 300, Hc0 = 300, niveles = [1], zoomIdx = null, camX = C0, camY = 0, extent = 150;
  // mina: túneles bajo el piso (coordenadas relativas a la entrada: x al costado, y hacia abajo)
  let mina = null, minaKey = "", minaP = null, nMineros = 0, lastMx = 0;
  const LIM0 = () => C0 - extent, LIM1 = () => C0 + extent; // hasta dónde llega lo que hay en el mundo
  const offX = () => Math.round(Wc / 2 - camX);
  // camY = cuánto se bajó el mundo para ver más cielo: hasta la altura que se ve con el zoom más alejado
  const offY = () => Math.round(camY);
  function limitarCam() {
    camY = clamp(camY, -Math.max(0, mina && edif.mina ? mina.depth + 12 - 0.26 * Hc : 0), Math.max(0, 0.74 * (canvas.height - Hc)));
    camX = Wc >= 2 * extent ? C0 : clamp(camX, C0 - extent + Wc / 2, C0 + extent - Wc / 2);
  }
  let fondo = null;
  let t = 0, etapaPrev = null, inicial = true, flash = 0;

  // Tamaño de cada edificio: nunca menor al base, hasta ~80% más grande según la semilla de la
  // partida (state.semilla; cambia con cada prestigio). nivel 1/2 = más complejo (ramas hongo).
  let semilla = 0;
  const cacheTam = {};
  function tam(id) {
    const clave = id + ":" + semilla;
    if (cacheTam[clave]) return cacheTam[clave];
    const b = TAM_BASE[id];
    let h = 7;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const r = rng(h + semilla * 2654435761);
    const f = 1 + r() * 0.8;
    const lado = r() < 0.5 ? -1 : 1;
    const nivel = f >= 1.55 ? 3 : f >= 1.3 ? 2 : f >= 1.12 ? 1 : 0;
    return (cacheTam[clave] = { w: Math.round(b.w * f), ch: Math.round(b.ch * f), sw: Math.round(b.sw * f), sh: Math.round(b.sh * f), nivel, lado });
  }
  let tBolsa = 0, nBolsa = null, hayTraders = false; // reflejo de state.bolsa para dibujar el gráfico
  const cola = []; // acciones diferidas {t, fn}
  let contam = 0, nMagos = 0, evT = /evento/.test(location.search) ? 2 : 40 + Math.random() * 60;
  const cielo = []; // eventos del cielo: { tipo, x, y, vx, t, vida, ph, auto }
  let nObreros = 0, humoAcum = 0, cicloBolsa = CICLO_BOLSA;
  const velTipo = {}, buffTipos = {}; // velocidad y buff activo por tipo (de las mejoras de edificio)
  const nubes = []; // nubes de contaminación sobre la fábrica: { x0, y, w, ph, p, llueve }
  const lluvia = { activa: false, t: 0, prox: 25, zonas: [] };
  // luna de fondo y expediciones: el cohete hace un viaje por cada expedición que cuenta el motor
  let lunaBases = [], lunaVisibles = 0, nLuna = null, lunaFlash = 0, lunaDestino = 0;
  // caminos entre bases ({a,b,prog,len}) y pulsos de energía que recorren la red desde la base donde aterriza la nave
  let caminos = [], caminosN = 0;
  const pulsos = [];
  const cohete = { fase: "espera", t: 0, x: 0, y: 0, ang: 0, sc: 1, trip: [], llama: 0 };
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
  const spritesHongo = [0, 1].map((pose) => hacerSprite(ROJO, PATAS[pose], false));
  // lunares blancos del sombrero (filas 0-2 del HONGO): 2 o 3 celdas al azar, sin tocarse entre sí
  function lunares() {
    const celdas = [];
    HONGO.slice(0, 3).forEach((fila, y) => { for (let i = 0; i < HW; i++) if (fila[i] === "c") celdas.push([i, y]); });
    const out = [], n = 2 + (Math.random() < 0.5 ? 1 : 0);
    for (let intento = 0; intento < 40 && out.length < n; intento++) {
      const c = celdas[Math.floor(Math.random() * celdas.length)];
      if (out.every((o) => Math.abs(o[0] - c[0]) > 1 || Math.abs(o[1] - c[1]) > 1)) out.push(c);
    }
    return out;
  }
  const spritesMusico = [hacerSprite(VIOLETA, PATAS[0], false), hacerSprite(VIOLETA, PATAS[1], false), hacerSprite(VIOLETA, PATAS[0], 1), hacerSprite(VIOLETA, PATAS[0], 2)];
  const spritesJard = [0, 1].map((pose) => hacerSprite(VERDE, PATAS[pose], 0));
  const spritesAtl = [0, 1].map((pose) => hacerSprite(NARANJA, PATAS[pose], 0));
  // trader: sombrero dorado y corbata roja que cuelga entre las patitas; con boca para hablar por teléfono
  const spritesTrader = [[0, false], [1, false], [0, 1], [0, 2]].map(([pose, boca]) => {
    const c = hacerSprite(DORADO, PATAS[pose], boca);
    const x = c.getContext("2d");
    x.fillStyle = "#e23b3b";
    x.fillRect(4, 7, 1, 2);
    return c;
  });
  // astronauta: sombrero celeste y visor de vidrio sobre la cara
  const spritesAstro = [0, 1].map((pose) => {
    const c = hacerSprite(CELESTE, PATAS[pose], false);
    const x = c.getContext("2d");
    x.fillStyle = "#9fd8ff";
    x.fillRect(1, 4, 7, 1);
    return c;
  });
  // maestro: sombrero lima y anteojos de marco marrón; con boca para dar la clase
  const spritesMaestro = [[0, false], [1, false], [0, 1], [0, 2]].map(([pose, boca]) => {
    const c = hacerSprite(LIMA, PATAS[pose], boca);
    const x = c.getContext("2d");
    x.fillStyle = "#7a4a1a";
    for (const cx of [2, 6]) { x.fillRect(cx - 1, 4, 3, 1); x.fillRect(cx - 1, 5, 1, 1); x.fillRect(cx + 1, 5, 1, 1); x.fillRect(cx - 1, 6, 3, 1); }
    x.fillRect(4, 5, 1, 1);
    x.fillStyle = BG; x.fillRect(2, 5, 1, 1); x.fillRect(6, 5, 1, 1);
    return c;
  });
  // obrero: casco de acero y chaleco naranja reflectivo
  const spritesObrero = [0, 1].map((pose) => {
    const c = hacerSprite("#9db4c8", PATAS[pose], false);
    const x = c.getContext("2d");
    x.fillStyle = "#ff8a1f"; x.fillRect(1, 6, 7, 2);
    x.fillStyle = "#ffe14d"; x.fillRect(4, 6, 1, 2);
    x.fillStyle = "#ffe14d"; x.fillRect(2, 0, 5, 1); // franja del casco
    return c;
  });
  // versión "mojada por lluvia ácida" de un sprite: teñida de verde (se arma una vez por sprite)
  const cacheVerde = new Map();
  function verde(spr) {
    let c = cacheVerde.get(spr);
    if (!c) {
      c = document.createElement("canvas");
      c.width = spr.width; c.height = spr.height;
      const x = c.getContext("2d");
      x.drawImage(spr, 0, 0);
      x.globalCompositeOperation = "source-atop";
      x.fillStyle = "rgba(120,255,60,0.5)";
      x.fillRect(0, 0, c.width, c.height);
      cacheVerde.set(spr, c);
    }
    return c;
  }
  // engranaje 9x9 que gira en la fábrica
  const spriteEngranaje = (() => {
    const c = document.createElement("canvas");
    c.width = 9; c.height = 9;
    const x = c.getContext("2d");
    x.fillStyle = BLANCO;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      const d = Math.hypot(i - 4, j - 4);
      if ((d <= 3.4 && d >= 2.0) || (d <= 4.6 && d > 3.4 && ((i === 4 || j === 4) || (Math.abs(i - j) === 0 || i + j === 8)))) x.fillRect(i, j, 1, 1);
    }
    return c;
  })();
  // científico: sombrero turquesa y antiparras
  const spritesCient = [0, 1].map((pose) => {
    const c = hacerSprite("#2fd4c4", PATAS[pose], false);
    const x = c.getContext("2d");
    x.fillStyle = "#14808a"; x.fillRect(1, 4, 7, 1);
    x.fillStyle = "#bff7f0"; x.fillRect(2, 4, 1, 1); x.fillRect(6, 4, 1, 1);
    return c;
  });
  // mago: sombrero magenta con un chal oscuro (el cono del sombrero se dibuja aparte)
  const spritesMago = [0, 1].map((pose) => {
    const c = hacerSprite("#d12bff", PATAS[pose], false);
    const x = c.getContext("2d");
    x.fillStyle = "#5a1f8f"; x.fillRect(1, 6, 7, 2);
    x.fillStyle = "#ffe14d"; x.fillRect(3, 6, 1, 1); x.fillRect(5, 7, 1, 1);
    return c;
  });
  // minero: sombrero cobrizo con casco, lámpara encendida y franja oscura
  const spritesMinero = [0, 1].map((pose) => {
    const c = hacerSprite("#c47a45", PATAS[pose], false);
    const x = c.getContext("2d");
    x.fillStyle = "#6b3d1e"; x.fillRect(0, 2, 9, 1);
    x.fillStyle = "#fff6a8"; x.fillRect(4, 0, 1, 1); x.fillRect(3, 1, 3, 1);
    return c;
  });
  // cristal hongil: un hongo de cristal 5x6 (sombrero con brillo y tallito pálido)
  const CRISTALES = ["#5ef2ff", "#ff6bd6", "#b5ff4a", "#b48cff", "#ffd23f"];
  const CRISTAL = [".ccc.", "cbccc", "ccccc", "..w..", "..w..", "..w.."];
  const spritesCristal = CRISTALES.map((col) => {
    const c = document.createElement("canvas");
    c.width = 5; c.height = 6;
    const x = c.getContext("2d");
    CRISTAL.forEach((fila, y) => { for (let i = 0; i < 5; i++) { const ch = fila[i]; if (ch === ".") continue; x.fillStyle = ch === "c" ? col : ch === "b" ? "#ffffff" : "#d8e4f0"; x.fillRect(i, y, 1, 1); } });
    return c;
  });
  // alumnito: honguito más chico (7x6)
  const KID = [".ccccc.", "ccccccc", ".wwwww.", ".wewew.", ".wwwww.", ".w...w."];
  const spritesKid = PALETA.map((col) => {
    const c = document.createElement("canvas");
    c.width = 7; c.height = 6;
    const x = c.getContext("2d");
    KID.forEach((fila, y) => { for (let i = 0; i < 7; i++) { const ch = fila[i]; if (ch === ".") continue; x.fillStyle = ch === "c" ? col : ch === "e" ? BG : BLANCO; x.fillRect(i, y, 1, 1); } });
    return c;
  });
  // cohete-hongo: sombrero de hongo como nariz, ventanilla y aletas (7x10, apunta hacia arriba)
  const COHETE = ["..ccc..", ".ccccc.", "ccccccc", ".wwwww.", ".wvvvw.", ".wvvvw.", ".wwwww.", ".wwwww.", "fwwwwwf", "ff.w.ff"];
  const spriteCohete = (() => {
    const c = document.createElement("canvas");
    c.width = 7; c.height = 10;
    const x = c.getContext("2d");
    COHETE.forEach((fila, y) => {
      for (let i = 0; i < 7; i++) {
        const ch = fila[i];
        if (ch === ".") continue;
        x.fillStyle = ch === "c" ? CELESTE : ch === "v" ? "#7fd6ff" : ch === "f" ? "#ff5a5a" : BLANCO;
        x.fillRect(i, y, 1, 1);
      }
    });
    x.fillStyle = BLANCO;
    x.fillRect(2, 1, 1, 1); // lunar en el sombrero
    return c;
  })();
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
    S0 = Math.max(1, Math.round((dpr * Math.min(cw, ch)) / ANCHO_REF));
    niveles = [...new Set([1, 2, 3, 4, 5, 6, 8, 10, 12, S0].filter((k) => k <= Math.max(S0 * 3, 8)))].sort((a, b) => a - b);
    if (zoomIdx === null) zoomIdx = niveles.indexOf(S0);
    zoomIdx = clamp(zoomIdx, 0, niveles.length - 1);
    S = niveles[zoomIdx];
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    Wc0 = Math.ceil(canvas.width / S0);
    Hc0 = Math.ceil(canvas.height / S0);
    groundRef = Math.round(Hc0 * 0.74);
    Wc = Math.ceil(canvas.width / S);
    Hc = Math.ceil(canvas.height / S);
    lo.width = Wc; lo.height = Hc;
    const pisoAntes = groundY;
    groundY = Math.round(Hc * 0.74);
    if (pisoAntes > 0 && groundY !== pisoAntes) { // las partículas en el aire acompañan al piso, no a la pantalla
      const d = groundY - pisoAntes;
      for (const p of particulas) { p.y += d; if (p.y0 !== undefined) { p.y0 += d; p.y1 += d; } }
    }
    madre.x = C0;
    extent = Math.max(extent, Wc0 / 2);
    limitarCam();
    pintarFondo();
    for (const gi of gigantes) construirGigante(gi);
  }

  // ---------- entidades ----------
  // El hongo madre crece sin techo: por esporas ganadas (escala logarítmica, ~22% por cada
  // factor 10 pasada la etapa 3) y un poco más con cada edificio.
  const ANCLAS_MADRE = [[0, 30], [Math.log10(301), 46], [Math.log10(6001), 66], [Math.log10(150001), 92]];
  function medidasMadre(total, nEd, bonus) {
    const L = Math.log10(Math.max(0, total) + 1);
    let w;
    if (L >= ANCLAS_MADRE[3][0]) w = 92 * Math.pow(1.22, (L - ANCLAS_MADRE[3][0]) * 1);
    else {
      let i = 0;
      while (i < 2 && L > ANCLAS_MADRE[i + 1][0]) i++;
      const [l0, w0] = ANCLAS_MADRE[i], [l1, w1] = ANCLAS_MADRE[i + 1];
      w = w0 + (w1 - w0) * ((L - l0) / (l1 - l0));
    }
    w *= (bonus ? BONUS_CONSERV : 1) * (1 + 0.04 * nEd);
    w = Math.round(w);
    return { w, ch: Math.round(w * 0.57), sw: Math.max(14, Math.round(w * 0.42)), sh: Math.round(w * 0.4) };
  }
  let medM = medidasMadre(0, 0, false);
  const medidas = () => medM;
  const alturaMadre = () => { const m = medidas(); return m.ch + m.sh; };

  function nuevoVisual(i, tipo, desdePuerta) {
    const casa = HONGUITOS[tipo].casa;
    const origen = casa ? edif[casa].x : madre.x;
    const x = desdePuerta ? origen + (Math.random() - 0.5) * 12 : casa ? origen + (Math.random() - 0.5) * 50 : LIM0() + 14 + Math.random() * (2 * extent - 28);
    return {
      i, tipo, lunares: lunares(), cantaEn: 2 + Math.random() * 4, tCanta: 0, notaT: 0, x, dir: Math.random() < 0.5 ? -1 : 1, col: i % PALETA.length,
      modo: "idle", animT: Math.random() * 4, espera: desdePuerta ? 0.3 : 0.5 + Math.random() * 2,
      meta: x, entrega: 5 + Math.random() * 7, llevando: false, hop: 0, estira: 0,
      alfa: desdePuerta ? 0 : 1, tDar: 0,
    };
  }

  function sincronizarVisuales(state) {
    for (const tipo of TIPOS_VISUALES) {
      const casa = HONGUITOS[tipo].casa;
      if (casa && !edif[casa]) continue;
      const n = Math.min(state.honguitos[tipo] || 0, limiteVisibles);
      let cuenta = visuales.filter((v) => v.tipo === tipo).length;
      while (cuenta > n) { // se bajó el límite: sacar los sobrantes
        const k = visuales.findLastIndex((v) => v.tipo === tipo);
        visuales.splice(k, 1);
        cuenta--;
      }
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
    if (particulas.length < maxParticulas()) particulas.push({ x, y, vx, vy, t: 0, ...extraP });
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

  // partícula viajera hacia un punto cualquiera
  function lanzarA(x, y, x1, y1, col, dur = 0.8) {
    part(x, y, 0, 0, { tipo: "viaje", col, x0: x, y0: y, x1, y1, dur, arco: 14 + Math.random() * 14, estela: 0, local: true });
  }
  const colHongo = (v) => (v.tipo === "basico" ? ROJO : PALETA[v.col]);
  const emitirEspora = (v) => lanzarEspora(v.x, groundY - 14, colHongo(v));
  function lanzarEspora(x, y, col, lento = 0) {
    const m = medidas();
    // destino al azar dentro del sombrero (media elipse), no en una línea fija
    const dx = (Math.random() - 0.5) * m.w * 0.8;
    const alto = m.ch * Math.sqrt(Math.max(0, 1 - Math.pow((2 * dx) / m.w, 2)));
    part(x, y, 0, 0, {
      tipo: "viaje", col,
      x0: x, y0: y,
      x1: madre.x + dx, y1: groundY - m.sh - Math.random() * alto * 0.9,
      dur: 0.8 + Math.random() * 0.3 + lento, arco: 20 + Math.random() * 24, estela: 0,
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
    x = clamp(x, LIM0() + lim, LIM1() - lim);
    for (let pasada = 0; pasada < 4; pasada++) {
      let movido = false;
      for (const o of obst) {
        const hueco = o.w / 2 + ancho / 2 + 3;
        if (Math.abs(x - o.x) >= hueco) continue;
        const der = o.x + hueco, izq = o.x - hueco;
        const okDer = der <= LIM1() - lim, okIzq = izq >= LIM0() + lim;
        x = okDer && (!okIzq || Math.abs(der - x) <= Math.abs(izq - x)) ? der : izq;
        x = clamp(x, LIM0() + lim, LIM1() - lim);
        movido = true;
      }
      if (!movido) break;
    }
    return x;
  }
  // El hongo madre estorba solo con su tronco si lo que se ubica entra bajo su sombrero; si es más
  // alto que el tronco (madre chico), estorba con todo el sombrero.
  const obstaculoMadre = (alto) => { const m = medidas(); return { x: madre.x, w: alto + 2 <= m.sh ? m.sw + 8 : m.w }; };
  const altoEdif = (id) => tam(id).ch + tam(id).sh + (TAM_BASE[id].extra ?? 8);
  // `conMadre` = false al ubicar edificios: se pueden construir directamente sobre el hongo madre (delante de su tronco)
  const obstaculos = (alto = 99, conMadre = true) => [...(conMadre ? [obstaculoMadre(alto)] : []), ...Object.entries(edif).filter(([id]) => !(colocando?.mover && colocando.id === id)).map(([id, e]) => ({ x: e.x, w: tam(id).w }))];

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
        if (brotes.length >= maxBrotes()) { v.espera = 2; return; }
        v.meta = xLibre(LIM0() + 12 + Math.random() * (2 * extent - 24), 30, obstaculos(14));
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
        const gx = edif.gimnasio.x, mw = tam("gimnasio").w / 2;
        v.meta = clamp(gx + (Math.random() < 0.5 ? -1 : 1) * (mw + 6 + Math.random() * 28), LIM0() + 12, LIM1() - 12);
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

  // Trader: camina junto al trade center, hace un llamado con el teléfono y manda una acción al edificio.
  function actualizarTrader(v, dt) {
    v.alfa = Math.min(1, v.alfa + dt * 2.5);
    v.animT += dt;
    v.hop = 0;
    v.estira = 0;
    if (v.modo === "idle") {
      v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
      v.espera -= dt;
      if (v.espera <= 0) {
        const gx = edif.trade.x, mw = tam("trade").w / 2;
        v.meta = clamp(gx + (Math.random() < 0.5 ? -1 : 1) * (mw + 6 + Math.random() * 28), LIM0() + 12, LIM1() - 12);
        v.dir = Math.sign(v.meta - v.x) || 1;
        v.modo = "walk";
      }
    } else if (v.modo === "walk") {
      v.hop = Math.abs(Math.sin(v.animT * 11)) * 1.5;
      const d = v.meta - v.x, paso = VEL * 0.8 * dt;
      if (Math.abs(d) <= paso) {
        v.x = v.meta; v.modo = "llama"; v.tLlama = 0; v.hablaT = 0;
        v.dir = Math.sign(edif.trade.x - v.x) || 1;
      } else v.x += Math.sign(d) * paso;
    } else if (v.modo === "llama") {
      v.tLlama += dt;
      v.hablaT -= dt;
      v.hop = Math.abs(Math.sin(v.tLlama * 9)) * 0.8; // se agita hablando
      if (v.hablaT <= 0) {
        v.hablaT = 0.45;
        part(v.x - v.dir * 2, groundY - HH - 4, (Math.random() - 0.5) * 8, -16, { tipo: "mota", dur: 0.9, col: DORADO, r: 2 });
      }
      if (v.tLlama > 2.6) {
        // cuelga y manda una acción al gráfico del trade center
        const m = tam("trade");
        lanzarA(v.x, groundY - 12, edif.trade.x + (Math.random() - 0.5) * 8, groundY - m.sh - m.ch * 0.4, DORADO, 0.7);
        v.modo = "idle"; v.espera = 1 + Math.random() * 2.5;
      }
    }
  }

  // ---- Luna y expediciones ----
  const PULSO_VEL = 0.55, PULSO_COLA = 0.28; // en radios lunares por segundo / largo de la estela
  function geomLuna() {
    // fija en el mundo (como las nubes): tamaño y altura respecto al piso calculados para la vista más
    // alejada (1 px por celda); al acercar se agranda con el mundo y se sale de la pantalla
    const cw = canvas.width, chh = canvas.height;
    const r = Math.max(18, Math.round(Math.min(cw, chh) * 0.12));
    // nunca detrás del sombrero del madre, por grande que se ponga
    return { r, x: Math.round(Math.max(C0 + Wc0 * 0.5, C0 + medidas().w / 2 + r + 40)), y: Math.round(groundY - chh * 0.54) };
  }
  // posición de la plataforma: bajo el sombrero, del lado contrario a la rama hongo
  function padCohete() {
    const m = tam("astropuerto");
    return { x: Math.round(edif.astropuerto.x) - m.lado * (Math.round(m.sw / 2) + 6), y: groundY - 5 };
  }
  // punto de aterrizaje: la base de esta expedición (o el centro si no hay)
  function destinoLuna() {
    const L = geomLuna(), b = lunaBases[cohete.dest];
    return b ? { x: L.x + b.x * L.r, y: L.y + b.y * L.r } : { x: L.x, y: L.y };
  }
  function trayecto(u) { // curva del pad a la base: sube casi vertical y se inclina hacia ella
    const p0 = padCohete(), L = destinoLuna();
    const p1 = { x: p0.x, y: L.y + (p0.y - L.y) * 0.35 };
    const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
    return { x: a * p0.x + b * p1.x + c * L.x, y: a * p0.y + b * p1.y + c * L.y };
  }
  // ---- Caminos entre bases y pulsos de energía ----
  // Cada base nueva se une a su vecina más cercana de las anteriores (y a la segunda si queda cerca):
  // la red sale de las posiciones, que no cambian, así que se puede recalcular siempre igual.
  function sincronizarCaminos(animar) {
    const viejos = new Map(caminos.map((c) => [c.a + "-" + c.b, c]));
    caminos = [];
    for (let i = 1; i < lunaBases.length; i++) {
      const bi = lunaBases[i];
      const vec = [];
      for (let j = 0; j < i; j++) vec.push([j, Math.hypot(lunaBases[j].x - bi.x, lunaBases[j].y - bi.y)]);
      vec.sort((p, q) => p[1] - q[1]);
      const elegidos = [vec[0]];
      if (vec[1] && vec[1][1] < 0.5) elegidos.push(vec[1]);
      for (const [j, len] of elegidos) {
        const k = j + "-" + i, v = viejos.get(k);
        caminos.push(v || { a: j, b: i, len, prog: animar ? 0 : 1, t: 0 });
      }
    }
    caminosN = lunaBases.length;
  }
  function actualizarCaminos(dt) {
    for (const c of caminos) {
      if (c.prog >= 1 || c.b >= lunaVisibles) continue;
      c.t += dt;
      c.prog = clamp((c.t - 0.15) / 1.0, 0, 1);
    }
    for (let i = pulsos.length - 1; i >= 0; i--) {
      const pu = pulsos[i];
      pu.t += dt;
      // el pulso termina en esporas: cada base que alcanza lanza una espora hacia el hongo madre
      const L = geomLuna();
      for (let j = 0; j < lunaBases.length; j++) {
        if (pu.listas.has(j) || pu.dist[j] === Infinity || pu.t * PULSO_VEL < pu.dist[j]) continue;
        pu.listas.add(j);
        const b = lunaBases[j], bx = L.x + b.x * L.r, by = L.y + b.y * L.r;
        lanzarEspora(bx, by, CELESTE, 0.9 + Math.random() * 0.4);
        motas(bx, by, 3, 0.5, b.c);
      }
      if (pulsos[i].t * PULSO_VEL > pulsos[i].max + PULSO_COLA + 0.3) pulsos.splice(i, 1);
    }
  }
  // distancia (en radios lunares) de cada base al origen siguiendo los caminos ya construidos
  function lanzarPulso(origen) {
    const n = lunaBases.length, dist = new Array(n).fill(Infinity), hecho = new Array(n).fill(false);
    if (!lunaBases[origen]) return;
    dist[origen] = 0;
    for (let paso = 0; paso < n; paso++) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!hecho[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0) break;
      hecho[u] = true;
      for (const c of caminos) {
        if (c.prog < 1) continue;
        const v = c.a === u ? c.b : c.b === u ? c.a : -1;
        if (v >= 0 && dist[u] + c.len < dist[v]) dist[v] = dist[u] + c.len;
      }
    }
    const max = dist.reduce((m, d) => (d < Infinity ? Math.max(m, d) : m), 0);
    pulsos.push({ origen, dist, max, t: 0, listas: new Set() });
  }
  function iniciarExpedicion() {
    const astros = visuales.filter((v) => v.tipo === "astronauta" && !v.oculto);
    if (!astros.length || !edif.astropuerto || cohete.fase !== "espera") return false;
    cohete.dest = lunaDestino;
    const pad = padCohete();
    astros.sort((a, b) => Math.abs(a.x - pad.x) - Math.abs(b.x - pad.x));
    cohete.trip = astros.slice(0, Math.min(3, astros.length));
    for (const v of cohete.trip) { v.modo = "aborda"; v.meta = pad.x + (Math.random() - 0.5) * 4; v.dir = Math.sign(v.meta - v.x) || 1; }
    cohete.fase = "abordaje"; cohete.t = 0;
    return true;
  }
  function llamaCohete(x, y, dirY, fuerza = 1) {
    part(x + (Math.random() - 0.5) * 2, y, (Math.random() - 0.5) * 8, dirY * (14 + Math.random() * 18) * fuerza, { tipo: "mota", dur: 0.25 + Math.random() * 0.25, col: Math.random() < 0.5 ? "#ff8a1f" : "#ffe14d", r: Math.random() < 0.4 ? 2 : 1 });
  }
  function actualizarCohete(dt) {
    if (!edif.astropuerto) return;
    const pad = padCohete();
    cohete.t += dt;
    if (cohete.fase === "abordaje") {
      if (cohete.trip.every((v) => v.modo === "dentro" || !visuales.includes(v)) || cohete.t > 7) {
        for (const v of cohete.trip) { v.modo = "dentro"; v.oculto = true; }
        cohete.fase = "despegue"; cohete.t = 0;
      }
    } else if (cohete.fase === "despegue") {
      cohete.llama = Math.min(1, cohete.t / 1.2);
      llamaCohete(pad.x, groundY - 1, 1, 0.8);
      if (Math.random() < dt * 14) motas(pad.x, groundY - 2, 1, 0.5, "#c8c8dc");
      if (cohete.t > 1.4) { cohete.fase = "vuelo"; cohete.t = 0; }
    } else if (cohete.fase === "vuelo") {
      const dur = 6.5, u = clamp(cohete.t / dur, 0, 1), k = u * u * (3 - 2 * u) * 0.6 + u * u * 0.4;
      const q = trayecto(k), q2 = trayecto(Math.min(1, k + 0.02));
      cohete.x = q.x; cohete.y = q.y; cohete.ang = Math.atan2(q2.x - q.x, -(q2.y - q.y)); cohete.sc = 1 - 0.55 * k;
      const cx = q.x - Math.sin(cohete.ang) * 5 * cohete.sc, cy = q.y + Math.cos(cohete.ang) * 5 * cohete.sc;
      if (Math.random() < dt * 40) llamaCohete(cx, cy, 1, 0.5);
      if (u >= 1) {
        cohete.fase = "luna"; cohete.t = 0; cohete.pulso = false;
        // llegada: la base nueva aparece donde aterriza la nave
        lunaVisibles = lunaBases.length;
        lunaFlash = 1;
        const L = geomLuna(), d = destinoLuna(), b = lunaBases[cohete.dest];
        cohete.x = d.x; cohete.y = d.y; cohete.ang = 0; cohete.sc = 0.45;
        aroPart(L.x, L.y, L.r + 8, 0.9);
        if (b) { motas(d.x, d.y, 14, 1.2, b.c); aroPart(d.x, d.y, 10, 0.6); }
      }
    } else if (cohete.fase === "luna") {
      // los caminos nuevos se arman primero y recién entonces sale el pulso de energía desde la base
      if (!cohete.pulso && cohete.t > 1.3) { cohete.pulso = true; lanzarPulso(cohete.dest); }
      if (cohete.t > 3.2) { cohete.fase = "regreso"; cohete.t = 0; }
    } else if (cohete.fase === "regreso") {
      const dur = 5.5, u = clamp(cohete.t / dur, 0, 1), k = 1 - (u * u * (3 - 2 * u) * 0.6 + u * u * 0.4);
      const q = trayecto(k);
      cohete.x = q.x; cohete.y = q.y; cohete.ang = (1 - u) * 0.35 * (pad.x < destinoLuna().x ? 1 : -1) * (1 - u); cohete.sc = 1 - 0.55 * k;
      if (Math.random() < dt * 40) llamaCohete(q.x, q.y + 5 * cohete.sc, 1, 0.5);
      if (u >= 1) { cohete.fase = "aterriza"; cohete.t = 0; motas(pad.x, groundY - 1, 14, 0.9, "#c8c8dc"); aroPart(pad.x, groundY - 2, 14, 0.5); }
    } else if (cohete.fase === "aterriza") {
      if (cohete.t > 0.8) {
        for (const v of cohete.trip) {
          if (!visuales.includes(v)) continue;
          v.oculto = false; v.alfa = 0; v.x = pad.x + (Math.random() - 0.5) * 10; v.modo = "idle"; v.espera = 0.6 + Math.random();
        }
        cohete.trip = [];
        cohete.fase = "espera"; cohete.t = 0;
      }
    }
  }

  // Maestro: pasea seguido por sus alumnitos; al parar se da vuelta, saca un libro y da clase.
  // Tras varias clases un alumno se gradúa con diploma y salen esporas.
  const NKIDS = 3;
  function actualizarMaestro(v, dt) {
    v.alfa = Math.min(1, v.alfa + dt * 2.5);
    v.animT += dt;
    v.hop = 0;
    v.estira = 0;
    if (!v.hijos) {
      v.hijos = Array.from({ length: NKIDS }, (_, j) => ({ x: v.x - 9 * (j + 1), dir: 1, hop: 0, col: (v.i * 3 + j * 2) % PALETA.length }));
      v.clases = 0; v.clasesObj = 3 + Math.floor(Math.random() * 3); v.paseo = 0;
    }
    let mueve = false;
    if (v.modo === "idle") {
      v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
      v.espera -= dt;
      if (v.espera <= 0) {
        const gx = edif.escuela.x;
        v.meta = clamp(gx + (Math.random() - 0.5) * 220, LIM0() + 14, LIM1() - 14);
        if (Math.abs(v.meta - v.x) < 30) v.meta = clamp(v.x + (v.x < C0 ? 1 : -1) * 60, LIM0() + 14, LIM1() - 14);
        v.dir = Math.sign(v.meta - v.x) || 1;
        v.dirW = v.dir;
        v.modo = "walk";
      }
    } else if (v.modo === "walk") {
      mueve = true;
      v.hop = Math.abs(Math.sin(v.animT * 11)) * 1.5;
      const d = v.meta - v.x, paso = VEL * 0.6 * dt;
      if (Math.abs(d) <= paso) { v.x = v.meta; v.modo = "clase"; v.tClase = 0; v.dir = -v.dir; mueve = false; }
      else v.x += Math.sign(d) * paso;
    } else if (v.modo === "clase") {
      v.tClase += dt;
      v.hop = 0;
      if (Math.random() < dt * 5) part(v.x + v.dir * 7, groundY - 12, (Math.random() - 0.5) * 6, -12, { tipo: "mota", dur: 0.8, col: BLANCO, r: 1 });
      if (v.tClase > 3.5) {
        v.clases++;
        if (v.clases >= v.clasesObj) {
          v.modo = "diploma"; v.tDip = 0; v.graduado = Math.floor(Math.random() * v.hijos.length);
          const k = v.hijos[v.graduado];
          for (let i = 0; i < 3; i++) cola.push({ t: i * 0.12, fn: () => lanzarEspora(k.x, groundY - 8, LIMA) });
          motas(k.x, groundY - 8, 14, 1.3);
          aroPart(k.x, groundY - 5, 12, 0.6);
        } else { v.modo = "idle"; v.espera = 0.4; v.dir = -v.dir; }
      }
    } else if (v.modo === "diploma") {
      v.tDip += dt;
      const k = v.hijos[v.graduado];
      k.hop = Math.abs(Math.sin(v.tDip * 7)) * 5;
      if (v.tDip > 2.2) { v.clases = 0; v.clasesObj = 3 + Math.floor(Math.random() * 3); k.hop = 0; v.modo = "idle"; v.espera = 0.6; v.dir = -v.dir; }
    }
    // alumnitos: siguen al maestro en fila; al dar clase se quedan quietos mirándolo
    v.hijos.forEach((k, j) => {
      const objetivo = v.x - (v.dirW || v.dir) * (10 + j * 8);
      const d = objetivo - k.x, paso = VEL * 1.1 * dt;
      if (Math.abs(d) > 1.5) { k.x += clamp(d, -paso, paso); k.dir = Math.sign(d); k.hop = Math.abs(Math.sin(t * 12 + j)) * 1.2; }
      else {
        k.dir = Math.sign(v.x - k.x) || k.dir; // quieto: mira al maestro
        if (v.modo !== "diploma" || j !== v.graduado) k.hop = v.modo === "clase" ? Math.abs(Math.sin(t * 3 + j * 2)) * 0.6 : 0;
      }
    });
  }

  // Astronauta: camina junto al astropuerto; cuando hay expedición se sube al cohete.
  function actualizarAstronauta(v, dt) {
    if (v.oculto) { v.alfa = 0; return; }
    v.alfa = Math.min(1, v.alfa + dt * 2.5);
    v.animT += dt;
    v.hop = 0;
    v.estira = 0;
    if (v.modo === "aborda") {
      v.hop = Math.abs(Math.sin(v.animT * 13)) * 1.5;
      const d = v.meta - v.x, paso = VEL * 1.2 * dt;
      if (Math.abs(d) <= paso) { v.x = v.meta; v.modo = "dentro"; v.oculto = true; motas(v.x, groundY - 6, 4, 0.4, CELESTE); }
      else v.x += Math.sign(d) * paso;
    } else if (v.modo === "idle") {
      v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
      v.espera -= dt;
      if (v.espera <= 0) {
        const gx = edif.astropuerto.x, mw = tam("astropuerto").w / 2;
        v.meta = clamp(gx + (Math.random() < 0.5 ? -1 : 1) * (mw + 4 + Math.random() * 30), LIM0() + 12, LIM1() - 12);
        const pad = padCohete().x; // no taparle el cohete a la gente
        if (Math.abs(v.meta - pad) < 10) v.meta = pad + (v.meta >= pad ? 1 : -1) * 10;
        v.dir = Math.sign(v.meta - v.x) || 1;
        v.modo = "walk";
      }
    } else if (v.modo === "walk") {
      v.hop = Math.abs(Math.sin(v.animT * 11)) * 1.5;
      const d = v.meta - v.x, paso = VEL * 0.7 * dt;
      if (Math.abs(d) <= paso) { v.x = v.meta; v.modo = "idle"; v.espera = 1 + Math.random() * 3; }
      else v.x += Math.sign(d) * paso;
    }
  }

  // ---- Fábrica: contaminación y lluvia ácida ----
  const geomFabrica = () => {
    const m = tam("fabrica"), cx = Math.round(edif.fabrica.x), rx = Math.round(m.w / 2), mitad = Math.round(m.sw / 2);
    return { m, cx, rx, mitad, capBase: groundY - m.sh, s: m.lado };
  };
  const chimeneas = () => {
    const { m, cx, rx, capBase } = geomFabrica();
    return [-0.5, 0.28].map((u) => {
      const dx = Math.round(u * rx);
      return { dx, x: cx + dx + 1, y: capBase - 2 - Math.round(m.ch * Math.sqrt(1 - (dx / rx) ** 2)) - 6 };
    });
  };
  const nubeX = (c) => c.x;
  // Altura de la nube sobre el piso: entre 48% y 72% de la altura de referencia (la del zoom
  // inicial), así no cambia al hacer zoom.
  const nubeY = (c) => groundY - groundRef * c.fy;

  function actualizarClima(dt) {
    const obj = clamp(Math.round(contam), 0, 10);
    const vivas = () => nubes.filter((c) => !c.muere).length;
    while (vivas() < obj) {
      const r = rng(nubes.length * 977 + 13);
      nubes.push({ x: LIM0() + r() * 2 * extent, vx: (r() < 0.5 ? -1 : 1) * (2 + r() * 4), fy: 0.48 + r() * 0.24, w: 26 + Math.round(r() * 14), ph: r() * TAU, p: 0, llueve: false });
    }
    while (vivas() > obj) { // una nube menos: se purifica (si hay magos) o se disipa
      const cand = nubes.filter((c) => !c.muere);
      const c = cand.sort((a, b) => (b.golpes || 0) - (a.golpes || 0))[0] || cand[0];
      c.muere = true; c.llueve = false;
      lluvia.zonas = lluvia.zonas.filter((z) => z !== c);
      if (nMagos > 0) {
        const x = c.x, y = nubeY(c);
        motas(x, y, 14, 1.2, "#e9a8ff");
        aroPart(x, y, 16, 0.5);
        for (let i = 0; i < 3; i++) cola.push({ t: i * 0.12, fn: () => lanzarEspora(x, y, "#d12bff") });
      }
    }
    for (let i = nubes.length - 1; i >= 0; i--) if (nubes[i].muere && nubes[i].p <= 0) nubes.splice(i, 1);
    for (const c of nubes) {
      c.p = c.muere ? Math.max(0, c.p - dt * 1.2) : Math.min(1, c.p + dt * 0.4);
      if (!c.llueve) { // flotan por todo el mundo y dan la vuelta al llegar al borde
        c.x += c.vx * dt;
        if (c.x > LIM1() + 60) c.x = LIM0() - 60;
        else if (c.x < LIM0() - 60) c.x = LIM1() + 60;
      }
    }
    if (!nubes.some((c) => !c.muere)) { lluvia.activa = false; return; }
    if (!lluvia.activa) {
      lluvia.prox -= dt;
      if (lluvia.prox <= 0) {
        // empieza a llover desde algunas nubes: se quedan quietas sobre la zona que mojan
        const k = clamp(Math.ceil(nubes.length / 3), 1, 3);
        const elegidas = nubes.filter((c) => !c.muere).sort(() => Math.random() - 0.5).slice(0, k);
        lluvia.zonas = elegidas.map((c) => { c.llueve = true; return c; });
        lluvia.activa = true; lluvia.t = 0;
      }
    } else {
      lluvia.t += dt;
      for (const c of lluvia.zonas) {
        const n = dt * 40 * (c.w / 30), cnt = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
        for (let i = 0; i < cnt; i++) {
          const x = c.x + (Math.random() - 0.5) * c.w, y0 = nubeY(c) + 7, vy = 75 + Math.random() * 30;
          part(x, y0, 0, vy, { tipo: "lluvia", dur: Math.max(0.1, (groundY - y0) / vy) });
        }
        // todo honguito que toque la lluvia queda mojado (improductivo) y se le reinicia el tiempo
        for (const v of visuales) if (!v.oculto && Math.abs(v.x - c.x) <= c.w / 2 + 2) v.acidoT = ACIDO.dur * efectos.paraguas;
      }
      if (lluvia.t > 8) {
        for (const c of lluvia.zonas) c.llueve = false;
        lluvia.activa = false; lluvia.zonas = [];
        lluvia.prox = clamp(75 - nubes.length * 5, 30, 70) * (0.7 + Math.random() * 0.6);
      }
    }
  }

  // Científico: camina junto a la universidad, hace un experimento con un matraz y a veces se le prende el foco.
  const LIQUIDOS = ["#3ddc84", "#ff6fb5", "#4fb4ff", "#ffe14d"];
  function actualizarCientifico(v, dt) {
    v.alfa = Math.min(1, v.alfa + dt * 2.5);
    v.animT += dt;
    v.hop = 0;
    v.estira = 0;
    if (v.idea > 0) v.idea -= dt;
    if (v.modo === "idle") {
      v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
      v.espera -= dt;
      if (v.espera <= 0) {
        const gx = edif.universidad.x, mw = tam("universidad").w / 2;
        v.meta = clamp(gx + (Math.random() < 0.5 ? -1 : 1) * (mw + 5 + Math.random() * 30), LIM0() + 12, LIM1() - 12);
        v.dir = Math.sign(v.meta - v.x) || 1;
        v.modo = "walk";
      }
    } else if (v.modo === "walk") {
      v.hop = Math.abs(Math.sin(v.animT * 11)) * 1.5;
      const d = v.meta - v.x, paso = VEL * 0.7 * dt;
      if (Math.abs(d) <= paso) { v.x = v.meta; v.modo = "experimenta"; v.tExp = 0; v.burbT = 0; v.dir = Math.sign(edif.universidad.x - v.x) || v.dir; }
      else v.x += Math.sign(d) * paso;
    } else if (v.modo === "experimenta") {
      v.tExp += dt;
      v.burbT -= dt;
      v.hop = Math.abs(Math.sin(v.tExp * 6)) * 0.6; // agita el matraz
      if (v.burbT <= 0) {
        v.burbT = 0.18;
        part(v.x + v.dir * 6, groundY - 13, (Math.random() - 0.5) * 4, -10, { tipo: "mota", dur: 0.7, col: LIQUIDOS[Math.floor(v.tExp / 0.8) % LIQUIDOS.length], r: 1 });
      }
      if (v.tExp > 3.4) {
        if (Math.random() < 0.5) { v.idea = 1; motas(v.x, groundY - 16, 5, 0.5, "#ffe14d"); }
        v.modo = "idle"; v.espera = 1 + Math.random() * 2.5;
      }
    }
  }

  // ---- Torre de magos: caldero y purga de nubes ----
  function posCaldero() {
    const m = tam("torre");
    return { x: Math.round(edif.torre.x) - m.lado * (Math.round(m.sw / 2) + 9), y: groundY - 2 };
  }
  function rayoMagico(x0, y0, x1, y1) {
    for (let i = 0; i < 4; i++) {
      const u = Math.random();
      part(x0 + (x1 - x0) * u + (Math.random() - 0.5) * 3, y0 + (y1 - y0) * u + (Math.random() - 0.5) * 3, 0, 0, { tipo: "mota", dur: 0.35, col: Math.random() < 0.5 ? "#e9a8ff" : "#fff", r: 1 });
    }
  }
  function actualizarMago(v, dt) {
    v.alfa = Math.min(1, v.alfa + dt * 2.5);
    v.animT += dt;
    v.hop = 0;
    v.estira = 0;
    if (v.modo === "idle") {
      v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
      v.espera -= dt;
      if (v.espera <= 0) {
        const vivas = nubes.filter((c) => !c.muere && c.p > 0.5);
        if (vivas.length && Math.random() < 0.45) { // a purificar una nube
          vivas.sort((a, b) => Math.abs(a.x - v.x) - Math.abs(b.x - v.x));
          v.objetivo = vivas[0]; v.modo = "purga"; v.tCast = 0; v.dir = Math.sign(v.objetivo.x - v.x) || v.dir;
        } else {
          const c = posCaldero();
          v.meta = c.x + (Math.random() < 0.5 ? -1 : 1) * (7 + Math.random() * 8);
          v.dir = Math.sign(v.meta - v.x) || 1;
          v.modo = "walk";
        }
      }
    } else if (v.modo === "walk") {
      v.hop = Math.abs(Math.sin(v.animT * 11)) * 1.5;
      const d = v.meta - v.x, paso = VEL * 0.7 * dt;
      if (Math.abs(d) <= paso) { v.x = v.meta; v.modo = "remueve"; v.tRem = 0; v.burbT = 0; v.dir = Math.sign(posCaldero().x - v.x) || v.dir; }
      else v.x += Math.sign(d) * paso;
    } else if (v.modo === "remueve") {
      v.tRem += dt;
      v.burbT -= dt;
      v.hop = Math.abs(Math.sin(v.tRem * 5)) * 0.5;
      if (v.burbT <= 0) { v.burbT = 0.15; const c = posCaldero(); part(c.x + (Math.random() - 0.5) * 5, c.y - 8, (Math.random() - 0.5) * 6, -12, { tipo: "mota", dur: 0.6, col: Math.random() < 0.5 ? "#7fff3a" : "#e9a8ff", r: 1 }); }
      if (v.tRem > 3.4) { // la poción está lista: salen esporas del caldero
        const c = posCaldero();
        motas(c.x, c.y - 9, 10, 1, "#e9a8ff");
        for (let i = 0; i < 2; i++) cola.push({ t: i * 0.15, fn: () => lanzarEspora(c.x, c.y - 10, "#d12bff") });
        v.modo = "idle"; v.espera = 0.8 + Math.random() * 2;
      }
    } else if (v.modo === "purga") {
      v.tCast += dt;
      v.hop = v.tCast < 0.4 ? 0 : Math.abs(Math.sin(v.tCast * 10)) * 0.8;
      if (v.objetivo && v.tCast > 0.4) rayoMagico(v.x + v.dir * 5, groundY - 16, v.objetivo.x, nubeY(v.objetivo) + 5);
      if (v.tCast > 1.8) {
        if (v.objetivo) { v.objetivo.golpes = (v.objetivo.golpes || 0) + 1; motas(v.objetivo.x, nubeY(v.objetivo) + 4, 8, 0.8, "#e9a8ff"); }
        v.objetivo = null; v.modo = "idle"; v.espera = 1 + Math.random() * 2.5;
      }
    }
  }

  // ---- Eventos del cielo (espora dorada, fiebre del micelio, cometa de ideas) ----
  function spawnEvento(tipo) {
    if (!tipo) {
      const conCient = (visuales.some((v) => v.tipo === "cientifico"));
      const pesos = Object.entries(EVENTOS).filter(([k]) => k !== "cometa" || conCient);
      let r = Math.random() * pesos.reduce((a, [, e]) => a + e.peso, 0);
      tipo = (pesos.find(([, e]) => (r -= e.peso) < 0) || pesos[0])[0];
    }
    const dir = Math.random() < 0.5 ? -1 : 1;
    cielo.push({
      tipo, x: camX + dir * -Wc * 0.45, y: groundY - groundRef * (0.35 + Math.random() * 0.4),
      vx: dir * (7 + Math.random() * 7), t: 0, vida: EVENTO_CFG.vida + efectos.eventoDur, ph: Math.random() * TAU, auto: false,
    });
  }
  function actualizarEventos(dt, state) {
    evT -= dt;
    if (evT <= 0) {
      if (cielo.length < 2) spawnEvento();
      evT = (EVENTO_CFG.intervaloMin + Math.random() * (EVENTO_CFG.intervaloMax - EVENTO_CFG.intervaloMin)) / efectos.eventoFreq;
    }
    for (let i = cielo.length - 1; i >= 0; i--) {
      const ev = cielo[i];
      ev.t += dt;
      ev.x += ev.vx * dt;
      if (ev.t > ev.vida) { cielo.splice(i, 1); continue; }
      if (!ev.auto && ev.t > 2.5) { // los graduados recolectores a veces los cobran solos
        ev.auto = true;
        if (Math.random() < efectos.autoEvento) { tomarEvento(ev); opciones.onEvento?.(ev.tipo); }
      }
    }
  }
  function tomarEvento(ev) {
    const i = cielo.indexOf(ev);
    if (i >= 0) cielo.splice(i, 1);
    motas(ev.x, evY(ev), 24, 1.6, ev.tipo === "fiebre" ? "#ff4fd8" : ev.tipo === "cometa" ? "#bff7f0" : "#ffd23f");
    aroPart(ev.x, evY(ev), 24, 0.6);
    return ev.tipo;
  }
  const evY = (ev) => ev.y + Math.sin(ev.t * 2 + ev.ph) * 4;
  function dibujarEventos() {
    for (const ev of cielo) {
      const x = Math.round(ev.x), y = Math.round(evY(ev));
      const falta = ev.vida - ev.t;
      if (falta < 3 && Math.floor(ev.t * 6) % 2) continue; // titila antes de irse
      g.globalAlpha = Math.min(1, ev.t * 2);
      if (ev.tipo === "dorada") {
        g.globalAlpha *= 0.3; disco(x, y, 8, "#ffd23f"); g.globalAlpha = Math.min(1, ev.t * 2);
        disco(x, y, 4, "#ffd23f"); aro(x, y, 5, BLANCO);
        g.fillStyle = "#fff6a8"; g.fillRect(x - 1, y - 2, 1, 1);
        const k = Math.floor(t * 4) % 2 ? 7 : 6;
        g.fillRect(x - k, y, 2, 1); g.fillRect(x + k - 1, y, 2, 1); g.fillRect(x, y - k, 1, 2); g.fillRect(x, y + k - 1, 1, 2);
      } else if (ev.tipo === "fiebre") {
        const col = ["#ff4fd8", "#4fb4ff", "#3ddc84", "#ffd23f"][Math.floor(t * 6) % 4];
        g.globalAlpha *= 0.3; disco(x, y, 8, col); g.globalAlpha = Math.min(1, ev.t * 2);
        disco(x, y, 4, col); aro(x, y, 5, BLANCO);
      } else {
        for (let k = 1; k <= 9; k++) { g.globalAlpha = Math.min(1, ev.t * 2) * (1 - k / 10); g.fillStyle = "#bff7f0"; g.fillRect(x - Math.sign(ev.vx) * k * 2, y + Math.round(k * 0.4), 2, 2); }
        g.globalAlpha = Math.min(1, ev.t * 2); disco(x, y, 3, BLANCO);
      }
      g.globalAlpha = 1;
    }
  }

  // Obrero: entra a la fábrica, sale con una cajita, la deja en la cinta y de ahí sale un hongo chiquito.
  function actualizarObrero(v, dt) {
    if (v.oculto) {
      v.alfa = 0;
      v.tDentro -= dt;
      brillos.fabrica = Math.max(brillos.fabrica || 0, 0.25);
      if (v.tDentro <= 0) {
        const G = geomFabrica();
        v.oculto = false; v.alfa = 0; v.caja = true; v.modo = "lleva";
        v.x = G.cx + (Math.random() - 0.5) * 4;
        v.meta = G.cx + G.s * (G.mitad + 3);
        v.dir = Math.sign(v.meta - v.x) || G.s;
      }
      return;
    }
    v.alfa = Math.min(1, v.alfa + dt * 2.5);
    v.animT += dt;
    v.hop = 0;
    v.estira = 0;
    if (v.modo === "idle") {
      v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
      v.espera -= dt;
      if (v.espera <= 0) { v.meta = edif.fabrica.x + (Math.random() - 0.5) * 4; v.dir = Math.sign(v.meta - v.x) || 1; v.modo = "ir"; }
    } else if (v.modo === "ir" || v.modo === "lleva") {
      v.hop = Math.abs(Math.sin(v.animT * 12)) * 1.4;
      const d = v.meta - v.x, paso = VEL * 0.9 * dt;
      if (Math.abs(d) <= paso) {
        v.x = v.meta;
        if (v.modo === "ir") { v.modo = "dentro"; v.oculto = true; v.tDentro = 1.5 + Math.random() * 2.5; motas(v.x, groundY - 6, 3, 0.4, "#c8c8dc"); }
        else { v.modo = "deja"; v.tDeja = 0; }
      } else v.x += Math.sign(d) * paso;
    } else if (v.modo === "deja") {
      v.tDeja += dt;
      v.hop = Math.abs(Math.sin(v.tDeja * 10)) * 0.8;
      if (v.tDeja > 0.5) {
        v.caja = false;
        const G = geomFabrica(), fin = G.cx + G.s * (G.rx - 3);
        cola.push({ t: 1.1, fn: () => {
          if (brotes.length >= maxBrotes() || !edif.fabrica) return;
          const col = Math.floor(Math.random() * PALETA.length);
          brotes.push({ x: Math.round(fin + G.s * (2 + Math.random() * 8)), t: 0, vida: 12 + Math.random() * 6, col });
          motas(fin + G.s * 4, groundY - 3, 4, 0.4, PALETA[col]);
        } });
        v.modo = "idle"; v.espera = 0.2 + Math.random() * 1.5;
      }
    }
  }

  // ---- Mina hongil: nido de túneles bajo el piso, mineros y yacimientos de cristal ----
  // Los nodos son puntos del PISO del túnel (x al costado de la entrada, y hacia abajo). Los túneles
  // serpentean y se ramifican como un hormiguero; los nodos "cámara" son salas grandes con yacimientos.
  const TR = 5.5; // radio de los túneles (entra un honguito)
  const minaProfMax = () => Math.round(0.26 * Hc0 * 2.6);
  // cuánto de la mina está cavada según los mineros (0..1): crece con el log de la cantidad
  const minaObjetivo = (n) => (n <= 0 ? 0 : clamp(0.1 + (Math.log10(n) / 2.3) * 0.9, 0.1, 1));
  const empinado = (a, b) => Math.abs(b.y - a.y) > 1.3 * Math.abs(b.x - a.x);
  function generarMina() {
    const r = rng(7 + semilla * 31);
    const medio = clamp(Math.round(0.7 * extent), 160, 440), prof = minaProfMax(), PRESUPUESTO = 760;
    const nodos = [], yac = [];
    const nuevo = (x, y, par) => {
      nodos.push({ x, y, par, d: par < 0 ? 0 : nodos[par].d + Math.hypot(x - nodos[par].x, y - nodos[par].y), cam: 0 });
      return nodos.length - 1;
    };
    // choca con un tramo de otra rama (los vecinos de la misma rama tienen una distancia parecida desde la entrada)
    const cerca = (x, y, d) => nodos.some((n) => Math.abs(n.d - d) > 18 && Math.hypot(n.x - x, n.y - y) < 9);
    const camara = (i) => {
      const n = nodos[i], R = 16 + r() * 9, ry = Math.min(Math.round(R * 0.62), Math.floor((n.y - 8) / 2));
      if (ry < 9) return; // una sala no puede asomar sobre el piso
      n.cam = R; n.camY = ry;
      const cs = 0.6 + R / 40, k = R > 21 ? 2 : 1;
      for (let q = 0; q < k; q++) {
        const lado = k === 1 ? (r() < 0.5 ? -1 : 1) : q ? 1 : -1;
        const max = Math.round(5 + R / 3);
        yac.push({ nodo: i, ox: lado * R * 0.35, cs, max, stock: max * (0.45 + r() * 0.55), cd: r() * 10, col: Math.floor(r() * CRISTALES.length), col2: Math.floor(r() * CRISTALES.length), stand: Math.min(R - 4, 7 + 6 * cs) });
      }
    };
    // pozo de entrada, casi vertical, con escalera
    let n0 = nuevo(0, 0, -1);
    for (let y = 4; y <= 40; y += 4) n0 = nuevo((r() - 0.5) * 1.5, y, n0);
    const cola = [];
    cola.push({ n: n0, x: nodos[n0].x, y: 40, ang: 0.35, vida: 55 + r() * 40 }, { n: n0, x: nodos[n0].x, y: 40, ang: Math.PI - 0.35, vida: 55 + r() * 40 }, { n: n0, x: nodos[n0].x, y: 40, ang: 1.3, vida: 40 + r() * 30 });
    const limite = (ang) => (Math.cos(ang) >= 0 ? clamp(ang, -0.4, 1.5) : clamp(ang, Math.PI - 1.5, Math.PI + 0.4));
    let guardia = 0;
    while (cola.length && nodos.length < PRESUPUESTO && guardia++ < 20000) {
      const a = cola.shift();
      a.ang = limite(a.ang + (r() - 0.5) * 0.7);
      if (a.y > prof - 22) a.ang = limite(a.ang - Math.sign(Math.sin(a.ang)) * 0.4); // al fondo se aplana
      let nx = a.x + Math.cos(a.ang) * 4, ny = a.y + Math.sin(a.ang) * 4;
      if (Math.abs(nx) > medio) { a.ang = Math.PI - a.ang; nx = a.x + Math.cos(a.ang) * 4; ny = a.y + Math.sin(a.ang) * 4; }
      ny = clamp(ny, 42, prof);
      if (Math.abs(nx) > medio || cerca(nx, ny, nodos[a.n].d + 4)) { if (!nodos[a.n].cam && nodos[a.n].d > 40) camara(a.n); continue; }
      a.n = nuevo(nx, ny, a.n); a.x = nx; a.y = ny; a.vida--;
      if (a.vida <= 0) { camara(a.n); continue; }
      if (a.vida > 8 && r() < 0.075) cola.push({ n: a.n, x: a.x, y: a.y, ang: a.ang + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.7), vida: 14 + r() * 40 });
      if (a.vida > 6 && !nodos[a.n].cam && nodos[a.n].d > 50 && r() < 0.03) camara(a.n);
      cola.push(a);
    }
    // cámaras siempre en las puntas largas que quedaron sin sala
    const hijos = new Array(nodos.length).fill(0);
    nodos.forEach((n) => { if (n.par >= 0) hijos[n.par]++; });
    nodos.forEach((n, i) => { if (!hijos[i] && !n.cam && n.d > 30) camara(i); });
    // escaleras: solo en tramos empinados y largos, rectas y sin pisarse entre sí; el resto son rampas
    const empinada = (n) => n.par >= 0 && Math.abs(n.y - nodos[n.par].y) > 1.8 * Math.abs(n.x - nodos[n.par].x);
    const tramos = [];
    nodos.forEach((n, i) => {
      if (!empinada(n)) return;
      const p = nodos[n.par];
      if (p.tramo !== undefined) n.tramo = p.tramo; else { n.tramo = tramos.length; tramos.push({ ids: [], x: p.x, y0: p.y }); }
      tramos[n.tramo].ids.push(i);
    });
    const fijos = [];
    for (const tr of tramos) {
      const y1 = tr.ids.reduce((m, i) => Math.max(m, nodos[i].y), 0);
      if (y1 - tr.y0 < 12 || fijos.some((k) => Math.abs(k.x - tr.x) < 10 && k.y0 < y1 && tr.y0 < k.y1)) { for (const i of tr.ids) nodos[i].tramo = undefined; continue; }
      tr.y1 = y1; fijos.push(tr);
      for (const i of tr.ids) { nodos[i].x = tr.x; nodos[i].esc = true; }
    }
    nodos.forEach((n) => { if (!n.esc) n.tramo = undefined; });
    const orden = nodos.map((_, i) => i).sort((p, q) => nodos[p].d - nodos[q].d);
    const total = nodos.reduce((m, n) => Math.max(m, n.d), 1);
    const prof2 = nodos.reduce((m, n) => Math.max(m, n.y), 0) + 6;
    const mg = 30, cv = () => { const c = document.createElement("canvas"); c.width = 2 * medio + 2 * mg; c.height = prof + mg + 24; return c; };
    mina = { nodos, yac, orden, total, depth: prof2, medio, mg, cvBorde: cv(), cvHueco: cv(), cvDet: cv(), nDib: 0 };
  }
  // dibuja en los lienzos los nodos que el frente ya alcanzó (se cava de a poco, sin redibujar todo)
  function revelarMina(frente) {
    const m = mina, cb = m.cvBorde.getContext("2d"), ch = m.cvHueco.getContext("2d"), cd = m.cvDet.getContext("2d");
    const disco2 = (c, x, y, rr, col) => { c.fillStyle = col; for (let dy = -rr; dy <= rr; dy++) { const w = Math.floor(Math.sqrt(rr * rr - dy * dy + rr * 0.4)); c.fillRect(Math.round(x) - w, Math.round(y) + dy, w * 2 + 1, 1); } };
    const elipse2 = (c, x, y, rx, ry, col) => { c.fillStyle = col; for (let dy = -ry; dy <= ry; dy++) { const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2))); c.fillRect(Math.round(x) - w, Math.round(y) + dy, w * 2 + 1, 1); } };
    while (m.nDib < m.orden.length && m.nodos[m.orden[m.nDib]].d <= frente) {
      const i = m.orden[m.nDib++], n = m.nodos[i], p = n.par >= 0 ? m.nodos[n.par] : null;
      const X = n.x + m.medio + m.mg, Y = n.y;
      const pts = p ? [[p.x, p.y], [(p.x + n.x) / 2, (p.y + n.y) / 2], [n.x, n.y]] : [[n.x, n.y]];
      for (const [px, py] of pts) {
        disco2(cb, px + m.medio + m.mg, py - TR + 0.5, TR + 1, "#34344e");
        disco2(ch, px + m.medio + m.mg, py - TR + 0.5, TR, "#08080e");
      }
      if (n.cam) { // sala: elipse más ancha que alta, con el piso a la altura del túnel
        elipse2(cb, X, Y - n.camY + 1, n.cam + 1, n.camY + 1, "#34344e");
        elipse2(ch, X, Y - n.camY + 1, n.cam, n.camY, "#08080e");
      }
      if (p && n.esc) { // escalera: dos largueros y peldaños cada 3 celdas
        const pasos = Math.max(1, Math.round(Math.abs(n.y - p.y)));
        for (let k = 0; k <= pasos; k++) {
          const f = k / pasos, lx = Math.round(p.x + (n.x - p.x) * f + m.medio + m.mg), ly = Math.round(p.y + (n.y - p.y) * f);
          cd.fillStyle = "#9a6b3a"; cd.fillRect(lx - 2, ly - 5, 1, 1); cd.fillRect(lx + 2, ly - 5, 1, 1);
          if (k % 3 === 0) { cd.fillStyle = "#c28a4f"; cd.fillRect(lx - 2, ly - 5, 5, 1); }
        }
      } else if (p && n.d % 24 < 4.2 && n.d > 12) { // viga de madera de vez en cuando
        const lx = Math.round(n.x + m.medio + m.mg);
        cd.fillStyle = "#4a3320"; cd.fillRect(lx, Math.round(n.y) - 10, 1, 10); cd.fillRect(lx - 1, Math.round(n.y) - 11, 3, 1);
      }
    }
  }
  const cantMineros = (y) => visuales.filter((v) => v.dep === y).length;
  function lleno(y) { return y.stock - cantMineros(y) >= 0.99; }
  function sincronizarMina(dt) {
    if (!edif.mina) { mina = null; minaKey = ""; return; }
    const key = String(semilla);
    if (key !== minaKey) {
      minaKey = key;
      generarMina();
      lastMx = edif.mina.x;
      for (const v of visuales) if (v.tipo === "minero") { v.yOff = 0; v.ruta = null; v.dep = null; v.modo = "idle"; v.x = edif.mina.x + (Math.random() - 0.5) * 10; v.cristal = null; v.espera = Math.random() * 3; }
      revelarMina((minaObjetivo(nMineros)) * mina.total);
      minaP = minaObjetivo(nMineros);
      precalentarMineros();
    }
    // si movieron el edificio, la mina y los mineros que están adentro se mueven con él
    if (edif.mina.x !== lastMx) {
      const d = edif.mina.x - lastMx;
      lastMx = edif.mina.x;
      for (const v of visuales) if (v.tipo === "minero") { v.x += d; if (v.ruta) for (const q of v.ruta) q.x += d; }
    }
    const obj = minaObjetivo(nMineros);
    if (minaP === null) minaP = obj;
    // la mina se cava de a poco hacia el objetivo (unas 6 celdas por segundo)
    const antes = minaP;
    minaP = minaP < obj ? Math.min(obj, minaP + (9 / mina.total) * dt) : obj;
    const frente = minaP * mina.total, nAntes = mina.nDib;
    revelarMina(frente);
    // polvo en las puntas que se están cavando
    if (minaP !== antes) {
      for (let k = Math.max(0, nAntes - 2); k < mina.nDib; k++) {
        const n = mina.nodos[mina.orden[k]];
        if (Math.random() < dt * 40) part(edif.mina.x + n.x, groundY + n.y - 5, (Math.random() - 0.5) * 12, -4 - Math.random() * 8, { tipo: "mota", dur: 0.55, col: Math.random() < 0.5 ? "#6a6a88" : "#3a3a52", r: 1 });
      }
    }
    // los yacimientos vuelven a crecer solos si nadie los toca
    for (const y of mina.yac) {
      if (y.golpe > 0) y.golpe -= dt;
      if (y.stock >= y.max) continue;
      if (y.cd > 0) { y.cd -= dt; continue; }
      y.stock = Math.min(y.max, y.stock + dt * (y.max / 70));
    }
  }
  function dibujarMina() {
    if (!mina || !edif.mina) return;
    const x0 = edif.mina.x, frente = (minaP ?? 0) * mina.total, ox = Math.round(x0 - mina.medio - mina.mg);
    g.drawImage(mina.cvBorde, ox, groundY + 1);
    g.drawImage(mina.cvHueco, ox, groundY + 1);
    g.drawImage(mina.cvDet, ox, groundY + 1);
    // yacimientos: racimos grandes de cristales-hongo que se achican al picarlos y vuelven a crecer
    for (const y of mina.yac) {
      const n = mina.nodos[y.nodo];
      if (n.d > frente) continue;
      const f = y.stock / y.max;
      if (f < 0.04) { g.fillStyle = "#3a3a52"; g.fillRect(Math.round(x0 + n.x + y.ox) - 2, groundY + Math.round(n.y) - 1, 5, 1); continue; }
      const cx = Math.round(x0 + n.x + y.ox), fy = groundY + Math.round(n.y), k = (0.35 + 0.65 * f) * y.cs;
      g.globalAlpha = 0.1 * f; disco(cx, fy - 7 * k, Math.round(9 * k), CRISTALES[y.col]); g.globalAlpha = 1;
      const tiembla = y.golpe > 0 ? Math.round(Math.sin(t * 90)) : 0;
      for (const [dx, sc, ci] of [[-5, 1.4, y.col2], [5, 1.7, y.col], [0, 2.1, y.col]]) {
        const w = Math.max(3, Math.round(5 * sc * k)), h = Math.max(3, Math.round(6 * sc * k));
        g.drawImage(spritesCristal[ci], cx + Math.round(dx * k) - (w >> 1) + tiembla, fy - h, w, h);
      }
    }
  }
  // avanza por la ruta {x,y}[] a `vel` celdas/s; devuelve true al llegar al final
  function seguirRuta(v, dt, vel) {
    let resto = vel * dt;
    v.trepa = false;
    while (v.ruta && v.ri < v.ruta.length && resto > 0) {
      const p = v.ruta[v.ri], dx = p.x - v.x, dy = p.y - v.yOff, d = Math.hypot(dx, dy);
      if (Math.abs(dy) > 1.3 * Math.abs(dx) && d > 0.01) { v.trepa = true; if (resto === vel * dt) resto *= 0.6; }
      if (d <= resto) { v.x = p.x; v.yOff = p.y; resto -= d; v.ri++; }
      else { v.x += (dx / d) * resto; v.yOff += (dy / d) * resto; resto = 0; }
      if (Math.abs(dx) > 0.5 && !v.trepa) v.dir = Math.sign(dx);
    }
    return v.ri >= v.ruta.length;
  }
  function rutaA(y) {
    const M = edif.mina, cadena = [];
    for (let k = y.nodo; k >= 0; k = mina.nodos[k].par) cadena.unshift(k);
    const ruta = [{ x: M.x, y: 0 }];
    for (const k of cadena) ruta.push({ x: M.x + mina.nodos[k].x, y: mina.nodos[k].y });
    // frente al racimo, del lado libre
    const n = mina.nodos[y.nodo], ocupado = visuales.filter((q) => q.dep === y && q.lado).map((q) => q.lado);
    const lado = ocupado.includes(-1) ? 1 : ocupado.includes(1) ? -1 : (Math.random() < 0.5 ? -1 : 1);
    ruta.push({ x: M.x + n.x + y.ox + lado * y.stand, y: n.y });
    return { ruta, lado };
  }
  function asignarDeposito(v, y) {
    const { ruta, lado } = rutaA(y);
    v.dep = y; v.lado = lado; v.ruta = ruta; v.ri = 0; v.modo = "baja";
    v.nGolpes = 4 + Math.floor(Math.random() * 3);
  }
  // al cargar la partida los mineros ya están repartidos por la mina (nadie arranca todos de la puerta)
  function precalentarMineros() {
    const M = edif.mina;
    for (const v of visuales) {
      if (v.tipo !== "minero" || Math.random() < 0.3) continue;
      const libres = mina.yac.filter((y) => mina.nodos[y.nodo].d <= minaP * mina.total - 2 && lleno(y));
      if (!libres.length) break;
      asignarDeposito(v, libres[Math.floor(Math.random() * libres.length)]);
      const fase = Math.random();
      if (fase < 0.35) { v.ri = Math.floor(Math.random() * (v.ruta.length - 1)) + 1; const q = v.ruta[v.ri - 1]; v.x = q.x; v.yOff = q.y; }
      else {
        const q = v.ruta[v.ruta.length - 1]; v.x = q.x; v.yOff = q.y; v.ri = v.ruta.length;
        v.dir = -v.lado; v.modo = "pica"; v.tPica = Math.random() * v.nGolpes * 0.8 * 0.8; v.golpes = Math.floor((v.tPica + 0.256) / 0.8);
      }
      v.alfa = 1;
    }
  }
  const CICLO_PICO = 0.8;
  function actualizarMinero(v, dt) {
    const M = edif.mina;
    if (!M) return;
    if (v.yOff === undefined) v.yOff = 0;
    v.alfa = Math.min(1, v.alfa + dt * 2.5);
    v.animT += dt;
    v.hop = 0;
    v.estira = 0;
    if (v.modo === "idle") {
      v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
      v.espera -= dt;
      if (v.espera > 0 || !mina) return;
      const frente = (minaP ?? 0) * mina.total - 2;
      const libres = mina.yac.filter((y) => mina.nodos[y.nodo].d <= frente && lleno(y) && cantMineros(y) < 2);
      if (!libres.length) { v.espera = 1 + Math.random() * 2; return; }
      asignarDeposito(v, libres[Math.floor(Math.random() * libres.length)]);
      v.modo = "baja";
    } else if (v.modo === "baja" || v.modo === "sube") {
      const llego = seguirRuta(v, dt, VEL * (v.modo === "baja" ? 0.85 : 0.7));
      if (!v.trepa) v.hop = Math.abs(Math.sin(v.animT * 11)) * 1.2;
      else v.estira = Math.sin(v.animT * 9) * 0.8;
      if (llego) {
        if (v.modo === "baja") { v.modo = "pica"; v.tPica = 0; v.golpes = 0; v.dir = -v.lado; }
        else { v.modo = "deja"; v.tDeja = 0; v.dir = Math.sign(M.x - v.x) || v.dir; }
      }
    } else if (v.modo === "pica") {
      const y = v.dep;
      v.tPica += dt;
      const g2 = Math.floor((v.tPica + (1 - 0.68) * CICLO_PICO) / CICLO_PICO);
      if (g2 > v.golpes) { // impacto del pico contra el cristal
        v.golpes = g2;
        const cx = M.x + mina.nodos[y.nodo].x + y.ox, fy = groundY + mina.nodos[y.nodo].y - 8;
        y.stock = Math.max(0, y.stock - 1 / v.nGolpes); y.cd = 20; y.golpe = 0.15;
        motas(cx - v.dir * -3, fy, 5, 0.9, CRISTALES[y.col]);
        for (let k = 0; k < 3; k++) part(cx + (Math.random() - 0.5) * 4, fy, (Math.random() - 0.5) * 30, -10 - Math.random() * 14, { tipo: "mota", dur: 0.5, col: "#fff", r: 1 });
      }
      if (v.golpes >= v.nGolpes && (v.tPica % CICLO_PICO) / CICLO_PICO > 0.9) {
        v.cristal = y.col; v.dep = null;
        const volver = [...v.ruta].reverse().map((p) => ({ ...p }));
        v.ruta = volver; v.ri = 0; v.modo = "sube";
      }
    } else if (v.modo === "deja") {
      v.tDeja += dt;
      v.hop = Math.abs(Math.sin(v.tDeja * 10)) * 0.8;
      if (v.tDeja > 0.45 && v.cristal !== null && v.cristal !== undefined) {
        // procesamiento: el cristal entra al edificio y salen esporas desde el sombrero
        const m = tam("mina"), col = CRISTALES[v.cristal];
        brillos.mina = 1;
        motas(M.x, groundY - 7, 8, 1, col);
        lanzarEspora(M.x + (Math.random() - 0.5) * m.w * 0.4, groundY - m.sh - m.ch * 0.4, col);
        v.cristal = null;
      }
      if (v.tDeja > 0.9) { v.modo = "idle"; v.espera = 0.3 + Math.random() * 2.5; }
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
        v.meta = clamp(edif.conservatorio.x + (Math.random() - 0.5) * 80, LIM0() + 12, LIM1() - 12);
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

  // golpe crítico: destello dorado sobre un honguito de ese tipo y unas esporas extra al madre
  function criticoVisual(tipo) {
    const lista = visuales.filter((v) => v.tipo === tipo && !v.oculto);
    const v = lista[Math.floor(Math.random() * lista.length)];
    const x = v ? v.x : edif[HONGUITOS[tipo].casa]?.x;
    if (x === undefined) return;
    motas(x, groundY - 10, 18, 1.5, "#ffe14d");
    aroPart(x, groundY - 8, 16, 0.5);
    for (let i = 0; i < 4; i++) cola.push({ t: i * 0.1, fn: () => lanzarEspora(x, groundY - 12, "#ffe14d") });
  }

  // las acciones tocaron el techo: lluvia de esporas de golpe hacia el hongo madre
  function cobroBolsa() {
    const m = tam("trade"), ex = edif.trade.x, ey = groundY - m.sh - m.ch, eyRel = m.sh + m.ch; // eyRel: altura sobre el piso
    brillos.trade = 1;
    aroPart(ex, ey + m.ch * 0.4, 50, 0.7);
    motas(ex, ey, 18, 1.6, DORADO);
    for (let i = 0; i < 26; i++) cola.push({ t: i * 0.045, fn: () => lanzarEspora(ex + (Math.random() - 0.5) * m.w * 0.6, groundY - eyRel + Math.random() * m.ch * 0.5, i % 3 ? DORADO : PALETA[i % PALETA.length]) });
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
    semilla = state.semilla || 0;
    tBolsa = state.bolsa?.t || 0;
    hayTraders = (state.honguitos.trader || 0) > 0;
    lunaBases = state.luna?.bases || [];
    const nL = state.luna?.n || 0;
    if (nLuna === null || nL < nLuna) { nLuna = nL; lunaVisibles = lunaBases.length; cohete.fase = "espera"; for (const v of visuales) v.oculto = false; }
    if (nL > nLuna) {
      const varias = nL - nLuna > 1;
      nLuna = nL;
      lunaVisibles = Math.max(lunaVisibles, lunaBases.length - 1);
      lunaDestino = state.luna.destino ?? lunaBases.length - 1;
      const animado = !varias && iniciarExpedicion();
      if (!animado) lunaVisibles = lunaBases.length; // sin animación: la base aparece directo
      if (caminosN !== lunaBases.length) sincronizarCaminos(animado);
    }
    if (caminosN !== lunaBases.length) sincronizarCaminos(false);
    actualizarCaminos(dt);
    lunaFlash = Math.max(0, lunaFlash - dt * 0.8);
    if (nBolsa === null) nBolsa = state.bolsa?.n || 0;
    if ((state.bolsa?.n || 0) !== nBolsa) {
      const hubo = (state.bolsa?.n || 0) > nBolsa;
      nBolsa = state.bolsa.n;
      if (hubo && edif.trade) cobroBolsa();
    }
    for (let i = cola.length - 1; i >= 0; i--) { cola[i].t -= dt; if (cola[i].t <= 0) { cola[i].fn(); cola.splice(i, 1); } }
    bonusMadre = Object.keys(state.edificios).some((id) => EDIFICIOS[id]?.crecimientoMadre);
    medM = medidasMadre(state.total.toNumber(), Object.keys(state.edificios).length, bonusMadre);
    coloresMadre = ["#ff4d4d", ...Object.keys(state.edificios).filter((id) => EDIFICIOS[id]).map((id) => EDIFICIOS[id].color)];
    const otros = [];
    for (const id of Object.keys(EDIFICIOS)) {
      const ec = state.edificios[id];
      if (!ec) { delete edif[id]; continue; }
      const nuevo = !edif[id];
      if (ec.dx === undefined) ec.dx = ((ec.x ?? 0.5) - 0.5) * Wc0; // partidas viejas: fracción de pantalla -> celdas desde el madre
      const x = xLibre(C0 + ec.dx, tam(id).w, otros); // el hongo madre no los empuja al crecer
      edif[id] = { x };
      otros.push({ x, w: tam(id).w });
      if (nuevo && !inicial) {
        const cy = groundY - tam(id).ch - tam(id).sh * 0.5;
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
    // hasta dónde llega el mundo: el que haya en pantalla o lo que ocupan madre y edificios
    extent = Math.max(Wc0 / 2, (medidas().w + Object.keys(edif).reduce((a, id) => a + tam(id).w + 24, 0) + 120) / 2);
    limitarCam();

    sincronizarGigantes(state, inicial);
    for (const gi of gigantes) if (gi.p < 1) gi.p = Math.min(1, gi.p + dt / 5);
    sincronizarVisuales(state);
    actualizarCohete(dt);
    const mHalf = medidas().w / 2;
    const dtG = dt;
    for (const tp of TIPOS_VISUALES) { velTipo[tp] = velocidad(state, tp); buffTipos[tp] = buffTipoActivo(state, tp); }
    cicloBolsa = CICLO_BOLSA / velTipo.trader;
    nObreros = state.honguitos.obrero || 0;
    contam = state.contam || 0;
    nMagos = state.honguitos.mago || 0;
    nMineros = state.honguitos.minero || 0;
    sincronizarMina(dtG);
    for (const v of visuales) {
      const dt = (v.acidoT > 0 ? dtG * 0.6 : dtG) * (velTipo[v.tipo] || 1); // mojados: más lentos; mejoras de velocidad: más rápidos
      if (buffTipos[v.tipo] && Math.random() < dtG * 5) part(v.x + (Math.random() - 0.5) * 8, groundY - HH - 2, 0, -12, { tipo: "mota", dur: 0.5, col: "#ffe14d", r: 1 });
      if (v.acidoT > 0) {
        v.acidoT -= dtG;
        if (Math.random() < dtG * 3) part(v.x + (Math.random() - 0.5) * 4, groundY - HH - 1, 0, 8, { tipo: "mota", dur: 0.6, col: VERDE_ACIDO, r: 1 });
      }
      if (v.tipo === "musico") { actualizarMusico(v, dt); continue; }
      if (v.tipo === "jardinero") { actualizarJardinero(v, dt); continue; }
      if (v.tipo === "atleta") { actualizarAtleta(v, dt); continue; }
      if (v.tipo === "trader") { actualizarTrader(v, dt); continue; }
      if (v.tipo === "astronauta") { actualizarAstronauta(v, dt); continue; }
      if (v.tipo === "maestro") { actualizarMaestro(v, dt); continue; }
      if (v.tipo === "obrero") { actualizarObrero(v, dt); continue; }
      if (v.tipo === "cientifico") { actualizarCientifico(v, dt); continue; }
      if (v.tipo === "mago") { actualizarMago(v, dt); continue; }
      if (v.tipo === "minero") { actualizarMinero(v, dt); continue; }
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
            const meta = clamp(v.x + (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 70), LIM0() + 12, LIM1() - 12);
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

    // eventos del motor: golpes críticos e investigaciones terminadas (máx. 6 por cuadro)
    for (let k = 0; k < 6 && eventos.length; k++) {
      const e = eventos.shift();
      if (e.spawnEvento) spawnEvento();
      else if (e.crit) criticoVisual(e.tipo);
      else if (e.hecha && edif.universidad) {
        brillos.universidad = 1;
        const m = tam("universidad"), ex = edif.universidad.x, ey = groundY - m.sh - m.ch;
        motas(ex, ey - 6, 16, 1.4, "#ffe14d");
        aroPart(ex, ey, 30, 0.7);
      }
    }
    eventos.length = 0;
    actualizarClima(dtG);
    actualizarEventos(dtG, state);
    // fracción de cada tipo que está mojada: el motor la usa para bajar su producción
    const total = {}, mojados = {}, restan = {};
    for (const v of visuales) {
      if (v.oculto) continue;
      total[v.tipo] = (total[v.tipo] || 0) + 1;
      if (v.acidoT > 0) { mojados[v.tipo] = (mojados[v.tipo] || 0) + 1; restan[v.tipo] = Math.max(restan[v.tipo] || 0, v.acidoT); }
    }
    const ahoraMs = Date.now();
    for (const tipo of TIPOS_VISUALES) improd[tipo] = { f: (mojados[tipo] || 0) / (total[tipo] || 1), hasta: ahoraMs + (restan[tipo] || 0) * 1000 };
    // humo verde por las chimneas: más obreros, más humo
    if (edif.fabrica && nObreros > 0) {
      humoAcum += dtG * (1.5 + 1.2 * Math.log2(nObreros + 1));
      while (humoAcum >= 1) {
        humoAcum -= 1;
        const ch = chimeneas()[Math.floor(Math.random() * 2)];
        part(ch.x + (Math.random() - 0.5) * 2, ch.y, (Math.random() - 0.3) * 5, -7 - Math.random() * 5, { tipo: "humo", dur: 2 + Math.random() * 1.5 });
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
    if (Math.random() < dt * 1.5) motas(camX - Wc / 2 + Math.random() * Wc, groundY - 2, 1, 0.4);

    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i];
      p.t += dt;
      if (p.t >= p.dur) {
        if (p.tipo === "viaje" && p.local) {
          motas(p.x1, p.y1, 3, 0.5, p.col);
        } else if (p.tipo === "viaje") {
          madre.pulso = Math.min(1, madre.pulso + 0.5);
          madre.brillo = 1;
          motas(p.x1, p.y1, 6, 0.9, p.col);
          aroPart(p.x1, p.y1, 12, 0.4);
        }
        if (p.tipo === "lluvia" && Math.random() < 0.3) motas(p.x, groundY - 1, 1, 0.3, VERDE_ACIDO);
        particulas.splice(i, 1);
        continue;
      }
      if (p.tipo === "mota") {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt;
      } else if (p.tipo === "gota") {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 140 * dt;
        if (p.y >= groundY) p.t = p.dur;
      } else if (p.tipo === "humo") {
        p.x += p.vx * dt; p.y += p.vy * dt;
      } else if (p.tipo === "lluvia") {
        p.y += p.vy * dt;
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
    const { capBase, ch, rx } = hongoBase(cx, m, Math.round(madre.pulso * Math.max(3, medidas().ch * 0.06)), madre.brillo);
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
    const m = tam(id);
    const cx = Math.round(x);
    g.globalAlpha = alfa;
    const col = EDIFICIOS[id].color;
    const { capBase, ch, rx, mitad } = hongoBase(cx, m, 0, brillos[id] || 0, col, col);
    manchasDe(id + ":" + semilla, (id === "conservatorio" ? 5 : id === "vivero" ? 11 : id === "gimnasio" ? 23 : id === "trade" ? 37 : id === "astropuerto" ? 53 : id === "escuela" ? 71 : id === "universidad" ? 97 : id === "torre" ? 101 : 89) + semilla, 7 + m.nivel * 2).forEach((q) => {
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
    } else if (id === "trade") {
      // cinta de cotizaciones corriendo por el sombrero y un signo $ arriba
      const dyT = Math.round(ch * 0.5);
      const wT = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dyT / ch) ** 2))) - 2;
      const off = Math.floor(t * 8);
      for (let i = -wT; i < wT; i++) {
        const k = (((i + off) % 6) + 6) % 6;
        g.fillStyle = k < 3 ? "#3ddc84" : k < 5 ? "#ff5a5a" : "#14141d";
        g.fillRect(cx + i, capBase - 2 - dyT, 1, 1);
      }
      g.fillStyle = col;
      ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."].forEach((fila, yy) => {
        for (let xx = 0; xx < 5; xx++) if (fila[xx] === "#") g.fillRect(cx - 2 + xx, capBase - ch - 10 + yy, 1, 1);
      });
      // tallo: pantalla con el gráfico de acciones
      const W = mitad * 2 - 4, H = m.sh - 7, sx0 = cx - mitad + 2, sy0 = capBase + 4;
      g.fillStyle = "#0c1614";
      g.fillRect(sx0, sy0, W, H);
      g.fillStyle = col;
      for (let i = 0; i < W; i += 2) g.fillRect(sx0 + i, sy0, 1, 1); // línea del techo: al tocarla se cobra
      let prev = null;
      for (let i = 0; i < W; i++) {
        const ti = (hayTraders ? tBolsa : t * 0.5) - (W - 1 - i) * 0.7;
        const fr = hayTraders ? (((ti % cicloBolsa) + cicloBolsa) % cicloBolsa) / cicloBolsa : 0.25;
        const v = clamp(fr * 0.9 + 0.08 * Math.sin(ti * 2.3) + 0.05 * Math.sin(ti * 5.7 + 1), 0, 1);
        const yy = sy0 + H - 1 - Math.round(v * (H - 2));
        g.fillStyle = i === W - 1 ? BLANCO : "#3ddc84";
        g.fillRect(sx0 + i, yy, 1, 1);
        if (prev !== null && Math.abs(prev - yy) > 1) g.fillRect(sx0 + i, Math.min(prev, yy), 1, Math.abs(prev - yy));
        prev = yy;
      }
    } else if (id === "astropuerto") {
      // antena parabólica arriba, estrellitas en el sombrero y ventanilla redonda en el tallo
      g.fillStyle = BLANCO;
      g.fillRect(cx - 1, capBase - ch - 3, 1, 3);
      g.fillRect(cx - 4, capBase - ch - 6, 7, 1); g.fillRect(cx - 3, capBase - ch - 5, 5, 1); g.fillRect(cx - 2, capBase - ch - 4, 3, 1);
      g.fillStyle = Math.floor(t * 2) % 2 ? "#ff5a5a" : "#7a2c2c";
      g.fillRect(cx + 3, capBase - ch - 7, 1, 1);
      g.fillStyle = "#cfe8ff";
      for (const [dx, dy] of [[-12, 9], [9, 12], [-4, 14], [14, 6]]) g.fillRect(cx + dx, capBase - dy, 1, 1);
      g.fillStyle = "#0a1626";
      g.fillRect(cx - mitad + 3, capBase + 4, 5, 5);
      g.fillStyle = col;
      g.fillRect(cx - mitad + 3, capBase + 4, 5, 1); g.fillRect(cx - mitad + 3, capBase + 8, 5, 1);
      g.fillRect(cx - mitad + 3, capBase + 4, 1, 5); g.fillRect(cx - mitad + 7, capBase + 4, 1, 5);
      g.fillStyle = BLANCO; g.fillRect(cx - mitad + 5, capBase + 6, 1, 1);
      // plataforma de lanzamiento bajo el sombrero (del lado del cohete)
      const px = cx - m.lado * (mitad + 6);
      g.fillStyle = "#6a6a88";
      g.fillRect(px - 5, groundY - 1, 11, 1);
      if (["espera", "abordaje", "despegue", "aterriza"].includes(cohete.fase) || !edif[id]) {
        const tiembla = cohete.fase === "despegue" ? Math.round(Math.sin(t * 60) * (0.5 + cohete.llama)) : 0;
        g.drawImage(spriteCohete, px - 3 + tiembla, groundY - 11);
      }
    } else if (id === "torre") {
      // sombrero de mago (cono doblado con estrellas), ventanas encendidas y un caldero con fuego al costado
      const H = 18, y0 = capBase - ch - 1;
      for (let r = 0; r < H; r++) {
        const w = Math.max(0, Math.round(6 * (1 - r / H))), off = Math.round((r / H) ** 2 * 5);
        g.fillStyle = BLANCO; g.fillRect(cx - w + off - 1, y0 - r, 1, 1); g.fillRect(cx + w + off, y0 - r, 1, 1);
        g.fillStyle = r % 5 === 2 ? "#7a2bd1" : "#5a1f8f"; g.fillRect(cx - w + off, y0 - r, w * 2, 1);
      }
      g.fillStyle = BLANCO; g.fillRect(cx + 5, y0 - H, 2, 1); g.fillRect(cx - 7, y0, 15, 1);
      g.fillStyle = "#ffe14d"; g.fillRect(cx - 2, y0 - 6, 1, 1); g.fillRect(cx + 1, y0 - 10, 1, 1); g.fillRect(cx - 1, y0 - 3, 1, 1); g.fillRect(cx + 2, y0 - 14, 1, 1);
      // tallo: ventanas en arco y puerta
      for (const yy of [capBase + 5, capBase + 14]) {
        g.fillStyle = Math.floor(t * 2 + yy) % 5 === 0 ? "#fff6a8" : "#ffe14d";
        g.fillRect(cx - 1, yy, 3, 4); g.fillRect(cx, yy - 1, 1, 1);
      }
      g.fillStyle = "#2a0f45"; g.fillRect(cx - 2, groundY - 5, 5, 4);
      g.fillStyle = col; g.fillRect(cx - 3, groundY - 5, 1, 4); g.fillRect(cx + 3, groundY - 5, 1, 4); g.fillRect(cx - 2, groundY - 6, 5, 1);
      // caldero
      const px = cx - m.lado * (mitad + 9), top = groundY - 8;
      g.fillStyle = Math.floor(t * 8) % 2 ? "#ff8a1f" : "#ffe14d"; g.fillRect(px - 2, groundY - 2, 1, 2); g.fillRect(px + 1, groundY - 3, 1, 3);
      g.fillStyle = "#8a5a2a"; g.fillRect(px - 4, groundY - 1, 9, 1);
      g.fillStyle = BLANCO; g.fillRect(px - 4, top + 1, 9, 1); g.fillRect(px - 5, top + 2, 11, 4); g.fillRect(px - 4, top + 6, 9, 1);
      g.fillStyle = "#2a2a3c"; g.fillRect(px - 4, top + 3, 9, 3); g.fillRect(px - 3, top + 6, 7, 0);
      g.fillStyle = Math.floor(t * 1.5) % 2 ? "#7fff3a" : "#c06bff"; g.fillRect(px - 4, top + 1, 9, 1);
      g.fillStyle = "#e9ffd0"; const bb = Math.floor(t * 5); g.fillRect(px - 3 + (bb % 5), top - (bb % 2), 1, 1); g.fillRect(px + 2 - (bb % 4), top - 1 + (bb % 3 === 0 ? 1 : 0), 1, 1);
    } else if (id === "mina") {
      // castillete sobre el sombrero: patas de madera y una rueda que gira (más rápido con más mineros)
      const wy = capBase - ch - 10, giro = t * (nMineros ? 2 + Math.min(4, Math.log2(nMineros + 1)) : 0.4);
      g.fillStyle = "#8a5a2a";
      g.fillRect(cx - 5, wy + 4, 1, 6); g.fillRect(cx + 5, wy + 4, 1, 6); g.fillRect(cx - 4, wy + 6, 8, 1);
      g.fillStyle = BLANCO; g.fillRect(cx - 6, wy, 13, 1); g.fillRect(cx - 1, wy + 1, 3, 1);
      aro(cx, wy + 4, 3, BLANCO);
      g.fillStyle = col;
      for (let k = 0; k < 4; k++) { const an = giro + (k * Math.PI) / 2; g.fillRect(Math.round(cx + Math.cos(an) * 2), Math.round(wy + 4 + Math.sin(an) * 2), 1, 1); }
      // piquitas de cristal brillando en el sombrero
      [[-9, 8, 0], [7, 11, 1], [-3, 13, 2], [11, 6, 3]].forEach(([dx, dy, k]) => g.drawImage(spritesCristal[k], cx + dx, capBase - dy - 6));
      // tallo: boca de la mina con marco de madera, lámpara y rieles hacia un montón de cristales
      g.fillStyle = "#0b0b12"; g.fillRect(cx - 3, groundY - 8, 7, 7);
      g.fillStyle = "#8a5a2a"; g.fillRect(cx - 4, groundY - 9, 9, 1); g.fillRect(cx - 4, groundY - 9, 1, 8); g.fillRect(cx + 4, groundY - 9, 1, 8);
      g.fillStyle = Math.floor(t * 3 + 1) % 7 === 0 ? "#fff6a8" : "#ffd23f"; g.fillRect(cx - mitad + 2, capBase + 5, 2, 2);
      g.fillStyle = "#9a9ab0"; g.fillRect(cx + 5, groundY - 1, 10, 1);
      g.fillStyle = "#8a5a2a"; for (let k = 0; k < 4; k++) g.fillRect(cx + 6 + k * 3, groundY - 1, 1, 1);
      const px = cx + m.lado * (mitad + 7);
      for (let k = 0; k < Math.min(3, 1 + (m.nivel || 0)); k++) g.drawImage(spritesCristal[(k * 2 + 1) % CRISTALES.length], px + k * 4 - 4, groundY - 6 - (k % 2));
    } else if (id === "universidad") {
      // birrete sobre el sombrero con borla, foco de ideas que parpadea, columnas, escalones y puerta
      const by = capBase - ch - 3;
      g.fillStyle = "#14141d"; g.fillRect(cx - 5, by - 1, 11, 1); g.fillRect(cx - 3, by, 7, 2);
      g.fillStyle = BLANCO; g.fillRect(cx - 5, by - 2, 11, 1);
      g.fillStyle = DORADO; g.fillRect(cx + 5, by - 1, 1, 4); g.fillRect(cx + 5, by + 3, 1, 1);
      const idea = Math.floor(t * 1.5) % 4 === 0;
      g.fillStyle = idea ? "#ffe14d" : "#7a6a1f";
      g.fillRect(cx - 9, by - 8, 3, 3); g.fillRect(cx - 8, by - 5, 1, 2);
      if (idea) { g.fillStyle = "#fff6a8"; g.fillRect(cx - 12, by - 7, 1, 1); g.fillRect(cx - 4, by - 7, 1, 1); g.fillRect(cx - 8, by - 10, 1, 1); }
      // tallo: dos columnas blancas, puerta en arco y escalones
      const ya = capBase + 4;
      g.fillStyle = BLANCO;
      g.fillRect(cx - mitad + 2, ya, 2, m.sh - 6); g.fillRect(cx + mitad - 4, ya, 2, m.sh - 6);
      g.fillRect(cx - mitad + 1, ya, 4, 1); g.fillRect(cx + mitad - 5, ya, 4, 1);
      g.fillStyle = "#0e2a28"; g.fillRect(cx - 2, groundY - 8, 5, 7); g.fillRect(cx - 1, groundY - 9, 3, 1);
      g.fillStyle = col; g.fillRect(cx - 3, groundY - 8, 1, 7); g.fillRect(cx + 3, groundY - 8, 1, 7); g.fillRect(cx - 2, groundY - 9, 1, 1); g.fillRect(cx + 2, groundY - 9, 1, 1); g.fillRect(cx - 1, groundY - 10, 3, 1);
      g.fillStyle = "#c8c8dc"; g.fillRect(cx - mitad - 1, groundY - 2, mitad * 2 + 2, 1); g.fillRect(cx - mitad + 1, groundY - 3, mitad * 2 - 2, 1);
    } else if (id === "fabrica") {
      // chimeneas con franja de acero, engranaje girando, ventanas con siluetas que se mueven y cinta
      const nn = edif[id] ? nObreros : 0, vel = 0.6 + Math.log2(nn + 1) * 0.5;
      for (const u of [-0.5, 0.28]) {
        const dx = Math.round(u * rx), y0 = capBase - 2 - Math.round(ch * Math.sqrt(1 - (dx / rx) ** 2)) - 6;
        g.fillStyle = BLANCO; g.fillRect(cx + dx, y0, 4, 8);
        g.fillStyle = "#3a3a4e"; g.fillRect(cx + dx + 1, y0 + 1, 2, 7);
        g.fillStyle = col; g.fillRect(cx + dx, y0 + 2, 4, 1);
        g.fillStyle = VERDE_ACIDO; g.fillRect(cx + dx + 1, y0 + 1, 2, 1);
      }
      // engranaje
      g.save();
      g.translate(cx - mitad + 6, capBase + 8);
      g.rotate(t * vel);
      g.drawImage(spriteEngranaje, -4.5, -4.5);
      g.restore();
      // ventana con siluetas de obreros yendo y viniendo (más obreros, más siluetas)
      const wx = cx + 2, wy = capBase + 4, ww = mitad - 3;
      g.fillStyle = "#1a1a10"; g.fillRect(wx, wy, ww, 4);
      g.fillStyle = "#ffcf3f";
      const cant = Math.min(4, 1 + Math.floor(Math.log2(nn + 1) / 1.5));
      for (let i = 0; i < cant; i++) {
        const px = wx + 1 + Math.round((Math.sin(t * (1.2 + i * 0.5) + i * 2) * 0.5 + 0.5) * (ww - 3));
        g.fillRect(px, wy + 1, 2, 2);
      }
      // puerta de operarios
      g.fillStyle = "#14141d"; g.fillRect(cx - 2, groundY - 6, 5, 5);
      g.fillStyle = "#ffcf3f"; g.fillRect(cx - 2, groundY - 7, 5, 1);
      // cinta transportadora del lado de la rama, bajo el sombrero
      const bs = m.lado, b0 = cx + bs * (mitad + 1), b1 = cx + bs * (rx - 2);
      g.fillStyle = "#14141d"; g.fillRect(Math.min(b0, b1), groundY - 3, Math.abs(b1 - b0) + 1, 2);
      g.fillStyle = "#6a6a88";
      const off = Math.floor(t * (3 + vel * 2));
      for (let i = 0; i < Math.abs(b1 - b0); i += 3) g.fillRect(b0 + bs * ((i + off) % Math.max(3, Math.abs(b1 - b0))), groundY - 2, 1, 1);
      for (let i = 0; i < Math.min(3, 1 + Math.floor(Math.log2(nn + 1) / 2)); i++) {
        const u = ((t * (0.25 + vel * 0.1) + i / 3) % 1);
        const ix = Math.round(b0 + (b1 - b0) * u);
        g.fillStyle = PALETA[i % PALETA.length]; g.fillRect(ix - 1, groundY - 5, 3, 1); g.fillRect(ix, groundY - 6, 1, 1);
        g.fillStyle = BLANCO; g.fillRect(ix, groundY - 4, 1, 1);
      }
    } else if (id === "escuela") {
      // campana arriba con techito, banderín, pizarrón con garabatos y puerta de madera
      g.fillStyle = BLANCO;
      g.fillRect(cx - 3, capBase - ch - 3, 7, 1);
      g.fillRect(cx - 2, capBase - ch - 4, 5, 1);
      g.fillStyle = DORADO;
      g.fillRect(cx - 2, capBase - ch - 2, 5, 1); g.fillRect(cx - 1, capBase - ch - 3, 3, 1);
      g.fillRect(cx, capBase - ch - 1, 1, 1);
      const sw = Math.floor(t * 1.2) % 2 ? 1 : 0;
      g.fillStyle = col;
      g.fillRect(cx + 6, capBase - ch - 3, 1, 6);
      g.fillRect(cx + 7, capBase - ch - 3 + sw, 3, 2);
      // tallo
      const bxx = cx - mitad + 2, byy = capBase + 4;
      g.fillStyle = "#14302a"; g.fillRect(bxx, byy, 7, 6);
      g.fillStyle = "#c49a5a"; g.fillRect(bxx - 1, byy - 1, 9, 1); g.fillRect(bxx - 1, byy + 6, 9, 1); g.fillRect(bxx - 1, byy, 1, 6); g.fillRect(bxx + 7, byy, 1, 6);
      g.fillStyle = BLANCO;
      g.fillRect(bxx + 1, byy + 1, 2, 1); g.fillRect(bxx + 4, byy + 1, 1, 1); g.fillRect(bxx + 1, byy + 3, 4, 1); g.fillRect(bxx + 2, byy + 4, 1, 1);
      g.fillStyle = "#8a5a2a";
      g.fillRect(cx + 1, groundY - 8, 5, 7);
      g.fillRect(cx + 2, groundY - 9, 3, 1);
      g.fillStyle = DORADO; g.fillRect(cx + 5, groundY - 4, 1, 1);
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
    // edificios más grandes: ramas con hongos chiquitos saliendo del tallo
    if (m.nivel >= 1) ramaHongo(cx, capBase, mitad, m.lado, col, 5);
    if (m.nivel >= 2 && id !== "astropuerto" && id !== "torre") ramaHongo(cx, capBase, mitad, -m.lado, col, 3);
    if (m.nivel >= 3) { // los más grandes: dos ramas más, más abajo y más largas
      const yy = Math.round(m.sh * 0.72);
      ramaHongo(cx, capBase, mitad, m.lado, col, 8, yy);
      if (id !== "astropuerto" && id !== "torre") ramaHongo(cx, capBase, mitad, -m.lado, col, 7, yy);
    }
    g.globalAlpha = 1;
  }

  // brazo que sale del costado del tallo con un mini hongo encima
  function ramaHongo(cx, capBase, mitad, s, col, largo, yy = 8) {
    const y = capBase + yy, x1 = cx + s * (mitad + largo);
    g.fillStyle = BLANCO;
    g.fillRect(Math.min(cx + s * mitad, x1), y, largo + 1, 1);
    g.fillRect(x1, y - 3, 1, 3);
    const tapa = mezcla(SOMBRERO, col, 0.7);
    const filas = [[3, y - 7], [5, y - 6], [7, y - 5], [7, y - 4]];
    filas.forEach(([w, yy], i) => {
      g.fillStyle = BLANCO;
      g.fillRect(x1 - (w >> 1), yy, w, 1);
      if (i > 0) { g.fillStyle = i === filas.length - 1 ? SOMBRERO_D : tapa; g.fillRect(x1 - (w >> 1) + 1, yy, w - 2, 1); }
    });
    g.fillStyle = col;
    g.fillRect(x1 - 1, y - 5, 1, 1);
  }

  // Luna de fondo: sutil, siempre presente. Cada expedición le suma una base hongil de color.
  const CRATERES = [[-0.35, -0.3, 0.2], [0.3, -0.45, 0.14], [0.45, 0.15, 0.22], [-0.2, 0.4, 0.16], [-0.55, 0.1, 0.1], [0.05, -0.05, 0.09]];
  function dibujarLuna() {
    const L = geomLuna();
    // halo muy tenue
    g.globalAlpha = 0.05;
    disco(L.x, L.y, L.r + 5, BLANCO);
    g.globalAlpha = 0.07;
    disco(L.x, L.y, L.r + 2, BLANCO);
    g.globalAlpha = 1;
    disco(L.x, L.y, L.r, "#30304a");
    // luz suave del lado izquierdo y cráteres apenas más oscuros
    g.globalAlpha = 0.5;
    for (let dy = -L.r; dy <= L.r; dy++) {
      const w = Math.floor(Math.sqrt(L.r * L.r - dy * dy));
      g.fillStyle = "#3a3a56";
      g.fillRect(L.x - w, L.y + dy, Math.max(1, Math.round(w * 0.35)), 1);
    }
    g.globalAlpha = 1;
    for (const [cx, cy, cr] of CRATERES) disco(L.x + cx * L.r, L.y + cy * L.r, Math.max(1, Math.round(cr * L.r)), "#2a2a40");
    g.globalAlpha = 0.28 + lunaFlash * 0.4;
    aro(L.x, L.y, L.r, BLANCO);
    g.globalAlpha = 1;
    // caminos entre bases (se van armando desde la base vieja hacia la nueva)
    const vis = Math.min(lunaVisibles, lunaBases.length);
    const pos = (i) => ({ x: L.x + lunaBases[i].x * L.r, y: L.y + lunaBases[i].y * L.r });
    g.fillStyle = "#6a6a94";
    for (const c of caminos) {
      if (c.b >= vis || c.prog <= 0) continue;
      const A = pos(c.a), B = pos(c.b), n = Math.floor(Math.hypot(B.x - A.x, B.y - A.y) * c.prog);
      for (let k = 0; k < n; k++) {
        if (k % 4 === 3) continue; // punteado
        const f = k / Math.max(1, Math.hypot(B.x - A.x, B.y - A.y));
        g.fillRect(Math.round(A.x + (B.x - A.x) * f), Math.round(A.y + (B.y - A.y) * f), 1, 1);
      }
    }
    // pulsos de energía: un frente que viaja por los caminos desde la base donde aterrizó la nave
    const brilloBase = new Array(lunaBases.length).fill(0);
    for (const pu of pulsos) {
      const d = pu.t * PULSO_VEL;
      for (const c of caminos) {
        if (c.prog < 1 || c.b >= vis) continue;
        const da = pu.dist[c.a], db = pu.dist[c.b];
        if (da === Infinity && db === Infinity) continue;
        const de = da <= db ? c.a : c.b, ha = de === c.a ? c.b : c.a, d0 = pu.dist[de];
        const A = pos(de), B = pos(ha), px = Math.hypot(B.x - A.x, B.y - A.y), nPasos = Math.floor(px);
        for (let k = 0; k < nPasos; k++) {
          const dd = d0 + (k / px) * c.len, atras = d - dd;
          if (atras < 0 || atras > PULSO_COLA) continue;
          g.globalAlpha = 1 - atras / PULSO_COLA;
          g.fillStyle = atras < 0.05 ? BLANCO : "#9fe8ff";
          const f = k / px;
          g.fillRect(Math.round(A.x + (B.x - A.x) * f), Math.round(A.y + (B.y - A.y) * f) - 1, 1, 3);
        }
        g.globalAlpha = 1;
      }
      for (let i = 0; i < lunaBases.length; i++) {
        if (pu.dist[i] === Infinity) continue;
        const atras = d - pu.dist[i];
        if (atras >= 0 && atras < 0.45) brilloBase[i] = Math.max(brilloBase[i], 1 - atras / 0.45);
      }
      // onda que sale de la base de origen
      const O = pos(pu.origen), ro = d * L.r;
      if (ro < L.r * 0.5) { g.globalAlpha = 0.6 * (1 - ro / (L.r * 0.5)); aro(O.x, O.y, Math.max(2, Math.round(ro)), "#9fe8ff"); g.globalAlpha = 1; }
    }
    // bases lunares: un parche de color que se va extendiendo + un hongo-cúpula de ese color
    for (let i = 0; i < Math.min(lunaVisibles, lunaBases.length); i++) {
      const b = lunaBases[i];
      const bx = Math.round(L.x + b.x * L.r), by = Math.round(L.y + b.y * L.r);
      const dist = Math.hypot(b.x, b.y) * L.r;
      const rad = Math.max(1, Math.min(Math.round(2 + b.s * 1.6), Math.floor(L.r - dist - 1)));
      g.globalAlpha = 0.28;
      disco(bx, by, rad, b.c);
      if (brilloBase[i] > 0) { g.globalAlpha = 0.55 * brilloBase[i]; disco(bx, by, rad + 4, "#9fe8ff"); }
      g.globalAlpha = 1;
      g.fillStyle = b.c;
      g.fillRect(bx - 2, by - 1, 5, 1); g.fillRect(bx - 1, by - 2, 3, 1);
      g.fillStyle = BLANCO;
      g.fillRect(bx, by, 1, 1);
      if (b.s >= 2) { g.fillStyle = b.c; g.fillRect(bx + 3, by, 3, 1); g.fillRect(bx + 4, by - 1, 1, 1); }
      if (b.s >= 3) { g.fillStyle = BLANCO; g.fillRect(bx - 4, by - 1, 1, 2); g.fillStyle = b.c; g.fillRect(bx - 5, by - 2, 3, 1); }
      if (b.s >= 4) { g.fillStyle = b.c; g.fillRect(bx, by - 4, 1, 2); g.fillRect(bx - 1, by - 5, 3, 1); }
    }
  }

  // nubes verdes de contaminación sobre la fábrica
  function dibujarNubes() {
    for (const c of nubes) {
      const x = Math.round(nubeX(c)), y = Math.round(nubeY(c) + Math.sin(t * 0.4 + c.ph) * 1.5), w = c.w;
      const col = c.llueve ? "#3f8f1f" : "#5fbf2f";
      g.globalAlpha = 0.55 * c.p;
      disco(x - w * 0.27, y + 2, 5, col); disco(x, y, 7, col); disco(x + w * 0.27, y + 2, 5, col);
      disco(x - w * 0.42, y + 4, 3, col); disco(x + w * 0.42, y + 4, 3, col);
      g.fillStyle = c.llueve ? "#2f6f15" : "#3f8f1f";
      g.fillRect(Math.round(x - w * 0.45), y + 5, Math.round(w * 0.9), 2);
      g.globalAlpha = 1;
    }
  }

  function dibujarCoheteEnVuelo() {
    if (cohete.fase !== "vuelo" && cohete.fase !== "regreso" && cohete.fase !== "luna") return;
    g.save();
    g.translate(Math.round(cohete.x), Math.round(cohete.y));
    g.rotate(cohete.ang);
    g.scale(cohete.sc, cohete.sc);
    g.drawImage(spriteCohete, -3.5, -5);
    g.restore();
  }

  function dibujarHonguito(v) {
    if (v.oculto) return;
    if (v.tipo === "maestro" && v.hijos) {
      // alumnitos detrás del maestro
      for (const [j, k] of v.hijos.entries()) {
        const kx = Math.round(k.x), kb = Math.round(groundY - k.hop);
        g.globalAlpha = v.alfa;
        g.save();
        if (k.dir < 0) { g.translate(kx, 0); g.scale(-1, 1); g.translate(-kx, 0); }
        g.drawImage(spritesKid[k.col], kx - 3, kb - 6);
        g.restore();
        g.globalAlpha = 1;
        if (v.modo === "diploma" && j === v.graduado) {
          // diploma enrollado con moño rojo sobre la cabeza
          g.fillStyle = BLANCO; g.fillRect(kx - 3, kb - 11, 7, 3);
          g.fillStyle = "#e23b3b"; g.fillRect(kx, kb - 11, 1, 3);
        }
      }
    }
    const base = Math.round(groundY + (v.yOff || 0) - v.hop);
    const pose = v.modo === "walk" ? (Math.floor(v.animT * 11) % 2) : 0;
    const spr = v.tipo === "musico" ? spritesMusico[v.modo === "canta" ? [0, 2, 3, 2][Math.floor(v.tCanta * 8) % 4] : pose]
      : v.tipo === "jardinero" ? spritesJard[pose] : v.tipo === "atleta" ? spritesAtl[pose] : v.tipo === "mago" ? spritesMago[pose] : v.tipo === "minero" ? spritesMinero[pose] : v.tipo === "cientifico" ? spritesCient[pose] : v.tipo === "obrero" ? spritesObrero[pose] : v.tipo === "maestro" ? spritesMaestro[v.modo === "clase" ? (Math.floor(v.animT * 5) % 2 ? 2 : 3) : pose] : v.tipo === "astronauta" ? spritesAstro[pose] : v.tipo === "trader" ? spritesTrader[v.modo === "llama" ? (Math.floor(v.tLlama * 6) % 2 ? 2 : 3) : pose] : spritesHongo[pose];
    const alto = HH + Math.round(v.estira);
    const x = Math.round(v.x);
    g.globalAlpha = v.alfa;
    g.save();
    if (v.dir < 0) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); }
    g.drawImage(v.acidoT > 0 ? verde(spr) : spr, x - 4, base - alto, HW, alto);
    // lunares blancos sobre el sombrero (acompañan el estiramiento del salto)
    g.fillStyle = BLANCO;
    const esc = alto / HH;
    for (const [lx, ly] of v.lunares) g.fillRect(x - 4 + lx, base - alto + Math.round(ly * esc), 1, Math.max(1, Math.round(esc)));
    g.restore();
    g.globalAlpha = 1;
    if (v.tipo === "minero") {
      if ((v.yOff || 0) > 4) { // luz de la lámpara bajo tierra
        g.globalAlpha = 0.1; disco(x, base - 5, 13, "#ffe9a0"); g.globalAlpha = 0.12; disco(x, base - 5, 7, "#fff6a8"); g.globalAlpha = 1;
      }
      // pico: al hombro; al picar se levanta hacia atrás, golpea de arriba abajo contra el cristal y vuelve
      let th = 0.35;
      if (v.modo === "pica") {
        const u = (v.tPica % CICLO_PICO) / CICLO_PICO, ease = (k) => k * k * (3 - 2 * k);
        th = u < 0.55 ? 0.3 + (-1.05 - 0.3) * ease(u / 0.55) : u < 0.68 ? -1.05 + (1.85 + 1.05) * Math.pow((u - 0.55) / 0.13, 2) : 1.85 + (0.3 - 1.85) * ease((u - 0.68) / 0.32);
      }
      const hx = x + v.dir * 3, hy = base - 6, tx = hx + Math.sin(th) * v.dir * 8, ty = hy - Math.cos(th) * 8;
      g.fillStyle = "#8a5a2a";
      for (let k = 0; k <= 8; k++) g.fillRect(Math.round(hx + (tx - hx) * (k / 8)), Math.round(hy + (ty - hy) * (k / 8)), 1, 1);
      g.fillStyle = "#d8d8ec";
      for (let k = -2; k <= 2; k++) g.fillRect(Math.round(tx + Math.cos(th) * v.dir * k * 0.9), Math.round(ty + Math.sin(th) * k * 0.9), 1, 1);
      g.fillStyle = BLANCO; g.fillRect(x + v.dir * 2, base - 5, 1, 1); // mano agarrando el mango
      if (v.cristal !== null && v.cristal !== undefined) g.drawImage(spritesCristal[v.cristal], x - 2, base - alto - 8 - Math.round(Math.sin(t * 6 + v.i)));
    }
    if (v.tipo === "mago") {
      // cono del sombrero de mago con una estrella, y bastón al lanzar hechizos
      const hy = base - alto;
      g.fillStyle = "#d12bff";
      g.fillRect(x - 3, hy - 1, 7, 1); g.fillRect(x - 2, hy - 2, 5, 1); g.fillRect(x - 1, hy - 3, 3, 1); g.fillRect(x, hy - 4, 1, 1); g.fillRect(x + 1, hy - 5, 1, 1);
      g.fillStyle = "#ffe14d"; g.fillRect(x - 1, hy - 2, 1, 1);
      if (v.modo === "purga") {
        g.fillStyle = "#8a5a2a"; g.fillRect(x + v.dir * 6, base - 14, 1, 14);
        g.fillStyle = "#ffe14d"; g.fillRect(x + v.dir * 6 - 1, base - 16, 3, 2);
      } else if (v.modo === "remueve") {
        const sw = Math.round(Math.sin(v.tRem * 8) * 2);
        g.fillStyle = "#8a5a2a"; g.fillRect(x + v.dir * 5, base - 6, 1, 4); g.fillRect(x + v.dir * (6 + sw), base - 3, 1, 3);
      }
    }
    if (v.modo === "experimenta") {
      // matraz con líquido de colores
      const fx = x + v.dir * 6, fy = base - 10, liq = LIQUIDOS[Math.floor(v.tExp / 0.8) % LIQUIDOS.length];
      g.fillStyle = BLANCO; g.fillRect(fx, fy, 1, 2); g.fillRect(fx - 1, fy + 2, 3, 1); g.fillRect(fx - 2, fy + 3, 5, 3);
      g.fillStyle = liq; g.fillRect(fx - 1, fy + 4, 3, 2);
    }
    if (v.idea > 0) {
      // foco de idea sobre la cabeza
      const bx = x, by = base - alto - 6;
      g.fillStyle = "#ffe14d"; g.fillRect(bx - 1, by, 3, 3); g.fillRect(bx, by + 3, 1, 1);
      g.fillStyle = "#fff6a8"; g.fillRect(bx - 3, by + 1, 1, 1); g.fillRect(bx + 3, by + 1, 1, 1); g.fillRect(bx, by - 2, 1, 1);
    }
    if (v.caja) {
      g.fillStyle = "#c8673a"; g.fillRect(x + v.dir * 4 - 1, base - 6, 4, 4);
      g.fillStyle = "#e8a070"; g.fillRect(x + v.dir * 4 - 1, base - 6, 4, 1);
    }
    if (v.modo === "clase") {
      // libro abierto frente al maestro: tapa lima, páginas blancas y lomo; las páginas se agitan
      const bx = x + v.dir * 6, by = base - 6, pg = Math.floor(v.animT * 4) % 2;
      g.fillStyle = LIMA; g.fillRect(bx - 3, by + 1, 7, 3);
      g.fillStyle = BLANCO; g.fillRect(bx - 3, by, 3, 3); g.fillRect(bx + 1, by + (pg ? -1 : 0), 3, 3);
      g.fillStyle = "#14141d"; g.fillRect(bx - 1, by, 1, 3);
    }
    if (v.tipo === "astronauta") {
      // antena del casco con luz
      g.fillStyle = BLANCO;
      g.fillRect(x, base - alto - 2, 1, 2);
      g.fillStyle = Math.floor(t * 3) % 2 ? "#ff5a5a" : CELESTE;
      g.fillRect(x, base - alto - 3, 1, 1);
    }
    if (v.modo === "llama") {
      // teléfono pegado a la cabeza con el brazo levantado
      const px = x + v.dir * 5;
      g.fillStyle = BLANCO;
      g.fillRect(x + v.dir * 4, base - 6, 1, 3);
      g.fillStyle = "#5b5b78";
      g.fillRect(px - (v.dir < 0 ? 1 : 0), base - 11, 2, 5);
      g.fillStyle = BLANCO;
      g.fillRect(px - (v.dir < 0 ? 1 : 0), base - 11, 2, 1);
      g.fillRect(px - (v.dir < 0 ? 1 : 0), base - 7, 2, 1);
    }
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
      disco(ox, oy, 2, colHongo(v));
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
      } else if (p.tipo === "humo") {
        g.globalAlpha = 0.5 * (1 - k);
        g.fillStyle = "#7fd04a";
        const r = 2 + Math.floor(k * 3);
        g.fillRect(Math.round(p.x) - (r >> 1), Math.round(p.y) - (r >> 1), r, r);
        g.globalAlpha = 1;
      } else if (p.tipo === "lluvia") {
        g.globalAlpha = 0.75;
        g.fillStyle = VERDE_ACIDO;
        g.fillRect(Math.round(p.x), Math.round(p.y), 1, 3);
        g.globalAlpha = 1;
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
    g.fillStyle = BG;
    g.fillRect(0, 0, Wc, Hc);
    const oy = offY();
    if (oy < 0) { g.fillStyle = BG_SUELO; g.fillRect(0, groundY + oy, Wc, Hc); }
    g.drawImage(fondo, 0, oy);
    for (const gi of gigantes) {
      const hT = gi.cv.height, h = Math.max(1, Math.round(hT * suave(gi.p)));
      g.drawImage(gi.cv, 0, hT - h, gi.cv.width, h, Math.round(gi.x * Wc - gi.cv.width / 2), groundY - h + oy, gi.cv.width, h);
    }
    // estrellitas y manchas flotantes (fondo)
    for (const s of estrellas) {
      const a = 0.25 + 0.45 * Math.sin(t * 1.5 + s.ph) ** 2;
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.fillRect(s.x, (s.y + Math.round(oy * 0.3)) % Math.round(groundY * 0.8), 1, 1);
    }
    g.globalAlpha = 0.55;
    for (const f of flotantes) { g.fillStyle = f.col; g.fillRect(Math.round(f.x + Math.sin(t * f.sp + f.ph) * f.ax), Math.round(f.y), f.r, f.r); }
    g.globalAlpha = 1;

    g.save();
    g.translate(offX(), oy);
    dibujarLuna();
    dibujarNubes();
    dibujarMina();
    dibujarMadre();
    for (const id in edif) if (!(colocando?.mover && colocando.id === id)) dibujarEdificio(id, edif[id].x);
    dibujarCoheteEnVuelo();
    for (const b of brotes) {
      const falta = b.vida - b.t;
      if (falta < 1.5 && Math.floor(b.t * 8) % 2) continue;
      if (b.t < 0.25) { g.fillStyle = BLANCO; g.fillRect(b.x, groundY - 1, 1, 1); }
      else if (b.t < 0.5) { g.fillStyle = BLANCO; g.fillRect(b.x, groundY - 2, 1, 2); }
      else g.drawImage(spritesBrote[b.col], b.x - 2, groundY - 4);
    }
    for (const v of visuales) dibujarHonguito(v);
    dibujarParticulas();
    dibujarEventos();
    if (colocando) dibujarEdificio(colocando.id, xLibre(colocando.x, tam(colocando.id).w, obstaculos(altoEdif(colocando.id), false)), 0.55);
    g.restore();

    if (flash > 0.01) { g.globalAlpha = flash * 0.3; g.fillStyle = BLANCO; g.fillRect(0, 0, Wc, Hc); g.globalAlpha = 1; }
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lo, 0, 0, Wc * S, Hc * S);
  }

  // ---------- toques ----------
  function toque(px, py) {
    const cx = (px * dpr) / S - offX();
    const cy = (py * dpr) / S - offY();
    for (const ev of cielo) if (Math.abs(cx - ev.x) < 9 && Math.abs(cy - evY(ev)) < 9) return { quien: "evento", ev };
    for (const id in edif) {
      if (colocando?.mover && colocando.id === id) continue;
      const m = tam(id);
      if (Math.abs(cx - edif[id].x) < m.w / 2 && cy > groundY - m.ch - m.sh - 8 && cy < groundY + 2) return { quien: id };
    }
    for (let i = visuales.length - 1; i >= 0; i--) {
      const v = visuales[i];
      if (Math.abs(cx - v.x) < 8 && cy > groundY - 16 && cy < groundY + 2) {
        if (v.modo === "idle") { v.modo = "salto"; v.animT = 0; }
        return { quien: "honguito", v };
      }
    }
    // el hongo madre al final: los edificios y honguitos se dibujan delante de él
    const m = medidas();
    // el hongo madre: el tronco o el sombrero (elipse), no el rectángulo que los envuelve
    const enTronco = Math.abs(cx - madre.x) < m.sw / 2 + 3 && cy > groundY - m.sh && cy < groundY + 2;
    const dyCap = groundY - m.sh - cy;
    const enSombrero = dyCap >= -1 && dyCap < m.ch && Math.abs(cx - madre.x) < (m.w / 2) * Math.sqrt(Math.max(0, 1 - (dyCap / m.ch) ** 2));
    if (enTronco || enSombrero) return { quien: "madre" };
    return null;
  }

  // rectángulo del hongo madre en px CSS (para anclar su ventana de mejoras al costado)
  function rectMadre() {
    const m = medidas(), k = S / dpr;
    return { x0: (madre.x - m.w / 2 + offX()) * k, x1: (madre.x + m.w / 2 + offX()) * k, y0: (groundY - alturaMadre() + offY()) * k, y1: (groundY + offY()) * k };
  }

  function rectEdificio(id) {
    const k = S / dpr, m = tam(id), x = edif[id].x;
    return { x0: (x - m.w / 2 + offX()) * k, x1: (x + m.w / 2 + offX()) * k, y0: (groundY - m.ch - m.sh + offY()) * k, y1: (groundY + offY()) * k };
  }

  // ---- colocación: el jugador elige dónde poner un edificio comprado ----
  const aCeldas = (px) => (px * dpr) / S;
  const iniciarColocacion = (id, mover = false) => { colocando = { id, mover, x: camX + Wc * 0.3 }; };
  const moverColocacion = (px) => { if (colocando) colocando.x = aCeldas(px) - offX(); };
  const cancelarColocacion = () => { colocando = null; };
  function confirmarColocacion(px) {
    if (!colocando) return null;
    const x = xLibre(aCeldas(px) - offX(), tam(colocando.id).w, obstaculos(altoEdif(colocando.id), false));
    colocando = null;
    return x - C0; // celdas desde el hongo madre
  }

  function pulsoMadre() {
    madre.pulso = 1;
    madre.brillo = 1;
    motas(madre.x, groundY - alturaMadre(), 12);
    aroPart(madre.x, groundY - alturaMadre() * 0.6, 34, 0.5);
  }

  // ---- cámara: zoom por niveles enteros y arrastre ----
  function zoom(dir) {
    const nuevo = clamp(zoomIdx + dir, 0, niveles.length - 1);
    if (nuevo === zoomIdx) return;
    zoomIdx = nuevo;
    resize();
  }
  const pan = (px, py = 0) => { camX -= (px * dpr) / S; camY += (py * dpr) / S; limitarCam(); };
  const recentrar = () => { camX = C0; camY = 0; limitarCam(); };

  const tomar = (ev) => tomarEvento(ev);

  function setLimite(n) {
    limiteVisibles = clamp(Math.round(n) || 20, 3, 300);
    while (brotes.length > maxBrotes()) brotes.shift();
  }

  return { tomarEvento: tomar, zoom, pan, recentrar, setLimite, resize, update, draw, toque, pulsoMadre, rectMadre, rectEdificio, iniciarColocacion, moverColocacion, cancelarColocacion, confirmarColocacion };
}
