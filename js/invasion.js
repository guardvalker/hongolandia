// Invasiones y defensa: hordas de enemigos de varios tipos que entran desde los bordes del mundo, el ejército
// de soldados de la Barraca y las torres (que evolucionan a especiales y consumen soldados para mejorar).
// Acá está solo la lógica; la escena dibuja. `push` es el emisor de efectos de eventos.js.

import { D } from './decimal.js';
import { prestigio, produccionPorSeg } from './engine.js';
import { arteA } from './artefactos.js';

export const TORRES_MAX = 8;
export const SOLD_MAX = 10;

export const TIPOS_TORRE = {
  basica: { nombre: "Torre básica", color: "#c8673a", rango: 70, dano: 1, cd: 0.85, aire: true, desc: "Dispara a un blanco a la vez, en tierra y aire. Puede evolucionar a una torre especial." },
  rapida: { nombre: "Torre de ráfaga", color: "#ffd23f", rango: 62, dano: 0.4, cd: 0.17, aire: true, desc: "Disparo rapidísimo de poco daño y poco alcance: ideal contra enjambres." },
  sniper: { nombre: "Francotiradora", color: "#7fe9ff", rango: 210, dano: 6, cd: 1.3, aire: true, prio: "fuerte", desc: "Muchísimo alcance y un daño enorme por disparo; apunta al enemigo más duro." },
  aoe: { nombre: "Mortero explosivo", color: "#ff5a14", rango: 105, dano: 1.6, cd: 1.5, aire: false, radio: 26, desc: "Cada disparo explota y daña a todo el grupo en tierra (no alcanza a los voladores)." },
  hielo: { nombre: "Torre criogénica", color: "#9fd8ff", rango: 88, dano: 0.35, cd: 0.7, aire: true, radio: 18, lento: 3, desc: "Congela: ralentiza a la mitad a los enemigos que golpea y a los que tiene cerca." },
  rayo: { nombre: "Torre Tesla", color: "#c58aff", rango: 95, dano: 1.1, cd: 1.2, aire: true, cadena: 4, desc: "Rayo que salta en cadena entre enemigos cercanos, tierra y aire." },
};
export const EVOLUCIONES = ["rapida", "sniper", "aoe", "hielo", "rayo"];

export const ENEMIGOS = {
  saqueador: { nombre: "Saqueador", hp: 1, vel: 13, parar: 12, robo: 0.03, premio: 1 },
  arquero: { nombre: "Arquero ladrón", hp: 0.7, vel: 11, parar: 58, tcarga: 2.5, robo: 0.025, premio: 1.2 },
  hechicero: { nombre: "Hechicero", hp: 1.5, vel: 8, parar: 98, tcarga: 3.5, robo: 0.04, premio: 2.5 },
  murcielago: { nombre: "Murciélago", hp: 0.5, vel: 28, parar: 10, robo: 0.02, premio: 1.4, aire: true },
  jefe: { nombre: "Behemoth", hp: 14, vel: 6, parar: 16, robo: 0.12, premio: 25 },
};

const rnd = (a, b) => a + Math.random() * (b - a);
const nivelEntrena = (state) => (typeof state.mejoras.def_entrena === "number" ? state.mejoras.def_entrena : 0);
const multEntrena = (state) => 1 + 0.15 * nivelEntrena(state);
const nSold = (state) => state.honguitos.soldado || 0;
const nivelPrestigio = (state) => prestigio(state.total).puntos;
// unidad de poder: crece con el prestigio tanto para el daño de torres y soldados como para la vida de los enemigos;
// los enemigos crecen un poco más rápido (1,035^nivel) y por eso hace falta más ejército, torres y mejoras.
const unidad = (state) => 12 * Math.pow(1.09, nivelPrestigio(state));

// ---- Costos ----
export const costoTorre = (state) => D(2e12).mul(D(2.3).pow(state.torres.length)).ceil();
export const evolucionadas = (state) => state.torres.filter((t) => t.tipo !== "basica").length;
export const costoEvolucion = (state) => D(1.5e13).mul(D(1.7).pow(evolucionadas(state))).ceil();

