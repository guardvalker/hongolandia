// Mejoras de prestigio (permanentes entre corridas). Sin imports: lo usan el motor y los artefactos.
// Como en la wiki de Dwarf Eats Mountain: los tiers se destraban al GASTAR cierta cantidad de PP, y cada
// rango cuesta tanto como su tier. `k` es la clave de efecto que leen arteA/arteM (v por rango; m = se
// multiplica v^rango, si no se suma v*rango). Los de `especial` los resuelve el reinicio o el motor.

export const TIER_GASTO = [0, 12, 45, 120]; // PP gastados para destrabar el tier 1, 2, 3 y 4

export const PU = [
  // tier 1: arreglan los primeros minutos de la corrida
  { id: "semillas", tier: 1, max: 3, nombre: "Semillas heredadas", especial: "inicio_hong", v: 4, desc: (n) => `Empezás cada corrida con +${4 * n} honguitos básicos.` },
  { id: "herencia", tier: 1, max: 3, nombre: "Herencia de esporas", especial: "inicio_esp", v: 400, desc: (n) => `Empezás cada corrida con ${400 * n} esporas.` },
  { id: "micelio_prof", tier: 1, max: 5, nombre: "Micelio profundo", k: "prod_all", v: 1.1, m: true, desc: (n) => `Toda la producción ×${(1.1 ** n).toFixed(2).replace(".", ",")}.` },
  { id: "dedos_ant", tier: 1, max: 4, nombre: "Dedos ancestrales", k: "toque_mult", v: 1.25, m: true, desc: (n) => `Los toques al hongo madre valen ×${(1.25 ** n).toFixed(2).replace(".", ",")}.` },
  { id: "cosecha", tier: 1, max: 3, nombre: "Cosecha dorada", k: "evt_freq", v: 0.2, desc: (n) => `Los eventos del cielo aparecen un ${20 * n}% más seguido.` },
  // tier 2 (12 PP gastados)
  { id: "auto_inicio", tier: 2, max: 1, nombre: "Autoclick heredado", especial: "auto", v: 1, desc: () => "Cada corrida empieza con el autoclick ya desbloqueado." },
  { id: "hitos_pre", tier: 2, max: 3, nombre: "Hitos tempranos", k: "hito_bajo", v: 0.1, desc: (n) => `Los hitos de cantidad se alcanzan con un ${10 * n}% menos de honguitos.` },
  { id: "regateo", tier: 2, max: 4, nombre: "Regateo", k: "costo_edif", v: 0.05, desc: (n) => `Los edificios cuestan un ${5 * n}% menos.` },
  { id: "cuentas", tier: 2, max: 3, nombre: "Cuentas claras", k: "costo_hong", v: 0.04, desc: (n) => `Los honguitos suben un ${4 * n}% menos su precio por unidad.` },
  // tier 3 (45 PP gastados)
  { id: "reliquia", tier: 3, max: 3, nombre: "Reliquia heredada", especial: "reliquia", v: 1, desc: (n) => `Al prestigiar conservás ${n} ${n === 1 ? "artefacto" : "artefactos"} al azar (los demás se pierden).` },
  { id: "memoria", tier: 3, max: 1, nombre: "Memoria del micelio", k: "pp_prod", v: 0.01, desc: () => "Toda la producción +1% por cada PP ganado en toda la partida." },
  { id: "sueno", tier: 3, max: 4, nombre: "Sueño largo", k: "offline", v: 1800, desc: (n) => `Se cuentan ${30 * n} min más de producción cuando no estás.` },
  // tier 4 (120 PP gastados)
  { id: "esporas_anc", tier: 4, max: 3, nombre: "Esporas ancestrales", k: "prod_all", v: 2, m: true, desc: (n) => `Toda la producción ×${2 ** n}.` },
  { id: "mercader_amigo", tier: 4, max: 2, nombre: "Mercader amigo", k: "arc_freq", v: 0.25, desc: (n) => `Los eventos de los magos (y el Mercader) aparecen un ${25 * n}% más seguido.` },
  { id: "sellos", tier: 4, max: 3, nombre: "Sellos viejos", k: "costo_mej", v: 0.1, desc: (n) => `Las mejoras de edificio cuestan un ${10 * n}% menos.` },
];
export const PU_POR_ID = Object.fromEntries(PU.map((p) => [p.id, p]));

export const puRango = (state, id) => (state.pu && state.pu[id]) || 0;
// suma de los efectos aditivos de clave k
export function puA(state, k) {
  if (!state.pu) return 0;
  let x = 0;
  for (const p of PU) if (p.k === k && !p.m) x += (k === "pp_prod" ? (state.ppTotal || 0) : 1) * p.v * puRango(state, p.id);
  return x;
}
// producto de los efectos multiplicativos de clave k
export function puM(state, k) {
  if (!state.pu) return 1;
  let m = 1;
  for (const p of PU) if (p.k === k && p.m) m *= p.v ** puRango(state, p.id);
  return m;
}
export const tierAbierto = (state, tier) => (state.ppGastados || 0) >= TIER_GASTO[tier - 1];
export function comprarPU(state, id) {
  const p = PU_POR_ID[id];
  if (!p || puRango(state, id) >= p.max || !tierAbierto(state, p.tier) || (state.pp || 0) < p.tier) return false;
  state.pp -= p.tier;
  state.ppGastados = (state.ppGastados || 0) + p.tier;
  state.pu[id] = puRango(state, id) + 1;
  return true;
}
