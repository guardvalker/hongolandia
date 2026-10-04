import { D } from './decimal.js';
import { agregarHongoFondo } from './state.js';
import { HONGUITOS, MEJORAS, EDIFICIOS, PRESTIGIO, BOLSA, LUNA, ACIDO, TECNOLOGIAS, TEC_POR_ID, MEJ_EDIF, MEJ_EDIF_POR_ID, HITOS } from './data.js';

// Lógica pura del juego: nada de DOM ni canvas acá.

// Improductividad por lluvia ácida (la escribe la escena, que sabe qué honguitos se mojaron):
// por tipo, la fracción de sus honguitos mojados y hasta cuándo dura (ms). No se guarda.
export const improd = {};
// efectos que no son multiplicadores (se recalculan en cada tick)
export const efectos = { acidoMenos: 0 };
export function factorAcido(id) {
  const m = improd[id];
  return m && m.hasta > Date.now() ? 1 - ACIDO.pct * (1 - efectos.acidoMenos) * m.f : 1;
}

// Eventos para la escena (golpes críticos, investigaciones terminadas...). No se guardan.
export const eventos = [];
const emitir = (e) => { if (eventos.length < 60) eventos.push(e); };

const cuenta = (state, id) => state.honguitos[id] || 0;

// ---- Hitos de cantidad: ×2 por cada umbral alcanzado ----
export const multHitos = (n) => Math.pow(2, HITOS.filter((h) => n >= h).length);
export const proximoHito = (n) => HITOS.find((h) => n < h) ?? null;

