// Eventos arcanos: desde que hay 10 magos en la Torre, cada tanto pasa algo en el mapa: una tormenta de
// esporas, una lluvia de meteoritos, la visita del Mercader hongil o una invasión de ladrones de esporas.
// La primera invasión desbloquea la Barraca hongil. Acá está la lógica; la escena los dibuja.

import { D } from './decimal.js';
import { prestigio, meteoros, produccionPorSeg } from './engine.js';
import { HONGUITOS } from './data.js';
import { ARTEFACTOS, ARTE_POR_ID, arteA } from './artefactos.js';

export const MAGOS_MIN = 10;

// ---- Mejoras de la Barraca y de la Torre de defensa (niveles guardados en state.mejoras) ----
export const DEF_MEJ = [
  { id: "def_entrena", edificio: "barraca", nombre: "Entrenamiento", max: 10, costo: D(5e14), esc: 1.9, desc: (n) => `Los soldados defienden un 12% mejor por nivel (ahora +${12 * n}%).` },
  { id: "def_alerta", edificio: "barraca", nombre: "Atalaya de alerta", max: 6, costo: D(2e15), esc: 2.2, desc: (n) => `Las invasiones tardan 3 s más en llegar al hongo madre por nivel (ahora +${3 * n} s).` },
  { id: "def_botin", edificio: "barraca", nombre: "Botín de guerra", max: 6, costo: D(1e15), esc: 2.1, desc: (n) => `Cada criatura derrotada deja un 25% más de esporas por nivel (ahora +${25 * n}%).` },
  { id: "def_canon", edificio: "torre_defensa", nombre: "Cañón de esporas", max: 10, costo: D(8e15), esc: 2.0, desc: (n) => `La torre derriba ${(0.4 + 0.3 * n).toFixed(1).replace(".", ",")} criaturas por segundo (+0,3 por nivel).` },
  { id: "def_cupula", edificio: "torre_defensa", nombre: "Cúpula antimeteoritos", max: 8, costo: D(1.2e16), esc: 2.1, desc: (n) => `La torre intercepta un ${10 * n}% de los meteoritos (+10% por nivel); los interceptados dejan esporas.` },
  { id: "def_refuerzo", edificio: "torre_defensa", nombre: "Refuerzo de edificios", max: 6, costo: D(1e16), esc: 2.2, desc: (n) => `Los meteoritos que igual caen dañan un ${12 * n}% menos a los edificios y honguitos (+12% por nivel).` },
];
export const DEF_POR_ID = Object.fromEntries(DEF_MEJ.map((m) => [m.id, m]));
export const nivelDef = (state, id) => { const v = state.mejoras[id]; return typeof v === "number" ? v : 0; };
export const costoDef = (state, m) => m.costo.mul(D(m.esc).pow(nivelDef(state, m.id))).ceil();
export function comprarDef(state, id) {
  const m = DEF_POR_ID[id];
  if (!m || !state.edificios[m.edificio]) return false;
  const n = nivelDef(state, id), c = costoDef(state, m);
  if (n >= m.max || state.esporas.lt(c)) return false;
  state.esporas = state.esporas.sub(c);
  state.mejoras[id] = n + 1;
  return true;
}

// ---- Evento en curso (no se guarda) ----
let ev = null;
let alcance = 300; // hasta dónde llega el mundo a cada lado del hongo madre (lo informa la escena)
const fx = []; // efectos para la escena
let resultado = null;
export const getEvento = () => ev;
export const setAlcance = (a) => { alcance = Math.max(120, Math.min(a, 600)); };
export const consumirFx = () => fx.splice(0);
export const consumirResultadoEvento = () => { const r = resultado; resultado = null; return r; };
const rnd = (a, b) => a + Math.random() * (b - a);
const nMagos = (state) => state.honguitos.mago || 0;
const nSold = (state) => state.honguitos.soldado || 0;
const fxPush = (e) => { if (fx.length < 80) fx.push(e); };

