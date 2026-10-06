import { D } from './decimal.js';
import { agregarHongoFondo } from './state.js';
import { arteM, arteA, ARTEFACTOS, ARTE_POR_ID } from './artefactos.js';
import { puA, buffCrisis, avisosPU } from './puData.js';
import { HONGUITOS, MEJORAS, EDIFICIOS, PRESTIGIO, BOLSA, LUNA, ACIDO, TECNOLOGIAS, TEC_POR_ID, MEJ_EDIF, MEJ_EDIF_POR_ID, MEJ_CLICK, MEJ_CLICK_POR_ID, MEJ_LOGI, MEJ_LOGI_POR_ID, LOGI, HITOS, MODO_PRUEBA, EVENTOS, EVENTO_CFG } from './data.js';

// Lógica pura del juego: nada de DOM ni canvas acá.

// Improductividad por lluvia ácida (la escribe la escena, que sabe qué honguitos se mojaron):
// por tipo, la fracción de sus honguitos mojados y hasta cuándo dura (ms). No se guarda.
export const improd = {};
// efectos que no son multiplicadores (se recalculan en cada tick)
export const efectos = { acidoMenos: 0, paraguas: 1, autoEvento: 0, eventoFreq: 1, eventoDur: 0, purga: 1, descInv: 0, offline: 0 };
// Daño de meteoritos (lo escribe la lógica de eventos): por tipo, fracción de producción perdida y hasta cuándo (ms)
export const meteoros = {};
export function factorMeteoro(id) {
  const m = meteoros[id];
  return m && m.hasta > Date.now() ? 1 - 0.6 * m.f : 1;
}
export function factorAcido(id) {
  const m = improd[id];
  return m && m.hasta > Date.now() ? 1 - ACIDO.pct * (1 - efectos.acidoMenos) * m.f : 1;
}

// Eventos para la escena (golpes críticos, investigaciones terminadas...). No se guardan.
export const eventos = [];
const emitir = (e) => { if (eventos.length < 60) eventos.push(e); };

const cuenta = (state, id) => state.honguitos[id] || 0;

// ---- Hitos de cantidad: ×2 por cada umbral alcanzado ----
const umbral = (h, state) => Math.max(1, Math.ceil(h * (1 - Math.min(0.5, state ? arteA(state, "hito_bajo") : 0))));
export const multHitos = (n, state) => Math.pow(2, HITOS.filter((h) => n >= umbral(h, state)).length);
export const proximoHito = (n, state) => { const h = HITOS.find((x) => n < umbral(x, state)); return h === undefined ? null : umbral(h, state); };

