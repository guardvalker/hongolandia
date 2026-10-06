import { D } from './decimal.js';

// ---- Valores ----
// MODO_PRUEBA: todo cuesta 1, los precios no crecen y los edificios aparecen desde el inicio, para
// probar cosas. En false se usan los valores reales, que salen de la fórmula por tier de abajo.
export const MODO_PRUEBA = false;

// Cada "tier" es un escalón de la economía: el honguito logístico es el tier 0 y cada edificio con su
// honguito es el siguiente. Para meter un edificio entre medio solo hay que ponerlo en la posición
// que corresponde (campo `tier`) y correr los de arriba un lugar: todo se recalcula.
//   producción  = 0,1 · (producto de SALTO_PROD hasta ese tier) esporas/s por unidad
//   costo base  = 8 · (producto de SALTO_COSTO hasta ese tier)  (el precio de cada unidad sube
//                 ×crecimiento por cada una que ya tenés)
//   crecimiento = 1,15 + 0,01·tier
//   edificio    = 1,2 × costo base de su honguito; aparece al haber ganado el 25% de su costo
//                 (el primer edificio, tier 1, aparece desde el inicio)
// Calibrado con una simulación de un jugador "codicioso" (siempre compra lo que más rinde por esporas):
// el primer edificio llega a los ~8 min, el 4.º a ~1 h 15, el 6.º a ~6 h y el último (Astropuerto) a ~21 h.
// El costo sube de a poco entre tiers pero la producción por unidad sube cada vez más rápido, así que
// al principio todo es lento y cada edificio nuevo que se desbloquea rinde proporcionalmente más.
const SALTO_COSTO = [1, 9, 22, 30, 36, 46, 58, 70, 84, 98]; // ×costo al pasar del tier k-1 al k // ×costo al pasar del tier k-1 al k // ×costo al pasar del tier k-1 al k
const SALTO_PROD = [1, 9, 8, 11, 16, 23, 32, 44, 60, 80]; // ×producción al pasar del tier k-1 al k // ×producción al pasar del tier k-1 al k
export function valoresTier(tier) {
  const k = Math.floor(tier), fr = tier - k;
  let lp = 0; // log de la producción relativa (los tiers con decimales, como el 3,5, se interpolan)
  for (let j = 1; j <= k; j++) lp += Math.log(SALTO_PROD[Math.min(j, SALTO_PROD.length - 1)]);
  if (fr > 0) lp += fr * Math.log(SALTO_PROD[Math.min(k + 1, SALTO_PROD.length - 1)]);
  let lc = 0;
  for (let j = 1; j <= k; j++) lc += Math.log(SALTO_COSTO[Math.min(j, SALTO_COSTO.length - 1)]);
  if (fr > 0) lc += fr * Math.log(SALTO_COSTO[Math.min(k + 1, SALTO_COSTO.length - 1)]);
  const costoBase = Math.ceil(8 * Math.exp(lc));
  const costoEdificio = Math.ceil(costoBase * 1.2);
  return {
    prod: 0.1 * Math.exp(lp),
    costoBase,
    crecimiento: 1.15 + 0.01 * tier,
    costoEdificio,
    desbloqueo: tier <= 1 ? 0 : Math.ceil(costoEdificio * 0.25),
  };
}
const C = (x) => (MODO_PRUEBA ? D(1) : D(x));

// Etapas del hongo madre: se alcanzan por total de esporas ganadas (histórico).
// Cada etapa cambia el sprite del hongo madre (assets/madre_N.png) y (más adelante)
// desbloquea tipos de honguitos.
export const ETAPAS = [
  { total: D(0) },
  { total: D(300) },
  { total: D(6e3) },
  { total: D(1.5e5) },
];

