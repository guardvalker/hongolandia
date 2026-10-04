export const CHANGELOG = [
  {
    v: "0.24.0",
    fecha: "2026-10-04",
    cambios: [
      "La luna ahora tiene menos bases (hasta 24 en vez de 80). Cuando se llena, las expediciones hacen crecer las bases que ya hay.",
      "Las bases se van uniendo con caminos punteados: cada base nueva se conecta con su vecina más cercana (y con una segunda si queda cerca), y el camino se construye en el momento en que llega la nave.",
      "La nave ya no aterriza en el centro de la luna: aterriza en la base de cada expedición (en la nueva, y cuando la luna está llena, en una base al azar) y se queda posada ahí unos segundos.",
      "Cuando la nave aterriza en una base y se arman los caminos, sale de esa base un pulso de energía que recorre toda la red conectada, iluminando cada base a su paso.",
    ],
  },
  {
    v: "0.23.0",
    fecha: "2026-10-04",
    cambios: [
      "Los honguitos básicos ahora son todos de sombrero rojo (antes eran de varios colores), y sus esporas también son rojas.",
      "Todos los honguitos, básicos incluidos, tienen 2 o 3 lunares blancos en el sombrero, en posiciones al azar distintas para cada uno, como un hongo de verdad (y como el hongo madre).",
    ],
  },
  {
    v: "0.22.7",
    fecha: "2026-10-04",
    cambios: [
      "Las esporas ya no llegan todas a una misma línea del sombrero del hongo madre: cada una viaja a un punto al azar dentro del sombrero.",
    ],
  },
  {
    v: "0.22.6",
    fecha: "2026-10-04",
    cambios: [
      "La luna sube un poco más (puede quedar detrás de la barra de prestigio) y se aleja más hacia la derecha.",
    ],
  },
  {
    v: "0.22.5",
    fecha: "2026-10-04",
    cambios: [
      "La luna es un poco más grande y ahora está fija en el mundo, en el cielo a la derecha del hongo madre: al acercar el zoom crece junto con todo y se sale de la pantalla, como una nube.",
    ],
  },
  {
    v: "0.22.3",
    fecha: "2026-10-04",
    cambios: [
      "La luna se movió más a la derecha y ahora siempre queda al costado del sombrero del hongo madre, por grande que este se ponga, para que nunca la tape.",
    ],
  },
  {
    v: "0.22.1",
    fecha: "2026-10-04",
    cambios: [
      "El contador de esporas/s ahora es un ranking: los tipos de honguito van ordenados de mayor a menor producción y cada uno tiene una barra horizontal de color proporcional a lo que produce (la más grande es la que más produce).",
      "Los científicos tienen su propio ranking aparte, debajo, llamado Investigación (con puntos/s y su barra).",
    ],
  },
  {
    v: "0.22.0",
    fecha: "2026-10-04",
    cambios: [
      "Nuevo edificio: Torre de magos hongil (tier 5; el Gym, el Trade center y el Astropuerto subieron un tier). Torre alta con sombrero de mago, ventanas encendidas y un caldero con fuego al costado. Nuevo honguito: Mago (sombrero puntiagudo con estrella): revuelve su caldero y de la poción salen esporas, y purifica nubes de contaminación lanzándoles rayos.",
      "Contaminación rehecha: ahora es una cantidad que sube con los obreros y baja con los magos. Cada nube que purifican se convierte en esporas (2 s de tu producción). Con suficientes magos se limpia más rápido de lo que se contamina.",
      "Mejoras de edificio rehechas: ahora son por niveles (se compran varias veces, cada nivel cuesta más), con efectos distintos según el edificio. Escuela: graduados que recogen eventos solos. Vivero: compost que abarata los honguitos. Fábrica: sobrecarga (interruptor), filtros y paraguas contra la lluvia ácida. Torre: purga más rápida, bola de cristal y mano del destino. Trade: terminal de alta frecuencia y apuesta de riesgo. Astropuerto: colonia lunar (+% por base lunar) y satélites (más producción sin conexión). Universidad: becas que abaratan la investigación. Siguen las de productividad, críticos, velocidad, sinergias y buffs, pero ya no son las mismas en todos.",
      "Eventos del cielo: cada 1 a 3 minutos aparece algo flotando que hay que tocar antes de que se vaya: Espora dorada (esporas de golpe), Fiebre del micelio (todo ×7 por 20 s) y Cometa de ideas (puntos de investigación). Aviso con un cartelito arriba.",
      "La luna ahora siempre está en el cielo, a una altura fija en la pantalla y del mismo tamaño con cualquier zoom, así que se ve completa al alejar al máximo.",
    ],
  },
  {
    v: "0.21.0",
    fecha: "2026-10-04",
    cambios: [
      "El botón de mover/intercambiar pasó a ser un ícono de dos flechas en círculo, al lado de la ✕ de cerrar.",
      "Universidad: ahora se investiga en vez de gastar esporas. Hay un honguito nuevo, el Científico, que genera puntos de investigación por segundo: cuantos más, más rápido se investiga. Se investiga de a una cosa (la barra de progreso se ve en la ventana) y al terminar sigue sola con el nivel siguiente.",
      "Las investigaciones son por niveles (10 por tema: General y uno por cada tipo de honguito). Cada nivel da un % chico de producción (desde ~0,5% hasta ~4%) que se sortea distinto en cada partida. Cada tema exige tener su edificio.",
      "Mejoras de edificio (se compran con esporas en la ventana de cada edificio, y piden tener cierta cantidad de honguitos del tipo): productividad, velocidad (animaciones y ciclos más cortos), golpes críticos (de golpe 12 s de producción, con destello dorado), sinergias (por ejemplo cada 10 maestros +3% a la velocidad de investigación; cada 10 atletas +2% a los obreros) y filtros de chimenea.",
      "Habilidades activas: buffs temporales ×2 durante 30 s con recarga de 5 min (Semana de exámenes, Gira mundial, Cinta turbo, etc.). Se ven con chispas doradas sobre esos honguitos y corren con el reloj real.",
      "Hitos de cantidad: al tener 25, 50, 100, 200, 400 y 800 honguitos de un tipo, ese tipo produce ×2 más por cada umbral. Cada ventana muestra el próximo hito.",
      "Los científicos hacen experimentos con matraces de colores y a veces se les prende el foco de una idea.",
    ],
  },
  {
    v: "0.20.0",
    fecha: "2026-10-04",
    cambios: [
      "Zoom: las partículas y animaciones en el aire (esporas viajando, lluvia ácida, humo, notas, sudor, destellos) ya no se quedan pegadas a la altura de la pantalla: acompañan al piso al acercar o alejar.",
      "Nuevo edificio: Universidad hongil (sombrero turquesa con birrete y foco de ideas que parpadea, columnas, puerta en arco y escalones). No produce esporas ni tiene honguitos: en su ventana se investigan tecnologías.",
      "Tecnologías: 2 generales (Método científico ×1,25 a todos; Becas de investigación ×1,5, después de la anterior) y 2 por cada edificio con honguito (+50% y luego ×2 para su tipo, por ejemplo \"Herramientas de precisión hongil\" para los obreros de la fábrica). Cada una exige tener el edificio de su tema. Además, \"Filtros de chimenea hongiles\" (fábrica) reduce un 35% el castigo de la lluvia ácida.",
      "Las tecnologías ya investigadas aparecen listadas en la ventana del edificio de su tema.",
    ],
  },
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