// ---- Investigaciones: el % de cada nivel se sortea con la semilla de la partida ----
const hashStr = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rnd01 = (seed) => { const a = (seed + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export function pctTec(state, t) {
  const base = (t.target === "todos" ? 0.6 : 1) * (1 + 0.3 * (t.nivel - 1));
  return Math.round(base * (0.6 + 0.8 * rnd01(hashStr(t.id) + (state.semilla || 0) * 7919)) * 10) / 10;
}
export const tecDisponible = (state, t) =>
  !state.mejoras[t.id] && !!state.edificios[t.edificio] && (!t.req || !!state.mejoras[t.req]);

// ---- Mejoras de edificio (por niveles) ----
export const nivelMej = (state, id) => { const v = state.mejoras[id]; return typeof v === "number" ? v : v ? 1 : 0; };
export const costoMej = (state, m) => (MODO_PRUEBA ? D(1) : m.costo.mul(D(m.esc).pow(nivelMej(state, m.id))).mul(1 - Math.min(0.5, arteA(state, "costo_mej"))).ceil());
// costo de un edificio con los descuentos de artefactos
export const costoEdificio = (state, e) => e.costo.mul(1 - Math.min(0.6, arteA(state, "costo_edif"))).ceil();
const sumaNiveles = (state, ef, campo) => MEJ_EDIF.reduce((a, m) => (m.ef === ef ? a + (m[campo] ?? 0) * nivelMej(state, m.id) : a), 0);
// habilidad activa con buff: duración y recarga según el nivel
export const durBuff = (m, n) => m.dur0 + m.dur1 * (n - 1);
export const cdHabilidad = (m, n) => Math.max(45, m.cd0 - (m.cd1 || 0) * (n - 1));
export const buffActivo = (state, m) => (state.habil[m.id]?.hasta || 0) > Date.now();
export const buffTipoActivo = (state, tipo) => MEJ_EDIF.some((m) => m.ef === "buff" && m.aplica === tipo && nivelMej(state, m.id) > 0 && buffActivo(state, m));
export function velocidad(state, tipo) {
  let v = 1 + arteA(state, "vel_all");
  for (const m of MEJ_EDIF) if (m.ef === "vel" && m.aplica === tipo) v *= 1 + m.a * nivelMej(state, m.id);
  return v;
}
// bono de las sinergias que apuntan a `objetivo` (un tipo, "todos" o "investigacion")
function bonoSinergia(state, objetivo) {
  let m = 1;
  for (const e of MEJ_EDIF) {
    if (e.ef === "sinergia" && nivelMej(state, e.id) > 0 && e.objetivo === objetivo) m *= 1 + e.bono * Math.floor(cuenta(state, e.fuente) / e.cada);
  }
  return m;
}
// precio de los honguitos: las mejoras de descuento achican lo que sube con cada compra
function crecEf(state, id) {
  const g = HONGUITOS[id].crecimiento;
  const desc = MEJ_EDIF.reduce((a, m) => (m.ef === "descuento" && m.tipo === id ? a + m.a * nivelMej(state, m.id) : a), 0);
  return 1 + (g - 1) * (1 - Math.min(0.7, desc + arteA(state, "costo_hong")));
}
// tope de ausencia (segundos de producción sin conexión que se cuentan)
export const maxAusencia = (state) => 3600 + sumaNiveles(state, "offline", "a") + arteA(state, "offline");
// investigar cuesta menos con las becas
export const trabajoEf = (state, t) => t.trabajo * (1 - Math.min(0.7, sumaNiveles(state, "descInv", "a")));

// ---- Eventos de productividad ----
export const eventoMult = (state) => (state.evento && state.evento.hasta > Date.now() ? state.evento.mult : 1);
export function cobrarEvento(state, tipo) {
  buffCrisis(state);
  if (tipo === "fiebre") {
    state.evento = { mult: EVENTO_CFG.fiebreMult, hasta: Date.now() + EVENTO_CFG.fiebreSeg * 1000 };
    return { texto: `¡Fiebre del micelio! Todo ×${EVENTO_CFG.fiebreMult} por ${EVENTO_CFG.fiebreSeg} s` };
  }
  if (tipo === "cometa" && invPorSeg(state) > 0) {
    const pts = invPorSeg(state) * 150 * arteM(state, "cometa_val");
    avanzarInvestigacion(state, pts);
    return { texto: `¡Cometa de ideas! +${Math.round(pts)} puntos de investigación` };
  }
  const lump = produccionPorSeg(state).mul((60 + Math.random() * 140) * arteM(state, "dorada_val"));
  const ganancia = lump.lt(13) ? D(13) : lump;
  state.esporas = state.esporas.add(ganancia);
  state.total = state.total.add(ganancia);
  return { texto: "¡Espora dorada!", ganancia };
}

export function multiplicador(state, tipoId) {
  let m = 1;
  for (const mj of MEJORAS) if (state.mejoras[mj.id] && (mj.aplica === "todos" || mj.aplica === tipoId)) m *= mj.mult.toNumber();
  for (const t of TECNOLOGIAS) if (state.mejoras[t.id] && (t.target === "todos" || t.target === tipoId)) m *= 1 + pctTec(state, t) / 100;
  let bases = 0;
  for (const e of MEJ_EDIF) {
    const n = nivelMej(state, e.id);
    if (!n) continue;
    if (e.ef === "prod" && e.aplica === tipoId) m *= 1 + e.a * n;
    else if (e.ef === "vel" && e.aplica === tipoId) m *= 1 + e.a * n * 0.5; // trabajar más rápido rinde un poco
    else if (e.ef === "buff" && e.aplica === tipoId && buffActivo(state, e)) m *= e.mult;
    else if (e.ef === "luna") bases += e.a * n;
    else if (e.ef === "sobrecarga" && tipoId === "obrero" && state.flags.sobrecarga) m *= 2.5;
  }
  if (bases) m *= 1 + bases * (state.luna?.bases.length || 0);
  m *= bonoSinergia(state, tipoId) * bonoSinergia(state, "todos") * eventoMult(state);
  m *= multHitos(cuenta(state, tipoId), state);
  // artefactos del mercader y tormenta de esporas de los magos
  const ar = state.arte && state.arte.tienen ? arteM(state, "prod_all") * arteM(state, "prod_" + tipoId) * (1 + arteA(state, "pp_prod")) : 1;
  m *= ar;
  if (state.arte) {
    const nEd = Object.keys(state.edificios).length;
    m *= 1 + arteA(state, "syn_edif") * nEd + arteA(state, "syn_basico") * Math.floor(cuenta(state, "basico") / 25) + arteA(state, "luna_base") * (state.luna?.bases.length || 0);
  }
  if (state.buffPU && state.buffPU.hasta > Date.now()) m *= state.buffPU.mult; // Reflejos de crisis
  const tor = state.arcano && state.arcano.tormenta;
  if (tor && tor.hasta > Date.now()) m *= tor.mult;
  m *= Math.pow(1.05 + (state.arte ? arteA(state, "cristal_extra") : 0), state.dungeon?.cristales || 0); // cristales radiantes del jefe de la dungeon
  return D(m);
}

// Puntos de investigación por segundo (los ponen los científicos).
export function invPorSeg(state) {
  const n = cuenta(state, "cientifico");
  return n > 0 ? n * HONGUITOS.cientifico.invProd.toNumber() * multiplicador(state, "cientifico").toNumber() * bonoSinergia(state, "investigacion") * arteM(state, "inv_vel") : 0;
}

// ---- Logística de esporas ----
// Esporas sueltas que se generan por segundo (cantidad, no valor): cada honguito productor suelta `emision`.
export function emisionPorSeg(state) {
  let n = 0;
  for (const id in HONGUITOS) if (HONGUITOS[id].prod.gt(0)) n += state.honguitos[id] || 0;
  return n * LOGI.emision;
}
// distancia media (celdas) que recorre un básico hasta las esporas: crece con lo lejos que están los edificios
function distMedia(state) {
  const ds = Object.values(state.edificios).map((e) => Math.abs(e.dx ?? 0));
  const media = ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : 0;
  return (LOGI.distBase + 0.5 * media) * (1 - Math.min(0.6, 0.05 * nivelMej(state, "logi_senderos") + arteA(state, "logi_dist")));
}
export function logiInfo(state) {
  const nB = state.honguitos.basico || 0;
  let carga = LOGI.carga0 * LOGI.factorCarga ** nivelMej(state, "logi_manojo") * arteM(state, "logi_carga") * arteM(state, "prod_basico") * multHitos(nB, state);
  for (const mj of MEJORAS) if (mj.aplica === "basico" && state.mejoras[mj.id]) carga *= mj.mult.toNumber(); // las mejoras «de los básicos» agrandan el manojo
  carga *= 1 + 0.02 * nivelMej(state, "logi_cuadrilla") * Math.floor(nB / 10); // cuadrillas: más básicos, manojos más grandes
  const vel = LOGI.vel * (1 + 0.1 * nivelMej(state, "logi_zancada") + arteA(state, "logi_vel"));
  const recoger = LOGI.recoger * Math.max(0.2, 1 - 0.07 * nivelMej(state, "logi_recoger") - arteA(state, "logi_recoger"));
  const viaje = ((2 * distMedia(state)) / vel + recoger) * (1 - Math.min(0.5, 0.05 * nivelMej(state, "logi_relevo"))); // segundos de ida, vuelta y juntar el manojo
  const n = state.honguitos.basico || 0;
  const cap = (n * carga) / viaje; // esporas por segundo que se pueden llevar al hongo madre
  const em = emisionPorSeg(state) + (state.logi.tasaClick || 0);
  return { carga, viaje, vel, recoger, n, cap, em, razon: em > 0 ? Math.min(1, cap / em) : 1 };
}
// Partidas anteriores a la logística: se les regalan los niveles de logística justos para que todo siga llegando al hongo madre
export function migrarLogistica(state) {
  if (state.flags.logiInicial) return;
  state.flags.logiInicial = true;
  const orden = ["logi_manojo", "logi_zancada", "logi_senderos", "logi_recoger"];
  for (let i = 0; i < 400 && logiInfo(state).razon < 1; i++) {
    const m = MEJ_LOGI_POR_ID[orden[i % orden.length]];
    if (nivelMej(state, m.id) < m.max) state.mejoras[m.id] = nivelMej(state, m.id) + 1;
  }
}
export const costoLogi = (state, m) => {
  const n = nivelMej(state, m.id);
  const fijo = D(m.base).mul(D(m.esc).pow(n));
  const rel = produccionPorSeg(state).mul(22 * (1 + 0.3 * n)); // valen unos segundos de producción: siempre alcanzables y rentables cuando el transporte es el cuello de botella
  return (fijo.gt(rel) ? fijo : rel).ceil();
};
export function comprarMejoraLogi(state, id) {
  const m = MEJ_LOGI_POR_ID[id];
  const n = m ? nivelMej(state, id) : 0;
  if (!m || n >= m.max || (m.req && (state.honguitos.basico || 0) < m.req)) return false;
  const c = costoLogi(state, m);
  if (state.esporas.lt(c)) return false;
  state.esporas = state.esporas.sub(c);
  state.mejoras[id] = n + 1;
  return true;
}
// Entrega al hongo madre lo que los básicos alcanzan a llevar en `dt` s; el resto queda en el piso.
// `valor` y `cuenta` son lo recién producido (valor en esporas, cuenta en esporas sueltas).
export function logistica(state, dt, valor, cuenta, toques = 0) {
  const L = state.logi;
  // ritmo de toques (manuales y automáticos): promedio móvil, para que el panel de transporte también cuente las esporas de los clicks
  L.tasaClick = (L.tasaClick || 0) * (1 - Math.min(1, dt / 5)) + ((toques + (L.clk || 0)) / Math.max(dt, 1e-3)) * Math.min(1, dt / 5);
  L.clk = 0;
  L.valor = L.valor.add(valor);
  L.n += cuenta;
  if (L.n <= 0) { L.valor = D(0); L.n = 0; return D(0); }
  const mov = Math.min(L.n, logiInfo(state).cap * dt);
  if (mov <= 0) return D(0);
  const parte = mov >= L.n ? L.valor : L.valor.mul(mov / L.n);
  L.valor = L.valor.sub(parte);
  L.n -= mov;
  if (L.n < 1e-9) { L.n = 0; L.valor = D(0); }
  state.esporas = state.esporas.add(parte);
  state.total = state.total.add(parte);
  return parte;
}

// ---- Toques en el hongo madre y autoclick ----
const nivelClick = (state, ef) => { const m = MEJ_CLICK.find((x) => x.ef === ef); return m ? nivelMej(state, m.id) : 0; };
// toques automáticos pendientes de mostrar (los consume la escena; no se guarda)
export const autoToques = { n: 0, valor: D(0) };
export function valorToque(state, prod = produccionPorSeg(state)) {
  const base = D(1 + nivelClick(state, "fuerza")).add(prod.mul(0.01 * nivelClick(state, "savia") + arteA(state, "toque_savia")));
  return base.mul(2 ** nivelClick(state, "manos")).mul(arteM(state, "toque_mult")).mul(eventoMult(state));
}
export const autoPorSeg = (state) => (nivelClick(state, "auto") ? 1 + 0.5 * nivelClick(state, "autoVel") + arteA(state, "auto_vel_pu") : 0);
export const autoFraccion = (state) => 0.5 + 0.1 * nivelClick(state, "autoFuerza") + arteA(state, "auto_frac");
export function tocarMadre(state) {
  const v = valorToque(state);
  state.logi.valor = state.logi.valor.add(v); // el toque suelta una espora en el piso: un básico la lleva
  state.logi.n += 1;
  state.logi.clk = (state.logi.clk || 0) + 1;
  state.flags.toco = true;
  return v;
}
export function comprarMejoraClick(state, id) {
  const m = MEJ_CLICK_POR_ID[id];
  const n = m ? nivelMej(state, id) : 0;
  if (!m || n >= m.max || (m.requiere && !nivelMej(state, m.requiere))) return false;
  const c = costoMej(state, m);
  if (state.esporas.lt(c)) return false;
  state.esporas = state.esporas.sub(c);
  state.mejoras[id] = n + 1;
  return true;
}

// Esporas/s que genera un tipo de honguito (con sus mejoras).
export function produccionPorTipo(state, id) {
  const n = state.honguitos[id] || 0;
  return n > 0 ? HONGUITOS[id].prod.mul(n).mul(multiplicador(state, id)).mul(factorAcido(id)).mul(factorMeteoro(id)) : D(0);
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

// Mejoras de prestigio que saltan con cada nivel nuevo de la corrida (como las de «cada montaña consumida» de la wiki)
function nivelesNuevos(state) {
  const lvl = prestigio(state.total).puntos;
  while ((state.nivelVisto || 0) < lvl) {
    const n = (state.nivelVisto = (state.nivelVisto || 0) + 1);
    const rec = puA(state, "recluta_nivel");
    if (rec > 0 && n % 3 === 0) { state.honguitos.basico = (state.honguitos.basico || 0) + rec; avisosPU.push(`Reclutas de la pradera: +${rec} honguito${rec > 1 ? "s" : ""} básico${rec > 1 ? "s" : ""}`); }
    if (Math.random() < puA(state, "pp_chance")) { state.ppExtra = (state.ppExtra || 0) + 1; avisosPU.push("Periódico de herencias: ¡+1 PP para el próximo prestigio!"); }
    if (Math.random() < puA(state, "tesoro_nivel")) {
      const libres = ARTEFACTOS.filter((a) => !state.arte.tienen[a.id]);
      if (libres.length) { const a = libres[Math.floor(Math.random() * libres.length)]; state.arte.tienen[a.id] = true; avisosPU.push("Tesoro enterrado: ¡encontraste «" + a.nombre + "»!"); }
    }
  }
}

// Cada 5 niveles de prestigio crece un hongo gigante en el fondo.
export function revisarHitos(state) {
  nivelesNuevos(state);
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
    L.destino = L.bases.indexOf(b); // con la luna llena la nave aterriza en una base al azar
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
  L.destino = L.bases.length - 1;
}

export function tick(state, dt) {
  efectos.acidoMenos = Math.min(0.8, sumaNiveles(state, "acido", "a"));
  efectos.paraguas = Math.max(0.3, 1 - sumaNiveles(state, "paraguas", "a"));
  efectos.autoEvento = Math.min(0.9, sumaNiveles(state, "autoevento", "a") + arteA(state, "autoevento"));
  efectos.eventoFreq = 1 + sumaNiveles(state, "eventos", "a") + arteA(state, "evt_freq");
  efectos.eventoDur = sumaNiveles(state, "eventos", "d") + arteA(state, "evt_dur");
  efectos.purga = 1 + sumaNiveles(state, "purga", "a");
  efectos.offline = sumaNiveles(state, "offline", "a");
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
  // contaminación: la fábrica la genera, los magos la purifican y cada nube purificada da esporas
  const nObr = cuenta(state, "obrero"), nMag = cuenta(state, "mago");
  const objetivoNubes = nObr > 0 ? Math.min(10, 1 + Math.log2(nObr) * 0.9) : 0;
  const gen = 0.02 * objetivoNubes * (state.flags.sobrecarga && nivelMej(state, "obrero_sobrecarga") ? 2.5 : 1);
  const purga = nMag * 0.01 * efectos.purga * velocidad(state, "mago");
  let restante = dt;
  while (restante > 0) {
    const h = Math.min(restante, 5);
    restante -= h;
    const purificado = Math.min(purga * h, state.contam + gen * h);
    state.contam = Math.min(10, Math.max(0, state.contam + gen * h - purificado - 0.002 * state.contam * h));
    if (purificado > 0) ganancia = ganancia.add(produccionPorSeg(state).mul(purificado * 2));
  }
  // golpes críticos de las mejoras de edificio: de golpe `seg` segundos de producción de ese tipo
  let puntosInv = invPorSeg(state) * dt;
  for (const e of MEJ_EDIF) {
    if (e.ef !== "crit" || !nivelMej(state, e.id)) continue;
    const prob = e.p0 + e.p1 * (nivelMej(state, e.id) - 1);
    const cient = e.aplica === "cientifico";
    const tasa = cient ? invPorSeg(state) : produccionPorTipo(state, e.aplica);
    if (cient ? tasa <= 0 : tasa.lte(0)) continue;
    let veces = 0;
    if (dt > 2) veces = prob * dt; // mucho tiempo junto (segundo plano): se usa el valor esperado
    else if (Math.random() < prob * dt) { veces = 1; emitir({ tipo: e.aplica, crit: true }); }
    if (!veces) continue;
    if (cient) puntosInv += tasa * e.seg * veces;
    else ganancia = ganancia.add(tasa.mul(e.seg * veces));
  }
  avanzarInvestigacion(state, puntosInv);
  // autoclick: toques automáticos acumulados con el tiempo
  let cuentaExtra = 0;
  const tasaAuto = autoPorSeg(state);
  if (tasaAuto > 0) {
    state.autoAcc = (state.autoAcc || 0) + dt * tasaAuto;
    const n = Math.floor(state.autoAcc);
    if (n > 0) {
      state.autoAcc -= n;
      const v = valorToque(state).mul(autoFraccion(state));
      ganancia = ganancia.add(v.mul(n));
      cuentaExtra += n;
      autoToques.n = Math.min(autoToques.n + n, 50);
      autoToques.valor = v;
    }
  }
  logistica(state, dt, ganancia, emisionPorSeg(state) * dt + cuentaExtra, cuentaExtra); // la producción queda en el piso hasta que los básicos la llevan
}

// Suma puntos a la investigación en curso; al terminar una, sigue con el nivel siguiente del mismo tema.
function avanzarInvestigacion(state, puntos) {
  const inv = state.invest;
  for (let i = 0; i < 60 && inv.actual && puntos > 0; i++) {
    const t = TEC_POR_ID[inv.actual];
    if (!t) { inv.actual = null; break; }
    const falta = trabajoEf(state, t) - (inv.prog[t.id] || 0);
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

// Mejora de edificio: un nivel más (esporas + tener suficientes honguitos del tipo).
export function comprarMejoraEdificio(state, id) {
  const m = MEJ_EDIF_POR_ID[id];
  const n = m ? nivelMej(state, id) : 0;
  const costo = m ? costoMej(state, m) : null;
  if (!m || n >= m.max || !state.edificios[m.edificio] || cuenta(state, m.tipo) < m.req || state.esporas.lt(costo)) return false;
  state.esporas = state.esporas.sub(costo);
  state.mejoras[id] = n + 1;
  return true;
}

// Interruptor de la sobrecarga de la fábrica.
export function alternarSobrecarga(state) {
  if (!nivelMej(state, "obrero_sobrecarga")) return false;
  state.flags.sobrecarga = !state.flags.sobrecarga;
  return true;
}

// Habilidades activas: buffs temporales, apuesta y hechizo. Usan el reloj real (siguen con la pestaña oculta).
// Devuelve un texto para mostrar, o null si no se pudo usar.
export function activarHabilidad(state, id) {
  const m = MEJ_EDIF_POR_ID[id];
  const n = m ? nivelMej(state, id) : 0;
  const ahora = Date.now();
  if (!m || !n || ahora < (state.habil[id]?.listoEn || 0)) return null;
  if (m.ef === "buff") {
    state.habil[id] = { hasta: ahora + durBuff(m, n) * 1000, listoEn: ahora + cdHabilidad(m, n) * 1000 };
    return `${m.nombre}: ×${m.mult} a los ${HONGUITOS[m.aplica].nombre.toLowerCase()}s por ${durBuff(m, n)} s`;
  }
  if (m.ef === "hechizo") {
    state.habil[id] = { hasta: 0, listoEn: ahora + cdHabilidad(m, n) * 1000 };
    emitir({ spawnEvento: true });
    return "¡Mano del destino! Apareció algo en el cielo";
  }
  if (m.ef === "apuesta") {
    const monto = state.esporas.mul(0.1);
    if (monto.lt(1)) return null;
    state.habil[id] = { hasta: 0, listoEn: ahora + m.cd0 * 1000 };
    if (Math.random() < 0.55) {
      const ganancia = monto.mul(1.2);
      state.esporas = state.esporas.add(ganancia);
      state.total = state.total.add(ganancia);
      return "¡La apuesta salió bien! +" + ganancia.toExponential(2).replace("e+", "e");
    }
    state.esporas = state.esporas.sub(monto);
    return "La apuesta salió mal… perdiste el 10% de tus esporas";
  }
  return null;
}

// «Aprendices gremiales» (prestigio): los primeros N honguitos de cada tipo (sin contar el primer básico) salen gratis
const umbralGratis = (state, id) => (id === "basico" ? 1 : 0) + Math.floor(arteA(state, "hong_gratis"));
export function costoHonguito(state, id) {
  const t = HONGUITOS[id];
  const n = state.honguitos[id] || 0;
  if (n < umbralGratis(state, id)) return D(0);
  return t.costoBase.mul(D(crecEf(state, id)).pow(Math.max(0, n - 1))).ceil();
}

// Costo de comprar k honguitos seguidos (cada uno sale lo que sale con los que ya tenés).
// Los primeros se calculan uno por uno; el resto con la fórmula de la serie geométrica.
export function costoHonguitos(state, id, k = 1) {
  const t = HONGUITOS[id];
  let n = state.honguitos[id] || 0;
  const libres = Math.min(k, Math.max(0, umbralGratis(state, id) - n));
  k -= libres; n += libres; // los gratis van primero
  if (k <= 0) return D(0);
  const g = crecEf(state, id);
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
  const gratis = Math.max(0, umbralGratis(state, id) - (state.honguitos[id] || 0));
  if (gratis > 0) { // los gratis van primero; con el resto se calcula como si ya los tuvieras
    const n0 = state.honguitos[id] || 0;
    state.honguitos[id] = n0 + gratis;
    try { return gratis + maxHonguitos(state, id); } finally { state.honguitos[id] = n0; }
  }
  if (E.lt(costoHonguitos(state, id, 1))) return 0;
  const t = HONGUITOS[id], g = crecEf(state, id);
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
  const costoE = e ? costoEdificio(state, e) : null;
  if (!e || state.edificios[id] || state.esporas.lt(costoE)) return false;
  if (e.reqHong && cuenta(state, e.reqHong.tipo) < e.reqHong.n) return false; // faltan honguitos del edificio anterior
  if (e.requiere && !state.mejoras[e.requiere]) return false; // falta la carrera de la Universidad
  if (e.requiereFlag && !state.flags[e.requiereFlag]) return false; // falta un hallazgo (la dungeon)
  state.esporas = state.esporas.sub(costoE);
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