export function construirTorre(state, dx) {
  if (!state.edificios.barraca || state.torres.length >= TORRES_MAX) return false;
  const c = costoTorre(state);
  if (state.esporas.lt(c)) return false;
  state.esporas = state.esporas.sub(c);
  state.torres.push({ dx, tipo: "basica", sold: 0 });
  return true;
}
export function evolucionarTorre(state, i, tipo) {
  const t = state.torres[i];
  if (!t || t.tipo !== "basica" || !EVOLUCIONES.includes(tipo)) return false;
  const c = costoEvolucion(state);
  if (state.esporas.lt(c)) return false;
  state.esporas = state.esporas.sub(c);
  t.tipo = tipo;
  return true;
}
// Un soldado entra a la torre para siempre: ya no camina ni defiende por su cuenta.
export function sumarSoldados(state, i, n = 1) {
  const t = state.torres[i];
  if (!t) return 0;
  const k = Math.min(n, SOLD_MAX - t.sold, nSold(state));
  if (k <= 0) return 0;
  state.honguitos.soldado -= k;
  t.sold += k;
  return k;
}

// ---- Estadísticas ----
export function statsTorre(state, t) {
  const T = TIPOS_TORRE[t.tipo], s = t.sold, m = multEntrena(state);
  return {
    ...T,
    dano: unidad(state) * T.dano * (1 + 0.12 * s) * m,
    cd: T.cd / (1 + 0.06 * s),
    rango: T.rango * (1 + 0.035 * s),
    canones: 1 + Math.floor(s / 3),
  };
}
export const dpsTorre = (state, t) => { const S = statsTorre(state, t); return (S.dano * S.canones) / S.cd; };
// daño por segundo del ejército de soldados (solo enemigos terrestres cerca de la base)
export const dpsSoldados = (state) => 0.9 * unidad(state) * Math.pow(nSold(state), 0.8) * multEntrena(state);
export const hpBase = (state) => 3 * unidad(state) * Math.pow(1.035, nivelPrestigio(state)) * (1 + 0.04 * (state.arcano?.invasiones || 0));
export const danoClick = (ev) => 0.5 * ev.H;

export function infoDefensa(state) {
  const n = state.torres.length;
  const dpsT = state.torres.reduce((a, t) => a + dpsTorre(state, t), 0);
  return `Ejército: ${Math.round(nSold(state))} soldados, ${Math.round(dpsSoldados(state))} de daño/s en tierra. Torres: ${n}/${TORRES_MAX}, ${Math.round(dpsT)} de daño/s. Enemigos de la próxima invasión: ${Math.round(hpBase(state))} de vida base (sube con el prestigio).`;
}

// ---- Creación de la invasión ----
export function crearInvasion(state, alcance) {
  const A = state.arcano, inv = A.invasiones, L = nivelPrestigio(state), H = hpBase(state);
  const N = Math.min(130, Math.round((inv <= 1 ? 30 : 36) + 1.3 * L + 2 * inv));
  const pesos = inv <= 1 ? [["saqueador", 70], ["arquero", 30]] : inv === 2 ? [["saqueador", 50], ["arquero", 30], ["murcielago", 20]] : [["saqueador", 38], ["arquero", 24], ["hechicero", 16], ["murcielago", 22]];
  const tot = pesos.reduce((a, [, w]) => a + w, 0);
  const elegir = () => { let r = Math.random() * tot; return (pesos.find(([, w]) => (r -= w) < 0) || pesos[0])[0]; };
  const olas = 4 + Math.floor(N / 22);
  const tOla = 42 / olas;
  const lento = 1 / (1 + (arteA(state, "inv_tiempo") + 3 * (typeof state.mejoras.def_alerta === "number" ? state.mejoras.def_alerta : 0)) / 60);
  const lista = [];
  for (let i = 0; i < N; i++) lista.push(elegir());
  if (inv >= 3 && inv % 3 === 0) for (let k = 0; k < Math.min(3, 1 + Math.floor(inv / 9)); k++) lista.push("jefe");
  const criaturas = lista.map((tipo, i) => {
    const E = ENEMIGOS[tipo];
    const ola = tipo === "jefe" ? olas - 1 : Math.floor((i / N) * olas);
    const lado = Math.random() < 0.5 ? -1 : 1;
    const hp = H * E.hp;
    return {
      tipo, lado, dx: lado * (alcance + 22 + rnd(0, 22)), y: E.aire ? rnd(18, 42) : 0,
      hp, hpMax: hp, ret: ola * tOla + rnd(0, tOla * 0.8), vel: E.vel * lento * rnd(0.9, 1.1), vivo: true, entro: false,
      carga: 0, lento: 0, esc: false, bloq: false, robo: false, fase: Math.random() * 6,
    };
  });
  const finSpawn = Math.max(...criaturas.map((c) => c.ret));
  return { tipo: "invasion", t: 0, dur: finSpawn + 45, H, criaturas, derribadas: 0, robadas: 0, esporas: D(0), perdido: D(0), techo: null, techoF: inv <= 1 ? 0.4 : 0.75, torres: [] };
}

