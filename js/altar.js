// Altar de micelio (idea de la Piedra de talentos y los Acuerdos del Santuario de Gnorp Apologue).
// Talentos: se equipan en un número limitado de espacios (crece con los PP ganados en toda la partida) y cambian cómo se
// juega la corrida; se pueden cambiar cuando quieras. Pactos: poderosos pero con un costo, y solo uno activo a la vez
// (salvo con el talento «Pacto total»). Cada efecto es [clave, valor] como los artefactos: arteM los multiplica y arteA los suma.
export const UMBRALES_ESPACIO = [10, 40, 100, 200, 350]; // PP ganados en total para cada espacio extra (se empieza con 2)
export const espaciosAltar = (state) => 2 + UMBRALES_ESPACIO.filter((u) => (state.ppTotal || 0) >= u).length;
export const UMBRAL_TIER_TALENTO = [0, 10, 40, 100, 200];
export const talentoAbierto = (state, t) => (state.ppTotal || 0) >= UMBRAL_TIER_TALENTO[t.tier];

const pct = (x) => Math.round(x * 100);
export const TALENTOS = [
  // tier 0: desde el primer prestigio
  { id: "t_manos", tier: 0, nombre: "Manos de micelio", desc: "Los toques al hongo madre valen ×2.", ef: [["toque_mult", 2]] },
  { id: "t_paso", tier: 0, nombre: "Paso ligero", desc: "Los básicos caminan un 20% más rápido.", ef: [["logi_vel", 0.2]] },
  { id: "t_mochila", tier: 0, nombre: "Mochila amplia", desc: "Los manojos de los básicos son un 30% más grandes.", ef: [["logi_carga", 1.3]] },
  { id: "t_mano_abierta", tier: 0, nombre: "Mano abierta", desc: "Los honguitos suben un 8% menos su precio por unidad.", ef: [["costo_hong", 0.08]] },
  { id: "t_ojo", tier: 0, nombre: "Ojo de águila", desc: "Los eventos del cielo aparecen un 30% más seguido y un 15% más se recogen solos.", ef: [["evt_freq", 0.3], ["autoevento", 0.15]] },
  // tier 1 (10 PP en total)
  { id: "t_obra", tier: 1, nombre: "Obra ligera", desc: "Los edificios cuestan un 20% menos.", ef: [["costo_edif", 0.2]] },
  { id: "t_taller", tier: 1, nombre: "Taller afilado", desc: "Las mejoras de edificio cuestan un 15% menos.", ef: [["costo_mej", 0.15]] },
  { id: "t_corte", tier: 1, nombre: "Corte fino", desc: "Una montaña cristalizada da Prisma desde el 35% de altura (en vez del 50%).", ef: [["comp_umbral", 0.15]] },
  { id: "t_hitos", tier: 1, nombre: "Hitos cercanos", desc: "Los hitos de cantidad se alcanzan con un 10% menos de honguitos.", ef: [["hito_bajo", 0.1]] },
  { id: "t_gran_prensa", tier: 1, nombre: "Gran prensa", desc: "Las montañas compactadas crecen un punto más antes de colapsar (+1 a su altura máxima).", ef: [["comp_alt", 1]] },
  // tier 2 (40 PP)
  { id: "t_salvataje", tier: 2, nombre: "Salvataje", desc: "Cuando una montaña colapsa, se salva el 35% de sus esporas.", ef: [["colapso_resto", 0.35]] },
  { id: "t_coro", tier: 2, nombre: "Coro del prado", desc: "+1% de producción total por cada 25 honguitos básicos.", ef: [["syn_basico", 0.01]] },
  { id: "t_plano", tier: 2, nombre: "Plano maestro", desc: "+2% de producción total por cada edificio construido.", ef: [["syn_edif", 0.02]] },
  { id: "t_bolsa", tier: 2, nombre: "Bolsa dorada", desc: "Las esporas doradas valen ×2,5.", ef: [["dorada_val", 2.5]] },
  { id: "t_reloj", tier: 2, nombre: "Reloj de arena", desc: "Todos los honguitos trabajan un 10% más rápido.", ef: [["vel_all", 0.1]] },
  // tier 3 (100 PP)
  { id: "t_iman", tier: 3, nombre: "Imán de prismas", desc: "Cristalizar con la montaña casi llena (85% o más) da 1 Prisma extra.", ef: [["prisma_extra", 1]] },
  { id: "t_fase", tier: 3, nombre: "Fase doble", desc: "El bono de cristalización es un 50% mayor.", ef: [["comp_bono", 1.5]] },
  { id: "t_savia", tier: 3, nombre: "Savia pura", desc: "Toda la producción ×1,5.", ef: [["prod_all", 1.5]] },
  { id: "t_siesta", tier: 3, nombre: "Siesta larga", desc: "Se cuenta 1 hora más de producción cuando no estás.", ef: [["offline", 3600]] },
  { id: "t_pacto_total", tier: 3, nombre: "Pacto total", desc: "Todos los pactos del Altar están activos a la vez (con todos sus costos).", ef: [], especial: "pactos_todos" },
  // tier 4 (200 PP)
  { id: "t_eco", tier: 4, nombre: "Eco profundo", desc: "Cada nivel de compactación de la corrida suma +3% a toda la producción.", ef: [["comp_prod", 0.03]] },
  { id: "t_ojo_micelio", tier: 4, nombre: "Ojo del micelio", desc: "Toda la producción ×1,8.", ef: [["prod_all", 1.8]] },
  { id: "t_cielo_abierto", tier: 4, nombre: "Cielo abierto", desc: "Los eventos del cielo y los de los magos aparecen un 40% más seguido.", ef: [["evt_freq", 0.4], ["arc_freq", 0.4]] },
];
export const TALENTO_POR_ID = Object.fromEntries(TALENTOS.map((t) => [t.id, t]));

