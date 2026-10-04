// Dungeon y taberna: lógica pura (sin DOM). Los mercenarios son honguitos guerreros de 10 clases que
// se contratan en la Taberna hongil. Un party de hasta 4 explora la dungeon sola, de izquierda a derecha,
// en 5 etapas (la última tiene un jefe). Nadie muere: el que cae queda herido y no puede salir hasta
// que se hagan nuevas exploraciones. Los jefes dan cristales radiantes que suben la producción.

import { D } from './decimal.js';
import { produccionPorSeg } from './engine.js';

export const PARTY_MAX = 4;
export const ETAPAS_DUNGEON = 5;
export const CRISTAL_MULT = 1.05; // cada cristal radiante: producción ×1,05 (se aplica en engine.multiplicador)

// ---- Clases de mercenarios ----
// hp/atk/def/int (segundos entre ataques) a nivel 1; cada nivel suma un 4% a vida y ataque.
export const CLASES = [
  { id: "caballero", nombre: "Caballero", rol: "Tanque", color: "#9db4c8", hp: 150, atk: 12, def: 6, int: 1.2, rango: 14, desc: "Espadazos y provoca: los enemigos lo prefieren como blanco." },
  { id: "arquero", nombre: "Arquero", rol: "Distancia", color: "#3fe08a", hp: 80, atk: 14, def: 2, int: 0.9, rango: 70, desc: "Flechas rápidas; cada tanto suelta una lluvia de flechas." },
  { id: "mago", nombre: "Mago", rol: "Daño en área", color: "#a77bff", hp: 70, atk: 20, def: 1, int: 1.8, rango: 60, desc: "Bolas de fuego que también queman a los enemigos de al lado." },
  { id: "curandero", nombre: "Curandero", rol: "Apoyo", color: "#f5f5f5", hp: 85, atk: 4, def: 2, int: 1.4, rango: 50, desc: "Cura al compañero más herido." },
  { id: "invocador", nombre: "Invocador", rol: "Invocación", color: "#4fb4ff", hp: 80, atk: 6, def: 2, int: 2.0, rango: 55, desc: "Invoca espíritus que pelean por un rato." },
  { id: "picaro", nombre: "Pícaro", rol: "Crítico", color: "#5a5a78", hp: 90, atk: 9, def: 3, int: 0.55, rango: 14, desc: "Puñaladas muy rápidas con muchos golpes críticos; roba botín extra." },
  { id: "barbaro", nombre: "Bárbaro", rol: "Daño bruto", color: "#d94a2b", hp: 130, atk: 16, def: 3, int: 1.4, rango: 14, desc: "Hachazos que pegan más fuerte cuanto más herido está." },
  { id: "bardo", nombre: "Bardo", rol: "Aura", color: "#ff6fb5", hp: 75, atk: 5, def: 2, int: 1.6, rango: 55, desc: "Su música acelera y fortalece a todo el party mientras toque." },
  { id: "alquimista", nombre: "Alquimista", rol: "Veneno", color: "#b5e61d", hp: 85, atk: 8, def: 2, int: 1.7, rango: 55, desc: "Tira pociones que envenenan y salpican." },
  { id: "paladin", nombre: "Paladín", rol: "Protector", color: "#ffd23f", hp: 135, atk: 10, def: 5, int: 1.5, rango: 14, desc: "Golpea con luz y da escudos sagrados a sus compañeros." },
];
export const CLASE = Object.fromEntries(CLASES.map((c) => [c.id, c]));

