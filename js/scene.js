// Escena 2D vista lateral, estilo minimalista: fondo azul noche plano, contornos blancos,
// manchitas de colores. Todo se dibuja con formas simples en un buffer chico (1 celda = 1 píxel
// del arte) y se escala con un factor entero sin suavizado. No hay sprites ni fotogramas:
// los honguitos son un bitmap diminuto que se mueve con rebotes y estiramientos por código.

const TIPOS_VISUALES = ['basico', 'musico', 'jardinero', 'atleta', 'trader', 'astronauta', 'cristalero', 'maestro', 'obrero', 'cientifico', 'mago', 'minero', 'soldado']; // el número dibujado por tipo lo da el ajuste "honguitos visibles" (el real puede ser enorme)
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
  cristaleria: { w: 46, ch: 22, sw: 18, sh: 16 },
  escuela: { w: 40, ch: 19, sw: 17, sh: 14 },
  fabrica: { w: 46, ch: 21, sw: 20, sh: 15 },
  universidad: { w: 44, ch: 21, sw: 20, sh: 16 },
  mina: { w: 42, ch: 18, sw: 18, sh: 15 },
  taberna: { w: 46, ch: 20, sw: 20, sh: 16 },
  barraca: { w: 46, ch: 19, sw: 20, sh: 15 },
  torre_def: { w: 16, ch: 0, sw: 12, sh: 30, extra: 6 }, // torres de defensa (no son edificios: se dibujan aparte)
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
import { meteoros as danoMeteoro, improd, velocidad, eventos, buffTipoActivo, efectos, prestigio, logiInfo, logiSitios, logiEventos } from './engine.js';
import { getRun } from './dungeon.js';
import { getEvento, consumirFx, setAlcance, nivelDef } from './eventos.js';
import { TIPOS_TORRE, statsTorre } from './invasion.js';
import { dibujarMerc } from './dungeonVista.js';

const MADRE_GRANDE = MADRE.map((m) => ({ w: Math.round(m.w * BONUS_CONSERV), ch: Math.round(m.ch * BONUS_CONSERV), sw: Math.round(m.sw * BONUS_CONSERV), sh: Math.round(m.sh * BONUS_CONSERV) }));