// ---- Investigaciones: el % de cada nivel se sortea con la semilla de la partida ----
const hashStr = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rnd01 = (seed) => { const a = (seed + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export function pctTec(state, t) {
  const base = (t.target === "todos" ? 0.6 : 1) * (1 + 0.3 * (t.nivel - 1));
  return Math.round(base * (0.6 + 0.8 * rnd01(hashStr(t.id) + (state.semilla || 0) * 7919)) * 10) / 10;
}
export const tecDisponible = (state, t) =>
  !state.mejoras[t.id] && !!state.edificios[t.edificio] && (!t.req || !!state.mejoras[t.req]);

// ---- Mejoras de edificio: habilidades activas, velocidad, sinergias ----
export const buffActivo = (state, m) => (state.habil[m.id]?.hasta || 0) > Date.now();
export const buffTipoActivo = (state, tipo) => MEJ_EDIF.some((m) => m.ef === "buff" && m.aplica === tipo && state.mejoras[m.id] && buffActivo(state, m));
export function velocidad(state, tipo) {
  let v = 1;
  for (const m of MEJ_EDIF) if (m.ef === "vel" && m.aplica === tipo && state.mejoras[m.id]) v *= m.mult;
  return v;
}
// bono de las sinergias que apuntan a `objetivo` (un tipo, "todos" o "investigacion")
function bonoSinergia(state, objetivo) {
  let m = 1;
  for (const e of MEJ_EDIF) {
    if (e.ef === "sinergia" && state.mejoras[e.id] && e.objetivo === objetivo) m *= 1 + e.bono * Math.floor(cuenta(state, e.fuente) / e.cada);
  }
  return m;
}

export function multiplicador(state, tipoId) {
  let m = 1;
  for (const mj of MEJORAS) if (state.mejoras[mj.id] && (mj.aplica === "todos" || mj.aplica === tipoId)) m *= mj.mult.toNumber();
  for (const t of TECNOLOGIAS) if (state.mejoras[t.id] && (t.target === "todos" || t.target === tipoId)) m *= 1 + pctTec(state, t) / 100;
  for (const e of MEJ_EDIF) {
    if (!state.mejoras[e.id]) continue;
    if (e.ef === "prod" && e.aplica === tipoId) m *= e.mult;
    else if (e.ef === "vel" && e.aplica === tipoId) m *= 1 + (e.mult - 1) * 0.5; // trabajar más rápido rinde un poco
    else if (e.ef === "buff" && e.aplica === tipoId && buffActivo(state, e)) m *= e.mult;
  }
  m *= bonoSinergia(state, tipoId) * bonoSinergia(state, "todos");
  m *= multHitos(cuenta(state, tipoId));
  return D(m);
}

// Puntos de investigación por segundo (los ponen los científicos).
export function invPorSeg(state) {
  const n = cuenta(state, "cientifico");
  return n > 0 ? n * HONGUITOS.cientifico.invProd.toNumber() * multiplicador(state, "cientifico").toNumber() * bonoSinergia(state, "investigacion") : 0;
}

// Esporas/s que genera un tipo de honguito (con sus mejoras).
export function produccionPorTipo(state, id) {
  const n = state.honguitos[id] || 0;
  return n > 0 ? HONGUITOS[id].prod.mul(n).mul(multiplicador(state, id)).mul(factorAcido(id)) : D(0);
}

// Nivel de prestigio según el total de esporas ganadas, y progreso hacia el siguiente.
export function prestigio(total) {
  const g = PRESTIGIO.crecimiento, c0 = PRESTIGIO.base;
  const acum = (k) => c0.mul(D(g).pow(k).sub(1)).div(g - 1); // esporas totales para tener k puntos
  let n = Math.max(0, Math.floor(total.mul(g - 1).div(c0).add(1).log10().toNumber() / Math.log10(g)));
  while (total.gte(acum(n + 1))) n++;
  while (n > 0 && total.lt(acum(n))) n--;
  const base = acum(n), need = acum(n + 1).sub(base), cur = total.sub(base);
  return { puntos: n, cur, need, frac: Math.min(1, Math.max(0, cur.div(need).toNumber())) };
}

// Cada 5 niveles de prestigio crece un hongo gigante en el fondo.
export function revisarHitos(state) {
  const n = Math.floor(prestigio(state.total).puntos / 5);
  while (state.hitos < n) {
    state.hitos++;
    agregarHongoFondo(state);
  }
}

export function produccionPorSeg(state) {
  let total = D(0);
  for (const id in HONGUITOS) {
    total = total.add(produccionPorTipo(state, id));
  }
  return total;
}

// dt en segundos. Sin progreso offline: el llamador topea dt (ver main.js).
// Una expedición a la luna: suma una base (de color de alguno de los honguitos que tenés) en un
// lugar libre de la luna (coordenadas en el disco unidad); con la luna llena, crece una existente.
function expedicionLunar(state) {
  const L = state.luna;
  const colores = Object.keys(HONGUITOS).filter((id) => (state.honguitos[id] || 0) > 0).map((id) => HONGUITOS[id].color);
  const col = colores[Math.floor(Math.random() * colores.length)] || "#ffffff";
  if (L.bases.length >= LUNA.maxBases) {
    const b = L.bases[Math.floor(Math.random() * L.bases.length)];
    b.s = Math.min(4, b.s + 1);
    b.c = col;
    return;
  }
  let mejor = null, mejorD = -1;
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.82;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    const d = L.bases.reduce((m, o) => Math.min(m, Math.hypot(o.x - x, o.y - y)), 9);
    if (d > mejorD) { mejorD = d; mejor = { x, y }; }
  }
  L.bases.push({ ...mejor, c: col, s: 1 });
}

export function tick(state, dt) {
  efectos.acidoMenos = MEJ_EDIF.reduce((a, e) => (state.mejoras[e.id] && e.ef === "acido" ? 1 - (1 - a) * (1 - e.acidoMenos) : a), 0);
  // los traders no cobran de a poco: acumulan tiempo y pagan todo junto al cerrar cada ciclo de bolsa
  const trader = produccionPorTipo(state, "trader");
  let ganancia = produccionPorSeg(state).sub(trader).mul(dt);
  if (trader.gt(0)) {
    const b = state.bolsa;
    b.t += dt;
    const ciclo = BOLSA.ciclo / velocidad(state, "trader");
    const ciclos = Math.floor(b.t / ciclo);
    if (ciclos > 0) {
      b.t -= ciclos * ciclo;
      b.n += ciclos;
      ganancia = ganancia.add(trader.mul(ciclo * ciclos));
    }
  }
  // astronautas: cada ciclo hacen una expedición a la luna
  if ((state.honguitos.astronauta || 0) > 0) {
    const L = state.luna;
    L.t += dt;
    const cicloL = LUNA.ciclo / velocidad(state, "astronauta");
    const ciclos = Math.floor(L.t / cicloL);
    if (ciclos > 0) {
      L.t -= ciclos * cicloL;
      L.n += ciclos;
      for (let i = 0; i < Math.min(ciclos, 200); i++) expedicionLunar(state);
    }
  }
  // golpes críticos de las mejoras de edificio: de golpe `seg` segundos de producción de ese tipo
  let puntosInv = invPorSeg(state) * dt;
  for (const e of MEJ_EDIF) {
    if (e.ef !== "crit" || !state.mejoras[e.id]) continue;
    const cient = e.aplica === "cientifico";
    const tasa = cient ? invPorSeg(state) : produccionPorTipo(state, e.aplica);
    if (cient ? tasa <= 0 : tasa.lte(0)) continue;
    let veces = 0;
    if (dt > 2) veces = e.prob * dt; // mucho tiempo junto (segundo plano): se usa el valor esperado
    else if (Math.random() < e.prob * dt) { veces = 1; emitir({ tipo: e.aplica, crit: true }); }
    if (!veces) continue;
    if (cient) puntosInv += tasa * e.seg * veces;
    else ganancia = ganancia.add(tasa.mul(e.seg * veces));
  }
  avanzarInvestigacion(state, puntosInv);
  state.esporas = state.esporas.add(ganancia);
  state.total = state.total.add(ganancia);
}

// Suma puntos a la investigación en curso; al terminar una, sigue con el nivel siguiente del mismo tema.
function avanzarInvestigacion(state, puntos) {
  const inv = state.invest;
  for (let i = 0; i < 60 && inv.actual && puntos > 0; i++) {
    const t = TEC_POR_ID[inv.actual];
    if (!t) { inv.actual = null; break; }
    const falta = t.trabajo - (inv.prog[t.id] || 0);
    if (puntos < falta) { inv.prog[t.id] = (inv.prog[t.id] || 0) + puntos; return; }
    puntos -= falta;
    delete inv.prog[t.id];
    state.mejoras[t.id] = true;
    emitir({ hecha: t.id });
    const sig = TEC_POR_ID[`${t.target}_${t.nivel + 1}`];
    inv.actual = sig && tecDisponible(state, sig) ? sig.id : null;
  }
}

export function elegirInvestigacion(state, id) {
  const t = TEC_POR_ID[id];
  if (!t || !tecDisponible(state, t)) return false;
  state.invest.actual = id;
  return true;
}

// Mejora de edificio: esporas + tener suficientes honguitos del tipo.
export function comprarMejoraEdificio(state, id) {
  const m = MEJ_EDIF_POR_ID[id];
  if (!m || state.mejoras[id] || !state.edificios[m.edificio] || cuenta(state, m.tipo) < m.req || state.esporas.lt(m.costo)) return false;
  state.esporas = state.esporas.sub(m.costo);
  state.mejoras[id] = true;
  return true;
}

// Habilidad activa (buff temporal con recarga). Usa el reloj real: sigue con la pestaña oculta.
export function activarHabilidad(state, id) {
  const m = MEJ_EDIF_POR_ID[id];
  const ahora = Date.now();
  if (!m || m.ef !== "buff" || !state.mejoras[id] || ahora < (state.habil[id]?.listoEn || 0)) return false;
  state.habil[id] = { hasta: ahora + m.dur * 1000, listoEn: ahora + m.cd * 1000 };
  return true;
}

export function costoHonguito(state, id) {
  const t = HONGUITOS[id];
  const n = state.honguitos[id] || 0;
  return t.costoBase.mul(D(t.crecimiento).pow(Math.max(0, n - 1))).ceil();
}

// Costo de comprar k honguitos seguidos (cada uno sale lo que sale con los que ya tenés).
// Los primeros se calculan uno por uno; el resto con la fórmula de la serie geométrica.
export function costoHonguitos(state, id, k = 1) {
  const t = HONGUITOS[id];
  const n = state.honguitos[id] || 0;
  const g = t.crecimiento;
  const unit = (i) => t.costoBase.mul(D(g).pow(Math.max(0, n + i - 1))).ceil();
  let total = D(0);
  const exactos = Math.min(k, 3);
  for (let i = 0; i < exactos; i++) total = total.add(unit(i));
  const m = k - exactos;
  if (m > 0) {
    const c = t.costoBase.mul(D(g).pow(Math.max(0, n + exactos - 1)));
    total = total.add(g === 1 ? c.mul(m).ceil() : c.mul(D(g).pow(m).sub(1)).div(g - 1).ceil());
  }
  return total;
}

// Cuántos honguitos se pueden comprar con las esporas actuales.
export function maxHonguitos(state, id) {
  const E = state.esporas;
  if (E.lt(costoHonguitos(state, id, 1))) return 0;
  const t = HONGUITOS[id], g = t.crecimiento;
  const c1 = costoHonguitos(state, id, 1);
  let k = g === 1 ? Math.floor(E.div(c1).toNumber()) : Math.floor(E.mul(g - 1).div(c1).add(1).log10().toNumber() / Math.log10(g)) + 1;
  k = Math.max(1, k);
  while (k > 1 && costoHonguitos(state, id, k).gt(E)) k--;
  for (let i = 0; i < 5 && costoHonguitos(state, id, k + 1).lte(E); i++) k++;
  return k;
}

// Compra k de una (todo o nada). k = "max" compra todos los que alcancen.
export function comprarHonguitos(state, id, k = 1) {
  if (k === "max") k = maxHonguitos(state, id);
  if (k < 1) return false;
  const c = costoHonguitos(state, id, k);
  if (state.esporas.lt(c)) return false;
  state.esporas = state.esporas.sub(c);
  state.honguitos[id] = (state.honguitos[id] || 0) + k;
  return true;
}

export const comprarHonguito = (state, id) => comprarHonguitos(state, id, 1);

// Se paga al ubicarlo en el piso (dx = celdas a la derecha del hongo madre).
export function colocarEdificio(state, id, dx) {
  const e = EDIFICIOS[id];
  if (!e || state.edificios[id] || state.esporas.lt(e.costo)) return false;
  state.esporas = state.esporas.sub(e.costo);
  state.edificios[id] = { dx }; // celdas respecto del hongo madre (puede ser negativo)
  agregarHongoFondo(state);
  return true;
}

export function comprarMejora(state, id) {
  const mj = MEJORAS.find((m) => m.id === id);
  if (!mj || state.mejoras[id] || state.esporas.lt(mj.costo)) return false;
  state.esporas = state.esporas.sub(mj.costo);
  state.mejoras[id] = true;
  return true;
}
