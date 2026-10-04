import { D } from './decimal.js';

// ---- Valores ----
// MODO_PRUEBA: todo cuesta 1, los precios no crecen y los edificios aparecen desde el inicio, para
// probar cosas. En false se usan los valores reales, que salen de la fórmula por tier de abajo.
export const MODO_PRUEBA = true;

// Cada "tier" es un escalón de la economía: el honguito básico es el tier 0 y cada edificio con su
// honguito es el siguiente. Para meter un edificio entre medio solo hay que ponerlo en la posición
// que corresponde (campo `tier`) y correr los de arriba un lugar: todo se recalcula.
//   producción  = 0,1 · 10^tier  esporas/s por unidad
//   costo base  = 8 · 20^tier    (el precio de cada unidad sube ×crecimiento por cada una que ya tenés)
//   crecimiento = 1,25 + 0,04·tier
//   edificio    = 1,2 × costo base de su honguito; aparece al haber ganado el 25% de su costo
//                 (el primer edificio, tier 1, aparece desde el inicio)
const FACTOR_COSTO = 20;
export function valoresTier(tier) {
  const costoBase = Math.ceil(8 * Math.pow(FACTOR_COSTO, tier));
  const costoEdificio = Math.ceil(costoBase * 1.2);
  return {
    prod: 0.1 * Math.pow(10, tier),
    costoBase,
    crecimiento: 1.25 + 0.04 * tier,
    costoEdificio,
    desbloqueo: tier <= 1 ? 0 : Math.ceil(costoEdificio * 0.25),
  };
}
const C = (x) => (MODO_PRUEBA ? D(1) : D(x));

// Etapas del hongo madre: se alcanzan por total de esporas ganadas (histórico).
// Cada etapa cambia el sprite del hongo madre (assets/madre_N.png) y (más adelante)
// desbloquea tipos de honguitos.
export const ETAPAS = [
  { total: D(0) },
  { total: D(300) },
  { total: D(6e3) },
  { total: D(1.5e5) },
];

// Edificios que el jugador compra en el hongo madre y ubica en el piso. `x` (fracción del
// ancho de la pantalla) se guarda en state.edificios[id]. Cada uno tiene su propia ventana.
// Se listan en orden de tier (el orden es el de la ventana del hongo madre).
const EDIF_DEF = [
  {
    id: "escuela",
    tier: 1,
    nombre: "Escuela hongil",
    desc: "Un hongo con campana y pizarrón. Habilita a los maestros, que pasean con sus alumnitos y les dan clase.",
    color: "#b5e61d",
  },
  {
    id: "conservatorio",
    tier: 2,
    nombre: "Conservatorio hongil",
    desc: "Un hongo con aires musicales. Hace crecer un 15% al hongo madre y habilita a los músicos.",
    color: "#a77bff", // mancha que suma al sombrero del hongo madre
    crecimientoMadre: 1.15,
  },
  {
    id: "vivero",
    tier: 3,
    nombre: "Vivero hongil",
    desc: "Un hongo con invernadero. Habilita a los jardineros, que riegan el piso y hacen brotar honguitos pasajeros.",
    color: "#2fa84f",
  },
  {
    id: "universidad",
    tier: 3.5, // sin honguito propio: no produce, investiga (el tier solo fija su costo)
    nombre: "Universidad hongil",
    desc: "Un hongo con columnas y birrete. No produce esporas: investiga mejoras para los demás honguitos y tecnologías ligadas al tema de cada edificio.",
    color: "#2fd4c4",
  },
  {
    id: "fabrica",
    tier: 4,
    nombre: "Fábrica hongil",
    desc: "Un hongo con chimeneas y cinta transportadora. Habilita a los obreros, que fabrican hongos chiquitos... y humo verde que a veces vuelve como lluvia ácida.",
    color: "#9db4c8",
  },
  {
    id: "gimnasio",
    tier: 5,
    nombre: "Gym hongil",
    desc: "Un hongo con pesas. Habilita a los atletas, que entrenan afuera con mancuernas y sudan esporas.",
    color: "#ff8a1f",
  },
  {
    id: "trade",
    tier: 6,
    nombre: "Trade center hongil",
    desc: "Un hongo con pantallas de bolsa. Habilita a los traders: sus acciones suben y, al llegar arriba, cobran todas las esporas de golpe.",
    color: "#f5c518",
  },
  {
    id: "astropuerto",
    tier: 7,
    nombre: "Astropuerto hongil",
    desc: "Un hongo con un cohete-hongo estacionado. Habilita a los astronautas, que viajan a la luna y la van llenando de bases hongiles.",
    color: "#4fb4ff",
  },
];
export const EDIFICIOS = Object.fromEntries(EDIF_DEF.map((e) => {
  const v = valoresTier(e.tier);
  return [e.id, { ...e, costo: C(v.costoEdificio), desbloqueo: MODO_PRUEBA ? D(0) : D(v.desbloqueo) }];
}));

