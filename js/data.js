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
};

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
