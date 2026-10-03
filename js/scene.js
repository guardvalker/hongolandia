// Escena 2D vista lateral, estilo minimalista: fondo azul noche plano, contornos blancos,
// manchitas de colores. Todo se dibuja con formas simples en un buffer chico (1 celda = 1 píxel
// del arte) y se escala con un factor entero sin suavizado. No hay sprites ni fotogramas:
// los honguitos son un bitmap diminuto que se mueve con rebotes y estiramientos por código.

const MAX_VISUALES = { basico: 28, musico: 16 }; // honguitos dibujados por tipo (el número real puede ser enorme)
const MAX_PARTICULAS = 300;
const ANCHO_REF = 300; // celdas del lado corto de la pantalla
const VEL = 28; // celdas/seg al caminar
const TAU = Math.PI * 2;

const BG = "#272736";
const BG_SUELO = "#1d1d2a";
const COL_COLINA = ["#2d2d40", "#33334a"];
const BLANCO = "#fff";
const PALETA = ["#ff6fb5", "#2eaaf5", "#b5e61d", "#ff5a14", "#3fe08a", "#fadc28", "#ffffff"];

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

// Honguito: c = sombrero (color), w = cuerpo blanco, e = ojo. Dos poses de patitas.
const HW = 9, HH = 9;
const HONGO = [
  "..ccccc..",
  ".ccccccc.",
  "ccccccccc",
  "ccccccccc",
  ".wwwwwww.",
  ".wewwwew.",
  ".wwwwwww.",
  ".wwwwwww.",
];
const PATAS = [".ww...ww.", "..ww.ww.."];

const VIOLETA = "#a77bff";
const BONUS_CONSERV = 1.15; // el conservatorio agranda al hongo madre
const CONS = { w: 36, ch: 19, sw: 15, sh: 13 }; // conservatorio hongil
const NOTA = ["..##.", "..#.#", "..#..", "..#..", "###..", "###.."];

// medidas del hongo madre por etapa: ancho del sombrero, alto del sombrero, ancho y alto del tallo
const MADRE = [
  { w: 30, ch: 17, sw: 14, sh: 12 },
  { w: 46, ch: 26, sw: 20, sh: 18 },
  { w: 66, ch: 38, sw: 28, sh: 26 },
  { w: 92, ch: 54, sw: 38, sh: 36 },
];

const MADRE_GRANDE = MADRE.map((m) => ({ w: Math.round(m.w * BONUS_CONSERV), ch: Math.round(m.ch * BONUS_CONSERV), sw: Math.round(m.sw * BONUS_CONSERV), sh: Math.round(m.sh * BONUS_CONSERV) }));