// Bolsa (traders): sus ganancias no entran de a poco sino de golpe, cada `ciclo` segundos.
export const BOLSA = { ciclo: 18 };

// Lluvia ácida (la trae la contaminación de la fábrica): cada honguito mojado produce `pct` menos
// durante `dur` segundos. Mojarse de nuevo no suma más %, solo reinicia el tiempo.
export const ACIDO = { pct: 0.4, dur: 20 };

// Luna: cada `ciclo` segundos con astronautas se hace una expedición y la luna suma una base
// (hasta `maxBases`; después las bases existentes crecen).
export const LUNA = { ciclo: 30, maxBases: 80 };

// Barra de prestigio (arriba): se llena con el total de esporas ganadas. Cada punto cuesta
// `crecimiento` veces más que el anterior: el punto k necesita base * crecimiento^(k-1) esporas.
export const PRESTIGIO = { base: D(1000), crecimiento: 1.55 };

// Tipos de honguitos. `sprite` = archivo en assets/ (sin .png). `casa` = edificio donde se compran.
const HONG_DEF = [
  { id: "basico", tier: 0, nombre: "Honguito", sprite: "honguito", desc: "Carga esporas al hongo madre.", color: "#ff6fb5" },
  { id: "maestro", tier: 1, nombre: "Maestro", sprite: "maestro", desc: "Pasea con sus alumnitos y les da clase; tras varias clases alguno se gradúa y salen esporas.", color: "#b5e61d", casa: "escuela" },
  { id: "musico", tier: 2, nombre: "Músico", sprite: "musico", desc: "Canta cada tanto y su música rinde esporas.", color: "#a77bff", casa: "conservatorio" },
  { id: "cientifico", tier: 3.5, tierCosto: 2.5, inv: 1, nombre: "Científico", sprite: "cientifico", desc: "Hace experimentos y genera investigación: cuantos más hay, más rápido se investiga.", color: "#2fd4c4", casa: "universidad" },
  { id: "jardinero", tier: 3, nombre: "Jardinero", sprite: "jardinero", desc: "Riega el piso y brotan honguitos que se desvanecen y se vuelven esporas.", color: "#2fa84f", casa: "vivero" },
  { id: "obrero", tier: 4, nombre: "Obrero", sprite: "obrero", desc: "Trabaja en la fábrica: entra, arma hongos chiquitos y los deja en la cinta. Cuantos más hay, más humo y más lluvia ácida.", color: "#9db4c8", casa: "fabrica" },
  { id: "atleta", tier: 5, nombre: "Atleta", sprite: "atleta", desc: "Entrena con mancuernas al lado del gym y transpira esporas.", color: "#ff8a1f", casa: "gimnasio" },
  { id: "trader", tier: 6, nombre: "Trader", sprite: "trader", desc: "Hace llamados y mueve acciones en el trade center. Cada ciclo de bolsa cobra todo junto.", color: "#f5c518", casa: "trade" },
  { id: "astronauta", tier: 7, nombre: "Astronauta", sprite: "astronauta", desc: "Se sube al cohete, viaja a la luna y vuelve con esporas. Cada expedición suma una base hongil lunar.", color: "#4fb4ff", casa: "astropuerto" },
];
export const HONGUITOS = Object.fromEntries(HONG_DEF.map((h) => {
  const v = valoresTier(h.tierCosto ?? h.tier);
  return [h.id, {
    ...h,
    costoBase: C(v.costoBase),
    crecimiento: MODO_PRUEBA ? 1 : v.crecimiento,
    prod: h.inv ? D(0) : D(valoresTier(h.tier).prod), // los científicos no dan esporas: dan investigación (`invProd`)
    invProd: h.inv ? D(h.inv) : D(0),
  }];
}));

// Mejoras del hongo madre. `aplica`: "todos" o el id de un honguito.
export const MEJORAS = [
  {
    id: "micelio",
    nombre: "Micelio",
    desc: "Todos los honguitos producen ×2.",
    costo: C(250),
    aplica: "todos",
    mult: D(2),
  },
  {
    id: "rocio",
    nombre: "Rocío",
    desc: "Los honguitos básicos producen ×2.",
    costo: C(1500),
    aplica: "basico",
    mult: D(2),
  },
];

// ---- Hitos de cantidad (como en Adventure Capitalist): al tener 25, 50, 100... honguitos de un
// tipo, ese tipo produce ×2 más. Son automáticos.
export const HITOS = [25, 50, 100, 200, 400, 800];