// ---- Enemigos ----
export const ENEMIGOS = {
  moho: { nombre: "Moho baboso", hp: 42, atk: 6, def: 0, int: 1.5, rango: 9, vel: 10, color: "#6fcf4a", forma: "slime" },
  murcielago: { nombre: "Murciélago de cueva", hp: 34, atk: 7, def: 0, int: 0.9, rango: 9, vel: 22, color: "#8a6aff", forma: "bat" },
  esqueleto: { nombre: "Esqueleto hongil", hp: 70, atk: 10, def: 2, int: 1.4, rango: 10, vel: 12, color: "#d8d8e8", forma: "esqueleto" },
  arana: { nombre: "Araña de micelio", hp: 60, atk: 12, def: 1, int: 1.2, rango: 10, vel: 16, color: "#c0392b", forma: "arana" },
  esporita: { nombre: "Esporita", hp: 28, atk: 6, def: 0, int: 1.1, rango: 9, vel: 14, color: "#ff9a3d", forma: "esporita" },
  rey_moho: { nombre: "Rey Moho", hp: 2200, atk: 27, def: 9, int: 1.6, rango: 14, vel: 8, color: "#b06bff", forma: "jefe" },
};
// quién aparece en cada etapa (la 5.ª es el jefe con sus esporitas)
const ETAPA_ENEMIGOS = [
  ["moho", "moho", "murcielago"],
  ["murcielago", "moho", "esqueleto"],
  ["esqueleto", "murcielago", "arana"],
  ["arana", "esqueleto", "arana"],
  ["esporita", "esporita"],
];
export const NOMBRE_ETAPA = ["Cueva de moho", "Galería de murciélagos", "Cripta hongil", "Nido de arañas", "Sala del Rey Moho"];

// ---- Objetos que se encuentran al final de cada etapa (valen solo durante esa exploración) ----
export const OBJETOS = [
  { id: "espada", nombre: "Espada afilada", desc: "Ataque +20%", color: "#d8d8ec", aplica: (m, r) => { m.atk *= 1 + 0.2 * r; } },
  { id: "escudo", nombre: "Escudo de roble", desc: "Defensa +3 y vida +10%", color: "#a8793a", aplica: (m, r) => { m.def += 3 * r; m.hp *= 1 + 0.1 * r; } },
  { id: "botas", nombre: "Botas veloces", desc: "Ataca un 15% más rápido", color: "#c28a4f", aplica: (m, r) => { m.cd *= 1 - 0.15 * r; } },
  { id: "pocion", nombre: "Poción grande", desc: "Cura a todos el 40%", color: "#ff5a8a", cura: 0.4 },
  { id: "amuleto", nombre: "Amuleto de la suerte", desc: "Recompensa final +15%", color: "#ffd23f", aplica: (m, r) => { m.recompensa *= 1 + 0.15 * r; } },
  { id: "casco", nombre: "Casco brillante", desc: "Defensa +2", color: "#9db4c8", aplica: (m, r) => { m.def += 2 * r; } },
  { id: "runa", nombre: "Runa de furia", desc: "+15% de golpes críticos", color: "#ff7a3d", aplica: (m, r) => { m.crit += 0.15 * r; } },
  { id: "capa", nombre: "Capa élfica", desc: "Esquiva el 12% de los golpes", color: "#3fe08a", aplica: (m, r) => { m.esquiva += 0.12 * r; } },
];

// ---- Mejoras de la taberna ----
export const TABERNA_MEJ = [
  { id: "tab_vel", nombre: "Botas de explorador", max: 8, costo: D(1e18), esc: 1.9, a: 0.12, desc: (n) => `La exploración es un ${Math.round(0.12 * 100)}% más rápida por nivel (ahora +${Math.round(0.12 * n * 100)}%).` },
  { id: "tab_suerte", nombre: "Mapa del tesoro", max: 8, costo: D(2e18), esc: 2.0, a: 0.07, desc: (n) => `Más chances de mejor recompensa: objetos raros y de que el jefe deje un cristal radiante (+${Math.round(0.07 * n * 100)}% ahora, +7% por nivel).` },
  { id: "tab_cura", nombre: "Botiquín de la taberna", max: 2, costo: D(5e18), esc: 6, a: 1, desc: (n) => `Los heridos se curan en ${Math.max(1, 3 - n)} exploraciones en vez de 3 (cada nivel quita una).` },
];
export const TAB_MEJ_POR_ID = Object.fromEntries(TABERNA_MEJ.map((m) => [m.id, m]));
export const nivelTab = (state, id) => { const v = state.mejoras[id]; return typeof v === "number" ? v : 0; };
export const costoTab = (state, m) => m.costo.mul(D(m.esc).pow(nivelTab(state, m.id))).ceil();
export function comprarTab(state, id) {
  const m = TAB_MEJ_POR_ID[id];
  if (!m || !state.edificios.taberna) return false;
  const n = nivelTab(state, id), c = costoTab(state, m);
  if (n >= m.max || state.esporas.lt(c)) return false;
  state.esporas = state.esporas.sub(c);
  state.mejoras[id] = n + 1;
  return true;
}

