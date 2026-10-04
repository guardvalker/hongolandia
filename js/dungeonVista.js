// Ventana de la exploración de la dungeon: vista lateral lineal, el party avanza de izquierda a derecha y
// pelea con lo que aparece. También exporta el dibujo de los mercenarios (lo usa la taberna en la escena).

import { getRun, CLASE, ETAPAS_DUNGEON, NOMBRE_ETAPA } from './dungeon.js';

const BLANCO = "#fff";
const HONGO = ["..ccccc..", ".ccccccc.", "ccccccccc", "ccccccccc", ".wwwwwww.", ".wewwwew.", ".wwwwwww.", ".wwwwwww."];
const PATAS = [".ww...ww.", "..ww.ww.."];
const BG_ETAPA = ["#1a2a1c", "#1c1c34", "#2a2a2c", "#2c1c1e", "#2a1235"];

// Dibuja un mercenario de 9x9 con su clase. (x, y) = centro de los pies. opt: dir (1/-1), pose (0/1), t (reloj),
// golpe (destello blanco), ko, sentado, vendado.
export function dibujarMerc(g, id, x, y, opt = {}) {
  const c = CLASE[id], dir = opt.dir || 1, t = opt.t || 0;
  const X0 = x - 4, Y0 = y - 9;
  const px = (dx, dy, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(dir > 0 ? X0 + dx : X0 + 8 - dx - (w - 1), Y0 + dy, w, h); };
  const col = opt.color || (c ? c.color : "#e8362f");
  const filas = [...HONGO, PATAS[opt.pose || 0]];
  if (opt.ko) g.globalAlpha = 0.45;
  filas.forEach((fila, yy) => {
    for (let i = 0; i < 9; i++) {
      const ch = fila[i];
      if (ch === ".") continue;
      px(i, yy, ch === "c" ? col : ch === "e" ? "#1d1d2a" : BLANCO);
    }
  });
  // accesorios de cada clase
  switch (id) {
    case "caballero":
      px(1, 3, "#3a3a4e", 7, 1); px(4, -1, "#e23b3b", 1, 2); px(3, -2, "#e23b3b", 3, 1);
      px(10, 0, "#d8d8ec", 1, 6); px(9, 6, "#c28a4f", 3, 1); px(10, 7, "#8a5a2a", 1, 2);
      break;
    case "arquero":
      px(0, 1, "#2a8a4f", 2, 3); px(7, 1, "#2a8a4f", 2, 3); px(4, -1, "#fff6a8", 1, 1);
      px(10, 2, "#8a5a2a"); px(11, 3, "#8a5a2a", 1, 3); px(10, 6, "#8a5a2a"); px(10, 3, "#fff", 1, 3);
      break;
    case "mago":
      px(3, -1, "#5a1f8f", 3, 1); px(4, -2, "#5a1f8f", 1, 1); px(4, -3, "#ffe14d");
      px(10, 0, "#8a5a2a", 1, 9); px(9, -2, "#7fe9ff", 3, 2); px(10, -3, "#fff");
      break;
    case "curandero":
      px(4, 1, "#e23b3b", 1, 3); px(3, 2, "#e23b3b", 3, 1);
      px(10, 0, "#8a5a2a", 1, 9); px(9, -1, "#3fe08a", 3, 2);
      break;
    case "invocador": {
      const b = Math.round(Math.sin(t * 3) * 1.2);
      px(0, 1, "#2a6aa8", 2, 3); px(7, 1, "#2a6aa8", 2, 3);
      px(10, 1 + b, "#9fd8ff", 3, 3); px(11, 2 + b, "#fff");
      break;
    }
    case "picaro":
      px(0, 5, "#14141d", 9, 1); px(1, 4, "#14141d", 7, 1);
      px(10, 4, "#d8d8ec", 1, 4); px(9, 7, "#8a5a2a", 3, 1);
      break;
    case "barbaro":
      px(0, 0, "#f5f5f5"); px(0, -1, "#f5f5f5"); px(-1, -2, "#f5f5f5"); px(8, 0, "#f5f5f5"); px(8, -1, "#f5f5f5"); px(9, -2, "#f5f5f5");
      px(10, 1, "#8a5a2a", 1, 8); px(10, 0, "#9db4c8", 3, 3);
      break;
    case "bardo":
      px(6, -1, "#ff9ad0", 1, 1); px(7, -2, "#ff9ad0", 1, 1); px(7, -3, "#ffe14d", 1, 1);
      px(9, 6, "#8a5a2a", 3, 3); px(10, 4, "#8a5a2a", 1, 3); px(10, 7, "#2a1a0a");
      break;
    case "alquimista":
      px(1, 5, "#4fb4ff", 3, 1); px(5, 5, "#4fb4ff", 3, 1);
      px(10, 5, "#d8f0ff", 1, 3); px(9, 4, "#d8f0ff", 3, 1); px(10, 6, "#7fff3a", 1, 2);
      break;
    case "paladin":
      px(2, -3, "#ffd23f", 5, 1); px(1, -2, "#ffd23f", 1, 1); px(7, -2, "#ffd23f", 1, 1);
      px(-4, 3, "#ffd23f", 4, 5); px(-3, 4, "#fff", 2, 1); px(-3, 6, "#fff", 2, 1);
      break;
    case "espiritu":
      px(4, -1, "#fff", 1, 1);
      break;
  }
  if (opt.vendado) { px(0, 1, "#fff", 9, 1); px(2, 0, "#e23b3b", 1, 3); }
  if (opt.golpe > 0) { g.globalAlpha = 0.6; px(0, 0, "#fff", 9, 9); }
  g.globalAlpha = 1;
}