// ---- Investigaciones (Universidad hongil) ----
// Cada tipo de honguito (y "todos") tiene 10 niveles de investigación que suman un % chico de
// producción. El % exacto de cada nivel se sortea con la semilla de la partida (state.semilla),
// así que cambia de una partida a otra. Se investigan de a una, y el progreso lo ponen los
// científicos (puntos de investigación por segundo). Cada nivel exige el anterior y tener el
// edificio de su tema.
const TEC_NOMBRES = {
  todos: ["Método científico", "Revisión por pares", "Becas de investigación", "Congreso internacional", "Premio hongil de ciencias"],
  maestro: ["Pizarrón de tiza fosforescente", "Plan de estudios hongil", "Biblioteca ampliada", "Clases magistrales", "Posgrado fúngico"],
  musico: ["Partituras fúngicas", "Acústica de micelio", "Afinadores de precisión", "Sala de ensayo", "Orquesta sinfónica"],
  jardinero: ["Riego por goteo hongil", "Sustrato enriquecido", "Injertos de colores", "Invernadero climatizado", "Banco de esporas"],
  obrero: ["Herramientas de precisión hongil", "Líneas de montaje", "Cascos reforzados", "Automatización básica", "Control de calidad"],
  atleta: ["Proteína de micelio", "Entrenamiento de élite", "Ropa deportiva técnica", "Fisioterapia hongil", "Dieta balanceada"],
  trader: ["Algoritmo de trading hongil", "Análisis de mercado", "Terminal de cotizaciones", "Cobertura de riesgo", "Información al instante"],
  astronauta: ["Trajes presurizados", "Propulsores de espora", "Navegación estelar", "Escudo térmico", "Observatorio lunar"],
  cientifico: ["Microscopios mejorados", "Laboratorio de alta pureza", "Cuadernos de campo", "Cafetera industrial", "Supercomputadora de micelio"],
};
export const NIVELES_TEC = 10;
export const TECNOLOGIAS = Object.entries(TEC_NOMBRES).flatMap(([target, nombres]) => {
  const h = HONG_DEF.find((x) => x.id === target);
  const edificio = h ? h.casa : "universidad";
  const tier = h ? h.tier : 3.5;
  return Array.from({ length: NIVELES_TEC }, (_, i) => {
    const nivel = i + 1;
    return {
      id: `${target}_${nivel}`,
      target, nivel, edificio,
      req: nivel > 1 ? `${target}_${nivel - 1}` : null,
      nombre: nombres[i % 5] + (nivel > 5 ? " II" : ""),
      trabajo: MODO_PRUEBA ? 4 + nivel : Math.round(40 * Math.pow(1.65, nivel - 1) * Math.pow(1.3, tier)),
    };
  });
});
export const TEC_POR_ID = Object.fromEntries(TECNOLOGIAS.map((t) => [t.id, t]));

