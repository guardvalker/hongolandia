import { HONGUITOS } from './data.js';
import { PU, TIER_GASTO, costoPU, puRango, tierAbierto, umbralDeTier, comprarPU, nombreTier } from './puData.js';

// Constelación del micelio: las mejoras de prestigio como un mapa de estrellas en pantalla negra. Cada mejora es una estrella con su
// iconito; los tiers son anillos que se destraban al gastar PP; tocar una estrella muestra su descripción y el botón «+» la compra.

// ---- categorías (cada una es un brazo de la constelación) ----
const CATS = [
  { id: "prod", nombre: "Producción", color: "#ffd23f", glifo: "estrella" },
  { id: "linaje", nombre: "Linajes", color: "#b5e61d", glifo: "hongo" },
  { id: "toques", nombre: "Toques", color: "#ff8a3d", glifo: "mano" },
  { id: "logi", nombre: "Logística", color: "#5ef2ff", glifo: "saco" },
  { id: "inicio", nombre: "Arranque", color: "#7bff5a", glifo: "brote" },
  { id: "ahorro", nombre: "Ahorro", color: "#b48cff", glifo: "flecha" },
  { id: "eventos", nombre: "Eventos", color: "#ff6bd6", glifo: "destello" },
  { id: "dungeon", nombre: "Dungeon y mina", color: "#c47a45", glifo: "espada" },
  { id: "defensa", nombre: "Defensa", color: "#ff5a3c", glifo: "escudo" },
  { id: "mercader", nombre: "Mercader y reliquias", color: "#4fb4ff", glifo: "cofre" },
  { id: "tiempo", nombre: "Tiempo y herencia", color: "#e8e8f4", glifo: "reloj" },
];
const CAT_POR_ID = Object.fromEntries(CATS.map((c) => [c.id, c]));
function catDe(p) {
  if (/^(li|et)_(basico|maestro|musico|jardinero|obrero|minero|mago|atleta|trader|astronauta)$/.test(p.id)) return "linaje";
  const k = p.k || "";
  if (k.startsWith("toque_") || k.startsWith("auto_")) return "toques";
  if (k.startsWith("logi_")) return "logi";
  if (k.startsWith("inicio_") && k !== "inicio_arte" || k === "recluta_nivel" || k === "hong_gratis" || k === "hito_bajo") return "inicio";
  if (k.startsWith("costo_")) return "ahorro";
  if (k.startsWith("evt_") || k === "arc_freq" || k === "dorada_val" || k === "cometa_val" || k === "autoevento" || k === "crisis_prod") return "eventos";
  if (k.startsWith("dung_") || k.startsWith("mina_")) return "dungeon";
  if (k.startsWith("inv_") && k !== "inv_vel" || k === "arc_meteoro") return "defensa";
  if (k.startsWith("merc_") || k.startsWith("reliquia") || k === "tesoro_nivel" || k === "inicio_arte") return "mercader";
  if (k === "offline" || k === "vel_all" || k === "pp_chance" || k === "inv_vel") return "tiempo";
  return "prod";
}

