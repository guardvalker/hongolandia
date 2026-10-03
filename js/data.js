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

// Tipos de honguitos. `sprite` = archivo en assets/ (sin .png).
export const HONGUITOS = {
  basico: {
    id: "basico",
    nombre: "Honguito",
    sprite: "honguito",
    desc: "Carga esporas al hongo madre.",
    costoBase: D(8),
    crecimiento: 1.25,
    prod: D(0.1), // esporas/seg por unidad
  },
};

// Mejoras del hongo madre. `aplica`: "todos" o el id de un honguito.
export const MEJORAS = [
  {
    id: "micelio",
    nombre: "Micelio",
    desc: "Todos los honguitos producen ×2.",
    costo: D(250),
    aplica: "todos",
    mult: D(2),
  },
  {
    id: "rocio",
    nombre: "Rocío",
    desc: "Los honguitos básicos producen ×2.",
    costo: D(1500),
    aplica: "basico",
    mult: D(2),
  },
];
