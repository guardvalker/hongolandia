import { D } from './decimal.js';

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
export const EDIFICIOS = {
  conservatorio: {
    id: "conservatorio",
    nombre: "Conservatorio hongil",
    desc: "Un hongo con aires musicales. Hace crecer un 15% al hongo madre y habilita a los músicos.",
    costo: D(1),
    desbloqueo: D(0), // total de esporas a partir del cual aparece en el hongo madre
    crecimientoMadre: 1.15,
    color: "#a77bff", // mancha que suma al sombrero del hongo madre
  },
  vivero: {
    id: "vivero",
    nombre: "Vivero hongil",
    desc: "Un hongo con invernadero. Habilita a los jardineros, que riegan el piso y hacen brotar honguitos pasajeros.",
    costo: D(1),
    desbloqueo: D(0),
    color: "#2fa84f",
  },
  gimnasio: {
    id: "gimnasio",
    nombre: "Gym hongil",
    desc: "Un hongo con pesas. Habilita a los atletas, que entrenan afuera con mancuernas y sudan esporas.",
    costo: D(1), // modo prueba
    desbloqueo: D(0),
    color: "#ff8a1f",
  },
  trade: {
    id: "trade",
    nombre: "Trade center hongil",
    desc: "Un hongo con pantallas de bolsa. Habilita a los traders: sus acciones suben y, al llegar arriba, cobran todas las esporas de golpe.",
    costo: D(1), // modo prueba
    desbloqueo: D(0),
    color: "#f5c518",
  },
  astropuerto: {
    id: "astropuerto",
    nombre: "Astropuerto hongil",
    desc: "Un hongo con un cohete-hongo estacionado. Habilita a los astronautas, que viajan a la luna y la van llenando de bases hongiles.",
    costo: D(1), // modo prueba
    desbloqueo: D(0),
    color: "#4fb4ff",
  },
};

// Bolsa (traders): sus ganancias no entran de a poco sino de golpe, cada `ciclo` segundos.
export const BOLSA = { ciclo: 18 };

// Luna: cada `ciclo` segundos con astronautas se hace una expedición y la luna suma una base
// (hasta `maxBases`; después las bases existentes crecen).
export const LUNA = { ciclo: 30, maxBases: 80 };

// Barra de prestigio (arriba): se llena con el total de esporas ganadas. Cada punto cuesta
// `crecimiento` veces más que el anterior: el punto k necesita base * crecimiento^(k-1) esporas.
export const PRESTIGIO = { base: D(1000), crecimiento: 1.55 };

// Tipos de honguitos. `sprite` = archivo en assets/ (sin .png).
export const HONGUITOS = {
  basico: {
    id: "basico",
    nombre: "Honguito",
    sprite: "honguito",
    desc: "Carga esporas al hongo madre.",
    costoBase: D(1),
    crecimiento: 1,
    prod: D(0.1), // esporas/seg por unidad
    color: "#ff6fb5", // color en el contador de esporas/s
  },
  musico: {
    id: "musico",
    nombre: "Músico",
    sprite: "musico",
    desc: "Canta cada tanto y su música rinde esporas.",
    costoBase: D(1),
    crecimiento: 1,
    prod: D(1), // 10 veces un honguito común
    color: "#a77bff",
    casa: "conservatorio", // se compra desde ese edificio, no desde el hongo madre
  },
  jardinero: {
    id: "jardinero",
    nombre: "Jardinero",
    sprite: "jardinero",
    desc: "Riega el piso y brotan honguitos que se desvanecen y se vuelven esporas.",
    costoBase: D(1),
    crecimiento: 1,
    prod: D(10), // 10 veces un músico
    color: "#2fa84f",
    casa: "vivero",
  },
  atleta: {
    id: "atleta",
    nombre: "Atleta",
    sprite: "atleta",
    desc: "Entrena con mancuernas al lado del gym y transpira esporas.",
    costoBase: D(1), // modo prueba
    crecimiento: 1,
    prod: D(100), // 10 veces un jardinero
    color: "#ff8a1f",
    casa: "gimnasio",
  },
  trader: {
    id: "trader",
    nombre: "Trader",
    sprite: "trader",
    desc: "Hace llamados y mueve acciones en el trade center. Cada ciclo de bolsa cobra todo junto.",
    costoBase: D(1), // modo prueba
    crecimiento: 1,
    prod: D(1000), // 10 veces un atleta (promedio: llega de golpe cada ciclo)
    color: "#f5c518",
    casa: "trade",
  },
  astronauta: {
    id: "astronauta",
    nombre: "Astronauta",
    sprite: "astronauta",
    desc: "Se sube al cohete, viaja a la luna y vuelve con esporas. Cada expedición suma una base hongil lunar.",
    costoBase: D(1), // modo prueba
    crecimiento: 1,
    prod: D(10000), // 10 veces un trader
    color: "#4fb4ff",
    casa: "astropuerto",
  },
};

// Mejoras del hongo madre. `aplica`: "todos" o el id de un honguito.
export const MEJORAS = [
  {
    id: "micelio",
    nombre: "Micelio",
    desc: "Todos los honguitos producen ×2.",
    costo: D(1),
    aplica: "todos",
    mult: D(2),
  },
  {
    id: "rocio",
    nombre: "Rocío",
    desc: "Los honguitos básicos producen ×2.",
    costo: D(1),
    aplica: "basico",
    mult: D(2),
  },
];