// Pactos: una ventaja grande a cambio de un costo. Un solo pacto activo (o todos con «Pacto total»).
export const PACTOS = [
  { id: "pa_cosecha", nombre: "Pacto de la cosecha", ventaja: "Los toques valen ×4 y el autoclick pega un 30% más fuerte.", costo: "Toda la producción −10%.", ef: [["toque_mult", 4], ["auto_frac", 0.3], ["prod_all", 0.9]] },
  { id: "pa_camino", nombre: "Pacto del camino", ventaja: "Los manojos de los básicos ×2 y caminan un 40% más rápido.", costo: "Toda la producción −10%.", ef: [["logi_carga", 2], ["logi_vel", 0.4], ["prod_all", 0.9]] },
  { id: "pa_cielo", nombre: "Pacto del cielo", ventaja: "Los eventos del cielo y los de los magos aparecen un 80% más seguido y duran 6 s más.", costo: "Toda la producción −15%.", ef: [["evt_freq", 0.8], ["arc_freq", 0.8], ["evt_dur", 6], ["prod_all", 0.85]] },
  { id: "pa_cristal", nombre: "Pacto del cristal", ventaja: "El bono de cristalización ×2 y +1 Prisma al cristalizar casi lleno.", costo: "Los básicos caminan un 20% más lento y las montañas compactadas crecen un punto menos.", ef: [["comp_bono", 2], ["prisma_extra", 1], ["logi_vel", -0.2], ["comp_alt", -1]] },
  { id: "pa_tesoro", nombre: "Pacto del tesoro", ventaja: "El Mercader ofrece 2 artefactos más y los raros pesan un 50% más.", costo: "Toda la producción −10%.", ef: [["merc_ofertas", 2], ["merc_tier", 0.5], ["prod_all", 0.9]] },
  { id: "pa_guerra", nombre: "Pacto de guerra", ventaja: "Enemigos con un 30% menos de vida, +100% de botín y los mercenarios +30% de vida y ataque.", costo: "Toda la producción −10%.", ef: [["inv_vida", 0.3], ["inv_botin", 1], ["dung_stats", 0.3], ["prod_all", 0.9]] },
];
export const PACTO_POR_ID = Object.fromEntries(PACTOS.map((p) => [p.id, p]));

const VACIO = [];
// efectos [k, v] activos del Altar (los lee arteM/arteA)
export function efectosAltar(state) {
  const a = state.altar;
  if (!a || (!a.talentos.length && !a.pacto)) return VACIO;
  const out = [];
  let todos = false;
  for (const id of a.talentos) { const t = TALENTO_POR_ID[id]; if (t) { out.push(...t.ef); if (t.especial === "pactos_todos") todos = true; } }
  if (todos) for (const p of PACTOS) out.push(...p.ef);
  else if (a.pacto && PACTO_POR_ID[a.pacto]) out.push(...PACTO_POR_ID[a.pacto].ef);
  return out;
}
export const pactoActivo = (state, id) => !!state.altar && (state.altar.pacto === id || state.altar.talentos.includes("t_pacto_total"));

// Equipar/quitar un talento. Devuelve un texto si no se pudo.
export function alternarTalento(state, id) {
  const t = TALENTO_POR_ID[id], a = state.altar;
  if (!t || !talentoAbierto(state, t)) return "Todavía no está disponible.";
  const i = a.talentos.indexOf(id);
  if (i >= 0) { a.talentos.splice(i, 1); return ""; }
  if (a.talentos.length >= espaciosAltar(state)) return "No quedan espacios: sacá otro talento primero.";
  a.talentos.push(id);
  return "";
}
export function elegirPacto(state, id) {
  state.altar.pacto = state.altar.pacto === id ? null : id;
}