// ---- iconitos: bitmaps 8x8 ('#' color, 'o' claro, 'x' oscuro, 'w' crema) ----
const GLIFOS = {
  estrella: ["...##...", "...##...", "########", ".######.", "..####..", ".######.", ".##..##.", ".#....#."],
  hongo: ["..####..", ".#oo###.", "#o####o#", "########", "..wwww..", "...ww...", "...ww...", "..wwww.."],
  mano: ["...##...", "...##...", "...##...", ".#.##.#.", ".######.", ".######.", "..####..", "...##..."],
  saco: ["...##...", "..#oo#..", "...##...", "..####..", ".######.", ".#oo###.", ".######.", "..####.."],
  brote: ["....###.", "...####.", ".#..##..", ".##.#...", "..###...", "...#....", "...#....", "..###..."],
  flecha: ["...##...", "...##...", "...##...", ".######.", "..####..", "...##...", "........", ".######."],
  destello: ["...##...", "...##...", "..####..", "########", "########", "..####..", "...##...", "...##..."],
  espada: [".....##.", "....#oo.", "...#oo..", "#.#oo...", ".##o....", "..##....", ".#.##...", "#...#..."],
  escudo: ["########", "#oo##xx#", "#oo##xx#", "#o####x#", ".######.", "..####..", "...##...", "........"],
  cofre: [".######.", "########", "#oooooo#", "########", "###ww###", "###ww###", "########", "........"],
  reloj: ["########", ".#oooo#.", "..#oo#..", "...##...", "...##...", "..#xx#..", ".#xxxx#.", "########"],
  cristal: ["...oo...", "..o##x..", ".o####x.", ".o####x.", ".o####x.", "..####x.", "...##x..", "....x..."],
  origen: ["...oo...", "..o##o..", ".o####o.", "oo####oo", ".o####o.", "..o##o..", "...oo...", "........"],
};
const mezcla = (hex, con, t) => {
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), b = [1, 3, 5].map((i) => parseInt(con.slice(i, i + 2), 16));
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
const cacheIconos = new Map();
export function iconoDe(glifo, color, bloqueado = false) {
  const clave = glifo + color + bloqueado;
  let u = cacheIconos.get(clave);
  if (u) return u;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 8;
  const x = cv.getContext("2d");
  const col = { "#": bloqueado ? mezcla(color, "#272736", 0.65) : color, o: bloqueado ? "#5a5a6e" : mezcla(color, "#ffffff", 0.6), x: mezcla(color, "#000000", 0.4), w: bloqueado ? "#55556a" : "#f2e3c8" };
  GLIFOS[glifo].forEach((fila, y) => { for (let i = 0; i < 8; i++) { const c = fila[i]; if (c !== ".") { x.fillStyle = col[c]; x.fillRect(i, y, 1, 1); } } });
  u = cv.toDataURL();
  cacheIconos.set(clave, u);
  return u;
}
function iconoPU(p, bloqueado) {
  const cat = CAT_POR_ID[p.cat];
  const m = /^(?:li|et)_(\w+)$/.exec(p.id);
  if (p.cat === "linaje" && m && HONGUITOS[m[1]]) return iconoDe("hongo", HONGUITOS[m[1]].color, bloqueado);
  if (p.k === "pp_chance" || p.k === "pp_prod") return iconoDe("cristal", "#ffd23f", bloqueado);
  return iconoDe(cat.glifo, cat.color, bloqueado);
}

// ---- disposición: cada categoría es un brazo; el radio crece con el tier ----
const RADIO = (tier) => 150 + 125 * ((tier === 0 ? 7 : tier) - 1);
const ORDEN_TIER = (t) => (t === 0 ? 7 : t);
function disponer() {
  const nodos = PU.map((p, i) => ({ p, i, cat: catDe(p) }));
  nodos.forEach((n) => { n.p.cat = n.cat; });
  const peso = CATS.map((c) => Math.pow(nodos.filter((n) => n.cat === c.id).length, 0.75));
  const total = peso.reduce((a, b) => a + b, 0);
  let ang = -Math.PI / 2;
  const sectores = {};
  CATS.forEach((c, k) => { const w = (peso[k] / total) * Math.PI * 2; sectores[c.id] = { a0: ang, w }; ang += w; });
  for (const c of CATS) {
    const mios = nodos.filter((n) => n.cat === c.id);
    const porTier = {};
    for (const n of mios) (porTier[n.p.tier] ||= []).push(n);
    const sec = sectores[c.id];
    for (const t in porTier) {
      const lista = porTier[t];
      lista.forEach((n, j) => {
        const u = (j + 0.5) / lista.length;
        const jit = (((n.i * 7919) % 13) / 13 - 0.5);
        const a = sec.a0 + sec.w * (0.12 + 0.76 * u) + jit * 0.03;
        const r = RADIO(+t) + jit * 26 + (j % 2 ? 14 : -14);
        n.x = Math.cos(a) * r; n.y = Math.sin(a) * r; n.ang = a;
      });
    }
  }
  // conexiones: cada estrella se une con la más cercana de un tier anterior de su categoría (o con el origen)
  for (const n of nodos) {
    const previos = nodos.filter((o) => o.cat === n.cat && ORDEN_TIER(o.p.tier) < ORDEN_TIER(n.p.tier));
    let mejor = null, d0 = Infinity;
    for (const o of previos) { const d = Math.hypot(o.x - n.x, o.y - n.y); if (d < d0) { d0 = d; mejor = o; } }
    n.padre = mejor;
  }
  return { nodos, sectores };
}

