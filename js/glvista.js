// Dibujo con WebGL (PixiJS) para el modo «WebGL (beta)». La escena sigue pintándose en lienzos 2D, pero ahora
// se reparte en capas: [lienzo de fondo] → [sprites WebGL: hongo madre y edificios] → [lienzo del frente].
// Cada lienzo ya cacheado (madre, edificios...) se sube a la placa como textura y se dibuja en un lote.
// PixiJS se carga solo si este modo está activo (vendor/pixi.min.js).

let promesa = null;
function cargarPixi() {
  if (window.PIXI) return Promise.resolve();
  return (promesa ||= new Promise((ok, mal) => {
    const s = document.createElement("script");
    s.src = "vendor/pixi.min.js";
    s.onload = ok;
    s.onerror = () => mal(new Error("no se pudo cargar PixiJS"));
    document.head.append(s);
  }));
}

export async function crearGL(canvasEventos) {
  await cargarPixi();
  const { Application, Texture, Sprite, Container, TextureSource, Rectangle } = window.PIXI;
  TextureSource.defaultOptions.scaleMode = "nearest";
  const app = new Application();
  await app.init({ width: canvasEventos.width || 2, height: canvasEventos.height || 2, background: "#272736", antialias: false, resolution: 1, autoDensity: false, autoStart: false, preference: "webgl" });
  if (app.renderer.name !== "webgl") throw new Error("sin WebGL");
  const cv = app.canvas;
  cv.id = "juego-gl";
  canvasEventos.parentNode.insertBefore(cv, canvasEventos);
  const maxTex = app.renderer.gl.getParameter(app.renderer.gl.MAX_TEXTURE_SIZE) || 4096;

  const mundo = new Container();
  const spFondo = new Sprite(), spFrente = new Sprite();
  app.stage.addChild(spFondo, mundo, spFrente);

  // textura por lienzo: se vuelve a subir solo cuando cambia su versión (o su tamaño)
  const texs = new Map();
  function entrada(lienzo) {
    let e = texs.get(lienzo);
    if (e && (e.w !== lienzo.width || e.h !== lienzo.height)) { e.tex.destroy(true); texs.delete(lienzo); e = null; }
    if (!e) { e = { tex: Texture.from(lienzo), w: lienzo.width, h: lienzo.height, ver: -1, cortes: {} }; texs.set(lienzo, e); }
    return e;
  }
  const sprites = new Map(); // clave -> Sprite
  let orden = [], ordenPrev = [];

  return {
    maxTex,
    canvas: cv,
    resize(w, h) { app.renderer.resize(Math.max(2, w), Math.max(2, h)); },
    cabe: (lienzo) => lienzo.width <= maxTex && lienzo.height <= maxTex,
    inicio() { orden = []; },
    // dibuja un lienzo en el mundo (coordenadas en celdas). `corte` = [sx, sy, sw, sh] en px del lienzo para usar solo una parte
    sprite(clave, lienzo, ver, x, y, w, h, corte = null, alfa = 1) {
      const e = entrada(lienzo);
      if (e.ver !== ver) { e.tex.source.update(); e.ver = ver; }
      let sp = sprites.get(clave);
      if (!sp) { sp = new Sprite(); sprites.set(clave, sp); }
      let tex = e.tex;
      if (corte) {
        const c = e.cortes[clave];
        if (!c || c.f[0] !== corte[0] || c.f[1] !== corte[1] || c.f[2] !== corte[2] || c.f[3] !== corte[3]) {
          if (c) c.tex.destroy(false);
          e.cortes[clave] = { f: corte.slice(), tex: new Texture({ source: e.tex.source, frame: new Rectangle(corte[0], corte[1], corte[2], corte[3]) }) };
        }
        tex = e.cortes[clave].tex;
      }
      if (sp.texture !== tex) sp.texture = tex;
      sp.position.set(x, y);
      sp.width = w; sp.height = h;
      sp.alpha = alfa;
      orden.push(sp);
    },
    // termina el cuadro: sube los lienzos de fondo y frente y dibuja todo
    fin({ fondo, frente, offX, offY, S, Wc, Hc }) {
      for (const [lienzo, sp] of [[fondo, spFondo], [frente, spFrente]]) {
        const e = entrada(lienzo);
        e.tex.source.update();
        if (sp.texture !== e.tex) sp.texture = e.tex;
        sp.width = Wc * S; sp.height = Hc * S;
      }
      mundo.position.set(offX * S, offY * S);
      mundo.scale.set(S);
      let igual = orden.length === ordenPrev.length;
      for (let i = 0; igual && i < orden.length; i++) if (orden[i] !== ordenPrev[i]) igual = false;
      if (!igual) { mundo.removeChildren(); for (const sp of orden) mundo.addChild(sp); ordenPrev = orden; }
      app.renderer.render({ container: app.stage });
    },
  };
}