export function intervalo(state) {
  const n = Math.max(MAGOS_MIN, nMagos(state));
  const base = 200 / (1 + 0.7 * Math.log10(n / MAGOS_MIN)) / (1 + arteA(state, "arc_freq"));
  return Math.max(45, Math.min(400, base));
}

// ---- Defensa: cuántas criaturas derriban por segundo los soldados y la torre ----
export const fuerzaSoldados = (state) => 0.12 * Math.pow(nSold(state), 0.6) * (1 + 0.12 * nivelDef(state, "def_entrena"));
export const fuerzaTorre = (state) => (state.edificios.torre_defensa ? 0.4 + 0.3 * nivelDef(state, "def_canon") : 0);
export const probInterceptar = (state) => Math.min(0.95, arteA(state, "arc_meteoro") + (state.edificios.torre_defensa ? 0.1 * nivelDef(state, "def_cupula") : 0));

// ---- Artefactos del mercader ----
export function ofertasMercader(state) {
  if (!state.arte.ofertas) {
    const libres = ARTEFACTOS.filter((a) => !state.arte.tienen[a.id]);
    const pool = [...libres];
    const sel = [];
    while (sel.length < 5 && pool.length) sel.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
    state.arte.ofertas = sel;
  }
  return state.arte.ofertas;
}
export function precioArtefacto(state, id) {
  const a = ARTE_POR_ID[id];
  const p = produccionPorSeg(state);
  const base = p.mul(240 * a.cat).add(5000 * a.cat);
  return base.ceil();
}
export function comprarArtefacto(state, id) {
  if (!state.arte.ofertas || !state.arte.ofertas.includes(id)) return false;
  const c = precioArtefacto(state, id);
  if (state.esporas.lt(c)) return false;
  state.esporas = state.esporas.sub(c);
  state.arte.tienen[id] = true;
  state.arte.ofertas = null; // se quedó con uno: el mercader se lleva el resto
  if (ev && ev.tipo === "mercader") { ev.estado = "se va"; ev.t = Math.max(ev.t, 1); }
  return true;
}

// ---- Inicio de cada evento ----
function iniciar(state, tipo) {
  const A = state.arcano;
  A.eventos++;
  if (tipo === "invasion") { A.sinInvasion = 0; } else A.sinInvasion++;
  if (tipo === "tormenta") {
    const dur = 35 + arteA(state, "arc_tormenta_dur"), mult = 2.5 + 0.5 * Math.log2(1 + nMagos(state) / MAGOS_MIN) + arteA(state, "arc_tormenta_mult");
    A.tormenta = { mult, hasta: Date.now() + dur * 1000 };
    ev = { tipo, t: 0, dur, mult };
  } else if (tipo === "meteoros") {
    const n = Math.min(22, 6 + Math.floor(nMagos(state) / 10));
    ev = { tipo, t: 0, dur: 18, meteoros: [], pendientes: n, proximo: 1, total: n, interceptados: 0, impactos: 0, dano: [] };
  } else if (tipo === "mercader") {
    ofertasMercader(state);
    ev = { tipo, t: 0, dur: 100, dx: (Math.random() < 0.5 ? -1 : 1) * alcance * 0.9, estado: "llega" };
    ev.meta = (ev.dx < 0 ? -1 : 1) * 70;
  } else if (tipo === "invasion") {
    A.invasiones++;
    state.flags.invasion = true; // desbloquea la Barraca hongil
    const n = Math.min(16, 4 + Math.floor(A.invasiones * 0.7)), dur = 30 + arteA(state, "inv_tiempo") + 3 * nivelDef(state, "def_alerta");
    const hp = 1 + Math.floor(A.invasiones / 6);
    ev = { tipo, t: 0, dur, criaturas: [], derribadas: 0, robadas: 0, accSold: 0, accTorre: 0, esporas: D(0) };
    for (let i = 0; i < n; i++) {
      const lado = i % 2 ? 1 : -1, dist = alcance * rnd(0.85, 1.05);
      ev.criaturas.push({ dx: lado * dist, vx: -lado * (dist - 12) / (dur * rnd(0.7, 0.9)), hp, vivo: true, ret: rnd(0, 3), robo: false });
    }
  }
  fxPush({ tipo: "inicio", evento: tipo });
}

