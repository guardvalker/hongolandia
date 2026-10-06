import { HONGUITOS } from './data.js';

// Prismas: moneda rara de cada corrida (se reinicia al prestigiar). Salen de cristalizar montañas de esporas compactadas
// y se gastan en mejoras únicas: no alcanzan para todas, hay que elegir un estilo. Cada una usa una clave `k` como
// los artefactos (arteM/arteA las suman a las suyas).
const GLOBALES = [
  { id: "p_lente", nombre: "Lente prismático", desc: "Toda la producción ×1,5.", costo: 4, k: "prod_all", v: 1.5 },
  { id: "p_faceta", nombre: "Facetas pulidas", desc: "Al cristalizar, el bono de la montaña es un 50% mayor.", costo: 5, k: "comp_bono", v: 1.5 },
  { id: "p_hifas", nombre: "Hifas veloces", desc: "Los honguitos básicos caminan un 30% más rápido.", costo: 5, k: "logi_vel", v: 0.3 },
  { id: "p_prensa", nombre: "Prensa profunda", desc: "Las montañas compactadas crecen hasta 4,5 veces (en vez de 3) antes de colapsar.", costo: 6, k: "comp_alt", v: 1.5 },
  { id: "p_brisa", nombre: "Brisa cristalina", desc: "Los manojos de los básicos son un 50% más grandes.", costo: 6, k: "logi_carga", v: 1.5 },
  { id: "p_estable", nombre: "Núcleo estable", desc: "Cuando una montaña colapsa, la mitad de las esporas se salvan y llegan al hongo madre.", costo: 7, k: "colapso_resto", v: 0.5 },
  { id: "p_resonancia", nombre: "Resonancia", desc: "Cada nivel de compactación de la corrida suma +2% a toda la producción.", costo: 8, k: "comp_prod", v: 0.02 },
  { id: "p_segunda", nombre: "Segunda luz", desc: "Cristalizar con la montaña casi llena (85% o más) da 1 Prisma extra.", costo: 12, k: "prisma_extra", v: 1 },
];
// una por cada tipo de honguito productor: ×2,5 a su producción. Más caras cuanto más avanzado es el edificio.
const PORTIPO = Object.values(HONGUITOS)
  .filter((h) => h.casa && h.prod.gt(0))
  .sort((a, b) => a.tier - b.tier)
  .map((h, i) => ({ id: "p_" + h.id, nombre: "Prisma de " + h.nombre.toLowerCase() + "s", desc: `Los ${h.nombre.toLowerCase()}s producen ×2,5.`, costo: 3 + 2 * i, k: "prod_" + h.id, v: 2.5, color: h.color }));
export const PRISMAS = [...GLOBALES, ...PORTIPO];
export const PRISMA_POR_ID = Object.fromEntries(PRISMAS.map((p) => [p.id, p]));
