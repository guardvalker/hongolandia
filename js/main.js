import { cargar, guardar, nuevoEstado, etapaDe } from './state.js';
import { tick, colocarEdificio, revisarHitos, cobrarEvento, maxAusencia } from './engine.js';
import { fmt } from './format.js';
import { crearEscena } from './scene.js';
import { crearUI, ajustes } from './ui.js';
import { tick as tickDungeon, consumirResultado } from './dungeon.js';
import { tick as tickEventos, consumirResultadoEvento, golpearCriatura, forzarEvento } from './eventos.js';
import { crearVistaDungeon } from './dungeonVista.js';

import { EDIFICIOS } from './data.js';
import { construirTorre } from './invasion.js';

let state = cargar();
let colocando = null; // id del edificio que se está ubicando (comprado)
let moviendo = null; // id del edificio que se está moviendo (ya construido)

const canvas = document.getElementById("juego");
// Un evento del cielo (tocado o recogido solo): se aplica y se avisa con un cartelito.
function aplicarEvento(tipo) {
  const r = cobrarEvento(state, tipo);
  ui.toast(r.texto + (r.ganancia ? " +" + fmt(r.ganancia) + " esporas" : ""));
  guardar(state);
}
const vista = crearVistaDungeon({ rectMina: () => { try { return state.edificios.mina ? escena.rectEdificio("mina") : null; } catch (_) { return null; } } });
const escena = crearEscena(canvas, {
  onEvento: aplicarEvento,
  // los mineros terminaron de cavar toda la mina: aparece la puerta de la dungeon (una sola vez por partida)
  onDungeon() {
    if (state.flags.dungeon) return;
    state.flags.dungeon = true;
    guardar(state);
    escena.mostrarPuerta();
    setTimeout(() => ui.mostrarDungeon(true), 2600);
  },
});

escena.setLimite(ajustes.visibles);

const ui = crearUI({
  limiteVisibles: (n) => escena.setLimite(n),
  estado: () => state,
  dispararCielo: (tipo) => escena.spawnEvento(tipo),
  dispararArcano: (tipo) => forzarEvento(state, tipo),
  guardar: () => guardar(state),
  reemplazar(nuevo) {
    state = nuevo;
    guardar(state);
    ui.actualizar(true);
  },
  colocar(id) {
    colocando = id;
    escena.iniciarColocacion(id);
    ui.mostrarColocar(`Tocá el piso para ubicar ${id === "torre_def" ? "la torre de defensa" : "el " + EDIFICIOS[id].nombre}`);
  },
  mover(id) {
    moviendo = id;
    escena.iniciarColocacion(id, true);
    ui.mostrarColocar(`Tocá el piso para mover el ${EDIFICIOS[id].nombre}, o tocá otro edificio para intercambiarlos`);
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
  moviendo = null;
  escena.cancelarColocacion();
  ui.mostrarColocar(null);
}
document.getElementById("colocar-cancelar").addEventListener("click", terminarColocacion);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && (colocando || moviendo)) terminarColocacion();
  else if (e.key === "+" || e.key === "=") escena.zoom(1);
  else if (e.key === "-") escena.zoom(-1);
});

// ---- cámara: arrastrar para desplazar, pellizcar o rueda para zoom ----
const punteros = new Map();
let arrastro = false, inicioX = 0, inicioY = 0, distPinch = 0;
const distancia = () => { const [a, b] = [...punteros.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
canvas.addEventListener("pointerdown", (e) => {
  punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (punteros.size === 1) { arrastro = false; inicioX = e.clientX; inicioY = e.clientY; }
  if (punteros.size === 2) { distPinch = distancia(); arrastro = true; }
});
canvas.addEventListener("pointermove", (e) => {
  if (colocando || moviendo) escena.moverColocacion(e.clientX - canvas.getBoundingClientRect().left);
  const p = punteros.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (punteros.size === 2) {
    const d = distancia();
    if (d / distPinch > 1.35) { escena.zoom(1); distPinch = d; }
    else if (d / distPinch < 0.74) { escena.zoom(-1); distPinch = d; }
  } else if (punteros.size === 1 && !colocando && !moviendo) {
    if (Math.abs(e.clientX - inicioX) > 8 || Math.abs(e.clientY - inicioY) > 8) arrastro = true;
    if (arrastro) escena.pan(dx, dy);
  }
});
const soltar = (e) => { punteros.delete(e.pointerId); };
canvas.addEventListener("pointerup", soltar);
canvas.addEventListener("pointercancel", soltar);
let ultimaRueda = 0;
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const ahora = performance.now();
  if (ahora - ultimaRueda < 140) return;
  ultimaRueda = ahora;
  escena.zoom(e.deltaY < 0 ? 1 : -1);
}, { passive: false });
document.getElementById("zoom-mas").addEventListener("click", () => escena.zoom(1));
document.getElementById("zoom-menos").addEventListener("click", () => escena.zoom(-1));
document.getElementById("zoom-centro").addEventListener("click", () => escena.recentrar());