function elegir(state) {
  const A = state.arcano;
  if (A.sinInvasion >= 3 && !state.flags.invasion) return "invasion"; // la primera invasión no se hace esperar
  const r = Math.random() * 100;
  if (r < 32) return "tormenta";
  if (r < 52) return "meteoros";
  if (r < 76) return "mercader";
  return "invasion";
}

// ---- Daño al derribar / robo ----
function recompensaCriatura(state) {
  const botin = 1 + arteA(state, "inv_botin") + 0.25 * nivelDef(state, "def_botin");
  return produccionPorSeg(state).mul(20 * botin).ceil();
}
function matar(state, c, por) {
  if (!c.vivo) return;
  c.hp--;
  fxPush({ tipo: "golpe", dx: c.dx, por });
  if (c.hp > 0) return;
  c.vivo = false;
  ev.derribadas++;
  const g = recompensaCriatura(state);
  ev.esporas = ev.esporas.add(g);
  state.esporas = state.esporas.add(g);
  state.total = state.total.add(g);
  fxPush({ tipo: "kill", dx: c.dx, por });
}
export function golpearCriatura(state, c) { if (ev && ev.tipo === "invasion") matar(state, c, "mano"); }
function robar(state, c) {
  c.vivo = false; c.robo = true;
  ev.robadas++;
  state.arcano.robadas++;
  // roban un 12% del progreso del nivel actual de la barra de prestigio (nunca bajan de nivel)
  const pr = prestigio(state.total);
  if (pr.cur.gt(0)) state.total = state.total.sub(pr.cur.mul(0.12));
  fxPush({ tipo: "robo", dx: c.dx });
}

function terminar(state) {
  if (ev.tipo === "invasion") {
    for (const c of ev.criaturas) if (c.vivo) robar(state, c);
    if (ev.robadas === 0) state.arcano.repelidas++;
    resultado = { tipo: "invasion", derribadas: ev.derribadas, robadas: ev.robadas, esporas: ev.esporas, total: ev.criaturas.length };
  } else if (ev.tipo === "meteoros") {
    resultado = { tipo: "meteoros", interceptados: ev.interceptados, impactos: ev.impactos, total: ev.total };
  } else if (ev.tipo === "tormenta") resultado = { tipo: "tormenta" };
  ev = null;
  state.arcano.prox = intervalo(state);
}

export function tick(state, dt) {
  const A = state.arcano;
  if (!A) return;
  const nM = nMagos(state);
  if (!ev) {
    if (nM >= MAGOS_MIN && state.edificios.torre) {
      A.prox -= dt;
      if (A.prox <= 0) iniciar(state, elegir(state));
    }
    return;
  }
  let rest = Math.min(dt, 5);
  while (rest > 0 && ev) { const h = Math.min(rest, 0.1); rest -= h; paso(state, h); }
}