export function crearEscena(canvas, opciones = {}) {
  const ctx = canvas.getContext("2d");
  const lo = document.createElement("canvas");
  let g = lo.getContext("2d"); // se cambia un instante por el contexto del caché del hongo madre
  const gPrincipal = g;
  let glv = null, loFrente = null, gFrente = null; // modo WebGL (beta): ver glvista.js
  let dpr = 1, S = 1, K = 1, Wc = 0, Hc = 0, groundY = 0;
  // cámara: Wc/Hc = celdas visibles; S = px por celda (niveles enteros para que el pixel art quede nítido)
  let groundRef = 220, S0 = 1, Wc0 = 300, Hc0 = 300, niveles = [1], zoomIdx = null, camX = C0, camY = 0, extent = 150;
  // mina: túneles bajo el piso (coordenadas relativas a la entrada: x al costado, y hacia abajo)
  let mina = null, minaKey = "", minaP = null, nMineros = 0, lastMx = 0;
  let dungeonFlag = false, puertaT = -1, puertaAvisada = false;
  // taberna: mercenarios que andan por ahí cuando no están explorando; cristales radiantes en el tronco del madre
  let mercs = [], cristalesN = 0, mercInfo = {}; // puerta de la dungeon: aparece al cavar el 100% de la mina
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
    if (id === "torre_def") return { w: 16, ch: 0, sw: 12, sh: 30, nivel: 0, lado: 1 };
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
  let tNiveles = 0, tPrest = 0, pfMadre = 0, camObj = null, luzDt = 0.016;
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
  const torresV = []; // torres de defensa: { x, t (estado), i, ang, retro }
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
  const poolLunares = [];
  function lunares() {
    if (poolLunares.length >= 24) return poolLunares[Math.floor(Math.random() * 24)]; // 24 patrones alcanzan y se comparten (así se pueden cachear los sprites)
    const o = lunaresNuevos();
    o.id = poolLunares.length;
    poolLunares.push(o);
    return o;
  }
  function lunaresNuevos() {
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
  const spritesCristalero = [0, 1].map((pose) => hacerSprite("#5ef2ff", PATAS[pose], 0));
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
  // soldado: sombrero verde oliva con casco de acero
  const spritesSoldado = [0, 1].map((pose) => {
    const c = hacerSprite("#8f9a5a", PATAS[pose], false);
    const x = c.getContext("2d");
    x.fillStyle = "#5a6a2a"; x.fillRect(0, 2, 9, 1);
    x.fillStyle = "#d8d8ec"; x.fillRect(3, 0, 3, 1); x.fillRect(4, 1, 1, 1);
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
  // ¿se ve algo de este rectángulo del mundo? (en celdas; las coordenadas ya vienen sin la cámara)
  const visibleRect = (x, y, w, h) => { const vx = -offX(), vy = -offY(); return x < vx + Wc && x + w > vx && y < vy + Hc && y + h > vy; };
  // copia un lienzo (rect de origen en px) al mundo recortando lo que queda fuera de la pantalla: no se mueven píxeles que nadie ve
  function blitR(cv, sx, sy, sw, sh, dx, dy, dw, dh) {
    const vx0 = Math.floor(-offX()), vy0 = Math.floor(-offY());
    const ix0 = Math.max(dx, vx0), ix1 = Math.min(dx + dw, vx0 + Wc + 1), iy0 = Math.max(dy, vy0), iy1 = Math.min(dy + dh, vy0 + Hc + 1);
    if (ix1 <= ix0 || iy1 <= iy0) return;
    const fx = sw / dw, fy = sh / dh;
    g.drawImage(cv, sx + (ix0 - dx) * fx, sy + (iy0 - dy) * fy, (ix1 - ix0) * fx, (iy1 - iy0) * fy, ix0, iy0, ix1 - ix0, iy1 - iy0);
  }
  // los discos (luces, esporas, halos) se arman una vez como sprite y después se copian con una sola llamada
  const cacheDiscos = new Map();
  function disco(x, y, r, color) {
    if (Number.isInteger(r) && r > 0) {
      const clave = r + color;
      let d = cacheDiscos.get(clave);
      if (!d) {
        if (cacheDiscos.size > 500) cacheDiscos.clear();
        const wm = Math.floor(Math.sqrt(r * r + r * 0.5)), cv = document.createElement("canvas");
        cv.width = wm * 2 + 1; cv.height = r * 2 + 1;
        const c = cv.getContext("2d");
        c.fillStyle = color;
        for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.5)); c.fillRect(wm - w, dy + r, w * 2 + 1, 1); }
        d = { cv, wm };
        cacheDiscos.set(clave, d);
      }
      g.drawImage(d.cv, Math.round(x) - d.wm, Math.round(y) - r);
      return;
    }
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
    fondo.width = Math.ceil(Wc * K); fondo.height = Math.ceil(H * K);
    const c = fondo.getContext("2d");
    c.scale(K, K);
    c.fillStyle = BG;
    c.fillRect(0, 0, Wc, H);
    colinas(c, r, groundY, Hc * 0.2, COL_COLINA[0]);
    colinas(c, r, groundY, Hc * 0.11, COL_COLINA[1]);
    c.fillStyle = BG_SUELO;
    c.fillRect(0, groundY + 1, Wc, H - groundY);
    c.fillStyle = BLANCO;
    c.fillRect(0, groundY, Wc, Math.max(1, Math.round(1 / K)));

    estrellas.length = 0;
    const masc = Math.min(8, Math.max(1, (Wc * Hc) / (Wc0 * Hc0)));
    for (let i = 0; i < Math.round(40 * masc); i++) estrellas.push({ x: Math.floor(r() * Wc), y: Math.floor(r() * groundY * 0.8), ph: r() * TAU });
    flotantes.length = 0;
    for (let i = 0; i < Math.round(70 * masc); i++) {
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

  // Niveles de zoom: enteros para acercar y, cuando el hongo madre ya no entra en pantalla, niveles
  // fraccionarios para alejar (hasta verlo entero). Cuanto más crece el madre, más se puede alejar.
  function calcNiveles() {
    const base = [...new Set([1, 2, 3, 4, 5, 6, 8, 10, 12, S0].filter((k) => k <= Math.max(S0 * 3, 8)))].sort((a, b) => a - b);
    const m = medM;
    if (!m) return base;
    const fit = Math.max(0.02, Math.min(canvas.width / (1.2 * m.w), (0.74 * canvas.height) / (1.2 * (m.ch + m.sh))));
    if (fit >= 1) return base;
    const alej = [];
    for (let z = 0.7; z > fit * 1.05; z *= 0.7) alej.push(z);
    alej.push(fit);
    return [...alej.reverse(), ...base];
  }
  function resize() {
    dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    S0 = Math.max(1, Math.round((dpr * Math.min(cw, ch)) / ANCHO_REF));
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    niveles = calcNiveles();
    if (zoomIdx === null) zoomIdx = niveles.indexOf(S0);
    zoomIdx = clamp(zoomIdx, 0, niveles.length - 1);
    S = niveles[zoomIdx];
    Wc0 = Math.ceil(canvas.width / S0);
    Hc0 = Math.ceil(canvas.height / S0);
    groundRef = Math.round(Hc0 * 0.74);
    Wc = Math.ceil(canvas.width / S);
    Hc = Math.ceil(canvas.height / S);
    K = Math.min(1, S); // píxeles por celda del buffer: con el zoom alejado de 1 el buffer sigue siendo del tamaño de la pantalla
    lo.width = Math.ceil(Wc * K); lo.height = Math.ceil(Hc * K);
    if (loFrente) { loFrente.width = lo.width; loFrente.height = lo.height; }
    if (glv) glv.resize(canvas.width, canvas.height);
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
  // El hongo madre crece sin techo, pero ya no por las esporas: solo por los puntos de prestigio
  // (con la fracción de la barra, para que crezca suave) y por cada edificio construido.
  function medidasMadre(pf, nEd, bonus) {
    let w = 30 * (1 + pf / 10);
    w *= (bonus ? BONUS_CONSERV : 1) * (1 + 0.06 * nEd);
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
  // Las esporas que sueltan los productores (y los toques) caen al piso y esperan ahí a que un básico las lleve
  function lanzarEspora(x, y, col, lento = 0) {
    const x1 = x + (Math.random() - 0.5) * 14;
    part(x, y, 0, 0, { tipo: "viaje", col, x0: x, y0: y, x1, y1: groundY - 2, dur: 0.4 + Math.random() * 0.3 + lento * 0.3, arco: 5 + Math.random() * 9, estela: 0, local: true });
  }
  // Entrega: una espora de un manojo vuela hasta el sombrero del hongo madre (lo hacen los básicos al llegar)
  function volarAMadre(x, y, col, lento = 0) {
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
  const obstaculos = (alto = 99, conMadre = true) => [...(conMadre ? [obstaculoMadre(alto)] : []), ...Object.entries(edif).filter(([id]) => !(colocando?.mover && colocando.id === id)).map(([id, e]) => ({ x: e.x, w: tam(id).w })), ...torresV.map((v) => ({ x: v.x, w: 16 }))];

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
  // Cristalero: camina junto a la cristalería, se planta a pulir un cristal (destellos) y suelta esporas luminosas
  function actualizarCristalero(v, dt) {
    v.alfa = Math.min(1, v.alfa + dt * 2.5);
    v.animT += dt;
    v.hop = 0;
    v.estira = 0;
    const ed = edif.cristaleria;
    if (!ed) { v.modo = "idle"; return; }
    if (v.modo === "idle") {
      v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
      v.espera -= dt;
      if (v.espera <= 0) {
        const mw = tam("cristaleria").w / 2;
        v.meta = clamp(ed.x + (Math.random() < 0.5 ? -1 : 1) * (mw + 5 + Math.random() * 26), LIM0() + 12, LIM1() - 12);
        v.dir = Math.sign(v.meta - v.x) || 1;
        v.modo = "walk";
      }
    } else if (v.modo === "walk") {
      v.hop = Math.abs(Math.sin(v.animT * 11)) * 1.5;
      const d = v.meta - v.x, paso = VEL * 0.7 * dt;
      if (Math.abs(d) <= paso) { v.x = v.meta; v.modo = "pule"; v.tPule = 0; v.dir = Math.sign(ed.x - v.x) || 1; }
      else v.x += Math.sign(d) * paso;
    } else if (v.modo === "pule") {
      v.tPule += dt;
      v.estira = -Math.abs(Math.sin(v.tPule * 9)) * 1.2; // frota el cristal
      if (Math.random() < dt * 9) part(v.x + v.dir * 5 + (Math.random() - 0.5) * 3, groundY - HH - 2 - Math.random() * 3, 0, -10, { tipo: "mota", dur: 0.45, col: Math.random() < 0.5 ? "#5ef2ff" : "#ffffff", r: 1 });
      if (v.tPule > 2.6) {
        for (let k = 0; k < 3; k++) cola.push({ t: k * 0.1, fn: () => lanzarEspora(v.x, groundY - HH - 4, "#5ef2ff") }); // lluvia de esporas luminosas
        brillos.cristaleria = 1;
        motas(v.x, groundY - HH - 4, 8, 0.8, "#5ef2ff");
        v.modo = "idle"; v.espera = 0.5 + Math.random() * 2;
      }
    }
  }
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

  // ---- Soldados de la barraca: salen a cazar a los ladrones de esporas ----
  function actualizarSoldado(v, dt) {
    const B = edif.barraca;
    if (!B) return;
    v.alfa = Math.min(1, v.alfa + dt * 2.5);
    v.animT += dt;
    v.hop = 0; v.estira = 0;
    const e = getEvento();
    let blanco = null;
    if (e && e.tipo === "invasion") {
      let dmin = 1e9;
      for (const c of e.criaturas) { if (!c.vivo || c.ret > 0 || c.tipo === "murcielago" || Math.abs(c.dx) > 250) continue; const d = Math.abs(madre.x + c.dx - v.x); if (d < dmin) { dmin = d; blanco = c; } }
    }
    if (blanco) {
      const tx = madre.x + blanco.dx, d = tx - v.x;
      v.dir = Math.sign(d) || v.dir;
      if (Math.abs(d) > 7) { v.modo = "corre"; v.x += Math.sign(d) * VEL * 1.8 * dt; v.hop = Math.abs(Math.sin(v.animT * 14)) * 1.6; }
      else { v.modo = "ataca"; if (Math.random() < dt * 8) part(tx, groundY - 6, v.dir * 14, -8, { tipo: "mota", dur: 0.3, col: "#fff", r: 1 }); }
      return;
    }
    if (v.modo === "corre" || v.modo === "ataca") { v.modo = "idle"; v.espera = 0.5; }
    if (v.modo === "idle") {
      v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
      v.espera -= dt;
      if (v.espera <= 0) { v.meta = B.x + (Math.random() - 0.5) * 80; v.dir = Math.sign(v.meta - v.x) || 1; v.modo = "walk"; }
    } else {
      v.hop = Math.abs(Math.sin(v.animT * 11)) * 1.3;
      const d = v.meta - v.x, paso = VEL * 0.6 * dt;
      if (Math.abs(d) <= paso) { v.x = v.meta; v.modo = "idle"; v.espera = 1 + Math.random() * 3; } else v.x += Math.sign(d) * paso;
    }
  }

  // ---- Eventos arcanos (tormenta de esporas, meteoritos, mercader, invasión) ----
  const crateres = [], tiros = [];
  let humoT = 0;
  let tormentaA = 0, defCupula = 0;
  const alturaTorre = (v) => 24 + Math.min(6, v.t.sold) + 7;
  function procesarArcano(dt) {
    setAlcance(extent, canvas.width / Math.min(...niveles) / 2 + 4);
    for (const e of consumirFx()) {
      const x = madre.x + (e.dx || 0);
      if (e.tipo === "impacto") {
        motas(x, groundY - 2, 60, 2.6, "#ff8a1f"); motas(x, groundY - 2, 30, 1.8, "#ffe14d"); motas(x, groundY - 2, 16, 1.2, "#3a2a1a"); aroPart(x, groundY - 3, 60, 0.9); aroPart(x, groundY - 3, 34, 0.6);
        crateres.push({ x, t: 20 }); flash = Math.max(flash, 0.4);
        for (const v of visuales) if (Math.abs(v.x - x) < 40 && v.modo === "idle") v.espera = 3;
      } else if (e.tipo === "inter") {
        const y = groundY - Hc * 0.4;
        motas(x, y, 14, 1.3, "#7fe9ff"); aroPart(x, y, 16, 0.5);
        const tv = torresV[0];
        if (e.torre && tv) { tiros.push({ kind: "basica", x0: tv.x, y0: groundY - alturaTorre(tv), x1: x, y1: y, t: 0 }); tv.ang = Math.atan2(y - (groundY - alturaTorre(tv)), x - tv.x); tv.retro = 0.2; }
      } else if (e.tipo === "cristal") {
        const col = CRISTALES[e.ci % CRISTALES.length], y = groundY - 8 * (0.5 + e.f);
        motas(x, y, 20 + Math.round(24 * e.f), 1.5, col); motas(x, y, 8, 1, "#ffffff"); aroPart(x, y, 14 + Math.round(20 * e.f), 0.5);
      } else if (e.tipo === "cristal_roto") {
        motas(x, groundY - 6, 14, 1.1, CRISTALES[e.ci % CRISTALES.length]);
      } else if (e.tipo === "geiser") {
        const col = ["#b48cff", "#5ef2ff", "#ff6bd6", "#b5ff4a"][Math.floor(Math.random() * 4)];
        motas(x, groundY - 2, e.grande ? 40 : 16, e.grande ? 2.4 : 1.5, col); motas(x, groundY - 2, e.grande ? 14 : 5, 1.2, "#ffffff"); aroPart(x, groundY - 2, e.grande ? 30 : 16, 0.4);
        for (let k = 0; k < (e.grande ? 6 : 3); k++) cola.push({ t: k * 0.06, fn: () => lanzarEspora(x + (Math.random() - 0.5) * 6, groundY - 14 - Math.random() * 16, PALETA[Math.floor(Math.random() * 6)]) });
      } else if (e.tipo === "espora") {
        const y = groundY - 16, col = e.cristal ? CRISTALES[(e.col || 0) % CRISTALES.length] : PALETA[e.col || 0];
        motas(x, y, e.cristal ? 26 : 14, 1.3, col); motas(x, y, 8, 1, "#ffffff"); aroPart(x, y, e.cristal ? 22 : 14, 0.4);
      } else if (e.tipo === "kill") {
        const yy = groundY - 5 - (e.y || 0);
        motas(x, yy, e.grande ? 36 : 9, e.grande ? 1.8 : 1, "#c58aff"); aroPart(x, yy, e.grande ? 40 : 10, e.grande ? 0.7 : 0.4);
      } else if (e.tipo === "disparo") {
        const tv = torresV[e.torre];
        if (tv) {
          const y0 = groundY - alturaTorre(tv), y1 = groundY - 6 - (e.y1 || 0), x1 = madre.x + e.x1;
          tv.ang = Math.atan2(y1 - y0, x1 - tv.x); tv.retro = 0.18;
          tiros.push({ kind: e.kind, x0: tv.x, y0, x1, y1, t: 0, radio: e.radio, cadena: e.cadena && e.cadena.map((p) => ({ x: madre.x + p.x, y: groundY - 6 - (p.y || 0) })) });
          if (e.kind === "aoe") { motas(x1, y1, 16, 1.5, "#ff8a1f"); motas(x1, y1, 8, 1, "#ffe14d"); aroPart(x1, y1, e.radio, 0.35); }
          else if (e.kind === "hielo") { motas(x1, y1, 12, 1, "#9fd8ff"); aroPart(x1, y1, e.radio, 0.5); }
        }
      } else if (e.tipo === "robo") { motas(x, groundY - 6 - (e.y || 0), 14, 1.5, "#ffd23f"); aroPart(madre.x, groundY - 12, 34, 0.6); flash = Math.max(flash, 0.3); }
      else if (e.tipo === "golpe") motas(x, groundY - 6, 4, 0.7, "#fff");
    }
    const ev = getEvento();
    tormentaA += ((ev && ev.tipo === "tormenta" ? 0.16 : 0) - tormentaA) * Math.min(1, dt * 1.5);
    if (ev && ev.tipo === "tormenta") {
      for (let i = 0, k = dt * 60 + Math.random(); i < k; i++) part(camX - Wc / 2 + Math.random() * Wc, -offY() - 4, (Math.random() - 0.5) * 10, 10 + Math.random() * 24, { tipo: "mota", dur: 2.6 + Math.random(), col: PALETA[Math.floor(Math.random() * PALETA.length)], r: Math.random() < 0.3 ? 2 : 1 });
    }
    // edificios dañados: humo y brasas mientras dura la baja de producción
    humoT -= dt;
    if (humoT <= 0) {
      humoT = 0.12;
      const ahora = Date.now();
      for (const id in edif) {
        const dañado = Object.keys(HONGUITOS).some((h) => HONGUITOS[h].casa === id && danoMeteoro[h] && danoMeteoro[h].hasta > ahora);
        if (!dañado) continue;
        const m = tam(id), x = edif[id].x + (Math.random() - 0.5) * m.w * 0.6, y = groundY - m.sh - m.ch;
        part(x, y, (Math.random() - 0.5) * 6, -10 - Math.random() * 10, { tipo: "mota", dur: 1.6, col: Math.random() < 0.7 ? "#55555f" : "#ff8a1f", r: 2 });
      }
      if (danoMeteoro.basico && danoMeteoro.basico.hasta > ahora) part(madre.x + (Math.random() - 0.5) * 20, groundY - 4, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, { tipo: "mota", dur: 1.4, col: "#55555f", r: 2 });
    }
    for (let i = crateres.length - 1; i >= 0; i--) { crateres[i].t -= dt; if (crateres[i].t <= 0) crateres.splice(i, 1); }
    for (let i = tiros.length - 1; i >= 0; i--) { tiros[i].t += dt; if (tiros[i].t > 0.3) tiros.splice(i, 1); }
    for (const v of torresV) v.retro = Math.max(0, v.retro - dt);
  }
  function dibujarMercader(e) {
    const x = Math.round(madre.x + e.dx), dir = Math.sign(e.meta - e.dx) || (e.dx < 0 ? 1 : -1), camina = e.estado !== "espera";
    const bob = camina ? Math.round(Math.abs(Math.sin(t * 9)) * 1.5) : 0, y = groundY - bob;
    // mochila grande, sombrero ancho morado con moneda, bigote
    g.fillStyle = "#8a5a2a"; g.fillRect(x - dir * 7, y - 12, 6, 9); g.fillStyle = "#c28a4f"; g.fillRect(x - dir * 7, y - 12, 6, 2); g.fillStyle = "#ffd23f"; g.fillRect(x - dir * 6, y - 8, 4, 3);
    g.fillStyle = "#6a2fa8"; g.fillRect(x - 6, y - 11, 13, 2); g.fillRect(x - 4, y - 14, 9, 3); g.fillRect(x - 2, y - 16, 5, 2);
    g.fillStyle = "#ffd23f"; g.fillRect(x - 1, y - 12, 3, 2);
    g.fillStyle = "#fff"; g.fillRect(x - 4, y - 9, 9, 6);
    g.fillStyle = "#1d1d2a"; g.fillRect(x - 2, y - 8, 1, 1); g.fillRect(x + 2, y - 8, 1, 1);
    g.fillStyle = "#5a3a1a"; g.fillRect(x - 3, y - 6, 7, 1);
    g.fillStyle = "#fff"; g.fillRect(x - 3, y - 3 + (camina ? Math.floor(t * 9) % 2 : 0), 2, 3); g.fillRect(x + 2, y - 3 + (camina ? 1 - (Math.floor(t * 9) % 2) : 0), 2, 3);
    if (e.estado === "espera") { // cartel de «tocame»
      const sal = Math.round(Math.sin(t * 5) * 2);
      g.fillStyle = "#ffd23f"; g.fillRect(x - 1, y - 27 + sal, 3, 6); g.fillRect(x - 1, y - 19 + sal, 3, 2);
      g.globalAlpha = 0.18 + 0.1 * Math.sin(t * 4); disco(x, y - 8, 14, "#ffd23f"); g.globalAlpha = 1;
    }
  }
  function dibujarCriatura(c) {
    const x = Math.round(madre.x + c.dx), dir = c.dx < 0 ? 1 : -1, ph = Math.floor(t * 14 + c.fase) % 2;
    const bob = Math.round(Math.abs(Math.sin(t * 13 + c.fase)) * 2);
    let y = groundY - bob, alto = 12;
    if (c.tipo === "saqueador") {
      g.fillStyle = "#3a1f55"; g.fillRect(x - 4, y - 7, 9, 6); g.fillRect(x - 3, y - 8, 7, 1); g.fillRect(x - 3, y - 2 + ph, 2, 2); g.fillRect(x + 2, y - 2 + (1 - ph), 2, 2);
      g.fillStyle = "#ff3b3b"; g.fillRect(x - 2 + (dir > 0 ? 1 : 0), y - 6, 2, 2); g.fillRect(x + 1 + (dir > 0 ? 1 : 0), y - 6, 2, 2);
      g.fillStyle = "#8a5a2a"; g.fillRect(x - dir * 6, y - 9, 4, 5); g.fillStyle = "#ffd23f"; g.fillRect(x - dir * 5, y - 7, 2, 2); // saco de esporas
    } else if (c.tipo === "arquero") {
      g.fillStyle = "#2f6b3a"; g.fillRect(x - 3, y - 8, 7, 7); g.fillRect(x - 2, y - 10, 5, 2); g.fillRect(x - 3, y - 2 + ph, 2, 2); g.fillRect(x + 1, y - 2 + (1 - ph), 2, 2);
      g.fillStyle = "#14141d"; g.fillRect(x - 1 + (dir > 0 ? 1 : 0), y - 8, 3, 2); g.fillStyle = "#ffd23f"; g.fillRect(x + (dir > 0 ? 1 : 0), y - 8, 1, 1);
      const tense = c.carga > 0 ? 2 : 0; // el arco se tensa mientras apunta a la base
      g.fillStyle = "#c28a4f"; g.fillRect(x + dir * 5, y - 10, 1, 8); g.fillRect(x + dir * 4, y - 11, 1, 1); g.fillRect(x + dir * 4, y - 2, 1, 1);
      g.fillStyle = "#fff"; g.fillRect(x + dir * (3 - tense), y - 6, 1, 1);
      if (c.carga > 0) { g.fillStyle = "#ffd23f"; g.fillRect(x + dir * (4 + tense), y - 6, 3, 1); }
      alto = 14;
    } else if (c.tipo === "hechicero") {
      const fl = Math.round(Math.sin(t * 3 + c.fase) * 1.5);
      y = groundY - 2 + fl;
      g.fillStyle = "#2a3f8f"; g.fillRect(x - 4, y - 9, 9, 9); g.fillRect(x - 3, y - 11, 7, 2); g.fillRect(x - 2, y - 14, 5, 3); g.fillRect(x - 1, y - 17, 3, 3);
      g.fillStyle = "#7fe9ff"; g.fillRect(x - 2 + (dir > 0 ? 1 : 0), y - 9, 2, 2); g.fillRect(x + 1 + (dir > 0 ? 1 : 0), y - 9, 2, 2);
      const ox = x + dir * 7, oy = y - 12 + Math.round(Math.sin(t * 5 + c.fase) * 1.5);
      g.fillStyle = "#6a4a2a"; g.fillRect(x + dir * 6, y - 11, 1, 11);
      g.globalAlpha = 0.35 + 0.2 * Math.sin(t * 6); disco(ox, oy, 5, "#c58aff"); g.globalAlpha = 1;
      g.fillStyle = "#e8c8ff"; g.fillRect(ox - 1, oy - 1, 3, 3);
      g.globalAlpha = 0.06 + 0.03 * Math.sin(t * 2); disco(x, y - 6, 24, "#7fe9ff"); g.globalAlpha = 1; // aura de escudo para los que tiene cerca
      alto = 20;
    } else if (c.tipo === "murcielago") {
      const ale = Math.floor(t * 16 + c.fase) % 2;
      y = groundY - 14 - c.y + Math.round(Math.sin(t * 4 + c.fase) * 2);
      g.fillStyle = "#2a1a3a"; g.fillRect(x - 2, y - 3, 5, 4);
      g.fillRect(x - 6, y - 3 - (ale ? 3 : 0), 4, 2); g.fillRect(x - 5, y - 1 - (ale ? 2 : 0), 3, 2); g.fillRect(x + 3, y - 3 - (ale ? 3 : 0), 4, 2); g.fillRect(x + 3, y - 1 - (ale ? 2 : 0), 3, 2);
      g.fillStyle = "#ff3b3b"; g.fillRect(x - 1, y - 2, 1, 1); g.fillRect(x + 1, y - 2, 1, 1);
      g.fillStyle = "#14141d"; g.fillRect(x - 2, y - 5, 1, 2); g.fillRect(x + 2, y - 5, 1, 2);
      alto = 8;
    } else if (c.tipo === "jefe") {
      y = groundY - Math.round(Math.abs(Math.sin(t * 6 + c.fase)) * 2);
      g.fillStyle = "#5a1a2a"; g.fillRect(x - 9, y - 16, 19, 13); g.fillRect(x - 7, y - 19, 15, 3); g.fillRect(x - 8, y - 3, 6, 3 + ph); g.fillRect(x + 3, y - 3, 6, 3 + (1 - ph));
      g.fillStyle = "#c8c8dc"; g.fillRect(x - 8, y - 23, 2, 5); g.fillRect(x + 7, y - 23, 2, 5); g.fillRect(x - 7, y - 21, 1, 2); g.fillRect(x + 7, y - 21, 1, 2);
      g.fillStyle = "#ffd23f"; g.fillRect(x - 5 + (dir > 0 ? 1 : 0), y - 15, 3, 3); g.fillRect(x + 2 + (dir > 0 ? 1 : 0), y - 15, 3, 3);
      g.fillStyle = "#8a5a2a"; g.fillRect(x - dir * 11, y - 18, 5, 7); g.fillStyle = "#ffd23f"; g.fillRect(x - dir * 10, y - 16, 3, 3);
      alto = 27;
    }
    if (c.lento > 0) { g.globalAlpha = 0.4; g.fillStyle = "#9fd8ff"; g.fillRect(x - 5, y - alto + 2, 11, alto - 2); g.globalAlpha = 1; }
    if (c.esc) { g.globalAlpha = 0.5; g.fillStyle = "#7fe9ff"; g.fillRect(x - 6, y - alto, 13, 1); g.globalAlpha = 1; }
    if (c.hp < c.hpMax || c.tipo === "jefe") {
      const w = c.tipo === "jefe" ? 19 : 9, by = y - alto - 3;
      g.fillStyle = "#14141d"; g.fillRect(x - (w >> 1) - 1, by - 1, w + 2, 3); g.fillStyle = "#ff5a5a"; g.fillRect(x - (w >> 1), by, Math.max(1, Math.round(w * Math.max(0, c.hp) / c.hpMax)), 1);
    }
  }
  // ---- Torres de defensa ----
  function barril(cx, cy, ang, len, grosor, col, retro) {
    g.fillStyle = col;
    for (let k = 0; k < len; k++) { const r = k - retro; g.fillRect(Math.round(cx + Math.cos(ang) * r) - (grosor >> 1), Math.round(cy + Math.sin(ang) * r) - (grosor >> 1), grosor, grosor); }
  }
  function dibujarTorre(v, alfa = 1) {
    const tt = v.t, x = Math.round(v.x), T = TIPOS_TORRE[tt.tipo], sd = tt.sold, hh = 24 + Math.min(6, sd), top = groundY - hh;
    g.globalAlpha = alfa;
    g.fillStyle = "#5a5a78"; g.fillRect(x - 6, top, 12, hh);
    g.fillStyle = "#7a7a98"; for (let yy = top + 4; yy < groundY - 1; yy += 5) g.fillRect(x - 6, yy, 12, 1);
    g.fillStyle = "#4a4a66"; g.fillRect(x - 6, top, 2, hh);
    g.fillStyle = "#3a2410"; g.fillRect(x - 2, groundY - 5, 4, 5);
    g.fillStyle = "#14141d"; g.fillRect(x - 1, top + 9, 2, 4);
    g.fillStyle = "#6a6a88"; g.fillRect(x - 8, top - 3, 16, 3);
    g.fillStyle = "#8a8aa8"; for (const dx of [-8, -4, 0, 4]) g.fillRect(x + dx, top - 6, 3, 3);
    g.fillStyle = T.color; g.fillRect(x - 8, top - 3, 16, 1);
    for (let k = 0; k < sd; k++) { // soldados adentro: cabecitas con casco en el parapeto
      const px = x - 7 + (k % 5) * 3 + (((k / 5) | 0) ? 1 : 0), py = top - 4 - ((k / 5) | 0) * 3;
      g.fillStyle = "#8f9a5a"; g.fillRect(px, py, 2, 2); g.fillStyle = "#c8c8dc"; g.fillRect(px, py - 1, 2, 1);
    }
    const cy = top - 7, rec = v.retro > 0 ? 2 : 0, n = Math.min(4, 1 + Math.floor(sd / 3));
    if (tt.tipo === "basica" || tt.tipo === "rapida" || tt.tipo === "sniper") {
      g.fillStyle = "#4a4a66"; g.fillRect(x - 4, cy - 1, 9, 3);
      const len = tt.tipo === "sniper" ? 17 : tt.tipo === "rapida" ? 8 : 10, gr = tt.tipo === "sniper" ? 2 : tt.tipo === "rapida" ? 2 : 3;
      for (let k = 0; k < n; k++) {
        const a = v.ang + (k - (n - 1) / 2) * 0.28;
        barril(x, cy - 1, a, len, gr, "#2a2a3c", rec);
        if (tt.tipo === "rapida") barril(x, cy - 1, a, 2, gr, T.color, rec - len + 2);
        if (v.retro > 0.1) { g.fillStyle = "#ffe14d"; g.fillRect(Math.round(x + Math.cos(a) * (len + 1)) - 1, Math.round(cy - 1 + Math.sin(a) * (len + 1)) - 1, 3, 3); }
      }
      if (tt.tipo === "sniper") { g.fillStyle = "#7fe9ff"; g.fillRect(x - 1, cy - 4, 3, 2); }
    } else if (tt.tipo === "aoe") {
      g.fillStyle = "#4a4a66"; g.fillRect(x - 5, cy - 1, 11, 3);
      for (let k = 0; k < n; k++) barril(x + (k - (n - 1) / 2) * 3, cy - 1, -1.15 + (v.ang > -1.57 ? 0.15 : -0.15) , 7, 5, "#3a2a2a", rec);
      g.fillStyle = "#ff8a1f"; g.fillRect(x - 5, cy + 1, 11, 1);
    } else if (tt.tipo === "hielo") {
      const p = 0.5 + 0.5 * Math.sin(t * 4);
      g.fillStyle = "#4a4a66"; g.fillRect(x - 3, cy - 1, 7, 3);
      g.fillStyle = "#9fd8ff"; g.fillRect(x - 1, cy - 9, 3, 8); g.fillRect(x - 2, cy - 7, 5, 4); g.fillRect(x, cy - 12, 1, 3);
      g.fillStyle = "#fff"; g.fillRect(x, cy - 8, 1, 4);
      g.globalAlpha = alfa * (0.15 + 0.15 * p); disco(x, cy - 6, 8, "#9fd8ff"); g.globalAlpha = alfa;
    } else if (tt.tipo === "rayo") {
      g.fillStyle = "#4a4a66"; g.fillRect(x - 3, cy - 1, 7, 3);
      g.fillStyle = "#8a6a2a"; g.fillRect(x - 1, cy - 8, 3, 7);
      g.fillStyle = "#c58aff"; for (const yy of [cy - 7, cy - 5, cy - 3]) g.fillRect(x - 3, yy, 7, 1);
      const on = Math.random() < 0.5 || v.retro > 0;
      g.fillStyle = on ? "#fff" : "#e8c8ff"; g.fillRect(x - 2, cy - 12, 5, 4);
      g.globalAlpha = alfa * 0.3; disco(x, cy - 10, 7, "#c58aff"); g.globalAlpha = alfa;
    }
    if (defCupula > 0) { // cúpula protectora contra meteoritos
      const rr = 14 + defCupula * 2, cy2 = groundY - 2;
      g.globalAlpha = alfa * (0.10 + 0.06 * (0.5 + 0.5 * Math.sin(t * 2)));
      g.fillStyle = "#7fe9ff";
      for (let dy = 0; dy < rr; dy++) { const w = Math.floor(Math.sqrt(rr * rr - dy * dy)); g.fillRect(x - w, cy2 - dy, 2, 1); g.fillRect(x + w - 2, cy2 - dy, 2, 1); }
    }
    g.globalAlpha = 1;
  }
  function dibujarTiros() {
    for (const d of tiros) {
      const k = d.t;
      if (d.kind === "rayo" && d.cadena) {
        g.globalAlpha = Math.max(0, 1 - k / 0.22);
        const pts = [{ x: d.x0, y: d.y0 }, ...d.cadena];
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i], seg = 5;
          for (let q = 0; q < seg; q++) {
            const u = q / seg, jx = q ? (Math.random() - 0.5) * 6 : 0, jy = q ? (Math.random() - 0.5) * 6 : 0;
            g.fillStyle = q % 2 ? "#fff" : "#c58aff";
            g.fillRect(Math.round(a.x + (b.x - a.x) * u + jx), Math.round(a.y + (b.y - a.y) * u + jy), 2, 2);
          }
        }
        g.globalAlpha = 1;
      } else if (d.kind === "aoe") {
        const p = clamp(k / 0.3, 0, 1), arco = 26;
        const px = d.x0 + (d.x1 - d.x0) * p, py = d.y0 + (d.y1 - d.y0) * p - Math.sin(p * Math.PI) * arco;
        if (p < 1) { g.fillStyle = "#ff8a1f"; g.fillRect(Math.round(px) - 2, Math.round(py) - 2, 5, 5); g.fillStyle = "#ffe14d"; g.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3); }
      } else if (d.kind === "hielo") {
        g.globalAlpha = Math.max(0, 1 - k / 0.25);
        g.fillStyle = "#9fd8ff";
        for (let i = 0; i < 7; i++) { const q = clamp(k * 5 - i * 0.12, 0, 1); g.fillRect(Math.round(d.x0 + (d.x1 - d.x0) * q), Math.round(d.y0 + (d.y1 - d.y0) * q), 3, 3); }
        g.globalAlpha = 1;
      } else {
        const dur = d.kind === "sniper" ? 0.2 : 0.14;
        if (k > dur) continue;
        g.globalAlpha = 1 - k / dur;
        g.fillStyle = d.kind === "sniper" ? "#fff" : d.kind === "rapida" ? "#ffd23f" : "#7fe9ff";
        const pasos = d.kind === "sniper" ? 22 : 8;
        for (let i = 0; i < pasos; i++) { const q = clamp(k / dur * 1.5 - i * (1 / pasos) * 0.5, 0, 1); g.fillRect(Math.round(d.x0 + (d.x1 - d.x0) * q), Math.round(d.y0 + (d.y1 - d.y0) * q), d.kind === "sniper" ? 1 : 2, d.kind === "sniper" ? 1 : 2); }
        g.globalAlpha = 1;
      }
    }
  }
  // esporada: esporas que flotan y se mecen hacia el piso (colores de los honguitos); algunas son esporas cristalinas (hongo-cristal)
  const espoY = (sp) => {
    const piso = groundY - 16;
    if (sp.estado === "cae") { const p = clamp(sp.t / sp.caida, 0, 1), y0 = -offY() - 20; return y0 + (piso - y0) * (1 - (1 - p) * (1 - p)); }
    return piso + Math.sin((sp.t - sp.caida) * 2 + sp.id) * 3;
  };
  const espoX = (sp) => madre.x + sp.dx + Math.sin(sp.t * 1.6 + sp.id * 1.7) * (sp.estado === "cae" ? 5 : 2);
  function dibujarArcano() {
    for (const c of crateres) { g.globalAlpha = Math.min(1, c.t / 3); g.fillStyle = "#14141d"; g.fillRect(Math.round(c.x) - 11, groundY, 23, 4); g.fillRect(Math.round(c.x) - 8, groundY + 4, 17, 2); g.fillStyle = "#3a2a1a"; g.fillRect(Math.round(c.x) - 7, groundY - 1, 15, 2); g.globalAlpha = 1; }
    const e = getEvento();
    if (e && e.tipo === "meteoros") {
      for (const m of e.meteoros) {
        if (m.estado !== "cae") continue;
        const p = clamp(m.t / m.caida, 0, 1), y0 = -offY() - 40, x1 = madre.x + m.dx, hx = x1 + (1 - p) * 160, hy = y0 + (groundY - y0) * p * p;
        for (let k = 22; k >= 1; k--) { const q = clamp(p - k * 0.02, 0, 1); g.globalAlpha = 0.65 * (1 - k / 23); g.fillStyle = k < 8 ? "#ffe14d" : "#ff8a1f"; const sz = Math.round(13 - k * 0.3); g.fillRect(Math.round(x1 + (1 - q) * 160) - (sz >> 1), Math.round(y0 + (groundY - y0) * q * q) - (sz >> 1), sz, sz); }
        g.globalAlpha = 0.25; disco(Math.round(hx), Math.round(hy), 17, "#ff8a1f"); g.globalAlpha = 1;
        g.fillStyle = "#ff8a1f"; g.fillRect(Math.round(hx) - 9, Math.round(hy) - 9, 19, 19); g.fillStyle = "#ffe14d"; g.fillRect(Math.round(hx) - 6, Math.round(hy) - 6, 13, 13); g.fillStyle = "#fff"; g.fillRect(Math.round(hx) - 3, Math.round(hy) - 3, 7, 7);
      }
    }
    if (e && e.tipo === "cristales") {
      for (const c of e.cris) {
        if (c.t < 0 || c.estado === "hecha" || c.estado === "rota") continue;
        const f = clamp(c.t / c.crece, 0, 1), x = Math.round(madre.x + c.dx), fy = groundY, k = (0.3 + 0.7 * f) * (c.gigante ? 1.5 : 1);
        const frag = c.vida - c.t < 2 && c.estado === "maduro"; // a punto de romperse: tiembla
        const tiembla = frag ? Math.round(Math.sin(t * 60)) : 0;
        g.globalAlpha = 0.1 + 0.14 * f; disco(x, fy - 7 * k, Math.max(2, Math.round(9 * k)), CRISTALES[c.ci]); g.globalAlpha = 1;
        for (const [dx, sc, ci] of [[-5, 1.4, (c.ci + 2) % 5], [5, 1.7, c.ci], [0, 2.1, c.ci]]) {
          const w = Math.max(3, Math.round(5 * sc * k)), h = Math.max(3, Math.round(6 * sc * k));
          g.drawImage(spritesCristal[ci], x + Math.round(dx * k) - (w >> 1) + tiembla, fy - h, w, h);
        }
        if (f >= 1 && Math.floor(t * 4 + c.id) % 2) { g.fillStyle = BLANCO; g.fillRect(x + Math.round(6 * k), fy - Math.round(14 * k), 1, 1); g.fillRect(x - Math.round(7 * k), fy - Math.round(9 * k), 1, 1); }
      }
    }
    if (e && e.tipo === "geiser") {
      for (const gs of e.geis) {
        const x = Math.round(madre.x + gs.dx), pul = clamp(gs.prox, 0, 1.5) < 0.35 ? 1 : 0; // se hincha un instante antes de erupcionar
        g.fillStyle = "#14141d"; g.fillRect(x - 5, groundY - 1, 11, 2); g.fillRect(x - 3, groundY - 2, 7, 1);
        g.fillStyle = pul ? "#ffffff" : "#6a4aa8"; g.fillRect(x - 2, groundY - 2, 5, 1);
        g.globalAlpha = 0.2 + 0.2 * pul; disco(x, groundY - 3, 6, "#b48cff"); g.globalAlpha = 1;
      }
    }
    if (e && e.tipo === "esporada") {
      for (const sp of e.esporasV) {
        if (sp.estado !== "cae" && sp.estado !== "suelo") continue;
        if (sp.estado === "suelo" && sp.caida + sp.vida - sp.t < 2.5 && Math.floor(sp.t * 7) % 2) continue; // titila antes de perderse
        const x = Math.round(espoX(sp)), y = Math.round(espoY(sp)), col = sp.cristal ? CRISTALES[sp.ci] : PALETA[sp.col];
        g.globalAlpha = 0.18; disco(x, y, sp.cristal ? 9 : 7, col); g.globalAlpha = 1;
        if (sp.cristal) { g.drawImage(spritesCristal[sp.ci], x - 4, y - 8, 8, 10); }
        else { g.fillStyle = col; g.fillRect(x - 1, y - 2, 3, 4); g.fillRect(x - 2, y - 1, 5, 2); g.fillStyle = BLANCO; g.fillRect(x - 1, y - 1, 1, 1); }
        // estela de motitas que suben y rastro de la caída
        g.fillStyle = col;
        for (let k = 0; k < 3; k++) { g.globalAlpha = 0.5 - k * 0.15; g.fillRect(x + Math.round(Math.sin(t * 3 + sp.id + k) * 3), y + 4 + k * 3, 1, 1); }
        g.globalAlpha = 1;
        if (Math.floor(t * 4 + sp.id) % 2) { g.fillStyle = BLANCO; g.fillRect(x + 5, y - 5, 1, 1); g.fillRect(x - 6, y + 2, 1, 1); }
      }
    }
    if (e && e.tipo === "mercader") dibujarMercader(e);
    if (e && e.tipo === "invasion") for (const c of e.criaturas) if (c.vivo && c.ret <= 0) dibujarCriatura(c);
    dibujarTiros();
  }

  // ---- Taberna: mercenarios ----
  function sincronizarMercs(dt) {
    const tab = edif.taberna;
    if (!tab) { mercs = []; return; }
    const run = getRun();
    for (const id of Object.keys(mercInfo)) {
      let m = mercs.find((q) => q.id === id);
      if (!m) { m = { id, x: tab.x + (Math.random() - 0.5) * 50, dir: Math.random() < 0.5 ? -1 : 1, modo: "idle", t: Math.random() * 5, espera: Math.random() * 3, meta: 0, fiesta: 0, fuera: false }; mercs.push(m); }
      const sale = !!run && run.fase !== "fin" && run.party.some((p) => p.id === id);
      if (sale && !m.fuera) { m.fuera = true; m.modo = "idle"; motas(m.x, groundY - 6, 4, 0.6, "#c8c8dc"); }
      if (!sale && m.fuera) { m.fuera = false; m.x = tab.x + (Math.random() - 0.5) * 6; m.alfa = 0; }
      m.t += dt;
      m.alfa = m.fuera ? 0 : Math.min(1, (m.alfa ?? 1) + dt * 2.5);
      if (m.fuera) continue;
      if (m.fiesta > 0) {
        m.fiesta -= dt;
        if (Math.random() < dt * 14) part(m.x + (Math.random() - 0.5) * 8, groundY - 14, (Math.random() - 0.5) * 24, -20 - Math.random() * 14, { tipo: "mota", dur: 0.9, col: PALETA[Math.floor(Math.random() * PALETA.length)], r: 1 });
        continue;
      }
      if (mercInfo[id].herido > 0) continue; // los heridos descansan sentados con una venda
      if (m.modo === "idle") {
        m.espera -= dt;
        if (m.espera <= 0) { m.meta = tab.x + (Math.random() - 0.5) * 100; m.dir = Math.sign(m.meta - m.x) || 1; m.modo = "walk"; }
      } else {
        const d = m.meta - m.x, paso = VEL * 0.5 * dt;
        if (Math.abs(d) <= paso) { m.x = m.meta; m.modo = "idle"; m.espera = 1 + Math.random() * 4; } else m.x += Math.sign(d) * paso;
      }
    }
    mercs = mercs.filter((m) => mercInfo[m.id]);
  }
  // el party vuelve a la taberna: los que están sanos festejan si ganaron algo
  function festejarMercs(res) {
    for (const m of mercs) {
      if (mercInfo[m.id]?.herido > 0) continue;
      if (res && (res.esporas?.gt?.(0) || res.cristal)) { m.fiesta = res.cristal ? 5 : 3; m.dir = Math.random() < 0.5 ? -1 : 1; }
    }
    if (edif.taberna) { brillos.taberna = 1; motas(edif.taberna.x, groundY - 18, 14, 1.2, "#ffd23f"); }
  }
  function dibujarMercs() {
    for (const m of mercs) {
      if (m.fuera || m.alfa <= 0) continue;
      const herido = mercInfo[m.id]?.herido > 0, base = Math.round(groundY - (m.fiesta > 0 ? Math.abs(Math.sin(m.t * 9)) * 5 : 0));
      g.globalAlpha = m.alfa;
      dibujarMerc(g, m.id, Math.round(m.x), herido ? groundY : base, { dir: m.dir, pose: m.modo === "walk" && Math.floor(m.t * 9) % 2 ? 1 : 0, t: m.t, vendado: herido });
      g.globalAlpha = 1;
      if (herido) { g.fillStyle = "#c8c8dc"; const z = Math.floor(m.t * 1.5) % 3; g.fillRect(Math.round(m.x) + 4, groundY - 14 - z * 2, 2 + z, 1); }
    }
  }
  // cristales radiantes engarzados en el tronco del hongo madre: una veta que sube por el medio
  function dibujarCristalesMadre() {
    if (!cristalesN) return;
    const m = medidas(), cx = Math.round(madre.x), alto = m.sh - 12;
    const lugares = Math.max(1, Math.floor(alto / 8) * 2); // dos columnas pegadas al eje del tronco
    const n = Math.min(cristalesN, lugares, 80);
    for (let k = 0; k < n; k++) {
      const fila = Math.floor(k / 2), lado = k % 2 ? 1 : -1;
      const x = cx + lado * 3 + (fila % 2 ? lado : 0), y = groundY - 8 - fila * 8;
      const pulso = 0.5 + 0.5 * Math.sin(t * 2.2 + k * 0.9);
      g.globalAlpha = 0.1 + 0.1 * pulso; disco(x, y - 3, 6, CRISTALES[k % CRISTALES.length]);
      g.globalAlpha = 0.07 + 0.06 * pulso; disco(x, y - 3, 9, "#ffffff");
      g.globalAlpha = 1;
      g.drawImage(spritesCristal[k % CRISTALES.length], x - 3, y - 7, 7, 8);
      g.fillStyle = "#fff"; g.fillRect(x - 1, y - 6, 1, 1);
      if ((k + Math.floor(t * 2)) % 7 === 0) { g.fillRect(x + 3, y - 8, 1, 1); g.fillRect(x - 4, y - 5, 1, 1); }
    }
  }

  // ---- Mina hongil: nido de túneles bajo el piso, mineros y yacimientos de cristal ----
  // Los nodos son puntos del PISO del túnel (x al costado de la entrada, y hacia abajo). Los túneles
  // serpentean y se ramifican como un hormiguero; los nodos "cámara" son salas grandes con yacimientos.
  const TR = 5.5; // radio de los túneles (entra un honguito)
  const minaProfMax = () => Math.round(0.26 * Hc0 * 2.6);
  // cuánto de la mina está cavada según los mineros (0..1): crece con el log de la cantidad
  const minaObjetivo = (n) => (n <= 0 ? 0 : clamp(0.1 + (Math.log10(n) / 1.77) * 0.9, 0.1, 1)); // 100% con 60 mineros
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
    // la puerta de la dungeon: al fondo del tramo más lejano, en una sala sin yacimientos
    let fin = 0;
    nodos.forEach((n, i) => { if (n.d > nodos[fin].d) fin = i; });
    if (!nodos[fin].cam) camara(fin);
    for (let q = yac.length - 1; q >= 0; q--) if (Math.hypot(nodos[yac[q].nodo].x - nodos[fin].x, nodos[yac[q].nodo].y - nodos[fin].y) < 34) yac.splice(q, 1); // nada de cristales cerca de la puerta
    const puerta = { nodo: fin };
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
    mina = { puerta, nodos, yac, orden, total, depth: prof2, medio, mg, cvBorde: cv(), cvHueco: cv(), cvDet: cv(), nDib: 0 };
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
    // la mina llegó al 100%: aparece la puerta de la dungeon y se avisa (una sola vez por partida)
    if (dungeonFlag) { if (puertaT < 0) puertaT = 99; }
    else if (!puertaAvisada && minaP >= 1 && obj >= 1) {
      puertaAvisada = true; puertaT = 0;
      const n = mina.nodos[mina.puerta.nodo];
      motas(edif.mina.x + n.x, groundY + n.y - 8, 30, 1.6, "#c58aff");
      aroPart(edif.mina.x + n.x, groundY + n.y - 8, 26, 0.9);
      opciones.onDungeon?.();
    }
    if (puertaT >= 0 && puertaT < 99) puertaT += dt;
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
    const m = mina;
    if (m.nComp !== m.nDib) { // las tres capas solo cambian cuando se cava: se juntan en una y se copia esa
      if (!m.cvTodo) { m.cvTodo = document.createElement("canvas"); m.cvTodo.width = m.cvBorde.width; m.cvTodo.height = m.cvBorde.height; }
      const ct = m.cvTodo.getContext("2d");
      ct.clearRect(0, 0, m.cvTodo.width, m.cvTodo.height);
      ct.drawImage(m.cvBorde, 0, 0); ct.drawImage(m.cvHueco, 0, 0); ct.drawImage(m.cvDet, 0, 0);
      m.nComp = m.nDib;
    }
    blitR(m.cvTodo, 0, 0, m.cvTodo.width, m.cvTodo.height, ox, groundY + 1, m.cvTodo.width, m.cvTodo.height);
    // puerta de la dungeon (al fondo de la mina)
    if (puertaT >= 0) {
      const n = mina.nodos[mina.puerta.nodo], X = Math.round(x0 + n.x), Y = groundY + Math.round(n.y);
      const a = Math.min(1, puertaT / 1.5), pulso = 0.5 + 0.5 * Math.sin(t * 2.2);
      g.globalAlpha = a * (0.12 + 0.1 * pulso); disco(X, Y - 8, 17, "#b06bff");
      g.globalAlpha = a;
      g.fillStyle = "#5a5a78"; g.fillRect(X - 6, Y - 16, 12, 16); g.fillRect(X - 5, Y - 17, 10, 1); g.fillRect(X - 3, Y - 18, 6, 1);
      g.fillStyle = "#14082a"; g.fillRect(X - 4, Y - 15, 8, 15); g.fillRect(X - 3, Y - 16, 6, 1);
      g.fillStyle = "#8a8aa8"; g.fillRect(X - 6, Y - 16, 1, 2); g.fillRect(X + 5, Y - 16, 1, 2); g.fillRect(X - 1, Y - 18, 2, 1);
      for (let k = 0; k < 4; k++) { // destellos que suben dentro del portal
        const u = (t * 0.6 + k * 0.27) % 1;
        g.fillStyle = k % 2 ? "#c58aff" : "#fff"; g.fillRect(X - 3 + ((k * 5) % 7), Y - 2 - Math.round(u * 12), 1, 1);
      }
      for (const lado of [-1, 1]) { // antorchas
        const tx = X + lado * 10;
        g.fillStyle = "#6a4a2a"; g.fillRect(tx, Y - 9, 1, 5);
        g.fillStyle = Math.floor(t * 9 + lado) % 2 ? "#ffd23f" : "#ff8a1f"; g.fillRect(tx - 1, Y - 12, 3, 3);
        g.globalAlpha = a * 0.1; disco(tx, Y - 11, 6, "#ffd23f"); g.globalAlpha = a;
      }
      g.globalAlpha = 1;
    }
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
    if ((tPrest -= dt) <= 0) { tPrest = 0.25; const pr = prestigio(state.total); pfMadre = pr.puntos + pr.frac; }
    medM = medidasMadre(pfMadre, Object.keys(state.edificios).length, bonusMadre);
    // al crecer el madre se agregan niveles para alejar más (sin tocar el zoom actual)
    if ((tNiveles -= dt) <= 0) {
      tNiveles = 1;
      const nn = calcNiveles();
      if (nn.length !== niveles.length || nn[0] !== niveles[0]) {
        niveles = nn;
        zoomIdx = nn.reduce((best, z, i) => (Math.abs(z - S) < Math.abs(nn[best] - S) ? i : best), 0);
        if (nn[zoomIdx] !== S) resize();
      }
    }
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
    const otrosT = otros.slice();
    state.torres.forEach((tt, i) => {
      const x = xLibre(C0 + tt.dx, 16, otrosT);
      otrosT.push({ x, w: 16 });
      const prev = torresV[i];
      if (!prev && !inicial) { motas(x, groundY - 14, 26, 1.2); aroPart(x, groundY - 14, 36, 0.6); }
      torresV[i] = { x, t: tt, i, ang: prev ? prev.ang : -0.6, retro: prev ? prev.retro : 0 };
    });
    torresV.length = state.torres.length;
    for (const id in brillos) brillos[id] = Math.max(0, brillos[id] - dt * 2);
    // hasta dónde llega el mundo: el que haya en pantalla o lo que ocupan madre y edificios
    extent = Math.max(Wc0 / 2, (medidas().w + Object.keys(edif).reduce((a, id) => a + tam(id).w + 24, 0) + 120) / 2);
    if (mina && edif.mina) extent = Math.max(extent, Math.abs(edif.mina.x - C0) + mina.medio + 40); // la cámara tiene que poder llegar al fondo de la mina
    if (camObj) { const k = Math.min(1, dt * 2.5); camX += (camObj.x - camX) * k; camY += (camObj.y - camY) * k; if (Math.abs(camObj.x - camX) < 1 && Math.abs(camObj.y - camY) < 1) camObj = null; }
    limitarCam();

    sincronizarGigantes(state, inicial);
    for (const gi of gigantes) if (gi.p < 1) gi.p = Math.min(1, gi.p + dt / 5);
    sincronizarVisuales(state);
    actualizarCohete(dt);
    const mHalf = medidas().w / 2;
    const LI = logiInfo(state);
    actualizarMontes(dt, state);
    const sitiosPila = sitiosDePila();
    // hay trabajo si hay esporas en el piso o si se están soltando (aunque los básicos las lleven al instante): trabaja la fracción de cargadores que hace falta
    const hayPila = state.logi.n >= 0.5 || LI.em >= 0.05;
    const util = clamp(LI.em / Math.max(LI.cap, 1e-9), 0.12, 1);
    const dtG = dt;
    for (const tp of TIPOS_VISUALES) { velTipo[tp] = velocidad(state, tp); buffTipos[tp] = buffTipoActivo(state, tp); }
    cicloBolsa = CICLO_BOLSA / velTipo.trader;
    nObreros = state.honguitos.obrero || 0;
    contam = state.contam || 0;
    nMagos = state.honguitos.mago || 0;
    nMineros = state.honguitos.minero || 0;
    dungeonFlag = !!state.flags?.dungeon;
    cristalesN = state.dungeon?.cristales || 0;
    luzDt = dtG;
    mercInfo = state.dungeon?.merc || {};
    sincronizarMercs(dtG);
    procesarArcano(dtG);
    defCupula = nivelDef(state, "def_cupula");
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
      if (v.tipo === "cristalero") { actualizarCristalero(v, dt); continue; }
      if (v.tipo === "maestro") { actualizarMaestro(v, dt); continue; }
      if (v.tipo === "obrero") { actualizarObrero(v, dt); continue; }
      if (v.tipo === "cientifico") { actualizarCientifico(v, dt); continue; }
      if (v.tipo === "mago") { actualizarMago(v, dt); continue; }
      if (v.tipo === "minero") { actualizarMinero(v, dt); continue; }
      if (v.tipo === "soldado") { actualizarSoldado(v, dt); continue; }
      v.alfa = Math.min(1, v.alfa + dt * 2.5);
      v.animT += dt;
      v.hop = 0;
      v.estira = 0;
      // Honguito básico = cargador: va a una pila de esporas sueltas, junta un manojo (que crece sobre su cabeza)
      // y lo lleva al hongo madre. El modelo de la economía es agregado (ver engine.js); esto lo representa.
      if (v.modo === "idle") {
        v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
        v.espera -= dt;
        if (v.espera <= 0) {
          if (hayPila && Math.random() < 0.9 * util) {
            v.meta = elegirSitio(sitiosPila) + (Math.random() - 0.5) * 8;
            v.dir = Math.sign(v.meta - v.x) || 1;
            v.carga = 0;
            v.modo = "ir";
          } else if (Math.random() < 0.2) {
            v.modo = "salto"; v.animT = 0;
          } else {
            const meta = clamp(v.x + (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 70), LIM0() + 12, LIM1() - 12);
            v.meta = meta;
            v.dir = Math.sign(meta - v.x) || 1;
            v.modo = "walk";
          }
        }
      } else if (v.modo === "walk" || v.modo === "ir" || v.modo === "vuelve") {
        const rapido = v.modo === "walk" ? 1 : LI.vel / VEL * 1.6; // los cargadores caminan al ritmo del modelo (con mejoras de zancada)
        v.hop = Math.abs(Math.sin(v.animT * 11)) * (v.carga > 0 ? 1 : 1.5);
        const d = v.meta - v.x;
        const paso = VEL * dt * rapido;
        if (Math.abs(d) <= paso) {
          v.x = v.meta;
          if (v.modo === "ir") { v.modo = "juntar"; v.tJuntar = 0; }
          else if (v.modo === "vuelve") { v.modo = "dar"; v.tDar = 0; }
          else { v.modo = "idle"; v.espera = Math.random() < 0.3 ? 0.4 : 1 + Math.random() * 3; }
        } else v.x += Math.sign(d) * paso;
      } else if (v.modo === "juntar") {
        v.tJuntar += dt;
        const dur = Math.max(0.3, LI.recoger * 0.7);
        const u = clamp(v.tJuntar / dur, 0, 1);
        v.estira = -Math.abs(Math.sin(v.tJuntar * 14)) * 1.5; // se agacha a juntar
        v.carga = Math.max(1, Math.round(manojoVisual(LI.carga) * u));
        if (u >= 1) {
          v.meta = madre.x + (v.i % 2 ? -1 : 1) * (mHalf * 0.2 + (v.i % 5) * 3);
          v.dir = Math.sign(v.meta - v.x) || 1;
          v.modo = "vuelve";
        }
      } else if (v.modo === "dar") {
        v.tDar += dt;
        v.hop = Math.abs(Math.sin(v.tDar * 8)) * 2;
        if (v.tDar > 0.6) {
          const k = Math.min(v.carga, 5); // del manojo salen volando varias esporas al sombrero
          for (let j = 0; j < k; j++) cola.push({ t: j * 0.07, fn: () => volarAMadre(v.x, groundY - 14 - HH, PALETA[(v.i + j) % PALETA.length]) });
          v.carga = 0;
          v.modo = "idle";
          v.espera = hayPila ? 0.15 + Math.random() * 0.6 : 0.5;
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
          motas(p.x1, p.y1, 1, 0.3, p.col);
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

  // El hongo madre es lo más caro de dibujar (decenas de miles de rectángulos por cuadro cuando está enorme).
  // Se arma en dos lienzos: la geometría (sombrero, manchas, tallo) solo se vuelve a pintar cuando cambia, y
  // encima las luces, que fluyen despacio, a ~20 cuadros por segundo. En cada cuadro solo se copia el resultado.
  const mkCache = () => ({ cv: document.createElement("canvas"), t: -9, clave: "" });
  const geoMadre = mkCache(), luzMadre = mkCache(), brilloMadre = mkCache();
  const CACHE_MADRE_DT = 0.05;
  function lienzoCache(c, x0, y0, w, h) {
    const pw = Math.ceil(w * K), ph = Math.ceil(h * K);
    if (c.cv.width !== pw || c.cv.height !== ph) { c.cv.width = pw; c.cv.height = ph; } // cambiar el tamaño es caro: solo si hace falta
    const gc = c.cv.getContext("2d");
    gc.setTransform(1, 0, 0, 1, 0, 0);
    gc.clearRect(0, 0, pw, ph);
    gc.setTransform(K, 0, 0, K, -x0 * K, -y0 * K);
    gc.imageSmoothingEnabled = false;
    gc.globalAlpha = 1;
    return gc;
  }
  function dibujarMadre() {
    const m = medidas(), cx = Math.round(madre.x), rx = Math.round(m.w / 2), mitad = Math.round(m.sw / 2);
    const x0 = cx - Math.ceil(rx * 1.6) - 8, y0 = groundY - m.sh - Math.ceil(m.ch * 1.7) - 8;
    const w = cx + Math.ceil(rx * 1.6) + 8 - x0, h = groundY + 4 - y0;
    // el apretón del pulso y el brillo no se vuelven a pintar: se aplican al copiar el lienzo (los honguitos pulsan al hongo todo el tiempo)
    const sq = Math.round(madre.pulso * Math.max(3, m.ch * 0.06)), br = madre.brillo;
    const claveGeo = [x0, y0, w, h, K, m.w, m.ch, m.sh, m.sw, coloresMadre.join()].join("|");
    if (claveGeo !== geoMadre.clave) {
      geoMadre.clave = claveGeo;
      const gAntes = g;
      g = lienzoCache(geoMadre, x0, y0, w, h);
      try {
        const capBase = groundY - m.sh, ch = m.ch;
        hongoBase(cx, m, 0, 0);
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
          const dx = (k % 2 ? 1 : -1) * (mitad + 5 + k * 3);
          g.fillRect(cx + dx, groundY - 2, 1, 2);
          g.fillRect(cx + dx + 1, groundY - 1, 1, 1);
        }
      } finally { g = gAntes; }
      brilloMadre.ver = (brilloMadre.ver || 0) + 1;
      g = lienzoCache(brilloMadre, x0, y0, w, h); // silueta blanca del sombrero para el brillo del pulso
      try { semi(cx, groundY - m.sh, rx, m.ch, BLANCO, 1); } finally { g = gAntes; }
    }
    const c = luzMadre;
    if (c.clave !== claveGeo || t - c.t >= CACHE_MADRE_DT || t < c.t) {
      const dtLuz = Math.min(0.25, Math.max(0.001, t - c.t)), luzAntes = luzDt, gAntes = g;
      c.clave = claveGeo; c.t = t; c.ver = (c.ver || 0) + 1;
      const gc = lienzoCache(c, x0, y0, w, h);
      gc.drawImage(geoMadre.cv, x0, y0, w, h);
      g = gc; luzDt = dtLuz;
      try { lucesMadre(cx, groundY - m.sh, rx, m.ch, mitad); } finally { g = gAntes; luzDt = luzAntes; }
    }
    const capBase = groundY - m.sh, k = (m.ch - sq) / m.ch, corte = capBase - y0;
    if (glv && glv.cabe(c.cv)) { // WebGL: los lienzos cacheados son texturas; el apretón del pulso corta la textura en dos sprites
      const corteK = Math.round(corte * K);
      const poner = (clave, cv, ver, alfa) => {
        if (k > 0.999) glv.sprite(clave, cv, ver, x0, y0, w, h, null, alfa);
        else {
          glv.sprite(clave + "a", cv, ver, x0, capBase - corte * k, w, corte * k, [0, 0, cv.width, corteK], alfa);
          glv.sprite(clave + "b", cv, ver, x0, capBase, w, h - corte, [0, corteK, cv.width, cv.height - corteK], alfa);
        }
      };
      poner("madre", c.cv, c.ver || 0, 1);
      if (br > 0.02) poner("madreB", brilloMadre.cv, brilloMadre.ver || 0, br * 0.35);
      return;
    }
    const copiar = (cv) => {
      if (k > 0.999) { blitR(cv, 0, 0, cv.width, cv.height, x0, y0, w, h); return; }
      blitR(cv, 0, 0, cv.width, corte * K, x0, capBase - corte * k, w, corte * k); // lo de arriba se aplasta contra el tronco
      blitR(cv, 0, corte * K, cv.width, cv.height - corte * K, x0, capBase, w, h - corte);
    };
    copiar(c.cv);
    if (br > 0.02) { const a = g.globalAlpha; g.globalAlpha = a * br * 0.35; copiar(brilloMadre.cv); g.globalAlpha = a; }
  }

  // Luces y color del hongo madre. Con cada edificio se suma un color: los colores se funden entre sí
  // (campo suave que fluye), patrones de luz que se turnan (ola, anillos, rayos), todos los contornos
  // del hongo se iluminan y hay esporas de colores que aparecen y se apagan, más cerca del hongo.
  const esporasLuz = [];
  const luzCv = document.createElement("canvas"), luzCtx = luzCv.getContext("2d");
  let luzImg = null;
  function lucesMadre(cx, capBase, rx, ch, mitad) {
    const cols = coloresMadre, n = cols.length;
    // paleta que se funde: 96 pasos a lo largo del ciclo de colores
    const LUT = [];
    for (let k = 0; k < 96; k++) {
      const pos = (k / 96) * n, i = Math.floor(pos);
      LUT.push(n === 1 ? cols[0] : mezcla(cols[i % n], cols[(i + 1) % n], pos - i));
    }
    const pal = (fase) => LUT[Math.floor((((fase / n) % 1) + 1) % 1 * 96) % 96];
    const fuerza = Math.min(1, 0.35 + n * 0.12);
    // relleno del sombrero: campo de color que fluye + patrón de luz que va cambiando
    const cs = Math.max(2, Math.round(rx / 42));
    const modo = Math.floor(t / 7) % 3, env = Math.pow(Math.sin(Math.PI * ((t % 7) / 7)), 0.6);
    const cy0 = capBase - ch * 0.3;
    // el campo de color son celdas de cs×cs: se calcula en una imagen chica y se agranda de una vez (una sola llamada de dibujo)
    const Wd = Math.ceil((2 * rx) / cs) + 1, Hd = Math.max(1, Math.ceil((ch - 1) / cs));
    if (luzCv.width !== Wd || luzCv.height !== Hd || !luzImg) { luzCv.width = Wd; luzCv.height = Hd; luzImg = luzCtx.createImageData(Wd, Hd); }
    const px = luzImg.data;
    const rgb = LUT.map((hx) => [parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16)]);
    for (let jj = 0; jj < Hd; jj++) {
      const dy = jj * cs, fila = Hd - 1 - jj;
      const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ch) ** 2))) - 2;
      for (let ii = 0; ii < Wd; ii++) {
        const x = -rx + ii * cs, o = (fila * Wd + ii) * 4;
        if (w < 2 || x < -w || x >= w) { px[o + 3] = 0; continue; }
        const u = x / rx, v = dy / ch;
        const fase = u * 0.9 + v * 0.8 + t * 0.22 + 0.6 * Math.sin(t * 0.35 + v * 3 + u * 2);
        let luz = 0;
        if (modo === 0) luz = Math.max(0, 1 - Math.abs(u + v * 0.7 - (((t * 0.13) % 1) * 3 - 1.3)) / 0.28);
        else if (modo === 1) { const r = Math.hypot(x, (capBase - dy) - cy0) / rx; luz = Math.max(0, 1 - Math.abs(r - ((t * 0.11) % 1) * 1.5) / 0.14); }
        else luz = Math.pow(0.5 + 0.5 * Math.sin(Math.atan2(cy0 - (capBase - dy), x) * 5 + t * 1.1), 3) * 0.7 * (1 - v * 0.4);
        const a1 = (0.1 + 0.22 * fuerza) * (0.8 + 0.2 * Math.sin(t + u * 4)), a2 = luz > 0.04 ? luz * env * 0.38 * fuerza : 0;
        const c = rgb[Math.floor((((fase / n) % 1) + 1) % 1 * 96) % 96];
        const A = a2 + a1 * (1 - a2); // color de la celda con un destello blanco encima
        px[o] = (255 * a2 + c[0] * a1 * (1 - a2)) / A; px[o + 1] = (255 * a2 + c[1] * a1 * (1 - a2)) / A; px[o + 2] = (255 * a2 + c[2] * a1 * (1 - a2)) / A; px[o + 3] = A * 255;
      }
    }
    luzCtx.putImageData(luzImg, 0, 0);
    g.globalAlpha = 1;
    g.drawImage(luzCv, cx - rx, capBase - 3 - (Hd - 1) * cs, Wd * cs, Hd * cs);
    // todos los contornos se iluminan: borde del sombrero, tallo y bordes de la base
    g.globalAlpha = 0.5 + 0.4 * fuerza;
    for (let dy = 0; dy < ch; dy++) {
      const w1 = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ch) ** 2))), w2 = Math.round(rx * Math.sqrt(Math.max(0, 1 - ((dy + 1) / ch) ** 2)));
      const ancho = Math.max(1, w1 - w2 + 1), y = capBase - dy - 1;
      g.fillStyle = pal(dy / ch * 0.9 + t * 0.4);
      g.fillRect(cx - w1, y, ancho, 1);
      g.fillStyle = pal(1.5 - dy / ch * 0.9 + t * 0.4);
      g.fillRect(cx + w1 - ancho, y, ancho, 1);
    }
    for (let i = 0; i < rx * 2; i += 1) { g.fillStyle = pal(i / (rx * 2) * 1.6 + t * 0.4 + 0.5); g.fillRect(cx - rx + i, capBase - 1, 1, 1); }
    for (let y = capBase + 1; y < groundY; y++) {
      const flare = groundY - y <= 3 ? 3 - (groundY - y) + 1 : 0, wt = mitad + flare;
      g.fillStyle = pal((y - capBase) / Math.max(1, groundY - capBase) * 0.9 + t * 0.4 + 0.2);
      g.fillRect(cx - wt, y, 1, 1); g.fillRect(cx + wt - 1, y, 1, 1);
    }
    // el tronco también respira color por dentro (bandas verticales muy suaves)
    g.globalAlpha = 0.04 + 0.05 * fuerza;
    for (let y = capBase + 3; y < groundY - 1; y += 3) { g.fillStyle = pal((y - capBase) * 0.035 - t * 0.3); g.fillRect(cx - mitad + 1, y, mitad * 2 - 2, 3); }
    g.globalAlpha = 1;
    // esporas de luz alrededor: aparecen, brillan y se apagan; hay más (y más cerca) cuantos más colores
    const meta = Math.min(90, 14 + n * 8);
    while (esporasLuz.length < meta) esporasLuz.push({ dur: 0, t: 0 });
    esporasLuz.length = Math.min(esporasLuz.length, meta);
    for (const e of esporasLuz) {
      e.t += luzDt;
      if (e.t >= e.dur) {
        const zona = Math.random(), cerca = Math.pow(Math.random(), 2.2); // más densas pegadas al hongo
        if (zona < 0.6) { const a = -0.12 * Math.PI + Math.random() * 1.24 * Math.PI, d = 1 + cerca * 0.5; e.x = cx + Math.cos(a) * rx * d; e.y = capBase - 2 - Math.sin(a) * ch * d; }
        else if (zona < 0.85) { const a = Math.random() * Math.PI, d = Math.random() * 0.9; e.x = cx + Math.cos(a) * rx * d; e.y = capBase - 3 - Math.sin(a) * ch * d; }
        else { const lado = Math.random() < 0.5 ? -1 : 1; e.x = cx + lado * (mitad + 2 + cerca * mitad * 2.5); e.y = capBase + 3 + Math.random() * Math.max(1, groundY - capBase - 6); }
        e.vx = (Math.random() - 0.5) * 3; e.vy = -1 - Math.random() * 3;
        e.dur = 1.4 + Math.random() * 2.4; e.t = 0; e.col = cols[Math.floor(Math.random() * n)]; e.r = Math.random() < 0.25 ? 2 : 1; e.int = 0.6 + 0.4 * (1 - cerca);
      }
      e.x += e.vx * luzDt; e.y += e.vy * luzDt;
      const k = Math.sin(Math.PI * (e.t / e.dur)) ** 2 * e.int;
      g.globalAlpha = 0.16 * k; disco(Math.round(e.x), Math.round(e.y), 3 + e.r, e.col);
      g.globalAlpha = Math.min(1, 1.1 * k); g.fillStyle = e.col; g.fillRect(Math.round(e.x), Math.round(e.y), e.r, e.r);
      if (k > 0.55) { g.fillStyle = "#fff"; g.fillRect(Math.round(e.x), Math.round(e.y), 1, 1); }
    }
    g.globalAlpha = 1;
  }

  // Edificios: hongo con decoración propia en el sombrero y en el tallo.
  // Cada edificio se pinta en su propio lienzo a ~20 cuadros por segundo y entre medio solo se copia
  // (así se piden muchísimas menos operaciones de dibujo a la placa de video).
  const cachesEdif = {};
  function dibujarEdificioCache(id, x) {
    const m = tam(id), cx = Math.round(x), c = cachesEdif[id] || (cachesEdif[id] = mkCache());
    const x0 = cx - Math.ceil(m.w / 2) - 40, y0 = groundY - m.sh - m.ch - 70, w = Math.ceil(m.w) + 80, h = groundY + 8 - y0;
    if (!visibleRect(x0, y0, w, h)) return;
    const clave = [id, x0, y0, w, h, K, m.sw, semilla].join("|");
    if (clave !== c.clave || t - c.t >= CACHE_MADRE_DT || t < c.t) {
      c.clave = clave; c.t = t; c.ver = (c.ver || 0) + 1;
      const gAntes = g;
      g = lienzoCache(c, x0, y0, w, h);
      try { dibujarEdificio(id, x); } finally { g = gAntes; }
    }
    if (glv && glv.cabe(c.cv)) glv.sprite("ed:" + id, c.cv, c.ver, x0, y0, w, h);
    else blitR(c.cv, 0, 0, c.cv.width, c.cv.height, x0, y0, w, h);
  }
  // El cuerpo de cada edificio (sombrero, manchas, tallo) casi nunca cambia: se pinta una vez por variante y se copia.
  const cacheCuerpoEd = new Map();
  function cuerpoEdificio(id, cx, m, col, brillo) {
    const rx = Math.round(m.w / 2), capBase = groundY - m.sh, ch = m.ch, mitad = Math.round(m.sw / 2);
    const br = Math.round(brillo * 8) / 8;
    const clave = [id, m.w, m.ch, m.sh, m.sw, br, semilla, K, m.nivel].join("|");
    const bx = cx - rx - 6, by = capBase - ch - 6, bw = rx * 2 + 12, bh = groundY + 4 - by;
    let c = cacheCuerpoEd.get(clave);
    if (!c) {
      if (cacheCuerpoEd.size > 120) cacheCuerpoEd.clear();
      const cv = document.createElement("canvas");
      cv.width = Math.ceil(bw * K); cv.height = Math.ceil(bh * K);
      const gc = cv.getContext("2d");
      gc.setTransform(K, 0, 0, K, -bx * K, -by * K);
      gc.imageSmoothingEnabled = false;
      const antes = g;
      g = gc;
      try {
    hongoBase(cx, m, 0, br, col, col);
    manchasDe(id + ":" + semilla, (id === "conservatorio" ? 5 : id === "vivero" ? 11 : id === "gimnasio" ? 23 : id === "trade" ? 37 : id === "astropuerto" ? 53 : id === "escuela" ? 71 : id === "universidad" ? 97 : id === "torre" ? 101 : 89) + semilla, 7 + m.nivel * 2).forEach((q) => {
      const c2 = q.v < 0.5 ? mezcla(col, "#ffffff", 0.35) : mezcla(col, "#000000", 0.45);
      manchaCap(cx, capBase, rx, ch, cx + Math.round(q.u * rx), capBase - 2 - Math.round(q.h * ch), Math.max(1, Math.round(ch * q.f * 0.7)), c2, false);
    });
      } finally { g = antes; }
      c = { cv };
      cacheCuerpoEd.set(clave, c);
    }
    g.drawImage(c.cv, bx, by, bw, bh);
    return { capBase, ch, rx, mitad };
  }
  function dibujarEdificio(id, x, alfa = 1) {
    const m = tam(id);
    const cx = Math.round(x);
    g.globalAlpha = alfa;
    const col = EDIFICIOS[id].color;
    const { capBase, ch, rx, mitad } = cuerpoEdificio(id, cx, m, col, brillos[id] || 0);
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
    } else if (id === "cristaleria") {
      // un gran hongo-cristal en la copa con un halo que respira, y facetas claras en el sombrero
      const pulso = 0.5 + 0.5 * Math.sin(t * 2.2);
      g.globalAlpha = 0.14 + 0.1 * pulso; disco(cx, capBase - ch - 4, 14, "#5ef2ff"); g.globalAlpha = 1;
      g.drawImage(spritesCristal[0], cx - 7, capBase - ch - 17, 14, 17);
      g.drawImage(spritesCristal[1], cx - 15, capBase - ch - 9, 8, 10);
      g.drawImage(spritesCristal[4], cx + 8, capBase - ch - 8, 7, 9);
      g.fillStyle = "#bff7f0";
      for (const [a, b] of [[-0.6, 0.45], [0.1, 0.7], [0.55, 0.35]]) { const px = cx + Math.round(a * rx), py = capBase - 2 - Math.round(b * ch); g.fillRect(px, py - 1, 1, 3); g.fillRect(px - 1, py, 3, 1); }
      // portón en arco con luz fría y un banco de talla al costado
      g.fillStyle = "#14243a"; g.fillRect(cx - 3, groundY - 8, 7, 7); g.fillRect(cx - 2, groundY - 9, 5, 1);
      g.fillStyle = col; g.fillRect(cx - 3, groundY - 8, 1, 7); g.fillRect(cx + 3, groundY - 8, 1, 7); g.fillRect(cx - 2, groundY - 9, 5, 1);
      g.fillStyle = "#5a6a8a"; g.fillRect(cx + mitad + 3, groundY - 4, 8, 3); g.fillRect(cx + mitad + 4, groundY - 6, 3, 2);
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
    } else if (id === "barraca") {
      // estandarte en lo alto, escudos en el sombrero, portón con rastrillo y empalizada de estacas a los costados
      g.fillStyle = "#6a4a2a"; g.fillRect(cx, capBase - ch - 11, 1, 11);
      const on = Math.floor(t * 4) % 2;
      g.fillStyle = "#e8362f"; g.fillRect(cx + 1, capBase - ch - 11, 7, 4); g.fillRect(cx + 1 + on, capBase - ch - 7, 5, 1);
      g.fillStyle = "#ffd23f"; g.fillRect(cx + 3, capBase - ch - 10, 2, 2);
      [[-12, 8], [0, 12], [12, 8]].forEach(([dx, dy]) => { g.fillStyle = "#d8d8ec"; g.fillRect(cx + dx - 2, capBase - dy - 3, 5, 5); g.fillStyle = col; g.fillRect(cx + dx - 1, capBase - dy - 2, 3, 3); g.fillStyle = "#fff"; g.fillRect(cx + dx, capBase - dy - 3, 1, 5); });
      g.fillStyle = "#3a2410"; g.fillRect(cx - 4, groundY - 10, 9, 10);
      g.fillStyle = "#8a8aa8"; for (let k = 0; k < 4; k++) g.fillRect(cx - 4 + k * 3, groundY - 10, 1, 8); for (const yy of [groundY - 8, groundY - 4]) g.fillRect(cx - 4, yy, 9, 1);
      for (const lado of [-1, 1]) for (let k = 0; k < 4; k++) { const sx = cx + lado * (mitad + 4 + k * 3); g.fillStyle = "#8a5a2a"; g.fillRect(sx, groundY - 8, 2, 8); g.fillStyle = "#c28a4f"; g.fillRect(sx, groundY - 9, 2, 1); }
    } else if (id === "taberna") {
      // pendón en lo alto, cartel colgante con una jarra, ventanas cálidas, puerta doble y barriles
      g.fillStyle = "#8a5a2a"; g.fillRect(cx, capBase - ch - 9, 1, 9);
      g.fillStyle = "#e8362f"; g.fillRect(cx + 1, capBase - ch - 9, 6, 1); g.fillRect(cx + 1, capBase - ch - 8, 5, 1); g.fillRect(cx + 1, capBase - ch - 7, 3, 1);
      const sx = cx + mitad + 3;
      g.fillStyle = "#6a4a2a"; g.fillRect(cx + mitad, capBase + 3, 7, 1); g.fillRect(sx + 1, capBase + 4, 1, 2); g.fillRect(sx + 6, capBase + 4, 1, 2);
      g.fillStyle = "#c28a4f"; g.fillRect(sx, capBase + 6, 9, 8);
      g.fillStyle = "#8a5a2a"; g.fillRect(sx, capBase + 6, 9, 1); g.fillRect(sx, capBase + 13, 9, 1);
      g.fillStyle = "#fff"; g.fillRect(sx + 2, capBase + 7, 4, 2); g.fillStyle = "#ffd23f"; g.fillRect(sx + 2, capBase + 9, 4, 4); g.fillStyle = "#fff"; g.fillRect(sx + 6, capBase + 9, 1, 3);
      const cal = Math.floor(t * 2.5) % 5 === 0 ? "#fff6a8" : "#ffd23f";
      g.fillStyle = cal; g.fillRect(cx - mitad + 2, capBase + 5, 3, 3); g.fillRect(cx - mitad + 2, capBase + 9, 3, 3);
      g.fillStyle = "#3a2410"; g.fillRect(cx - 3, groundY - 9, 7, 9); g.fillStyle = "#8a5a2a"; g.fillRect(cx - 4, groundY - 9, 1, 9); g.fillRect(cx + 4, groundY - 9, 1, 9); g.fillRect(cx - 4, groundY - 10, 9, 1); g.fillRect(cx, groundY - 9, 1, 9);
      const bx = cx - mitad - 9;
      for (let k = 0; k < 2; k++) { g.fillStyle = "#8a5a2a"; g.fillRect(bx + k * 6, groundY - 7, 5, 7); g.fillStyle = "#4a3320"; g.fillRect(bx + k * 6, groundY - 5, 5, 1); g.fillRect(bx + k * 6, groundY - 2, 5, 1); }
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
  const cacheLuna = { cv: document.createElement("canvas"), t: -9, clave: "" };
  function dibujarLunaCache() {
    const L = geomLuna(), x0 = Math.floor(L.x - L.r) - 14, y0 = Math.floor(L.y - L.r) - 14, w = Math.ceil(L.r * 2) + 28, h = w;
    if (!visibleRect(x0, y0, w, h)) return;
    const c = cacheLuna, clave = [x0, y0, w, K].join("|");
    if (clave !== c.clave || t - c.t >= 0.1 || t < c.t) { // la luna cambia despacio: 10 cuadros por segundo alcanzan
      c.clave = clave; c.t = t;
      const gAntes = g;
      g = lienzoCache(c, x0, y0, w, h);
      try { dibujarLuna(); } finally { g = gAntes; }
    }
    blitR(c.cv, 0, 0, c.cv.width, c.cv.height, x0, y0, w, h);
  }
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

  // ---- Logística: pilas de esporas sueltas y manojos que cargan los básicos ----
  let nPila = 0; // esporas sueltas en el piso (las informa el motor)
  const manojoVisual = (carga) => clamp(Math.round(1.8 * Math.log2(Math.max(1, carga)) + 0.5), 1, 14); // cuántas esporas se ven en el manojo
  // ---- Montañas de esporas ----
  // Cada lugar que suelta esporas (el hongo madre por los toques, y cada edificio con honguitos productores) acumula su propia
  // montaña detrás: crece con las esporas que no se alcanzan a llevar. Al llegar a la mitad de la pantalla colapsa y el piso se la traga.
  const montes = {}; // sitio -> { h (alto visual en celdas), colapso: { t, h0 } | null, spr, key }
  let montesDatos = []; // [{ id, n, cmax }] (del motor)
  const DUR_COLAPSO = 2.8;
  const easeM = (u) => u * u * (3 - 2 * u);
  const monteDe = (id) => montes[id] || (montes[id] = { h: 0, colapso: null, spr: null, key: "" });
  function posMonte(id) {
    if (id === "madre") return { x: madre.x, ancho: medidas().w * 0.6, color: null };
    const e = edif[id];
    return e ? { x: e.x, ancho: tam(id).w * 0.7, color: EDIFICIOS[id].color } : null;
  }
  const hashM = (a, b, c) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35) ^ Math.imul(c + 0x165667b1, 0x27d4eb2f); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); return ((h ^ (h >>> 12)) >>> 0) / 4294967296; };
  const rgbDe = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  // silueta de montaña hecha de granitos de espora (a bloques de 2x2), con el borde y la cumbre más claros
  function spriteMonte(id, H, W, color) {
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const x = cv.getContext("2d"), img = x.createImageData(W, H), d = img.data;
    const paleta = color
      ? [mezcla(color, "#ffffff", 0.45), color, mezcla(color, "#000000", 0.25), mezcla(color, "#000000", 0.5)].map(rgbDe)
      : ["#ff6fb5", "#2eaaf5", "#b5e61d", "#ff5a14", "#3fe08a", "#fadc28"].map(rgbDe);
    const semilla = id.length * 131 + H;
    for (let py = 0; py < H; py++) {
      const u = (py + 0.5) / H, hw = (W / 2) * Math.pow(u, 0.9);
      for (let px = 0; px < W; px++) {
        const dx = Math.abs(px + 0.5 - W / 2);
        if (dx > hw) continue;
        const o = (py * W + px) * 4, r = hashM(px >> 1, py >> 1, semilla);
        let c;
        if (color) c = r < 0.1 ? paleta[0] : r < 0.55 ? paleta[1] : r < 0.85 ? paleta[2] : paleta[3];
        else c = paleta[Math.floor(r * 6) % 6].map((v) => Math.round(v * (0.6 + 0.4 * hashM(px >> 1, py >> 1, semilla + 7))));
        if (dx > hw - 1.6 || py < 2) c = color ? paleta[0] : [255, 255, 255]; // borde y cumbre claros
        else if (py > H - 3) c = c.map((v) => Math.round(v * 0.7));
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    return cv;
  }
  function actualizarMontes(dt, state) {
    montesDatos = logiSitios(state);
    for (const e of logiEventos.splice(0)) { // el motor avisa: esta montaña llegó al tope y colapsa
      const m = monteDe(e.sitio), p = posMonte(e.sitio);
      if (m.h > 1 && p && !m.colapso) { m.colapso = { t: 0, h0: m.h }; aroPart(p.x, groundY - 1, p.ancho * 1.3, 0.9); flash = Math.max(flash, 0.12); }
    }
    const alto = Hc * 0.5; // la montaña llena llega a la mitad de la pantalla
    for (const d of montesDatos) {
      const m = monteDe(d.id), p = posMonte(d.id);
      if (!p) continue;
      if (m.colapso) {
        m.colapso.t += dt;
        const u = Math.min(1, m.colapso.t / DUR_COLAPSO);
        m.h = m.colapso.h0 * (1 - easeM(u));
        if (m.h > 2 && Math.random() < dt * 70) { // el polvo y los granitos se hunden en el piso
          const hw = (m.h / 2 + p.ancho / 2) * 0.9;
          part(p.x + (Math.random() - 0.5) * hw * 2, groundY - Math.random() * m.h * 0.9, (Math.random() - 0.5) * 10, 8 + Math.random() * 26, { tipo: "mota", dur: 0.5 + Math.random() * 0.4, col: p.color || PALETA[Math.floor(Math.random() * 6)], r: Math.random() < 0.4 ? 2 : 1 });
        }
        if (u >= 1) { m.colapso = null; m.h = 0; aroPart(p.x, groundY - 1, p.ancho * 0.8, 0.5); }
      } else {
        const objetivo = d.n >= 0.5 ? Math.max(2, Math.pow(Math.min(1, d.n / d.cmax), 0.7) * alto) : 0;
        m.h += (objetivo - m.h) * Math.min(1, dt * 2.5);
        if (Math.abs(objetivo - m.h) < 0.25) m.h = objetivo;
      }
    }
  }
  function dibujarMontes() {
    for (const d of montesDatos) {
      const m = montes[d.id], p = posMonte(d.id);
      if (!m || !p || m.h < 1) continue;
      const alto = Math.max(2, Math.round(m.h)), paso = Math.max(2, Math.round(alto * 0.08)), Hq = Math.max(2, Math.round(alto / paso) * paso);
      const W = Math.round(Hq * 2.2 + p.ancho), clave = d.id + "|" + Hq + "|" + W;
      if (m.key !== clave) { m.spr = spriteMonte(d.id, Hq, W, p.color); m.key = clave; }
      const u = m.colapso ? easeM(Math.min(1, m.colapso.t / DUR_COLAPSO)) : 0, dw = Math.round(W * (1 + 0.25 * u));
      if (!visibleRect(p.x - dw / 2, groundY - alto, dw, alto)) continue;
      g.globalAlpha = 1 - 0.4 * u;
      g.drawImage(m.spr, Math.round(p.x - dw / 2), groundY - alto + 1, dw, alto);
      g.globalAlpha = 1;
    }
  }
  // lugares donde los básicos van a juntar esporas (al pie de cada montaña), con su peso
  function sitiosDePila() {
    const out = [];
    for (const d of montesDatos) {
      const p = posMonte(d.id);
      if (!p) continue;
      out.push({ x: d.id === "madre" ? madre.x + (Math.random() < 0.5 ? -1 : 1) * (medidas().w * 0.2 + 6) : p.x + (Math.random() < 0.5 ? -1 : 1) * (tam(d.id).w / 2 + 4), w: d.n + 1 });
    }
    if (!out.length) out.push({ x: madre.x + 16, w: 1 });
    return out;
  }
  const elegirSitio = (lista) => { let r = Math.random() * lista.reduce((t, q) => t + q.w, 0); for (const q of lista) { r -= q.w; if (r < 0) return q.x; } return lista[0].x; };
  const colorDeDot = (i) => PALETA[(i * 5 + 2) % (PALETA.length - 1)]; // sin el blanco
  const spritesManojo = Array.from({ length: 15 }, (_, k) => {
    if (!k) return null;
    const caps = [4, 4, 3, 2, 1], cv = document.createElement("canvas");
    let filas = 0, resto = k;
    for (const c of caps) { if (resto <= 0) break; resto -= c; filas++; }
    cv.width = 10; cv.height = filas * 2 + 1;
    const x = cv.getContext("2d");
    let i = 0;
    for (let r = 0; r < filas && i < k; r++) {
      const w = Math.min(caps[r], k - i);
      for (let c = 0; c < w; c++, i++) { x.fillStyle = colorDeDot(i + 1); x.fillRect(5 - w + c * 2, cv.height - (r + 1) * 2, 2, 2); x.fillStyle = "#ffffff55"; x.fillRect(5 - w + c * 2, cv.height - (r + 1) * 2, 1, 1); }
    }
    return cv;
  });

  const cacheCuerpo = new Map(); // sprite -> (variante -> lienzo)
  function cuerpoHonguito(spr, lun, alto, espejo) {
    let porSprite = cacheCuerpo.get(spr);
    if (!porSprite) { porSprite = new Map(); cacheCuerpo.set(spr, porSprite); }
    const clave = (lun.id ?? -1) + "|" + alto + "|" + (espejo ? 1 : 0);
    let cv = porSprite.get(clave);
    if (!cv) {
      cv = document.createElement("canvas");
      cv.width = HW; cv.height = alto;
      const c = cv.getContext("2d");
      if (espejo) { c.translate(HW, 0); c.scale(-1, 1); }
      c.drawImage(spr, 0, 0, HW, alto);
      c.fillStyle = BLANCO; // lunares blancos sobre el sombrero (acompañan el estiramiento del salto)
      const esc = alto / HH;
      for (const [lx, ly] of lun) c.fillRect(lx, Math.round(ly * esc), 1, Math.max(1, Math.round(esc)));
      porSprite.set(clave, cv);
    }
    return cv;
  }
  const cacheEspejo = new Map();
  const espejado = (spr) => {
    let c = cacheEspejo.get(spr);
    if (!c) { c = document.createElement("canvas"); c.width = spr.width; c.height = spr.height; const x = c.getContext("2d"); x.translate(spr.width, 0); x.scale(-1, 1); x.drawImage(spr, 0, 0); cacheEspejo.set(spr, c); }
    return c;
  };
  function dibujarHonguito(v) {
    if (v.oculto) return;
    if (v.tipo === "maestro" && v.hijos) {
      // alumnitos detrás del maestro
      for (const [j, k] of v.hijos.entries()) {
        const kx = Math.round(k.x), kb = Math.round(groundY - k.hop);
        g.globalAlpha = v.alfa;
        const kw = spritesKid[k.col].width;
        g.drawImage(k.dir < 0 ? espejado(spritesKid[k.col]) : spritesKid[k.col], k.dir < 0 ? kx - kw + 3 : kx - 3, kb - 6);
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
      : v.tipo === "jardinero" ? spritesJard[pose] : v.tipo === "atleta" ? spritesAtl[pose] : v.tipo === "cristalero" ? spritesCristalero[pose] : v.tipo === "mago" ? spritesMago[pose] : v.tipo === "minero" ? spritesMinero[pose] : v.tipo === "soldado" ? spritesSoldado[v.modo === "corre" ? (Math.floor(v.animT * 10) % 2) : pose] : v.tipo === "cientifico" ? spritesCient[pose] : v.tipo === "obrero" ? spritesObrero[pose] : v.tipo === "maestro" ? spritesMaestro[v.modo === "clase" ? (Math.floor(v.animT * 5) % 2 ? 2 : 3) : pose] : v.tipo === "astronauta" ? spritesAstro[pose] : v.tipo === "trader" ? spritesTrader[v.modo === "llama" ? (Math.floor(v.tLlama * 6) % 2 ? 2 : 3) : pose] : spritesHongo[pose];
    const alto = HH + Math.round(v.estira);
    const x = Math.round(v.x);
    g.globalAlpha = v.alfa;
    // el cuerpo (sprite + lunares, espejado si mira a la izquierda) se arma una vez por variante y se copia con una sola llamada
    g.drawImage(cuerpoHonguito(v.acidoT > 0 ? verde(spr) : spr, v.lunares, alto, v.dir < 0), v.dir < 0 ? x - HW + 4 : x - 4, base - alto);
    g.globalAlpha = 1;
    if (v.carga > 0) { const mj = spritesManojo[Math.min(14, v.carga)]; if (mj) g.drawImage(mj, x - 5, base - alto - mj.height + 1); } // el manojo de esporas sobre la cabeza
    if (v.tipo === "soldado") {
      // lanza al hombro y escudo redondo; al atacar embiste con la lanza
      const lx = x + v.dir * 5 + (v.modo === "ataca" ? v.dir * Math.round(Math.abs(Math.sin(v.animT * 14)) * 3) : 0);
      g.fillStyle = "#8a5a2a"; g.fillRect(lx, base - 15, 1, 15);
      g.fillStyle = "#d8d8ec"; g.fillRect(lx - 1, base - 18, 3, 3);
      g.fillStyle = "#6a4a2a"; g.fillRect(x - v.dir * 5 - 1, base - 7, 3, 5); g.fillStyle = "#c8c8dc"; g.fillRect(x - v.dir * 5, base - 6, 1, 3);
    }
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
    if (v.tipo === "cristalero") g.drawImage(spritesCristal[0], x - 2, base - alto - 7);
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

  // diagnóstico: ?off=madre,edif,hong,part,mina,luna,fondo,todo apaga partes del dibujo para ver cuál gasta placa de video
  const OFF = new Set((new URLSearchParams(location.search).get("off") || "").split(",").filter(Boolean));
  function draw() {
    if (OFF.has("todo")) return;
    g.setTransform(K, 0, 0, K, 0, 0);
    g.imageSmoothingEnabled = K < 1;
    g.globalAlpha = 1;
    g.clearRect(0, 0, Wc, Hc);
    g.fillStyle = BG;
    g.fillRect(0, 0, Wc, Hc);
    const oy = offY();
    if (oy < 0) { g.fillStyle = BG_SUELO; g.fillRect(0, groundY + oy, Wc, Hc); }
    if (!OFF.has("fondo")) g.drawImage(fondo, 0, oy, Wc, Hc);
    if (!OFF.has("fondo")) for (const gi of gigantes) {
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
    if (!OFF.has("luna")) dibujarLunaCache();
    dibujarNubes();
    if (!OFF.has("mina")) dibujarMina();
    dibujarMontes();
    if (glv) { // WebGL: lo de arriba queda en el lienzo de fondo; madre y edificios son sprites; lo que sigue va en el lienzo del frente
      g.restore();
      glv.inicio();
      g = gFrente;
      g.setTransform(K, 0, 0, K, 0, 0);
      g.imageSmoothingEnabled = K < 1;
      g.globalAlpha = 1;
      g.clearRect(0, 0, Wc, Hc);
      g.save();
      g.translate(offX(), oy);
    }
    if (!OFF.has("madre")) dibujarMadre();
    dibujarCristalesMadre();
    if (!OFF.has("edif")) for (const id in edif) if (!(colocando?.mover && colocando.id === id)) dibujarEdificioCache(id, edif[id].x);
    for (const v of torresV) dibujarTorre(v);
    dibujarCoheteEnVuelo();
    for (const b of brotes) {
      const falta = b.vida - b.t;
      if (falta < 1.5 && Math.floor(b.t * 8) % 2) continue;
      if (b.t < 0.25) { g.fillStyle = BLANCO; g.fillRect(b.x, groundY - 1, 1, 1); }
      else if (b.t < 0.5) { g.fillStyle = BLANCO; g.fillRect(b.x, groundY - 2, 1, 2); }
      else g.drawImage(spritesBrote[b.col], b.x - 2, groundY - 4);
    }
    if (!OFF.has("hong")) for (const v of visuales) dibujarHonguito(v);
    dibujarMercs();
    dibujarArcano();
    if (!OFF.has("part")) dibujarParticulas();
    dibujarEventos();
    if (colocando) { const px = xLibre(colocando.x, tam(colocando.id).w, obstaculos(altoEdif(colocando.id), false)); if (colocando.id === "torre_def") dibujarTorre({ x: px, t: { tipo: "basica", sold: 0 }, ang: -0.6, retro: 0 }, 0.55); else dibujarEdificio(colocando.id, px, 0.55); }
    g.restore();

    if (tormentaA > 0.005) { g.globalAlpha = tormentaA; g.fillStyle = "#7a3cc0"; g.fillRect(0, 0, Wc, Hc); g.globalAlpha = 1; }
    if (flash > 0.01) { g.globalAlpha = flash * 0.3; g.fillStyle = BLANCO; g.fillRect(0, 0, Wc, Hc); g.globalAlpha = 1; }
    if (glv) {
      g = gPrincipal;
      glv.fin({ fondo: lo, frente: loFrente, offX: offX(), offY: oy, S, Wc, Hc });
      return;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lo, 0, 0, Wc * S, Hc * S);
  }
  // activa el dibujo con WebGL (el lienzo de siempre queda invisible solo para recibir los toques)
  function activarGL(gl) {
    glv = gl;
    loFrente = document.createElement("canvas");
    gFrente = loFrente.getContext("2d");
    document.body.classList.add("gl");
    resize();
  }

  // ---------- toques ----------
  function toque(px, py) {
    const cx = (px * dpr) / S - offX();
    const cy = (py * dpr) / S - offY();
    for (const ev of cielo) if (Math.abs(cx - ev.x) < 9 && Math.abs(cy - evY(ev)) < 9) return { quien: "evento", ev };
    if (puertaT >= 0 && mina && edif.mina) {
      const n = mina.nodos[mina.puerta.nodo];
      if (Math.abs(cx - (edif.mina.x + n.x)) < 9 && cy > groundY + n.y - 20 && cy < groundY + n.y + 2) return { quien: "puerta" };
    }
    const eA = getEvento();
    if (eA && eA.tipo === "cristales") for (const c of eA.cris) {
      if (c.t < 0 || c.estado === "hecha" || c.estado === "rota") continue;
      if (Math.abs(cx - (madre.x + c.dx)) < 11 && cy > groundY - 22 && cy < groundY + 4) return { quien: "cristal", cristal: c };
    }
    if (eA && eA.tipo === "geiser") for (const gs of eA.geis) {
      if (Math.abs(cx - (madre.x + gs.dx)) < 9 && cy > groundY - 16 && cy < groundY + 4) return { quien: "geiser", geiser: gs };
    }
    if (eA && eA.tipo === "esporada") for (const sp of eA.esporasV) {
      if (sp.estado !== "cae" && sp.estado !== "suelo") continue;
      if (Math.abs(cx - espoX(sp)) < 9 && Math.abs(cy - espoY(sp)) < 11) return { quien: "espora", espora: sp };
    }
    if (eA && eA.tipo === "invasion") for (const c of eA.criaturas) {
      if (!c.vivo || c.ret > 0) continue;
      const r = c.tipo === "jefe" ? 14 : 10, yc = c.tipo === "murcielago" ? groundY - 14 - c.y : groundY - (c.tipo === "jefe" ? 12 : 8);
      if (Math.abs(cx - (madre.x + c.dx)) < r && Math.abs(cy - yc) < r + 6) return { quien: "criatura", c };
    }
    for (const v of torresV) if (Math.abs(cx - v.x) < 9 && cy > groundY - 36 && cy < groundY + 2) return { quien: "torre_def", i: v.i };
    if (eA && eA.tipo === "mercader" && eA.estado === "espera" && Math.abs(cx - (madre.x + eA.dx)) < 11 && cy > groundY - 28 && cy < groundY + 4) return { quien: "mercader" };
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
    lanzarEspora(madre.x + (Math.random() - 0.5) * 10, groundY - alturaMadre() * 0.8, PALETA[Math.floor(Math.random() * PALETA.length)], 0.6); // la espora del toque rueda hasta la pila del madre
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
  const pan = (px, py = 0) => { camObj = null; camX -= (px * dpr) / S; camY += (py * dpr) / S; limitarCam(); };
  // lleva la cámara (con un deslizamiento suave) hasta la puerta de la dungeon
  function mostrarPuerta() {
    if (!mina || !edif.mina) return;
    const n = mina.nodos[mina.puerta.nodo];
    camObj = { x: edif.mina.x + n.x, y: Hc * 0.5 - groundY - n.y };
  }
  const recentrar = () => { camX = C0; camY = 0; limitarCam(); };

  const tomar = (ev) => tomarEvento(ev);

  function setLimite(n) {
    limiteVisibles = clamp(Math.round(n) || 20, 3, 300);
    while (brotes.length > maxBrotes()) brotes.shift();
  }

  return { activarGL, spawnEvento, tomarEvento: tomar, mostrarPuerta, festejarMercs, zoom, pan, recentrar, setLimite, resize, update, draw, toque, pulsoMadre, rectMadre, rectEdificio, iniciarColocacion, moverColocacion, cancelarColocacion, confirmarColocacion };
}