// ---- Mercenarios ----
export const costoMerc = (state) => D(2e17).mul(D(2.5).pow(Object.keys(state.dungeon.merc).length)).ceil();
export function contratar(state, id) {
  if (!state.edificios.taberna || !CLASE[id] || state.dungeon.merc[id]) return false;
  const c = costoMerc(state);
  if (state.esporas.lt(c)) return false;
  state.esporas = state.esporas.sub(c);
  state.dungeon.merc[id] = { nivel: 1, herido: 0 };
  return true;
}
// sanos, de más nivel a menos (el party lleva a los 4 primeros)
export const sanos = (state) => CLASES.filter((c) => state.dungeon.merc[c.id] && !state.dungeon.merc[c.id].herido).sort((a, b) => state.dungeon.merc[b.id].nivel - state.dungeon.merc[a.id].nivel).map((c) => c.id);
export const mercStats = (id, nivel) => {
  const c = CLASE[id], k = 1 + 0.04 * (nivel - 1);
  return { hp: c.hp * k, atk: c.atk * k };
};

// ---- Exploración ----
let run = null; // la exploración en curso (no se guarda)
let resultado = null; // se entrega una vez a la interfaz
let esperaAuto = 4, descansoT = 0;
export const getRun = () => run;
export const consumirResultado = () => { const r = resultado; resultado = null; return r; };

const rnd = (a, b) => a + Math.random() * (b - a);
const escalaJefes = (state) => Math.pow(1.12, state.dungeon.jefes || 0);

function crearUnidad(base, extra) {
  return { vivo: true, cd: rnd(0.2, 1), x: 0, golpe: 0, escudo: 0, veneno: null, esp: rnd(2, 5), ...base, ...extra };
}
function mercUnidad(state, id, slot, m) {
  const info = state.dungeon.merc[id], st = mercStats(id, info.nivel), c = CLASE[id];
  return crearUnidad({ lado: "p", id, clase: id, color: c.color, nombre: c.nombre, hpMax: st.hp, hp: st.hp, atkBase: st.atk, defBase: c.def, intBase: c.int, rango: c.rango, slot }, {});
}
// estadísticas efectivas con los objetos de la exploración y el aura del bardo
function efectivo(r, u) {
  const m = r.mult;
  let atk = u.atkBase * m.atk, def = u.defBase + m.def, cd = u.intBase * m.cd;
  if (r.party.some((p) => p.vivo && p.id === "bardo")) { atk *= 1.12; cd *= 0.9; }
  if (u.id === "barbaro") atk *= 1 + (1 - u.hp / u.hpMax) * 0.8;
  return { atk, def, cd };
}
function empezarOnda(state, r) {
  const e = r.etapa, esc = escalaJefes(state) * (1 + 0.45 * e);
  const tipos = ETAPA_ENEMIGOS[e];
  const lista = e === ETAPAS_DUNGEON - 1 ? ["rey_moho", ...tipos] : [...tipos.slice(0, 2 + Math.floor(e / 2))].map((t, i) => tipos[(i + r.onda) % tipos.length]);
  r.enemigos = lista.map((t, i) => {
    const d = ENEMIGOS[t], jefe = t === "rey_moho", k = jefe ? escalaJefes(state) : esc;
    return crearUnidad({ lado: "e", tipo: t, nombre: d.nombre, color: d.color, forma: d.forma, hpMax: d.hp * k * 1.5, hp: d.hp * k * 1.5, atkBase: d.atk * (1 + (k - 1) * 0.7), defBase: d.def, intBase: d.int, rango: d.rango, vel: d.vel, jefe }, { x: r.x + 50 + i * 14, esp: rnd(2, 5) });
  });
}
export function iniciar(state) {
  if (run || !state.edificios.taberna) return false;
  const ids = sanos(state).slice(0, PARTY_MAX);
  if (!ids.length) return false;
  run = {
    t: 0, etapa: 0, onda: 0, fase: "camina", faseT: 0, x: 0, n: ids.length, vel: 1 + 0.12 * nivelTab(state, "tab_vel"),
    party: ids.map((id, i) => mercUnidad(state, id, i)), enemigos: [], aliados: [], items: [], mult: { atk: 1, def: 0, hp: 1, cd: 1, recompensa: 1, crit: 0, esquiva: 0 },
    eventos: [], botinExtra: 0, etapasHechas: 0, jefe: false, itemNuevo: null, fin: null, finT: 0,
  };
  run.party.forEach((u, i) => { u.x = -i * 13; });
  return true;
}
const ev = (r, e) => { if (r.eventos.length < 120) r.eventos.push(e); };