function bloqueoEdificio(state, dx) {
  let mejor = null, dmin = 45;
  for (const id in state.edificios) {
    const d = Math.abs((state.edificios[id].dx ?? 0) - dx);
    if (d < dmin) { dmin = d; mejor = id; }
  }
  return mejor;
}
function paso(state, dt) {
  ev.t += dt;
  if (ev.tipo === "tormenta") { if (ev.t >= ev.dur) terminar(state); return; }
  if (ev.tipo === "meteoros") {
    ev.proximo -= dt;
    if (ev.pendientes > 0 && ev.proximo <= 0) {
      ev.pendientes--; ev.proximo = rnd(0.35, 0.9);
      const inter = Math.random() < probInterceptar(state);
      ev.meteoros.push({ dx: rnd(-alcance, alcance), t: 0, caida: rnd(1.3, 1.9), inter, estado: "cae" });
    }
    for (const m of ev.meteoros) {
      if (m.estado === "hecho") continue;
      m.t += dt;
      if (m.estado === "cae" && m.inter && m.t >= m.caida * 0.55) {
        m.estado = "hecho"; ev.interceptados++;
        const g = produccionPorSeg(state).mul(8).ceil();
        state.esporas = state.esporas.add(g); state.total = state.total.add(g);
        fxPush({ tipo: "inter", dx: m.dx, torre: !!state.edificios.torre_defensa });
      } else if (m.estado === "cae" && !m.inter && m.t >= m.caida) {
        m.estado = "hecho"; ev.impactos++;
        const edif = bloqueoEdificio(state, m.dx);
        fxPush({ tipo: "impacto", dx: m.dx, edif });
        const prot = Math.min(0.9, 0.12 * nivelDef(state, "def_refuerzo"));
        if (edif) {
          for (const id in HONGUITOS) {
            if (HONGUITOS[id].casa !== edif) continue;
            const prev = meteoros[id] && meteoros[id].hasta > Date.now() ? meteoros[id].f : 0;
            meteoros[id] = { f: Math.min(0.9, prev + 0.3 * (1 - prot)), hasta: Date.now() + 45000 };
          }
        } else if (Math.abs(m.dx) < 14) {
          const prev = meteoros.basico && meteoros.basico.hasta > Date.now() ? meteoros.basico.f : 0;
          meteoros.basico = { f: Math.min(0.9, prev + 0.2 * (1 - prot)), hasta: Date.now() + 30000 };
        }
      }
    }
    if (ev.pendientes <= 0 && ev.meteoros.every((m) => m.estado === "hecho") && ev.t > 3) terminar(state);
    return;
  }
  if (ev.tipo === "mercader") {
    if (ev.estado === "llega") {
      ev.dx += Math.sign(ev.meta - ev.dx) * 22 * dt;
      if (Math.abs(ev.meta - ev.dx) < 3) { ev.dx = ev.meta; ev.estado = "espera"; }
    } else if (ev.estado === "espera") {
      if (ev.t > ev.dur) ev.estado = "se va";
    } else {
      ev.dx += Math.sign(ev.dx || 1) * 26 * dt;
      if (Math.abs(ev.dx) > alcance) { state.arte.ofertas = null; ev = null; state.arcano.prox = intervalo(state); }
    }
    return;
  }
  if (ev.tipo === "invasion") {
    const vivos = ev.criaturas.filter((c) => c.vivo);
    for (const c of vivos) {
      c.ret -= dt;
      if (c.ret > 0) continue;
      c.dx += c.vx * dt;
      if (Math.abs(c.dx) < 14) robar(state, c);
    }
    ev.accSold += dt * fuerzaSoldados(state);
    ev.accTorre += dt * fuerzaTorre(state);
    while (ev.accSold >= 1 && ev.criaturas.some((c) => c.vivo)) { ev.accSold--; const v = ev.criaturas.filter((c) => c.vivo); matar(state, v[Math.floor(Math.random() * v.length)], "soldado"); }
    while (ev.accTorre >= 1 && ev.criaturas.some((c) => c.vivo)) { ev.accTorre--; const v = ev.criaturas.filter((c) => c.vivo); matar(state, v[Math.floor(Math.random() * v.length)], "torre"); }
    if (!ev.criaturas.some((c) => c.vivo) || ev.t > ev.dur + 4) terminar(state);
  }
}

// para probar: ?arcano=tormenta|meteoros|mercader|invasion fuerza un evento
export function forzarEvento(state, tipo) { if (ev) return false; iniciar(state, tipo); return true; }
