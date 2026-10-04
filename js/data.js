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
  { id: "jardinero", tier: 3, nombre: "Jardinero", sprite: "jardinero", desc: "Riega el piso y brotan honguitos que se desvanecen y se vuelven esporas.", color: "#2fa84f", casa: "vivero" },
  { id: "obrero", tier: 4, nombre: "Obrero", sprite: "obrero", desc: "Trabaja en la fábrica: entra, arma hongos chiquitos y los deja en la cinta. Cuantos más hay, más humo y más lluvia ácida.", color: "#9db4c8", casa: "fabrica" },
  { id: "atleta", tier: 5, nombre: "Atleta", sprite: "atleta", desc: "Entrena con mancuernas al lado del gym y transpira esporas.", color: "#ff8a1f", casa: "gimnasio" },
  { id: "trader", tier: 6, nombre: "Trader", sprite: "trader", desc: "Hace llamados y mueve acciones en el trade center. Cada ciclo de bolsa cobra todo junto.", color: "#f5c518", casa: "trade" },
  { id: "astronauta", tier: 7, nombre: "Astronauta", sprite: "astronauta", desc: "Se sube al cohete, viaja a la luna y vuelve con esporas. Cada expedición suma una base hongil lunar.", color: "#4fb4ff", casa: "astropuerto" },
];
export const HONGUITOS = Object.fromEntries(HONG_DEF.map((h) => {
  const v = valoresTier(h.tier);
  return [h.id, {
    ...h,
    costoBase: C(v.costoBase),
    crecimiento: MODO_PRUEBA ? 1 : v.crecimiento,
    prod: D(v.prod),
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