// ---- Daño / robo ----
function recompensa(state, c) {
  const botin = 1 + arteA(state, "inv_botin") + 0.25 * (typeof state.mejoras.def_botin === "number" ? state.mejoras.def_botin : 0);
  return produccionPorSeg(state).mul(3 * botin * ENEMIGOS[c.tipo].premio).ceil();
}
export function danar(state, ev, c, d, por, push) {
  if (!c.vivo) return;
  c.hp -= c.esc ? d * 0.7 : d;
  if (c.hp > 0) { if (por === "mano") push({ tipo: "golpe", dx: c.dx, por }); return; }
  c.vivo = false;
  ev.derribadas++;
  const g = recompensa(state, c);
  ev.esporas = ev.esporas.add(g);
  state.esporas = state.esporas.add(g);
  state.total = state.total.add(g);
  push({ tipo: "kill", dx: c.dx, y: c.y, por, grande: c.tipo === "jefe", enemigo: c.tipo });
}
function robar(state, ev, c, push) {
  c.vivo = false; c.robo = true;
  ev.robadas++;
  state.arcano.robadas++;
  const pr = prestigio(state.total);
  if (ev.techo === null) ev.techo = pr.cur.mul(ev.techoF); // en toda la invasión no pueden robar más de esa fracción del nivel actual (la primera es más suave)
  let q = pr.cur.mul(ENEMIGOS[c.tipo].robo);
  const resto = ev.techo.sub(ev.perdido);
  if (q.gt(resto)) q = resto.lt(0) ? D(0) : resto;
  if (q.gt(0)) { state.total = state.total.sub(q); ev.perdido = ev.perdido.add(q); }
  push({ tipo: "robo", dx: c.dx, y: c.y });
}

