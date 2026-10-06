import { D } from './decimal.js';
import { nuevoEstado } from './state.js';
import { prestigio } from './engine.js';
import { puRango } from './puData.js';

// PP que daría prestigiar ahora: uno por cada nivel de prestigio de la corrida (14 niveles ≈ lo que
// recomienda la wiki para la primera vuelta: alcanza para 12 en tier 1 y un rango de tier 2).
export const ppAlPrestigiar = (state) => prestigio(state.total).puntos;

// Empieza una corrida nueva. Se conserva: PP y mejoras de prestigio, mercenarios y progreso de la dungeon,
// hongos del fondo, hallazgos (flags) y las reliquias que permita «Reliquia heredada».
export function prestigiar(viejo) {
  const gana = ppAlPrestigiar(viejo);
  const n = nuevoEstado();
  n.pp = (viejo.pp || 0) + gana;
  n.ppGastados = viejo.ppGastados || 0;
  n.ppTotal = (viejo.ppTotal || 0) + gana;
  n.prestigios = (viejo.prestigios || 0) + 1;
  n.pu = { ...viejo.pu };
  n.dungeon = viejo.dungeon;
  n.fondo = viejo.fondo;
  n.flags = { ...viejo.flags };
  delete n.flags.sobrecarga;
  n.arcano = { ...viejo.arcano, tormenta: { mult: 1, hasta: 0 } };
  n.creado = viejo.creado;
  // reliquias: se conservan algunos artefactos al azar
  const ids = Object.keys(viejo.arte.tienen);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  for (const id of ids.slice(0, puRango(viejo, "reliquia"))) n.arte.tienen[id] = true;
  // arranque de la corrida
  n.honguitos.basico = 1 + 4 * puRango(viejo, "semillas");
  n.esporas = D(400 * puRango(viejo, "herencia"));
  n.total = D(0);
  if (puRango(viejo, "auto_inicio")) n.mejoras.auto_unlock = 1;
  return n;
}
