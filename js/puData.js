// Mejoras de prestigio (permanentes entre corridas). Sin imports: lo usan el motor, los artefactos y el reinicio.
// Estructura tomada de la wiki de Dwarf Eats Mountain: tiers que se destraban al GASTAR PP (12/45/120/180/250),
// mejoras de arranque, «los primeros N cuestan 0», líneas de daño por tipo, efectos que saltan con los eventos,
// chances por nivel, conservar artefactos y un tier libre de mejoras eternas (sin tope de rangos).
//
// `k` es la clave de efecto que leen arteA/arteM (v por rango):
//   m: true  → se multiplica v^rango        lin: true → se multiplica (1 + v·rango)        ninguno → suma v·rango
// Las claves "inicio_*", "recluta_nivel", "pp_chance", "tesoro_nivel", "reliquia*", "merc_*", "crisis_prod",
// "hong_gratis", etc. las resuelven el reinicio, el motor, el Mercader o la dungeon.

export const TIER_GASTO = [0, 12, 45, 120, 180, 250]; // PP gastados para destrabar el tier 1 … 6
export const TIER_LIBRE = 0; // las eternas se destraban con el primer PP gastado
export const TIERS_PU = [1, 2, 3, 4, 5, 6, 0];
export const nombreTier = (t) => (t === 0 ? "Eternas · sin tope de rangos" : `Tier ${t}`);

const pct = (x) => Math.round(x * 1000) / 10;
const num = (x) => String(Math.round(x * 100) / 100).replace(".", ",");
const mult = (x) => "×" + num(x);

