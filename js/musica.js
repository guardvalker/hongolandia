// Música ambiental procedural (WebAudio, sin archivos): un colchón suave que va sumando capas con el nivel de prestigio de la
// corrida (idea de la música por capas de las compresiones de Gnorp Apologue). Apagada por defecto; se prende en Ajustes.
const ACORDES = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [164.81, 207.65, 246.94]]; // Am F G E (arpegio menor)
const ESCALA = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];
let ctx = null, maestro = null, activo = false, vol = 0.35, nivel = 0, timer = 0, paso = 0, proxAcorde = 0;
const voces = new Set();

function nota(freq, t, dur, tipo, gain, destino = maestro) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.6, dur * 0.4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(destino);
  o.start(t); o.stop(t + dur + 0.05);
  voces.add(o); o.onended = () => voces.delete(o);
}
function programar() {
  if (!ctx || !activo) return;
  const ahora = ctx.currentTime;
  if (ahora + 1 >= proxAcorde) { // un acorde nuevo cada 8 s
    const ac = ACORDES[paso % ACORDES.length];
    const t = Math.max(ahora, proxAcorde);
    for (const f of ac) nota(f, t, 9, "triangle", 0.05);
    if (nivel >= 4) nota(ac[0] / 2, t, 8.5, "sine", 0.09); // capa 2: bajo
    if (nivel >= 12) for (const f of ac) nota(f * 2, t + 0.4, 8, "sine", 0.025); // capa 3: armonía aguda
    paso++; proxAcorde = t + 8;
  }
  if (nivel >= 8 && Math.random() < 0.55) { // capa 4: destellos (arpegio al azar)
    const f = ESCALA[Math.floor(Math.random() * ESCALA.length)];
    nota(f, ahora + 0.05 + Math.random() * 0.2, 1.4, "sine", 0.028 + Math.min(0.03, nivel * 0.0005));
  }
  if (nivel >= 25 && Math.random() < 0.3) nota(ESCALA[Math.floor(Math.random() * 4)] * 2, ahora + 0.1, 0.9, "triangle", 0.02); // capa 5: brillo
}
function iniciar() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const filtro = ctx.createBiquadFilter(); filtro.type = "lowpass"; filtro.frequency.value = 2200;
  maestro = ctx.createGain(); maestro.gain.value = vol;
  maestro.connect(filtro); filtro.connect(ctx.destination);
  proxAcorde = ctx.currentTime;
  timer = setInterval(programar, 350);
}
export const musica = {
  configurar(encendida, volumen) {
    vol = volumen; activo = !!encendida;
    if (maestro) maestro.gain.value = activo ? vol : 0;
    if (activo && ctx) { if (ctx.state === "suspended") ctx.resume(); }
    if (!activo && ctx) ctx.suspend();
  },
  // el navegador solo deja sonar tras un toque del usuario: se llama desde el primer pointerdown
  despertar() { if (activo) { iniciar(); if (maestro) maestro.gain.value = vol; } },
  nivel(n) { nivel = n; },
};