// Edificios que el jugador compra en el hongo madre y ubica en el piso. `x` (fracción del
// ancho de la pantalla) se guarda en state.edificios[id]. Cada uno tiene su propia ventana.
// Se listan en orden de tier (el orden es el de la ventana del hongo madre).
const EDIF_DEF = [
  {
    id: "escuela",
    tier: 1,
    nombre: "Escuela hongil",
    desc: "Un hongo con campana y pizarrón. Habilita a los maestros, que pasean con sus alumnitos y les dan clase.",
    color: "#b5e61d",
  },
  {
    id: "conservatorio",
    tier: 2,
    nombre: "Conservatorio hongil",
    desc: "Un hongo con aires musicales. Habilita a los músicos.",
    color: "#a77bff", // mancha que suma al sombrero del hongo madre
    crecimientoMadre: 1.15,
  },
  {
    id: "vivero",
    tier: 3,
    nombre: "Vivero hongil",
    desc: "Un hongo con invernadero. Habilita a los jardineros, que riegan el piso y hacen brotar honguitos pasajeros.",
    color: "#2fa84f",
  },
  {
    id: "universidad",
    tier: 3.5, // sin honguito propio: no produce, investiga (el tier solo fija su costo)
    nombre: "Universidad hongil",
    desc: "Un hongo con columnas y birrete. No produce esporas: investiga mejoras para los demás honguitos y tecnologías ligadas al tema de cada edificio.",
    color: "#2fd4c4",
  },
  {
    id: "fabrica",
    tier: 4,
    nombre: "Fábrica hongil",
    desc: "Un hongo con chimeneas y cinta transportadora. Habilita a los obreros, que fabrican hongos chiquitos... y humo verde que a veces vuelve como lluvia ácida.",
    color: "#9db4c8",
  },
  {
    id: "mina",
    tier: 5,
    nombre: "Mina hongil",
    desc: "Un hongo con castillete y puerta de mina. Habilita a los mineros: bajan por debajo del piso, cavan túneles (cuantos más hay, más se expande la mina) y suben cristales hongiles que se procesan en el edificio y se vuelven esporas.",
    color: "#c47a45",
  },
  {
    id: "torre",
    tier: 6,
    nombre: "Torre de magos hongil",
    desc: "Una torre con sombrero de mago y un caldero. Habilita a los magos: hacen pociones de hongos que dan esporas y purifican las nubes de contaminación, convirtiéndolas en esporas.",
    color: "#d12bff",
    requiere: "carrera_hechiceria", // se desbloquea investigando esa carrera en la Universidad
  },
  {
    id: "gimnasio",
    tier: 7,
    nombre: "Gym hongil",
    desc: "Un hongo con pesas. Habilita a los atletas, que entrenan afuera con mancuernas y sudan esporas.",
    color: "#ff8a1f",
  },
  {
    id: "trade",
    tier: 8,
    nombre: "Trade center hongil",
    desc: "Un hongo con pantallas de bolsa. Habilita a los traders: sus acciones suben y, al llegar arriba, cobran todas las esporas de golpe.",
    color: "#f5c518",
    requiere: "carrera_finanzas",
  },
  {
    id: "barraca",
    tier: 6.5,
    nombre: "Barraca hongil",
    desc: "Un cuartel con empalizada y estandarte. Habilita a los soldados, que defienden solos las invasiones de enemigos. Desde acá se construyen las torres de defensa.",
    color: "#8f9a5a",
    requiereFlag: "invasion", // se desbloquea con la primera invasión de criaturas
  },
  {
    id: "taberna",
    tier: 10, // solo para ordenar; el costo es fijo
    nombre: "Taberna hongil",
    desc: "Un hongo con farol y jarra de cerveza. Acá se contratan los honguitos mercenarios que exploran la dungeon que encontraron los mineros.",
    color: "#d9a441",
    requiereFlag: "dungeon", // se desbloquea al encontrar la dungeon
    costoFijo: 1e18,
  },
  {
    id: "astropuerto",
    tier: 9,
    nombre: "Astropuerto hongil",
    desc: "Un hongo con un cohete-hongo estacionado. Habilita a los astronautas, que viajan a la luna y la van llenando de bases hongiles.",
    color: "#4fb4ff",
  },
  {
    id: "cristaleria",
    tier: 10,
    nombre: "Cristalería hongil",
    desc: "Un hongo con un enorme cristal brillando en la copa. Habilita a los cristaleros, que tallan y pulen hongo-cristales.",
    color: "#5ef2ff",
  },
];
// Requisito de cantidad (como «The Great Maw pide 6 mineros» en la wiki de Dwarf Eats Mountain): para
// construir un edificio hay que tener antes cierta cantidad de honguitos del edificio anterior de la cadena.
export const REQ_EDIF = {
  conservatorio: { tipo: "maestro", n: 10 },
  vivero: { tipo: "musico", n: 10 },
  universidad: { tipo: "jardinero", n: 8 },
  fabrica: { tipo: "cientifico", n: 5 },
  mina: { tipo: "obrero", n: 10 },
  torre: { tipo: "minero", n: 10 },
  gimnasio: { tipo: "mago", n: 10 },
  trade: { tipo: "atleta", n: 10 },
  astropuerto: { tipo: "trader", n: 10 },
  cristaleria: { tipo: "astronauta", n: 10 },
};
export const EDIFICIOS = Object.fromEntries(EDIF_DEF.map((e) => {
  const v = valoresTier(e.tier);
  return [e.id, { ...e, reqHong: REQ_EDIF[e.id] || null, costo: C(e.costoFijo ?? v.costoEdificio), desbloqueo: e.costoFijo || MODO_PRUEBA ? D(0) : D(v.desbloqueo) }];
}));

// Bolsa (traders): sus ganancias no entran de a poco sino de golpe, cada `ciclo` segundos.
export const BOLSA = { ciclo: 18 };

// Lluvia ácida (la trae la contaminación de la fábrica): cada honguito mojado produce `pct` menos
// durante `dur` segundos. Mojarse de nuevo no suma más %, solo reinicia el tiempo.
export const ACIDO = { pct: 0.4, dur: 20 };

// Luna: cada `ciclo` segundos con astronautas se hace una expedición y la luna suma una base
// (hasta `maxBases`; después las bases existentes crecen). Las bases se unen con caminos y la nave
// aterriza en la base de cada expedición.
export const LUNA = { ciclo: 30, maxBases: 24 };

// Barra de prestigio (arriba): se llena con el total de esporas ganadas. Cada punto cuesta
// `crecimiento` veces más que el anterior: el punto k necesita base * crecimiento^(k-1) esporas.
export const PRESTIGIO = { base: D(1000), crecimiento: 1.55 };