// ---- Un paso de simulación ----
export function pasoInvasion(state, ev, dt, push) {
  const vivos = ev.criaturas.filter((c) => c.vivo && c.ret <= 0);
  for (const c of ev.criaturas) if (c.vivo && c.ret > 0) c.ret -= dt;
  for (const c of vivos) { c.esc = false; c.bloq = false; c.lento = Math.max(0, c.lento - dt); }
  // los hechiceros protegen a los que tienen cerca (reciben un 30% menos de daño)
  for (const h of vivos) if (h.tipo === "hechicero") for (const c of vivos) if (Math.abs(c.dx - h.dx) < 36) c.esc = true;

  // ejército: reparte su daño entre los enemigos terrestres más cercanos a la base; los cuerpo a cuerpo quedan trabados peleando
  const sold = nSold(state);
  if (sold > 0) {
    const objetivos = vivos.filter((c) => c.tipo !== "murcielago" && Math.abs(c.dx) < 250).sort((a, b) => Math.abs(a.dx) - Math.abs(b.dx)).slice(0, Math.min(10, Math.ceil(sold / 5)));
    if (objetivos.length) {
      const d = (dpsSoldados(state) * dt) / objetivos.length;
      for (const c of objetivos) { if (c.tipo === "saqueador" || c.tipo === "jefe") c.bloq = true; danar(state, ev, c, d, "soldado", push); }
    }
  }

  // torres
  while (ev.torres.length < state.torres.length) ev.torres.push({ cd: 0 });
  state.torres.forEach((t, i) => {
    const R = ev.torres[i];
    R.cd -= dt;
    if (R.cd > 0) return;
    const S = statsTorre(state, t);
    const candidatos = vivos.filter((c) => c.vivo && (S.aire || c.tipo !== "murcielago") && Math.abs(c.dx - t.dx) <= S.rango);
    if (!candidatos.length) { R.cd = 0; return; }
    candidatos.sort(S.prio === "fuerte" ? (a, b) => b.hp - a.hp : (a, b) => Math.abs(a.dx) - Math.abs(b.dx));
    R.cd = S.cd;
    for (let k = 0; k < S.canones && k < candidatos.length; k++) {
      const c = candidatos[k];
      const x1 = c.dx, y1 = c.y;
      if (t.tipo === "aoe") {
        for (const o of vivos) if (o.vivo && o.tipo !== "murcielago" && Math.abs(o.dx - c.dx) <= S.radio) danar(state, ev, o, S.dano, "torre", push);
        push({ tipo: "disparo", torre: i, kind: "aoe", x1, y1, radio: S.radio });
      } else if (t.tipo === "hielo") {
        for (const o of vivos) if (o.vivo && Math.abs(o.dx - c.dx) <= S.radio && (S.aire || o.tipo !== "murcielago")) { o.lento = S.lento; danar(state, ev, o, S.dano, "torre", push); }
        push({ tipo: "disparo", torre: i, kind: "hielo", x1, y1, radio: S.radio });
      } else if (t.tipo === "rayo") {
        const cadena = [{ x: x1, y: y1 }];
        const tocados = new Set([c]);
        let cur = c, d = S.dano;
        danar(state, ev, c, d, "torre", push);
        for (let j = 0; j < S.cadena; j++) {
          let mejor = null, dm = 48;
          for (const o of vivos) if (o.vivo && !tocados.has(o)) { const dd = Math.hypot(o.dx - cur.dx, (o.y - cur.y) * 0.6); if (dd < dm) { dm = dd; mejor = o; } }
          if (!mejor) break;
          tocados.add(mejor); cur = mejor; d *= 0.85;
          danar(state, ev, mejor, d, "torre", push);
          cadena.push({ x: mejor.dx, y: mejor.y });
        }
        push({ tipo: "disparo", torre: i, kind: "rayo", x1, y1, cadena });
      } else {
        danar(state, ev, c, S.dano, "torre", push);
        push({ tipo: "disparo", torre: i, kind: t.tipo, x1, y1 });
      }
    }
  });

  // movimiento y robo
  for (const c of vivos) {
    if (!c.vivo) continue;
    const E = ENEMIGOS[c.tipo];
    c.entro = true;
    if (Math.abs(c.dx) > E.parar) {
      if (!c.bloq) { const v = c.vel * (c.lento > 0 ? 0.5 : 1); c.dx -= Math.sign(c.dx) * Math.min(v * dt, Math.abs(c.dx) - E.parar + 0.01); }
    } else if (E.tcarga) {
      c.carga += dt;
      if (c.carga >= E.tcarga) robar(state, ev, c, push);
    } else robar(state, ev, c, push);
  }
}

export const quedan = (ev) => ev.criaturas.reduce((a, c) => a + (c.vivo ? 1 : 0), 0);
// fin de la invasión: cuando ya no queda nadie o pasó demasiado tiempo (los que quedan roban de una)
export function terminada(ev) { return quedan(ev) === 0 || ev.t > ev.dur + 40; }
export function cerrarInvasion(state, ev, push) {
  for (const c of ev.criaturas) if (c.vivo) robar(state, ev, c, push);
  if (ev.robadas === 0) state.arcano.repelidas++;
  const cur0 = ev.techo ? ev.techo.div(ev.techoF) : D(0);
  return { tipo: "invasion", derribadas: ev.derribadas, robadas: ev.robadas, esporas: ev.esporas, total: ev.criaturas.length, perdidoPct: cur0.gt(0) ? Math.round(ev.perdido.div(cur0).toNumber() * 100) : 0 };
}
