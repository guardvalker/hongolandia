import { D } from './decimal.js';
import { agregarHongoFondo } from './state.js';
import { HONGUITOS, MEJORAS, EDIFICIOS, PRESTIGIO } from './data.js';

// Lógica pura del juego: nada de DOM ni canvas acá.

export function multiplicador(state, tipoId) {
  let m = D(1);
  for (const mj of MEJORAS) {
    if (state.mejoras[mj.id] && (mj.aplica === "todos" || mj.aplica === tipoId)) m = m.mul(mj.mult);
  }
  return m;
}

// Esporas/s que genera un tipo de honguito (con sus mejoras).
export function produccionPorTipo(state, id) {
  const n = state.honguitos[id] || 0;
  return n > 0 ? HONGUITOS[id].prod.mul(n).mul(multiplicador(state, id)) : D(0);
}

// Nivel de prestigio según el total de esporas ganadas, y progreso hacia el siguiente.
export function prestigio(total) {
  const g = PRESTIGIO.crecimiento, c0 = PRESTIGIO.base;
  const acum = (k) => c0.mul(D(g).pow(k).sub(1)).div(g - 1); // esporas totales para tener k puntos
  let n = Math.max(0, Math.floor(total.mul(g - 1).div(c0).add(1).log10().toNumber() / Math.log10(g)));
  while (total.gte(acum(n + 1))) n++;
  while (n > 0 && total.lt(acum(n))) n--;
  const base = acum(n), need = acum(n + 1).sub(base), cur = total.sub(base);
  return { puntos: n, cur, need, frac: Math.min(1, Math.max(0, cur.div(need).toNumber())) };
}

// Cada 5 niveles de prestigio crece un hongo gigante en el fondo.
export function revisarHitos(state) {
  const n = Math.floor(prestigio(state.total).puntos / 5);
  while (state.hitos < n) {
    state.hitos++;
    agregarHongoFondo(state);
  }
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

// Se paga al ubicarlo en el piso (x = fracción del ancho de pantalla).
export function colocarEdificio(state, id, x) {
  const e = EDIFICIOS[id];
  if (!e || state.edificios[id] || state.esporas.lt(e.costo)) return false;
  state.esporas = state.esporas.sub(e.costo);
  state.edificios[id] = { x };
  agregarHongoFondo(state);
  return true;
}

export function comprarMejora(state, id) {
  const mj = MEJORAS.find((m) => m.id === id);
  if (!mj || state.mejoras[id] || state.esporas.lt(mj.costo)) return false;
  state.esporas = state.esporas.sub(mj.costo);
  state.mejoras[id] = true;
  return true;
}
