import { D, Dec } from './decimal.js';
import { ETAPAS } from './data.js';

const KEY = "hongolandia-save";
export const SAVE_VERSION = 1;

// Hongos gigantes del fondo (decorativos, muy oscuros): uno por edificio nuevo y uno cada
// 5 niveles de prestigio. Se guarda su posición (fracción del ancho) y su tamaño relativo.
export const MAX_HONGOS_FONDO = 30;
const SEP_FONDO = 0.075; // separación mínima entre hongos gigantes (fracción del ancho)
// Posición al azar que respeta la separación con los ya puestos; si no hay lugar, la más alejada.
export function nuevoHongoFondo(otros = []) {
  let mejor = null, mejorD = -1;
  const buenos = [];
  for (let i = 0; i < 40; i++) {
    const x = 0.04 + Math.random() * 0.92;
    const d = otros.reduce((m, o) => Math.min(m, Math.abs(o.x - x)), 9);
    if (d >= SEP_FONDO) buenos.push(x);
    if (d > mejorD) { mejorD = d; mejor = x; }
  }
  const x = buenos.length ? buenos[Math.floor(Math.random() * buenos.length)] : mejor;
  return { x, s: 0.6 + Math.random() * 0.7, v: Math.floor(Math.random() * 1e6) };
}
// Partidas viejas: vuelve a ubicar los que quedaron pegados o uno encima del otro.
function espaciarFondo(fondo) {
  const puestos = [];
  for (const h of fondo) {
    const pegado = puestos.some((o) => Math.abs(o.x - h.x) < SEP_FONDO);
    puestos.push(pegado ? { ...h, x: nuevoHongoFondo(puestos).x } : h);
  }
  return puestos;
}
export function agregarHongoFondo(state) {
  state.fondo.push(nuevoHongoFondo(state.fondo));
  if (state.fondo.length > MAX_HONGOS_FONDO) state.fondo.shift();
}

export function nuevoEstado() {
  return {
    v: SAVE_VERSION,
    esporas: D(0),
    total: D(0), // esporas ganadas en toda la partida (define la etapa)
    logi: { valor: D(0), n: 0, sitios: {}, comp: {} }, // comp: montañas que se están compactando; // esporas sueltas esperando que los básicos las lleven al hongo madre: valor total, cantidad y cuántas hay en la montaña de cada lugar
    prisma: { nivel: 0, n: 0, tot: 0, comprados: {} }, // compactación de la corrida (nivel 0 a 10), Prismas sin gastar, ganados en total y mejoras prismáticas compradas
    logros: {}, // logros cumplidos (persisten entre corridas)
    altar: { talentos: [], pacto: null }, // Altar de micelio: talentos equipados y pacto activo (persisten entre corridas)
    pp: 0, // puntos de prestigio sin gastar
    ppExtra: 0, // PP extra ganados en la corrida (Periódico de herencias)
    nivelVisto: 0, // último nivel de prestigio de la corrida ya procesado por las mejoras de prestigio
    ppGastados: 0, // PP gastados en mejoras de prestigio (destraban los tiers)
    ppTotal: 0, // PP ganados en toda la partida
    prestigios: 0, // cuántas veces se prestigió
    pu: {}, // mejoras de prestigio: id -> rango (persisten entre corridas)
    honguitos: { basico: 1 },
    mejoras: {},
    edificios: {}, // id -> { x } (fracción del ancho de pantalla)
    torres: [], // torres de defensa: { dx (celdas desde el madre), tipo, sold (soldados dentro) }
    fondo: [], // hongos gigantes decorativos del fondo
    hitos: 0, // cuántos hitos de prestigio (cada 5 niveles) ya dieron su hongo
    flags: {},
    dungeon: { merc: {}, cristales: 0, jefes: 0, expediciones: 0, victorias: 0, derrotas: 0, mejorEtapa: 0, objetos: {}, objetosRaros: 0, auto: true, ultimo: null }, // taberna y exploración de la dungeon
    arte: { tienen: {}, ofertas: null }, // artefactos del Mercader hongil y las 5 ofertas pendientes
    arcano: { prox: 150, tormenta: { mult: 1, hasta: 0 }, eventos: 0, sinInvasion: 0, invasiones: 0, repelidas: 0, robadas: 0 }, // eventos de los magos
    luna: { t: 0, n: 0, bases: [] }, // expediciones lunares y las bases que ya tiene la luna
    invest: { actual: null, prog: {} }, // investigación en curso y puntos acumulados por tecnología
    contam: 0, // contaminación (en 'nubes', 0 a 10): la genera la fábrica y la purifican los magos
    evento: { mult: 1, hasta: 0 }, // fiebre del micelio activa
    rachas: {}, // progreso de cada racha (acciones acumuladas / cada)
    habil: {}, // habilidades activas: { id: { hasta, listoEn } } en ms (reloj real)
    bolsa: { t: 0, n: 0 }, // ciclo de los traders: segundos transcurridos y cuántos cobros hubo
    semilla: Math.floor(Math.random() * 1e6), // define el tamaño relativo de los edificios; cambia con cada prestigio
    creado: Date.now(),
  };
}