// Tipos de honguitos. `sprite` = archivo en assets/ (sin .png). `casa` = edificio donde se compran.
const HONG_DEF = [
  { id: "basico", tier: 0, logistico: true, nombre: "Honguito", sprite: "honguito", desc: "Hongo logístico: no produce esporas, las junta del piso en manojos y las lleva al hongo madre.", color: "#e8362f" },
  { id: "maestro", tier: 1, nombre: "Maestro", sprite: "maestro", desc: "Pasea con sus alumnitos y les da clase; tras varias clases alguno se gradúa y salen esporas.", color: "#b5e61d", casa: "escuela" },
  { id: "musico", tier: 2, nombre: "Músico", sprite: "musico", desc: "Canta cada tanto y su música rinde esporas.", color: "#a77bff", casa: "conservatorio" },
  { id: "cientifico", tier: 3.5, tierCosto: 2.5, inv: 1, nombre: "Científico", sprite: "cientifico", desc: "Hace experimentos y genera investigación: cuantos más hay, más rápido se investiga.", color: "#2fd4c4", casa: "universidad" },
  { id: "jardinero", tier: 3, nombre: "Jardinero", sprite: "jardinero", desc: "Riega el piso y brotan honguitos que se desvanecen y se vuelven esporas.", color: "#2fa84f", casa: "vivero" },
  { id: "obrero", tier: 4, nombre: "Obrero", sprite: "obrero", desc: "Trabaja en la fábrica: entra, arma hongos chiquitos y los deja en la cinta. Cuantos más hay, más humo y más lluvia ácida.", color: "#9db4c8", casa: "fabrica" },
  { id: "minero", tier: 5, nombre: "Minero", sprite: "minero", desc: "Baja por debajo del piso, cava túneles y sube cristales hongiles al edificio de la mina: ahí se procesan y se vuelven esporas. Cuantos más hay, más se expande la mina.", color: "#c47a45", casa: "mina" },
  { id: "soldado", tier: 6.5, nombre: "Soldado", sprite: "soldado", desc: "Defiende solo las invasiones: sale a pelear con los enemigos en tierra y los traba. No produce esporas. Además se puede meter dentro de una torre (hasta 10 por torre) para mejorarla, pero ya no vuelve a caminar.", color: "#8f9a5a", casa: "barraca", defensa: true },
  { id: "mago", tier: 6, nombre: "Mago", sprite: "mago", desc: "Prepara pociones de hongos en su caldero (esporas) y purifica las nubes de contaminación: cada nube purificada se vuelve esporas.", color: "#d12bff", casa: "torre" },
  { id: "atleta", tier: 7, nombre: "Atleta", sprite: "atleta", desc: "Entrena con mancuernas al lado del gym y transpira esporas.", color: "#ff8a1f", casa: "gimnasio" },
  { id: "trader", tier: 8, nombre: "Trader", sprite: "trader", desc: "Hace llamados y mueve acciones en el trade center. Cada ciclo de bolsa cobra todo junto.", color: "#f5c518", casa: "trade" },
  { id: "cristalero", tier: 10, nombre: "Cristalero", sprite: "cristalero", desc: "Talla hongo-cristales en la cristalería y los pule hasta que brillan: cada cristal pulido suelta una lluvia de esporas luminosas.", color: "#5ef2ff", casa: "cristaleria" },
  { id: "astronauta", tier: 9, nombre: "Astronauta", sprite: "astronauta", desc: "Se sube al cohete, viaja a la luna y vuelve con esporas. Cada expedición suma una base hongil lunar.", color: "#4fb4ff", casa: "astropuerto" },
];
export const HONGUITOS = Object.fromEntries(HONG_DEF.map((h) => {
  const v = valoresTier(h.tierCosto ?? h.tier);
  return [h.id, {
    ...h,
    costoBase: C(v.costoBase),
    crecimiento: MODO_PRUEBA ? 1 : v.crecimiento,
    prod: h.inv || h.defensa || h.logistico ? D(0) : D(valoresTier(h.tier).prod), // los científicos dan investigación (`invProd`) y los soldados no producen
    invProd: h.inv ? D(h.inv) : D(0),
  }];
}));

// Mejoras del hongo madre. `aplica`: "todos" o el id de un honguito.
export const MEJORAS = [
  {
    id: "micelio",
    nombre: "Micelio",
    desc: "Todos los honguitos producen ×2.",
    costo: C(250),
    aplica: "todos",
    mult: D(2),
  },
  {
    id: "rocio",
    nombre: "Rocío",
    desc: "Los honguitos logísticos llevan manojos ×2 más grandes.",
    costo: C(1500),
    aplica: "basico",
    mult: D(2),
  },
  // mejoras grandes para el resto de la partida: cada una aparece al haber ganado un 10% de su costo
  { id: "red_micelio", nombre: "Red de micelio", desc: "Todos los honguitos producen ×2.", costo: C(1.5e7), aplica: "todos", mult: D(2), desde: C(1.5e6) },
  { id: "simbiosis", nombre: "Simbiosis", desc: "Todos los honguitos producen ×3.", costo: C(4e11), aplica: "todos", mult: D(3), desde: C(4e10) },
  { id: "gran_micelio", nombre: "Gran micelio", desc: "Todos los honguitos producen ×5.", costo: C(3e15), aplica: "todos", mult: D(5), desde: C(3e14) },
  { id: "micelio_ancestral", nombre: "Micelio ancestral", desc: "Todos los honguitos producen ×10.", costo: C(4e19), aplica: "todos", mult: D(10), desde: C(4e18) },
];

