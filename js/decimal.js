// break_eternity.js se carga como script clásico (vendor/) y expone Decimal global.
export const Dec = window.Decimal;
export const D = (x) => new Dec(x);