const TIPOS = [ // [id, nombre en plural, tier del linaje]
  ["basico", "honguitos básicos", 1], ["maestro", "maestros", 2], ["musico", "músicos", 2], ["jardinero", "jardineros", 2], ["obrero", "obreros", 2],
  ["minero", "mineros", 3], ["mago", "magos", 3], ["atleta", "atletas", 3], ["trader", "traders", 3], ["astronauta", "astronautas", 4],
];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export const PU = [
  // ── Tier 1: arreglan los primeros minutos de la corrida ──
  { id: "semillas", tier: 1, max: 3, nombre: "Semillas heredadas", k: "inicio_hong", v: 4, desc: (n) => `Empezás cada corrida con +${4 * n} honguitos básicos.` },
  { id: "herencia", tier: 1, max: 3, nombre: "Herencia de esporas", k: "inicio_esp", v: 400, desc: (n) => `Empezás cada corrida con ${400 * n} esporas.` },
  { id: "reservas", tier: 1, max: 1, nombre: "Reservas brillantes", k: "inicio_esp_tier", v: 1000, desc: () => "Empezás con +1.000 esporas por cada tier de prestigio destrabado." },
  { id: "heirloom", tier: 1, max: 1, nombre: "Reliquia de la abuela", k: "inicio_arte", v: 1, desc: () => "Empezás cada corrida con 1 artefacto común al azar." },
  { id: "recluta", tier: 1, max: 3, nombre: "Reclutas de la pradera", k: "recluta_nivel", v: 1, desc: (n) => `Cada 3 niveles de prestigio de la corrida, ${n === 1 ? "te llega" : "te llegan"} ${n} ${n === 1 ? "honguito básico gratis" : "honguitos básicos gratis"}.` },
  { id: "micelio_prof", tier: 1, max: 5, nombre: "Micelio profundo", k: "prod_all", v: 1.06, m: true, desc: (n) => `Toda la producción ${mult(1.06 ** n)}.` },
  { id: "dedos_ant", tier: 1, max: 4, nombre: "Dedos ancestrales", k: "toque_mult", v: 1.25, m: true, desc: (n) => `Los toques al hongo madre valen ${mult(1.25 ** n)}.` },
  { id: "cosecha", tier: 1, max: 3, nombre: "Cosecha dorada", k: "evt_freq", v: 0.2, desc: (n) => `Los eventos del cielo aparecen un ${pct(0.2 * n)}% más seguido.` },
  { id: "pepitas", tier: 1, max: 3, nombre: "Pepitas de oro", k: "dorada_val", v: 1.2, m: true, desc: (n) => `Las esporas doradas valen ${mult(1.2 ** n)}.` },

  // ── Tier 2 (12 PP gastados) ──
  { id: "auto_inicio", tier: 2, max: 1, nombre: "Autoclick heredado", k: "auto_inicio", v: 1, desc: () => "Cada corrida empieza con el autoclick ya desbloqueado." },
  { id: "aprendices", tier: 2, max: 3, nombre: "Aprendices gremiales", k: "hong_gratis", v: 1, desc: (n) => `Los primeros ${n} honguitos de cada tipo que comprés cuestan 0 esporas.` },
  { id: "hitos_pre", tier: 2, max: 3, nombre: "Hitos tempranos", k: "hito_bajo", v: 0.05, desc: (n) => `Los hitos de cantidad se alcanzan con un ${pct(0.05 * n)}% menos de honguitos.` },
  { id: "regateo", tier: 2, max: 4, nombre: "Regateo", k: "costo_edif", v: 0.03, desc: (n) => `Los edificios cuestan un ${pct(0.03 * n)}% menos.` },
  { id: "cuentas", tier: 2, max: 3, nombre: "Cuentas claras", k: "costo_hong", v: 0.04, desc: (n) => `Los honguitos suben un ${pct(0.04 * n)}% menos su precio por unidad.` },
  { id: "savia_anc", tier: 2, max: 3, nombre: "Savia ancestral", k: "toque_savia", v: 0.005, desc: (n) => `Cada toque da además un ${pct(0.005 * n)}% extra de tus esporas/s.` },
  { id: "periodico", tier: 2, max: 4, nombre: "Periódico de herencias", k: "pp_chance", v: 0.05, desc: (n) => `Cada nivel de prestigio que alcanzás tiene ${pct(0.05 * n)}% de chance de dar +1 PP al prestigiar.` },
  { id: "crisis", tier: 2, max: 2, nombre: "Reflejos de crisis", k: "crisis_prod", v: 0.15, desc: (n) => `Al empezar un evento (cielo o magos), toda la producción +${pct(0.15 * n)}% durante 6 s.` },
  { id: "beca", tier: 2, max: 4, nombre: "Becas eternas", k: "inv_vel", v: 1.25, m: true, desc: (n) => `La investigación rinde ${mult(1.25 ** n)}.` },
  { id: "telescopio", tier: 2, max: 3, nombre: "Telescopio de observatorio", k: "evt_dur", v: 3, desc: (n) => `Los eventos del cielo duran ${3 * n} s más.` },
  { id: "cimientos", tier: 2, max: 3, nombre: "Cimientos minados", k: "inv_vida", v: 0.08, desc: (n) => `Los enemigos de las invasiones tienen un ${pct(0.08 * n)}% menos de vida.` },
  { id: "cupulas", tier: 2, max: 3, nombre: "Cúpulas rúnicas", k: "arc_meteoro", v: 0.1, desc: (n) => `Un ${pct(0.1 * n)}% más de los meteoritos se desintegra en el aire.` },
  { id: "picos_prof", tier: 2, max: 3, nombre: "Picos profundos", k: "mina_vel", v: 1.25, m: true, desc: (n) => `La mina se cava ${mult(1.25 ** n)} más rápido.` },

  // ── Tier 3 (45 PP gastados) ──
  { id: "reliquia", tier: 3, max: 1, nombre: "Reliquia heredada", k: "reliquia", v: 1, desc: () => "Al prestigiar conservás 1 artefacto al azar (los demás se pierden)." },
  { id: "memoria", tier: 3, max: 1, nombre: "Memoria del micelio", k: "pp_prod", v: 0.003, desc: () => "Toda la producción +0,3% por cada PP ganado en toda la partida." },
  { id: "sueno", tier: 3, max: 4, nombre: "Sueño largo", k: "offline", v: 1800, desc: (n) => `Se cuentan ${30 * n} min más de producción cuando no estás.` },
  { id: "tesoros", tier: 3, max: 3, nombre: "Tesoros enterrados", k: "tesoro_nivel", v: 0.01, desc: (n) => `Cada nivel de prestigio tiene ${pct(0.01 * n)}% de chance de regalarte un artefacto al azar.` },
  { id: "fortuna_merc", tier: 3, max: 4, nombre: "Fortuna del mercader", k: "merc_tier", v: 0.25, desc: (n) => `Los artefactos épicos y legendarios pesan ${pct(0.25 * n)}% más en las ofertas del Mercader.` },
  { id: "catalejo_pu", tier: 3, max: 5, nombre: "Catalejo del tiempo", k: "vel_all", v: 0.03, desc: (n) => `Todos los honguitos trabajan un ${pct(0.03 * n)}% más rápido.` },
  { id: "dung_estudio", tier: 3, max: 4, nombre: "Escuela de mercenarios", k: "dung_stats", v: 0.1, desc: (n) => `Los mercenarios tienen un ${pct(0.1 * n)}% más de vida y ataque.` },
  { id: "dung_marcha", tier: 3, max: 3, nombre: "Marcha forzada", k: "dung_vel", v: 0.1, desc: (n) => `La exploración de la dungeon es un ${pct(0.1 * n)}% más rápida.` },
  { id: "cometa_pu", tier: 3, max: 3, nombre: "Cola de cometa", k: "cometa_val", v: 1.3, m: true, desc: (n) => `Los cometas de ideas dan ${mult(1.3 ** n)} puntos.` },
  { id: "red_cielo", tier: 3, max: 3, nombre: "Redes del cielo", k: "autoevento", v: 0.1, desc: (n) => `Un ${pct(0.1 * n)}% más de chance de que los eventos del cielo se recojan solos.` },
  { id: "urbanismo", tier: 3, max: 3, nombre: "Urbanismo hongil", k: "syn_edif", v: 0.01, desc: (n) => `+${pct(0.01 * n)}% de producción total por cada edificio construido.` },
  { id: "prado_vivo", tier: 3, max: 3, nombre: "Prado vivo", k: "syn_basico", v: 0.005, desc: (n) => `+${pct(0.005 * n)}% de producción total por cada 25 honguitos básicos.` },
  { id: "rebrote", tier: 3, max: 3, nombre: "Rebrote fértil", k: "mina_regrow", v: 1.3, m: true, desc: (n) => `Los yacimientos rebrotan ${mult(1.3 ** n)} más rápido.` },
  { id: "alerta_pu", tier: 3, max: 3, nombre: "Vigías de la pradera", k: "inv_tiempo", v: 5, desc: (n) => `Las invasiones duran ${5 * n} s más antes de que roben.` },
  { id: "saqueo", tier: 3, max: 2, nombre: "Botín de guerra", k: "inv_botin", v: 0.5, desc: (n) => `Cada criatura derrotada deja un ${pct(0.5 * n)}% más de esporas.` },
  { id: "dedos_eternos", tier: 3, max: 3, nombre: "Dedos infatigables", k: "auto_vel_pu", v: 0.5, desc: (n) => `El autoclick toca ${num(0.5 * n)} veces por segundo más.` },

  // ── Tier 4 (120 PP gastados) ──
  { id: "esporas_anc", tier: 4, max: 3, nombre: "Esporas ancestrales", k: "prod_all", v: 1.3, m: true, desc: (n) => `Toda la producción ${mult(1.3 ** n)}.` },
  { id: "mercader_amigo", tier: 4, max: 2, nombre: "Mercader amigo", k: "arc_freq", v: 0.25, desc: (n) => `Los eventos de los magos (y el Mercader) aparecen un ${pct(0.25 * n)}% más seguido.` },
  { id: "sellos", tier: 4, max: 3, nombre: "Sellos viejos", k: "costo_mej", v: 0.1, desc: (n) => `Las mejoras de edificio cuestan un ${pct(0.1 * n)}% menos.` },
  { id: "buscatesoros", tier: 4, max: 2, nombre: "Buscatesoros", k: "merc_ofertas", v: 1, desc: (n) => `El Mercader ofrece ${n} ${n === 1 ? "artefacto" : "artefactos"} más para elegir.` },
  { id: "hallazgos", tier: 4, max: 3, nombre: "Hallazgos garantizados", k: "merc_garantia", v: 1, desc: (n) => `Las primeras ${n} ${n === 1 ? "visita" : "visitas"} del Mercader de cada corrida traen al menos un artefacto épico o legendario.` },
  { id: "dung_botin", tier: 4, max: 3, nombre: "Botín del jefe", k: "dung_rec", v: 1.2, m: true, desc: (n) => `La recompensa de la dungeon es ${mult(1.2 ** n)}.` },
  { id: "cazacristales", tier: 4, max: 3, nombre: "Cazacristales", k: "dung_cristal", v: 0.05, desc: (n) => `+${pct(0.05 * n)}% de chance de cristal radiante al vencer al jefe.` },
  { id: "veteranos", tier: 4, max: 2, nombre: "Veteranos de guerra", k: "dung_nivel", v: 1, desc: (n) => `Los mercenarios ganan ${n} ${n === 1 ? "nivel extra" : "niveles extra"} por exploración.` },
  { id: "cartografos", tier: 4, max: 3, nombre: "Cartógrafos lunares", k: "luna_base", v: 0.003, desc: (n) => `+${pct(0.003 * n)}% de producción total por cada base lunar.` },
  { id: "auto_potente", tier: 4, max: 5, nombre: "Dedos de hierro", k: "auto_frac", v: 0.1, desc: (n) => `Cada toque automático vale un ${pct(0.1 * n)}% más (suma al valor del autoclick).` },
  { id: "legado", tier: 4, max: 2, nombre: "Legado robusto", k: "inicio_hong_pp", v: 1 / 6, desc: (n) => `Empezás con +1 honguito básico por cada ${6 / n} PP gastados.` },
  { id: "herencia_dorada", tier: 4, max: 2, nombre: "Herencia dorada", k: "inicio_esp_pp", v: 50, desc: (n) => `Empezás con +${50 * n} esporas por cada PP gastado.` },
  { id: "resonancia_pu", tier: 4, max: 4, nombre: "Eco de cristal", k: "cristal_extra", v: 0.005, desc: (n) => `Cada cristal radiante sube la producción un ${pct(0.005 * n)}% más.` },

  // ── Tier 5 (180 PP gastados): conservar artefactos y saltos grandes ──
  { id: "boveda", tier: 5, max: 3, nombre: "Bóveda de reyes", k: "reliquia", v: 1, desc: (n) => `Al prestigiar conservás ${n} ${n === 1 ? "artefacto más" : "artefactos más"} al azar.` },
  { id: "reliquia_divina", tier: 5, max: 1, nombre: "Reliquia divina", k: "reliquia_mejor", v: 1, desc: () => "La reliquia que conservás es siempre la de mayor tier, no una al azar." },
  { id: "corazon", tier: 5, max: 2, nombre: "Corazón del micelio", k: "prod_all", v: 1.6, m: true, desc: (n) => `Toda la producción ${mult(1.6 ** n)}.` },
  { id: "tiempo_detenido", tier: 5, max: 3, nombre: "Tiempo detenido", k: "offline", v: 3600, desc: (n) => `Se cuentan ${n} h más de producción cuando no estás.` },
  { id: "toque_divino", tier: 5, max: 3, nombre: "Toque divino", k: "toque_mult", v: 2, m: true, desc: (n) => `Los toques al hongo madre valen ${mult(2 ** n)} más.` },

  // ── Tier 6 (250 PP gastados) ──
  { id: "rey_micelio", tier: 6, max: 2, nombre: "Rey del micelio", k: "prod_all", v: 2, m: true, desc: (n) => `Toda la producción ×${2 ** n}.` },
  { id: "banquete", tier: 6, max: 3, nombre: "Banquete eterno", k: "evt_freq", v: 0.5, desc: (n) => `Los eventos del cielo aparecen un ${pct(0.5 * n)}% más seguido.` },
  { id: "pacto_mercader", tier: 6, max: 3, nombre: "Pacto con el mercader", k: "merc_ofertas", v: 1, desc: (n) => `El Mercader ofrece ${n} ${n === 1 ? "artefacto" : "artefactos"} más para elegir.` },
  { id: "ascension", tier: 6, max: 3, nombre: "Ascensión", k: "costo_hong", v: 0.06, desc: (n) => `Los honguitos suben un ${pct(0.06 * n)}% menos su precio por unidad.` },

  // ── Eternas (se destraban con el primer PP gastado, rangos sin tope, 2 PP por rango) ──
  { id: "et_conquista", tier: 0, max: Infinity, nombre: "Conquista eterna", k: "prod_all", v: 1.01, m: true, desc: (n) => `Toda la producción ${mult(1.01 ** n)}.` },
  { id: "et_toque", tier: 0, max: Infinity, nombre: "Dedos eternos", k: "toque_mult", v: 0.05, lin: true, desc: (n) => `Los toques al hongo madre valen +${pct(0.05 * n)}%.` },
  { id: "et_invocacion", tier: 0, max: Infinity, nombre: "Invocaciones eternas", k: "evt_freq", v: 0.03, desc: (n) => `Los eventos del cielo aparecen un ${pct(0.03 * n)}% más seguido.` },
  { id: "et_dorada", tier: 0, max: Infinity, nombre: "Pepita eterna", k: "dorada_val", v: 0.05, lin: true, desc: (n) => `Las esporas doradas valen +${pct(0.05 * n)}%.` },
  ...TIPOS.map(([id, plural]) => ({ id: "et_" + id, tier: 0, max: Infinity, nombre: "Linaje eterno: " + plural, k: "prod_" + id, v: 1.01, m: true, desc: (n) => `Los ${plural} producen ${mult(1.01 ** n)}.` })),
  // ── Linajes por tipo (como «Ancestor's Picks» de la wiki): +15% por rango para cada tipo de honguito ──
  ...TIPOS.map(([id, plural, tier]) => ({ id: "li_" + id, tier, max: 4, nombre: "Linaje de " + plural, k: "prod_" + id, v: 0.1, lin: true, desc: (n) => `Los ${plural} producen +${pct(0.1 * n)}%.` })),
];
export const PU_POR_ID = Object.fromEntries(PU.map((p) => [p.id, p]));
// las eternas encarecen cada 20 rangos para que sean un pozo de PP y no una escalera infinita
export const costoPU = (p, rango = 0) => (p.max === Infinity ? 2 + Math.floor(rango / 20) : p.costo ?? p.tier);

