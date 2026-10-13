// «Хуторок» — справочник игры: культуры, животные, здания, рецепты.
// Время в секундах. lvl — с какого уровня доступно. price — цена продажи.

const ITEMS = {
  // Культуры (растут на грядках; посадка тратит 1 шт, сбор даёт 2)
  wheat:      { n:'Пшеница',     e:'🌾', kind:'crop', time:   60, lvl:1,  price:  2, xp:1 },
  corn:       { n:'Кукуруза',    e:'🌽', kind:'crop', time:  180, lvl:2,  price:  5, xp:2 },
  carrot:     { n:'Морковь',     e:'🥕', kind:'crop', time:  480, lvl:3,  price:  8, xp:3 },
  cane:       { n:'Тростник',    e:'🎋', kind:'crop', time:  900, lvl:5,  price: 11, xp:4 },
  tomato:     { n:'Помидоры',    e:'🍅', kind:'crop', time: 1500, lvl:7,  price: 15, xp:5 },
  strawberry: { n:'Клубника',    e:'🍓', kind:'crop', time: 2700, lvl:9,  price: 22, xp:7 },
  pumpkin:    { n:'Тыква',       e:'🎃', kind:'crop', time: 5400, lvl:11, price: 34, xp:10 },
  potato:     { n:'Картофель',   e:'🥔', kind:'crop', time: 1200, lvl:1,  price: 13, xp:4 },
  pepper:     { n:'Перец',       e:'🫑', kind:'crop', time: 2100, lvl:1,  price: 19, xp:6 },
  cotton:     { n:'Хлопок',      e:'☁️', kind:'crop', time: 3600, lvl:1,  price: 26, xp:8 },

  // Продукция животных
  egg:        { n:'Яйцо',        e:'🥚', kind:'animal', lvl:1,  price: 10, xp:2 },
  milk:       { n:'Молоко',      e:'🥛', kind:'animal', lvl:4,  price: 20, xp:3 },
  wool:       { n:'Шерсть',      e:'🧶', kind:'animal', lvl:10, price: 34, xp:5 },

  // Корм
  chickenfeed:{ n:'Корм для кур',    e:'🟡', kind:'feed', lvl:1,  price: 3, xp:1 },
  cowfeed:    { n:'Корм для коров',  e:'🟤', kind:'feed', lvl:4,  price: 6, xp:1 },
  sheepfeed:  { n:'Корм для овец',   e:'🟢', kind:'feed', lvl:10, price: 8, xp:1 },

  // Изделия
  bread:      { n:'Хлеб',         e:'🍞', kind:'good', lvl:2,  price: 14, xp:3 },
  cornbread:  { n:'Кукурузный хлеб', e:'🥖', kind:'good', lvl:5, price: 40, xp:6 },
  cookie:     { n:'Печенье',      e:'🍪', kind:'good', lvl:8,  price: 70, xp:9 },
  cream:      { n:'Сливки',       e:'🍶', kind:'good', lvl:4,  price: 32, xp:4 },
  butter:     { n:'Масло',        e:'🧈', kind:'good', lvl:6,  price: 60, xp:6 },
  cheese:     { n:'Сыр',          e:'🧀', kind:'good', lvl:7,  price: 95, xp:9 },
  sugar:      { n:'Сахар',        e:'🍬', kind:'good', lvl:5,  price: 20, xp:3 },
  juice:      { n:'Томатный сок', e:'🧃', kind:'good', lvl:7,  price: 46, xp:6 },
  jam:        { n:'Варенье',      e:'🫙', kind:'good', lvl:9,  price: 82, xp:9 },
  cake:       { n:'Торт',         e:'🍰', kind:'good', lvl:9,  price:120, xp:12 },
  pie:        { n:'Тыквенный пирог', e:'🥧', kind:'good', lvl:11, price:150, xp:14 },
  sweater:    { n:'Свитер',       e:'🧥', kind:'good', lvl:10, price:110, xp:11 },
  popcorn:    { n:'Попкорн',      e:'🍿', kind:'good', lvl:1, price: 22, xp:3 },
  lollipop:   { n:'Леденцы',      e:'🍭', kind:'good', lvl:1, price: 90, xp:9 },
  pancake:    { n:'Блины',        e:'🥞', kind:'good', lvl:1, price: 66, xp:7 },
  skewer:     { n:'Овощи-гриль',  e:'🍢', kind:'good', lvl:1, price: 70, xp:7 },
  pirozhki:   { n:'Пирожки',      e:'🥟', kind:'good', lvl:1, price: 48, xp:5 },
  cupcake:    { n:'Морковный кекс', e:'🧁', kind:'good', lvl:1, price: 52, xp:6 },
  icecream:   { n:'Мороженое',    e:'🍦', kind:'good', lvl:1, price: 88, xp:8 },
  sundae:     { n:'Пломбир с клубникой', e:'🍨', kind:'good', lvl:1, price:150, xp:13 },
  pizza:      { n:'Пицца',        e:'🍕', kind:'good', lvl:1, price:180, xp:15 },
  sandwich:   { n:'Бутерброд',    e:'🥪', kind:'good', lvl:1, price:165, xp:13 },
  soup:       { n:'Овощной суп',  e:'🍲', kind:'good', lvl:1, price: 75, xp:7 },
  porridge:   { n:'Каша',         e:'🥣', kind:'good', lvl:1, price: 38, xp:4 },
  pasta:      { n:'Макароны',     e:'🍝', kind:'good', lvl:1, price: 30, xp:4 },
  noodles:    { n:'Лапша',        e:'🍜', kind:'good', lvl:1, price: 36, xp:4 },
  fries:      { n:'Картошка фри', e:'🍟', kind:'good', lvl:1, price: 42, xp:5 },
  draniki:    { n:'Драники',      e:'🧆', kind:'good', lvl:1, price: 56, xp:6 },
  smoothie:   { n:'Смузи',        e:'🥤', kind:'good', lvl:1, price: 92, xp:8 },
  punch:      { n:'Ягодный морс', e:'🍹', kind:'good', lvl:1, price: 95, xp:9 },
  ketchup:    { n:'Кетчуп',       e:'🥫', kind:'good', lvl:1, price: 95, xp:9 },
  hotsauce:   { n:'Острый соус',  e:'🌶️', kind:'good', lvl:1, price: 80, xp:8 },
  tshirt:     { n:'Футболка',     e:'👕', kind:'good', lvl:1, price: 78, xp:8 },
  dress:      { n:'Платье',       e:'👗', kind:'good', lvl:1, price:160, xp:14 },
};