// ---- Íconos de los objetos de la dungeon (9x9) ----
const ICONOS = {
  espada: { p: { b: "#d8d8ec", w: "#9db4c8", g: "#c28a4f", h: "#8a5a2a" }, f: [".......bb", "......bbw", ".....bbw.", "....bbw..", "...bbw...", "g.bbw....", ".ggw.....", ".hg......", "h........"] },
  escudo: { p: { s: "#6a4a2a", b: "#a8793a", w: "#e8d8a8" }, f: [".sssssss.", "ssbbbbbss", "sbbwbwbbs", "sbbbwbbbs", "sbbwbwbbs", "sbbbbbbbs", ".sbbbbbs.", "..sbbbs..", "...sss..."] },
  botas: { p: { b: "#c28a4f", h: "#6a4a2a", d: "#3a2410", w: "#e8c08a" }, f: ["..hhh....", "..bbb....", "..bwb....", "..bbb....", "..bbbb...", "..bbbbbb.", ".bbbbbbbb", ".dddddddd", "........."] },
  pocion: { p: { c: "#8a5a2a", w: "#d8f0ff", p: "#ff5a8a", l: "#ffb0c8" }, f: ["...ccc...", "...www...", "...www...", "..wwwww..", ".wpppppw.", ".wplpppw.", ".wpppppw.", "..wpppw..", "...www..."] },
  amuleto: { p: { y: "#ffd23f", g: "#3fe08a", w: "#fff" }, f: ["..y...y..", "...y.y...", "....y....", "...yyy...", "..ygggy..", "..ygwgy..", "..ygggy..", "...yyy...", "........."] },
  casco: { p: { s: "#9db4c8", w: "#e8f0f8", d: "#5a6a7a", e: "#1d1d2a" }, f: ["..sssss..", ".sswssss.", "sssssssss", "sssssssss", "sddddddds", "s.eeeee.s", "s.e...e.s", "..........", "........."] },
  runa: { p: { d: "#4a4a66", r: "#ff7a3d", l: "#5a5a78" }, f: [".ddddddd.", "dllddddld", "dddrdrddd", "ddrrdrrdd", "dddrrrddd", "ddrrdrrdd", "dddrdrddd", "dlddrdlld", ".ddddddd."] },
  capa: { p: { y: "#ffd23f", g: "#3fe08a", d: "#2a8a4f" }, f: ["..yyyyy..", ".ggggggg.", ".ggggggg.", "gggggggdg", "gggggggdg", "ggggggddg", "ggg...ggg", "gg.....gg", "g.......g"] },
};
const cacheIco = {};
// URL (data:) del ícono de un objeto, escalado `k` veces
export function iconoObjeto(id, k = 3) {
  const clave = id + k;
  if (cacheIco[clave]) return cacheIco[clave];
  const d = ICONOS[id];
  const c = document.createElement("canvas");
  c.width = c.height = 9 * k;
  if (d) {
    const x = c.getContext("2d");
    d.f.forEach((fila, yy) => { for (let i = 0; i < 9; i++) { const ch = fila[i]; if (ch === ".") continue; x.fillStyle = d.p[ch]; x.fillRect(i * k, yy * k, k, k); } });
  }
  return (cacheIco[clave] = c.toDataURL());
}