// ---- Mejoras de edificio (se compran con esporas en la ventana de cada edificio) ----
// ef: "prod" (×producción), "vel" (más velocidad: animaciones y ciclos más cortos, y un poco de
// producción), "crit" (cada segundo hay `prob` de chance de un golpe crítico: de golpe `seg`
// segundos de producción), "buff" (habilidad activa: ×`mult` durante `dur` s, recarga `cd` s),
// "sinergia" (cada `cada` honguitos de `fuente`, +`bono` a `objetivo`: un tipo, "todos" o
// "investigacion") y "acido" (menos castigo de la lluvia ácida).
// Cada una pide tener `req` honguitos de su tipo. Costo: costo base del tier × mul.
const T = (tier, mul) => C(Math.ceil(valoresTier(tier).costoBase * mul));
const M = (tipo, sufijo, nombre, mul, req, ef) => {
  const h = HONG_DEF.find((x) => x.id === tipo);
  return { id: `${tipo}_${sufijo}`, edificio: h.casa, tipo, nombre, costo: T(h.tierCosto ?? h.tier, mul), req, aplica: tipo, ...ef };
};
export const MEJ_EDIF = [
  M("maestro", "libros", "Libros de texto ilustrados", 4, 5, { ef: "prod", mult: 1.25 }),
  M("maestro", "recreo", "Recreo extendido", 15, 10, { ef: "vel", mult: 1.3 }),
  M("maestro", "honores", "Graduación con honores", 40, 15, { ef: "crit", prob: 0.03, seg: 12 }),
  M("maestro", "tutorias", "Tutorías en red", 90, 20, { ef: "sinergia", fuente: "maestro", cada: 10, bono: 0.03, objetivo: "investigacion" }),
  M("maestro", "examenes", "Semana de exámenes", 250, 25, { ef: "buff", mult: 2, dur: 30, cd: 300 }),

  M("musico", "afinacion", "Afinación perfecta", 4, 5, { ef: "prod", mult: 1.25 }),
  M("musico", "ritmo", "Ritmo acelerado", 15, 10, { ef: "vel", mult: 1.3 }),
  M("musico", "solo", "Solo de virtuoso", 40, 15, { ef: "crit", prob: 0.03, seg: 12 }),
  M("musico", "coro", "Coro hongil", 90, 20, { ef: "sinergia", fuente: "musico", cada: 15, bono: 0.02, objetivo: "todos" }),
  M("musico", "gira", "Gira mundial", 250, 25, { ef: "buff", mult: 2, dur: 30, cd: 300 }),

  M("jardinero", "fertilizante", "Fertilizante orgánico", 4, 5, { ef: "prod", mult: 1.25 }),
  M("jardinero", "riego", "Riego automático", 15, 10, { ef: "vel", mult: 1.3 }),
  M("jardinero", "semillas", "Semillas de colores", 40, 15, { ef: "crit", prob: 0.03, seg: 12 }),
  M("jardinero", "huerta", "Huerta orgánica", 90, 20, { ef: "sinergia", fuente: "jardinero", cada: 10, bono: 0.02, objetivo: "atleta" }),
  M("jardinero", "floracion", "Floración", 250, 25, { ef: "buff", mult: 2, dur: 30, cd: 300 }),

  M("obrero", "especializada", "Mano de obra especializada", 4, 5, { ef: "prod", mult: 1.25 }),
  M("obrero", "turno", "Turno extra", 15, 10, { ef: "vel", mult: 1.3 }),
  M("obrero", "lote", "Lote perfecto", 40, 15, { ef: "crit", prob: 0.03, seg: 12 }),
  M("obrero", "filtros", "Filtros de chimenea hongiles", 60, 15, { ef: "acido", acidoMenos: 0.35 }),
  M("obrero", "turbo", "Cinta turbo", 250, 25, { ef: "buff", mult: 2, dur: 30, cd: 300 }),

  M("atleta", "pesas", "Pesas olímpicas", 4, 5, { ef: "prod", mult: 1.25 }),
  M("atleta", "entrenador", "Entrenador personal", 15, 10, { ef: "vel", mult: 1.3 }),
  M("atleta", "record", "Récord personal", 40, 15, { ef: "crit", prob: 0.03, seg: 12 }),
  M("atleta", "club", "Club deportivo", 90, 20, { ef: "sinergia", fuente: "atleta", cada: 10, bono: 0.02, objetivo: "obrero" }),
  M("atleta", "batido", "Batido de proteína", 250, 25, { ef: "buff", mult: 2, dur: 30, cd: 300 }),

  M("trader", "informacion", "Acceso a información", 4, 5, { ef: "prod", mult: 1.25 }),
  M("trader", "frecuencia", "Terminal de alta frecuencia", 15, 10, { ef: "vel", mult: 1.3 }),
  M("trader", "suerte", "Golpe de suerte", 40, 15, { ef: "crit", prob: 0.03, seg: 12 }),
  M("trader", "fondo", "Fondo de inversión", 90, 20, { ef: "sinergia", fuente: "trader", cada: 10, bono: 0.02, objetivo: "todos" }),
  M("trader", "burbuja", "Burbuja especulativa", 250, 25, { ef: "buff", mult: 2, dur: 30, cd: 300 }),

  M("astronauta", "combustible", "Combustible de espora", 4, 5, { ef: "prod", mult: 1.25 }),
  M("astronauta", "reutilizable", "Cohete reutilizable", 15, 10, { ef: "vel", mult: 1.3 }),
  M("astronauta", "descubrimiento", "Descubrimiento lunar", 40, 15, { ef: "crit", prob: 0.03, seg: 12 }),
  M("astronauta", "observatorio", "Observatorio orbital", 90, 20, { ef: "sinergia", fuente: "astronauta", cada: 10, bono: 0.03, objetivo: "investigacion" }),
  M("astronauta", "gravedad", "Gravedad cero", 250, 25, { ef: "buff", mult: 2, dur: 30, cd: 300 }),

  M("cientifico", "laboratorio", "Laboratorio equipado", 4, 5, { ef: "prod", mult: 1.25 }),
  M("cientifico", "cafe", "Café de laboratorio", 15, 10, { ef: "vel", mult: 1.3 }),
  M("cientifico", "eureka", "¡Eureka!", 40, 15, { ef: "crit", prob: 0.03, seg: 12 }),
  M("cientifico", "premios", "Premios de la academia", 90, 20, { ef: "sinergia", fuente: "cientifico", cada: 10, bono: 0.01, objetivo: "todos" }),
  M("cientifico", "nocturno", "Turno nocturno", 250, 25, { ef: "buff", mult: 2, dur: 30, cd: 300 }),
];
export const MEJ_EDIF_POR_ID = Object.fromEntries(MEJ_EDIF.map((m) => [m.id, m]));