function danio(atk, def) { return Math.max(1, atk * rnd(0.9, 1.1) - def * 0.6); }
function danar(r, objetivo, valor, desde, opciones = {}) {
  if (!objetivo.vivo) return;
  if (objetivo.lado === "p" && Math.random() < r.mult.esquiva) { ev(r, { tipo: "texto", a: objetivo, txt: "¡Esquiva!", color: "#3fe08a" }); return; }
  let v = valor;
  if (objetivo.escudo > 0) { const abs = Math.min(objetivo.escudo, v); objetivo.escudo -= abs; v -= abs; }
  objetivo.hp -= v;
  if (!opciones.silencio) objetivo.golpe = 0.18;
  if (!opciones.silencio) ev(r, { tipo: "dmg", a: objetivo, v: Math.round(v), crit: !!opciones.crit, color: objetivo.lado === "p" ? "#ff6a6a" : (opciones.crit ? "#ffd23f" : "#fff") });
  if (objetivo.hp <= 0) {
    objetivo.hp = 0; objetivo.vivo = false; objetivo.ko = true; objetivo.muerteT = 0;
    ev(r, { tipo: "ko", a: objetivo });
    if (objetivo.lado === "e" && desde && desde.id === "picaro") r.botinExtra += 0.04;
    if (objetivo.lado === "e" && objetivo.jefe) r.jefe = true;
  }
}
function curar(r, u, v, color = "#3fe08a", silencio = false) {
  if (!u.vivo) return;
  u.hp = Math.min(u.hpMax, u.hp + v);
  if (!silencio) ev(r, { tipo: "cura", a: u, v: Math.round(v), color });
}
const vivos = (l) => l.filter((u) => u.vivo);
const masHerido = (l) => vivos(l).sort((a, b) => a.hp / a.hpMax - b.hp / b.hpMax)[0];
function elegirBlancoEnemigo(r) {
  const v = vivos(r.party);
  if (!v.length) return null;
  // los tanques (caballero, paladín) atraen tres veces más ataques
  const pesos = v.map((u) => (u.id === "caballero" || u.id === "paladin" ? 3 : 1)), tot = pesos.reduce((a, b) => a + b, 0);
  let k = Math.random() * tot;
  for (let i = 0; i < v.length; i++) { k -= pesos[i]; if (k <= 0) return v[i]; }
  return v[0];
}
const frente = (l) => vivos(l).sort((a, b) => a.x - b.x)[0]; // el enemigo más cercano al party (el de menor x)

