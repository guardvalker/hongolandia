import { D } from './decimal.js';
import { nuevoEstado } from './state.js';
import { prestigio } from './engine.js';
import { puA, tiersAbiertos } from './puData.js';
import { ARTEFACTOS, ARTE_POR_ID } from './artefactos.js';

// PP que daría prestigiar ahora: uno por cada nivel de prestigio de la corrida (14 niveles ≈ lo que
// recomienda la wiki para la primera vuelta: alcanza para 12 en tier 1 y un rango de tier 2).
export const ppAlPrestigiar = (state) => prestigio(state.total).puntos + (state.ppExtra || 0);

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
  // reliquias: se conservan artefactos (al azar, o los de mayor tier con «Reliquia divina»)
  const ids = Object.keys(viejo.arte.tienen);
  if (puA(viejo, "reliquia_mejor") > 0) ids.sort((a, b) => ARTE_POR_ID[b].tier - ARTE_POR_ID[a].tier);
  else for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  for (const id of ids.slice(0, Math.floor(puA(viejo, "reliquia")))) n.arte.tienen[id] = true;
  // «Reliquia de la abuela»: un artefacto común al azar de arranque
  if (puA(viejo, "inicio_arte") > 0) {
    const libres = ARTEFACTOS.filter((a) => a.tier === 1 && !n.arte.tienen[a.id]);
    if (libres.length) n.arte.tienen[libres[Math.floor(Math.random() * libres.length)].id] = true;
  }
  // arranque de la corrida
  const gastados = n.ppGastados;
  n.honguitos.basico = 1 + Math.floor(puA(viejo, "inicio_hong")) + Math.floor(gastados * puA(viejo, "inicio_hong_pp"));
  n.esporas = D(puA(viejo, "inicio_esp") + puA(viejo, "inicio_esp_tier") * tiersAbiertos(viejo) + puA(viejo, "inicio_esp_pp") * gastados);
  n.total = D(0);
  if (puA(viejo, "auto_inicio") > 0) n.mejoras.auto_unlock = 1;
  return n;
}