// Mejoras del hongo madre para los toques (y el autoclick). Por niveles: costo × esc por nivel.
// ef: fuerza (+1 espora por toque), savia (+1% de las esporas/s por toque), manos (toque ×2),
// auto (desbloquea el autoclick), autoVel (+0,5 toques/s), autoFuerza (+10% del valor de cada toque automático).
export const MEJ_CLICK = [
  { id: "click_fuerza", ef: "fuerza", nombre: "Toque firme", max: 20, costo: D(40), esc: 1.6, desde: D(10), desc: (n) => `Cada toque da +${n} ${n === 1 ? "espora" : "esporas"} más.` },
  { id: "click_savia", ef: "savia", nombre: "Savia en la campana", max: 30, costo: D(2e4), esc: 2.2, desde: D(2e3), desc: (n) => `Cada toque da además el ${n}% de tus esporas/s.` },
  { id: "click_manos", ef: "manos", nombre: "Manos de micelio", max: 5, costo: D(3000), esc: 40, desde: D(300), desc: (n) => `Los toques valen ×${2 ** n}.` },
  { id: "auto_unlock", ef: "auto", nombre: "Autoclick: toque al pasar el mouse", max: 1, costo: D(800), esc: 1, desde: D(80), desc: () => "Mientras mantengas el mouse sobre el hongo madre, se toca solo 1 vez por segundo con la mitad del valor de un toque (y podés seguir tocando a mano al mismo tiempo)." },
  { id: "auto_vel", ef: "autoVel", nombre: "Autoclick veloz", max: 12, costo: D(2000), esc: 1.7, requiere: "auto_unlock", desc: (n) => `El autoclick toca ${(1 + 0.5 * n).toLocaleString("es-AR")} veces por segundo.` },
  { id: "auto_fuerza", ef: "autoFuerza", nombre: "Autoclick potente", max: 5, costo: D(5e4), esc: 6, requiere: "auto_unlock", desde: D(5e3), desc: (n) => `Cada toque automático vale el ${50 + 10 * n}% de uno manual.` },
];
export const MEJ_CLICK_POR_ID = Object.fromEntries(MEJ_CLICK.map((m) => [m.id, m]));

// ---- Logística de esporas ----
// Las esporas ya no llegan solas al hongo madre: las producen los honguitos (y tus toques) y quedan sueltas;
// los honguitos logísticos las juntan en manojos y las llevan. El modelo es agregado (cuentan las esporas,
// no los sprites): cada honguito suelta `emision` esporas por segundo y cada básico lleva `carga` por viaje.
export const LOGI = { vel: 14, distBase: 14, recoger: 1, carga0: 3, emision: 0.35, factorCarga: 1.12, compAltura: 3, compNivelMax: 10, dronVel: 6 }; // dronVel: granos/s que lleva cada dron (se compran con Prismas)
export const MEJ_LOGI = [
  { id: "logi_manojo", ef: "carga", nombre: "Manojos más grandes", max: 30, base: 40, esc: 1.7, desc: (n) => `Cada honguito logístico lleva ×${(LOGI.factorCarga ** n).toFixed(2).replace(".", ",")} esporas por viaje (un manojo más alto sobre la cabeza).` },
  { id: "logi_zancada", ef: "vel", nombre: "Zancadas largas", max: 20, base: 60, esc: 1.55, desc: (n) => `Los honguitos logísticos caminan un ${10 * n}% más rápido.` },
  { id: "logi_senderos", ef: "dist", nombre: "Senderos de micelio", max: 10, base: 150, esc: 2, desc: (n) => `Los caminos entre las esporas y el hongo madre son un ${5 * n}% más cortos.` },
  { id: "logi_cuadrilla", ef: "cuadrilla", nombre: "Cuadrillas de cargadores", max: 8, base: 400, esc: 2.2, req: 25, desc: (n) => `Por cada 10 honguitos logísticos, los manojos son un ${2 * n}% más grandes (necesita 25 logísticos).` },
  { id: "logi_relevo", ef: "relevo", nombre: "Relevos en el camino", max: 8, base: 900, esc: 2.4, req: 50, desc: (n) => `Los honguitos logísticos se pasan los manojos a mitad de camino: los viajes duran un ${5 * n}% menos (necesita 50 logísticos).` },
  { id: "logi_prensa", ef: "prensa", nombre: "Prensa de micelio", max: 1, base: 600, esc: 1, desc: () => "Tocá una montaña de esporas para compactarla: los honguitos logísticos dejan de llevársela y puede crecer el triple. Volvé a tocarla para cristalizarla: entrega todo con un bono que crece con lo alta que esté (a más altura, mucho más) y da Prismas. Si llega al tope, colapsa." },
  { id: "logi_cristal_auto", ef: "cristalauto", nombre: "Cristalización asistida", max: 1, base: 25000, esc: 1, reqMej: "logi_prensa", desc: () => "Las montañas compactadas cristalizan solas al llegar al 90%, antes de que colapsen." },
  { id: "logi_hifas", ef: "hifas", nombre: "Red de hifas", max: 10, base: 300, esc: 1.9, desc: (n) => `Una red de hifas bajo el piso lleva granos sola, sin honguitos logísticos: +${(0.5 * n).toFixed(1).replace(".", ",")} granos/s por cada lugar que suelta esporas.` },
  { id: "logi_recoger", ef: "recoger", nombre: "Recolección ágil", max: 10, base: 100, esc: 1.9, desc: (n) => `Juntar el manojo lleva un ${7 * n}% menos de tiempo.` },
];
export const MEJ_LOGI_POR_ID = Object.fromEntries(MEJ_LOGI.map((m) => [m.id, m]));

// ---- Hitos de cantidad (como en Adventure Capitalist): al tener 25, 50, 100... honguitos de un
// tipo, ese tipo produce ×2 más. Son automáticos.
export const HITOS = [25, 50, 100, 200, 400, 800];

