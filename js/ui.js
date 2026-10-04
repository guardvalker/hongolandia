import { HONGUITOS, MEJORAS, EDIFICIOS, TECNOLOGIAS, MEJ_EDIF, TEC_POR_ID, HITOS, NIVELES_TEC } from './data.js';
import { fmt, fmtRate } from './format.js';
import { factorAcido, produccionPorSeg, produccionPorTipo, prestigio, costoHonguito, costoHonguitos, maxHonguitos, comprarHonguitos, comprarMejora, tecDisponible, pctTec, invPorSeg, proximoHito, elegirInvestigacion, comprarMejoraEdificio, activarHabilidad, buffActivo } from './engine.js';
import { exportar, importar, borrarGuardado } from './state.js';
import { CHANGELOG } from './changelog.js';

// Preferencias de interfaz (no forman parte de la partida): guardadas aparte.
const KEY_AJ = "hongolandia-ajustes";
const AJ_BASE = { transparencia: false, dpsPlegado: false, visibles: 20, cantidad: 1 };
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

  // Ventana de un edificio: aparece a su derecha, apoyada en el suelo. Si no entra, se corre
  // hacia la derecha de la pantalla y pasa a layout angosto. Sin edificio: tarjeta abajo.
  function colocar() {
    hoja.style.cssText = "";
    hoja.classList.remove("anclada");
    if (!anclaFn) return;
    const r = anclaFn();
    const vw = window.innerWidth, margen = 10, minW = 140, maxW = 260;
    let left = r.x1 + margen;
    let w = Math.min(maxW, vw - left - margen);
    if (w < minW) { w = minW; left = vw - margen - minW; }
    hoja.classList.add("anclada");
    hoja.style.left = left + "px";
    hoja.style.right = "auto";
    hoja.style.width = w + "px";
    hoja.style.bottom = window.innerHeight - r.y1 + "px";
    hoja.style.height = "auto";
    hoja.style.maxHeight = Math.max(140, r.y1 - 90) + "px";
  }

  function abrir(cual, titulo, render, ancla = null) {
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

  function fila(titulo, desc, onBuy) {
    const el = document.createElement("div");
    el.className = "fila";
    const info = document.createElement("div");
    info.className = "fila-info";
    const t = document.createElement("b");
    t.textContent = titulo;
    const d = document.createElement("span");
    d.textContent = desc;
    info.append(t, d);
    const btn = document.createElement("button");
    btn.className = "comprar";
    btn.addEventListener("click", onBuy);
    el.append(info, btn);
    hojaCuerpo.append(el);
    return { el, titulo: t, btn };
  }

  function seccion(texto) {
    const h = document.createElement("h3");
    h.textContent = texto;
    hojaCuerpo.append(h);
  }

  function filasHonguitos(casa) {
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
    hojaCuerpo.append(sel);
    for (const id in HONGUITOS) {
      const tipo = HONGUITOS[id];
      if (tipo.casa !== casa) continue;
      const f = fila(tipo.nombre, tipo.desc, () => {
        if (comprarHonguitos(api.estado(), id, ajustes.cantidad || 1)) api.guardar();
        actualizar(true);
      });
      filas.push({ tipo: "honguito", id, ...f });
    }
  }

  // ---- Textos de las mejoras ----
  const num = (x) => String(+x.toFixed(2)).replace(".", ",");
  const plural = (id) => HONGUITOS[id].nombre.toLowerCase() + "s";
  const objetivoTxt = (o) => (o === "todos" ? "todos los honguitos" : o === "investigacion" ? "la velocidad de investigación" : "la producción de " + plural(o));
  function descMej(m) {
    const p = plural(m.aplica || m.tipo), prod = m.aplica === "cientifico" ? "investigación" : "producción";
    switch (m.ef) {
      case "prod": return `Los ${p} ${m.aplica === "cientifico" ? "investigan" : "producen"} ×${num(m.mult)}.`;
      case "vel": return `+${Math.round((m.mult - 1) * 100)}% de velocidad para los ${p} (animaciones y ciclos más cortos) y un poco más de ${prod}.`;
      case "crit": return `Cada segundo, ${Math.round(m.prob * 100)}% de chance de golpe crítico: ${m.seg} s de ${prod} de los ${p} de golpe.`;
      case "buff": return `Habilidad: ×${m.mult} a los ${p} durante ${m.dur} s (recarga ${Math.round(m.cd / 60)} min).`;
      case "sinergia": return `Cada ${m.cada} ${plural(m.fuente)}: +${num(m.bono * 100)}% a ${objetivoTxt(m.objetivo)}.`;
      case "acido": return `La lluvia ácida quita un ${Math.round(m.acidoMenos * 100)}% menos de producción.`;
    }
    return "";
  }
  function descTec(s, t) {
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
      const sig = proximoHito(n);
      nota(sig ? `Hito: al llegar a ${sig} ${plural(id)} producen ×2 (tenés ${n}).` : `Todos los hitos de ${plural(id)} alcanzados.`);
    }
  }

  // ---- Mejoras de edificio y habilidades activas ----
  function filasMejorasEdificio(id, reabrir) {
    const s = api.estado();
    const mias = MEJ_EDIF.filter((m) => m.edificio === id);
    const pendientes = mias.filter((m) => !s.mejoras[m.id]);
    const habilidades = mias.filter((m) => m.ef === "buff" && s.mejoras[m.id]);
    const hechas = mias.filter((m) => s.mejoras[m.id] && m.ef !== "buff");
    if (pendientes.length) {
      seccion("Mejoras");
      for (const m of pendientes) {
        const f = fila(m.nombre, descMej(m) + ` Requiere ${m.req} ${plural(m.tipo)}.`, () => {
          if (comprarMejoraEdificio(api.estado(), m.id)) { api.guardar(); reabrir(); }
        });
        f.refresh = (st) => {
          const faltan = (st.honguitos[m.tipo] || 0) < m.req;
          f.btn.textContent = faltan ? `${st.honguitos[m.tipo] || 0}/${m.req}` : fmt(m.costo);
          f.btn.disabled = faltan || st.esporas.lt(m.costo);
        };
        filas.push(f);
      }
    }
    if (habilidades.length) {
      seccion("Habilidades");
      for (const m of habilidades) {
        const f = fila(m.nombre, descMej(m), () => { if (activarHabilidad(api.estado(), m.id)) { api.guardar(); actualizar(true); } });
        f.refresh = (st) => {
          const ahora = Date.now(), h = st.habil[m.id];
          if (h && ahora < h.hasta) { f.btn.textContent = Math.ceil((h.hasta - ahora) / 1000) + " s"; f.btn.disabled = true; f.btn.classList.add("activa"); }
          else if (h && ahora < h.listoEn) { const r = Math.ceil((h.listoEn - ahora) / 1000); f.btn.textContent = Math.floor(r / 60) + ":" + String(r % 60).padStart(2, "0"); f.btn.disabled = true; f.btn.classList.remove("activa"); }
          else { f.btn.textContent = "Activar"; f.btn.disabled = false; f.btn.classList.remove("activa"); }
        };
        filas.push(f);
      }
    }
    if (hechas.length) {
      seccion("Mejoras compradas");
      for (const m of hechas) nota("✓ " + m.nombre + " — " + descMej(m));
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
      const v = invPorSeg(st), act = st.invest.actual ? TEC_POR_ID[st.invest.actual] : null;
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
      const f = fila(`${t.nombre} · nivel ${t.nivel}`, `${tema}: ${descTec(s, t)} (${fmt(t.trabajo)} pts)`, () => { if (elegirInvestigacion(api.estado(), t.id)) { api.guardar(); actualizar(true); } });
      f.refresh = (st) => {
        const en = st.invest.actual === t.id, p = st.invest.prog[t.id] || 0;
        f.btn.textContent = en ? "En curso" : p > 0 ? Math.round((p / t.trabajo) * 100) + "%" : "Investigar";
        f.btn.disabled = en;
      };
      filas.push(f);
    }
    // resumen de lo ya investigado, por tema
    const resumen = [];
    for (const target of new Set(TECNOLOGIAS.map((t) => t.target))) {
      const hechas = TECNOLOGIAS.filter((t) => t.target === target && s.mejoras[t.id]);
      if (hechas.length) resumen.push(`${target === "todos" ? "General" : HONGUITOS[target].nombre}: nivel ${hechas.length}/${NIVELES_TEC} (+${num(hechas.reduce((a, t) => a + pctTec(s, t), 0))}%)`);
    }
    if (resumen.length) { seccion("Investigado"); for (const r of resumen) nota("✓ " + r); }
  }

  // ---- Edificio: honguitos propios, mejoras, habilidades, investigación ----
  function abrirCasa(id, ancla) {
    const reabrir = () => abrirCasa(id, ancla);
    abrir("casa", EDIFICIOS[id].nombre, () => {
      const mv = $("hoja-mover");
      mv.hidden = false;
      mv.onclick = () => { cerrar(); api.mover(id); };
      filasHonguitos(id);
      notasHitos(id);
      if (id === "universidad") seccionInvestigacion(reabrir);
      filasMejorasEdificio(id, reabrir);
      const tecs = TECNOLOGIAS.filter((t) => t.edificio === id && t.target !== "todos" && api.estado().mejoras[t.id]);
      if (tecs.length && id !== "universidad") {
        seccion("Tecnologías");
        nota(`Investigación de la Universidad: nivel ${tecs.length}/${NIVELES_TEC} (+${num(tecs.reduce((a, t) => a + pctTec(api.estado(), t), 0))}% de producción).`);
      }
    }, ancla);
  }

  // ---- Hongo madre: comprar honguitos, edificios y mejoras ----
  function abrirMadre(ancla) {
    api.estado().flags.abrioMadre = true;
    abrir("madre", "Hongo madre", () => {
      filasHonguitos(undefined);
      const edificios = Object.values(EDIFICIOS).filter((e) => !api.estado().edificios[e.id] && api.estado().total.gte(e.desbloqueo));
      if (edificios.length) {
        seccion("Edificios");
        for (const ed of edificios) {
          const f = fila(ed.nombre, ed.desc, () => {
            if (api.estado().esporas.lt(ed.costo)) return;
            cerrar();
            api.colocar(ed.id);
          });
          filas.push({ tipo: "edificio", ed, ...f });
        }
      }
      const pendientes = MEJORAS.filter((mj) => !api.estado().mejoras[mj.id]);
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
  $("hoja-cerrar").addEventListener("click", cerrar);
  $("fondo-hoja").addEventListener("click", cerrar);
  $("btn-ajustes").addEventListener("click", abrirAjustes);

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
    const el = document.createElement("div");
    el.className = "dps-fila";
    el.hidden = true;
    const sw = document.createElement("span");
    sw.className = "dps-tipo";
    sw.style.background = HONGUITOS[id].color;
    const nombre = document.createElement("span");
    nombre.textContent = HONGUITOS[id].nombre;
    const val = document.createElement("b");
    el.append(sw, nombre, val);
    $("dps-filas").append(el);
    dpsFilas[id] = { el, val };
  }

  function actualizar(forzar) {
    const s = api.estado();
    elEsporas.textContent = fmt(s.esporas);

    const pr = prestigio(s.total);
    elNivel.textContent = "Prestigio " + pr.puntos;
    elNum.textContent = fmt(pr.cur) + " / " + fmt(pr.need);
    elFill.style.width = pr.frac * 100 + "%";
    if (puntosPrev !== null && pr.puntos > puntosPrev) {
      elBloque.classList.remove("subio");
      void elBloque.offsetWidth;
      elBloque.classList.add("subio");
    }
    puntosPrev = pr.puntos;

    for (const id in dpsFilas) {
      const tiene = (s.honguitos[id] || 0) > 0;
      dpsFilas[id].el.hidden = !tiene;
      if (tiene) {
        dpsFilas[id].val.textContent = HONGUITOS[id].invProd.gt(0) ? fmt(invPorSeg(s)) + ' inv/s' : fmtRate(produccionPorTipo(s, id));
        dpsFilas[id].val.style.color = factorAcido(id) < 1 ? "#9dff4a" : ""; // mojados por lluvia ácida
      }
    }
    elDpsTotal.textContent = fmtRate(produccionPorSeg(s));

    const puedeComprar = s.esporas.gte(costoHonguito(s, "basico"));
    elHint.classList.toggle("visible", puedeComprar && !s.flags.abrioMadre && abierta !== "madre");

    if (abierta && anclaFn) colocar(); // sigue al edificio si cambia de tamaño
    if (abierta !== "madre" && abierta !== "casa" && !forzar) return;
    for (const f of filas) {
      if (f.refresh) { f.refresh(s); continue; }
      if (f.tipo === "honguito") {
        const cant = ajustes.cantidad || 1;
        const k = cant === "max" ? Math.max(1, maxHonguitos(s, f.id)) : cant;
        const c = costoHonguitos(s, f.id, k);
        f.titulo.textContent = `${HONGUITOS[f.id].nombre} ×${fmt(s.honguitos[f.id] || 0)}`;
        f.btn.textContent = cant === "max" ? `×${fmt(k)} · ${fmt(c)}` : fmt(c);
        f.btn.disabled = s.esporas.lt(c);
      } else if (f.tipo === "edificio") {
        f.btn.textContent = fmt(f.ed.costo);
        f.btn.disabled = s.esporas.lt(f.ed.costo);
      } else {
        f.btn.textContent = fmt(f.mj.costo);
        f.btn.disabled = s.esporas.lt(f.mj.costo);
      }
    }
  }

  return {
    actualizar,
    abrirMadre,
    abrirCasa,
    mostrarColocar(texto) {
      const el = $("colocar");
      if (texto) $("colocar-texto").textContent = texto;
      el.classList.toggle("visible", !!texto);
    },
    cerrar,
    hojaAbierta: () => abierta !== null,
  };
}
