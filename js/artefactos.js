import { puA, puM } from './puData.js';

// Artefactos del Mercader hongil: 53 objetos permanentes (hasta el próximo prestigio). Cada vez que viene
// el mercader ofrece 5 al azar y se puede quedar con uno solo. No todos suben la producción: abaratan,
// aceleran la dungeon, protegen de meteoritos, alargan las invasiones, etc.
//
// Claves de efecto (k): las que están en MULT se multiplican entre sí (v = factor); las demás se suman.

const MULT = new Set([
  "prod_all", "prod_basico", "prod_maestro", "prod_musico", "prod_jardinero", "prod_obrero", "prod_minero", "prod_mago",
  "prod_atleta", "prod_trader", "prod_astronauta", "inv_vel", "logi_carga", "mina_vel", "mina_regrow", "dorada_val", "cometa_val", "dung_rec",
]);

// [id, nombre, descripción, clave, valor, categoría (1-3: cuánto cuesta)]
const T = [
  ["cuenco", "Cuenco de micelio dorado", "Los honguitos básicos producen ×1,5.", "prod_basico", 1.5, 1],
  ["pizarra", "Pizarra sin borrar", "Los maestros producen ×1,5.", "prod_maestro", 1.5, 1],
  ["diapason", "Diapasón eterno", "Los músicos producen ×1,5.", "prod_musico", 1.5, 1],
  ["regadera", "Regadera infinita", "Los jardineros producen ×1,5.", "prod_jardinero", 1.5, 1],
  ["llave", "Llave inglesa de oro", "Los obreros producen ×1,5.", "prod_obrero", 1.5, 1],
  ["pico", "Pico de cristal puro", "Los mineros producen ×1,5.", "prod_minero", 1.5, 1],
  ["sombrero", "Sombrero de las estrellas", "Los magos producen ×1,5.", "prod_mago", 1.5, 1],
  ["mancuerna", "Mancuerna de plomo", "Los atletas producen ×1,5.", "prod_atleta", 1.5, 1],
  ["telefono", "Teléfono rojo", "Los traders producen ×1,5.", "prod_trader", 1.5, 1],
  ["brujula", "Brújula lunar", "Los astronautas producen ×1,5.", "prod_astronauta", 1.5, 1],
  ["microscopio", "Microscopio de cobre", "Investigación un 50% más rápida.", "inv_vel", 1.5, 1],
  ["amuleto", "Amuleto del micelio", "Toda la producción ×1,25.", "prod_all", 1.25, 2],
  ["semilla", "Semilla ancestral", "Toda la producción ×1,2.", "prod_all", 1.2, 2],
  ["corona", "Corona de moho", "Toda la producción ×1,2.", "prod_all", 1.2, 2],
  ["espejo", "Espejo de la madre", "Toda la producción ×1,15.", "prod_all", 1.15, 2],
  ["libro", "Libro de cuentas", "Los honguitos suben un 8% menos su precio por unidad.", "costo_hong", 0.08, 2],
  ["abaco", "Ábaco de espinas", "Los honguitos suben un 12% menos su precio por unidad.", "costo_hong", 0.12, 3],
  ["cupon", "Cupón del mercader", "Los edificios cuestan un 10% menos.", "costo_edif", 0.1, 2],
  ["balanza", "Balanza trucada", "Los edificios cuestan un 15% menos.", "costo_edif", 0.15, 3],
  ["sello", "Sello de mayorista", "Las mejoras de edificio cuestan un 10% menos.", "costo_mej", 0.1, 2],
  ["reloj_arena", "Reloj de arena rota", "Los hitos de cantidad se alcanzan con un 15% menos de honguitos.", "hito_bajo", 0.15, 2],
  ["cuaderno", "Cuaderno de hitos", "Los hitos de cantidad se alcanzan con un 20% menos de honguitos.", "hito_bajo", 0.2, 3],
  ["medalla", "Medalla de oro", "Los hitos de cantidad se alcanzan con un 10% menos de honguitos.", "hito_bajo", 0.1, 1],
  ["polvo", "Frasco de polvo dorado", "Las esporas doradas valen un 50% más.", "dorada_val", 1.5, 1],
  ["iman", "Imán de luciérnagas", "Los eventos del cielo aparecen un 30% más seguido.", "evt_freq", 0.3, 1],
  ["telescopio", "Telescopio de bolsillo", "Los eventos del cielo duran 5 s más.", "evt_dur", 5, 1],
  ["cometa", "Cometa en una botella", "Los cometas de ideas dan un 50% más de puntos.", "cometa_val", 1.5, 1],
  ["red_estrellas", "Red atrapa-estrellas", "Un 10% más de chance de que los eventos del cielo se recojan solos.", "autoevento", 0.1, 2],
  ["reloj_abuelo", "Reloj de bolsillo del abuelo", "Se cuentan 30 min más de producción cuando no estás.", "offline", 1800, 1],
  ["almohada", "Almohada mágica", "Se cuenta 1 h más de producción cuando no estás.", "offline", 3600, 2],
  ["catalejo", "Catalejo del tiempo", "Todos los honguitos trabajan un 5% más rápido.", "vel_all", 0.05, 2],
  ["mapa_lunar", "Mapa lunar", "+0,2% de producción total por cada base lunar.", "luna_base", 0.002, 2],
  ["linterna_topo", "Linterna del topo", "La mina se cava un 50% más rápido.", "mina_vel", 1.5, 1],
  ["fertilizante", "Fertilizante de cristal", "Los yacimientos de la mina rebrotan un 60% más rápido.", "mina_regrow", 1.6, 1],
  ["resonancia", "Cristal de resonancia", "Cada cristal radiante sube la producción un 1% más.", "cristal_extra", 0.01, 3],
  ["botas_leguas", "Botas de siete leguas", "La exploración de la dungeon es un 20% más rápida.", "dung_vel", 0.2, 2],
  ["bolso", "Bolso del saqueador", "La recompensa de la dungeon es un 25% mayor.", "dung_rec", 1.25, 2],
  ["trebol", "Trébol de cuatro hojas", "+10% de chance de cristal radiante al vencer al jefe.", "dung_cristal", 0.1, 2],
  ["botiquin", "Botiquín de campaña", "Los heridos se curan una exploración antes.", "dung_cura", 1, 3],
  ["tacticas", "Libro de tácticas", "Los mercenarios ganan un nivel extra por exploración.", "dung_nivel", 1, 3],
  ["pocion_fuerza", "Poción de la fuerza", "Los mercenarios tienen un 10% más de vida y ataque.", "dung_stats", 0.1, 2],
  ["bola_rota", "Bola de cristal rota", "Los eventos de los magos aparecen un 25% más seguido.", "arc_freq", 0.25, 2],
  ["baston", "Bastón de tormentas", "La tormenta de esporas da +1 de multiplicador.", "arc_tormenta_mult", 1, 2],
  ["calma", "Pergamino de calma", "La tormenta de esporas dura 20 s más.", "arc_tormenta_dur", 20, 1],
  ["escudo_runico", "Escudo rúnico", "Un 15% de los meteoritos se desintegra en el aire, aunque no haya torre.", "arc_meteoro", 0.15, 2],
  ["alerta", "Reloj de alerta", "Las invasiones duran 10 s más antes de que roben.", "inv_tiempo", 10, 1],
  ["saco", "Saco sin fondo", "Cada criatura derrotada deja el doble de esporas.", "inv_botin", 1, 1],
  ["mapa_edif", "Mapa de los edificios", "+1,5% de producción total por cada edificio construido.", "syn_edif", 0.015, 3],
  ["rueda", "Rueda de hámster hongil", "+1% de producción total por cada 25 honguitos básicos.", "syn_basico", 0.01, 3],
  ["cesta", "Cesta de mimbre", "Los honguitos básicos llevan manojos ×1,3 más grandes.", "logi_carga", 1.3, 1],
  ["botas_raiz", "Botas de raíz", "Los básicos caminan un 15% más rápido al llevar esporas.", "logi_vel", 0.15, 2],
  ["sendero_musgo", "Sendero de musgo", "Los caminos de las esporas al hongo madre son un 12% más cortos.", "logi_dist", 0.12, 2],
  ["pluma", "Pluma de fénix", "Toda la producción ×1,3.", "prod_all", 1.3, 3],
];

