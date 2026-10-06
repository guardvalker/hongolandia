import { D } from './decimal.js';
import { iconoObjeto } from './dungeonVista.js';
import { getEvento, DEF_MEJ, nivelDef, costoDef, comprarDef, ofertasMercader, precioArtefacto, comprarArtefacto, probInterceptar, MAGOS_MIN } from './eventos.js';
import { TIPOS_TORRE, EVOLUCIONES, ENEMIGOS, TORRES_MAX, SOLD_MAX, costoTorre, costoEvolucion, evolucionarTorre, sumarSoldados, statsTorre, dpsTorre, infoDefensa, quedan } from './invasion.js';
import { ARTEFACTOS, ARTE_POR_ID, TIERS, iconoArtefacto, cantArte } from './artefactos.js';
import { OBJETOS, escalaJefes, CLASES, TABERNA_MEJ, costoMerc, contratar, comprarTab, nivelTab, costoTab, sanos, iniciar as iniciarExploracion, getRun, PARTY_MAX, mercStats, CRISTAL_MULT } from './dungeon.js';
import { EVENTOS, HONGUITOS, MEJORAS, EDIFICIOS, TECNOLOGIAS, MEJ_EDIF, MEJ_CLICK, MEJ_LOGI, TEC_POR_ID, HITOS, NIVELES_TEC } from './data.js';
import { PU, TIERS_PU, nombreTier, umbralDeTier, costoPU, puRango, tierAbierto, comprarPU } from './puData.js';
import { ppAlPrestigiar } from './reinicio.js';
import { fmt, fmtRate } from './format.js';
import { factorAcido, factorMeteoro, produccionPorSeg, produccionPorTipo, prestigio, costoHonguito, costoHonguitos, maxHonguitos, comprarHonguitos, venderHonguitos, reembolsoHonguitos, vendibles, comprarMejora, tecDisponible, pctTec, invPorSeg, proximoHito, costoEdificio, elegirInvestigacion, comprarMejoraEdificio, activarHabilidad, buffActivo, nivelMej, costoMej, valorToque, autoPorSeg, autoFraccion, comprarMejoraClick, logiInfo, costoLogi, comprarMejoraLogi, durBuff, cdHabilidad, alternarSobrecarga, trabajoEf } from './engine.js';
import { exportar, importar, borrarGuardado } from './state.js';
import { CHANGELOG } from './changelog.js';

// Preferencias de interfaz (no forman parte de la partida): guardadas aparte.
const KEY_AJ = "hongolandia-ajustes";
const AJ_BASE = { transparencia: false, dpsPlegado: false, visibles: 20, cantidad: 1, fps: 60, render: "2d" };
export const ajustes = (() => {
  try { return { ...AJ_BASE, ...JSON.parse(localStorage.getItem(KEY_AJ) || "{}") }; } catch (_) { return { ...AJ_BASE }; }
})();
const guardarAjustes = () => { try { localStorage.setItem(KEY_AJ, JSON.stringify(ajustes)); } catch (_) {} };
const aplicarAjustes = () => document.body.classList.toggle("transp", !!ajustes.transparencia);
aplicarAjustes();

const $ = (id) => document.getElementById(id);

