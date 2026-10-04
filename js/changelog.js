export const CHANGELOG = [
  {
    v: "0.19.2",
    fecha: "2026-10-04",
    cambios: [
      "Las nubes tienen una altura fija sobre el piso (mínimo y máximo) que no cambia al hacer zoom: al acercar quedan más arriba, fuera de pantalla, y al alejar se ven a la misma altura de siempre. La luna también.",
    ],
  },
  {
    v: "0.19.1",
    fecha: "2026-10-04",
    cambios: [
      "El hongo madre ya no tiene un rectángulo gigante de clic: ahora responde solo en el tronco y el sombrero (elipse). Los edificios se pueden ubicar y tocar casi pegados al tronco, incluso bajo el sombrero, si caben abajo; si el madre es chico y el edificio es más alto que su tronco, sigue haciendo falta el espacio del sombrero.",
      "Los edificios están más separados en tamaño: de su tamaño base hasta ~80% más grandes (antes ~30%). Los muy grandes suman dos ramas hongo más.",
    ],
  },
  {
    v: "0.19.0",
    fecha: "2026-10-04",
    cambios: [
      "Las nubes de contaminación ahora flotan por todo el mundo (no solo sobre la fábrica) y dan la vuelta al llegar al borde; cuando llueven se quedan quietas sobre la zona que mojan.",
      "Mover edificios: en la ventana de cada edificio hay un botón \"Mover / intercambiar\". Tocás el piso para moverlo a otro lugar o tocás otro edificio para intercambiarlos. El hongo madre no se mueve.",
      "El hongo madre crece sin techo: su tamaño sigue las esporas ganadas (~22% más por cada ×10 pasada la etapa 3) y un 4% más por edificio, en vez de frenarse en la etapa 3.",
      "Zoom y cámara: botones +, − y ◎ (centrar) abajo a la derecha, rueda del mouse, pellizco en el celular y teclas +/−. Arrastrando se desplaza la vista. El mundo se agranda solo para que entren el hongo madre y los edificios.",
      "Los edificios ahora guardan su posición en celdas respecto del hongo madre (las partidas viejas se convierten solas).",
    ],
  },
  {
    v: "0.18.0",
    fecha: "2026-10-04",
    cambios: [
      "Nuevo edificio: Fábrica hongil (tier 4, entre el Vivero y el Gym). Sombrero de acero con chimeneas que sueltan humo verde, engranaje girando, ventana con siluetas que se mueven, puerta de operarios y cinta transportadora.",
      "Nuevo honguito: Obrero (casco de acero y chaleco naranja). Entra a la fábrica, sale con una cajita, la deja en la cinta y de ahí sale un hongo chiquito (como los del jardinero) que se vuelve espora. Cuantos más obreros, más movimiento en la fábrica, más humo, engranaje y cinta más rápidos.",
      "Contaminación: cuantos más obreros, más nubes verdes se acumulan sobre la fábrica (1 a 10).",
      "Lluvia ácida: cada tanto (más seguido con más nubes) las nubes llueven sobre una zona. Todo honguito que toque la lluvia queda mojado: se tiñe de verde, camina más lento y produce un 40% menos por 20 s. Mojarse de nuevo no suma más %, solo reinicia los 20 s. El contador de esporas/s se pone verde mientras haya mojados.",
      "El Gym, el Trade center y el Astropuerto subieron un tier (los valores se recalculan solos por la fórmula).",
    ],
  },
  {
    v: "0.17.0",
    fecha: "2026-10-03",
    cambios: [
      "Nuevo edificio: Escuela hongil, el primero en desbloquearse (sombrero lima con campana y banderín, pizarrón con garabatos y puerta de madera).",
      "Nuevo honguito: Maestro (lima, con anteojos). Pasea seguido por 3 alumnitos en fila; al parar se da vuelta, saca un libro y da clase. Tras 3 a 5 clases un alumno se gradúa con diploma y salen esporas.",
      "Los valores ahora salen de una fórmula por tier (producción ×10 y costo ×20 por escalón) en js/data.js, para poder meter edificios entre medio solo cambiando el tier. MODO_PRUEBA sigue activo (todo cuesta 1). La escuela es el tier 1, así que cada honguito de los edificios anteriores rinde 10 veces más que antes.",
    ],
  },
  {
    v: "0.16.0",
    fecha: "2026-10-03",
    cambios: [
      "Hay una luna de fondo desde el principio, sutil y apagada, arriba a la derecha.",
      "Nuevo edificio: Astropuerto hongil (sombrero celeste con estrellitas, antena parabólica, ventanilla redonda y un cohete-hongo estacionado bajo el sombrero). En modo prueba cuesta 1.",
      "Nuevo honguito: Astronauta (celeste, con visor y antena, 10000 esporas/s por unidad, 10 veces un Trader). Cada 30 s con astronautas hay una expedición: se suben al cohete, despega con llamas, viaja a la luna, aterriza, vuelven y sueltan esporas.",
      "Cada expedición suma una base hongil de color en la luna (parche de color + cúpula-hongo). Con la luna llena las bases crecen. Las expediciones también cuentan con la pestaña en segundo plano.",
    ],
  },
  {
    v: "0.15.0",
    fecha: "2026-10-03",
    cambios: [
      "Nuevo edificio: Trade center hongil (sombrero dorado con cinta de cotizaciones, signo $ arriba y una pantalla en el tallo con el gráfico de acciones). En modo prueba cuesta 1.",
      "Nuevo honguito: Trader (dorado, con corbata, 1000 esporas/s por unidad promedio, 10 veces un Atleta). Camina junto al trade center, hace un llamado con el teléfono y manda una acción al edificio.",
      "Las ganancias de los traders llegan de golpe: el gráfico sube durante un ciclo de 18 s y al tocar el techo cobran todas las esporas juntas con una lluvia de esporas hacia el hongo madre. Funciona también con la pestaña en segundo plano.",
    ],
  },
  {
    v: "0.14.0",
    fecha: "2026-10-03",
    cambios: [
      "Compra por cantidad: se suman ×100 y Máx (compra todos los honguitos que alcancen con las esporas actuales; el botón muestra cuántos y el costo).",
      "Los hongos gigantes del fondo ya no se amontonan: cada uno nuevo aparece en un lugar al azar pero separado de los demás. Las partidas viejas los reubican solas.",
      "El juego sigue funcionando en segundo plano: al irte de la pestaña las esporas siguen sumando con el tiempo real (hasta 1 hora de ausencia por vez). Los honguitos solo se animan mientras la pestaña se ve.",
    ],
  },
  {
    v: "0.13.1",
    fecha: "2026-10-03",
    cambios: [
      "Compra por cantidad: botones ×1 y ×10 arriba de la lista de honguitos (en el hongo madre y en cada edificio). El botón muestra el costo total de la tanda y compra todo o nada; la elección se recuerda.",
    ],
  },
  {
    v: "0.13.0",
    fecha: "2026-10-03",
    cambios: [
      "Ajustes > Rendimiento: barra para elegir cuántos honguitos de cada tipo se ven a la vez en pantalla, de 3 a 300 (por defecto 20). También escala los brotes de los jardineros y las partículas. Si tenés una PC floja, bajala; si querés llenar la pantalla, subila.",
    ],
  },
  {
    v: "0.12.1",
    fecha: "2026-10-03",
    cambios: [
      "Los edificios hongiles ahora varían de tamaño al azar: nunca son más chicos que antes, hasta ~30% más grandes. Cuál es el más grande o el más chico depende de la semilla de la partida (se guarda como state.semilla y está pensada para cambiar con cada prestigio).",
      "Los edificios más grandes son más complejos: tienen más manchas y ramas con hongos chiquitos saliendo del tallo (una rama los medianos, dos los más grandes).",
    ],
  },
  {
    v: "0.12.0",
    fecha: "2026-10-03",
    cambios: [
      "Nuevo edificio: Gym hongil (sombrero naranja con cinta de sudor, barra con discos arriba, portón con tablillas y mancuernas al costado). En modo prueba cuesta 1.",
      "Nuevo honguito: Atleta (naranja, 100 esporas/s por unidad, 10 veces un Jardinero). Camina al lado del gym, saca las mancuernas, hace series subiendo y bajando la barra y transpira; al terminar la serie suelta una espora.",
      "El hongo madre suma una mancha naranja por el gym.",
    ],
  },
  {
    v: "0.11.1",
    fecha: "2026-10-03",
    cambios: [
      "Las manchas de colores del hongo madre ahora tienen lugar y tamaño al azar, y algunas quedan cortadas por el borde del sombrero.",
      "El sombrero de cada edificio toma el color de su tipo de honguito (violeta el Conservatorio, verde el Vivero), con manchas propias al azar en tonos más claros y oscuros, en lugar de círculos copiados de uno a otro.",
    ],
  },
  {
    v: "0.11.0",
    fecha: "2026-10-03",
    cambios: [
      "Hongo madre rediseñado: tallo que se ensancha en la base, sombrero con láminas, reflejo, faldón y sombra en el piso.",
      "Las manchas del sombrero ahora son los colores de tus edificios: empieza con un solo punto rojo, el Conservatorio suma violeta, el Vivero verde oscuro, etc.",
      "Conservatorio y Vivero rediseñados: Conservatorio con puerta en arco que brilla, ventanitas y teclas de piano en la base; Vivero como invernadero de vidrio con rejilla, hojas colgando y maceta con brote.",
    ],
  },
  {
    v: "0.10.1",
    fecha: "2026-10-03",
    cambios: [
      "Modo prueba: todos los costos (honguitos, edificios y mejoras) valen 1 esporas y no crecen; el Vivero aparece desde el inicio. Los valores reales se calibran después.",
    ],
  },
  {
    v: "0.10.0",
    fecha: "2026-10-03",
    cambios: [
      "El contador de esporas/s va más en la esquina y, si lo tocás, se pliega y muestra solo el total (se recuerda).",
      "La barra de prestigio es más larga y se adapta al ancho de la pantalla.",
      "Fondo vivo: cada edificio nuevo y cada 5 niveles de prestigio crece un hongo gigante, muy oscuro y sutil, detrás del prado.",
    ],
  },
  {
    v: "0.9.0",
    fecha: "2026-10-03",
    cambios: [
      "Nueva barra de prestigio arriba: se llena con las esporas ganadas y cada vez que se completa das 1 punto de prestigio. Cada punto cuesta más que el anterior (×1,55).",
      "El contador de la izquierda ahora muestra las esporas por segundo que genera cada tipo de honguito, más el total.",
      "Producción por tipo escalonada: el Músico produce 10 veces un honguito común y el Jardinero 10 veces un Músico (costos del Músico, Jardinero y Vivero reajustados).",
    ],
  },
  {
    v: "0.8.0",
    fecha: "2026-10-03",
    cambios: [
      "Nuevo edificio: Vivero hongil (aparece en el hongo madre al juntar 2.500 esporas; se ubica en el piso como el conservatorio).",
      "Nuevo honguito: el Jardinero, que se compra desde el vivero. Camina a un punto del piso, lo riega con su regadera y ahí brota un honguito pasajero.",
      "Los brotes duran unos 12 a 18 segundos, titilan y se desvanecen convirtiéndose en una espora que viaja al hongo madre, así el piso nunca se llena.",
      "Los edificios ahora se acomodan solos para no pisarse entre sí ni con el hongo madre.",
    ],
  },
  {
    v: "0.7.3",
    fecha: "2026-10-03",
    cambios: [
      "La boca del Músico al cantar ya no llega hasta las patas: se abre solo en una fila.",
    ],
  },
  {
    v: "0.7.2",
    fecha: "2026-10-03",
    cambios: [
      "El Músico no tiene boca salvo cuando canta: ahí la abre y la cierra (nada de sonrisa fija).",
    ],
  },
  {
    v: "0.7.1",
    fecha: "2026-10-03",
    cambios: [
      "El Músico ahora mueve la boca al cantar (chica, ancha y abierta), no solo una sonrisa fija.",
    ],
  },
  {
    v: "0.7.0",
    fecha: "2026-10-03",
    cambios: [
      "Nuevo edificio: Conservatorio hongil, un hongo musical que comprás en el hongo madre y ubicás donde quieras en el piso. Al instalarlo, el hongo madre crece un 15%.",
      "Nuevo honguito: el Músico, que se compra desde el conservatorio. Canta cada tanto, le salen notitas musicales y su música rinde esporas.",
      "Tocar el conservatorio abre su propia ventana, al costado, como la del hongo madre.",
    ],
  },
  {
    v: "0.6.2",
    fecha: "2026-10-03",
    cambios: [
      "La ventana de mejoras abre y cierra mucho más rápido.",
    ],
  },
  {
    v: "0.6.1",
    fecha: "2026-10-03",
    cambios: [
      "Ventana de mejoras más compacta: título y precio en una línea, descripción debajo.",
      "Ahora se despliega de izquierda a derecha, naciendo desde el borde del edificio.",
    ],
  },
  {
    v: "0.6.0",
    fecha: "2026-10-03",
    cambios: [
      "La ventana de mejoras de cada edificio aparece a su derecha, apoyada en el suelo (hoy el hongo madre; vale para los futuros).",
      "En pantallas angostas la ventana se compacta y se corre para entrar.",
    ],
  },
  {
    v: "0.5.0",
    fecha: "2026-10-03",
    cambios: [
      "Vista más lejana: todo se ve más chico y entra más prado en pantalla.",
      "El hongo madre ya no tiene puerta: es un hongo grande que crece con cada etapa.",
      "La ventana de mejoras flota al frente y ya no mueve la pantalla.",
      "Nuevo ajuste: Semitransparencia de ventanas (afecta a todas las ventanas de mejoras).",
      "Esporas de colores del aire mucho más chicas y más numerosas.",
    ],
  },
  {
    v: "0.4.0",
    fecha: "2026-10-03",
    cambios: [
      "Cambio de estilo: fondo azul noche plano, contornos blancos y manchitas de colores (inspirado en Gnorp Apologue).",
      "Honguitos y hongo madre dibujados por código, sin sprites: rebotan, caminan y saltan con movimientos simples.",
      "Cada honguito tiene un sombrero de color; las esporas viajan como bolitas de colores hasta el hongo madre.",
      "Se quitaron el ciclo día/noche, las luces y las luciérnagas.",
      "Paneles y botones con borde blanco para combinar con el nuevo estilo.",
    ],
  },
  {
    v: "0.3.0",
    fecha: "2026-10-03",
    cambios: [
      "Honguitos animados de verdad: respiran, parpadean, caminan, saltan y levantan los brazos al entregar esporas.",
      "Luces y efectos: ciclo de día y noche, brillo del hongo madre, luciérnagas, esporas con estela, destellos y ondas.",
      "Fondo más simple (colinas, pasto y tierra) y hongo madre sin ventanas.",
    ],
  },
  {
    v: "0.2.0",
    fecha: "2026-10-03",
    cambios: [
      "Rediseño en 2D vista lateral y pixel art: todo el prado en pantalla, con montañas, pinos y nubes.",
      "Nuevo honguito principal (pixel art) que pasea y lleva esporas al hongo madre.",
      "El hongo madre ahora es una casita-hongo sin cara, con 4 etapas de tamaño.",
      "Producción mucho más lenta: cada honguito produce 0,1 esporas/s y los costos crecen más rápido.",
    ],
  },
  {
    v: "0.1.0",
    fecha: "2026-10-03",
    cambios: [
      "Primer prado: hongo madre en el centro y un honguito produciendo esporas.",
      "Comprar honguitos y mejoras desde el hongo madre.",
      "Guardado automático, exportar e importar partida.",
    ],
  },
];