// Avisos para mostrar como cartelitos (los consume main.js)
export const avisosPU = [];

// efectos agrupados por clave (se consultan miles de veces por segundo)
const POR_CLAVE = {};
for (const p of PU) if (p.k) (POR_CLAVE[p.k] ||= []).push(p);

export const puRango = (state, id) => (state.pu && state.pu[id]) || 0;
// suma de los efectos aditivos de clave k
export function puA(state, k) {
  if (!state.pu) return 0;
  let x = 0;
  for (const p of POR_CLAVE[k] || []) if (!p.m && !p.lin) x += (k === "pp_prod" ? state.ppTotal || 0 : 1) * p.v * puRango(state, p.id);
  return x;
}
// producto de los efectos multiplicativos de clave k
export function puM(state, k) {
  if (!state.pu) return 1;
  let m = 1;
  for (const p of POR_CLAVE[k] || []) { if (p.m) m *= p.v ** puRango(state, p.id); else if (p.lin) m *= 1 + p.v * puRango(state, p.id); }
  return m;
}
const umbralTier = (tier) => (tier === TIER_LIBRE ? 1 : TIER_GASTO[tier - 1]);
export const tierAbierto = (state, tier) => (state.ppGastados || 0) >= umbralTier(tier);
export const umbralDeTier = umbralTier;
export function comprarPU(state, id) {
  const p = PU_POR_ID[id];
  const c = p ? costoPU(p, puRango(state, id)) : 0;
  if (!p || puRango(state, id) >= p.max || !tierAbierto(state, p.tier) || (state.pp || 0) < c) return false;
  state.pp -= c;
  state.ppGastados = (state.ppGastados || 0) + c;
  state.pu[id] = puRango(state, id) + 1;
  return true;
}
// «Reflejos de crisis»: producción extra un rato al empezar un evento
export function buffCrisis(state) {
  const a = puA(state, "crisis_prod");
  if (a > 0) state.buffPU = { mult: 1 + a, hasta: Date.now() + 6000 };
}
// cuántos tiers de prestigio hay destrabados (para «Reservas brillantes»)
export const tiersAbiertos = (state) => TIER_GASTO.filter((g) => (state.ppGastados || 0) >= g).length;