// `api`: { estado(), reemplazar(nuevo), guardar(), sonido... } — main.js lo provee.
export function crearUI(api) {
  const hoja = $("hoja");
  const hojaTitulo = $("hoja-titulo");
  const hojaCuerpo = $("hoja-cuerpo");
  let abierta = null; // "madre" | "ajustes" | null
  let filas = [];
  let anclaFn = null; // () => rect del edificio tocado, o null (ventana abajo, ancho completo)

  function cerrar() {
    abierta = null;
    hoja.classList.remove("abierta");
  }

  // Todas las ventanas (hongo madre, edificios, dungeon) se abren centradas, del mismo tamaño y
  // con el mismo layout compacto (Ajustes incluido).
  function colocar() {
    hoja.style.cssText = "";
    hoja.style.setProperty("--ac", acentoActual);
    hoja.classList.remove("anclada");
    const vw = window.innerWidth, vh = window.innerHeight, margen = 10;
    const w = Math.min(300, vw - 2 * margen);
    hoja.classList.add("anclada");
    hoja.style.right = "auto";
    hoja.style.width = w + "px";
    hoja.style.height = "auto";
    hoja.style.left = Math.round((vw - w) / 2) + "px";
    hoja.style.top = "50%";
    hoja.style.bottom = "auto";
    hoja.style.transform = "translateY(-50%)";
    hoja.style.maxHeight = Math.max(160, vh - 90) + "px";
  }

  const desplegadas = new Set();
  let entrar = false, flashIdx = -1, acentoActual = "#b5e61d";
  function abrir(cual, titulo, render, ancla = null, acento = "#b5e61d") {
    // los elementos de la lista aparecen con una animación, salvo al rearmarla tras una compra
    entrar = !(hoja.classList.contains("abierta") && hojaTitulo.textContent === titulo);
    if (entrar) desplegadas.clear();
    acentoActual = acento;
    hoja.style.setProperty("--ac", acento);
    abierta = cual;
    anclaFn = ancla;
    $("hoja-mover").hidden = true;
    colocar();
    hojaTitulo.textContent = titulo;
    hojaCuerpo.replaceChildren();
    filas = [];
    render();
    hoja.classList.add("abierta");
    actualizar(true);
  }

  function fila(titulo, desc, onBuy, acento) {
    const el = document.createElement("div");
    el.className = "fila";
    if (acento) el.style.setProperty("--a", acento);
    const idx = hojaCuerpo.children.length;
    if (entrar) { el.classList.add("entra"); el.style.setProperty("--i", Math.min(idx, 12)); }
    else if (idx === flashIdx) { el.classList.add("flash"); flashIdx = -1; }
    const info = document.createElement("div");
    info.className = "fila-info";
    const t = document.createElement("b");
    t.textContent = titulo;
    const d = document.createElement("span");
    d.textContent = desc;
    info.append(t, d);
    // la descripción se ve al tocar el título (queda abierta aunque se rearme la lista)
    el.classList.add("plegable");
    const clave = hojaTitulo.textContent + "#" + idx;
    if (desplegadas.has(clave)) el.classList.add("desplegada");
    t.addEventListener("click", () => { const abre = el.classList.toggle("desplegada"); if (abre) desplegadas.add(clave); else desplegadas.delete(clave); });
    const btn = document.createElement("button");
    btn.className = "comprar";
    btn.addEventListener("click", (e) => {
      // animación de compra en la fila (si la lista se rearma, la hereda la fila que quedó en su lugar)
      flashIdx = idx;
      el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
      onBuy(e);
    });
    el.append(info, btn);
    hojaCuerpo.append(el);
    return { el, titulo: t, btn };
  }

  function seccion(texto) {
    const h = document.createElement("h3");
    h.textContent = texto;
    hojaCuerpo.append(h);
  }

  let modoVender = false; // «+/−»: con el modo en «−» los botones de los honguitos venden en vez de comprar
  function filasHonguitos(casa) {
    if (entrar) modoVender = false;
    seccion("Honguitos");
    const sel = document.createElement("div");
    sel.className = "cant";
    const OPC = [1, 10, 100, "max"];
    const botonesCant = OPC.map((k) => {
      const b = document.createElement("button");
      b.className = "cant-btn";
      b.textContent = k === "max" ? "Máx" : "×" + k;
      b.addEventListener("click", () => {
        ajustes.cantidad = k;
        guardarAjustes();
        botonesCant.forEach((x, i) => x.classList.toggle("activo", OPC[i] === k));
        actualizar(true);
      });
      b.classList.toggle("activo", (ajustes.cantidad || 1) === k);
      sel.append(b);
      return b;
    });
    const bVender = document.createElement("button");
    bVender.className = "cant-btn vender" + (modoVender ? " activo" : "");
    bVender.textContent = "+/−";
    bVender.title = "Vender: devuelve lo que costaron";
    bVender.addEventListener("click", () => { modoVender = !modoVender; bVender.classList.toggle("activo", modoVender); actualizar(true); });
    sel.append(bVender);
    hojaCuerpo.append(sel);
    for (const id in HONGUITOS) {
      const tipo = HONGUITOS[id];
      if (tipo.casa !== casa) continue;
      const f = fila(tipo.nombre, tipo.desc, () => {
        const cant = ajustes.cantidad || 1;
        if (modoVender ? venderHonguitos(api.estado(), id, cant) : comprarHonguitos(api.estado(), id, cant)) api.guardar();
        actualizar(true);
      }, tipo.color);
      filas.push({ tipo: "honguito", id, ...f });
    }
  }

  // ---- Textos de las mejoras ----
  const num = (x) => String(+x.toFixed(2)).replace(".", ",");
  const plural = (id) => HONGUITOS[id].nombre.toLowerCase() + "s";
  const objetivoTxt = (o) => (o === "todos" ? "todos los honguitos" : o === "investigacion" ? "la velocidad de investigación" : "la producción de " + plural(o));
  const pct = (x) => num(x * 100);
  // descripción del efecto de la mejora; n = nivel actual (el siguiente que se compra es n + 1)
  function descMej(m, n) {
    const p = plural(m.aplica || m.tipo), prod = m.aplica === "cientifico" ? "investigación" : "producción";
    const ahora = n > 0 && m.max > 1;
    switch (m.ef) {
      case "prod": return `+${pct(m.a)}% de ${prod} de los ${p} por nivel${ahora ? ` (ahora +${pct(m.a * n)}%)` : ""}.`;
      case "vel": return `+${pct(m.a)}% de velocidad de los ${p} por nivel (animaciones y ciclos más cortos) y un poco más de producción${ahora ? ` (ahora +${pct(m.a * n)}%)` : ""}.`;
      case "crit": return `Cada segundo, ${num((m.p0 + m.p1 * n) * 100)}% de chance de golpe crítico: ${m.seg} s de ${prod} de los ${p} de golpe. Cada nivel sube la chance.`;
      case "buff": return `Habilidad: ×${m.mult} a los ${p} durante ${durBuff(m, n + 1)} s (recarga ${Math.round(cdHabilidad(m, n + 1))} s). Cada nivel dura más y recarga antes.`;
      case "sinergia": return `Cada ${m.cada} ${plural(m.fuente)}: +${num(m.bono * 100)}% a ${objetivoTxt(m.objetivo)}.`;
      case "descuento": return `El precio de los ${p} sube un ${pct(m.a)}% menos con cada compra, por nivel.`;
      case "autoevento": return `+${pct(m.a)}% de chance por nivel de que los eventos del cielo se recojan solos.`;
      case "sobrecarga": return "Interruptor: los obreros producen ×2,5 pero se genera ×2,5 de contaminación (los magos ayudan a limpiarla).";
      case "acido": return `La lluvia ácida quita un ${pct(m.a)}% menos de producción, por nivel.`;
      case "paraguas": return `El castigo de la lluvia ácida dura un ${pct(m.a)}% menos, por nivel.`;
      case "purga": return `Los magos purifican las nubes un ${pct(m.a)}% más rápido, por nivel.`;
      case "eventos": return `Los eventos del cielo aparecen un ${pct(m.a)}% más seguido y duran ${num(m.d)} s más, por nivel.`;
      case "hechizo": return `Habilidad: invoca un evento en el cielo ya mismo (recarga ${Math.round(cdHabilidad(m, n + 1))} s; cada nivel la acorta).`;
      case "apuesta": return "Habilidad: arriesgás el 10% de tus esporas: 55% de ganar un 120% extra de lo arriesgado, 45% de perderlo (recarga 3 min).";
      case "luna": return `+${num(m.a * 100)}% de producción total por cada base lunar, por nivel.`;
      case "offline": return `+${num(m.a / 60)} min de producción cuando no estás jugando, por nivel (sube el tope de 60 min).`;
      case "descInv": return `Investigar cuesta un ${pct(m.a)}% menos, por nivel.`;
    }
    return "";
  }
  function descTec(s, t) {
    if (t.carrera) return `Carrera: desbloquea la compra de ${EDIFICIOS[t.abre].nombre}.`;
    const que = t.target === "todos" ? "de producción de todos los honguitos" : t.target === "cientifico" ? "de velocidad de investigación" : "de producción de " + plural(t.target);
    return `+${num(pctTec(s, t))}% ${que}.`;
  }
  const tiempo = (seg) => (!isFinite(seg) ? "sin científicos" : seg < 90 ? Math.ceil(seg) + " s" : seg < 5400 ? Math.round(seg / 60) + " min" : (seg / 3600).toFixed(1).replace(".", ",") + " h");
  const nota = (texto) => { const p = document.createElement("p"); p.className = "nota"; p.textContent = texto; hojaCuerpo.append(p); return p; };

  // ---- Hitos de cantidad (info) ----
  function notasHitos(casa) {
    for (const id in HONGUITOS) {
      if (HONGUITOS[id].casa !== casa) continue;
      const n = api.estado().honguitos[id] || 0;
      const sig = proximoHito(n, api.estado());
      const nt = nota(sig ? `Hito: al llegar a ${sig} ${plural(id)} producen ×2 (tenés ${n}).` : `Todos los hitos de ${plural(id)} alcanzados.`);
      if (!sig) nt.classList.add("hecha");
    }
  }

  // ---- Mejoras de edificio (por niveles), habilidades activas e interruptores ----
  const ACTIVAS = ["buff", "hechizo", "apuesta"];
  function filasMejorasEdificio(id, reabrir) {
    const s = api.estado();
    const mias = MEJ_EDIF.filter((m) => m.edificio === id);
    const pendientes = mias.filter((m) => nivelMej(s, m.id) < m.max);
    const activas = mias.filter((m) => ACTIVAS.includes(m.ef) && nivelMej(s, m.id) > 0);
    const completas = mias.filter((m) => nivelMej(s, m.id) >= m.max);
    if (pendientes.length) {
      seccion("Mejoras");
      for (const m of pendientes) {
        const n = nivelMej(s, m.id);
        const titulo = m.max > 1 ? `${m.nombre} · nivel ${n}/${m.max}` : m.nombre;
        const f = fila(titulo, descMej(m, n) + ` Requiere ${m.req} ${plural(m.tipo)}` + (m.reqOtro ? ` y ${m.reqOtro.n} ${plural(m.reqOtro.tipo)}.` : "."), () => {
          if (comprarMejoraEdificio(api.estado(), m.id)) { api.guardar(); reabrir(); }
        }, EDIFICIOS[id].color);
        if (m.max > 1) { // un cuadradito por nivel: los comprados se pintan del color del edificio
          const pips = document.createElement("div");
          pips.className = "pips";
          for (let k = 0; k < Math.min(m.max, 12); k++) { const q = document.createElement("i"); if (k < n) q.className = k === n - 1 && f.el.classList.contains("flash") ? "on nuevo" : "on"; pips.append(q); }
          f.el.querySelector(".fila-info").append(pips);
        }
        f.refresh = (st) => {
          const faltaOtro = m.reqOtro && (st.honguitos[m.reqOtro.tipo] || 0) < m.reqOtro.n;
          const faltan = (st.honguitos[m.tipo] || 0) < m.req || faltaOtro;
          const c = costoMej(st, m);
          f.btn.textContent = faltaOtro ? `${st.honguitos[m.reqOtro.tipo] || 0}/${m.reqOtro.n} ${plural(m.reqOtro.tipo)}` : faltan ? `${st.honguitos[m.tipo] || 0}/${m.req}` : fmt(c);
          f.btn.disabled = faltan || st.esporas.lt(c);
        };
        filas.push(f);
      }
    }
    // interruptor de la sobrecarga de la fábrica
    if (mias.some((m) => m.ef === "sobrecarga" && nivelMej(s, m.id) > 0)) {
      seccion("Interruptores");
      const f = fila("Sobrecarga de máquinas", "Obreros ×2,5 de producción y ×2,5 de contaminación.", () => { alternarSobrecarga(api.estado()); api.guardar(); actualizar(true); }, EDIFICIOS[id].color);
      f.refresh = (st) => { f.btn.textContent = st.flags.sobrecarga ? "Encendida" : "Apagada"; f.btn.classList.toggle("activa", !!st.flags.sobrecarga); };
      filas.push(f);
    }
    if (activas.length) {
      seccion("Habilidades");
      for (const m of activas) {
        const n = nivelMej(s, m.id);
        const f = fila(m.nombre + (m.max > 1 ? ` · nivel ${n}` : ""), descMej(m, n - 1), () => {
          const msg = activarHabilidad(api.estado(), m.id);
          if (msg) { api.guardar(); api.toast?.(msg); actualizar(true); }
        }, EDIFICIOS[id].color);
        f.refresh = (st) => {
          const ahora = Date.now(), h = st.habil[m.id];
          if (h && ahora < h.hasta) { f.btn.textContent = Math.ceil((h.hasta - ahora) / 1000) + " s"; f.btn.disabled = true; f.btn.classList.add("activa"); }
          else if (h && ahora < h.listoEn) { const r = Math.ceil((h.listoEn - ahora) / 1000); f.btn.textContent = Math.floor(r / 60) + ":" + String(r % 60).padStart(2, "0"); f.btn.disabled = true; f.btn.classList.remove("activa"); }
          else { f.btn.textContent = m.ef === "buff" ? "Activar" : "Usar"; f.btn.disabled = false; f.btn.classList.remove("activa"); }
        };
        filas.push(f);
      }
    }
    const hechas = completas.filter((m) => !ACTIVAS.includes(m.ef) && m.ef !== "sobrecarga");
    if (hechas.length) {
      seccion("Mejoras completas");
      for (const m of hechas) nota("✓ " + m.nombre + (m.max > 1 ? ` (nivel ${m.max})` : "") + " — " + descMej(m, m.max)).classList.add("hecha");
    }
  }

  // ---- Universidad: investigación con científicos ----
  function seccionInvestigacion(reabrir) {
    const s = api.estado();
    seccion("Investigación");
    const estado = document.createElement("div");
    estado.className = "fila inv-estado";
    const info = document.createElement("div");
    info.className = "fila-info";
    const tit = document.createElement("b");
    const det = document.createElement("span");
    const barra = document.createElement("div");
    barra.className = "barra";
    const relleno = document.createElement("i");
    barra.append(relleno);
    info.append(tit, det, barra);
    estado.append(info);
    hojaCuerpo.append(estado);
    const n0 = Object.keys(s.mejoras).length;
    filas.push({ refresh: (st) => {
      if (Object.keys(st.mejoras).length !== n0) { reabrir(); return; } // terminó una: se arma la lista de nuevo
      const v = invPorSeg(st), act0 = st.invest.actual ? TEC_POR_ID[st.invest.actual] : null, act = act0 && { ...act0, trabajo: trabajoEf(st, act0) };
      if (!act) { tit.textContent = "Sin investigación en curso"; det.textContent = `Elegí una abajo. Investigación: ${fmt(v)} pts/s.`; relleno.style.width = "0%"; return; }
      const p = st.invest.prog[act.id] || 0;
      tit.textContent = act.nombre;
      det.textContent = `${fmt(p)} / ${fmt(act.trabajo)} pts · ${fmt(v)} pts/s · faltan ${tiempo((act.trabajo - p) / v)}`;
      relleno.style.width = Math.min(100, (p / act.trabajo) * 100) + "%";
    } });
    // el siguiente nivel disponible de cada tema
    const disponibles = TECNOLOGIAS.filter((t) => tecDisponible(s, t));
    if (!disponibles.length) nota("No hay nada para investigar por ahora: construí más edificios para abrir tecnologías de su tema.");
    for (const t of disponibles) {
      const tema = t.target === "todos" ? "General" : EDIFICIOS[t.edificio].nombre;
      const f = fila(t.carrera ? t.nombre : `${t.nombre} · nivel ${t.nivel}`, `${tema}: ${descTec(s, t)} (${fmt(trabajoEf(s, t))} pts)`, () => { if (elegirInvestigacion(api.estado(), t.id)) { api.guardar(); actualizar(true); } }, EDIFICIOS[t.edificio]?.color);
      f.refresh = (st) => {
        const en = st.invest.actual === t.id, p = st.invest.prog[t.id] || 0;
        f.btn.textContent = en ? "En curso" : p > 0 ? Math.round((p / trabajoEf(st, t)) * 100) + "%" : "Investigar";
        f.btn.disabled = en;
      };
      filas.push(f);
    }
    // resumen de lo ya investigado, por tema
    const resumen = [];
    for (const target of new Set(TECNOLOGIAS.map((t) => t.target))) {
      if (target === "carrera") continue;
      const hechas = TECNOLOGIAS.filter((t) => t.target === target && s.mejoras[t.id]);
      if (hechas.length) resumen.push(`${target === "todos" ? "General" : HONGUITOS[target].nombre}: nivel ${hechas.length}/${NIVELES_TEC} (+${num(hechas.reduce((a, t) => a + pctTec(s, t), 0))}%)`);
    }
    for (const t of TECNOLOGIAS) if (t.carrera && s.mejoras[t.id]) resumen.push(`${t.nombre} (abre ${EDIFICIOS[t.abre].nombre})`);
    if (resumen.length) { seccion("Investigado"); for (const r of resumen) nota("✓ " + r).classList.add("hecha"); }
  }

  // ---- Edificio: honguitos propios, mejoras, habilidades, investigación ----
  function abrirCasa(id, ancla) {
    if (id === "taberna") { abrirTaberna(ancla); return; }
    if (id === "barraca") { abrirDefensa(id, ancla); return; }
    const reabrir = () => abrirCasa(id, ancla);
    abrir("casa", EDIFICIOS[id].nombre, () => {
      const mv = $("hoja-mover");
      mv.hidden = false;
      mv.onclick = () => { cerrar(); api.mover(id); };
      filasHonguitos(id);
      notasHitos(id);
      if (id === "universidad") seccionInvestigacion(reabrir);
      filasMejorasEdificio(id, reabrir);
      const tecs = TECNOLOGIAS.filter((t) => t.edificio === id && t.target !== "todos" && !t.carrera && api.estado().mejoras[t.id]);
      if (tecs.length && id !== "universidad") {
        seccion("Tecnologías");
        nota(`Investigación de la Universidad: nivel ${tecs.length}/${NIVELES_TEC} (+${num(tecs.reduce((a, t) => a + pctTec(api.estado(), t), 0))}% de producción).`).classList.add("hecha");
      }
    }, ancla, EDIFICIOS[id].color);
  }

  // ---- Taberna hongil: mercenarios, exploración de la dungeon y mejoras ----
  function abrirTaberna(ancla) {
    const reabrir = () => abrirTaberna(ancla);
    const ed = EDIFICIOS.taberna;
    abrir("casa", ed.nombre, () => {
      const mv = $("hoja-mover");
      mv.hidden = false;
      mv.onclick = () => { cerrar(); api.mover("taberna"); };
      seccion("Exploración");
      const estado = nota("");
      filas.push({ refresh: (st) => {
        const run = getRun(), listos = sanos(st).length, n = Math.min(PARTY_MAX, listos);
        const cr = st.dungeon.cristales;
        estado.textContent = (run ? (run.fase === "fin" ? "Terminando la exploración…" : `Explorando: etapa ${Math.min(run.etapa + 1, 5)}/5 con ${run.n} ${run.n === 1 ? "honguito" : "honguitos"}.`)
          : listos ? `Party listo: ${n}/${PARTY_MAX}.` + (n < PARTY_MAX ? " Con el party lleno hay muchas más chances de una mejor recompensa." : "") : "No hay mercenarios sanos para salir.")
          + ` Cristales radiantes: ${cr}` + (cr ? ` (producción ×${(Math.pow(CRISTAL_MULT, cr)).toFixed(2).replace(".", ",")})` : "") + ` · exploraciones: ${st.dungeon.expediciones}.`;
      } });
      const caja = document.createElement("div");
      caja.className = "botones";
      const bExp = document.createElement("button");
      bExp.className = "btn";
      bExp.textContent = "Explorar ahora";
      bExp.addEventListener("click", () => { if (iniciarExploracion(api.estado())) { actualizar(true); } });
      const lbl = document.createElement("label");
      lbl.className = "auto-chk";
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = api.estado().dungeon.auto !== false;
      chk.addEventListener("change", () => { api.estado().dungeon.auto = chk.checked; api.guardar(); });
      lbl.append(chk, " Explorar automáticamente");
      caja.append(bExp, lbl);
      hojaCuerpo.append(caja);
      filas.push({ refresh: (st) => { bExp.disabled = !!getRun() || !sanos(st).length; } });

      seccion("Mercenarios");
      nota("Cada clase se contrata una sola vez. Salen los " + PARTY_MAX + " sanos de más nivel. Si caen quedan heridos y se curan después de unas exploraciones.");
      for (const c of CLASES) {
        const f = fila(`${c.nombre} · ${c.rol}`, c.desc, () => { if (contratar(api.estado(), c.id)) { api.guardar(); reabrir(); } }, c.color);
        const desc = f.el.querySelector(".fila-info span");
        const pc = (v, base) => (v > base * 1.0005 ? ` (base ${Math.round(base)}, +${Math.round((v / base - 1) * 100)}%)` : "");
        f.refresh = (st) => {
          const m = st.dungeon.merc[c.id], niv = m ? m.nivel : 1, e = mercStats(c.id, niv);
          const lineas = [c.desc,
            `Vida ${Math.round(e.hp)}${pc(e.hp, c.hp)} · Ataque ${e.atk.toFixed(1).replace(".", ",")}${pc(e.atk, c.atk)}`,
            `Defensa ${c.def} · ${(1 / c.int).toFixed(1).replace(".", ",")} ataques/s · ${c.rango < 20 ? "cuerpo a cuerpo" : "a distancia"}`];
          if (m) {
            lineas.push(niv > 1 ? `Nivel ${niv}: mejoró ${niv - 1} ${niv === 2 ? "nivel" : "niveles"} en ${m.exp || 0} ${m.exp === 1 ? "exploración" : "exploraciones"} (+4% de vida y ataque por nivel).` : "Nivel 1: sube de nivel con cada exploración (+4% de vida y ataque).");
            if (m.herido) lineas.push(`Herido: se cura tras ${m.herido} ${m.herido === 1 ? "exploración" : "exploraciones"} más.`);
            f.titulo.textContent = `${c.nombre} · Nv ${niv}`;
            f.btn.textContent = m.herido ? `Herido ×${m.herido}` : `Nv ${niv}`;
            f.btn.disabled = true;
            f.btn.classList.toggle("activa", !m.herido);
            f.el.classList.remove("caro"); f.el.classList.toggle("puede", !m.herido);
            f.sinMarca = true;
          } else {
            lineas.push("Sube de nivel con cada exploración (+4% de vida y ataque).");
            const cs = costoMerc(st);
            f.btn.textContent = fmt(cs);
            f.btn.disabled = st.esporas.lt(cs);
          }
          desc.textContent = lineas.join("\n");
        };
        filas.push(f);
      }

      seccion("Mejoras de la taberna");
      for (const m of TABERNA_MEJ) {
        const n = nivelTab(api.estado(), m.id);
        if (n >= m.max) { nota("✓ " + m.nombre + ` (nivel ${m.max}) — ` + m.desc(m.max)).classList.add("hecha"); continue; }
        const f = fila(`${m.nombre} · nivel ${n}/${m.max}`, m.desc(n), () => { if (comprarTab(api.estado(), m.id)) { api.guardar(); reabrir(); } }, ed.color);
        const pips = document.createElement("div");
        pips.className = "pips";
        for (let k = 0; k < m.max; k++) { const q = document.createElement("i"); if (k < n) q.className = k === n - 1 && f.el.classList.contains("flash") ? "on nuevo" : "on"; pips.append(q); }
        f.el.querySelector(".fila-info").append(pips);
        f.refresh = (st) => { const c = costoTab(st, m); f.btn.textContent = fmt(c); f.btn.disabled = st.esporas.lt(c); };
        filas.push(f);
      }
    }, ancla, ed.color);
  }

  // ---- Prestigio: reiniciar la corrida a cambio de PP y mejoras permanentes ----
  function abrirPrestigio() {
    let seguro = false;
    abrir("prestigio", "Prestigio", () => {
      const st = api.estado();
      const info = nota("");
      filas.push({ refresh: (s) => {
        info.textContent = `PP sin gastar: ${s.pp} · gastados: ${s.ppGastados} · ganados en total: ${s.ppTotal} · prestigios: ${s.prestigios}`;
      } });
      nota("Prestigiar reinicia la corrida (esporas, honguitos, edificios y mejoras) y te da 1 PP por cada nivel de prestigio alcanzado. Se conservan las mejoras de prestigio, la dungeon y el fondo. Los tiers se destraban al gastar PP (12, 45, 120, 180 y 250).");
      const f = fila("Prestigiar ahora", "", () => {
        if (!seguro) { seguro = true; return; }
        api.prestigiar();
        cerrar();
        toast("¡Nueva corrida! Gastá tus PP en las mejoras de prestigio.");
      }, "#ffd23f");
      f.refresh = (s) => {
        const g = ppAlPrestigiar(s);
        f.titulo.textContent = g > 0 ? `Prestigiar: +${g} PP` : "Prestigiar (todavía sin PP)";
        f.btn.textContent = seguro ? "¿Seguro?" : "Prestigiar";
        f.btn.disabled = g < 1;
        f.btn.classList.toggle("peligro", seguro);
      };
      filas.push(f);
      for (const tier of TIERS_PU) {
        const abierto = tierAbierto(st, tier);
        const lista = PU.filter((x) => x.tier === tier);
        const costo = tier === 0 ? "2+" : tier;
        seccion(`${nombreTier(tier)} · ${costo} PP por rango${tier === 0 ? " (+1 cada 20 rangos)" : ""}` + (abierto ? "" : ` · se destraba al gastar ${umbralDeTier(tier)} PP (te faltan ${Math.max(0, umbralDeTier(tier) - st.ppGastados)})`));
        if (!abierto) { nota("Contiene: " + lista.map((x) => x.nombre).join(", ") + "."); continue; }
        for (const p of lista) {
          const n = puRango(st, p.id);
          const sinTope = p.max === Infinity;
          if (!sinTope && n >= p.max) { nota(`✓ ${p.nombre} (${p.max}/${p.max}) — ${p.desc(p.max)}`).classList.add("hecha"); continue; }
          const g = fila(`${p.nombre} · ${sinTope ? "rango " + n : n + "/" + p.max}`, p.desc(n + 1), () => { if (comprarPU(api.estado(), p.id)) { api.guardar(); abrirPrestigio(); } }, "#ffd23f");
          g.refresh = (s) => { const c = costoPU(p, puRango(s, p.id)); g.btn.textContent = c + " PP"; g.btn.disabled = s.pp < c; };
          filas.push(g);
        }
      }
    }, null, "#ffd23f");
  }

  // ---- Logística de esporas: los básicos juntan las esporas sueltas y las llevan al hongo madre ----
  function seccionLogistica(ancla) {
    const s = api.estado();
    seccion("Logística de esporas");
    const info = nota("");
    filas.push({ refresh: (st) => {
      const L = logiInfo(st);
      const vale = L.em > 0 ? produccionPorSeg(st).div(L.em) : null; // lo que vale en promedio cada grano suelto
      info.textContent = `Los honguitos básicos (${L.n}) juntan los granos de espora que sueltan los demás y tus toques, y los llevan en manojos de ${fmtN(L.carga)} granos (viaje de ${L.viaje.toFixed(1).replace(".", ",")} s): pueden llevar ${fmtN(L.cap)} granos/s y se sueltan ${fmtN(L.em)} granos/s` + (vale ? ` (cada grano vale hoy ~${fmt(vale)} esporas, por eso la producción es tan grande)` : "") + ". " + (L.razon < 1 ? `Hoy llega el ${Math.round(L.razon * 100)}% de lo que se produce: ¡faltan manos!` : "Alcanza para todo lo que se produce.");
    } });
    for (const m of MEJ_LOGI) {
      const n = nivelMej(s, m.id);
      if (n >= m.max) { nota("✓ " + m.nombre + ` (nivel ${m.max}) — ` + m.desc(m.max)).classList.add("hecha"); continue; }
      const f = fila(`${m.nombre} · nivel ${n}/${m.max}`, m.desc(n + 1), () => { if (comprarMejoraLogi(api.estado(), m.id)) { api.guardar(); abrirMadre(ancla); } });
      if (m.max <= 12) {
        const pips = document.createElement("div");
        pips.className = "pips";
        for (let k = 0; k < m.max; k++) { const q = document.createElement("i"); if (k < n) q.className = k === n - 1 && f.el.classList.contains("flash") ? "on nuevo" : "on"; pips.append(q); }
        f.el.querySelector(".fila-info").append(pips);
      }
      f.refresh = (st) => {
        const c = costoLogi(st, m), faltan = m.req && (st.honguitos.basico || 0) < m.req;
        f.btn.textContent = faltan ? `${st.honguitos.basico || 0}/${m.req} básicos` : fmt(c);
        f.btn.disabled = faltan || st.esporas.lt(c);
      };
      filas.push(f);
    }
  }
  const fmtN = (x) => (x >= 1000 ? fmt(D(x)) : x >= 100 ? String(Math.round(x)) : x.toFixed(1).replace(".", ","));

  // ---- Toques del hongo madre y autoclick ----
  function seccionToques(ancla) {
    const s = api.estado();
    seccion("Toques");
    const info = nota("");
    filas.push({ refresh: (st) => {
      const a = autoPorSeg(st);
      info.textContent = `Cada toque al hongo madre da ${fmt(valorToque(st))} ${valorToque(st).eq(1) ? "espora" : "esporas"}.` + (a ? ` Autoclick (con el mouse sobre el hongo madre): ${a.toLocaleString("es-AR")}/s × ${fmt(valorToque(st).mul(autoFraccion(st)))}.` : "");
    } });
    const visibles = MEJ_CLICK.filter((m) => nivelMej(s, m.id) < m.max && (!m.requiere || nivelMej(s, m.requiere)) && (nivelMej(s, m.id) > 0 || !m.desde || s.total.gte(m.desde)));
    for (const m of visibles) {
      const n = nivelMej(s, m.id);
      const f = fila(m.max > 1 ? `${m.nombre} · nivel ${n}/${m.max}` : m.nombre, m.desc(n + 1), () => { if (comprarMejoraClick(api.estado(), m.id)) { api.guardar(); abrirMadre(ancla); } });
      if (m.max > 1) {
        const pips = document.createElement("div");
        pips.className = "pips";
        for (let k = 0; k < Math.min(m.max, 12); k++) { const q = document.createElement("i"); if (k < n) q.className = k === n - 1 && f.el.classList.contains("flash") ? "on nuevo" : "on"; pips.append(q); }
        f.el.querySelector(".fila-info").append(pips);
      }
      f.refresh = (st) => { const c = costoMej(st, m); f.btn.textContent = fmt(c); f.btn.disabled = st.esporas.lt(c); };
      filas.push(f);
    }
    for (const m of MEJ_CLICK) if (nivelMej(s, m.id) >= m.max) nota("✓ " + m.nombre + (m.max > 1 ? ` (nivel ${m.max})` : "") + " — " + m.desc(m.max)).classList.add("hecha");
  }

  // ---- Hongo madre: comprar honguitos, edificios y mejoras ----
  function abrirMadre(ancla) {
    api.estado().flags.abrioMadre = true;
    abrir("madre", "Hongo madre", () => {
      filasHonguitos(undefined);
      seccionToques(ancla);
      seccionLogistica(ancla);
      const edificios = Object.values(EDIFICIOS).filter((e) => !api.estado().edificios[e.id] && api.estado().total.gte(e.desbloqueo) && (!e.requiereFlag || api.estado().flags[e.requiereFlag]) && !e.desdeCasa);
      if (edificios.length) {
        seccion("Edificios");
        for (const ed of edificios) {
          const req = ed.requiere ? TEC_POR_ID[ed.requiere] : null, falta = req && !api.estado().mejoras[req.id];
          const f = fila(ed.nombre, ed.desc + (falta ? ` Requiere investigar «${req.nombre}» en la Universidad.` : "") + (ed.reqHong ? ` Requiere tener ${ed.reqHong.n} ${plural(ed.reqHong.tipo)}.` : ""), () => {
            if (api.estado().esporas.lt(costoEdificio(api.estado(), ed)) || (req && !api.estado().mejoras[req.id]) || (ed.reqHong && (api.estado().honguitos[ed.reqHong.tipo] || 0) < ed.reqHong.n)) return;
            cerrar();
            api.colocar(ed.id);
          }, ed.color);
          filas.push({ tipo: "edificio", ed, ...f });
        }
      }
      const pendientes = MEJORAS.filter((mj) => !api.estado().mejoras[mj.id] && (!mj.desde || api.estado().total.gte(mj.desde)));
      if (pendientes.length) {
        seccion("Mejoras");
        for (const mj of pendientes) {
          const f = fila(mj.nombre, mj.desc, () => {
            if (comprarMejora(api.estado(), mj.id)) {
              api.guardar();
              abrirMadre(ancla);
            }
          });
          filas.push({ tipo: "mejora", mj, ...f });
        }
      }
    }, ancla);
  }

  // ---- Barraca: soldados, torres de defensa y mejoras ----
  function abrirDefensa(id, ancla) {
    const reabrir = () => abrirDefensa(id, ancla);
    const ed = EDIFICIOS[id];
    abrir("casa", ed.nombre, () => {
      const mv = $("hoja-mover");
      mv.hidden = false;
      mv.onclick = () => { cerrar(); api.mover(id); };
      const info = nota("");
      filas.push({ refresh: (st) => {
        const ev = getEvento();
        info.textContent = infoDefensa(st) + ` Meteoritos interceptados: ${Math.round(probInterceptar(st) * 100)}%. Invasiones repelidas: ${st.arcano.repelidas}/${st.arcano.invasiones}.` + (ev && ev.tipo === "invasion" ? " ¡Invasión en curso!" : "");
      } });
      filasHonguitos("barraca");
      seccion(`Torres de defensa (${api.estado().torres.length}/${TORRES_MAX})`);
      nota("Tocá una torre en el mapa para evolucionarla y meterle soldados.");
      if (api.estado().torres.length < TORRES_MAX) {
        const f = fila("Construir torre", "Una torre básica que ubicás tocando el piso. Cada una nueva cuesta más.", () => { const st = api.estado(); if (st.esporas.lt(costoTorre(st))) return; cerrar(); api.colocar("torre_def"); }, ed.color);
        f.refresh = (st) => { const c = costoTorre(st); f.btn.textContent = fmt(c); f.btn.disabled = st.esporas.lt(c); };
        filas.push(f);
      }
      seccion("Mejoras");
      for (const m of DEF_MEJ.filter((x) => x.edificio === id)) {
        const n = nivelDef(api.estado(), m.id);
        if (n >= m.max) { nota("✓ " + m.nombre + ` (nivel ${m.max}) — ` + m.desc(m.max)).classList.add("hecha"); continue; }
        const f = fila(`${m.nombre} · nivel ${n}/${m.max}`, m.desc(n + 1) + (m.torres && !api.estado().torres.length ? " (necesita al menos una torre)" : ""), () => { if (comprarDef(api.estado(), m.id)) { api.guardar(); reabrir(); } }, ed.color);
        const pips = document.createElement("div");
        pips.className = "pips";
        for (let k = 0; k < m.max; k++) { const q = document.createElement("i"); if (k < n) q.className = k === n - 1 && f.el.classList.contains("flash") ? "on nuevo" : "on"; pips.append(q); }
        f.el.querySelector(".fila-info").append(pips);
        f.refresh = (st) => { const c = costoDef(st, m); f.btn.textContent = fmt(c); f.btn.disabled = st.esporas.lt(c) || (m.torres && !st.torres.length); };
        filas.push(f);
      }
    }, ancla, ed.color);
  }

  // ---- Torre de defensa: evolución a torre especial y soldados adentro ----
  const dec1 = (x) => (Math.round(x * 10) / 10).toString().replace(".", ",");
  function abrirTorre(i) {
    const reabrir = () => abrirTorre(i);
    const t0 = api.estado().torres[i];
    if (!t0) return;
    const T = TIPOS_TORRE[t0.tipo];
    abrir("casa", `Torre ${i + 1}: ${T.nombre}`, () => {
      const info = nota("");
      filas.push({ refresh: (st) => {
        const t = st.torres[i];
        if (!t) return;
        const S = statsTorre(st, t);
        info.textContent = `Daño ${Math.round(S.dano)} × ${S.canones} ${S.canones === 1 ? "cañón" : "cañones"} · cada ${dec1(S.cd)} s · alcance ${Math.round(S.rango)} · ${Math.round(dpsTorre(st, t))} de daño/s` + (S.radio ? ` · explosión ${Math.round(S.radio)}` : "") + (S.cadena ? ` · salta a ${S.cadena} más` : "") + (S.aire ? "" : " · solo tierra");
      } });
      nota(T.desc);
      seccion(`Soldados dentro (${t0.sold}/${SOLD_MAX})`);
      nota("Cada soldado que entra mejora la torre (+12% daño, +6% cadencia, +3,5% alcance) y cada 3 le suman un cañón extra. Una vez adentro no vuelve a caminar ni a defender por su cuenta.");
      for (const [n, txt] of [[1, "Sumar 1 soldado"], [10, "Sumar hasta 10"]]) {
        if (t0.sold >= SOLD_MAX) break;
        const f = fila(txt, n === 1 ? "Consume 1 soldado de la Barraca." : "Consume todos los soldados que haga falta hasta llenar la torre.", () => { if (sumarSoldados(api.estado(), i, n)) { api.guardar(); reabrir(); } }, "#8f9a5a");
        f.refresh = (st) => { f.btn.textContent = `Hay ${Math.round(st.honguitos.soldado || 0)}`; f.btn.disabled = !(st.honguitos.soldado >= 1) || st.torres[i].sold >= SOLD_MAX; };
        filas.push(f);
      }
      if (t0.tipo === "basica") {
        seccion("Evolucionar");
        nota("La torre básica puede convertirse en una torre especial (una sola vez, no se puede revertir).");
        for (const k of EVOLUCIONES) {
          const E = TIPOS_TORRE[k];
          const f = fila(E.nombre, `${E.desc} Alcance ${E.rango}.`, () => { if (evolucionarTorre(api.estado(), i, k)) { api.guardar(); reabrir(); } }, E.color);
          f.refresh = (st) => { const c = costoEvolucion(st); f.btn.textContent = fmt(c); f.btn.disabled = st.esporas.lt(c); };
          filas.push(f);
        }
      }
    }, () => true, T.color);
  }

  // ---- Cofre: colección de los 50 artefactos del Mercader (a oscuras hasta comprarlos) ----
  function abrirCofre() {
    abrir("cofre", "Cofre del mercader", () => {
      const st = api.estado();
      seccion(`Artefactos (${cantArte(st)}/${ARTEFACTOS.length})`);
      const detalle = document.createElement("p");
      detalle.className = "nota";
      detalle.textContent = "Tocá un artefacto que ya tengas para ver qué hace. Los oscuros todavía no los compraste.";
      const grid = document.createElement("div");
      grid.className = "objs";
      for (const a of ARTEFACTOS) {
        const tengo = !!st.arte.tienen[a.id];
        const c = document.createElement("div");
        c.className = "obj" + (tengo ? "" : " bloq");
        c.innerHTML = '<img src="' + iconoArtefacto(a.id, 3) + '" alt=""><small>' + (tengo ? a.nombre : "???") + "</small>";
        if (tengo) c.style.boxShadow = "0 0 0 2px " + TIERS[a.tier - 1].color;
        c.addEventListener("click", () => { detalle.textContent = tengo ? a.nombre + " (" + TIERS[a.tier - 1].nombre + "): " + a.desc : "Todavía no lo conseguiste en el Mercader."; });
        grid.append(c);
      }
      hojaCuerpo.append(grid, detalle);
    }, null, "#c58aff");
  }

  // ---- Mercader hongil: elegís 1 de 5 artefactos ----
  function mostrarMercader() {
    abrir("mercader", "Mercader hongil", () => {
      const st0 = api.estado();
      nota("«Artefactos únicos, directos del fondo de la mina de los sueños.» Podés quedarte con uno solo de los que ofrece; los efectos duran hasta el próximo prestigio. Los legendarios son raros, pero con más prestigio aparecen más seguido.").classList.add("hecha");
      seccion("Ofertas");
      const ids = ofertasMercader(st0);
      for (const id of ids) {
        const a = ARTE_POR_ID[id];
        const t = TIERS[a.tier - 1];
        const f = fila(`${a.nombre} · ${t.nombre}`, a.desc, () => {
          const st = api.estado();
          if (comprarArtefacto(st, id)) { api.guardar(); toast("Compraste: " + a.nombre); cerrar(); }
        }, t.color);
        const img = document.createElement("img");
        img.className = "arte-ico";
        img.src = iconoArtefacto(id, 3);
        img.alt = "";
        f.el.prepend(img);
        f.refresh = (st) => { const c = precioArtefacto(st, id); f.btn.textContent = fmt(c); f.btn.disabled = st.esporas.lt(c); };
        filas.push(f);
      }
      seccion(`Tus artefactos (${cantArte(st0)}/${ARTEFACTOS.length})`);
      const tiene = Object.keys(st0.arte.tienen);
      if (!tiene.length) nota("Todavía no compraste ninguno.");
      else {
        const grid = document.createElement("div");
        grid.className = "objs";
        const detalle = nota("Tocá un artefacto para ver qué hace.");
        for (const id of tiene) {
          const a = ARTE_POR_ID[id];
          const c = document.createElement("div");
          c.className = "obj";
          c.title = a.nombre;
          c.innerHTML = '<img src="' + iconoArtefacto(id, 3) + '" alt=""><small>' + a.nombre + "</small>";
          c.addEventListener("click", () => { detalle.textContent = a.nombre + ": " + a.desc; });
          grid.append(c);
        }
        hojaCuerpo.insertBefore(grid, detalle);
      }
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = "Cerrar";
      b.addEventListener("click", cerrar);
      const caja = document.createElement("div");
      caja.className = "botones";
      caja.append(b);
      hojaCuerpo.append(caja);
    }, null, "#c58aff");
  }

  // aviso del evento en curso (tormenta, meteoritos, mercader, invasión)
  const elEvento = $("evento-aviso");
  function avisoEvento(st) {
    const ev = getEvento();
    if (!ev) { elEvento.hidden = true; return; }
    let txt = "";
    if (ev.tipo === "tormenta") txt = `Tormenta de esporas: producción ×${ev.mult.toFixed(1).replace(".", ",")} · ${Math.max(0, Math.ceil(ev.dur - ev.t))} s`;
    else if (ev.tipo === "meteoros") txt = "¡Lluvia de meteoritos!" + (st.torres.length ? " Las torres intentan derribarlos." : "");
    else if (ev.tipo === "cristales") txt = `¡Brote de cristales! Cuanto más crecen más rinden, pero se rompen · cosechados ${ev.cosechadas}/${ev.cris.length}`;
    else if (ev.tipo === "geiser") txt = `¡Géiseres de esporas! Tocalos para que erupcionen en grande · ${Math.max(0, Math.ceil(ev.dur - ev.t))} s`;
    else if (ev.tipo === "esporada") txt = `¡Esporada! Atrapá las esporas antes de que se pierdan · atrapadas ${ev.cobradas}/${ev.total}`;
    else if (ev.tipo === "mercader") txt = ev.estado === "espera" ? "Llegó el Mercader hongil: ¡tocalo!" : ev.estado === "llega" ? "Se acerca un Mercader hongil…" : "El mercader se va…";
    else if (ev.tipo === "invasion") txt = `¡INVASIÓN! ${quedan(ev)} enemigos en el campo · derribados ${ev.derribadas}/${ev.criaturas.length} · tocalos para pegarles`;
    elEvento.textContent = txt;
    elEvento.className = "ev-" + ev.tipo;
    elEvento.hidden = false;
  }

  // ---- Dungeon: aviso al encontrarla (primera vez) o estadísticas al tocar su puerta en la mina ----
  const mult2 = (x) => "×" + x.toFixed(2).replace(".", ",");
  function mostrarDungeon(primera) {
    abrir("dungeon", primera ? "¡Dungeon encontrada!" : "Dungeon hongil", () => {
      const st0 = api.estado();
      if (primera) {
        nota("Los mineros terminaron de cavar toda la mina... y al fondo encontraron una puerta antigua que late con una luz violeta.").classList.add("hecha");
        nota("Detrás hay una dungeon para explorar: construí la Taberna hongil y contratá mercenarios.").classList.add("hecha");
      } else {
        nota(st0.edificios.taberna ? "Los mercenarios de la taberna exploran la dungeon que hay detrás de esta puerta." : "Detrás de la puerta hay una dungeon. Construí la Taberna hongil para contratar mercenarios y explorarla.").classList.add("hecha");
      }
      // estadísticas generales
      seccion("Estadísticas");
      const grid = document.createElement("dl");
      grid.className = "stats";
      hojaCuerpo.append(grid);
      const fs = {};
      for (const [k, nombre] of [["estado", "Estado"], ["exp", "Exploraciones"], ["vic", "Victorias / retiradas"], ["jefes", "Rey Moho vencido"], ["etapa", "Mejor etapa"], ["cris", "Cristales radiantes"], ["pelig", "Peligro (enemigos)"], ["merc", "Mercenarios"]]) {
        const dt = document.createElement("dt"), dd = document.createElement("dd");
        dt.textContent = nombre;
        grid.append(dt, dd);
        fs[k] = dd;
      }
      // objetos encontrados (en total)
      seccion("Objetos encontrados");
      const objs = document.createElement("div");
      objs.className = "objs";
      const celdas = {};
      for (const o of OBJETOS) {
        const c = document.createElement("div");
        c.className = "obj";
        c.title = o.nombre + ": " + o.desc;
        c.innerHTML = '<img src="' + iconoObjeto(o.id, 3) + '" alt=""><b></b><small>' + o.nombre + "</small>";
        objs.append(c);
        celdas[o.id] = c;
      }
      hojaCuerpo.append(objs);
      const detalle = nota("Tocá un objeto para ver qué hace.");
      for (const o of OBJETOS) celdas[o.id].addEventListener("click", () => { detalle.textContent = o.nombre + ": " + o.desc + "."; });
      const raros = nota("");
      // objetos activos y estadísticas del party en la exploración en curso
      seccion("Exploración en curso");
      const activos = document.createElement("div");
      hojaCuerpo.append(activos);
      let firma = "";
      filas.push({ refresh: (st) => {
        const d = st.dungeon, run = getRun();
        fs.estado.textContent = run ? (run.fase === "fin" ? "Terminando" : `Explorando · etapa ${Math.min(run.etapa + 1, 5)}/5`) : st.edificios.taberna ? "Descansando" : "Sin taberna";
        fs.exp.textContent = d.expediciones;
        fs.vic.textContent = `${d.victorias || 0} / ${d.derrotas || 0}`;
        fs.jefes.textContent = d.jefes;
        fs.etapa.textContent = `${d.mejorEtapa || 0}/5`;
        fs.cris.textContent = d.cristales ? `${d.cristales} (producción ${mult2(Math.pow(CRISTAL_MULT, d.cristales))})` : "0";
        fs.pelig.textContent = mult2(escalaJefes(st));
        const ids = Object.keys(d.merc), heridos = ids.filter((i) => d.merc[i].herido > 0).length;
        fs.merc.textContent = `${ids.length}/10` + (heridos ? ` · ${heridos} ${heridos === 1 ? "herido" : "heridos"}` : "");
        for (const o of OBJETOS) { const n = (d.objetos || {})[o.id] || 0; celdas[o.id].querySelector("b").textContent = "×" + n; celdas[o.id].classList.toggle("cero", !n); }
        raros.textContent = `Objetos raros (efecto ×1,6): ${d.objetosRaros || 0}.`;
        // activos
        const m = run ? run.mult : { atk: 1, def: 0, hp: 1, cd: 1, crit: 0, esquiva: 0, recompensa: 1 };
        const cuenta = {};
        for (const it of run ? run.items : []) { const c = (cuenta[it.id] = cuenta[it.id] || { n: 0, raro: 0 }); c.n++; if (it.raro) c.raro++; }
        const f2 = JSON.stringify([!!run, cuenta, m]);
        if (f2 === firma) return;
        firma = f2;
        const lista = OBJETOS.filter((o) => cuenta[o.id]);
        let h = "";
        if (!run) h += '<p class="nota">Los objetos valen durante una exploración: al final de cada etapa el party encuentra uno al azar.</p>';
        else if (!lista.length) h += '<p class="nota">Todavía no encontraron ningún objeto en esta exploración.</p>';
        for (const o of lista) {
          const c = cuenta[o.id];
          h += '<div class="obj-fila"><img src="' + iconoObjeto(o.id, 3) + '" alt=""><span><b>' + o.nombre + " ×" + c.n + (c.raro ? " ★" + c.raro : "") + "</b><small>" + o.desc + "</small></span></div>";
        }
        const fila = (a, v, cambio) => "<dt>" + a + "</dt><dd" + (cambio ? ' class="mod"' : "") + ">" + v + "</dd>";
        h += '<dl class="stats">'
          + fila("Ataque del party", mult2(m.atk), m.atk !== 1) + fila("Defensa", "+" + m.def.toFixed(0).replace(".", ","), m.def !== 0) + fila("Vida", mult2(m.hp), m.hp !== 1)
          + fila("Velocidad de ataque", mult2(1 / m.cd), m.cd !== 1) + fila("Golpes críticos", "+" + Math.round(m.crit * 100) + "%", m.crit !== 0) + fila("Esquiva", Math.round(m.esquiva * 100) + "%", m.esquiva !== 0)
          + fila("Recompensa", mult2(m.recompensa), m.recompensa !== 1) + "</dl>";
        activos.innerHTML = h;
      } });
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = "Cerrar";
      b.addEventListener("click", cerrar);
      const caja = document.createElement("div");
      caja.className = "botones";
      caja.append(b);
      hojaCuerpo.append(caja);
    }, null, "#b06bff");
  }

  // ---- Ajustes ----
  function abrirAjustes() {
    abrir("ajustes", "Ajustes", () => {
      const ver = document.createElement("p");
      ver.className = "nota";
      ver.textContent = "Versión " + window.APP_VERSION;
      hojaCuerpo.append(ver);

      seccion("Ventanas");
      const filaT = document.createElement("label");
      filaT.className = "fila fila-check";
      const txt = document.createElement("div");
      txt.className = "fila-info";
      const tt = document.createElement("b");
      tt.textContent = "Semitransparencia";
      const td = document.createElement("span");
      td.textContent = "Las ventanas de mejoras dejan ver el prado de fondo.";
      txt.append(tt, td);
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = !!ajustes.transparencia;
      chk.addEventListener("change", () => {
        ajustes.transparencia = chk.checked;
        try { localStorage.setItem(KEY_AJ, JSON.stringify(ajustes)); } catch (_) {}
        aplicarAjustes();
      });
      filaT.append(txt, chk);
      hojaCuerpo.append(filaT);

      seccion("Rendimiento");
      const filaV = document.createElement("div");
      filaV.className = "fila fila-rango";
      const infoV = document.createElement("div");
      infoV.className = "fila-info";
      const tv = document.createElement("b");
      const dv = document.createElement("span");
      dv.textContent = "Cuántos honguitos de cada tipo se ven a la vez en pantalla. Bajalo si tu PC va lenta; subilo si querés llenarla.";
      infoV.append(tv, dv);
      const rng = document.createElement("input");
      rng.type = "range";
      rng.min = 0; rng.max = 100; rng.step = 1;
      // escala exponencial: 3 .. 300
      rng.value = Math.round(100 * Math.log(ajustes.visibles / 3) / Math.log(100));
      const texto = () => { tv.textContent = "Honguitos visibles: " + ajustes.visibles + " por tipo"; };
      texto();
      rng.addEventListener("input", () => {
        ajustes.visibles = Math.round(3 * Math.pow(100, rng.value / 100));
        texto();
        guardarAjustes();
        api.limiteVisibles?.(ajustes.visibles);
      });
      filaV.append(infoV, rng);
      hojaCuerpo.append(filaV);

      const filaF = document.createElement("div");
      filaF.className = "fila";
      const infoF = document.createElement("div");
      infoF.className = "fila-info";
      const tf = document.createElement("b");
      tf.textContent = "Cuadros por segundo";
      const df = document.createElement("span");
      df.textContent = "Limita cuántas veces por segundo se dibuja el juego. 30 usa la mitad de placa de video que 60; «Sin límite» sigue la frecuencia de tu monitor (gasta más).";
      infoF.append(tf, df);
      const selF = document.createElement("div");
      selF.className = "cant";
      const OPF = [[30, "30"], [60, "60"], [0, "Sin límite"]];
      const botF = OPF.map(([v, txt]) => {
        const b = document.createElement("button");
        b.className = "cant-btn";
        b.textContent = txt;
        b.classList.toggle("activo", (ajustes.fps ?? 60) === v);
        b.addEventListener("click", () => { ajustes.fps = v; guardarAjustes(); botF.forEach((x, i) => x.classList.toggle("activo", OPF[i][0] === v)); });
        selF.append(b);
        return b;
      });
      filaF.append(infoF, selF);
      hojaCuerpo.append(filaF);

      const filaR = document.createElement("div");
      filaR.className = "fila";
      const infoR = document.createElement("div");
      infoR.className = "fila-info";
      const tr = document.createElement("b");
      tr.textContent = "Dibujo (beta)";
      const dr = document.createElement("span");
      dr.textContent = "«WebGL» dibuja con la placa de video en lotes y aguanta muchas más cosas en pantalla. Está en prueba: si algo se ve raro, volvé a «Clásico». Se recarga el juego al cambiar.";
      infoR.append(tr, dr);
      const selR = document.createElement("div");
      selR.className = "cant";
      const OPR = [["2d", "Clásico"], ["gl", "WebGL"]];
      const botR = OPR.map(([v, txt]) => {
        const b = document.createElement("button");
        b.className = "cant-btn";
        b.textContent = txt;
        b.classList.toggle("activo", (ajustes.render || "2d") === v);
        b.addEventListener("click", () => { if ((ajustes.render || "2d") === v) return; ajustes.render = v; guardarAjustes(); api.guardar(); location.reload(); });
        selR.append(b);
        return b;
      });
      filaR.append(infoR, selR);
      hojaCuerpo.append(filaR);

      seccion("Admin (pruebas)");
      const notaAdm = document.createElement("p");
      notaAdm.className = "nota";
      notaAdm.textContent = "Dispara eventos al instante, sin esperar. Los eventos arcanos no se pueden superponer.";
      const botAdm = document.createElement("div");
      botAdm.className = "botones";
      const adm = (texto, fn) => {
        const b = document.createElement("button");
        b.className = "btn";
        b.textContent = texto;
        b.addEventListener("click", () => { notaAdm.textContent = fn(); });
        botAdm.append(b);
      };
      for (const [id, e] of Object.entries(EVENTOS)) {
        adm(e.nombre, () => { api.dispararCielo(id); return `Apareció en el cielo: ${e.nombre}.`; });
      }
      for (const [id, nombre] of [["tormenta", "Tormenta de esporas"], ["meteoros", "Lluvia de meteoritos"], ["esporada", "Esporada"], ["geiser", "Géiseres de esporas"], ["cristales", "Brote de cristales"], ["mercader", "Mercader hongil"], ["invasion", "Invasión"]]) {
        adm(nombre, () => api.dispararArcano(id) ? `Evento iniciado: ${nombre}.` : "Ya hay un evento arcano en curso.");
      }
      hojaCuerpo.append(botAdm, notaAdm);

      seccion("Partida");
      const ta = document.createElement("textarea");
      ta.id = "save-texto";
      ta.rows = 4;
      ta.placeholder = "Código de partida";
      const bExp = document.createElement("button");
      bExp.className = "btn";
      bExp.textContent = "Exportar";
      bExp.addEventListener("click", async () => {
        ta.value = exportar(api.estado());
        try {
          await navigator.clipboard.writeText(ta.value);
          msg.textContent = "Copiado al portapapeles.";
        } catch (_) {
          ta.select();
          msg.textContent = "Copiá el código manualmente.";
        }
      });
      const bImp = document.createElement("button");
      bImp.className = "btn";
      bImp.textContent = "Importar";
      bImp.addEventListener("click", () => {
        try {
          api.reemplazar(importar(ta.value));
          msg.textContent = "Partida importada.";
        } catch (_) {
          msg.textContent = "Código inválido.";
        }
      });
      const bReset = document.createElement("button");
      bReset.className = "btn peligro";
      bReset.textContent = "Borrar partida";
      bReset.addEventListener("click", () => {
        if (confirm("¿Borrar toda la partida? No se puede deshacer.")) {
          borrarGuardado();
          api.reiniciar();
          cerrar();
        }
      });
      const msg = document.createElement("p");
      msg.className = "nota";
      const botones = document.createElement("div");
      botones.className = "botones";
      botones.append(bExp, bImp, bReset);
      hojaCuerpo.append(ta, botones, msg);

      seccion("Novedades");
      for (const c of CHANGELOG) {
        const b = document.createElement("div");
        b.className = "cambio";
        const t = document.createElement("b");
        t.textContent = `v${c.v} · ${c.fecha}`;
        const ul = document.createElement("ul");
        for (const x of c.cambios) {
          const li = document.createElement("li");
          li.textContent = x;
          ul.append(li);
        }
        b.append(t, ul);
        hojaCuerpo.append(b);
      }
    });
  }

  window.addEventListener("resize", () => abierta && colocar());
  const elToast = $("toast");
  let toastT = 0;
  function toast(texto) {
    elToast.textContent = texto;
    elToast.classList.add("visible");
    clearTimeout(toastT);
    toastT = setTimeout(() => elToast.classList.remove("visible"), 3200);
  }
  $("hoja-cerrar").addEventListener("click", cerrar);
  $("fondo-hoja").addEventListener("click", cerrar);
  $("btn-ajustes").addEventListener("click", abrirAjustes);
  $("barra-bloque").addEventListener("click", abrirPrestigio);
  const elBtnPresti = $("btn-prestigio");
  elBtnPresti.addEventListener("click", abrirPrestigio);
  $("btn-cofre").addEventListener("click", abrirCofre);

  // ---- Refresco de textos (se llama ~4 veces por segundo) ----
  const elEsporas = $("esporas");
  const elHint = $("hint");
  const elBloque = $("barra-bloque");
  const elFill = $("barra-fill");
  const elNivel = $("presti-nivel");
  const elNum = $("presti-num");
  const elDpsTotal = $("dps-total");
  let puntosPrev = null;

  // tocar el contador de esporas/s lo pliega (solo total) o lo despliega; se recuerda
  const elDps = $("dps");
  elDps.classList.toggle("plegado", !!ajustes.dpsPlegado);
  elDps.addEventListener("click", () => {
    ajustes.dpsPlegado = !ajustes.dpsPlegado;
    elDps.classList.toggle("plegado", ajustes.dpsPlegado);
    try { localStorage.setItem(KEY_AJ, JSON.stringify(ajustes)); } catch (_) {}
  });

  // una fila por tipo de honguito en el contador de esporas/s (se muestran solo los que tenés)
  const dpsFilas = {};
  for (const id in HONGUITOS) {
    if (HONGUITOS[id].defensa) continue; // los soldados no producen esporas
    const el = document.createElement("div");
    el.className = "dps-fila";
    el.hidden = true;
    const bar = document.createElement("i");
    bar.className = "dps-bar";
    bar.style.background = HONGUITOS[id].color;
    const sw = document.createElement("span");
    sw.className = "dps-tipo";
    sw.style.background = HONGUITOS[id].color;
    const nombre = document.createElement("span");
    nombre.textContent = HONGUITOS[id].nombre;
    const val = document.createElement("b");
    el.append(bar, sw, nombre, val);
    $(HONGUITOS[id].invProd.gt(0) ? "dps-inv" : HONGUITOS[id].logistico ? "dps-log" : "dps-filas").append(el); // los científicos y los cargadores van en su propio ranking
    dpsFilas[id] = { el, val, bar };
  }

  // fila de los toques en el ranking de esporas/s
  const filaToques = (() => {
    const el = document.createElement("div");
    el.className = "dps-fila";
    el.hidden = true;
    const bar = document.createElement("i");
    bar.className = "dps-bar";
    bar.style.background = "#ffe14d";
    const sw = document.createElement("span");
    sw.className = "dps-tipo";
    sw.style.background = "#ffe14d";
    const nombre = document.createElement("span");
    nombre.textContent = "Toques";
    const val = document.createElement("b");
    el.append(bar, sw, nombre, val);
    $("dps-filas").append(el);
    return { el, val, bar };
  })();
  dpsFilas.toques = filaToques;

  function actualizar(forzar) {
    avisoEvento(api.estado());
    const s = api.estado();
    elEsporas.textContent = fmt(s.esporas);

    const pr = prestigio(s.total);
    const ppg = ppAlPrestigiar(s);
    elBtnPresti.textContent = ppg > 0 ? `Prestigio +${ppg} PP` : s.pp > 0 ? `Prestigio (${s.pp} PP)` : "Prestigio";
    elBtnPresti.classList.toggle("lista", ppg > 0 || s.pp > 0);
    elNivel.textContent = "Prestigio " + pr.puntos;
    elNum.textContent = fmt(pr.cur) + " / " + fmt(pr.need);
    elFill.style.width = pr.frac * 100 + "%";
    if (puntosPrev !== null && pr.puntos > puntosPrev) {
      elBloque.classList.remove("subio");
      void elBloque.offsetWidth;
      elBloque.classList.add("subio");
    }
    puntosPrev = pr.puntos;

    // rankings: esporas/s por tipo (de mayor a menor, con barras) y, aparte, investigación/s
    const esp = [], inv = [];
    for (const id in dpsFilas) {
      if (id === "toques") continue; // su fila se arma aparte
      const tiene = (s.honguitos[id] || 0) > 0;
      dpsFilas[id].el.hidden = !tiene;
      if (!tiene) continue;
      if (HONGUITOS[id].logistico) { // el básico no produce: su ranking es cuántas esporas/s alcanza a llevar
        const LG0 = logiInfo(s);
        dpsFilas[id].val.textContent = fmtN(LG0.cap) + " gr/s"; // granos de espora por segundo que alcanza a llevar
        dpsFilas[id].bar.style.width = Math.max(2, Math.min(100, LG0.razon * 100)) + "%";
        dpsFilas[id].el.classList.toggle("debuff", LG0.razon < 0.995);
        dpsFilas[id].el.style.order = 0;
        continue;
      }
      if (HONGUITOS[id].invProd.gt(0)) {
        const v = invPorSeg(s);
        dpsFilas[id].val.textContent = fmt(v) + "/s";
        inv.push({ id, v });
      } else {
        const v = produccionPorTipo(s, id);
        dpsFilas[id].val.textContent = fmtRate(v);
        dpsFilas[id].el.classList.toggle("debuff", factorAcido(id) < 1 || factorMeteoro(id) < 1); // lluvia ácida, meteoritos o cualquier otra baja de producción
        esp.push({ id, v });
      }
    }
    const ordenar = (lista, num) => {
      lista.sort((a, b) => (num ? b.v - a.v : b.v.cmp(a.v)));
      const max = lista[0] ? lista[0].v : null;
      lista.forEach((e, i) => {
        dpsFilas[e.id].el.style.order = i;
        const frac = num ? (max > 0 ? e.v / max : 0) : max.gt(0) ? e.v.div(max).toNumber() : 0;
        dpsFilas[e.id].bar.style.width = Math.max(2, Math.min(100, frac * 100)) + "%";
      });
    };
    const vT = s.logi.tasaV || D(0), hayToques = vT.gte(0.05);
    filaToques.el.hidden = !hayToques;
    if (hayToques) { filaToques.val.textContent = fmtRate(vT); esp.push({ id: "toques", v: vT }); }
    ordenar(esp, false);
    ordenar(inv, true);
    $("dps-inv-titulo").hidden = inv.length === 0;
    elDpsTotal.textContent = fmtRate(produccionPorSeg(s).add(vT)); // el total incluye lo que aportan los toques
    const LG = logiInfo(s);
    $("dps-logi-v").textContent = Math.round(LG.razon * 100) + "%";
    $("dps-logi").classList.toggle("cuello", LG.razon < 0.995);
    $("dps-piso-v").textContent = fmtN(s.logi.n);

    const puedeComprar = s.esporas.gte(costoHonguito(s, "basico"));
    elHint.classList.toggle("visible", !s.flags.toco && !abierta);

    if (abierta && anclaFn) colocar(); // sigue al edificio si cambia de tamaño
    if (abierta !== "madre" && abierta !== "casa" && abierta !== "dungeon" && !forzar) return;
    const marcar = (f) => { // fila en verde/brillante si podés comprarla; apagada si no; destello al pasar a "podés"
      if (!f.el || !f.btn || f.sinMarca || f.btn.classList.contains("activa")) return;
      const puede = !f.btn.disabled;
      f.el.classList.toggle("puede", puede);
      f.el.classList.toggle("caro", !puede);
      if (puede && f.puedeAntes === false) { f.btn.classList.remove("listo"); void f.btn.offsetWidth; f.btn.classList.add("listo"); }
      f.puedeAntes = puede;
    };
    for (const f of filas) {
      if (f.refresh) { f.refresh(s); marcar(f); continue; }
      if (f.tipo === "honguito") {
        const cant = ajustes.cantidad || 1;
        const k = cant === "max" ? Math.max(1, maxHonguitos(s, f.id)) : cant;
        const c = costoHonguitos(s, f.id, k);
        const antes = f.titulo.textContent;
        f.btn.classList.toggle("vende", modoVender);
        f.titulo.textContent = `${HONGUITOS[f.id].nombre} ×${fmt(s.honguitos[f.id] || 0)}`;
        if (antes && antes !== f.titulo.textContent && f.titulo.dataset.vis) { f.titulo.classList.remove("bump"); void f.titulo.offsetWidth; f.titulo.classList.add("bump"); }
        f.titulo.dataset.vis = "1";
        if (modoVender) { // vender: el botón muestra cuánto se devuelve
          const kv = cant === "max" ? vendibles(s, f.id) : Math.min(cant, vendibles(s, f.id));
          f.btn.textContent = kv > 0 ? `−${cant === "max" ? "×" + fmt(kv) + " · " : ""}${fmt(reembolsoHonguitos(s, f.id, kv))}` : "−";
          f.btn.disabled = kv < 1;
        } else {
          f.btn.textContent = cant === "max" ? `×${fmt(k)} · ${fmt(c)}` : fmt(c);
          f.btn.disabled = s.esporas.lt(c);
        }
      } else if (f.tipo === "edificio") {
        const bloq = f.ed.requiere && !s.mejoras[f.ed.requiere];
        const rq = f.ed.reqHong, faltan = rq && (s.honguitos[rq.tipo] || 0) < rq.n;
        f.btn.textContent = bloq ? "Bloqueado" : faltan ? `${s.honguitos[rq.tipo] || 0}/${rq.n} ${plural(rq.tipo)}` : fmt(costoEdificio(s, f.ed));
        f.btn.disabled = bloq || faltan || s.esporas.lt(costoEdificio(s, f.ed));
      } else {
        f.btn.textContent = fmt(f.mj.costo);
        f.btn.disabled = s.esporas.lt(f.mj.costo);
      }
      marcar(f);
    }
  }

  return {
    toast,
    mostrarDungeon,
    mostrarMercader,
    actualizar,
    abrirMadre,
    abrirCasa,
    abrirTorre,
    mostrarColocar(texto) {
      const el = $("colocar");
      if (texto) $("colocar-texto").textContent = texto;
      el.classList.toggle("visible", !!texto);
    },
    cerrar,
    hojaAbierta: () => abierta !== null,
  };
}