canvas.addEventListener("click", (e) => {
  if (arrastro) { arrastro = false; return; } // fue un arrastre, no un toque
  const r = canvas.getBoundingClientRect();
  if (colocando) {
    const dx = escena.confirmarColocacion(e.clientX - r.left);
    if (dx !== null && (colocando === "torre_def" ? construirTorre(state, dx) : colocarEdificio(state, colocando, dx))) guardar(state);
    terminarColocacion();
    return;
  }
  if (moviendo) {
    const hit = escena.toque(e.clientX - r.left, e.clientY - r.top);
    if (hit && hit.quien === "madre") return; // el hongo madre no se mueve ni se intercambia
    const a = state.edificios[moviendo];
    if (hit && EDIFICIOS[hit.quien] && hit.quien !== moviendo && state.edificios[hit.quien]) {
      const b = state.edificios[hit.quien]; // intercambio de lugar
      [a.dx, b.dx] = [b.dx, a.dx];
    } else {
      const dx = escena.confirmarColocacion(e.clientX - r.left);
      if (dx !== null) a.dx = dx;
    }
    guardar(state);
    terminarColocacion();
    return;
  }
  const hit = escena.toque(e.clientX - r.left, e.clientY - r.top);
  if (hit && hit.quien === "evento") { escena.tomarEvento(hit.ev); aplicarEvento(hit.ev.tipo); return; }
  if (ui.hojaAbierta()) return;
  if (hit && hit.quien === "criatura") { golpearCriatura(state, hit.c); return; }
  if (hit && hit.quien === "torre_def") { ui.abrirTorre(hit.i); return; }
  if (hit && hit.quien === "mercader") { ui.mostrarMercader(); return; }
  if (hit && hit.quien === "puerta") { ui.mostrarDungeon(false); return; }
  if (hit && hit.quien === "madre") {
    escena.pulsoMadre();
    ui.abrirMadre(escena.rectMadre);
  } else if (hit && EDIFICIOS[hit.quien]) {
    ui.abrirCasa(hit.quien, () => escena.rectEdificio(hit.quien));
  }
});

// La economía corre con el reloj real: sigue andando con la pestaña en segundo plano (el
// navegador frena los timers, pero cada tick usa el tiempo real transcurrido, hasta 1 h).
// La escena y los honguitos solo se animan mientras la pestaña se ve.
let ultimoEco = performance.now();
function economia(ahora) {
  const dt = Math.min((ahora - ultimoEco) / 1000, maxAusencia(state));
  ultimoEco = ahora;
  if (dt > 0) { tick(state, dt); tickDungeon(state, dt); tickEventos(state, dt); }
  return dt;
}
// la exploración de la dungeon terminó: aviso con lo que se ganó y los mercenarios vuelven festejando
function resultadoEvento() {
  const r = consumirResultadoEvento();
  if (!r) return;
  if (r.tipo === "invasion") ui.toast(r.robadas ? `Los invasores robaron ${r.perdidoPct}% de tu progreso de prestigio (${r.robadas} de ${r.total} llegaron a la base) · derribados ${r.derribadas} +${fmt(r.esporas)} esporas` : `¡Invasión repelida! ${r.derribadas} enemigos derribados +${fmt(r.esporas)} esporas`);
  else if (r.tipo === "meteoros") ui.toast(`Lluvia de meteoritos: ${r.interceptados} destruidos, ${r.impactos} impactos` + (r.dano.length ? ` · dañados: ${r.dano.map((id) => id === "basico" ? "los honguitos del hongo madre" : EDIFICIOS[id].nombre).join(", ")} (producción reducida un rato)` : ""));
  guardar(state);
}
function resultadoDungeon() {
  resultadoEvento();
  const r = consumirResultado();
  if (!r) return;
  ui.toast(r.victoria ? "¡Dungeon superada!" + (r.cristal ? " ¡Cristal radiante!" : "") + (r.esporas.gt(0) ? " +" + fmt(r.esporas) + " esporas" : "")
    : "El party se retiró tras " + r.etapas + (r.etapas === 1 ? " etapa" : " etapas") + (r.esporas.gt(0) ? " · +" + fmt(r.esporas) + " esporas" : ""));
  escena.festejarMercs(r);
  guardar(state);
}
setInterval(() => {
  if (!document.hidden) return;
  economia(performance.now());
  revisarHitos(state);
  resultadoDungeon();
}, 1000);

const forzado = new URLSearchParams(location.search).get("arcano");
if (forzado) setTimeout(() => forzarEvento(state, forzado), 2500);

let proximoHud = 0;
function frame(ahora) {
  const dt = Math.min(economia(ahora), 1);
  escena.update(dt, state, etapaDe(state));
  escena.draw();
  resultadoDungeon();
  vista.actualizar(dt);
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
});
window.addEventListener("pagehide", () => guardar(state));

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