const CROPS = Object.keys(ITEMS).filter(k => ITEMS[k].kind === 'crop');

// Животные: живут в загонах, едят корм, дают продукт.
const ANIMALS = {
  chicken: { n:'Курица', e:'🐔', house:'coop', feed:'chickenfeed', makes:'egg',  time:  300, lvl:1,  cost:  30 },
  cow:     { n:'Корова', e:'🐄', house:'barn', feed:'cowfeed',     makes:'milk', time:  900, lvl:4,  cost: 120 },
  sheep:   { n:'Овца',   e:'🐑', house:'fold', feed:'sheepfeed',   makes:'wool', time: 1800, lvl:10, cost: 350 },
};

// Постройки. kind:'house' — загон для животных, kind:'factory' — завод с очередью.
// w,h — размер на карте в клетках; spot — место по умолчанию; wall/roof — цвета.
const BUILDINGS = {
  coop:    { n:'Курятник',      e:'🛖', kind:'house',   animal:'chicken', lvl:1,  cost:   0, slots:5, w:6, h:5, spot:[1,8],  wall:'#e9c46a', roof:'#bc4b2c' },
  barn:    { n:'Коровник',      e:'🏚️', kind:'house',   animal:'cow',     lvl:4,  cost: 200, slots:4, w:6, h:5, spot:[16,15],  wall:'#d9d2c3', roof:'#8c3b2a' },
  fold:    { n:'Овчарня',       e:'⛺', kind:'house',   animal:'sheep',   lvl:10, cost: 600, slots:4, w:6, h:5, spot:[1,18], wall:'#c9b79c', roof:'#5d6b8a' },
  feedmill:{ n:'Кормовой завод',e:'🌾', kind:'factory', lvl:1,  cost:   0, w:3, h:3, spot:[7,2],   wall:'#d8b26e', roof:'#6f8f3a' },
  bakery:  { n:'Пекарня',       e:'🍞', kind:'factory', lvl:2,  cost:  60, w:3, h:3, spot:[13,11],  wall:'#f1d7b0', roof:'#c4552d' },
  dairy:   { n:'Молочный цех',  e:'🥛', kind:'factory', lvl:4,  cost: 180, w:3, h:3, spot:[13,7], wall:'#e8eef4', roof:'#4a7fb5' },
  sugarmill:{n:'Сахарный завод',e:'🍬', kind:'factory', lvl:5,  cost: 260, w:3, h:3, spot:[17,11], wall:'#f3e6f0', roof:'#b04a8a' },
  juicer:  { n:'Соковарня',     e:'🧃', kind:'factory', lvl:7,  cost: 420, w:3, h:3, spot:[21,11], wall:'#fde8c8', roof:'#e07b28' },
  sweets:  { n:'Кондитерская',  e:'🎂', kind:'factory', lvl:9,  cost: 650, w:3, h:3, spot:[15,21],  wall:'#fbe1ea', roof:'#d6457a' },
  loom:    { n:'Ткацкая',       e:'🧵', kind:'factory', lvl:10, cost: 700, w:3, h:3, spot:[27,25], wall:'#e6e1f5', roof:'#6b58b5' },
  popcornpot:{n:'Попкорн-машина',e:'🍿', kind:'factory', lvl:1, cost: 150, w:3, h:3, spot:[11,1], wall:'#fff1c9', roof:'#e5533d' },
  grill:   { n:'Гриль',         e:'🔥', kind:'factory', lvl:1, cost: 320, w:3, h:3, spot:[23,21], wall:'#e9d3b5', roof:'#444a55' },
  pieoven: { n:'Печь для пирогов',e:'🥟', kind:'factory', lvl:1, cost: 280, w:3, h:3, spot:[4,14], wall:'#f2dcc0', roof:'#a0522d' },
  icecream:{ n:'Мороженщица',   e:'🍦', kind:'factory', lvl:1, cost: 480, w:3, h:3, spot:[19,21], wall:'#e3f4fb', roof:'#ff8fb3' },
  pizzeria:{ n:'Пиццерия',      e:'🍕', kind:'factory', lvl:1, cost: 900, w:3, h:3, spot:[23,25], wall:'#fff3e0', roof:'#2e8b57' },
  soupkitchen:{n:'Суповая кухня',e:'🍲', kind:'factory', lvl:1, cost: 360, w:3, h:3, spot:[19,3], wall:'#f5e6c8', roof:'#d2691e' },
  pastamaker:{n:'Макаронная',   e:'🍝', kind:'factory', lvl:1, cost: 220, w:3, h:3, spot:[15,3], wall:'#fff8dc', roof:'#c0392b' },
  fryer:   { n:'Фритюрница',    e:'🍟', kind:'factory', lvl:1, cost: 260, w:3, h:3, spot:[17,7], wall:'#ffe9a8', roof:'#d4382c' },
  blender: { n:'Блендер-бар',   e:'🥤', kind:'factory', lvl:1, cost: 520, w:3, h:3, spot:[23,17], wall:'#e8f8e0', roof:'#2aa198' },
  saucery: { n:'Соусная',       e:'🥫', kind:'factory', lvl:1, cost: 560, w:3, h:3, spot:[21,7], wall:'#fbe3d6', roof:'#b03a2e' },
  sewing:  { n:'Швейная',       e:'👕', kind:'factory', lvl:1, cost: 750, w:3, h:3, spot:[25,13], wall:'#eef0ff', roof:'#3f6fd8' },
};
// Неподвижные постройки хутора: склад и доска заказов с грузовиком.
const FIXED = {
  storage: { n:'Амбар', w:3, h:3, spot:[3,2] },
  board:   { n:'Заказы', w:2, h:2, spot:[1,4] },
};
// Декор из магазина.
const DECOR = {
  tree:    { n:'Яблоня',   e:'🌳', cost:  25, lvl:1, w:2, h:2 },
  pine:    { n:'Ель',      e:'🌲', cost:  30, lvl:2, w:2, h:2 },
  flowers: { n:'Клумба',   e:'🌷', cost:  15, lvl:1, w:1, h:1 },
  sunflower:{n:'Подсолнух',e:'🌻', cost:  20, lvl:3, w:1, h:1 },
  bench:   { n:'Скамейка', e:'🪑', cost:  40, lvl:3, w:2, h:1 },
  pond:    { n:'Пруд',     e:'💧', cost: 120, lvl:5, w:3, h:2 },
  hay:     { n:'Стог сена',e:'🌾', cost:  35, lvl:2, w:1, h:1 },
  well:    { n:'Колодец',  e:'⛲', cost:  90, lvl:6, w:2, h:2 },
};
const MAP_W = 40, MAP_H = 40;   // размер хутора в клетках
const PLOT = 2;                  // грядка — 2×2 клетки
const TRUCK_TIME = 25;           // секунд в пути с заказом

