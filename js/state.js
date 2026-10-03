import { D, Dec } from './decimal.js';
import { ETAPAS } from './data.js';

const KEY = "hongolandia-save";
export const SAVE_VERSION = 1;

export function nuevoEstado() {
  return {
    v: SAVE_VERSION,
    esporas: D(0),
    total: D(0), // esporas ganadas en toda la partida (define la etapa)
    honguitos: { basico: 1 },
    mejoras: {},
    flags: {},
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
  return { ...state, esporas: state.esporas.toString(), total: state.total.toString() };
}

// Migraciones del save: una por cada cambio de SAVE_VERSION.
function migrar(raw) {
  // if (raw.v < 2) { ...; raw.v = 2; }
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
    honguitos: { ...base.honguitos, ...raw.honguitos },
    mejoras: { ...raw.mejoras },
    flags: { ...raw.flags },
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
