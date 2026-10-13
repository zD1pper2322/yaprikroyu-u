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
  potato:     { n:'Картофель',   e:'🥔', kind:'crop', time: 1200, lvl:6,  price: 13, xp:4 },
  pepper:     { n:'Перец',       e:'🫑', kind:'crop', time: 2100, lvl:11,  price: 19, xp:6 },
  onion:      { n:'Лук',         e:'🧅', kind:'crop', time: 1800, lvl:14, price: 17, xp:6 },
  lettuce:    { n:'Салат',       e:'🥬', kind:'crop', time: 1500, lvl:16, price: 16, xp:6 },
  rose:       { n:'Розы',        e:'🌹', kind:'crop', time: 2400, lvl:17, price: 24, xp:8 },
  apple:      { n:'Яблоки',      e:'🍎', kind:'crop', time: 3000, lvl:18, price: 28, xp:9 },
  rice:       { n:'Рис',         e:'🍚', kind:'crop', time: 2700, lvl:20, price: 25, xp:8 },
  coffee:     { n:'Кофейные зёрна', e:'🫘', kind:'crop', time: 4200, lvl:20, price: 32, xp:10 },
  lemon:      { n:'Лимоны',      e:'🍋', kind:'crop', time: 3600, lvl:22, price: 30, xp:9 },
  cotton:     { n:'Хлопок',      e:'☁️', kind:'crop', time: 3600, lvl:15,  price: 26, xp:8 },

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
  chocolate: { n:'Шоколад', e:'🍫', kind:'good', lvl:1 },
  pudding: { n:'Пудинг', e:'🍮', kind:'good', lvl:1 },
  coffeecup: { n:'Кофе', e:'☕', kind:'good', lvl:1 },
  cappuccino: { n:'Капучино', e:'🧋', kind:'good', lvl:1 },
  salad: { n:'Салат с овощами', e:'🥗', kind:'good', lvl:1 },
  wrap: { n:'Лаваш-ролл', e:'🥙', kind:'good', lvl:1 },
  burger: { n:'Бургер', e:'🍔', kind:'good', lvl:1 },
  hotdog: { n:'Хот-дог', e:'🌭', kind:'good', lvl:1 },
  donut: { n:'Пончик', e:'🍩', kind:'good', lvl:1 },
  waffle: { n:'Вафли', e:'🧇', kind:'good', lvl:1 },
  taco: { n:'Тако', e:'🌮', kind:'good', lvl:1 },
  burrito: { n:'Буррито', e:'🌯', kind:'good', lvl:1 },
  omelet: { n:'Омлет', e:'🍳', kind:'good', lvl:1 },
  shakshuka: { n:'Шакшука', e:'🥘', kind:'good', lvl:1 },
  lemontea: { n:'Чай с лимоном', e:'🍵', kind:'good', lvl:1 },
  lemoncake: { n:'Лимонный кекс', e:'🥮', kind:'good', lvl:1 },
  wokbox: { n:'Лапша вок', e:'🥡', kind:'good', lvl:1 },
  curry: { n:'Карри с рисом', e:'🍛', kind:'good', lvl:1 },
  onigiri: { n:'Онигири', e:'🍙', kind:'good', lvl:1 },
  ricecracker: { n:'Рисовые крекеры', e:'🍘', kind:'good', lvl:1 },
  applesauce: { n:'Яблочное пюре', e:'🍏', kind:'good', lvl:1 },
  pastila: { n:'Пастила', e:'🫓', kind:'good', lvl:1 },
  sunhat: { n:'Шляпа', e:'👒', kind:'good', lvl:1 },
  cap: { n:'Кепка', e:'🧢', kind:'good', lvl:1 },
  teddy: { n:'Плюшевый мишка', e:'🧸', kind:'good', lvl:1 },
  kite: { n:'Воздушный змей', e:'🪁', kind:'good', lvl:1 },
  bouquet: { n:'Букет', e:'💐', kind:'good', lvl:1 },
  wreath: { n:'Цветочный венок', e:'🌸', kind:'good', lvl:1 },
  soap: { n:'Мыло', e:'🧼', kind:'good', lvl:1 },
  lotion: { n:'Крем для рук', e:'🧴', kind:'good', lvl:1 },
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
  popcornpot:{n:'Попкорн-машина',e:'🍿', kind:'factory', lvl:3, cost: 150, w:3, h:3, spot:[11,1], wall:'#fff1c9', roof:'#e5533d' },
  grill:   { n:'Гриль',         e:'🔥', kind:'factory', lvl:11, cost: 320, w:3, h:3, spot:[23,21], wall:'#e9d3b5', roof:'#444a55' },
  pieoven: { n:'Печь для пирогов',e:'🥟', kind:'factory', lvl:8, cost: 280, w:3, h:3, spot:[4,14], wall:'#f2dcc0', roof:'#a0522d' },
  icecream:{ n:'Мороженщица',   e:'🍦', kind:'factory', lvl:12, cost: 480, w:3, h:3, spot:[19,21], wall:'#e3f4fb', roof:'#ff8fb3' },
  pizzeria:{ n:'Пиццерия',      e:'🍕', kind:'factory', lvl:16, cost: 900, w:3, h:3, spot:[23,25], wall:'#fff3e0', roof:'#2e8b57' },
  soupkitchen:{n:'Суповая кухня',e:'🍲', kind:'factory', lvl:12, cost: 360, w:3, h:3, spot:[19,3], wall:'#f5e6c8', roof:'#d2691e' },
  pastamaker:{n:'Макаронная',   e:'🍝', kind:'factory', lvl:6, cost: 220, w:3, h:3, spot:[15,3], wall:'#fff8dc', roof:'#c0392b' },
  fryer:   { n:'Фритюрница',    e:'🍟', kind:'factory', lvl:8, cost: 260, w:3, h:3, spot:[17,7], wall:'#ffe9a8', roof:'#d4382c' },
  blender: { n:'Блендер-бар',   e:'🥤', kind:'factory', lvl:15, cost: 520, w:3, h:3, spot:[23,17], wall:'#e8f8e0', roof:'#2aa198' },
  saucery: { n:'Соусная',       e:'🥫', kind:'factory', lvl:14, cost: 560, w:3, h:3, spot:[21,7], wall:'#fbe3d6', roof:'#b03a2e' },
  chocolatier:{n:'Шоколадная',   e:'🍫', kind:'factory', lvl:13, cost: 900, w:3, h:3, spot:[27,21], wall:'#6d4c41', roof:'#ffcc80' },
  donutshop:{ n:'Пончиковая',    e:'🍩', kind:'factory', lvl:14, cost: 950, w:3, h:3, spot:[23,3], wall:'#ffe0ec', roof:'#ff6fa5' },
  omeletstation:{n:'Омлетная',   e:'🍳', kind:'factory', lvl:15, cost:1000, w:3, h:3, spot:[25,9], wall:'#fff8e1', roof:'#ffb300' },
  saladbar:{ n:'Салат-бар',      e:'🥗', kind:'factory', lvl:16, cost:1100, w:3, h:3, spot:[19,25], wall:'#e8f5e9', roof:'#43a047' },
  florist: { n:'Цветочная лавка',e:'💐', kind:'factory', lvl:17, cost:1200, w:3, h:3, spot:[27,17], wall:'#fce4ec', roof:'#ec407a' },
  applepress:{n:'Яблочная мастерская',e:'🍏', kind:'factory', lvl:18, cost:1300, w:3, h:3, spot:[15,25], wall:'#f1f8e9', roof:'#7cb342' },
  burgerstand:{n:'Бургерная',    e:'🍔', kind:'factory', lvl:18, cost:1300, w:3, h:3, spot:[31,29], wall:'#fff3e0', roof:'#e53935' },
  hatmaker:{ n:'Шляпная',        e:'👒', kind:'factory', lvl:19, cost:1400, w:3, h:3, spot:[27,29], wall:'#ede7f6', roof:'#7e57c2' },
  tacokitchen:{n:'Тако-кухня',   e:'🌮', kind:'factory', lvl:19, cost:1400, w:3, h:3, spot:[31,25], wall:'#fff8e1', roof:'#ef6c00' },
  coffeeshop:{n:'Кофейня',       e:'☕', kind:'factory', lvl:20, cost:1500, w:3, h:3, spot:[4,24], wall:'#efebe9', roof:'#5d4037' },
  ricecooker:{n:'Рисоварка',     e:'🍙', kind:'factory', lvl:20, cost:1450, w:3, h:3, spot:[27,5], wall:'#fafafa', roof:'#26a69a' },
  wok:     { n:'Вок-кухня',      e:'🥡', kind:'factory', lvl:21, cost:1600, w:3, h:3, spot:[29,13], wall:'#fff3e0', roof:'#c62828' },
  teahouse:{ n:'Чайная',         e:'🫖', kind:'factory', lvl:22, cost:1700, w:3, h:3, spot:[23,29], wall:'#f9fbe7', roof:'#9e9d24' },
  toyshop: { n:'Мастерская игрушек',e:'🧸', kind:'factory', lvl:23, cost:1800, w:3, h:3, spot:[31,21], wall:'#fff8e1', roof:'#29b6f6' },
  soapmaker:{n:'Мыловарня',      e:'🧼', kind:'factory', lvl:24, cost:2000, w:3, h:3, spot:[27,1], wall:'#e1f5fe', roof:'#ab47bc' },
  sewing:  { n:'Швейная',       e:'👕', kind:'factory', lvl:17, cost: 750, w:3, h:3, spot:[25,13], wall:'#eef0ff', roof:'#3f6fd8' },
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
  chocolate:  { b:'chocolatier', in:{ milk:1, sugar:2 },            out:1, time:1200 },
  pudding:    { b:'chocolatier', in:{ milk:2, egg:1, sugar:1 },     out:1, time:1500 },
  donut:      { b:'donutshop', in:{ wheat:2, sugar:1, egg:1 },      out:1, time: 900 },
  waffle:     { b:'donutshop', in:{ wheat:2, egg:2, milk:1 },       out:1, time:1200 },
  omelet:     { b:'omeletstation', in:{ egg:3, milk:1 },            out:1, time: 600 },
  shakshuka:  { b:'omeletstation', in:{ egg:2, tomato:2, onion:1 }, out:1, time:1200 },
  salad:      { b:'saladbar', in:{ lettuce:2, tomato:1, carrot:1 }, out:1, time: 900 },
  wrap:       { b:'saladbar', in:{ wheat:2, lettuce:1, pepper:1 },  out:1, time:1200 },
  bouquet:    { b:'florist',  in:{ rose:3 },                        out:1, time: 900 },
  wreath:     { b:'florist',  in:{ rose:2, cotton:1 },              out:1, time:1500 },
  applesauce: { b:'applepress', in:{ apple:2, sugar:1 },            out:1, time: 900 },
  pastila:    { b:'applepress', in:{ apple:3 },                     out:1, time:1500 },
  burger:     { b:'burgerstand', in:{ bread:1, cheese:1, lettuce:1, tomato:1 }, out:1, time:1500 },
  hotdog:     { b:'burgerstand', in:{ bread:1, ketchup:1, onion:1 }, out:1, time:1200 },
  sunhat:     { b:'hatmaker', in:{ cotton:2, wool:1 },              out:1, time:1800 },
  cap:        { b:'hatmaker', in:{ cotton:2 },                      out:1, time:1200 },
  taco:       { b:'tacokitchen', in:{ corn:2, pepper:1, onion:1 },  out:1, time:1200 },
  burrito:    { b:'tacokitchen', in:{ wheat:2, potato:1, pepper:1, cheese:1 }, out:1, time:1800 },
  coffeecup:  { b:'coffeeshop', in:{ coffee:2 },                    out:1, time: 900 },
  cappuccino: { b:'coffeeshop', in:{ coffee:1, milk:1, sugar:1 },   out:1, time:1200 },
  onigiri:    { b:'ricecooker', in:{ rice:2 },                      out:1, time: 600 },
  ricecracker:{ b:'ricecooker', in:{ rice:2, sugar:1 },             out:1, time: 900 },
  wokbox:     { b:'wok',      in:{ noodles:1, pepper:1, onion:1 },  out:1, time:1200 },
  curry:      { b:'wok',      in:{ rice:2, pepper:1, onion:1 },     out:1, time:1500 },
  lemontea:   { b:'teahouse', in:{ lemon:1, sugar:1 },              out:1, time: 900 },
  lemoncake:  { b:'teahouse', in:{ lemon:1, wheat:2, egg:1 },       out:1, time:1500 },
  teddy:      { b:'toyshop',  in:{ cotton:2, wool:2 },              out:1, time:2400 },
  kite:       { b:'toyshop',  in:{ cotton:2, cane:2 },              out:1, time:1800 },
  soap:       { b:'soapmaker', in:{ rose:1, milk:1, lemon:1 },      out:1, time:1500 },
  lotion:     { b:'soapmaker', in:{ rose:2, lemon:1 },              out:1, time:1800 },
};