// ataque de un mercenario o aliado
function atacarMerc(r, u) {
  const e = efectivo(r, u), blancos = vivos(r.enemigos);
  if (!blancos.length) return;
  const cercano = frente(r.enemigos);
  if (!cercano) return;
  const dist = cercano.x - (r.x + u.x);
  if (u.rango < 20 ? cercano.x - r.x > 16 : dist > u.rango) return; // fuera de alcance: todavía no
  const critP = 0.05 + r.mult.crit + (u.id === "picaro" ? 0.3 : 0), crit = Math.random() < critP;
  const base = e.atk * (crit ? 2.2 : 1);
  const dm = (obj, f = 1) => danar(r, obj, danio(base * f, ENEMIGOS[obj.tipo].def), u, { crit });
  u.cd = e.cd;
  switch (u.id) {
    case "arquero":
      ev(r, { tipo: "proy", forma: "flecha", de: u, a: cercano });
      dm(cercano);
      break;
    case "mago":
      ev(r, { tipo: "proy", forma: "bola", de: u, a: cercano });
      dm(cercano);
      for (const o of blancos) if (o !== cercano) dm(o, 0.5);
      break;
    case "curandero": {
      const h = masHerido(r.party);
      if (h && h.hp / h.hpMax < 0.85) { ev(r, { tipo: "proy", forma: "cura", de: u, a: h }); curar(r, h, e.atk * 5); }
      else { ev(r, { tipo: "proy", forma: "chispa", de: u, a: cercano }); dm(cercano); }
      break;
    }
    case "invocador":
      ev(r, { tipo: "proy", forma: "chispa", de: u, a: cercano });
      dm(cercano);
      break;
    case "bardo":
      ev(r, { tipo: "proy", forma: "nota", de: u, a: cercano });
      dm(cercano);
      break;
    case "alquimista":
      ev(r, { tipo: "proy", forma: "pocion", de: u, a: cercano });
      dm(cercano);
      cercano.veneno = { t: 4, dps: e.atk * 0.5 };
      for (const o of blancos) if (o !== cercano) { dm(o, 0.5); o.veneno = { t: 3, dps: e.atk * 0.3 }; }
      break;
    case "paladin": {
      u.golpe2 = 0.2; dm(cercano);
      break;
    }
    default: // caballero, pícaro, bárbaro: cuerpo a cuerpo
      u.golpe2 = 0.2;
      ev(r, { tipo: "tajo", de: u, a: cercano });
      dm(cercano);
  }
}
// habilidades especiales (cada una con su propio contador)
function especial(r, u, dt) {
  u.esp -= dt;
  if (u.esp > 0) return;
  const e = efectivo(r, u), blancos = vivos(r.enemigos);
  if (u.id === "arquero" && blancos.length) {
    u.esp = 7;
    for (let i = 0; i < 3; i++) { const o = blancos[Math.floor(Math.random() * blancos.length)]; ev(r, { tipo: "proy", forma: "flecha", de: u, a: o }); danar(r, o, danio(e.atk * 0.6, ENEMIGOS[o.tipo].def), u); }
  } else if (u.id === "invocador" && blancos.length) {
    u.esp = 6;
    if (r.aliados.filter((a) => a.vivo).length < 2) {
      const k = u.atkBase / 6;
      const a = crearUnidad({ lado: "p", id: "espiritu", clase: "espiritu", nombre: "Espíritu", color: "#9fd8ff", hpMax: 40 * k, hp: 40 * k, atkBase: 9 * k, defBase: 0, intBase: 1, rango: 14, vida: 12, aliado: true }, { x: u.x + 6 });
      r.aliados.push(a);
      ev(r, { tipo: "invoca", a });
    }
  } else if (u.id === "paladin" && vivos(r.party).length) {
    u.esp = 9;
    const h = masHerido(r.party);
    h.escudo += 28 + u.atkBase * 1.2;
    ev(r, { tipo: "escudo", a: h });
  }
  else u.esp = 3;
}
function actuarEnemigo(r, u, dt) {
  const f = frente(r.party.concat(r.aliados));
  const objetivo = elegirBlancoEnemigo(r);
  if (!objetivo) return;
  const meta = r.x + 3 + Math.min(r.enemigos.indexOf(u), 4) * 3; // se acercan hasta el frente del party
  if (u.x > meta + u.rango * 0.5) { u.x = Math.max(meta, u.x - u.vel * dt); u.camina = true; return; }
  u.camina = false;
  // jefe: golpe de suelo cada tanto (daña a todos)
  if (u.jefe) {
    u.esp -= dt;
    if (u.esp <= 0) { u.esp = 6; ev(r, { tipo: "temblor", a: u }); for (const p of vivos(r.party)) danar(r, p, danio(u.atkBase * 0.7, p.defBase + r.mult.def), u); }
  }
  u.cd -= dt;
  if (u.cd > 0) return;
  u.cd = u.intBase * rnd(0.9, 1.1);
  u.golpe2 = 0.2;
  const d = efectivo(r, objetivo).def, furia = 1 + Math.max(0, (r.faseT - 45) / 15); // si la pelea se alarga, los enemigos se enfurecen
  danar(r, objetivo, danio(u.atkBase * furia, d), u);
}
function cerrar(state, r, victoria) {
  // recompensas: esporas por cada etapa superada (más con el party lleno y con los objetos) y cristal si cayó el jefe
  const p = produccionPorSeg(state);
  const suerte = 0.07 * nivelTab(state, "tab_suerte");
  const partyMult = 1 + 0.35 * (r.n - 1);
  let esporas = D(0);
  for (let k = 1; k <= r.etapasHechas; k++) esporas = esporas.add(p.mul(6 * k));
  esporas = esporas.mul(partyMult * r.mult.recompensa * (1 + r.botinExtra));
  if (esporas.lt(1)) esporas = D(r.etapasHechas > 0 ? 1 : 0);
  state.esporas = state.esporas.add(esporas);
  state.total = state.total.add(esporas);
  let cristal = false;
  if (r.jefe) {
    state.dungeon.jefes++;
    cristal = Math.random() < Math.min(0.97, 0.3 + 0.12 * (r.n - 1) + suerte);
    if (cristal) state.dungeon.cristales++;
  }
  // heridos: los que cayeron quedan fuera varias exploraciones; los demás heridos avanzan un paso hacia curarse
  const curacion = Math.max(1, 3 - nivelTab(state, "tab_cura"));
  const caidos = [];
  const participaron = new Set(r.party.map((u) => u.id));
  for (const id in state.dungeon.merc) {
    const m = state.dungeon.merc[id];
    const u = r.party.find((q) => q.id === id);
    if (u && u.ko) { m.herido = curacion; caidos.push(id); }
    else if (m.herido > 0) m.herido--;
    if (participaron.has(id)) m.nivel = Math.min(60, m.nivel + 1 + (r.jefe ? 1 : 0));
  }
  state.dungeon.expediciones++;
  const res = { victoria, etapas: r.etapasHechas, jefe: r.jefe, cristal, esporas, caidos, n: r.n, items: r.items.length };
  state.dungeon.ultimo = res.victoria ? "victoria" : "derrota";
  r.fin = res; r.fase = "fin"; r.finT = 0;
  resultado = res;
}
export function tick(state, dt, auto = true) {
  if (!state.edificios?.taberna || !state.dungeon) { run = null; return; }
  if (!run) {
    // si TODOS están heridos no se puede explorar para curarlos: descansan solos (un paso cada 45 s)
    if (!sanos(state).length) {
      descansoT += dt;
      if (descansoT >= 45) { descansoT = 0; for (const m of Object.values(state.dungeon.merc)) if (m.herido > 0) m.herido--; }
    } else descansoT = 0;
    esperaAuto -= dt;
    if (esperaAuto <= 0 && state.dungeon.auto !== false && auto && sanos(state).length) { esperaAuto = 4; iniciar(state); }
    return;
  }
  const r = run;
  let rest = Math.min(dt, 20) * r.vel;
  while (rest > 0) {
    const h = Math.min(rest, 0.1);
    rest -= h;
    paso(state, r, h);
    if (!run) return;
  }
}
function paso(state, r, dt) {
  r.t += dt; r.faseT += dt;
  for (const u of [...r.party, ...r.enemigos, ...r.aliados]) { if (u.golpe > 0) u.golpe -= dt; if (u.golpe2 > 0) u.golpe2 -= dt; if (!u.vivo) u.muerteT = (u.muerteT || 0) + dt; }
  if (r.fase === "fin") {
    r.finT += dt;
    if (r.finT > 5) { run = null; esperaAuto = 6; }
    return;
  }
  if (r.fase === "camina") {
    r.x += 14 * dt;
    for (const u of r.party) if (u.vivo) u.camina = true;
    if (r.faseT > 3.2) { for (const u of r.party) u.camina = false; empezarOnda(state, r); r.fase = "combate"; r.faseT = 0; }
    return;
  }
  if (r.fase === "botin") {
    if (r.faseT > 2.6) { r.etapa++; r.onda = 0; r.fase = "camina"; r.faseT = 0; r.itemNuevo = null; }
    return;
  }
  // combate: si se alarga demasiado, el party se retira
  if (r.faseT > 130) { cerrar(state, r, false); return; }
  for (const u of vivos(r.enemigos)) {
    if (u.veneno) { u.veneno.t -= dt; danar(r, u, u.veneno.dps * dt * 0.5, null, { silencio: true }); if (u.veneno.t <= 0) u.veneno = null; }
    actuarEnemigo(r, u, dt);
  }
  for (const u of vivos(r.party)) { u.cd -= dt; especial(r, u, dt); if (u.cd <= 0) atacarMerc(r, u); }
  for (const a of vivos(r.aliados)) {
    a.vida -= dt; a.cd -= dt;
    if (a.vida <= 0) { a.vivo = false; continue; }
    if (a.cd <= 0) { const c = frente(r.enemigos); if (c && c.x - r.x < 18) { a.cd = a.intBase; a.golpe2 = 0.2; danar(r, c, danio(a.atkBase * r.mult.atk, ENEMIGOS[c.tipo].def), a); } }
  }
  if (!vivos(r.party).length) { cerrar(state, r, false); return; }
  if (!vivos(r.enemigos).length) {
    r.onda++;
    const ondas = r.etapa === ETAPAS_DUNGEON - 1 ? 1 : 2;
    if (r.onda < ondas) { r.fase = "camina"; r.faseT = 0; r.enemigos = []; for (const u of vivos(r.party)) curar(r, u, u.hpMax * 0.12, "#3fe08a", true); return; }
    r.etapasHechas++;
    r.enemigos = [];
    if (r.etapa === ETAPAS_DUNGEON - 1) { cerrar(state, r, true); return; }
    darObjeto(state, r);
    for (const u of vivos(r.party)) curar(r, u, u.hpMax * 0.25, "#3fe08a", true);
    r.fase = "botin"; r.faseT = 0;
  }
}
// objeto al final de la etapa: al azar; con el mapa del tesoro salen más seguido los "raros" (efecto ×1,6)
function darObjeto(state, r) {
  const o = OBJETOS[Math.floor(Math.random() * OBJETOS.length)];
  const raro = Math.random() < 0.1 + 0.06 * nivelTab(state, "tab_suerte");
  const f = raro ? 1.6 : 1;
  if (o.cura) for (const u of vivos(r.party)) curar(r, u, u.hpMax * o.cura * f, "#ff5a8a");
  else o.aplica(r.mult, f);
  r.itemNuevo = { ...o, raro };
  r.items.push({ id: o.id, raro });
  // los objetos de vida suben también la vida máxima actual
  if (o.id === "escudo") for (const u of r.party) { const k = 1 + 0.1 * f; u.hpMax *= k; u.hp *= k; }
  ev(r, { tipo: "objeto", o: r.itemNuevo });
}

export function nuevoEstadoDungeon() {
  return { merc: {}, cristales: 0, jefes: 0, expediciones: 0, auto: true, ultimo: null };
}
