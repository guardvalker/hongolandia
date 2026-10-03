import { D } from './decimal.js';
import { HONGUITOS, MEJORAS } from './data.js';

// Lógica pura del juego: nada de DOM ni canvas acá.

export function multiplicador(state, tipoId) {
  let m = D(1);
  for (const mj of MEJORAS) {
    if (state.mejoras[mj.id] && (mj.aplica === "todos" || mj.aplica === tipoId)) m = m.mul(mj.mult);
  }
  return m;
}

export function produccionPorSeg(state) {
  let total = D(0);
  for (const id in HONGUITOS) {
    const n = state.honguitos[id] || 0;
    if (n > 0) total = total.add(HONGUITOS[id].prod.mul(n).mul(multiplicador(state, id)));
  }
  return total;
}

// dt en segundos. Sin progreso offline: el llamador topea dt (ver main.js).
export function tick(state, dt) {
  const ganancia = produccionPorSeg(state).mul(dt);
  state.esporas = state.esporas.add(ganancia);
  state.total = state.total.add(ganancia);
}

export function costoHonguito(state, id) {
  const t = HONGUITOS[id];
  const n = state.honguitos[id] || 0;
  return t.costoBase.mul(D(t.crecimiento).pow(Math.max(0, n - 1))).ceil();
}

export function comprarHonguito(state, id) {
  const c = costoHonguito(state, id);
  if (state.esporas.lt(c)) return false;
  state.esporas = state.esporas.sub(c);
  state.honguitos[id] = (state.honguitos[id] || 0) + 1;
  return true;
}

export function comprarMejora(state, id) {
  const mj = MEJORAS.find((m) => m.id === id);
  if (!mj || state.mejoras[id] || state.esporas.lt(mj.costo)) return false;
  state.esporas = state.esporas.sub(mj.costo);
  state.mejoras[id] = true;
  return true;
}
