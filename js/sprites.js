// Sprites de hongos dibujados por código (placeholders).
// Cuando lleguen los assets reales, cada tipo se reemplaza acá por drawImage
// sin tocar scene.js: la escena solo llama a SPRITES[tipo](ctx, opciones).

const TAU = Math.PI * 2;

export function sombra(ctx, x, y, rx, ry, alpha = 0.18) {
  ctx.fillStyle = `rgba(20,50,20,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

// (x, y) = base del tallo; s = radio del sombrero.
// o: { sombrero, manchas, tallo, cara, aplasta (1 = normal), balanceo (rad) }
export function dibujarHongo(ctx, x, y, s, o) {
  const aplasta = o.aplasta ?? 1;
  const tH = s * 1.05;
  const tW = s * 0.78;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.balanceo ?? 0);
  ctx.scale(2 - aplasta, aplasta);

  // tallo
  ctx.fillStyle = o.tallo;
  ctx.beginPath();
  ctx.moveTo(-tW * 0.55, 0);
  ctx.quadraticCurveTo(-tW * 0.3, -tH * 0.5, -tW * 0.42, -tH);
  ctx.lineTo(tW * 0.42, -tH);
  ctx.quadraticCurveTo(tW * 0.3, -tH * 0.5, tW * 0.55, 0);
  ctx.quadraticCurveTo(0, s * 0.16, -tW * 0.55, 0);
  ctx.fill();

  // cara
  if (o.cara) {
    const fy = -tH * 0.5;
    ctx.fillStyle = "#2b2233";
    ctx.beginPath();
    ctx.ellipse(-tW * 0.2, fy, s * 0.07, s * 0.09, 0, 0, TAU);
    ctx.ellipse(tW * 0.2, fy, s * 0.07, s * 0.09, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#2b2233";
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, fy + s * 0.05, s * 0.1, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,120,150,0.45)";
    ctx.beginPath();
    ctx.ellipse(-tW * 0.36, fy + s * 0.1, s * 0.07, s * 0.045, 0, 0, TAU);
    ctx.ellipse(tW * 0.36, fy + s * 0.1, s * 0.07, s * 0.045, 0, 0, TAU);
    ctx.fill();
  }

  // sombrero
  const cy = -tH;
  ctx.fillStyle = o.sombrero;
  ctx.beginPath();
  ctx.ellipse(0, cy, s, s * 0.82, 0, Math.PI, TAU);
  ctx.quadraticCurveTo(0, cy + s * 0.34, -s, cy);
  ctx.fill();

  // manchas
  ctx.fillStyle = o.manchas;
  const spots = [
    [-0.45, -0.35, 0.17],
    [0.1, -0.62, 0.14],
    [0.5, -0.3, 0.16],
    [-0.1, -0.2, 0.09],
  ];
  for (const [px, py, pr] of spots) {
    ctx.beginPath();
    ctx.ellipse(px * s, cy + py * s, pr * s, pr * s * 0.8, 0, 0, TAU);
    ctx.fill();
  }

  // brillo
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.ellipse(-s * 0.4, cy - s * 0.5, s * 0.22, s * 0.1, -0.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export const SPRITES = {
  madre(ctx, x, y, s, extra) {
    dibujarHongo(ctx, x, y, s, {
      sombrero: "#e8535c",
      manchas: "#fff4ec",
      tallo: "#f6e7d3",
      cara: true,
      ...extra,
    });
  },
  basico(ctx, x, y, s, extra) {
    dibujarHongo(ctx, x, y, s, {
      sombrero: "#f4a259",
      manchas: "#fff4ec",
      tallo: "#f6e7d3",
      cara: true,
      ...extra,
    });
  },
};
