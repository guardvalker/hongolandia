// Camas de sustrato: lechos de esporas compactadas donde los Jardineros siembran el sustrato. Cada cama colonizada
// suma +2% a la producción de los Jardineros. Se siembran de a una, colonizan con el tiempo y la lluvia ácida las
// daña (aportan 0) hasta purgarlas. Lógica pura: sin DOM ni canvas.
export const CAMAS = { max: 6, tColonizar: 300, bono: 0.02 };

// estados de una cama: 'sembrada' (t = segundos colonizando) | 'colonizada' | 'dañada'
export function camasInicial() {
  return [];
}

// máximo de camas disponibles según los viveros construidos
export function camasMax(nViveros) {
  return Math.min(CAMAS.max, 1 + Math.floor(nViveros / 5));
}

// siembra una cama de sustrato si hay lugar; devuelve true cuando la agrega
export function sembrar(camas, nViveros) {
  if (camas.length >= camasMax(nViveros)) return false;
  camas.push({ estado: 'sembrada', t: 0 });
  return true;
}

// avanza el tiempo: las sembradas colonizan, las colonizadas se dañan con la lluvia ácida sin paraguas
export function tickCamas(camas, dt, llueveAcido, paraguas) {
  for (const cama of camas) {
    if (cama.estado === 'sembrada') {
      cama.t += dt;
      if (cama.t >= CAMAS.tColonizar) {
        cama.t = CAMAS.tColonizar;
        cama.estado = 'colonizada';
      }
    } else if (cama.estado === 'colonizada' && llueveAcido && !paraguas) {
      cama.estado = 'dañada';
    }
  }
  return camas;
}

// purgar una cama dañada: el sustrato se limpia y vuelve a sembrarse desde cero
export function purgar(camas, i) {
  const cama = camas[i];
  if (!cama || cama.estado !== 'dañada') return false;
  cama.estado = 'sembrada';
  cama.t = 0;
  return true;
}

// multiplicador de producción de los Jardineros por las camas colonizadas
export function bonoCamas(camas) {
  const colonizadas = camas.filter((c) => c.estado === 'colonizada').length;
  return 1 + CAMAS.bono * colonizadas;
}
