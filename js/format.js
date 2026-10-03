import { D } from './decimal.js';

// Formato de números del juego. Una sola función para poder sumar
// notaciones alternativas (ingeniería, letras) desde Ajustes más adelante.
export function fmt(x) {
  const d = D(x);
  if (d.lt(0)) return "-" + fmt(d.neg());
  if (d.lt(10)) {
    const n = d.toNumber();
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }
  if (d.lt(1e6)) return Math.floor(d.toNumber()).toLocaleString("es-AR");
  if (d.layer >= 2) return "e" + fmt(d.log10());
  return d.toExponential(2).replace("e+", "e");
}

export function fmtRate(x) {
  return fmt(x) + "/s";
}
