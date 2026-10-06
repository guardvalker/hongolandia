// Logros (idea de los logros de Gnorp Apologue): metas de todo tipo que se cumplen una sola vez en la partida y se conservan al
// prestigiar. Cada uno suma +2% a toda la producción. `ok(state)` dice si ya se cumplió; `pista` ayuda con los difíciles.
const nv = (s, id) => { const v = s.mejoras[id]; return typeof v === "number" ? v : v ? 1 : 0; };
const cant = (s, id) => s.honguitos[id] || 0;
const RACHAS = ["maestro", "musico", "jardinero", "obrero", "minero", "mago", "atleta", "cristalero"];
export const BONO_LOGRO = 0.02;
export const LOGROS = [
  { id: "primer_edificio", nombre: "Primera piedra", desc: "Construí tu primer edificio.", ok: (s) => Object.keys(s.edificios).length >= 1 },
  { id: "diez_edificios", nombre: "Pueblo hongil", desc: "Tené 10 edificios a la vez.", ok: (s) => Object.keys(s.edificios).length >= 10 },
  { id: "cien_basicos", nombre: "Cuadrilla enorme", desc: "Tené 100 honguitos básicos.", ok: (s) => cant(s, "basico") >= 100 },
  { id: "mil_toques", nombre: "Dedos de micelio", desc: "Tocá el hongo madre 1.000 veces.", ok: (s) => (s.flags.nToques || 0) >= 1000 },
  { id: "primer_colapso", nombre: "¡Se derrumbó!", desc: "Dejá que una montaña de esporas colapse.", ok: (s) => !!s.flags.colapso },
  { id: "primer_prisma", nombre: "Primer destello", desc: "Conseguí tu primer Prisma cristalizando una montaña.", ok: (s) => (s.prisma?.tot || 0) >= 1 || !!s.flags.prismaAlgunaVez },
  { id: "cristal_perfecto", nombre: "Corte perfecto", desc: "Cristalizá una montaña al 95% o más sin que colapse.", ok: (s) => !!s.flags.cristal95 },
  { id: "compactacion_10", nombre: "Presión máxima", desc: "Llevá la compactación de la corrida al nivel 10.", ok: (s) => (s.prisma?.nivel || 0) >= 10 || !!s.flags.compMax },
  { id: "diez_prismas", nombre: "Colección prismática", desc: "Tené 10 mejoras prismáticas a la vez.", ok: (s) => Object.keys(s.prisma?.comprados || {}).length >= 10 },
  { id: "primer_prestigio", nombre: "Un nuevo comienzo", desc: "Prestigiá por primera vez.", ok: (s) => (s.prestigios || 0) >= 1 },
  { id: "diez_prestigios", nombre: "Ciclo eterno", desc: "Prestigiá 10 veces.", ok: (s) => (s.prestigios || 0) >= 10 },
  { id: "cincuenta_pp", nombre: "Memoria larga", desc: "Ganá 50 PP en toda la partida.", ok: (s) => (s.ppTotal || 0) >= 50 },
  { id: "primer_talento", nombre: "Primer pacto con el micelio", desc: "Equipá un talento en el Altar.", ok: (s) => (s.altar?.talentos.length || 0) >= 1 },
  { id: "pacto", nombre: "Trato hecho", desc: "Activá un pacto del Altar.", ok: (s) => !!s.altar?.pacto },
  { id: "altar_lleno", nombre: "Altar completo", desc: "Tené todos los espacios de talento ocupados (con al menos 4).", ok: (s) => (s.altar?.talentos.length || 0) >= 4 && s.altar.talentos.length >= 2 + [10, 40, 100, 200, 350].filter((u) => (s.ppTotal || 0) >= u).length },
  { id: "hifas", nombre: "Raíces profundas", desc: "Llevá la Red de hifas al nivel 10.", ok: (s) => nv(s, "logi_hifas") >= 10 },
  { id: "polillas", nombre: "Nube de alas", desc: "Llevá las Polillas de esporas al nivel 10.", ok: (s) => nv(s, "logi_polillas") >= 10 },
  { id: "savia", nombre: "Jardín de colores", desc: "Usá una savia del Vivero.", ok: (s) => !!s.flags.savia },
  { id: "rachas", nombre: "Todos en racha", desc: "Tené las 8 rachas de edificio compradas.", ok: (s) => RACHAS.every((t) => nv(s, t + "_racha") >= 1) },
  { id: "artefactos", nombre: "Coleccionista", desc: "Tené 10 artefactos del Mercader a la vez.", ok: (s) => Object.keys(s.arte?.tienen || {}).length >= 10 },
  { id: "dungeon", nombre: "Rey del moho", desc: "Vencé a un jefe de la dungeon.", ok: (s) => (s.dungeon?.jefes || 0) >= 1 },
  { id: "invasion", nombre: "Muralla viva", desc: "Repelé una invasión.", ok: (s) => (s.arcano?.repelidas || 0) >= 1 },
  { id: "invasion10", nombre: "Guardianes del prado", desc: "Repelé 10 invasiones.", ok: (s) => (s.arcano?.repelidas || 0) >= 10 },
  { id: "luna", nombre: "Ciudad lunar", desc: "Tené 10 bases en la luna.", ok: (s) => (s.luna?.bases.length || 0) >= 10 },
  { id: "esporas_1e12", nombre: "Mar de esporas", desc: "Ganá 1e12 esporas en una sola corrida.", ok: (s) => s.total.gte(1e12) },
];
export const LOGRO_POR_ID = Object.fromEntries(LOGROS.map((l) => [l.id, l]));
export const cantLogros = (state) => Object.keys(state.logros || {}).length;
// Devuelve los logros recién cumplidos
export function revisarLogros(state) {
  const L = state.logros || (state.logros = {});
  const nuevos = [];
  for (const l of LOGROS) if (!L[l.id] && l.ok(state)) { L[l.id] = true; nuevos.push(l); }
  return nuevos;
}