// Tiers como en la wiki de Dwarf Eats Mountain: cada tier tiene un peso de aparición (más común = más peso).
// Los de categoría 3 más fuertes pasan a tier 4 (legendarios); `cat` también es el factor de precio.
export const TIERS = [
  { n: 1, nombre: "Común", peso: 80, color: "#b8c0cc" },
  { n: 2, nombre: "Raro", peso: 50, color: "#7fe9ff" },
  { n: 3, nombre: "Épico", peso: 25, color: "#c58aff" },
  { n: 4, nombre: "Legendario", peso: 8, color: "#ffd23f" },
];
const LEGENDARIOS = new Set(["pluma", "mapa_edif", "resonancia", "abaco"]);
export const ARTEFACTOS = T.map(([id, nombre, desc, k, v, cat]) => {
  const tier = LEGENDARIOS.has(id) ? 4 : cat;
  return { id, nombre, desc, k, v, cat: tier, tier, peso: TIERS[tier - 1].peso };
});
// Peso real de una oferta: con más niveles de prestigio los tiers altos pesan más (hasta ×3 a nivel 100);
// «Fortuna del mercader» (prestigio) suma peso a los épicos y legendarios.
export const pesoOferta = (a, nivelPrestigio, extraAlto = 0) => a.peso * (1 + (a.tier - 1) * Math.min(2, nivelPrestigio / 50)) * (a.tier >= 3 ? 1 + extraAlto : 1);
export function sortearOfertas(state, nivelPrestigio) {
  const n = 5 + Math.floor(puA(state, "merc_ofertas")), extra = puA(state, "merc_tier");
  const pool = ARTEFACTOS.filter((a) => !state.arte.tienen[a.id]);
  const sel = [];
  const sacar = (lista) => {
    let r = Math.random() * lista.reduce((t, a) => t + pesoOferta(a, nivelPrestigio, extra), 0), i = 0;
    for (; i < lista.length - 1; i++) { r -= pesoOferta(lista[i], nivelPrestigio, extra); if (r < 0) break; }
    const a = lista[i];
    pool.splice(pool.indexOf(a), 1);
    sel.push(a.id);
  };
  // «Hallazgos garantizados»: las primeras visitas de la corrida traen al menos un épico o legendario
  state.arte.visitas = (state.arte.visitas || 0) + 1;
  if (state.arte.visitas <= puA(state, "merc_garantia")) { const altos = pool.filter((a) => a.tier >= 3); if (altos.length) sacar(altos); }
  while (sel.length < n && pool.length) sacar(pool);
  return sel;
}
export const ARTE_POR_ID = Object.fromEntries(ARTEFACTOS.map((a) => [a.id, a]));

