import { HONGUITOS, MEJORAS } from './data.js';
import { fmt, fmtRate } from './format.js';
import { produccionPorSeg, costoHonguito, comprarHonguito, comprarMejora } from './engine.js';
import { exportar, importar, borrarGuardado } from './state.js';
import { CHANGELOG } from './changelog.js';

// Preferencias de interfaz (no forman parte de la partida): guardadas aparte.
const KEY_AJ = "hongolandia-ajustes";
const ajustes = (() => {
  try { return { transparencia: false, ...JSON.parse(localStorage.getItem(KEY_AJ) || "{}") }; } catch (_) { return { transparencia: false }; }
})();
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

  function cerrar() {
    abierta = null;
    hoja.classList.remove("abierta");
  }

  function abrir(cual, titulo, render) {
    abierta = cual;
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

  // ---- Hongo madre: comprar honguitos y mejoras ----
  function abrirMadre() {
    api.estado().flags.abrioMadre = true;
    abrir("madre", "Hongo madre", () => {
      seccion("Honguitos");
      for (const id in HONGUITOS) {
        const tipo = HONGUITOS[id];
        const f = fila(tipo.nombre, tipo.desc, () => {
          if (comprarHonguito(api.estado(), id)) api.guardar();
          actualizar(true);
        });
        filas.push({ tipo: "honguito", id, ...f });
      }
      const pendientes = MEJORAS.filter((mj) => !api.estado().mejoras[mj.id]);
      if (pendientes.length) {
        seccion("Mejoras");
        for (const mj of pendientes) {
          const f = fila(mj.nombre, mj.desc, () => {
            if (comprarMejora(api.estado(), mj.id)) {
              api.guardar();
              abrirMadre();
            }
          });
          filas.push({ tipo: "mejora", mj, ...f });
        }
      }
    });
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

  $("hoja-cerrar").addEventListener("click", cerrar);
  $("fondo-hoja").addEventListener("click", cerrar);
  $("btn-ajustes").addEventListener("click", abrirAjustes);

  // ---- Refresco de textos (se llama ~4 veces por segundo) ----
  const elEsporas = $("esporas");
  const elProd = $("prod");
  const elHint = $("hint");

  function actualizar(forzar) {
    const s = api.estado();
    elEsporas.textContent = fmt(s.esporas);
    elProd.textContent = "+" + fmtRate(produccionPorSeg(s));

    const puedeComprar = s.esporas.gte(costoHonguito(s, "basico"));
    elHint.classList.toggle("visible", puedeComprar && !s.flags.abrioMadre && abierta !== "madre");

    if (abierta !== "madre" && !forzar) return;
    for (const f of filas) {
      if (f.tipo === "honguito") {
        const c = costoHonguito(s, f.id);
        f.titulo.textContent = `${HONGUITOS[f.id].nombre} ×${fmt(s.honguitos[f.id] || 0)}`;
        f.btn.textContent = fmt(c);
        f.btn.disabled = s.esporas.lt(c);
      } else {
        f.btn.textContent = fmt(f.mj.costo);
        f.btn.disabled = s.esporas.lt(f.mj.costo);
      }
    }
  }

  return {
    actualizar,
    abrirMadre,
    cerrar,
    hojaAbierta: () => abierta !== null,
  };
}