// Рецепты: building, in: {товар: кол-во}, out: кол-во, time
const RECIPES = {
  chickenfeed:{ b:'feedmill', in:{ wheat:2, corn:1 },               out:3, time:  90 },
  cowfeed:    { b:'feedmill', in:{ corn:2, carrot:1 },              out:3, time: 180 },
  sheepfeed:  { b:'feedmill', in:{ wheat:2, carrot:2 },             out:3, time: 240 },
  bread:      { b:'bakery',   in:{ wheat:3 },                       out:1, time: 180 },
  cornbread:  { b:'bakery',   in:{ corn:2, egg:2 },                 out:1, time: 600 },
  cookie:     { b:'bakery',   in:{ wheat:2, egg:2, sugar:1 },       out:1, time:1200 },
  cream:      { b:'dairy',    in:{ milk:1 },                        out:1, time: 600 },
  butter:     { b:'dairy',    in:{ milk:2 },                        out:1, time: 900 },
  cheese:     { b:'dairy',    in:{ milk:3 },                        out:1, time:1800 },
  sugar:      { b:'sugarmill',in:{ cane:1 },                        out:1, time: 600 },
  juice:      { b:'juicer',   in:{ tomato:2 },                      out:1, time: 900 },
  jam:        { b:'juicer',   in:{ strawberry:2, sugar:1 },         out:1, time:1500 },
  cake:       { b:'sweets',   in:{ strawberry:1, cream:1, sugar:1 },out:1, time:1800 },
  pie:        { b:'sweets',   in:{ pumpkin:1, egg:2, sugar:1 },     out:1, time:2400 },
  sweater:    { b:'loom',     in:{ wool:2 },                        out:1, time:2400 },
  popcorn:    { b:'popcornpot', in:{ corn:2 },                      out:1, time: 300 },
  lollipop:   { b:'popcornpot', in:{ sugar:2, strawberry:1 },       out:1, time: 900 },
  pancake:    { b:'grill',    in:{ wheat:2, egg:2, milk:1 },        out:1, time: 600 },
  skewer:     { b:'grill',    in:{ pepper:1, tomato:1, potato:1 },  out:1, time: 900 },
  pirozhki:   { b:'pieoven',  in:{ wheat:2, potato:2 },             out:1, time: 600 },
  cupcake:    { b:'pieoven',  in:{ wheat:1, egg:2, carrot:1 },      out:1, time: 900 },
  icecream:   { b:'icecream', in:{ milk:2, sugar:1 },               out:1, time: 900 },
  sundae:     { b:'icecream', in:{ milk:2, strawberry:2, sugar:1 }, out:1, time:1500 },
  pizza:      { b:'pizzeria', in:{ wheat:2, tomato:2, cheese:1 },   out:1, time:1800 },
  sandwich:   { b:'pizzeria', in:{ bread:1, cheese:1, tomato:1 },   out:1, time: 900 },
  soup:       { b:'soupkitchen', in:{ potato:2, carrot:1, tomato:1 }, out:1, time:1200 },
  porridge:   { b:'soupkitchen', in:{ wheat:2, milk:1 },            out:1, time: 600 },
  pasta:      { b:'pastamaker', in:{ wheat:3, egg:1 },              out:1, time: 600 },
  noodles:    { b:'pastamaker', in:{ wheat:2, egg:1, carrot:1 },    out:1, time: 900 },
  fries:      { b:'fryer',    in:{ potato:2 },                      out:1, time: 600 },
  draniki:    { b:'fryer',    in:{ potato:2, egg:1 },               out:1, time: 900 },
  smoothie:   { b:'blender',  in:{ strawberry:2, milk:1 },          out:1, time: 900 },
  punch:      { b:'blender',  in:{ strawberry:2, sugar:1 },         out:1, time:1200 },
  ketchup:    { b:'saucery',  in:{ tomato:3, sugar:1 },             out:1, time:1200 },
  hotsauce:   { b:'saucery',  in:{ pepper:2, tomato:1 },            out:1, time:1200 },
  tshirt:     { b:'sewing',   in:{ cotton:2 },                      out:1, time:1500 },
  dress:      { b:'sewing',   in:{ cotton:3, wool:1 },              out:1, time:2400 },
};

const FACTORY_QUEUE = 3;     // сколько заказов можно поставить в очередь на заводе
const START_PLOTS = 8;
const MAX_PLOTS = 30;
const START_STORAGE = 60;

function plotCost(owned){ return Math.round(40 * Math.pow(1.35, owned - START_PLOTS)); }
function storageUpgradeCost(cap){ return Math.round(80 * Math.pow(1.5, (cap - START_STORAGE) / 25)); }
function xpForLevel(lvl){ return Math.round(12 * Math.pow(lvl, 1.7)); }  // опыта нужно, чтобы перейти с lvl на lvl+1