// ---- Investigaciones (Universidad hongil) ----
// Cada tipo de honguito (y "todos") tiene 10 niveles de investigación que suman un % chico de
// producción. El % exacto de cada nivel se sortea con la semilla de la partida (state.semilla),
// así que cambia de una partida a otra. Se investigan de a una, y el progreso lo ponen los
// científicos (puntos de investigación por segundo). Cada nivel exige el anterior y tener el
// edificio de su tema.
const TEC_NOMBRES = {
  todos: ["Método científico", "Revisión por pares", "Becas de investigación", "Congreso internacional", "Premio hongil de ciencias"],
  maestro: ["Pizarrón de tiza fosforescente", "Plan de estudios hongil", "Biblioteca ampliada", "Clases magistrales", "Posgrado fúngico"],
  musico: ["Partituras fúngicas", "Acústica de micelio", "Afinadores de precisión", "Sala de ensayo", "Orquesta sinfónica"],
  jardinero: ["Riego por goteo hongil", "Sustrato enriquecido", "Injertos de colores", "Invernadero climatizado", "Banco de esporas"],
  obrero: ["Herramientas de precisión hongil", "Líneas de montaje", "Cascos reforzados", "Automatización básica", "Control de calidad"],
  atleta: ["Proteína de micelio", "Entrenamiento de élite", "Ropa deportiva técnica", "Fisioterapia hongil", "Dieta balanceada"],
  trader: ["Algoritmo de trading hongil", "Análisis de mercado", "Terminal de cotizaciones", "Cobertura de riesgo", "Información al instante"],
  cristalero: ["Cinceles de diamante", "Facetas perfectas", "Pulido a espejo", "Resonancia armónica", "Gran geoda"],
  astronauta: ["Trajes presurizados", "Propulsores de espora", "Navegación estelar", "Escudo térmico", "Observatorio lunar"],
  minero: ["Picos de cristal", "Vagonetas reforzadas", "Lámparas de espora", "Entibado de micelio", "Perforadora hongil"],
  mago: ["Recetario de hongos", "Varitas de hongo mágico", "Grimorio ilustrado", "Caldero de cobre", "Gran hechizo de purga"],
  cientifico: ["Microscopios mejorados", "Laboratorio de alta pureza", "Cuadernos de campo", "Cafetera industrial", "Supercomputadora de micelio"],
};
export const NIVELES_TEC = 10;
export const TECNOLOGIAS = Object.entries(TEC_NOMBRES).flatMap(([target, nombres]) => {
  const h = HONG_DEF.find((x) => x.id === target);
  const edificio = h ? h.casa : "universidad";
  const tier = h ? h.tier : 3.5;
  return Array.from({ length: NIVELES_TEC }, (_, i) => {
    const nivel = i + 1;
    return {
      id: `${target}_${nivel}`,
      target, nivel, edificio,
      req: nivel > 1 ? `${target}_${nivel - 1}` : null,
      nombre: nombres[i % 5] + (nivel > 5 ? " II" : ""),
      trabajo: MODO_PRUEBA ? 4 + nivel : Math.round(40 * Math.pow(1.65, nivel - 1) * Math.pow(1.3, tier)),
    };
  });
});
// ---- Carreras (Universidad): no dan producción, desbloquean la compra de otros edificios ----
// Hay que investigarlas con los científicos antes de poder construir ese edificio.
export const CARRERAS = [
  { id: "carrera_hechiceria", nombre: "Carrera de Hechicería", abre: "torre", trabajo: MODO_PRUEBA ? 10 : 12000 },
  { id: "carrera_finanzas", nombre: "Carrera de Finanzas", abre: "trade", trabajo: MODO_PRUEBA ? 10 : 60000 },
];
for (const c of CARRERAS) TECNOLOGIAS.push({ id: c.id, target: "carrera", nivel: 1, edificio: "universidad", req: null, nombre: c.nombre, trabajo: c.trabajo, carrera: true, abre: c.abre });
export const TEC_POR_ID = Object.fromEntries(TECNOLOGIAS.map((t) => [t.id, t]));

