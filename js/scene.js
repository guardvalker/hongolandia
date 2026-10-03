// Escena 2D vista lateral en pixel art, con ciclo día/noche y luces aditivas.
// Todo se dibuja en un buffer chico (1 celda = 1 píxel del arte) y se escala con
// un factor entero y sin suavizado, así los sprites nunca se ven borrosos.
import { ANIM } from './anims.js';

const MAX_VISUALES = 24; // honguitos dibujados (el número real puede ser enorme)
const MAX_PARTICULAS = 420;
const ANCHO_REF = 390; // celdas del lado corto de la pantalla
const GROSOR_PASTO = 46;
const CARRILES = [10, 22, 34]; // y de los pies bajo el borde del pasto (profundidad)
const CICLO = 300; // segundos que dura un día completo
const VEL = 26; // celdas/seg al caminar
const TAU = Math.PI * 2;

const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mezcla = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const suave = (k) => k * k * (3 - 2 * k);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CIELO_DIA = { top: [118, 150, 150], bot: [200, 216, 198] };
const CIELO_NOCHE = { top: [16, 20, 52], bot: [62, 54, 100] };
const TINTE_NOCHE = [18, 22, 72];

export function crearEscena(canvas, assets) {
  const ctx = canvas.getContext("2d");
  const lo = document.createElement("canvas");
  const g = lo.getContext("2d");
  let dpr = 1, S = 1, Wc = 0, Hc = 0, extra = 0, groundY = 0;
  let frente = null;
  let t = 0, cam = 0, etapaPrev = null, inicial = true;
  let luz = 0.5;
  let flash = 0;
  const luzForzada = new URLSearchParams(location.search).get("luz");

  const madre = { x: 0, pulso: 0, brillo: 0 };
  const visuales = [];
  const particulas = [];
  const nubes = [];
  const estrellas = [];
  const luciernagas = [];

  // ---------- versiones "de noche" de los sprites (tinte precalculado) ----------
  const tinte = (img) => {
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = "source-atop";
    x.fillStyle = rgb(TINTE_NOCHE, 0.5);
    x.fillRect(0, 0, c.width, c.height);
    return c;
  };
  const sheetNoche = tinte(assets.honguito);
  const madreNoche = assets.madre.map(tinte);

  // ---------- halos de luz (cacheados) ----------
  const halos = new Map();
  function haloImg(r, col) {
    const key = r + "|" + col.join();
    let c = halos.get(key);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = c.height = r * 2 + 1;
    const x = c.getContext("2d");
    const n = clamp(Math.round(r / 4), 6, 18); // más anillos = degradé más suave
    x.fillStyle = rgb(col, 1.6 / n);
    for (let i = 0; i < n; i++) {
      const rr = Math.round(r * (1 - i / n));
      for (let dy = -rr; dy <= rr; dy++) {
        const w = Math.floor(Math.sqrt(rr * rr - dy * dy));
        x.fillRect(r - w, r + dy, w * 2 + 1, 1);
      }
    }
    halos.set(key, c);
    return c;
  }
  function luzHalo(x, y, r, col, alfa, achatado = 1) {
    if (alfa <= 0.003) return;
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = Math.min(1, alfa);
    const im = haloImg(r, col);
    g.drawImage(im, Math.round(x - r), Math.round(y - r * achatado), r * 2 + 1, Math.round((r * 2 + 1) * achatado));
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }
  function aditivo(fn) {
    g.globalCompositeOperation = "lighter";
    fn();
    g.globalCompositeOperation = "source-over";
  }
  function disco(x, y, r, color) {
    g.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy));
      g.fillRect(Math.round(x) - w, Math.round(y) + dy, w * 2 + 1, 1);
    }
  }

  // ---------- fondo estático: colinas, pasto y tierra (simple, formas planas) ----------
  function colinas(c, r, base, amp, col) {
    const f1 = 0.006 + r() * 0.004, f2 = 0.017 + r() * 0.006, p1 = r() * 9, p2 = r() * 9;
    c.fillStyle = rgb(col);
    for (let x = 0; x < Wc; x += 2) {
      const hgt = amp * (0.6 + 0.3 * Math.sin(x * f1 + p1) + 0.12 * Math.sin(x * f2 + p2));
      const y = base - Math.round(hgt / 2) * 2;
      c.fillRect(x, y, 2, base - y + 2);
    }
  }

  function pintarFondo() {
    const r = rng(11);
    const H = Hc + extra;
    frente = document.createElement("canvas");
    frente.width = Wc; frente.height = H;
    const c = frente.getContext("2d");
    colinas(c, r, groundY - 2, Hc * 0.14, [142, 170, 168]);
    colinas(c, r, groundY + 2, Hc * 0.085, [108, 148, 128]);
    // pasto plano
    c.fillStyle = rgb([70, 146, 88]);
    c.fillRect(0, groundY, Wc, GROSOR_PASTO);
    c.fillStyle = rgb([98, 176, 100]);
    c.fillRect(0, groundY, Wc, 3);
    const rp = rng(5);
    for (let x = 2; x < Wc; x += 7) {
      const h = 2 + Math.floor(rp() * 3);
      c.fillStyle = rgb([84, 160, 94]);
      c.fillRect(x, groundY - h, 1, h);
    }
    const flores = [[255, 244, 190], [255, 196, 214], [255, 255, 255]];
    for (let i = 0; i < 7; i++) {
      const x = Math.floor(rp() * Wc), y = groundY + 10 + Math.floor(rp() * (GROSOR_PASTO - 14));
      c.fillStyle = rgb(flores[i % 3]);
      c.fillRect(x, y - 1, 1, 3); c.fillRect(x - 1, y, 3, 1);
    }
    // tierra plana con degradado por bandas
    const ys = groundY + GROSOR_PASTO;
    c.fillStyle = rgb([60, 48, 56]);
    c.fillRect(0, ys, Wc, H - ys);
    c.fillStyle = rgb([44, 35, 44]);
    c.fillRect(0, ys, Wc, 4);
    for (let y = ys + 8; y < H; y += 8) {
      c.fillStyle = `rgba(16,12,22,${Math.min(0.55, ((y - ys) / (H - ys)) * 0.55)})`;
      c.fillRect(0, y, Wc, 8);
    }

    nubes.length = 0;
    for (let i = 0; i < 3; i++) nubes.push({ x: (Wc / 3) * i + r() * 60, y: groundY * (0.16 + r() * 0.34), w: 56 + r() * 60, v: 1 + r() * 1.6 });
    estrellas.length = 0;
    for (let i = 0; i < 60; i++) estrellas.push({ x: Math.floor(r() * Wc), y: Math.floor(r() * groundY * 0.7), ph: r() * TAU, g: r() < 0.15 });
    luciernagas.length = 0;
    for (let i = 0; i < 16; i++) {
      luciernagas.push({ bx: r() * Wc, by: groundY - 150 + r() * 190, ax: 14 + r() * 30, ay: 8 + r() * 18, sp: 0.2 + r() * 0.4, ph: r() * TAU });
    }
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    S = Math.max(1, Math.round((dpr * Math.min(cw, ch)) / ANCHO_REF));
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    Wc = Math.ceil(canvas.width / S);
    Hc = Math.ceil(canvas.height / S);
    lo.width = Wc; lo.height = Hc;
    extra = Math.round(Hc * 0.14);
    groundY = Math.round(Hc * 0.58);
    madre.x = Math.round(Wc / 2);
    pintarFondo();
  }

  // ---------- helpers de entidades ----------
  const pies = (carril) => groundY + CARRILES[carril];
  const madreY = () => groundY + 16;
  const imgMadre = () => assets.madre[etapaPrev ?? 0];
  const FW = ANIM.fw, FH = ANIM.fh;

  function nuevoVisual(i, desdePuerta) {
    const x = desdePuerta ? madre.x + (Math.random() - 0.5) * 20 : 40 + Math.random() * (Wc - 80);
    return {
      i, carril: i % CARRILES.length, x, dir: Math.random() < 0.5 ? -1 : 1,
      modo: "idle", anim: "idle", animT: Math.random() * 4, espera: desdePuerta ? 0.3 : 0.5 + Math.random() * 2,
      meta: x, entrega: 5 + Math.random() * 7, llevando: false, parpadeo: 2 + Math.random() * 3, hop: 0,
      alfa: desdePuerta ? 0 : 1, tDar: 0,
    };
  }

  function sincronizarVisuales(state) {
    const n = Math.min(state.honguitos.basico || 0, MAX_VISUALES);
    while (visuales.length < n) {
      const v = nuevoVisual(visuales.length, !inicial);
      if (!inicial) luzHalo(v.x, pies(v.carril) - 30, 26, [255, 214, 140], 1);
      visuales.push(v);
    }
    inicial = false;
  }

  function poner(v, modo, anim) {
    v.modo = modo; v.anim = anim; v.animT = 0;
  }

  function pos(x, y, vx, vy, extraP) {
    if (particulas.length < MAX_PARTICULAS) particulas.push({ x, y, vx, vy, t: 0, ...extraP });
  }

  function motas(x, y, n, fuerza = 1) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const v = (16 + Math.random() * 44) * fuerza;
      pos(x, y, Math.cos(a) * v, Math.sin(a) * v, { tipo: "mota", dur: 0.8 + Math.random() * 1 });
    }
  }
  function anillo(x, y, r1, dur = 0.55, col = [255, 232, 160]) {
    pos(x, y, 0, 0, { tipo: "anillo", r1, dur, col });
  }
  function chispas(x, y, n) {
    for (let i = 0; i < n; i++) {
      pos(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 22, 0, -6, { tipo: "chispa", dur: 0.5 + Math.random() * 0.5, L: 2 + Math.floor(Math.random() * 3) });
    }
  }

  function emitirEspora(v) {
    const img = imgMadre();
    pos(v.x, pies(v.carril) - 84, 0, 0, {
      tipo: "viaje",
      x0: v.x, y0: pies(v.carril) - 84,
      x1: madre.x + (Math.random() - 0.5) * img.width * 0.35,
      y1: madreY() - img.height * 0.8,
      dur: 1.0 + Math.random() * 0.4, arco: 30 + Math.random() * 40, estela: 0,
    });
  }

  // ---------- update ----------
  function update(dt, state, etapa, alturaHojaCss = 0) {
    t += dt;
    if (etapaPrev === null) etapaPrev = etapa;
    if (etapa !== etapaPrev) {
      etapaPrev = etapa;
      const img = imgMadre();
      const cy = madreY() - img.height * 0.55;
      madre.pulso = 1;
      flash = 1;
      motas(madre.x, cy, 70, 1.8);
      anillo(madre.x, cy, 150, 1.0, [255, 240, 190]);
      setTimeout(() => anillo(madre.x, cy, 110, 0.8, [255, 200, 140]), 180);
      chispas(madre.x, cy, 24);
    }
    madre.pulso = Math.max(0, madre.pulso - dt * 3);
    madre.brillo = Math.max(0, madre.brillo - dt * 1.6);
    flash = Math.max(0, flash - dt * 1.4);

    // día/noche: sigue el reloj, así no depende de cuánto tiempo lleves jugando
    if (luzForzada !== null) luz = clamp(parseFloat(luzForzada) || 0, 0, 1);
    else luz = 0.5 - 0.5 * Math.cos(TAU * (((Date.now() / 1000) % CICLO) / CICLO));

    // cámara: sube la escena para que el panel no tape el prado
    const hojaC = (alturaHojaCss * dpr) / S;
    const objetivo = clamp(groundY + 42 - (Hc - hojaC), 0, extra);
    cam += (objetivo - cam) * (1 - Math.exp(-dt * 6));

    sincronizarVisuales(state);
    const mHalf = imgMadre().width / 2;
    for (const v of visuales) {
      v.alfa = Math.min(1, v.alfa + dt * 2.5);
      v.animT += dt * ANIM.anims[v.anim].fps;
      v.hop = 0;
      v.parpadeo -= dt;
      if (v.parpadeo < -0.14) v.parpadeo = 2.5 + Math.random() * 3.5;
      if (v.modo === "idle") {
        v.espera -= dt;
        if (v.espera <= 0) {
          if (v.entrega <= 0) {
            v.llevando = true;
            v.meta = madre.x + (v.i % 2 ? -1 : 1) * (4 + (v.i % 5) * 5);
            v.dir = Math.sign(v.meta - v.x) || 1;
            poner(v, "walk", "walk");
          } else if (Math.random() < 0.18) {
            poner(v, "salto", "salto");
          } else {
            let meta = v.x + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 90);
            meta = clamp(meta, 30, Wc - 30);
            if (v.carril === 0 && Math.abs(meta - madre.x) < mHalf - 6) meta = madre.x + Math.sign(meta - madre.x || 1) * (mHalf + 12);
            v.meta = meta;
            v.dir = Math.sign(meta - v.x) || 1;
            poner(v, "walk", "walk");
          }
        }
      } else if (v.modo === "walk") {
        const d = v.meta - v.x;
        const paso = VEL * dt;
        if (Math.abs(d) <= paso) {
          v.x = v.meta;
          if (v.llevando) { poner(v, "dar", "dar"); v.tDar = 0; }
          else { poner(v, "idle", "idle"); v.espera = Math.random() < 0.3 ? 0.4 : 1 + Math.random() * 3; }
        } else v.x += Math.sign(d) * paso;
      } else if (v.modo === "dar") {
        v.tDar += dt;
        if (v.tDar > 0.9) {
          v.llevando = false;
          v.entrega = 7 + Math.random() * 6;
          emitirEspora(v);
          poner(v, "idle", "idle");
          v.espera = 0.5;
        }
      } else if (v.modo === "salto") {
        const u = clamp((v.animT - 1) / 3, 0, 1);
        v.hop = Math.sin(u * Math.PI) * 14;
        if (v.animT >= ANIM.anims.salto.frames.length) {
          poner(v, "idle", "idle");
          v.espera = 0.4 + Math.random();
        }
      }
    }

    for (const n of nubes) {
      n.x += n.v * dt;
      if (n.x > Wc + 10) n.x = -n.w - 10;
    }
    if (Math.random() < dt * 2) motas(Math.random() * Wc, groundY + 8, 1, 0.45);

    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i];
      p.t += dt;
      if (p.t >= p.dur) {
        if (p.tipo === "viaje") {
          madre.pulso = Math.min(1, madre.pulso + 0.5);
          madre.brillo = 1;
          motas(p.x1, p.y1, 6);
          anillo(p.x1, p.y1, 26, 0.5);
          chispas(p.x1, p.y1, 5);
        }
        particulas.splice(i, 1);
        continue;
      }
      if (p.tipo === "mota") {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 22 * dt;
      } else if (p.tipo === "chispa") {
        p.y += p.vy * dt;
      } else if (p.tipo === "viaje") {
        p.estela -= dt;
        if (p.estela <= 0) {
          p.estela = 0.03;
          const q = puntoViaje(p);
          pos(q.x, q.y, 0, 0, { tipo: "estela", dur: 0.4 });
        }
      }
    }
  }

  function puntoViaje(p) {
    const k = p.t / p.dur, e = suave(k), u = 1 - e;
    const cx = (p.x0 + p.x1) / 2, cy = Math.min(p.y0, p.y1) - p.arco;
    return { x: u * u * p.x0 + 2 * u * e * cx + e * e * p.x1, y: u * u * p.y0 + 2 * u * e * cy + e * e * p.y1 };
  }

  // ---------- draw ----------
  function cielo(oy) {
    const k = luz;
    const calido = Math.sin(Math.PI * k); // naranja en el horizonte al atardecer/amanecer
    const top = mezcla(CIELO_DIA.top, CIELO_NOCHE.top, k);
    let bot = mezcla(CIELO_DIA.bot, CIELO_NOCHE.bot, k);
    bot = [bot[0] + calido * 70, bot[1] + calido * 18, bot[2] - calido * 26];
    const banda = 8;
    for (let y = 0; y < groundY + 4; y += banda) {
      g.fillStyle = rgb(mezcla(top, bot, Math.pow(y / groundY, 0.9)));
      g.fillRect(0, y + oy, Wc, banda);
    }
    // estrellas
    if (k > 0.25) {
      for (const s of estrellas) {
        const a = clamp((k - 0.25) / 0.5, 0, 1) * (0.45 + 0.55 * Math.sin(t * 2 + s.ph));
        if (a < 0.08) continue;
        g.fillStyle = `rgba(255,255,235,${a})`;
        g.fillRect(s.x, s.y + oy, 1, 1);
        if (s.g && a > 0.6) { g.fillRect(s.x - 1, s.y + oy, 3, 1); g.fillRect(s.x, s.y + oy - 1, 1, 3); }
      }
    }
    // sol y luna
    g.save();
    g.translate(0, oy);
    const sol = clamp(1 - k * 1.7, 0, 1), luna = clamp((k - 0.35) * 1.7, 0, 1);
    luzHalo(Wc * 0.78, groundY * 0.3, 64, [255, 214, 150], 0.5 * sol);
    if (sol > 0.02) disco(Wc * 0.78, groundY * 0.3, 9, `rgba(255,238,190,${sol})`);
    luzHalo(Wc * 0.2, groundY * 0.24, 42, [170, 190, 255], 0.5 * luna);
    if (luna > 0.02) {
      disco(Wc * 0.2, groundY * 0.24, 8, `rgba(236,242,255,${luna})`);
      disco(Wc * 0.2 + 3, groundY * 0.24 - 2, 7, rgb(mezcla(top, bot, 0.25), luna)); // creciente
    }
    g.restore();
    // nubes
    for (const n of nubes) {
      const x = Math.round(n.x), y = Math.round(n.y) + oy, w = Math.round(n.w);
      g.fillStyle = `rgba(236,242,238,${0.78 - 0.55 * k})`;
      g.fillRect(x, y + 8, w, 8);
      g.fillRect(x + 10, y + 2, w - 24, 8);
    }
  }

  function rayos(oy) {
    const a = 0.07 * (1 - luz) * (0.75 + 0.25 * Math.sin(t * 0.4));
    if (a < 0.005) return;
    aditivo(() => {
      for (let i = 0; i < 4; i++) {
        const x0 = Wc * (0.45 + i * 0.12) + Math.sin(t * 0.2 + i) * 6;
        const w = 22 + i * 7;
        g.fillStyle = `rgba(255,236,170,${a * (1 - i * 0.15)})`;
        for (let y = 0; y < groundY - 6; y += 2) {
          const f = y / groundY;
          g.fillRect(Math.round(x0 - f * 90), y + oy, Math.round(w * (0.5 + f)), 2);
        }
      }
    });
  }

  function sombra(x, y, w) {
    g.fillStyle = "rgba(14,24,20,0.3)";
    g.fillRect(Math.round(x - w / 2), Math.round(y) - 1, w, 3);
    g.fillRect(Math.round(x - w / 2) + 3, Math.round(y) + 2, w - 6, 2);
  }

  // dibuja una imagen y encima su versión nocturna con alfa = luz
  function conTinte(dia, noche, sx, sy, sw, sh, dx, dy, alfa = 1) {
    g.globalAlpha = alfa;
    g.drawImage(dia, sx, sy, sw, sh, dx, dy, sw, sh);
    if (luz > 0.02) {
      g.globalAlpha = alfa * luz;
      g.drawImage(noche, sx, sy, sw, sh, dx, dy, sw, sh);
    }
    g.globalAlpha = 1;
  }

  function dibujarHonguito(v) {
    const fy = pies(v.carril);
    const a = ANIM.anims[v.anim];
    let nombre = v.anim, idx;
    if (v.anim === "idle" && v.parpadeo < 0) idx = ANIM.anims.blink.frames[0];
    else idx = a.loop ? a.frames[Math.floor(v.animT) % a.frames.length] : a.frames[Math.min(a.frames.length - 1, Math.floor(v.animT))];
    const sy = Math.round(fy - FH - v.hop);
    sombra(v.x, fy, 30 - Math.round(v.hop * 0.8));
    g.save();
    if (v.dir < 0) { g.translate(Math.round(v.x), 0); g.scale(-1, 1); g.translate(-Math.round(v.x), 0); }
    conTinte(assets.honguito, sheetNoche, idx * FW, 0, FW, FH, Math.round(v.x - FW / 2), sy, v.alfa);
    g.restore();
    if (v.llevando) {
      const ox = v.x, oy2 = fy - 90 + Math.sin(t * 5 + v.i) * 2;
      luzHalo(ox, oy2, 11, [255, 240, 160], 0.8);
      g.fillStyle = "rgb(255,252,224)";
      g.fillRect(Math.round(ox) - 1, Math.round(oy2) - 1, 3, 3);
    }
  }

  function dibujarMadre() {
    const img = imgMadre();
    const sq = Math.round(madre.pulso * 3);
    const dh = img.height - sq;
    const x = Math.round(madre.x - img.width / 2), y = madreY() - dh;
    sombra(madre.x, madreY(), img.width - 10);
    const idx = assets.madre.indexOf(img);
    g.globalAlpha = 1;
    g.drawImage(img, x, y, img.width, dh);
    if (luz > 0.02) { g.globalAlpha = luz; g.drawImage(madreNoche[idx], x, y, img.width, dh); g.globalAlpha = 1; }
  }

  function luces() {
    const img = imgMadre();
    const cy = madreY() - img.height * 0.5;
    const base = 0.18 + 0.4 * luz + madre.brillo * 0.5 + madre.pulso * 0.3;
    // resplandor detrás del hongo
    luzHalo(madre.x, cy, Math.round(img.width * 0.95), [255, 190, 110], base * 0.55);
    // charco de luz en el pasto frente a la puerta + cono de luz
    luzHalo(madre.x, madreY() + 6, Math.round(img.width * 0.75), [255, 205, 130], base * 0.9, 0.22);
    aditivo(() => {
      const a = (0.05 + 0.1 * luz) * (0.8 + madre.brillo);
      for (let i = 0; i < 30; i += 2) {
        const w = 10 + i * 1.6;
        g.fillStyle = `rgba(255,214,140,${a * (1 - i / 34)})`;
        g.fillRect(Math.round(madre.x - w / 2), madreY() - 2 + i, Math.round(w), 2);
      }
    });
  }

  function lucesSobre() {
    const img = imgMadre();
    const cy = madreY() - img.height * 0.5;
    // brillo suave sobre todo lo que está cerca (ilumina a los honguitos)
    luzHalo(madre.x, madreY() - 20, Math.round(img.width * 1.1), [255, 200, 130], (0.04 + 0.12 * luz) + madre.brillo * 0.12);
    // esporas orbitando el sombrero
    const n = 2 + (assets.madre.indexOf(img)) * 2;
    for (let k = 0; k < n; k++) {
      const a = t * 0.7 + (k * TAU) / n;
      const x = madre.x + Math.cos(a) * img.width * 0.62;
      const y = madreY() - img.height * 0.88 + Math.sin(a) * img.height * 0.1 - 4;
      luzHalo(x, y, 6, [255, 238, 160], (0.35 + 0.5 * luz) * (0.6 + 0.4 * Math.sin(t * 3 + k)));
      g.fillStyle = "rgba(255,252,230,0.9)";
      g.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    // luciérnagas
    for (const f of luciernagas) {
      const x = f.bx + Math.sin(t * f.sp + f.ph) * f.ax;
      const y = f.by + Math.sin(t * f.sp * 1.7 + f.ph * 2) * f.ay;
      const a = (0.15 + 0.85 * luz) * (0.35 + 0.65 * Math.sin(t * 2.2 + f.ph) ** 2);
      if (a < 0.06) continue;
      luzHalo(x, y, 7, [196, 255, 150], a * 0.8);
      g.fillStyle = `rgba(240,255,200,${Math.min(1, a * 1.4)})`;
      g.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  }

  function dibujarParticulas() {
    for (const p of particulas) {
      const k = p.t / p.dur;
      if (p.tipo === "viaje") {
        const q = puntoViaje(p);
        luzHalo(q.x, q.y, 12, [255, 240, 160], 0.9);
        g.fillStyle = "rgb(255,252,226)";
        g.fillRect(Math.round(q.x) - 1, Math.round(q.y) - 1, 3, 3);
      } else if (p.tipo === "estela") {
        luzHalo(p.x, p.y, 5, [255, 232, 150], 0.6 * (1 - k));
      } else if (p.tipo === "mota") {
        g.fillStyle = `rgba(255,248,196,${0.9 * (1 - k)})`;
        const s = k < 0.5 ? 2 : 1;
        g.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      } else if (p.tipo === "anillo") {
        const r = p.r1 * (1 - (1 - k) * (1 - k));
        const n = Math.max(12, Math.round(r * 1.6));
        aditivo(() => {
          g.fillStyle = rgb(p.col, 0.85 * (1 - k));
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU;
            g.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r * 0.8), 2, 2);
          }
        });
      } else if (p.tipo === "chispa") {
        const a = (1 - k) * (0.6 + 0.4 * Math.sin(k * 30));
        aditivo(() => {
          g.fillStyle = `rgba(255,248,200,${a})`;
          const x = Math.round(p.x), y = Math.round(p.y), L = p.L;
          g.fillRect(x - L, y, L * 2 + 1, 1);
          g.fillRect(x, y - L, 1, L * 2 + 1);
        });
      }
    }
  }

  function draw() {
    g.imageSmoothingEnabled = false;
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, Wc, Hc);
    const oy = -Math.round(cam);
    cielo(oy);
    g.drawImage(frente, 0, oy);
    rayos(oy);
    // noche: tinte sobre el fondo
    if (luz > 0.01) {
      g.fillStyle = rgb(TINTE_NOCHE, 0.5 * luz);
      g.fillRect(0, 0, Wc, Hc);
    }
    g.save();
    g.translate(0, oy);
    luces();
    const cola = visuales.map((v) => ({ y: pies(v.carril), v }));
    cola.push({ y: madreY(), madre: true });
    cola.sort((a, b) => a.y - b.y);
    for (const it of cola) it.madre ? dibujarMadre() : dibujarHonguito(it.v);
    lucesSobre();
    dibujarParticulas();
    g.restore();

    // pantalla: destello de etapa y viñeta
    if (flash > 0.01) aditivo(() => { g.fillStyle = `rgba(255,244,210,${flash * 0.4})`; g.fillRect(0, 0, Wc, Hc); });
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lo, 0, 0, Wc * S, Hc * S);
  }

  // ---------- toques ----------
  function toque(px, py) {
    const cx = (px * dpr) / S;
    const cy = (py * dpr) / S + Math.round(cam);
    const img = imgMadre();
    if (cx > madre.x - img.width / 2 && cx < madre.x + img.width / 2 && cy > madreY() - img.height && cy < madreY()) {
      return { quien: "madre" };
    }
    for (let i = visuales.length - 1; i >= 0; i--) {
      const v = visuales[i];
      const fy = pies(v.carril);
      if (Math.abs(cx - v.x) < 26 && cy > fy - 70 && cy < fy + 2) {
        if (v.modo === "idle") poner(v, "salto", "salto");
        return { quien: "honguito", v };
      }
    }
    return null;
  }

  function pulsoMadre() {
    const img = imgMadre();
    madre.pulso = 1;
    madre.brillo = 1;
    motas(madre.x, madreY() - img.height * 0.7, 14);
    anillo(madre.x, madreY() - img.height * 0.5, 50, 0.5);
  }

  return { resize, update, draw, toque, pulsoMadre };
}