export function crearConstelacion(api) {
  const { nodos } = disponer();
  let raiz = null, mundo = null, panel = null, elPP = null, svgLineas = null;
  let sel = null, vista = { x: 0, y: 0, k: 1 };
  const elNodo = new Map(), elLinea = new Map();
  const NS = "http://www.w3.org/2000/svg";
  const S = (t, attrs = {}) => { const e = document.createElementNS(NS, t); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  function aplicarVista() { mundo.style.transform = `translate(${vista.x}px, ${vista.y}px) scale(${vista.k})`; }
  function encuadrar() {
    const W = innerWidth, H = innerHeight;
    vista.k = Math.max(0.3, Math.min(1.1, Math.min(W, H) / 2 / 330));
    vista.x = W / 2; vista.y = H / 2 - 20;
    aplicarVista();
  }
  function zoom(f, cx = innerWidth / 2, cy = innerHeight / 2) {
    const k2 = Math.max(0.25, Math.min(2.2, vista.k * f)), r = k2 / vista.k;
    vista.x = cx - (cx - vista.x) * r; vista.y = cy - (cy - vista.y) * r; vista.k = k2;
    aplicarVista();
  }

  function construir() {
    raiz = document.createElement("div");
    raiz.id = "constelacion";
    raiz.hidden = true;
    raiz.innerHTML = `
      <canvas class="cn-estrellas"></canvas>
      <div class="cn-mundo"></div>
      <div class="cn-cabecera"><div class="cn-titulo">Constelación del micelio<small>Tocá una estrella para ver qué hace</small></div><div class="cn-pp" aria-live="polite"></div><button class="cn-cerrar" aria-label="Cerrar">✕</button></div>
      <div class="cn-zoom"><button data-z="mas" aria-label="Acercar">+</button><button data-z="menos" aria-label="Alejar">−</button><button data-z="fit" aria-label="Ver todo">◎</button></div>
      <div class="cn-panel" hidden></div>`;
    document.body.append(raiz);
    mundo = raiz.querySelector(".cn-mundo");
    panel = raiz.querySelector(".cn-panel");
    panel.addEventListener("click", (e) => e.stopPropagation()); // el panel se rearma al comprar: que ese toque no cuente como «tocar el fondo»
    elPP = raiz.querySelector(".cn-pp");
    // SVG de anillos y líneas (origen del mundo = centro)
    svgLineas = S("svg", { class: "cn-svg", width: 2600, height: 2600, viewBox: "-1300 -1300 2600 2600" });
    for (const t of [1, 2, 3, 4, 5, 6, 0]) {
      const r = RADIO(t);
      svgLineas.append(S("circle", { cx: 0, cy: 0, r, class: "cn-anillo", "data-tier": t }));
      const tx = S("text", { x: 0, y: -r - 8, class: "cn-anillo-txt", "data-tier": t, "text-anchor": "middle" });
      svgLineas.append(tx);
    }
    for (const n of nodos) {
      const a = n.padre ? n.padre : { x: 0, y: 0 };
      const l = S("line", { x1: a.x, y1: a.y, x2: n.x, y2: n.y, class: "cn-linea" });
      svgLineas.append(l); elLinea.set(n.p.id, l);
    }
    mundo.append(svgLineas);
    svgLineas.style.cssText = "position:absolute;left:-1300px;top:-1300px;pointer-events:none;overflow:visible";
    // origen
    const o = document.createElement("div");
    o.className = "cn-origen";
    o.innerHTML = `<img src="${iconoDe("origen", "#ffd23f")}" alt=""><span>Hongo madre</span>`;
    mundo.append(o);
    for (const n of nodos) {
      const b = document.createElement("button");
      b.className = "cn-nodo";
      b.style.left = n.x + "px"; b.style.top = n.y + "px";
      b.setAttribute("aria-label", n.p.nombre);
      b.innerHTML = `<img alt=""><b class="cn-rango"></b><i class="cn-cand">🔒</i>`;
      b.addEventListener("click", (e) => { e.stopPropagation(); if (movido) return; elegir(n); });
      mundo.append(b); elNodo.set(n.p.id, b);
    }
    // nombres de categoría en el borde de cada brazo
    interaccion();
    raiz.querySelector(".cn-cerrar").addEventListener("click", cerrar);
    raiz.querySelector(".cn-zoom").addEventListener("click", (e) => {
      const z = e.target.dataset?.z;
      if (z === "mas") zoom(1.3); else if (z === "menos") zoom(1 / 1.3); else if (z === "fit") encuadrar();
    });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && !raiz.hidden) cerrar(); });
    addEventListener("resize", () => { if (!raiz.hidden) { dibujarEstrellas(); } });
  }

  // arrastrar para mover, rueda y pellizco para acercar
  let movido = false;
  function interaccion() {
    const punteros = new Map();
    let dist0 = 0, k0 = 1, cent0 = null, inicio = null;
    raiz.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".cn-cabecera, .cn-zoom, .cn-panel")) return;
      punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      movido = false;
      inicio = { x: e.clientX, y: e.clientY, vx: vista.x, vy: vista.y };
      if (punteros.size === 2) { const [a, b] = [...punteros.values()]; dist0 = Math.hypot(a.x - b.x, a.y - b.y); k0 = vista.k; cent0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    });
    raiz.addEventListener("pointermove", (e) => {
      if (!punteros.has(e.pointerId)) return;
      punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (punteros.size === 2) {
        const [a, b] = [...punteros.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist0 > 0) { const f = (k0 * d) / dist0 / vista.k; zoom(f, (a.x + b.x) / 2, (a.y + b.y) / 2); }
        movido = true;
      } else if (inicio) {
        const dx = e.clientX - inicio.x, dy = e.clientY - inicio.y;
        if (Math.hypot(dx, dy) > 6) movido = true;
        if (movido) { vista.x = inicio.vx + dx; vista.y = inicio.vy + dy; aplicarVista(); }
      }
    });
    const fin = (e) => { punteros.delete(e.pointerId); if (punteros.size < 2) dist0 = 0; if (!punteros.size) { inicio = null; setTimeout(() => { movido = false; }, 0); } else { const p = [...punteros.values()][0]; inicio = { x: p.x, y: p.y, vx: vista.x, vy: vista.y }; } };
    raiz.addEventListener("pointerup", fin); raiz.addEventListener("pointercancel", fin);
    raiz.addEventListener("wheel", (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); }, { passive: false });
    raiz.addEventListener("click", (e) => { if (!e.target.closest(".cn-nodo, .cn-panel, .cn-cabecera, .cn-zoom") && !movido) { sel = null; panel.hidden = true; refrescar(); } });
  }

  function dibujarEstrellas() {
    const cv = raiz.querySelector(".cn-estrellas");
    cv.width = innerWidth; cv.height = innerHeight;
    const x = cv.getContext("2d");
    let h = 12345;
    const r = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) + 374761393 | 0) >>> 0) / 4294967296;
    for (let i = 0; i < 260; i++) { const a = r() * 0.6 + 0.15; x.fillStyle = `rgba(210,220,255,${a})`; const s = r() < 0.08 ? 2 : 1; x.fillRect(Math.floor(r() * cv.width), Math.floor(r() * cv.height), s, s); }
  }

  const rangoTxt = (p, n) => (p.max === Infinity ? "rango " + n : n + "/" + p.max);
  function refrescar() {
    const s = api.estado();
    elPP.innerHTML = `<b>${s.pp}</b> PP <small>gastados: ${s.ppGastados || 0}</small>`;
    for (const t of [1, 2, 3, 4, 5, 6, 0]) {
      const abierto = tierAbierto(s, t);
      const txt = svgLineas.querySelector(`.cn-anillo-txt[data-tier="${t}"]`), ring = svgLineas.querySelector(`.cn-anillo[data-tier="${t}"]`);
      ring.classList.toggle("cerrado", !abierto);
      txt.textContent = (t === 0 ? "ETERNAS" : "TIER " + t) + (abierto ? "" : ` · 🔒 ${umbralDeTier(t)} PP gastados`);
      txt.classList.toggle("cerrado", !abierto);
    }
    for (const n of nodos) {
      const p = n.p, b = elNodo.get(p.id), rg = puRango(s, p.id), abierto = tierAbierto(s, p.tier), max = rg >= p.max;
      const puede = abierto && !max && s.pp >= costoPU(p, rg);
      b.className = "cn-nodo" + (abierto ? "" : " cerrado") + (rg > 0 ? " activo" : "") + (max ? " completo" : "") + (puede ? " puede" : "") + (sel === n ? " sel" : "");
      b.style.setProperty("--c", CAT_POR_ID[p.cat].color);
      b.querySelector("img").src = iconoPU(p, !abierto);
      b.querySelector(".cn-rango").textContent = rg > 0 ? (max ? "✓" : rg) : "";
      b.querySelector(".cn-cand").hidden = abierto;
      const l = elLinea.get(p.id);
      l.classList.toggle("on", rg > 0); l.classList.toggle("cerrado", !abierto);
    }
    if (sel) pintarPanel();
  }

  function pintarPanel() {
    const s = api.estado(), p = sel.p, rg = puRango(s, p.id), abierto = tierAbierto(s, p.tier), max = rg >= p.max, c = costoPU(p, rg);
    const cat = CAT_POR_ID[p.cat];
    panel.hidden = false;
    panel.style.setProperty("--c", cat.color);
    const falta = !abierto ? `Se destraba al gastar ${umbralDeTier(p.tier)} PP en total (te faltan ${Math.max(0, umbralDeTier(p.tier) - (s.ppGastados || 0))}).` : max ? "Rango máximo alcanzado." : s.pp < c ? `Te faltan ${c - s.pp} PP.` : "";
    panel.innerHTML = `
      <img class="cn-p-ico" src="${iconoPU(p, !abierto)}" alt="">
      <div class="cn-p-info">
        <b>${p.nombre}</b>
        <small>${cat.nombre} · ${nombreTier(p.tier)} · ${rangoTxt(p, rg)}</small>
        ${rg > 0 ? `<p class="ahora">Ahora: ${p.desc(rg)}</p>` : ""}
        ${max ? "" : `<p class="sig">${rg > 0 ? "Siguiente" : "Efecto"}: ${p.desc(rg + 1)}</p>`}
        ${falta ? `<p class="falta">${falta}</p>` : ""}
      </div>
      <button class="cn-comprar" ${(!abierto || max || s.pp < c) ? "disabled" : ""} aria-label="Comprar">+<small>${max ? "" : c + " PP"}</small></button>`;
    panel.querySelector(".cn-comprar").addEventListener("click", () => {
      if (comprarPU(api.estado(), p.id)) { api.guardar(); refrescar(); const b = elNodo.get(p.id); b.classList.remove("flash"); void b.offsetWidth; b.classList.add("flash"); }
    });
  }
  function elegir(n) { sel = n; refrescar(); }

  function abrir() {
    if (!raiz) construir();
    raiz.hidden = false;
    document.body.classList.add("cn-abierta");
    dibujarEstrellas(); encuadrar(); sel = null; panel.hidden = true; refrescar();
    // si hay PP para gastar, se enfoca la primera estrella comprable más cercana al centro
  }
  function cerrar() { if (raiz) { raiz.hidden = true; document.body.classList.remove("cn-abierta"); } }
  return { abrir, cerrar, abierta: () => !!raiz && !raiz.hidden, refrescar: () => { if (raiz && !raiz.hidden) refrescar(); } };
}
