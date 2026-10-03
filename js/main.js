import { cargar, guardar, nuevoEstado, etapaDe } from './state.js';
import { tick } from './engine.js';
import { crearEscena } from './scene.js';
import { crearUI } from './ui.js';

let state = cargar();

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

canvas.addEventListener("click", (e) => {
  if (ui.hojaAbierta()) return;
  const r = canvas.getBoundingClientRect();
  const hit = escena.toque(e.clientX - r.left, e.clientY - r.top);
  if (hit && hit.quien === "madre") {
    escena.pulsoMadre();
    ui.abrirMadre();
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
