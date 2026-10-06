// Eventos arcanos: desde que hay 10 magos en la Torre, cada tanto pasa algo en el mapa: una tormenta de
// esporas, una lluvia de meteoritos, una esporada, la visita del Mercader hongil o una invasión de ladrones de esporas.
// La primera invasión desbloquea la Barraca hongil. Acá está la lógica; la escena los dibuja.

import { D } from './decimal.js';
import { buffCrisis } from './puData.js';
import { prestigio, meteoros, produccionPorSeg, sumarAlPiso, sitioMasCercano } from './engine.js';
import { HONGUITOS } from './data.js';
import { ARTEFACTOS, ARTE_POR_ID, arteA, arteM, sortearOfertas } from './artefactos.js';
import { crearInvasion, pasoInvasion, terminada, cerrarInvasion, danar, danoClick } from './invasion.js';

export const MAGOS_MIN = 10;

// ---- Mejoras de la Barraca y de la Torre de defensa (niveles guardados en state.mejoras) ----
export const DEF_MEJ = [
  { id: "def_entrena", edificio: "barraca", nombre: "Entrenamiento", max: 10, costo: D(5e14), esc: 1.9, desc: (n) => `Los soldados y todas las torres hacen un 15% más de daño por nivel (ahora +${15 * n}%).` },
  { id: "def_alerta", edificio: "barraca", nombre: "Atalaya de alerta", max: 6, costo: D(2e15), esc: 2.2, desc: (n) => `Los invasores avanzan más lento (las invasiones tardan ~3 s más en llegar por nivel; ahora +${3 * n} s).` },
  { id: "def_botin", edificio: "barraca", nombre: "Botín de guerra", max: 6, costo: D(1e15), esc: 2.1, desc: (n) => `Cada enemigo derrotado deja un 25% más de esporas por nivel (ahora +${25 * n}%).` },
  { id: "def_cupula", edificio: "barraca", torres: true, nombre: "Cúpula antimeteoritos", max: 8, costo: D(1.2e16), esc: 2.1, desc: (n) => `Las torres interceptan un ${10 * n}% de los meteoritos (+10% por nivel); los interceptados dejan esporas.` },
  { id: "def_refuerzo", edificio: "barraca", torres: true, nombre: "Refuerzo de edificios", max: 6, costo: D(1e16), esc: 2.2, desc: (n) => `Los meteoritos que igual caen dañan un ${12 * n}% menos a los edificios y honguitos (+12% por nivel).` },
];
export const DEF_POR_ID = Object.fromEntries(DEF_MEJ.map((m) => [m.id, m]));
export const nivelDef = (state, id) => { const v = state.mejoras[id]; return typeof v === "number" ? v : 0; };
export const costoDef = (state, m) => m.costo.mul(D(m.esc).pow(nivelDef(state, m.id))).ceil();
export function comprarDef(state, id) {
  const m = DEF_POR_ID[id];
  if (!m || !state.edificios[m.edificio] || (m.torres && !state.torres.length)) return false;
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
let alcanceVista = 300; // mitad del ancho visible con el zoom al máximo alejado (los invasores nacen más allá)
export const setAlcance = (a, vista = 0) => { alcance = Math.max(120, Math.min(a, 600)); alcanceVista = Math.max(alcance, vista); };
export const consumirFx = () => fx.splice(0);
export const consumirResultadoEvento = () => { const r = resultado; resultado = null; return r; };
const rnd = (a, b) => a + Math.random() * (b - a);
const nMagos = (state) => state.honguitos.mago || 0;
const nSold = (state) => state.honguitos.soldado || 0;
const fxPush = (e) => { if (fx.length < 160) fx.push(e); };

export function intervalo(state) {
  const n = Math.max(MAGOS_MIN, nMagos(state));
  const base = 200 / (1 + 0.7 * Math.log10(n / MAGOS_MIN)) / (1 + arteA(state, "arc_freq"));
  return Math.max(45, Math.min(400, base));
}

// ---- Defensa: ver invasion.js ----
export const probInterceptar = (state) => Math.min(0.95, arteA(state, "arc_meteoro") + (state.torres.length ? 0.1 * nivelDef(state, "def_cupula") : 0));

// ---- Artefactos del mercader ----
export function ofertasMercader(state) {
  if (!state.arte.ofertas) {
    state.arte.ofertas = sortearOfertas(state, prestigio(state.total).puntos);
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
    const n = Math.min(45, 16 + Math.floor(nMagos(state) / 5));
    ev = { tipo, t: 0, dur: 35, meteoros: [], pendientes: n, proximo: 1, total: n, interceptados: 0, impactos: 0, dano: [] };
  } else if (tipo === "mercader") {
    ofertasMercader(state);
    ev = { tipo, t: 0, dur: 100, dx: (Math.random() < 0.5 ? -1 : 1) * alcance * 0.9, estado: "llega" };
    ev.meta = (ev.dx < 0 ? -1 : 1) * 70;
  } else if (tipo === "esporada") {
    const n = Math.round(Math.min(40, 12 + Math.floor(prestigio(state.total).puntos / 4)) * (1 + arteA(state, "esporada_n")));
    ev = { tipo, t: 0, pendientes: n, proximo: 0.4, total: n, esporasV: [], cobradas: 0, cristalinas: 0, esporas: D(0), nextId: 1 };
  } else if (tipo === "cristales") {
    const n = Math.min(14, 6 + Math.floor(prestigio(state.total).puntos / 10));
    const cris = [];
    for (let i = 0; i < n; i++) cris.push({ id: i + 1, dx: -alcance * 0.85 + (i + 0.5) * ((alcance * 1.7) / n) + rnd(-8, 8), t: -rnd(0, 5), crece: rnd(6, 9), vida: 0, estado: "crece", ci: Math.floor(Math.random() * 5), gigante: Math.random() < 0.12 });
    for (const c of cris) c.vida = c.crece + rnd(3.5, 5);
    ev = { tipo, t: 0, cris, cosechadas: 0, rotas: 0, esporas: D(0) };
  } else if (tipo === "geiser") {
    const n = Math.min(9, 4 + Math.floor(prestigio(state.total).puntos / 15));
    const geis = [];
    for (let i = 0; i < n; i++) geis.push({ id: i + 1, dx: -alcance * 0.85 + (i + 0.5) * ((alcance * 1.7) / n) + rnd(-6, 6), prox: rnd(0.3, 2), cd: 0 });
    ev = { tipo, t: 0, dur: 18, geis, erupciones: 0, toques: 0, esporas: D(0) };
  } else if (tipo === "invasion") {
    A.invasiones++;
    state.flags.invasion = true; // desbloquea la Barraca hongil
    ev = crearInvasion(state, alcanceVista);
  }
  buffCrisis(state);
  fxPush({ tipo: "inicio", evento: tipo });
}

// Eventos arcanos con tier, peso y nivel de prestigio mínimo (como las calamidades de la wiki de Dwarf Eats Mountain)
export const EVENTOS_ARCANOS = [
  { tipo: "tormenta", tier: 1, min: 0, peso: 32 },
  { tipo: "mercader", tier: 1, min: 0, peso: 24 },
  { tipo: "esporada", tier: 2, min: 6, peso: 22 },
  { tipo: "geiser", tier: 2, min: 10, peso: 20 },
  { tipo: "cristales", tier: 3, min: 20, peso: 18 },
  { tipo: "meteoros", tier: 2, min: 0, peso: 20 },
  { tipo: "invasion", tier: 3, min: 0, peso: 24 },
];
function elegir(state) {
  const A = state.arcano;
  if (A.sinInvasion >= 3 && !state.flags.invasion) return "invasion"; // la primera invasión no se hace esperar
  const nivel = prestigio(state.total).puntos;
  const pool = EVENTOS_ARCANOS.filter((e) => nivel >= e.min);
  let r = Math.random() * pool.reduce((t, e) => t + e.peso, 0);
  for (const e of pool) { r -= e.peso; if (r < 0) return e.tipo; }
  return pool[0].tipo;
}

// Brote de cristales: hongo-cristales brotan del piso y crecen; cuanto más grandes los cosechás, más rinden, pero si esperás de más se rompen.
export const crecimientoCristal = (c) => Math.max(0, Math.min(1, c.t / c.crece));
export function cosecharCristal(state, c) {
  if (!ev || ev.tipo !== "cristales" || c.t < 0 || c.estado === "hecha" || c.estado === "rota") return null;
  const f = Math.max(0.15, crecimientoCristal(c));
  const v = produccionPorSeg(state).mul((10 + 70 * f * f) * (c.gigante ? 2.5 : 1) * rnd(0.9, 1.1) * arteM(state, "dorada_val")).ceil();
  const ganancia = v.lt(13) ? D(13) : v;
  state.esporas = state.esporas.add(ganancia); state.total = state.total.add(ganancia);
  c.estado = "hecha"; c.f = f;
  ev.cosechadas++; ev.esporas = ev.esporas.add(ganancia);
  fxPush({ tipo: "cristal", dx: c.dx, ci: c.ci, f, gigante: c.gigante });
  return ganancia;
}

// Géiser de esporas: brotan géiseres a lo largo del piso y sueltan esporas en las pilas (los básicos las tienen que llevar).
// Tocar un géiser lo hace erupcionar en grande.
function erupcion(state, gs, grande) {
  const v = produccionPorSeg(state).mul((grande ? 12 * arteM(state, "geiser_val") : 3) * rnd(0.8, 1.3)).ceil();
  const valor = v.lt(6) ? D(6) : v;
  const n = grande ? 14 : 5;
  sumarAlPiso(state, sitioMasCercano(state, gs.dx), valor, n); // caen al piso: hay que llevarlas
  ev.erupciones++; ev.esporas = ev.esporas.add(valor);
  fxPush({ tipo: "geiser", dx: gs.dx, grande });
  return valor;
}
export function tocarGeiser(state, gs) {
  if (!ev || ev.tipo !== "geiser" || gs.cd > 0) return null;
  gs.cd = 0.5; ev.toques++;
  return erupcion(state, gs, true);
}

// Esporada: una nube suelta esporas que flotan hacia el piso; tocarlas las junta y da esporas (las que no tocás se pierden).
// Algunas son esporas cristalinas (hongo-cristal): valen el triple.
export function recolectarEspora(state, sp) {
  if (!ev || ev.tipo !== "esporada" || (sp.estado !== "cae" && sp.estado !== "suelo")) return null;
  sp.estado = "hecha";
  const v = produccionPorSeg(state).mul(rnd(20, 45) * (sp.cristal ? 3 : 1) * arteM(state, "dorada_val")).ceil();
  const ganancia = v.lt(13) ? D(13) : v;
  state.esporas = state.esporas.add(ganancia); state.total = state.total.add(ganancia);
  ev.cobradas++; if (sp.cristal) ev.cristalinas++; ev.esporas = ev.esporas.add(ganancia);
  fxPush({ tipo: "espora", dx: sp.dx, col: sp.col, cristal: sp.cristal });
  return ganancia;
}

export function golpearCriatura(state, c) { if (ev && ev.tipo === "invasion") danar(state, ev, c, danoClick(ev), "mano", fxPush); }

function terminar(state) {
  if (ev.tipo === "invasion") {
    resultado = cerrarInvasion(state, ev, fxPush);
  } else if (ev.tipo === "meteoros") {
    resultado = { tipo: "meteoros", interceptados: ev.interceptados, impactos: ev.impactos, total: ev.total, dano: ev.dano };
  } else if (ev.tipo === "tormenta") resultado = { tipo: "tormenta" };
  else if (ev.tipo === "cristales") resultado = { tipo: "cristales", cosechadas: ev.cosechadas, rotas: ev.rotas, total: ev.cris.length, esporas: ev.esporas };
  else if (ev.tipo === "geiser") resultado = { tipo: "geiser", erupciones: ev.erupciones, toques: ev.toques, esporas: ev.esporas };
  else if (ev.tipo === "esporada") resultado = { tipo: "esporada", cobradas: ev.cobradas, cristalinas: ev.cristalinas, total: ev.total, esporas: ev.esporas };
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
      ev.pendientes--; ev.proximo = rnd(0.4, 1.5);
      const inter = Math.random() < probInterceptar(state);
      ev.meteoros.push({ dx: rnd(-alcance, alcance), t: 0, caida: rnd(2, 2.8), inter, estado: "cae" });
    }
    for (const m of ev.meteoros) {
      if (m.estado === "hecho") continue;
      m.t += dt;
      if (m.estado === "cae" && m.inter && m.t >= m.caida * 0.55) {
        m.estado = "hecho"; ev.interceptados++;
        const g = produccionPorSeg(state).mul(8).ceil();
        state.esporas = state.esporas.add(g); state.total = state.total.add(g);
        fxPush({ tipo: "inter", dx: m.dx, torre: state.torres.length > 0 });
      } else if (m.estado === "cae" && !m.inter && m.t >= m.caida) {
        m.estado = "hecho"; ev.impactos++;
        const edif = bloqueoEdificio(state, m.dx);
        fxPush({ tipo: "impacto", dx: m.dx, edif });
        const prot = Math.min(0.9, 0.12 * nivelDef(state, "def_refuerzo"));
        if (edif) {
          for (const id in HONGUITOS) {
            if (HONGUITOS[id].casa !== edif) continue;
            const prev = meteoros[id] && meteoros[id].hasta > Date.now() ? meteoros[id].f : 0;
            meteoros[id] = { f: Math.min(0.9, prev + 0.5 * (1 - prot)), hasta: Date.now() + 60000 };
          }
          if (!ev.dano.includes(edif)) ev.dano.push(edif);
        } else if (Math.abs(m.dx) < 30) {
          if (!ev.dano.includes("basico")) ev.dano.push("basico");
          const prev = meteoros.basico && meteoros.basico.hasta > Date.now() ? meteoros.basico.f : 0;
          meteoros.basico = { f: Math.min(0.9, prev + 0.35 * (1 - prot)), hasta: Date.now() + 45000 };
        }
      }
    }
    if (ev.pendientes <= 0 && ev.meteoros.every((m) => m.estado === "hecho") && ev.t > 3) terminar(state);
    return;
  }
  if (ev.tipo === "cristales") {
    for (const c of ev.cris) {
      if (c.estado === "hecha" || c.estado === "rota") continue;
      c.t += dt;
      if (c.estado === "crece" && c.t >= c.crece) c.estado = "maduro";
      if (c.t >= c.vida) { c.estado = "rota"; ev.rotas++; fxPush({ tipo: "cristal_roto", dx: c.dx, ci: c.ci }); }
    }
    if (ev.cris.every((c) => c.estado === "hecha" || c.estado === "rota") && ev.t > 3) terminar(state);
    return;
  }
  if (ev.tipo === "geiser") {
    for (const gs of ev.geis) {
      gs.cd = Math.max(0, gs.cd - dt);
      gs.prox -= dt;
      if (gs.prox <= 0 && ev.t < ev.dur) { erupcion(state, gs, false); gs.prox = rnd(1.4, 2.6) / (1 + arteA(state, "geiser_freq")); }
    }
    if (ev.t >= ev.dur + 1) terminar(state);
    return;
  }
  if (ev.tipo === "esporada") {
    ev.proximo -= dt;
    if (ev.pendientes > 0 && ev.proximo <= 0) {
      ev.pendientes--; ev.proximo = rnd(0.25, 0.9);
      ev.esporasV.push({ id: ev.nextId++, dx: rnd(-alcance * 0.85, alcance * 0.85), t: 0, caida: rnd(3.2, 5), vida: 8 + Math.random() * 3, estado: "cae", col: Math.floor(Math.random() * 6), cristal: Math.random() < 0.18 + arteA(state, "esporada_cristal"), ci: Math.floor(Math.random() * 5) });
    }
    for (const sp of ev.esporasV) {
      if (sp.estado === "hecha" || sp.estado === "perdida") continue;
      sp.t += dt;
      if (sp.estado === "cae" && sp.t >= sp.caida) {
        sp.estado = "suelo";
        if (Math.random() < Math.min(0.9, arteA(state, "autoevento"))) recolectarEspora(state, sp); // las «redes del cielo» las juntan solas
      } else if (sp.estado === "suelo" && sp.t >= sp.caida + sp.vida) sp.estado = "perdida";
    }
    if (ev.pendientes <= 0 && ev.esporasV.every((q) => q.estado === "hecha" || q.estado === "perdida") && ev.t > 2) terminar(state);
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
    pasoInvasion(state, ev, dt, fxPush);
    if (terminada(ev)) terminar(state);
  }
}

// para probar: ?arcano=tormenta|meteoros|mercader|invasion fuerza un evento
export function forzarEvento(state, tipo) { if (ev) return false; iniciar(state, tipo); return true; }