// ---- Mejoras de edificio (se compran con esporas en la ventana de cada edificio) ----
// Cada una se compra por niveles (`max`; costo × `esc` por nivel) salvo las sinergias. Cada edificio
// tiene su propio estilo de mejoras. `ef` (efecto por nivel n):
//   prod       ×(1 + a·n) la producción de su tipo
//   vel        velocidad ×(1 + a·n): animaciones y ciclos más cortos, y un poco de producción
//   crit       golpes críticos: cada segundo `p0 + p1·n` de chance de `seg` s de producción de golpe
//   buff       habilidad activa ×`mult` durante dur0 + dur1·(n−1) s, recarga cd0 − cd1·(n−1) s
//   racha      cada `cada0 − dc·(n−1)` acciones del tipo (una por honguito cada ~10 s) una sale ×m: ráfaga de (m−1) acciones extra
//   cadena     cuando un honguito de `fuente` actúa, chance `p0 + p1·(n−1)` de que `aplica` cobre `seg` s de su producción
//   savia_roja / savia_azul / savia_verde  habilidades del Vivero (Jardín de savias): onda de choque que entrega todo el piso /
//              básicos y drones ×2 por dur s / bono de cristalización ×1,5 por dur s
//   sinergia   (un solo nivel) cada `cada` honguitos de `fuente`: +`bono` a `objetivo`
//   descuento  el precio de sus honguitos sube un a·n menos con cada compra
//   autoevento chance a·n de que los eventos se recojan solos
//   sobrecarga (interruptor) ×2,5 obreros pero ×2,5 contaminación
//   acido      la lluvia ácida quita a·n menos     paraguas  el castigo dura a·n menos
//   purga      los magos purifican a·n más rápido  eventos   a·n más frecuentes y +d·n s de duración
//   hechizo    habilidad activa: invoca un evento ya (recarga cd0 − cd1·(n−1) s)
//   apuesta    habilidad activa: arriesga el 10% de tus esporas
//   luna       +a·n de producción total por cada base lunar
//   offline    +a·n segundos de producción sin conexión   descInv  investigar cuesta a·n menos
// Cada una pide tener `req` honguitos de su tipo. Costo base: costo base del tier × `mul`.
const T = (tier, mul) => C(Math.ceil(valoresTier(tier).costoBase * mul));
const M = (tipo, sufijo, nombre, mul, req, esc, max, ef) => {
  const h = HONG_DEF.find((x) => x.id === tipo);
  return { id: `${tipo}_${sufijo}`, edificio: h.casa, tipo, nombre, costo: T(h.tierCosto ?? h.tier, mul), req, esc, max, aplica: tipo, ...ef };
};
export const MEJ_EDIF = [
  // Escuela: más alumnos, graduados que cobran los eventos, tutorías y exámenes
  M("maestro", "aula", "Aula ampliada", 4, 5, 1.7, 10, { ef: "prod", a: 0.1 }),
  M("maestro", "graduados", "Graduados recolectores", 30, 15, 2.2, 5, { ef: "autoevento", a: 0.1 }),
  M("maestro", "tutorias", "Tutorías en red", 90, 20, 1, 1, { ef: "sinergia", fuente: "maestro", cada: 10, bono: 0.03, objetivo: "investigacion" }),
  M("maestro", "examenes", "Semana de exámenes", 250, 25, 2, 5, { ef: "buff", mult: 2, dur0: 25, dur1: 5, cd0: 320, cd1: 30 }),

  // Conservatorio: repertorio, ritmo, coro y conciertos
  M("musico", "repertorio", "Repertorio", 4, 5, 1.7, 10, { ef: "prod", a: 0.08 }),
  M("musico", "ritmo", "Ritmo acelerado", 15, 10, 2, 5, { ef: "vel", a: 0.08 }),
  M("musico", "coro", "Coro hongil", 90, 20, 1, 1, { ef: "sinergia", fuente: "musico", cada: 15, bono: 0.02, objetivo: "todos" }),
  M("musico", "concierto", "Concierto benéfico", 200, 25, 2, 5, { ef: "buff", mult: 3, dur0: 12, dur1: 3, cd0: 300, cd1: 30 }),

  // Vivero: injertos, compost que abarata, cosecha doble y huerta
  M("jardinero", "injertos", "Injertos", 4, 5, 1.7, 10, { ef: "prod", a: 0.1 }),
  M("jardinero", "compost", "Compost", 25, 10, 2.2, 5, { ef: "descuento", a: 0.06 }),
  M("jardinero", "cosecha", "Cosecha doble", 60, 15, 2, 5, { ef: "crit", p0: 0.015, p1: 0.005, seg: 15 }),
  M("jardinero", "savia_roja", "Savia roja: onda de choque", 200, 25, 2, 5, { ef: "savia_roja", cd0: 150, cd1: 10 }),
  M("jardinero", "savia_azul", "Savia azul: directores", 200, 25, 2, 5, { ef: "savia_azul", dur0: 25, dur1: 5, cd0: 240, cd1: 20 }),
  M("jardinero", "savia_verde", "Savia verde: ácido fértil", 200, 25, 2, 5, { ef: "savia_verde", dur0: 30, dur1: 5, cd0: 240, cd1: 20 }),
  M("jardinero", "huerta", "Huerta orgánica", 90, 20, 1, 1, { ef: "sinergia", fuente: "jardinero", cada: 10, bono: 0.02, objetivo: "atleta" }),

  // Fábrica: sobrecarga (más producción y más humo), filtros y paraguas contra la lluvia ácida
  M("obrero", "especializada", "Mano de obra especializada", 4, 5, 1.7, 10, { ef: "prod", a: 0.08 }),
  M("obrero", "sobrecarga", "Sobrecarga de máquinas", 120, 15, 1, 1, { ef: "sobrecarga" }),
  M("obrero", "filtros", "Filtros de chimenea hongiles", 60, 15, 2, 5, { ef: "acido", a: 0.12 }),
  M("obrero", "paraguas", "Paraguas hongiles", 90, 20, 2.2, 4, { ef: "paraguas", a: 0.15 }),

  // Mina: picos, vagonetas, veta rica (críticos) y red de túneles
  M("minero", "picos", "Picos de cristal", 4, 5, 1.7, 10, { ef: "prod", a: 0.1 }),
  M("minero", "vagonetas", "Vagonetas", 15, 10, 2, 5, { ef: "vel", a: 0.08 }),
  M("minero", "veta", "Veta rica", 60, 15, 2, 5, { ef: "crit", p0: 0.015, p1: 0.005, seg: 15 }),
  M("minero", "red", "Red de túneles", 90, 20, 1, 1, { ef: "sinergia", fuente: "minero", cada: 10, bono: 0.02, objetivo: "todos" }),

  // Torre de magos: caldero, purga de nubes, bola de cristal (eventos) y mano del destino
  M("mago", "caldero", "Caldero mayor", 4, 5, 1.7, 10, { ef: "prod", a: 0.1 }),
  M("mago", "purga", "Hechizo de purga", 25, 8, 2, 6, { ef: "purga", a: 0.2 }),
  M("mago", "cristal", "Bola de cristal", 80, 15, 2.2, 5, { ef: "eventos", a: 0.1, d: 1.5 }),
  M("mago", "destino", "Mano del destino", 300, 25, 2, 5, { ef: "hechizo", cd0: 600, cd1: 60 }),

  // Gimnasio: pesas, récords y club deportivo
  M("atleta", "pesas", "Pesas olímpicas", 4, 5, 1.7, 10, { ef: "prod", a: 0.1 }),
  M("atleta", "record", "Récord personal", 30, 15, 2, 5, { ef: "crit", p0: 0.02, p1: 0.005, seg: 12 }),
  M("atleta", "club", "Club deportivo", 90, 20, 1, 1, { ef: "sinergia", fuente: "atleta", cada: 10, bono: 0.02, objetivo: "obrero" }),

  // Trade center: información, alta frecuencia (ciclo de bolsa), apuesta y fondo
  M("trader", "informacion", "Acceso a información", 4, 5, 1.7, 10, { ef: "prod", a: 0.08 }),
  M("trader", "frecuencia", "Terminal de alta frecuencia", 15, 10, 2, 5, { ef: "vel", a: 0.08 }),
  M("trader", "apuesta", "Apuesta de riesgo", 120, 15, 1, 1, { ef: "apuesta", cd0: 180 }),
  M("trader", "fondo", "Fondo de inversión", 90, 20, 1, 1, { ef: "sinergia", fuente: "trader", cada: 10, bono: 0.02, objetivo: "todos" }),

  // Astropuerto: combustible, colonia lunar (bases), satélites (offline) y observatorio
  M("astronauta", "combustible", "Combustible de espora", 4, 5, 1.7, 10, { ef: "prod", a: 0.1 }),
  M("astronauta", "colonia", "Colonia lunar", 60, 10, 2.2, 5, { ef: "luna", a: 0.001 }),
  M("astronauta", "satelites", "Satélites de comunicación", 40, 15, 2, 6, { ef: "offline", a: 1800 }),
  M("astronauta", "observatorio", "Observatorio orbital", 90, 20, 1, 1, { ef: "sinergia", fuente: "astronauta", cada: 10, bono: 0.03, objetivo: "investigacion" }),

  // Cristalería: talla, facetas, resonancia y cosecha de brillo
  M("cristalero", "tallado", "Tallado fino", 4, 5, 1.7, 10, { ef: "prod", a: 0.1 }),
  M("cristalero", "facetas", "Facetas veloces", 25, 10, 2, 6, { ef: "vel", a: 0.08 }),
  M("cristalero", "brillo", "Cosecha de brillo", 60, 15, 2.2, 5, { ef: "autoevento", a: 0.1 }),
  M("cristalero", "resonancia", "Resonancia de cristal", 90, 20, 1, 1, { ef: "sinergia", fuente: "cristalero", cada: 10, bono: 0.03, objetivo: "todos" }),

  // Universidad: laboratorio, becas (investigar sale más barato), eureka y premios
  M("cientifico", "laboratorio", "Laboratorio equipado", 4, 5, 1.7, 10, { ef: "prod", a: 0.1 }),
  M("cientifico", "becas", "Becas de investigación", 40, 10, 2, 6, { ef: "descInv", a: 0.05 }),
  M("cientifico", "eureka", "¡Eureka!", 60, 15, 2, 5, { ef: "crit", p0: 0.02, p1: 0.005, seg: 15 }),
  M("cientifico", "premios", "Premios de la academia", 90, 20, 1, 1, { ef: "sinergia", fuente: "cientifico", cada: 10, bono: 0.01, objetivo: "todos" }),

  // Sinergias entre honguitos: además de tener cantidad del propio tipo, piden cierta cantidad de OTRO tipo (como en la wiki
  // de Dwarf Eats Mountain, donde «Alquimia» pide 8 científicos): cada N honguitos del otro tipo suman un bono al propio.
  M("maestro", "himno", "Himno escolar", 120, 20, 1, 1, { ef: "sinergia", fuente: "musico", cada: 10, bono: 0.03, objetivo: "maestro", reqOtro: { tipo: "musico", n: 10 } }),
  M("musico", "clases_canto", "Clases de canto", 120, 20, 1, 1, { ef: "sinergia", fuente: "maestro", cada: 10, bono: 0.03, objetivo: "musico", reqOtro: { tipo: "maestro", n: 20 } }),
  M("jardinero", "huerto_escolar", "Huerto escolar", 120, 20, 1, 1, { ef: "sinergia", fuente: "maestro", cada: 15, bono: 0.03, objetivo: "jardinero", reqOtro: { tipo: "maestro", n: 30 } }),
  M("obrero", "cinta_cosecha", "Cinta de cosecha", 120, 20, 1, 1, { ef: "sinergia", fuente: "jardinero", cada: 10, bono: 0.03, objetivo: "obrero", reqOtro: { tipo: "jardinero", n: 20 } }),
  M("minero", "herramientas_fabrica", "Herramientas de fábrica", 120, 20, 1, 1, { ef: "sinergia", fuente: "obrero", cada: 10, bono: 0.03, objetivo: "minero", reqOtro: { tipo: "obrero", n: 25 } }),
  M("mago", "grimorio_razonado", "Grimorio razonado", 120, 20, 1, 1, { ef: "sinergia", fuente: "cientifico", cada: 5, bono: 0.04, objetivo: "mago", reqOtro: { tipo: "cientifico", n: 10 } }),
  M("atleta", "pocion_deportiva", "Poción deportiva", 120, 20, 1, 1, { ef: "sinergia", fuente: "mago", cada: 10, bono: 0.03, objetivo: "atleta", reqOtro: { tipo: "mago", n: 20 } }),
  M("trader", "patrocinios", "Patrocinios", 120, 20, 1, 1, { ef: "sinergia", fuente: "atleta", cada: 10, bono: 0.03, objetivo: "trader", reqOtro: { tipo: "atleta", n: 20 } }),
  M("astronauta", "cartas_navegacion", "Cartas de navegación", 120, 20, 1, 1, { ef: "sinergia", fuente: "minero", cada: 10, bono: 0.03, objetivo: "astronauta", reqOtro: { tipo: "minero", n: 30 } }),
  M("cristalero", "cristales_estelares", "Cristales estelares", 120, 20, 1, 1, { ef: "sinergia", fuente: "astronauta", cada: 10, bono: 0.03, objetivo: "cristalero", reqOtro: { tipo: "astronauta", n: 20 } }),

  // Rachas (cada tanto una acción del tipo sale ×4, en ráfagas visibles): una por edificio
  M("maestro", "racha", "Clase magistral", 70, 15, 2, 5, { ef: "racha", cada0: 10, dc: 1, m: 4 }),
  M("musico", "racha", "Gran final", 70, 15, 2, 5, { ef: "racha", cada0: 10, dc: 1, m: 4 }),
  M("jardinero", "racha", "Floración", 70, 15, 2, 5, { ef: "racha", cada0: 10, dc: 1, m: 4 }),
  M("obrero", "racha", "Turno doble", 70, 15, 2, 5, { ef: "racha", cada0: 10, dc: 1, m: 4 }),
  M("minero", "racha", "Derrumbe de cristales", 70, 15, 2, 5, { ef: "racha", cada0: 10, dc: 1, m: 4 }),
  M("mago", "racha", "Pócima triple", 70, 15, 2, 5, { ef: "racha", cada0: 10, dc: 1, m: 4 }),
  M("atleta", "racha", "Maratón", 70, 15, 2, 5, { ef: "racha", cada0: 10, dc: 1, m: 4 }),
  M("cristalero", "racha", "Resplandor encadenado", 70, 15, 2, 5, { ef: "racha", cada0: 10, dc: 1, m: 4 }),

  // Cadenas: lo que hace un tipo dispara una ráfaga en el siguiente de la cadena (piden cantidad de ambos)
  M("maestro", "cadena_musica", "Música para las clases", 150, 20, 2, 5, { ef: "cadena", fuente: "musico", p0: 0.006, p1: 0.002, seg: 6, reqOtro: { tipo: "musico", n: 10 } }),
  M("musico", "cadena_clases", "Aplausos de los alumnos", 150, 20, 2, 5, { ef: "cadena", fuente: "maestro", p0: 0.006, p1: 0.002, seg: 6, reqOtro: { tipo: "maestro", n: 20 } }),
  M("jardinero", "cadena_huerto", "Riego con clase", 150, 20, 2, 5, { ef: "cadena", fuente: "maestro", p0: 0.006, p1: 0.002, seg: 6, reqOtro: { tipo: "maestro", n: 30 } }),
  M("obrero", "cadena_cinta", "Cinta de brotes", 150, 20, 2, 5, { ef: "cadena", fuente: "jardinero", p0: 0.006, p1: 0.002, seg: 6, reqOtro: { tipo: "jardinero", n: 20 } }),
  M("minero", "cadena_taller", "Picos de la fábrica", 150, 20, 2, 5, { ef: "cadena", fuente: "obrero", p0: 0.006, p1: 0.002, seg: 6, reqOtro: { tipo: "obrero", n: 25 } }),
  M("mago", "cadena_ciencia", "Experimento arcano", 150, 20, 2, 5, { ef: "cadena", fuente: "cientifico", p0: 0.008, p1: 0.002, seg: 6, reqOtro: { tipo: "cientifico", n: 10 } }),
  M("atleta", "cadena_pocion", "Brebaje energético", 150, 20, 2, 5, { ef: "cadena", fuente: "mago", p0: 0.006, p1: 0.002, seg: 6, reqOtro: { tipo: "mago", n: 20 } }),
  M("trader", "cadena_fans", "Hinchada compradora", 150, 20, 2, 5, { ef: "cadena", fuente: "atleta", p0: 0.006, p1: 0.002, seg: 6, reqOtro: { tipo: "atleta", n: 20 } }),
  M("astronauta", "cadena_mapas", "Mapas de la mina", 150, 20, 2, 5, { ef: "cadena", fuente: "minero", p0: 0.006, p1: 0.002, seg: 6, reqOtro: { tipo: "minero", n: 30 } }),
  M("cristalero", "cadena_estrellas", "Polvo de estrellas", 150, 20, 2, 5, { ef: "cadena", fuente: "astronauta", p0: 0.006, p1: 0.002, seg: 6, reqOtro: { tipo: "astronauta", n: 20 } }),
];
export const MEJ_EDIF_POR_ID = Object.fromEntries(MEJ_EDIF.map((m) => [m.id, m]));

// Eventos de productividad (aparecen en el cielo y hay que tocarlos antes de que se vayan).
export const EVENTOS = {
  dorada: { nombre: "Espora dorada", peso: 55 },
  fiebre: { nombre: "Fiebre del micelio", peso: 30 },
  cometa: { nombre: "Cometa de ideas", peso: 15 },
};
export const EVENTO_CFG = { intervaloMin: 80, intervaloMax: 170, vida: 15, fiebreMult: 7, fiebreSeg: 20 };