export function crearEscena(canvas) {
  const ctx = canvas.getContext("2d");
  const lo = document.createElement("canvas");
  const g = lo.getContext("2d");
  let dpr = 1, S = 1, Wc = 0, Hc = 0, groundY = 0;
  let fondo = null;
  let t = 0, etapaPrev = null, inicial = true, flash = 0;

  const madre = { x: 0, pulso: 0, brillo: 0 };
  let conservatorio = null; // { x } en celdas, cuando está construido
  let bonusMadre = false;
  let consBrillo = 0;
  let colocando = null; // { id, x } mientras el jugador elige dónde ponerlo
  const visuales = [];
  const particulas = [];
  const flotantes = [];
  const estrellas = [];

  // ---------- sprites precalculados (un canvas por color y pose) ----------
  function hacerSprite(col, patas, boca) {
    const c = document.createElement("canvas");
    c.width = HW; c.height = HH;
    const x = c.getContext("2d");
    const filas = [...HONGO, patas];
    if (boca) filas[6] = ".wwmmmww.";
    filas.forEach((fila, y) => {
      for (let i = 0; i < HW; i++) {
        const ch = fila[i];
        if (ch === ".") continue;
        x.fillStyle = ch === "c" ? col : ch === "e" || ch === "m" ? BG : BLANCO;
        x.fillRect(i, y, 1, 1);
      }
    });
    return c;
  }
  const spritesHongo = PALETA.map((col) => [0, 1].map((pose) => hacerSprite(col, PATAS[pose], false)));
  const spritesMusico = [hacerSprite(VIOLETA, PATAS[0], false), hacerSprite(VIOLETA, PATAS[1], false), hacerSprite(VIOLETA, PATAS[0], true)];
  const spritesNota = PALETA.map((col) => {
    const c = document.createElement("canvas");
    c.width = 5; c.height = 6;
    const x = c.getContext("2d");
    x.fillStyle = col;
    NOTA.forEach((fila, y) => { for (let i = 0; i < 5; i++) if (fila[i] === "#") x.fillRect(i, y, 1, 1); });
    return c;
  });

  // ---------- primitivas ----------
  function disco(x, y, r, color) {
    g.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.5));
      g.fillRect(Math.round(x) - w, Math.round(y) + dy, w * 2 + 1, 1);
    }
  }
  // media elipse con la base en baseY; `ins` = 1 dibuja el interior de un contorno de 1 celda
  function semi(cx, baseY, rx, ry, color, ins = 0) {
    g.fillStyle = color;
    const ancho = (dy) => Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    for (let dy = ins; dy < ry - ins; dy++) {
      const w = ins ? ancho(dy + 1) - 1 : ancho(dy);
      if (w > 0) g.fillRect(cx - w, baseY - dy - 1, w * 2, 1);
    }
  }
  function aro(cx, cy, r, color) {
    const n = Math.max(10, Math.round(r * 5));
    g.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
    }
  }

  // ---------- fondo estático: colinas planas, suelo y línea blanca ----------
  function colinas(c, r, base, amp, col) {
    const f1 = 0.008 + r() * 0.005, f2 = 0.02 + r() * 0.008, p1 = r() * 9, p2 = r() * 9;
    c.fillStyle = col;
    for (let x = 0; x < Wc; x += 2) {
      const h = amp * (0.6 + 0.3 * Math.sin(x * f1 + p1) + 0.12 * Math.sin(x * f2 + p2));
      const y = base - Math.round(h);
      c.fillRect(x, y, 2, base - y + 1);
    }
  }

  function pintarFondo() {
    const r = rng(11);
    const H = Hc;
    fondo = document.createElement("canvas");
    fondo.width = Wc; fondo.height = H;
    const c = fondo.getContext("2d");
    c.fillStyle = BG;
    c.fillRect(0, 0, Wc, H);
    colinas(c, r, groundY, Hc * 0.2, COL_COLINA[0]);
    colinas(c, r, groundY, Hc * 0.11, COL_COLINA[1]);
    c.fillStyle = BG_SUELO;
    c.fillRect(0, groundY + 1, Wc, H - groundY);
    c.fillStyle = BLANCO;
    c.fillRect(0, groundY, Wc, 1);

    estrellas.length = 0;
    for (let i = 0; i < 40; i++) estrellas.push({ x: Math.floor(r() * Wc), y: Math.floor(r() * groundY * 0.8), ph: r() * TAU });
    flotantes.length = 0;
    for (let i = 0; i < 70; i++) {
      flotantes.push({
        x: r() * Wc, y: r() * groundY, vy: 1 + r() * 2.5, ax: 3 + r() * 8, sp: 0.3 + r() * 0.5, ph: r() * TAU,
        col: PALETA[Math.floor(r() * PALETA.length)], r: r() < 0.15 ? 2 : 1,
      });
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
    groundY = Math.round(Hc * 0.74);
    madre.x = Math.round(Wc / 2);
    pintarFondo();
  }

  // ---------- entidades ----------
  const medidas = () => (bonusMadre ? MADRE_GRANDE : MADRE)[etapaPrev ?? 0];
  const alturaMadre = () => { const m = medidas(); return m.ch + m.sh; };

  function nuevoVisual(i, tipo, desdePuerta) {
    const origen = tipo === "musico" ? conservatorio.x : madre.x;
    const x = desdePuerta ? origen + (Math.random() - 0.5) * 12 : tipo === "musico" ? origen + (Math.random() - 0.5) * 50 : 14 + Math.random() * (Wc - 28);
    return {
      i, tipo, cantaEn: 2 + Math.random() * 4, tCanta: 0, notaT: 0, x, dir: Math.random() < 0.5 ? -1 : 1, col: i % PALETA.length,
      modo: "idle", animT: Math.random() * 4, espera: desdePuerta ? 0.3 : 0.5 + Math.random() * 2,
      meta: x, entrega: 5 + Math.random() * 7, llevando: false, hop: 0, estira: 0,
      alfa: desdePuerta ? 0 : 1, tDar: 0,
    };
  }

  function sincronizarVisuales(state) {
    for (const tipo of ["basico", "musico"]) {
      if (tipo === "musico" && !conservatorio) continue;
      const n = Math.min(state.honguitos[tipo] || 0, MAX_VISUALES[tipo]);
      let cuenta = visuales.filter((v) => v.tipo === tipo).length;
      while (cuenta < n) {
        const v = nuevoVisual(visuales.length, tipo, !inicial);
        if (!inicial) { motas(v.x, groundY - 6, 6, 0.6, PALETA[v.col]); aroPart(v.x, groundY - 4, 9, 0.4); }
        visuales.push(v);
        cuenta++;
      }
    }
    inicial = false;
  }

  function part(x, y, vx, vy, extraP) {
    if (particulas.length < MAX_PARTICULAS) particulas.push({ x, y, vx, vy, t: 0, ...extraP });
  }
  function motas(x, y, n, fuerza = 1, col) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.8;
      const v = (14 + Math.random() * 40) * fuerza;
      part(x, y, Math.cos(a) * v, Math.sin(a) * v, {
        tipo: "mota", dur: 0.6 + Math.random() * 0.8, col: col || PALETA[Math.floor(Math.random() * PALETA.length)], r: Math.random() < 0.3 ? 2 : 1,
      });
    }
  }
  function aroPart(x, y, r1, dur = 0.5) { part(x, y, 0, 0, { tipo: "aro", r1, dur }); }

  function emitirEspora(v) {
    const m = medidas();
    part(v.x, groundY - 14, 0, 0, {
      tipo: "viaje", col: PALETA[v.col],
      x0: v.x, y0: groundY - 14,
      x1: madre.x + (Math.random() - 0.5) * m.w * 0.5, y1: groundY - m.sh - m.ch * 0.5,
      dur: 0.8 + Math.random() * 0.3, arco: 20 + Math.random() * 24, estela: 0,
    });
  }

  function puntoViaje(p) {
    const k = p.t / p.dur, e = suave(k), u = 1 - e;
    const cx = (p.x0 + p.x1) / 2, cy = Math.min(p.y0, p.y1) - p.arco;
    return { x: u * u * p.x0 + 2 * u * e * cx + e * e * p.x1, y: u * u * p.y0 + 2 * u * e * cy + e * e * p.y1 };
  }

  // Posición válida de un edificio: dentro de la pantalla y sin pisar al hongo madre.
  function xValida(x, ancho) {
    const mitad = ancho / 2, hueco = medidas().w / 2 + mitad + 6, lim = mitad + 4;
    if (Math.abs(x - madre.x) < hueco) x = madre.x + (x >= madre.x ? hueco : -hueco);
    return clamp(x, lim, Wc - lim);
  }

  function actualizarMusico(v, dt) {
    v.alfa = Math.min(1, v.alfa + dt * 2.5);
    v.animT += dt;
    v.hop = 0;
    v.estira = 0;
    if (v.modo === "idle") {
      v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
      v.cantaEn -= dt;
      v.espera -= dt;
      if (v.cantaEn <= 0) {
        v.modo = "canta"; v.tCanta = 0; v.notaT = 0;
        emitirEspora(v);
      } else if (v.espera <= 0) {
        v.meta = clamp(conservatorio.x + (Math.random() - 0.5) * 80, 12, Wc - 12);
        v.dir = Math.sign(v.meta - v.x) || 1;
        v.modo = "walk";
      }
    } else if (v.modo === "walk") {
      v.hop = Math.abs(Math.sin(v.animT * 11)) * 1.5;
      const d = v.meta - v.x, paso = VEL * 0.7 * dt;
      if (Math.abs(d) <= paso) { v.x = v.meta; v.modo = "idle"; v.espera = 1 + Math.random() * 2.5; }
      else v.x += Math.sign(d) * paso;
    } else if (v.modo === "canta") {
      v.tCanta += dt;
      v.hop = Math.abs(Math.sin(v.tCanta * 7)) * 1.5;
      consBrillo = Math.max(consBrillo, 0.5);
      v.notaT -= dt;
      if (v.notaT <= 0) {
        v.notaT = 0.42;
        part(v.x + v.dir * 3, groundY - HH - 3, (Math.random() - 0.5) * 6, -15, { tipo: "nota", dur: 1.5, col: Math.floor(Math.random() * PALETA.length), fase: Math.random() * TAU });
      }
      if (v.tCanta > 1.7) { v.modo = "idle"; v.cantaEn = 4 + Math.random() * 5; v.espera = 0.6; }
    } else if (v.modo === "salto") {
      const u = clamp(v.animT / 0.5, 0, 1);
      v.hop = Math.sin(u * Math.PI) * 9;
      if (u >= 1) { v.modo = "idle"; v.espera = 0.4 + Math.random(); }
    }
  }

  // ---------- update ----------
  function update(dt, state, etapa) {
    t += dt;
    if (etapaPrev === null) etapaPrev = etapa;
    if (etapa !== etapaPrev) {
      etapaPrev = etapa;
      const cy = groundY - alturaMadre() * 0.6;
      madre.pulso = 1;
      flash = 1;
      motas(madre.x, cy, 60, 1.8);
      aroPart(madre.x, cy, 90, 0.9);
      setTimeout(() => aroPart(madre.x, cy, 60, 0.7), 160);
    }
    madre.pulso = Math.max(0, madre.pulso - dt * 3);
    madre.brillo = Math.max(0, madre.brillo - dt * 2);
    flash = Math.max(0, flash - dt * 2);

    // edificios (el jugador los ubica; la posición se guarda como fracción del ancho)
    const ec = state.edificios.conservatorio;
    if (ec) {
      const nuevo = !conservatorio;
      bonusMadre = true;
      conservatorio = { x: xValida(ec.x * Wc, CONS.w) };
      if (nuevo && !inicial) {
        const cy = groundY - CONS.ch - CONS.sh * 0.5;
        madre.pulso = 1; flash = 0.6;
        motas(conservatorio.x, cy, 40, 1.4);
        aroPart(conservatorio.x, cy, 50, 0.7);
        aroPart(madre.x, groundY - alturaMadre() * 0.6, 70, 0.8);
        motas(madre.x, groundY - alturaMadre(), 30, 1.4);
      }
    } else { conservatorio = null; bonusMadre = false; }
    consBrillo = Math.max(0, consBrillo - dt * 2);

    sincronizarVisuales(state);
    const mHalf = medidas().w / 2;
    for (const v of visuales) {
      if (v.tipo === "musico") { actualizarMusico(v, dt); continue; }
      v.alfa = Math.min(1, v.alfa + dt * 2.5);
      v.animT += dt;
      v.hop = 0;
      v.estira = 0;
      if (v.modo === "idle") {
        v.estira = Math.sin(v.animT * 3 + v.i) * 0.5;
        v.espera -= dt;
        if (v.espera <= 0) {
          if (v.entrega <= 0) {
            v.llevando = true;
            v.meta = madre.x + (v.i % 2 ? -1 : 1) * (mHalf * 0.2 + (v.i % 5) * 3);
            v.dir = Math.sign(v.meta - v.x) || 1;
            v.modo = "walk";
          } else if (Math.random() < 0.2) {
            v.modo = "salto"; v.animT = 0;
          } else {
            const meta = clamp(v.x + (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 70), 12, Wc - 12);
            v.meta = meta;
            v.dir = Math.sign(meta - v.x) || 1;
            v.modo = "walk";
          }
        }
      } else if (v.modo === "walk") {
        v.hop = Math.abs(Math.sin(v.animT * 11)) * 1.5;
        const d = v.meta - v.x;
        const paso = VEL * dt;
        if (Math.abs(d) <= paso) {
          v.x = v.meta;
          if (v.llevando) { v.modo = "dar"; v.tDar = 0; }
          else { v.modo = "idle"; v.espera = Math.random() < 0.3 ? 0.4 : 1 + Math.random() * 3; }
        } else v.x += Math.sign(d) * paso;
      } else if (v.modo === "dar") {
        v.tDar += dt;
        v.hop = Math.abs(Math.sin(v.tDar * 8)) * 2;
        if (v.tDar > 0.7) {
          v.llevando = false;
          v.entrega = 7 + Math.random() * 6;
          emitirEspora(v);
          v.modo = "idle";
          v.espera = 0.5;
        }
      } else if (v.modo === "salto") {
        const u = clamp(v.animT / 0.5, 0, 1);
        v.hop = Math.sin(u * Math.PI) * 9;
        if (u >= 1) { v.modo = "idle"; v.espera = 0.4 + Math.random(); }
      }
    }

    for (const f of flotantes) {
      f.y -= f.vy * dt;
      if (f.y < -6) { f.y = groundY - 2; f.x = Math.random() * Wc; }
    }
    if (Math.random() < dt * 1.5) motas(Math.random() * Wc, groundY - 2, 1, 0.4);

    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i];
      p.t += dt;
      if (p.t >= p.dur) {
        if (p.tipo === "viaje") {
          madre.pulso = Math.min(1, madre.pulso + 0.5);
          madre.brillo = 1;
          motas(p.x1, p.y1, 6, 0.9, p.col);
          aroPart(p.x1, p.y1, 12, 0.4);
        }
        particulas.splice(i, 1);
        continue;
      }
      if (p.tipo === "mota") {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt;
      } else if (p.tipo === "nota") {
        p.x += p.vx * dt; p.y += p.vy * dt;
      } else if (p.tipo === "viaje") {
        p.estela -= dt;
        if (p.estela <= 0) {
          p.estela = 0.04;
          const q = puntoViaje(p);
          part(q.x, q.y, 0, 0, { tipo: "estela", dur: 0.3, col: p.col });
        }
      }
    }
  }

  // ---------- draw ----------
  // Hongo de contorno blanco (tallo liso + sombrero). Lo usan el hongo madre y los edificios.
  function hongoBase(cx, m, sq, brillo) {
    const capBase = groundY - m.sh;
    const ch = m.ch - sq;
    const rx = Math.round(m.w / 2);

    // tallo: contorno blanco, interior oscuro, abierto hacia el sombrero (liso, sin puerta)
    const sx = cx - Math.round(m.sw / 2);
    g.fillStyle = BLANCO;
    g.fillRect(sx, capBase, m.sw, m.sh);
    g.fillStyle = BG;
    g.fillRect(sx + 1, capBase, m.sw - 2, m.sh - 1);

    // sombrero: contorno blanco
    semi(cx, capBase, rx, ch, BLANCO);
    g.fillStyle = BLANCO;
    g.fillRect(cx - rx, capBase - 1, rx * 2, 1);
    semi(cx, capBase, rx, ch, BG, 1);
    if (brillo > 0.02) {
      const a = g.globalAlpha;
      g.globalAlpha = a * brillo * 0.35;
      semi(cx, capBase, rx, ch, BLANCO, 1);
      g.globalAlpha = a;
    }
    return { capBase, ch, rx };
  }

  function dibujarMadre() {
    const m = medidas();
    const cx = Math.round(madre.x);
    const { capBase, ch, rx } = hongoBase(cx, m, Math.round(madre.pulso * 3), madre.brillo);
    const idx = etapaPrev ?? 0;
    // manchas de colores en el sombrero: más grandes y numerosas con cada etapa
    const n = 3 + idx * 2;
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      const px = cx + Math.round((u - 0.5) * (rx * 1.55));
      const arco = Math.sqrt(Math.max(0, 1 - ((u - 0.5) * 1.55) ** 2));
      const py = capBase - 4 - Math.round((ch - 8) * arco * (0.25 + 0.45 * ((k * 7) % 3) / 2));
      disco(px, py, idx >= 2 && k % 2 ? 3 : 2, PALETA[k % PALETA.length]);
    }
  }

  // Conservatorio hongil: hongo con un pentagrama y notas de colores en el sombrero.
  function dibujarConservatorio(x, alfa = 1) {
    const cx = Math.round(x);
    g.globalAlpha = alfa;
    const { capBase, ch, rx } = hongoBase(cx, CONS, 0, consBrillo);
    g.fillStyle = "#4a4a66";
    for (let k = 0; k < 5; k++) {
      const h = 4 + k * 3;
      const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (h / ch) ** 2))) - 3;
      if (w > 2) g.fillRect(cx - w, capBase - h, w * 2, 1);
    }
    const notas = [[-10, 1], [-3, 3], [4, 0], [11, 2]];
    notas.forEach(([dx, linea], k) => disco(cx + dx, capBase - 4 - linea * 3, 1, PALETA[(k + 1) % PALETA.length]));
    g.drawImage(spritesNota[PALETA.length - 1], cx - 2, capBase - ch - 8);
    g.globalAlpha = 1;
  }

  function dibujarHonguito(v) {
    const base = Math.round(groundY - v.hop);
    const pose = v.modo === "walk" ? (Math.floor(v.animT * 11) % 2) : 0;
    const spr = v.tipo === "musico" ? spritesMusico[v.modo === "canta" ? 2 : pose] : spritesHongo[v.col][pose];
    const alto = HH + Math.round(v.estira);
    const x = Math.round(v.x);
    g.globalAlpha = v.alfa;
    g.save();
    if (v.dir < 0) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); }
    g.drawImage(spr, x - 4, base - alto, HW, alto);
    g.restore();
    g.globalAlpha = 1;
    if (v.llevando) {
      const ox = x + (v.dir > 0 ? 1 : -1), oy = base - alto - 3 + Math.round(Math.sin(t * 6 + v.i));
      disco(ox, oy, 2, PALETA[v.col]);
    }
  }

  function dibujarParticulas() {
    for (const p of particulas) {
      const k = p.t / p.dur;
      if (p.tipo === "viaje") {
        const q = puntoViaje(p);
        disco(q.x, q.y, 2, p.col);
      } else if (p.tipo === "nota") {
        g.globalAlpha = k < 0.65 ? 1 : (1 - k) / 0.35;
        g.drawImage(spritesNota[p.col], Math.round(p.x + Math.sin(p.t * 5 + p.fase) * 2), Math.round(p.y));
        g.globalAlpha = 1;
      } else if (p.tipo === "estela") {
        g.globalAlpha = 0.7 * (1 - k);
        g.fillStyle = p.col;
        g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        g.globalAlpha = 1;
      } else if (p.tipo === "mota") {
        g.globalAlpha = 1 - k * k;
        g.fillStyle = p.col;
        g.fillRect(Math.round(p.x), Math.round(p.y), p.r, p.r);
        g.globalAlpha = 1;
      } else if (p.tipo === "aro") {
        g.globalAlpha = 1 - k;
        aro(p.x, p.y, p.r1 * (1 - (1 - k) * (1 - k)), BLANCO);
        g.globalAlpha = 1;
      }
    }
  }

  function draw() {
    g.imageSmoothingEnabled = false;
    g.globalAlpha = 1;
    g.clearRect(0, 0, Wc, Hc);
        g.drawImage(fondo, 0, 0);
    // estrellitas y manchas flotantes (fondo)
    for (const s of estrellas) {
      const a = 0.25 + 0.45 * Math.sin(t * 1.5 + s.ph) ** 2;
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.fillRect(s.x, s.y, 1, 1);
    }
    g.globalAlpha = 0.55;
    for (const f of flotantes) { g.fillStyle = f.col; g.fillRect(Math.round(f.x + Math.sin(t * f.sp + f.ph) * f.ax), Math.round(f.y), f.r, f.r); }
    g.globalAlpha = 1;

    dibujarMadre();
    if (conservatorio) dibujarConservatorio(conservatorio.x);
    for (const v of visuales) dibujarHonguito(v);
    dibujarParticulas();
    if (colocando) dibujarConservatorio(xValida(colocando.x, CONS.w), 0.55);

    if (flash > 0.01) { g.globalAlpha = flash * 0.3; g.fillStyle = BLANCO; g.fillRect(0, 0, Wc, Hc); g.globalAlpha = 1; }
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lo, 0, 0, Wc * S, Hc * S);
  }

  // ---------- toques ----------
  function toque(px, py) {
    const cx = (px * dpr) / S;
    const cy = (py * dpr) / S;
    const m = medidas();
    if (Math.abs(cx - madre.x) < m.w / 2 && cy > groundY - alturaMadre() && cy < groundY + 2) return { quien: "madre" };
    if (conservatorio && Math.abs(cx - conservatorio.x) < CONS.w / 2 && cy > groundY - CONS.ch - CONS.sh - 8 && cy < groundY + 2) return { quien: "conservatorio" };
    for (let i = visuales.length - 1; i >= 0; i--) {
      const v = visuales[i];
      if (Math.abs(cx - v.x) < 8 && cy > groundY - 16 && cy < groundY + 2) {
        if (v.modo === "idle") { v.modo = "salto"; v.animT = 0; }
        return { quien: "honguito", v };
      }
    }
    return null;
  }

  // rectángulo del hongo madre en px CSS (para anclar su ventana de mejoras al costado)
  function rectMadre() {
    const m = medidas(), k = S / dpr;
    return { x0: (madre.x - m.w / 2) * k, x1: (madre.x + m.w / 2) * k, y0: (groundY - alturaMadre()) * k, y1: groundY * k };
  }

  function rectConservatorio() {
    const k = S / dpr;
    return { x0: (conservatorio.x - CONS.w / 2) * k, x1: (conservatorio.x + CONS.w / 2) * k, y0: (groundY - CONS.ch - CONS.sh) * k, y1: groundY * k };
  }

  // ---- colocación: el jugador elige dónde poner un edificio comprado ----
  const aCeldas = (px) => (px * dpr) / S;
  const iniciarColocacion = (id) => { colocando = { id, x: Wc * 0.8 }; };
  const moverColocacion = (px) => { if (colocando) colocando.x = aCeldas(px); };
  const cancelarColocacion = () => { colocando = null; };
  function confirmarColocacion(px) {
    if (!colocando) return null;
    const x = xValida(aCeldas(px), CONS.w);
    colocando = null;
    return x / Wc;
  }

  function pulsoMadre() {
    madre.pulso = 1;
    madre.brillo = 1;
    motas(madre.x, groundY - alturaMadre(), 12);
    aroPart(madre.x, groundY - alturaMadre() * 0.6, 34, 0.5);
  }

  return { resize, update, draw, toque, pulsoMadre, rectMadre, rectConservatorio, iniciarColocacion, moverColocacion, cancelarColocacion, confirmarColocacion };
}