// ---- Enemigos ----
// números chiquitos de 3x5 para los golpes (nítidos a cualquier escala)
const DIG = { 0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001", 5: "111100111001111", 6: "111100111101111", 7: "111001001010010", 8: "111101111101111", 9: "111101111001111", "+": "000010111010000" };
function numero(g, str, x, y, col, grande) {
  const k = grande ? 2 : 1;
  let cx = x;
  for (const ch of String(str)) {
    const gl = DIG[ch];
    if (!gl) { cx += 4 * k; continue; }
    for (const [dx, dy, c] of [[-1, 0, "#14141d"], [1, 0, "#14141d"], [0, -1, "#14141d"], [0, 1, "#14141d"], [0, 0, col]]) {
      g.fillStyle = c;
      for (let i = 0; i < 15; i++) if (gl[i] === "1") g.fillRect(cx + (i % 3) * k + dx, y + Math.floor(i / 3) * k + dy, k, k);
    }
    cx += 4 * k;
  }
}

function dibujarEnemigo(g, e, x, y, t) {
  const col = e.color, w = (Math.sin(t * 8 + x) > 0) ? 1 : 0;
  g.fillStyle = col;
  switch (e.forma) {
    case "slime": {
      const r = 1 + Math.round(Math.sin(t * 5 + x) * 0.8);
      g.fillRect(x - 6, y - 5 + r, 13, 5 - r); g.fillRect(x - 5, y - 7 + r, 11, 2); g.fillRect(x - 3, y - 9 + r, 7, 2);
      g.fillStyle = "#fff"; g.fillRect(x - 3, y - 6 + r, 2, 2); g.fillRect(x + 1, y - 6 + r, 2, 2);
      g.fillStyle = "#14141d"; g.fillRect(x - 2, y - 5 + r, 1, 1); g.fillRect(x + 2, y - 5 + r, 1, 1);
      break;
    }
    case "bat": {
      const a = w ? -2 : 1, yy = y - 13 + Math.round(Math.sin(t * 4 + x) * 2);
      g.fillRect(x - 2, yy, 5, 4);
      g.fillRect(x - 8, yy + a, 6, 2); g.fillRect(x + 3, yy + a, 6, 2); g.fillRect(x - 6, yy + a + 2, 3, 1); g.fillRect(x + 4, yy + a + 2, 3, 1);
      g.fillStyle = "#ff5a5a"; g.fillRect(x - 1, yy + 1, 1, 1); g.fillRect(x + 1, yy + 1, 1, 1);
      break;
    }
    case "esqueleto":
      g.fillRect(x - 3, y - 17, 7, 6); g.fillRect(x - 2, y - 11, 5, 1);
      g.fillStyle = "#14141d"; g.fillRect(x - 2, y - 15, 2, 2); g.fillRect(x + 1, y - 15, 2, 2); g.fillRect(x - 1, y - 12, 3, 1);
      g.fillStyle = col; g.fillRect(x - 1, y - 10, 3, 7); g.fillRect(x - 3, y - 9, 7, 1); g.fillRect(x - 3, y - 7, 7, 1);
      g.fillRect(x - 3, y - 3 + w, 2, 3); g.fillRect(x + 2, y - 3 + (1 - w), 2, 3);
      break;
    case "arana":
      g.fillRect(x - 4, y - 8, 9, 5); g.fillRect(x - 2, y - 11, 5, 3);
      for (let k = 0; k < 4; k++) { const o = (w + k) % 2; g.fillRect(x - 8 + k * 2, y - 4 + o, 1, 4 - o); g.fillRect(x + 8 - k * 2, y - 4 + o, 1, 4 - o); }
      g.fillStyle = "#ffe14d"; g.fillRect(x - 1, y - 10, 1, 1); g.fillRect(x + 1, y - 10, 1, 1);
      break;
    case "esporita":
      g.fillRect(x - 3, y - 9, 7, 3); g.fillRect(x - 2, y - 10, 5, 1); g.fillStyle = "#fff"; g.fillRect(x - 2, y - 6, 5, 4); g.fillStyle = "#14141d"; g.fillRect(x - 1, y - 5, 1, 1); g.fillRect(x + 1, y - 5, 1, 1);
      g.fillStyle = col; g.fillRect(x - 2, y - 2 + w, 2, 2); g.fillRect(x + 1, y - 2 + (1 - w), 2, 2);
      break;
    case "jefe": {
      // Rey Moho: un hongo enorme con corona y cara enojada
      const b = Math.round(Math.sin(t * 3) * 1.2);
      for (let dy = 0; dy < 16; dy++) { const hw = Math.round(14 * Math.sqrt(1 - (dy / 16) ** 2)); g.fillRect(x - hw, y - 34 + b + (16 - dy), hw * 2 + 1, 1); }
      g.fillStyle = "#7a3cc0"; for (const [dx, dy] of [[-8, -26], [4, -30], [9, -24], [-2, -22]]) g.fillRect(x + dx, y + dy + b, 4, 3);
      g.fillStyle = "#e8e8f4"; g.fillRect(x - 8, y - 18 + b, 17, 18);
      g.fillStyle = "#ff5a5a"; g.fillRect(x - 6, y - 14 + b, 4, 3); g.fillRect(x + 3, y - 14 + b, 4, 3);
      g.fillStyle = "#14141d"; g.fillRect(x - 5, y - 13 + b, 2, 2); g.fillRect(x + 4, y - 13 + b, 2, 2); g.fillRect(x - 5, y - 9 + b, 11, 2);
      g.fillStyle = "#ffd23f"; g.fillRect(x - 7, y - 38 + b, 15, 3); for (const dx of [-7, -1, 5]) g.fillRect(x + dx, y - 41 + b, 3, 3);
      g.fillStyle = col; g.fillRect(x - 8, y - 2 + w, 5, 2); g.fillRect(x + 4, y - 2 + (1 - w), 5, 2);
      break;
    }
  }
}

// ---- La ventana ----
export function crearVistaDungeon({ rectMina, onCerrarAviso }) {
  const W = 150, H = 78, SUELO = 64, LIDER = 62;
  const caja = document.createElement("div");
  caja.id = "dungeon-vista";
  caja.hidden = true;
  caja.innerHTML = '<div class="dv-cab"><b class="dv-titulo"></b><span class="dv-estado"></span></div><div class="dv-barra"></div><div class="dv-lienzo"><canvas width="' + W + '" height="' + H + '"></canvas><div class="dv-aviso" hidden></div><div class="dv-fin" hidden></div></div><div class="dv-pie"></div>';
  document.body.append(caja);
  const titulo = caja.querySelector(".dv-titulo"), estado = caja.querySelector(".dv-estado"), barra = caja.querySelector(".dv-barra"), pie = caja.querySelector(".dv-pie");
  const cv = caja.querySelector("canvas"), g = cv.getContext("2d"), elAviso = caja.querySelector(".dv-aviso"), elFin = caja.querySelector(".dv-fin");
  g.imageSmoothingEnabled = false;
  const segs = [];
  for (let i = 0; i < ETAPAS_DUNGEON; i++) { const s = document.createElement("i"); s.innerHTML = "<u></u>"; barra.append(s); segs.push(s.firstChild); }
  let t = 0, runViejo = null, sacudida = 0, avisoT = 0, finMostrado = false;
  const proy = [], textos = [], efectos = [];

  const posU = (r, u) => (u.lado === "p" ? { x: LIDER + u.x * 1, y: SUELO } : { x: LIDER + (u.x - r.x) * 1.15, y: SUELO });

  function consumir(r) {
    for (const e of r.eventos.splice(0)) {
      if (e.tipo === "dmg") textos.push({ u: e.a, txt: String(e.v), col: e.color, t: 0, big: e.crit, dx: (Math.random() - 0.5) * 10 });
      else if (e.tipo === "cura") textos.push({ u: e.a, txt: "+" + e.v, col: e.color, t: 0, dx: (Math.random() - 0.5) * 10 });
      else if (e.tipo === "texto") textos.push({ u: e.a, txt: e.txt, col: e.color, t: 0 });
      else if (e.tipo === "proy") proy.push({ forma: e.forma, de: e.de, a: e.a, t: 0, dur: e.forma === "flecha" ? 0.22 : 0.3 });
      else if (e.tipo === "tajo") efectos.push({ tipo: "tajo", u: e.a, t: 0, dur: 0.18 });
      else if (e.tipo === "ko") efectos.push({ tipo: "humo", u: e.a, t: 0, dur: 0.6 });
      else if (e.tipo === "invoca") efectos.push({ tipo: "humo", u: e.a, t: 0, dur: 0.5 });
      else if (e.tipo === "escudo") efectos.push({ tipo: "escudo", u: e.a, t: 0, dur: 1.2 });
      else if (e.tipo === "temblor") sacudida = 0.45;
      else if (e.tipo === "objeto") { avisoT = 2.8; elAviso.innerHTML = '<img class="ico" src="' + iconoObjeto(e.o.id, 3) + '" alt=""><span><b>' + (e.o.raro ? '★ ' : '') + e.o.nombre + '</b> ' + e.o.desc + '</span>'; elAviso.classList.toggle('raro', !!e.o.raro); elAviso.hidden = false; }
    }
  }
  function fondo(r) {
    const e = Math.min(r.etapa, ETAPAS_DUNGEON - 1), sc = r.x;
    g.fillStyle = BG_ETAPA[e]; g.fillRect(0, 0, W, H);
    // ladrillos con parallax
    g.fillStyle = "rgba(255,255,255,0.05)";
    const off = Math.floor(sc * 0.5) % 24;
    for (let fila = 0; fila < 4; fila++) for (let k = -1; k < 8; k++) g.fillRect(k * 24 - off + (fila % 2) * 12, 4 + fila * 14, 22, 12);
    // arcos y antorchas
    const o2 = Math.floor(sc * 0.8) % 70;
    for (let k = -1; k < 4; k++) {
      const x = k * 70 - o2 + 20;
      g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x - 4, 10, 8, SUELO - 10);
      g.fillStyle = "#6a4a2a"; g.fillRect(x + 12, 30, 1, 6);
      g.fillStyle = Math.floor(t * 9 + k) % 2 ? "#ffd23f" : "#ff8a1f"; g.fillRect(x + 11, 27, 3, 3);
      g.globalAlpha = 0.1; g.fillStyle = "#ffd23f"; g.fillRect(x + 4, 20, 17, 20); g.globalAlpha = 1;
    }
    g.fillStyle = "#14141d"; g.fillRect(0, SUELO, W, H - SUELO);
    g.fillStyle = "#3a3a52"; g.fillRect(0, SUELO, W, 1);
    g.fillStyle = "rgba(255,255,255,0.08)";
    const o3 = Math.floor(sc * 1.4) % 20;
    for (let k = -1; k < 12; k++) g.fillRect(k * 20 - o3, SUELO + 5, 12, 1);
  }
  function barraVida(x, y, u) {
    const f = Math.max(0, u.hp / u.hpMax), w = u.jefe ? 26 : 12;
    g.fillStyle = "#14141d"; g.fillRect(x - (w >> 1) - 1, y - 1, w + 2, 4);
    g.fillStyle = u.lado === "p" ? "#3fe08a" : "#ff5a5a"; g.fillRect(x - (w >> 1), y, Math.max(0, Math.round(w * f)), 2);
    if (u.escudo > 0) { g.fillStyle = "#7fe9ff"; g.fillRect(x - (w >> 1), y - 1, Math.min(w, Math.round(u.escudo / 6)), 1); }
  }
  function dibujar(r, dt) {
    t += dt;
    sacudida = Math.max(0, sacudida - dt);
    g.setTransform(1, 0, 0, 1, sacudida > 0 ? Math.round(Math.sin(t * 90) * 2) : 0, 0);
    fondo(r);
    // aliados invocados y party
    const todos = [...r.enemigos, ...r.aliados, ...r.party];
    for (const u of todos) {
      const p = posU(r, u);
      let x = Math.round(p.x), y = p.y;
      if (u.lado === "e") {
        if (!u.vivo) { g.globalAlpha = Math.max(0, 1 - (u.muerteT || 0) / 0.6); }
        if (u.golpe2 > 0) x -= 3;
        dibujarEnemigo(g, u, x, y, t);
        if (u.golpe > 0) { g.globalAlpha = 0.5; g.fillStyle = "#fff"; g.fillRect(x - 6, y - (u.jefe ? 38 : 14), 13, u.jefe ? 38 : 14); }
        g.globalAlpha = 1;
        if (u.vivo) barraVida(x, y - (u.jefe ? 46 : u.forma === "bat" ? 18 : 22), u);
      } else {
        const camina = !!u.camina && u.vivo;
        const bob = camina ? Math.round(Math.abs(Math.sin(t * 11 + u.slot)) * 1.5) : 0;
        if (u.aliado) { g.globalAlpha = Math.min(1, u.vida / 2) * 0.8; }
        const lunge = u.golpe2 > 0 && u.rango < 20 ? 4 : 0;
        dibujarMerc(g, u.clase, x + lunge, y - bob, { dir: 1, pose: camina && Math.floor(t * 9) % 2 ? 1 : 0, t, golpe: u.golpe, ko: !u.vivo && !u.aliado, color: u.color });
        g.globalAlpha = 1;
        if (u.vivo) barraVida(x, y - 17, u);
        if (u.id === "bardo" && u.vivo && Math.floor(t * 2) % 2 === 0) { g.fillStyle = "#ff9ad0"; g.fillRect(x + 5, y - 22 - Math.floor((t * 6) % 4), 1, 3); g.fillRect(x + 6, y - 22 - Math.floor((t * 6) % 4), 2, 1); }
      }
    }
    // proyectiles y efectos
    for (let i = proy.length - 1; i >= 0; i--) {
      const q = proy[i];
      q.t += dt;
      if (q.t >= q.dur) { proy.splice(i, 1); continue; }
      const a = posU(r, q.de), b = posU(r, q.a), f = q.t / q.dur;
      const x0 = a.x + 6, y0 = a.y - 7, x1 = b.x, y1 = b.y - 7 - (q.a.forma === "bat" ? 6 : 0);
      const x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f - (q.forma === "pocion" ? Math.sin(f * Math.PI) * 14 : 0);
      switch (q.forma) {
        case "flecha": g.fillStyle = "#d8d8ec"; g.fillRect(Math.round(x) - 3, Math.round(y), 6, 1); g.fillStyle = "#8a5a2a"; g.fillRect(Math.round(x) - 4, Math.round(y), 2, 1); break;
        case "bola": g.fillStyle = "#ff8a1f"; g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5); g.fillStyle = "#ffe14d"; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); break;
        case "nota": g.fillStyle = "#ff9ad0"; g.fillRect(Math.round(x), Math.round(y) - 3, 1, 4); g.fillRect(Math.round(x) - 1, Math.round(y), 2, 2); break;
        case "pocion": g.fillStyle = "#7fff3a"; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); g.fillStyle = "#d8f0ff"; g.fillRect(Math.round(x), Math.round(y) - 2, 1, 1); break;
        case "cura": g.fillStyle = "#3fe08a"; g.fillRect(Math.round(x) - 1, Math.round(y) - 3, 3, 7); g.fillRect(Math.round(x) - 3, Math.round(y) - 1, 7, 3); break;
        default: g.fillStyle = "#9fd8ff"; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      }
    }
    for (let i = efectos.length - 1; i >= 0; i--) {
      const f = efectos[i];
      f.t += dt;
      if (f.t >= f.dur) { efectos.splice(i, 1); continue; }
      const p = posU(r, f.u), k = f.t / f.dur;
      if (f.tipo === "tajo") { g.fillStyle = "#fff"; for (let j = 0; j < 7; j++) g.fillRect(Math.round(p.x - 6 + j * 2 * k + j), Math.round(p.y - 16 + j * 2), 1, 2); }
      else if (f.tipo === "humo") { g.globalAlpha = 1 - k; g.fillStyle = "#c8c8dc"; for (let j = 0; j < 5; j++) g.fillRect(Math.round(p.x - 5 + j * 3), Math.round(p.y - 8 - k * 12 - (j % 2) * 3), 3, 3); g.globalAlpha = 1; }
      else if (f.tipo === "escudo") { g.globalAlpha = 0.5 * (1 - k * 0.6); g.fillStyle = "#7fe9ff"; for (let dy = -9; dy <= 9; dy++) { const w = Math.floor(Math.sqrt(100 - dy * dy)); g.fillRect(Math.round(p.x) - w + 0, Math.round(p.y - 9 + dy), 2, 1); g.fillRect(Math.round(p.x) + w - 2, Math.round(p.y - 9 + dy), 2, 1); } g.globalAlpha = 1; }
    }
    for (let i = textos.length - 1; i >= 0; i--) {
      const q = textos[i];
      q.t += dt;
      if (q.t > 0.9) { textos.splice(i, 1); continue; }
      const p = posU(r, q.u);
      g.globalAlpha = Math.min(1, (0.9 - q.t) * 3);
      numero(g, q.txt.replace(/[^0-9+]/g, '') || '0', Math.round(p.x - 5 + (q.dx || 0)), Math.round(p.y - (q.u.jefe ? 54 : 26) - q.t * 12), q.col, q.big);
      g.globalAlpha = 1;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  function actualizar(dt) {
    const r = getRun();
    if (!r) { if (!caja.hidden) { caja.hidden = true; proy.length = textos.length = efectos.length = 0; avisoT = 0; elFin.hidden = true; elAviso.hidden = true; } runViejo = null; return; }
    if (caja.hidden) { caja.hidden = false; }
    if (r !== runViejo) { runViejo = r; proy.length = textos.length = efectos.length = 0; finMostrado = false; elFin.hidden = true; elAviso.hidden = true; avisoT = 0; }
    consumir(r);
    // encabezado y barra de 5 etapas
    const e = Math.min(r.etapa, ETAPAS_DUNGEON - 1);
    titulo.textContent = "Dungeon · " + NOMBRE_ETAPA[e];
    estado.textContent = r.fase === "fin" ? "Fin" : "Etapa " + (e + 1) + "/" + ETAPAS_DUNGEON;
    const ondas = e === ETAPAS_DUNGEON - 1 ? 1 : 2;
    const muertos = r.enemigos.filter((u) => !u.vivo).length, tot = Math.max(1, r.enemigos.length);
    segs.forEach((s, i) => {
      let f = i < r.etapasHechas ? 1 : i === e && r.fase !== "fin" ? Math.min(1, (r.onda + (r.fase === "combate" ? muertos / tot : 0)) / ondas) : 0;
      s.style.width = Math.round(f * 100) + "%";
      s.parentElement.classList.toggle("jefe", i === ETAPAS_DUNGEON - 1);
    });
    pie.textContent = r.items.length ? "Objetos: " + r.items.length + " · Party " + r.party.filter((u) => u.vivo).length + "/" + r.n : "Party " + r.party.filter((u) => u.vivo).length + "/" + r.n;
    // aviso del objeto y resultado final (texto del navegador: nítido)
    if (avisoT > 0) { avisoT -= dt; if (avisoT <= 0) elAviso.hidden = true; }
    if (r.fin && !finMostrado) {
      finMostrado = true;
      const f = r.fin;
      elFin.innerHTML = '<b class="' + (f.victoria ? 'ok' : 'no') + '">' + (f.victoria ? '¡Victoria!' : 'Retirada del party') + '</b>'
        + '<span>' + (f.cristal ? '¡Cristal radiante para el hongo madre!' : f.victoria ? 'Rey Moho derrotado' : f.etapas + (f.etapas === 1 ? ' etapa superada' : ' etapas superadas')) + '</span>'
        + (f.caidos.length ? '<em>' + f.caidos.length + (f.caidos.length === 1 ? ' herido' : ' heridos') + ' (descansan en la taberna)</em>' : '');
      elFin.hidden = false;
    }
    dibujar(r, Math.min(dt, 0.1));
  }
  return { actualizar };
}