export function etapaDe(state) {
  let e = 0;
  for (let i = 0; i < ETAPAS.length; i++) if (state.total.gte(ETAPAS[i].total)) e = i;
  return e;
}

// ---- Serialización: los Decimal viajan como string ----
function serializar(state) {
  return { ...state, esporas: state.esporas.toString(), total: state.total.toString(), logi: { valor: state.logi.valor.toString(), n: state.logi.n, sitios: state.logi.sitios, comp: state.logi.comp } };
}

// Migraciones del save: una por cada cambio de SAVE_VERSION.
function migrar(raw) {
  // if (raw.v < 2) { ...; raw.v = 2; }
  // la Torre de defensa única pasó a ser una torre básica del sistema de torres
  if (raw.edificios?.torre_defensa) {
    raw.torres = Array.isArray(raw.torres) ? raw.torres : [{ dx: raw.edificios.torre_defensa.dx ?? 40, tipo: "basica", sold: 0 }];
    raw.edificios = { ...raw.edificios };
    delete raw.edificios.torre_defensa;
  }
  return raw;
}

function deserializar(raw) {
  raw = migrar(raw);
  const base = nuevoEstado();
  return {
    ...base,
    ...raw,
    v: SAVE_VERSION,
    esporas: new Dec(raw.esporas ?? 0),
    total: new Dec(raw.total ?? 0),
    logi: { valor: new Dec(raw.logi?.valor ?? 0), n: raw.logi?.n ?? 0, sitios: raw.logi?.sitios ? { ...raw.logi.sitios } : (raw.logi?.n ? { madre: raw.logi.n } : {}), comp: { ...raw.logi?.comp } },
    prisma: { ...base.prisma, ...raw.prisma, comprados: { ...raw.prisma?.comprados } },
    logros: { ...raw.logros },
    altar: { talentos: Array.isArray(raw.altar?.talentos) ? [...raw.altar.talentos] : [], pacto: raw.altar?.pacto ?? null },
    honguitos: { ...base.honguitos, ...raw.honguitos },
    mejoras: { ...raw.mejoras },
    pu: { ...raw.pu },
    edificios: { ...raw.edificios },
    torres: Array.isArray(raw.torres) ? raw.torres.map((t) => ({ dx: t.dx ?? 40, tipo: t.tipo || "basica", sold: Math.min(10, t.sold || 0) })) : [],
    // partidas viejas: un hongo de fondo por cada edificio que ya tenían
    fondo: Array.isArray(raw.fondo) ? espaciarFondo(raw.fondo) : espaciarFondo(Object.keys(raw.edificios || {}).map(() => nuevoHongoFondo())),
    hitos: raw.hitos ?? 0,
    flags: { ...raw.flags },
    bolsa: { ...base.bolsa, ...raw.bolsa },
    invest: { actual: raw.invest?.actual ?? null, prog: { ...raw.invest?.prog } },
    habil: { ...raw.habil },
    contam: raw.contam ?? 0,
    evento: { mult: 1, hasta: 0, ...raw.evento },
    dungeon: { ...base.dungeon, ...raw.dungeon, merc: { ...raw.dungeon?.merc }, objetos: { ...raw.dungeon?.objetos } },
    arte: { ...base.arte, ...raw.arte, tienen: { ...raw.arte?.tienen } },
    arcano: { ...base.arcano, ...raw.arcano, tormenta: { ...base.arcano.tormenta, ...raw.arcano?.tormenta } },
    luna: { ...base.luna, ...raw.luna, bases: Array.isArray(raw.luna?.bases) ? raw.luna.bases : [] },
  };
}

export function guardar(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(serializar(state)));
  } catch (_) {}
}

export function cargar() {
  try {
    const txt = localStorage.getItem(KEY);
    if (txt) return deserializar(JSON.parse(txt));
  } catch (_) {}
  return nuevoEstado();
}

export function borrarGuardado() {
  try {
    localStorage.removeItem(KEY);
  } catch (_) {}
}

// ---- Exportar / importar (texto base64) ----
export function exportar(state) {
  const json = JSON.stringify(serializar(state));
  return btoa(unescape(encodeURIComponent(json)));
}

export function importar(texto) {
  const json = decodeURIComponent(escape(atob(texto.trim())));
  const raw = JSON.parse(json);
  if (typeof raw !== "object" || raw === null || raw.esporas === undefined) throw new Error("save inválido");
  return deserializar(raw);
}