// Изделия: уровень — не раньше завода и всех ингредиентов; цена и опыт без явных значений
// считаются из ингредиентов и времени.
for(let pass = 0; pass < 3; pass++) for(const [k, R] of Object.entries(RECIPES)){
  const it = ITEMS[k];
  if(it.kind === 'good') it.lvl = Math.max(it.lvl || 1, BUILDINGS[R.b].lvl, ...Object.keys(R.in).map(i => ITEMS[i].lvl));
  if(it.price) continue;
  if(Object.keys(R.in).some(i => !ITEMS[i].price)) continue;
  const base = Object.entries(R.in).reduce((a, [i, n]) => a + ITEMS[i].price * n, 0);
  it.price = Math.round(base * 1.35 / R.out + R.time / 90);
  it.xp = Math.max(3, Math.round(it.price / 11));
}

const FACTORY_QUEUE = 3;     // сколько заказов можно поставить в очередь на заводе
const START_PLOTS = 8;
const MAX_PLOTS = 30;
const START_STORAGE = 60;

function plotCost(owned){ return Math.round(40 * Math.pow(1.35, owned - START_PLOTS)); }
function storageUpgradeCost(cap){ return Math.round(80 * Math.pow(1.5, (cap - START_STORAGE) / 25)); }
function xpForLevel(lvl){ return Math.round(12 * Math.pow(lvl, 1.7)); }  // опыта нужно, чтобы перейти с lvl на lvl+1