const tiene = (state) => (state.arte && state.arte.tienen) || {};
// producto de los artefactos (y mejoras de prestigio) de clave k (1 si no hay)
export function arteM(state, k) {
  let m = puM(state, k);
  for (const id in tiene(state)) { const a = ARTE_POR_ID[id]; if (a && a.k === k) m *= a.v; }
  return m;
}
// suma de los artefactos (y mejoras de prestigio) de clave k (0 si no hay)
export function arteA(state, k) {
  let x = puA(state, k);
  for (const id in tiene(state)) { const a = ARTE_POR_ID[id]; if (a && a.k === k) x += a.v; }
  return x;
}
export const esMult = (k) => MULT.has(k);
export const cantArte = (state) => Object.keys(tiene(state)).length;

// ícono procedural de 9x9, simétrico y único para cada artefacto (colores según su categoría)
function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
const PALETAS = [["#ffd23f", "#c28a4f"], ["#7fe9ff", "#3a6fa8"], ["#c58aff", "#5a2a8f"], ["#7fff9a", "#2a8a4f"], ["#ff9ad0", "#8f2a5a"], ["#ffb347", "#8f4a1a"]];
const cacheIco = {};
export function iconoArtefacto(id, k = 3) {
  const clave = id + k;
  if (cacheIco[clave]) return cacheIco[clave];
  const a = ARTE_POR_ID[id], h = hash(id);
  const pal = PALETAS[h % PALETAS.length];
  const c = document.createElement("canvas");
  c.width = c.height = 9 * k;
  const x = c.getContext("2d");
  let r = h;
  const rnd = () => { r = Math.imul(r ^ (r >>> 15), 2246822507) >>> 0; r = (Math.imul(r ^ (r >>> 13), 3266489909) ^ (r >>> 16)) >>> 0; return r / 4294967296; };
  const pix = (px, py, col) => { x.fillStyle = col; x.fillRect(px * k, py * k, k, k); x.fillRect((8 - px) * k, py * k, k, k); };
  // marco con forma según el hash (círculo, rombo o escudo) y relleno simétrico al azar
  const forma = h % 3;
  for (let py = 0; py < 9; py++) for (let px = 0; px <= 4; px++) {
    const dx = 4 - px, dy = Math.abs(py - 4);
    const dentro = forma === 0 ? dx * dx + dy * dy <= 17 : forma === 1 ? dx + dy <= 4 : (py < 7 ? dx <= 3 : dx + (py - 6) <= 3);
    if (!dentro) continue;
    const borde = forma === 0 ? dx * dx + dy * dy > 10 : forma === 1 ? dx + dy === 4 : (py === 0 || dx === 3 || py >= 6);
    pix(px, py, borde ? pal[1] : rnd() < 0.55 ? pal[0] : mezcla(pal[0], pal[1]));
  }
  pix(4, 4, "#fff"); pix(3, 3, "#fff");
  return (cacheIco[clave] = c.toDataURL());
}
function mezcla(c1, c2) {
  const n = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const a = n(c1), b = n(c2);
  return "#" + a.map((v, i) => Math.round((v + b[i]) / 2).toString(16).padStart(2, "0")).join("");
}
