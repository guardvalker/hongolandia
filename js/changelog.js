export const CHANGELOG = [
  {
    v: "0.56.3",
    fecha: "2026-10-06",
    cambios: [
      "Las montañas de esporas ahora tienen un tamaño fijo en el mundo: antes su altura máxima dependía de cuánto zoom tenías (alejando el zoom las montañas se hacían enormes). Ahora la montaña llena mide la mitad de la pantalla al zoom inicial y no cambia al acercar o alejar.",
    ],
  },
  {
    v: "0.56.2",
    fecha: "2026-10-06",
    cambios: [
      "Aclaración de unidades en la logística: la producción (esporas/s) mide VALOR (muy grande en el final), mientras que lo que llevan los básicos son GRANOS de espora sueltos (cantidad). Cada grano vale muchas esporas. La ventana del hongo madre ahora lo dice («cada grano vale hoy ~X esporas»), la fila del honguito en el contador muestra «gr/s» y «En el piso» se cuenta en granos.",
    ],
  },
  {
    v: "0.56.1",
    fecha: "2026-10-06",
    cambios: [
      "Arreglo de balance de la logística: con los manojos al máximo (×8128 por viaje) un solo honguito básico alcanzaba para llevar todas las esporas, así que la cantidad de básicos no importaba. Ahora cada nivel de «Manojos más grandes» sube ×1,12 (en vez de ×1,35; al máximo ×30) y los hitos de cantidad de básicos agrandan el manojo a medias (×1,41 por hito en vez de ×2). Con eso hacen falta muchos más honguitos básicos para llevar todo, como se pretendía.",
      "Las partidas anteriores a la logística ahora reciben los honguitos básicos que hagan falta en vez de niveles de mejora. Si tu partida venía con pocos básicos, vas a ver el transporte por debajo del 100% hasta que compres más.",
    ],
  },
  {
    v: "0.56.0",
    fecha: "2026-10-06",
    cambios: [
      "Se pueden vender honguitos: nuevo botón «+/−» junto a ×1, ×10, ×100 y Máx en las ventanas de honguitos. Con el modo en «−» (botón naranja) los botones de cada honguito se ponen rojos y, en vez de comprar, venden la cantidad elegida y te devuelven TODO lo que costaron esas unidades (por si compraste uno por error). El honguito básico nunca baja de 1 porque es el único que lleva las esporas. El modo vuelve a «+» cada vez que abrís una ventana.",
    ],
  },
  {
    v: "0.55.1",
    fecha: "2026-10-06",
    cambios: [
      "El contador de esporas/s de la esquina ahora tiene una fila «Toques» (amarilla) que muestra cuántas esporas por segundo estás generando con los clicks (manuales y del autoclick, promedio de los últimos segundos) y se ordena con los demás por tamaño. El total también las suma. La fila desaparece sola cuando dejás de tocar.",
    ],
  },
  {
    v: "0.55.0",
    fecha: "2026-10-06",
    cambios: [
      "Montañas de esporas: las esporas que los básicos no alcanzan a llevar ya no son pilitas: cada lugar que suelta esporas (el hongo madre por tus toques, y cada edificio con honguitos productores) va levantando su propia montaña de granitos de espora DETRÁS del edificio, con el color de su honguito. Si falta logística crecen y crecen; cuando una llega a la mitad de la pantalla (~45 segundos de lo que se suelta ahí) colapsa: se hunde en el piso con polvo y granitos que caen, y las esporas que tenía se pierden.",
      "El autoclick ahora toca solo mientras tenés el mouse (o el dedo apoyado) sobre el hongo madre; podés seguir tocando a mano al mismo tiempo y se suman ambos. Si no lo tenés encima, no hace nada.",
      "Los básicos ahora van a juntar a las montañas más grandes primero (en proporción a su tamaño) y siguen llevando el manojo al hongo madre.",
    ],
  },
  {
    v: "0.54.0",
    fecha: "2026-10-06",
    cambios: [
      "10 mejoras de sinergia entre honguitos, una por edificio, que además de tener cantidad del propio tipo piden cantidad de OTRO tipo (idea de la wiki, donde Alquimia pide 8 científicos): Himno escolar (10 músicos), Clases de canto (20 maestros), Huerto escolar (30 maestros), Cinta de cosecha (20 jardineros), Herramientas de fábrica (25 obreros), Grimorio razonado (10 científicos), Poción deportiva (20 magos), Patrocinios (20 atletas), Cartas de navegación (30 mineros) y Cristales estelares (20 astronautas). Cada una suma un bono de producción al honguito de su edificio por cada N honguitos del otro tipo. El botón muestra cuántos te faltan del otro tipo.",
    ],
  },
  {
    v: "0.53.0",
    fecha: "2026-10-06",
    cambios: [
      "Evento arcano nuevo: Brote de cristales (aparece desde el nivel 20 de prestigio). Brotan hongo-cristales por todo el piso y van creciendo: cuanto más grandes los cosechás tocándolos, más esporas rinden (de 10 a 80 segundos de producción), pero si esperás de más tiemblan y se rompen. De vez en cuando brota uno gigante que rinde ×2,5. Hay más cristales con más prestigio.",
    ],
  },
  {
    v: "0.52.0",
    fecha: "2026-10-06",
    cambios: [
      "Contenido para el final del juego: nuevo edificio, la Cristalería hongil (décimo tier, después del Astropuerto; pide 10 traders), y un honguito nuevo, el Cristalero, que talla hongo-cristales junto a la cristalería, los frota con destellos y suelta lluvias de esporas luminosas. Es el honguito más productivo de todos.",
      "La Cristalería tiene su propio dibujo (un gran hongo-cristal en la copa con un halo que respira), 10 niveles de investigación en la Universidad y 4 mejoras: Tallado fino, Facetas veloces, Cosecha de brillo y Resonancia de cristal.",
    ],
  },
  {
    v: "0.51.0",
    fecha: "2026-10-06",
    cambios: [
      "Evento arcano nuevo: Géiseres de esporas. Durante ~18 segundos brotan géiseres a lo largo del piso que van soltando esporas en las pilas; hay que tocarlos para que erupcionen en grande (x4 de esporas y una lluvia de esporas al piso). Como las esporas caen al piso, los básicos las tienen que llevar: sirve para ver si tu logística aguanta. Aparece desde el nivel 10 de prestigio y hay más géiseres con más prestigio.",
      "Dos mejoras de logística nuevas con requisito de cantidad (como en la wiki): Cuadrillas de cargadores (manojos +2% por nivel por cada 10 básicos, necesita 25 básicos) y Relevos en el camino (los viajes duran 5% menos por nivel, necesita 50 básicos).",
      "10 artefactos nuevos: Hamaca de micelio, Guantes de hoja, Lupa de cristal (más esporas cristalinas), Brújula de esporas, Fuelle de géiser, Tapón de corcho, Red de gasa (Esporada más grande), Corona de rocío, Raíz maestra y el legendario Madre de las esporas (manojos ×2). Ya hay 63 en total.",
    ],
  },
  {
    v: "0.50.2",
    fecha: "2026-10-05",
    cambios: [
      "El contador de esporas/s tiene una sección «Logística» aparte (como la de Investigación) con el honguito básico, que muestra cuántas esporas por segundo alcanzan a llevar al hongo madre (en rojo si no dan abasto), y debajo el porcentaje de transporte y las esporas que esperan en el piso.",
    ],
  },
  {
    v: "0.50.1",
    fecha: "2026-10-05",
    cambios: [
      "El honguito básico ahora es un hongo puramente logístico: ya no produce esporas, solo las junta del piso y las lleva al hongo madre. Las esporas salen de tus toques y de los demás honguitos (maestros, músicos, etc.), así que el arranque de la partida depende de tocar el hongo madre hasta comprar la primera escuela.",
      "Lo que antes mejoraba la producción de los básicos ahora agranda sus manojos: los hitos de cantidad (25, 50, 100… honguitos básicos ×2 la carga), la mejora Rocío, el artefacto Cuenco de micelio dorado y los linajes de básicos de prestigio. El honguito básico ya no aparece en el ranking de esporas/s.",
    ],
  },
  {
    v: "0.50.0",
    fecha: "2026-10-05",
    cambios: [
      "NUEVA MECÁNICA: logística de esporas. Las esporas ya no llegan solas al hongo madre: cada honguito suelta esporas al piso (se amontonan en pilas junto a su edificio) y tus toques también sueltan una. Los honguitos básicos son los cargadores: van a una pila, juntan un manojo que crece sobre su cabeza, lo llevan al hongo madre y lo entregan. Solo cuentan para tu total las esporas que llegan.",
      "Si hay más esporas que las que los básicos alcanzan a llevar, se acumulan en el piso (el panel de esporas/s muestra «Transporte» en rojo con el porcentaje que llega y «En el piso» con las que esperan). Más básicos, manojos más grandes o caminar más rápido destraban el cuello de botella.",
      "Nueva sección «Logística de esporas» en el hongo madre con mejoras por niveles: Manojos más grandes (cada nivel ×1,35 esporas por viaje, el manojo se ve más alto), Zancadas largas (+10% velocidad), Senderos de micelio (caminos 5% más cortos) y Recolección ágil (juntar tarda 7% menos). Cuestan unos segundos de tu producción, así que siempre son alcanzables.",
      "Más cosas relacionadas: 3 artefactos nuevos (Cesta de mimbre, Botas de raíz, Sendero de musgo) y 4 mejoras de prestigio (Manojos ancestrales, Piernas de raíz, Veredas de micelio y Manojo eterno). Los edificios lejanos alargan el viaje.",
      "Las partidas anteriores reciben automáticamente los niveles de logística necesarios para que todo siga llegando.",
    ],
  },
  {
    v: "0.49.1",
    fecha: "2026-10-05",
    cambios: [
      "La «Lluvia de gemas» se reemplaza por la «Esporada» (más acorde a la temática del juego): una nube suelta esporas de los colores de los honguitos que bajan flotando y se mecen; tocarlas las atrapa y da 20 a 45 segundos de producción. Algunas son esporas cristalinas (hongo-cristal) y valen el triple. Las que no atrapás se pierden a los ~10 s. Mismas reglas de aparición (desde el nivel 6 de prestigio de la corrida).",
    ],
  },
  {
    v: "0.49.0",
    fecha: "2026-10-05",
    cambios: [
      "Evento arcano nuevo: Lluvia de gemas (tomado de las calamidades de reward de la wiki de Dwarf Eats Mountain). Caen decenas de gemas de colores por todo el mapa y cada una que tocás da entre 20 y 45 segundos de producción (con el bono de las esporas doradas); las que no tocás se pierden a los ~10 s (titilan antes de irse). Las «Redes del cielo» juntan algunas solas. Cuanto más prestigio, más gemas caen. Aparece desde el nivel 6 de prestigio de la corrida.",
      "Los eventos arcanos ahora se eligen con una tabla de tier, peso y nivel mínimo en lugar de porcentajes fijos, para poder sumar más fácilmente eventos nuevos y que los fuertes aparezcan más tarde.",
    ],
  },
  {
    v: "0.48.1",
    fecha: "2026-10-05",
    cambios: [
      "Herramienta de diagnóstico de rendimiento: se puede abrir el juego con ?off=madre,edif,hong,part,mina,luna,fondo,todo en la dirección para apagar partes del dibujo y ver cuál gasta más placa de video (por ejemplo ?off=hong,part).",
    ],
  },
  {
    v: "0.48.0",
    fecha: "2026-10-05",
    cambios: [
      "Modo de dibujo WebGL (beta), etapa 1: nuevo ajuste «Dibujo (beta)» en Ajustes → Rendimiento (Clásico / WebGL, recarga el juego al cambiar). Con WebGL, el fondo y el frente se pintan como siempre en lienzos y el hongo madre y los edificios pasan a ser sprites de la placa de video entre esas dos capas. PixiJS se carga solo si lo activás (vendor/pixi.min.js). Si WebGL no está disponible, el juego sigue en modo clásico. Por defecto sigue el modo clásico.",
    ],
  },
  {
    v: "0.47.2",
    fecha: "2026-10-05",
    cambios: [
      "Prototipo de prueba de WebGL (no afecta al juego): proto/webgl.html compara la misma escena dibujada con Canvas 2D y con WebGL. Se abre con ?r=2d o ?r=gl, y ?n=cantidad de honguitos&p=cantidad de partículas.",
    ],
  },
  {
    v: "0.47.1",
    fecha: "2026-10-05",
    cambios: [
      "Más optimización del dibujo, sin cambiar cómo se ve: lo que está fuera de la pantalla (hongo madre, edificios, luna, mina) ya no se pinta ni se copia, y lo visible se copia recortado a la pantalla.",
      "El cuerpo de cada honguito (sprite, lunares y espejo) y el cuerpo de cada edificio (sombrero, manchas, tallo) se arman una sola vez y se copian; las tres capas de la mina se funden en una. Las estructuras cacheadas se comparten entre honguitos (24 patrones de lunares).",
      "Las mejoras de prestigio se consultan por clave en vez de recorrer la lista completa en cada cuadro. En total, las operaciones de dibujo en el endgame bajaron de ~2,9 millones a ~0,19 millones por segundo.",
    ],
  },
  {
    v: "0.47.0",
    fecha: "2026-10-05",
    cambios: [
      "Optimización fuerte del dibujo (menos uso de la placa de video, sobre todo en el endgame): el hongo madre, los edificios y la luna ya no se vuelven a pintar rectángulo por rectángulo en cada cuadro. Se pintan en su propio lienzo y entre medio solo se copian (madre y edificios ~20 veces por segundo, luna 10); el apretón y el brillo del pulso del hongo madre se aplican al copiar. Los discos de luz y esporas son sprites. En una partida de endgame bajó de ~2,9 millones a ~0,3 millones de operaciones de dibujo por segundo.",
      "El campo de color de las luces del sombrero del hongo madre se calcula como una imagen chica que se agranda de una vez, en lugar de miles de rectángulos.",
      "Nuevo ajuste «Cuadros por segundo» en Ajustes → Rendimiento: 30, 60 (por defecto) o sin límite. Antes el juego dibujaba a la frecuencia completa del monitor (120/144 Hz), lo que duplicaba el gasto en monitores rápidos.",
    ],
  },
  {
    v: "0.46.1",
    fecha: "2026-10-05",
    cambios: [
      "Las ventanas siempre quedan por encima de todo lo demás (cartelitos de aviso, números flotantes, HUD y botones).",
      "Todas las ventanas ahora se abren centradas en la pantalla, como las de Ajustes y Cofre; antes algunas (como Prestigio) salían abajo.",
      "Botón «Prestigio» abajo a la izquierda, encima de «Hongo madre»: se ilumina y muestra los PP que ganarías al prestigiar. Tocar la barra de arriba sigue funcionando.",
    ],
  },
  {
    v: "0.46.0",
    fecha: "2026-10-05",
    cambios: [
      "Los edificios ahora piden tener cierta cantidad de honguitos del edificio anterior (idea de la wiki de Dwarf Eats Mountain, donde un edificio pide 6 mineros): Conservatorio 10 maestros, Vivero 10 músicos, Universidad 8 jardineros, Fábrica 5 científicos, Mina 10 obreros, Torre de magos 10 mineros, Gimnasio 10 magos, Trade center 10 atletas y Astropuerto 10 traders. El botón muestra cuántos tenés (por ejemplo 3/10 maestros).",
    ],
  },
  {
    v: "0.45.1",
    fecha: "2026-10-05",
    cambios: [
      "Rebalanceo de las mejoras de prestigio tras simular varias corridas seguidas: las mejoras de producción de los tiers altos son más suaves (Micelio profundo ×1,06 por rango, Esporas ancestrales ×1,3, Corazón del micelio ×1,6, Rey del micelio ×2, Linajes +10%), Hitos tempranos 5% por rango, Regateo 3% y Memoria del micelio +0,3% por PP.",
      "Las mejoras Eternas ahora se multiplican entre sí (×1,01 por rango) y cada 20 rangos suben 1 PP de costo, para que sirvan como pozo de PP en el juego avanzado.",
    ],
  },
  {
    v: "0.45.0",
    fecha: "2026-10-05",
    cambios: [
      "Muchas más mejoras de prestigio (de 15 a más de 80), siguiendo la estructura de la wiki de Dwarf Eats Mountain: 6 tiers que se destraban al gastar 12 / 45 / 120 / 180 / 250 PP y un tier de Eternas (se destraba con el primer PP gastado) con rangos sin tope.",
      "Arranque de corrida: Semillas heredadas, Herencia de esporas, Reservas brillantes (+1.000 por tier destrabado), Herencia dorada y Legado robusto (según los PP gastados), Reliquia de la abuela (un artefacto común de arranque), Autoclick heredado y Aprendices gremiales (los primeros honguitos de cada tipo salen gratis).",
      "Efectos que saltan solos: Reclutas de la pradera (honguito gratis cada 3 niveles), Periódico de herencias (chance de +1 PP por nivel), Tesoros enterrados (chance de artefacto gratis por nivel) y Reflejos de crisis (producción extra 6 s al empezar un evento). Los avisos aparecen como cartelitos.",
      "Artefactos: Reliquia heredada y Bóveda de reyes (conservar artefactos al prestigiar), Reliquia divina (conserva siempre los de mayor tier), Fortuna del mercader, Buscatesoros (más ofertas) y Hallazgos garantizados (las primeras visitas traen un épico o legendario).",
      "Linajes por tipo (+15% de producción por rango para cada tipo de honguito, estilo «Ancestor's Picks»), Linajes eternos (+3% por rango sin tope), Conquista eterna, Dedos eternos, y mejoras para la dungeon, la mina, la luna, las invasiones, los toques, el autoclick y los eventos del cielo. Los tiers todavía bloqueados muestran qué contienen y cuántos PP faltan para abrirlos.",
    ],
  },
  {
    v: "0.44.0",
    fecha: "2026-10-05",
    cambios: [
      "¡Prestigio con reset! Tocá la barra de prestigio de arriba para abrir la ventana: «Prestigiar» reinicia la corrida (esporas, honguitos, edificios, torres, mejoras y artefactos) y te da 1 PP por cada nivel de prestigio que alcanzaste (a nivel 14 ya tenés 14 PP). Se conservan tus PP, las mejoras de prestigio, los mercenarios y el progreso de la dungeon, y los hongos del fondo. Pide confirmación.",
      "Mejoras de prestigio (idea de la wiki de Dwarf Eats Mountain): 4 tiers que se destraban al GASTAR PP (12, 45 y 120) y cada rango cuesta tanto PP como su tier. Tier 1: Semillas heredadas, Herencia de esporas, Micelio profundo, Dedos ancestrales, Cosecha dorada. Tier 2: Autoclick heredado, Hitos tempranos, Regateo, Cuentas claras. Tier 3: Reliquia heredada (conservás artefactos al azar), Memoria del micelio, Sueño largo. Tier 4: Esporas ancestrales, Mercader amigo, Sellos viejos.",
    ],
  },
  {
    v: "0.43.0",
    fecha: "2026-10-05",
    cambios: [
      "Los artefactos del Mercader ahora tienen tier y peso de aparición (idea tomada de la wiki de Dwarf Eats Mountain): Común (peso 80), Raro (50), Épico (25) y Legendario (8). Las 5 ofertas se sortean con ese peso, nunca repiten uno que ya tenés, y cuantos más niveles de prestigio tengas más seguido salen los tiers altos (hasta ×3 a nivel 100). Cuatro artefactos fuertes pasaron a Legendario (Pluma de fénix, Mapa de los edificios, Cristal de resonancia, Ábaco de espinas, que ahora cuestan más). El tier se ve en el nombre y en el color de cada oferta y en el Cofre.",
    ],
  },
  {
    v: "0.42.0",
    fecha: "2026-10-05",
    cambios: [
      "Tocar el hongo madre ahora junta esporas (1 por toque al principio), con un «+N» flotante. La ventana del hongo madre (honguitos, edificios y mejoras) se abre con el botón «Hongo madre» abajo a la izquierda.",
      "Sección «Toques» en el hongo madre con mejoras por niveles: Toque firme (+1 espora por toque por nivel), Savia en la campana (+1% de tus esporas/s por toque por nivel) y Manos de micelio (toques ×2 por nivel). Van apareciendo a medida que juntás esporas.",
      "Autoclick: se desbloquea en el hongo madre y toca solo 1 vez por segundo con la mitad del valor de un toque. «Autoclick veloz» suma 0,5 toques/s por nivel (hasta 7/s) y «Autoclick potente» sube el valor de cada toque automático hasta el 100%. La Fiebre del micelio también multiplica los toques.",
    ],
  },
  {
    v: "0.41.1",
    fecha: "2026-10-04",
    cambios: [
      "Los invasores ahora nacen siempre fuera de la pantalla, incluso con el zoom al máximo alejado: aparecen más allá del borde visible y caminan o vuelan hasta la base (tardan más en llegar).",
    ],
  },
  {
    v: "0.41.0",
    fecha: "2026-10-04",
    cambios: [
      "Las invasiones ahora son hordas: decenas de enemigos (hasta ~130) que entran caminando y volando desde los costados, fuera de la pantalla, en varias oleadas. Hay 5 tipos: Saqueadores (cuerpo a cuerpo), Arqueros ladrones (frenan a distancia y apuntan a la base), Hechiceros (magia: frenan lejos, tardan en lanzar y protegen con un escudo a los que tienen cerca, un 30% menos de daño), Murciélagos (voladores rápidos que los soldados no alcanzan) y, cada 3 invasiones, un Behemoth gigante. Los tipos nuevos aparecen a medida que pasan las invasiones.",
      "Escalan con el prestigio: la vida de los enemigos y su cantidad suben con tus niveles de prestigio (y un poco con cada invasión), más rápido de lo que sube el daño base de torres y soldados, así que hace falta ejército, torres y mejoras. Sin defensas es una masacre: los que llegan a la base roban un porcentaje de tu progreso del nivel de prestigio (hasta el 75% por invasión, 40% la primera vez; nunca te bajan de nivel). Tocarlos con el dedo les pega.",
      "Los soldados ya no derriban enemigos en abstracto: reparten su daño entre los terrestres más cercanos y traban a los cuerpo a cuerpo. No alcanzan a los voladores.",
      "Torres de defensa nuevas (desde la Barraca podés construir hasta 8, cada una cuesta más; las ubicás tocando el piso). Perdieron alcance: la básica llega mucho menos que antes. Cada torre básica evoluciona una sola vez a una especial: Ráfaga (disparo rapidísimo), Francotiradora (muchísimo alcance y daño, apunta al más duro), Mortero explosivo (daño en área, solo tierra), Criogénica (ralentiza a la mitad) o Tesla (rayo en cadena entre enemigos).",
      "Cada torre puede consumir hasta 10 soldados de la Barraca: cada uno da +12% daño, +6% cadencia y +3,5% alcance, y cada 3 le suman un cañón extra. Los soldados que entran quedan para siempre en la torre (se ven en el parapeto) y no vuelven a caminar ni a defender solos. Tocá una torre para evolucionarla y sumarle soldados. Tu torre de defensa anterior pasó a ser una torre básica. El Entrenamiento ahora mejora a soldados y torres, y la Cúpula/Refuerzo se compran en la Barraca (necesitan al menos una torre).",
    ],
  },
  {
    v: "0.40.0",
    fecha: "2026-10-04",
    cambios: [
      "En el contador de esporas/s, cada tipo de honguito con la producción reducida (por meteoritos, lluvia ácida o cualquier otra cosa) se marca en rojo, con una flechita ▼.",
      "Nuevo ícono de cofre arriba a la izquierda: abre el Cofre del mercader con los 50 artefactos. Los que no compraste se ven oscuros (como siluetas, sin nombre); los comprados se ven a color y al tocarlos muestran su descripción. El contador de esporas/s bajó para dejarle lugar.",
    ],
  },
  {
    v: "0.39.3",
    fecha: "2026-10-04",
    cambios: [
      "La lluvia de meteoritos es mucho más larga (16 meteoritos o más, hasta 45 con muchos magos; dura unos 25–35 s) y los meteoritos son más del doble de grandes, con estela larga, explosión y cráteres más grandes que duran más.",
      "El daño ahora se nota: los edificios golpeados (y el hongo madre) echan humo y brasas mientras dura la baja de producción (más fuerte y más larga: 60 s), y el aviso final dice qué edificios quedaron dañados.",
    ],
  },
  {
    v: "0.39.2",
    fecha: "2026-10-04",
    cambios: [
      "Ajustes ahora se abre centrado en la pantalla, igual que las demás ventanas, con el mismo layout compacto (botones más chicos).",
    ],
  },
  {
    v: "0.39.1",
    fecha: "2026-10-04",
    cambios: [
      "Ajustes tiene una sección nueva «Admin (pruebas)» con botones para disparar eventos al instante: los tres del cielo (espora dorada, fiebre del micelio, cometa de ideas) y los cuatro arcanos (tormenta, meteoritos, mercader, invasión). Los arcanos no se superponen: si hay uno en curso, avisa.",
    ],
  },
  {
    v: "0.39.0",
    fecha: "2026-10-04",
    cambios: [
      "La ventana de la exploración de la dungeon se puede plegar tocándola: queda solo el título y la barra de 5 etapas. Recuerda cómo la dejaste.",
      "Eventos arcanos de los magos: desde que tenés 10 magos en la Torre, cada tanto pasa algo en el mapa (más seguido con más magos). Hay un aviso arriba con el evento en curso.",
      "Tormenta de esporas: llueven esporas de colores y la producción se multiplica durante unos segundos. Lluvia de meteoritos: caen del cielo; los que impactan dejan un cráter y le sacan producción un rato al edificio que golpean (y a sus honguitos); los destruidos en el aire dejan esporas. Mercader hongil: viene caminando, tocalo y te ofrece 5 artefactos al azar de un total de 50; podés quedarte con uno solo y sus efectos duran hasta el próximo prestigio. Invasión de criaturas: ladrones de esporas corren hacia el hongo madre; tocalos para derribarlos. Los que lleguen roban parte del progreso del nivel actual de la barra de prestigio (nunca te bajan de nivel).",
      "50 artefactos distintos, cada uno con su ícono de píxeles: suben la producción de cada tipo de honguito o de todos, abaratan honguitos, edificios y mejoras, bajan los umbrales de hitos, mejoran los eventos del cielo, la minería, la luna, la dungeon (velocidad, recompensa, cristales, curación, niveles, fuerza) y los eventos de los magos, alargan las invasiones, dan más botín, interceptan meteoritos y premian tener muchos edificios o honguitos básicos.",
      "La primera invasión desbloquea la Barraca hongil: ahí se hacen soldados que defienden solos las invasiones (salen corriendo a pelear con los ladrones; no producen esporas) y tiene mejoras de entrenamiento, alerta y botín. Desde la Barraca se puede construir la Torre de defensa hongil (muy cara): cañón que derriba criaturas y, con sus mejoras, una cúpula que intercepta meteoritos y un refuerzo que reduce el daño de los que igual caen.",
    ],
  },
  {
    v: "0.38.0",
    fecha: "2026-10-04",
    cambios: [
      "Luces del hongo madre rehechas (adiós a las luces LED pegadas): ahora los colores de los edificios se funden entre sí en un campo suave que fluye por todo el sombrero y el tronco, con patrones de luz que se turnan (una ola diagonal, anillos que salen del centro y rayos que giran). Todos los contornos del hongo (borde del sombrero, la línea de abajo, los costados del tronco y la base) se iluminan con los colores que van pasando. Alrededor hay esporas de colores que aparecen, brillan y se apagan, más densas y más intensas pegadas al hongo. Cuantos más edificios, más colores y más intensidad.",
      "Los mercenarios ahora muestran en su descripción (al tocar el título) sus estadísticas: vida, ataque, defensa, ataques por segundo y alcance, con cuánto mejoraron respecto de su base (por ejemplo «Vida 198 (base 150, +32%)»), su nivel y en cuántas exploraciones los ganaron, y si están heridos. El nivel también aparece en el título.",
    ],
  },
  {
    v: "0.37.0",
    fecha: "2026-10-04",
    cambios: [
      "Las ventanas son mucho más compactas: cada ítem (honguitos, edificios, mejoras, mercenarios, investigaciones, mejoras de la taberna) muestra solo su título y el botón; al tocar el título (el + a la izquierda) se despliega su descripción, y queda abierta aunque la lista se rearme. En la ventana de la dungeon, al tocar un objeto se muestra qué hace.",
      "Los cristales radiantes de la dungeon ahora van en el medio del tronco del hongo madre: una veta de dos columnas que sube desde la base por el eje, con brillo y destellos.",
      "El hongo madre tiene más animación y luces, y se vuelve multicolor a medida que se desbloquean edificios: franjas de color que se deslizan por el sombrero (una por cada color de edificio), un aura que respira, una guirnalda de luces que corren por el borde del sombrero y chispas de colores que suben. Cuantos más edificios, más luces y más colores.",
    ],
  },
  {
    v: "0.36.0",
    fecha: "2026-10-04",
    cambios: [
      "Todas las ventanas (hongo madre, cada edificio, dungeon) ahora son como la del hongo madre: se abren centradas en la pantalla, con el mismo tamaño y el mismo layout compacto, usan casi toda la altura y ya no se cortan contra el piso ni hay que scrollear tanto. Solo Ajustes sigue siendo la tarjeta ancha de abajo.",
      "La puerta de la dungeon ahora abre la ventana «Dungeon hongil» con las estadísticas: estado, exploraciones, victorias y retiradas, Rey Moho vencido, mejor etapa, cristales radiantes (con cuánto suben la producción), peligro de los enemigos y mercenarios (con cuántos heridos). Se actualiza en vivo.",
      "Objetos de la dungeon con ícono de píxeles propio: espada, escudo, botas, poción, amuleto, casco, runa y capa. La ventana muestra cuántos de cada uno encontraste en total (y cuántos raros) y, durante una exploración, cuáles están activos, con las estadísticas del party ya afectadas por ellos: ataque, defensa, vida, velocidad de ataque, críticos, esquiva y recompensa. El cartelito del objeto encontrado en la ventana de exploración también lleva su ícono.",
    ],
  },
  {
    v: "0.35.1",
    fecha: "2026-10-04",
    cambios: [
      "La ventana de la dungeon ahora es fija: siempre arriba a la derecha de la pantalla y del mismo tamaño (antes se movía con la mina y tapaba cosas).",
      "Los números de daño y curación ahora son nítidos (cifras de píxeles con borde oscuro, los críticos más grandes). El cartel del objeto encontrado y el resultado final ahora son texto del navegador: se leen bien, ya no están borrosos.",
      "El jefe es bastante más difícil y toda la dungeon también (el Rey Moho tiene mucha más vida, ataque y defensa; las etapas suben más de nivel de enemigos). Los mercenarios ahora suben un 4% por nivel (antes 8%): con 4 mercenarios de nivel 1 no se le puede ganar; hacen falta unas 8 o más exploraciones para pasar de nivel antes de poder vencerlo.",
      "El party ahora lleva a los 4 sanos de más nivel (antes iban en orden de clase). Si todos quedan heridos y no se puede explorar, descansan solos (un paso cada 45 segundos) para no trabarse. Si una pelea se alarga demasiado los enemigos se enfurecen y, pasado un tiempo, el party se retira.",
    ],
  },
  {
    v: "0.35.0",
    fecha: "2026-10-04",
    cambios: [
      "Nuevo edificio: Taberna hongil (1e18 esporas), que se desbloquea al encontrar la dungeon. Un hongo con pendón, cartel de jarra, ventanas cálidas y barriles. Ahí se contratan los honguitos mercenarios, que andan por la taberna cuando no están explorando.",
      "10 clases de mercenarios, cada una con su aspecto y sus ataques: Caballero (espada, provoca), Arquero (flechas y lluvia de flechas), Mago (bola de fuego en área), Curandero (cura al más herido), Invocador (espíritus aliados), Pícaro (críticos y botín extra), Bárbaro (más daño cuanto más herido), Bardo (aura que acelera al party), Alquimista (veneno y salpicadura) y Paladín (escudos sagrados). Cada clase se contrata una vez; suben de nivel al explorar.",
      "Exploración de la dungeon: sale un party de hasta 4 mercenarios sanos (los de más nivel), solo o automáticamente (se puede apagar). A la derecha de la mina se abre una ventana con la dungeon vista de costado: el party avanza de izquierda a derecha y pelea con lo que aparece, con una barra de 5 etapas. Al final de cada etapa encuentran un objeto al azar (espada, escudo, botas, poción, amuleto, casco, runa, capa) que mejora al party durante esa exploración; en la 5.ª está el Rey Moho. Con el party lleno hay más fuerza y la recompensa en esporas es mucho mayor.",
      "Recompensas: esporas por cada etapa superada y, si cae el jefe, una chance de un cristal radiante que sube un 5% toda la producción y queda engarzado en el tronco del hongo madre. Cada jefe vencido hace a los enemigos un 12% más fuertes.",
      "Nadie muere: el que cae queda herido y se sienta con una venda en la taberna hasta que se hagan 3 exploraciones más (con la mejora, menos), sin importar cómo les haya ido. Cuando termina la exploración se cierra la ventana, el party vuelve a la taberna y festeja si ganó algo.",
      "Mejoras de la taberna: Botas de explorador (exploración más rápida), Mapa del tesoro (objetos raros y más chance de cristal) y Botiquín (cura a los heridos en menos exploraciones).",
    ],
  },
  {
    v: "0.34.0",
    fecha: "2026-10-04",
    cambios: [
      "Primer paso de la dungeon: cuando los mineros terminan de cavar el 100% de la mina, aparece una puerta antigua al fondo (en una sala propia con antorchas y una luz violeta que late), la cámara se desliza hasta ahí y sale una ventana avisando «¡Dungeon encontrada!». Pasa una sola vez por partida; la puerta queda y, al tocarla, se vuelve a abrir el aviso. Todavía no se puede entrar: la exploración (el sistema RPG) viene después.",
      "La mina ahora llega al 100% con 60 mineros (antes habría hecho falta una cantidad inalcanzable con la economía nueva).",
      "La cámara ahora puede llegar a toda la mina, incluso cuando se extiende más que el resto del mundo. Las ventanas de aviso y los títulos recuperaron su color de acento.",
    ],
  },
  {
    v: "0.33.1",
    fecha: "2026-10-04",
    cambios: [
      "El hongo madre crece más: ahora son 3 celdas más de ancho por cada punto de prestigio (antes bastante menos). Prestigio 56 con 3 edificios mide unas 230 celdas; prestigio 100 con casi todos los edificios, unas 500. Sigue sin depender de las esporas directamente.",
    ],
  },
  {
    v: "0.33.0",
    fecha: "2026-10-04",
    cambios: [
      "El hongo madre crece mucho más despacio: ya no depende de la cantidad de esporas, solo de los puntos de prestigio (suave, también con lo que va llenando la barra) y de cuántos edificios construiste (+6% por edificio, más el empujón del Conservatorio). Con prestigio 100 y todos los edificios ahora mide unas 3 a 4 veces menos que antes; con prestigio 0 sigue empezando chiquito.",
    ],
  },
  {
    v: "0.32.1",
    fecha: "2026-10-04",
    cambios: [
      "Se sacó de la descripción del Conservatorio el texto del % que hace crecer al hongo madre: el efecto sigue ahí, pero ahora solo se nota visualmente.",
    ],
  },
  {
    v: "0.32.0",
    fecha: "2026-10-04",
    cambios: [
      "Los edificios ahora pueden tener condiciones de desbloqueo. Primeras dos: la Torre de magos hongil necesita haber investigado la Carrera de Hechicería, y el Trade center hongil necesita la Carrera de Finanzas. Mientras no estén, su botón en el hongo madre dice «Bloqueado» y explica qué falta.",
      "Nuevas «carreras» en la Universidad: se investigan con los científicos como cualquier otra investigación (Hechicería: 12.000 puntos; Finanzas: 60.000), no dan producción sino que abren la compra del edificio. Quedan anotadas en «Investigado». Los edificios que ya tenías construidos no se ven afectados.",
    ],
  },
  {
    v: "0.31.0",
    fecha: "2026-10-04",
    cambios: [
      "Economía rehecha con valores reales (se terminó el modo de prueba donde todo costaba 1). Calibrada con una simulación de un jugador que compra siempre lo que más rinde: el primer edificio (Escuela) llega a los ~8 min, el Conservatorio a ~16 min, el Vivero a ~30 min, la Fábrica a ~1 h 15, la Mina a ~2 h 40, la Torre a ~6 h, el Gym a ~11 h, el Trade center a ~15 h y el Astropuerto a ~21 h. Jugando de forma normal va a llevar más.",
      "Arranque lento y escala fuerte: el primer tramo es muy lento (el primer honguito rinde 0,1 esporas/s), pero cada tier nuevo produce proporcionalmente mucho más que el anterior (de ×9 a ×80 de un tier al siguiente, contra un costo que sube más despacio), así que desbloquear cosas acelera cada vez más. De ~1 esporas/s a los 10 minutos a ~1e15 esporas/s al llegar al final.",
      "Los honguitos ahora suben su precio ×1,15 por unidad (el básico) hasta ×1,24 (el último), en vez de ×1,25 a ×1,61.",
      "Cuatro mejoras grandes nuevas en el hongo madre para el resto de la partida: Red de micelio (×2), Simbiosis (×3), Gran micelio (×5) y Micelio ancestral (×10 a todos). Aparecen en la lista al haber ganado el 10% de su costo.",
      "Ojo: si tenías una partida de la versión de prueba, conserva todo lo que tenía pero ahora los precios nuevos son los reales.",
    ],
  },
  {
    v: "0.30.0",
    fecha: "2026-10-04",
    cambios: [
      "Nueva tipografía del texto (VT323): se lee mucho mejor, sobre todo los números y letras que antes se confundían (5, 2, S, etc.). Los números grandes siguen con la de siempre.",
      "Colores por edificio en las ventanas: el título, las secciones, el borde de cada fila, los botones de comprar y las notas toman el color del edificio al que pertenecen (el del honguito para sus propias filas). Los edificios en el hongo madre muestran su color.",
      "Estado de cada fila: las que podés pagar tienen el borde brillante, las que todavía no se ven apagadas, las mejoras por niveles tienen cuadraditos que se pintan al comprar cada nivel, y lo ya completado se ve en el color del edificio con ✓.",
      "Animaciones simples (a saltos, como el resto del arte): las filas entran de a una al abrir una ventana, destello al comprar, el botón da un destello cuando pasás a poder pagarlo, el número de honguitos rebota al subir, el cuadradito del nivel nuevo aparece con un pop y los botones se hunden al apretarlos. Se desactivan si el sistema pide menos movimiento.",
    ],
  },
  {
    v: "0.29.1",
    fecha: "2026-10-04",
    cambios: [
      "El número de versión ahora también se ve abajo a la izquierda de la pantalla, chiquito, como referencia rápida.",
    ],
  },
  {
    v: "0.29.0",
    fecha: "2026-10-04",
    cambios: [
      "Zoom alejado dinámico: cuando el hongo madre crece tanto que ya no entra en pantalla, aparecen más niveles de zoom para alejar, hasta poder verlo entero. Cuanto más crece, más se puede alejar (se agregan niveles solos, sin mover el zoom en el que estás).",
      "Con el zoom muy alejado los dibujos se ven más chicos y suaves, y el piso, las estrellas y las partículas se reparten por toda la pantalla.",
    ],
  },
  {
    v: "0.28.1",
    fecha: "2026-10-04",
    cambios: [
      "Las ventanas de mejoras (la del hongo madre y las de cada edificio) ahora siempre tienen el mismo tamaño (260 px de ancho, o todo el ancho en pantallas chicas) y ya no se deforman cuando el edificio es enorme o hay mucho zoom.",
      "Si la ventana no entra al costado del edificio (por ejemplo con el hongo madre gigante), se abre centrada en la pantalla.",
    ],
  },
  {
    v: "0.28.0",
    fecha: "2026-10-04",
    cambios: [
      "Los edificios se pueden construir directamente sobre el hongo madre (delante de su tronco): ya no los empuja al crecer. Cada edificio se queda exactamente donde lo ubicaste, por grande que se ponga el madre.",
      "Al tocar, los edificios y los honguitos que están delante del madre tienen prioridad sobre el madre (antes tocar uno que estaba delante del tronco abría el madre).",
    ],
  },
  {
    v: "0.27.2",
    fecha: "2026-10-04",
    cambios: [
      "Escaleras de la mina arregladas: antes había una en casi cualquier tramo inclinado y se pisaban entre sí. Ahora solo hay escaleras en los tramos verdaderamente empinados y largos, son rectas, y no se dibuja ninguna encima de otra. El resto de los tramos son rampas sin escalera.",
    ],
  },
  {
    v: "0.27.1",
    fecha: "2026-10-04",
    cambios: [
      "La mina es bastante más grande: túneles mucho más largos, más ramas y más salas, y se extiende más a lo ancho y a lo profundo.",
      "Arreglado: algunos túneles quedaban sin sala ni cristales al final. Ahora los túneles no suben tan cerca del piso (así siempre entra una sala) y todas las puntas terminan en una sala con yacimiento.",
    ],
  },
  {
    v: "0.27.0",
    fecha: "2026-10-04",
    cambios: [
      "La mina ahora es un hormiguero: túneles que serpentean, se ramifican y bajan en diagonal, con salas anchas en las puntas, vigas de madera y escaleras en los tramos empinados para que los mineros suban y bajen. Se cava de a poco hacia donde crece (con polvo en las puntas) y la forma depende de la partida.",
      "Los cristales ahora son yacimientos grandes: racimos de cristales-hongo en las salas que se achican a medida que los mineros los pican y, si los dejan tranquilos un rato, vuelven a crecer de a poco. Cada yacimiento aguanta a dos mineros a la vez.",
      "Nueva animación de picar: el minero levanta el pico hacia atrás y lo baja de golpe contra el cristal (con chispas y esquirlas) varias veces; ya no parece que barre. Cada golpe gasta un poco del yacimiento.",
      "Todo es más fluido y sin ciclos que se reinicien: al cargar la partida los mineros ya están repartidos por la mina (bajando, picando o subiendo), cada uno con sus tiempos, los yacimientos arrancan con cantidades distintas y la forma de la mina ya no se regenera al cambiar el tamaño de la pantalla ni se mueve a los mineros de golpe.",
    ],
  },
  {
    v: "0.26.0",
    fecha: "2026-10-04",
    cambios: [
      "Nuevo edificio: Mina hongil (tier 5; la Torre de magos, el Gym, el Trade center y el Astropuerto subieron un tier). Un hongo cobrizo con castillete y una rueda que gira (más rápido con más mineros), cristales en el sombrero y una boca de mina con rieles. Se ubica donde quieras, y la mina se cava debajo de donde la pongas.",
      "Nuevo honguito: Minero (sombrero cobrizo con casco y lámpara). Baja por el pozo, camina por los túneles hasta un cristal hongil (cristales con forma de hongo de varios colores), lo pica con su pico, lo sube a la mina y ahí se procesa: brilla el edificio y sale una espora del sombrero hacia el hongo madre. Los cristales vuelven a crecer con el tiempo.",
      "La mina se expande con la cantidad de mineros: empieza con un pozo y una galería, y se va cavando de a poco (con polvo en las puntas) en galerías, pasadizos y niveles más profundos, hasta ocupar cerca de un 30% del ancho del mundo. Las mejoras del edificio: Picos de cristal, Vagonetas, Veta rica y Red de túneles.",
      "Con el zoom acercado ahora también se puede arrastrar hacia arriba para ver bajo el piso, hasta el fondo de la mina.",
    ],
  },
  {
    v: "0.25.0",
    fecha: "2026-10-04",
    cambios: [
      "El pulso de energía de la luna ahora termina en esporas: cuando el frente de luz llega a cada base, esa base lanza una espora que viaja por el cielo hasta el hongo madre. Esa es la animación de producción del Astronauta (ya no salen esporas de golpe en la plataforma al volver).",
      "Con el zoom acercado ahora también se puede mover la pantalla de arriba a abajo, no solo de izquierda a derecha: arrastrá hacia abajo para ver más cielo (hasta la altura que se ve con el zoom más alejado). El botón de recentrar también vuelve a la altura original.",
    ],
  },
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
