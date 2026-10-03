// Carga de sprites. Para reemplazar un asset, sobrescribí el PNG en assets/
// (pixel art a resolución nativa: 1 píxel del PNG = 1 celda del mundo).
const cargar = (src) =>
  new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => mal(new Error("no se pudo cargar " + src));
    img.src = src;
  });

export async function cargarAssets(etapas) {
  const [honguito, ...madre] = await Promise.all([
    cargar("assets/honguito_sheet.png"),
    ...Array.from({ length: etapas }, (_, i) => cargar(`assets/madre_${i}.png`)),
  ]);
  return { honguito, madre };
}
