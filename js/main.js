import { cargar, guardar, nuevoEstado, etapaDe } from './state.js';
import { tick, colocarEdificio, revisarHitos } from './engine.js';
import { crearEscena } from './scene.js';
import { crearUI } from './ui.js';

import { EDIFICIOS } from './data.js';

let state = cargar();
let colocando = null; // id del edificio que se está ubicando

const canvas = document.getElementById("juego");
const escena = crearEscena(canvas);

const ui = crearUI({
  estado: () => state,
  guardar: () => guardar(state),
  reemplazar(nuevo) {
    state = nuevo;
    guardar(state);
    ui.actualizar(true);
  },
  colocar(id) {
    colocando = id;
    escena.iniciarColocacion(id);
    ui.mostrarColocar(`Tocá el piso para ubicar el ${EDIFICIOS[id].nombre}`);
  },
  reiniciar() {
    state = nuevoEstado();
    ui.actualizar(true);
  },
});

function ajustarTamano() {
  escena.resize();
}
window.addEventListener("resize", ajustarTamano);
ajustarTamano();

function terminarColocacion() {
  colocando = null;
  escena.cancelarColocacion();
  ui.mostrarColocar(null);
}
document.getElementById("colocar-cancelar").addEventListener("click", terminarColocacion);
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && colocando) terminarColocacion(); });
canvas.addEventListener("pointermove", (e) => {
  if (colocando) escena.moverColocacion(e.clientX - canvas.getBoundingClientRect().left);
});

canvas.addEventListener("click", (e) => {
  const r = canvas.getBoundingClientRect();
  if (colocando) {
    const x = escena.confirmarColocacion(e.clientX - r.left);
    if (x !== null && colocarEdificio(state, colocando, x)) guardar(state);
    terminarColocacion();
    return;
  }
  if (ui.hojaAbierta()) return;
  const hit = escena.toque(e.clientX - r.left, e.clientY - r.top);
  if (hit && hit.quien === "madre") {
    escena.pulsoMadre();
    ui.abrirMadre(escena.rectMadre);
  } else if (hit && EDIFICIOS[hit.quien]) {
    ui.abrirCasa(hit.quien, () => escena.rectEdificio(hit.quien));
  }
});

// Sin progreso offline: el delta se topea a 1 s, así que una pestaña en segundo
// plano o un lag no producen saltos de producción.
let ultimo = performance.now();
let proximoHud = 0;
function frame(ahora) {
  const dt = Math.min((ahora - ultimo) / 1000, 1);
  ultimo = ahora;
  tick(state, dt);
  escena.update(dt, state, etapaDe(state));
  escena.draw();
  if (ahora >= proximoHud) {
    revisarHitos(state);
    ui.actualizar(false);
    proximoHud = ahora + 250;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Guardado: cada 5 s y al ocultar/cerrar la app.
setInterval(() => guardar(state), 5000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) guardar(state);
  else ultimo = performance.now();
});
window.addEventListener("pagehide", () => guardar(state));

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
