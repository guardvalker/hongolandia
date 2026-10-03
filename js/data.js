import { D } from './decimal.js';

// Etapas del hongo madre: se alcanzan por total de esporas ganadas (histórico).
// Cada etapa agranda el hongo y (más adelante) desbloquea tipos de honguitos.
export const ETAPAS = [
  { total: D(0), escala: 1.0 },
  { total: D(1e3), escala: 1.35 },
  { total: D(1e5), escala: 1.75 },
  { total: D(1e8), escala: 2.0 },
];

// Tipos de honguitos. `id` es también la clave del sprite en sprites.js.
export const HONGUITOS = {
  basico: {
    id: "basico",
    nombre: "Honguito",
    desc: "Carga esporas al hongo madre.",
    costoBase: D(10),
    crecimiento: 1.15,
    prod: D(1), // esporas/seg por unidad
  },
};

// Mejoras del hongo madre. `aplica`: "todos" o el id de un honguito.
export const MEJORAS = [
  {
    id: "micelio",
    nombre: "Micelio",
    desc: "Todos los honguitos producen ×2.",
    costo: D(100),
    aplica: "todos",
    mult: D(2),
  },
  {
    id: "rocio",
    nombre: "Rocío",
    desc: "Los honguitos básicos producen ×2.",
    costo: D(500),
    aplica: "basico",
    mult: D(2),
  },
];
