'use strict';

/* ==========================================================
   HORN HUB — магазин (Telegram Mini App)
   ----------------------------------------------------------
   Как обновлять каталог (всё в CATALOG ниже):
   • price — старая цена, sale — цена со скидкой (в злотых).
     Если скидки нет — просто не указывайте sale.
   • Цена зависит от района — укажите sale по районам:
       sale: { 'Bemowo': 40, 'Ożarów': 50 }
     Названия районов — точно как в DISTRICTS. Если для района цена
     не указана, берётся цена первого района из списка DISTRICTS.
   • Новый вкус — допишите название В КОНЕЦ списка flavors и
     положите картинку в images/<folder>/. Имя файла — это
     название, где всё кроме латиницы и цифр заменено на "_":
       "P&B Cloud" → P_B_Cloud.png,  "Love 777" → Love_777.png
   • Порядок вкусов не меняйте: от него зависят id товаров,
     а по id у покупателей хранятся корзина и избранное.
   • Закончился вкус — добавьте его название в soldOut.
   ========================================================== */

const ADMIN_NICK = 'gystds';
const ADMIN_URL = `https://t.me/${ADMIN_NICK}`;

// Google-таблица с товарами, ценами и наличием (как подключить — в README).
// Вставьте сюда ссылку на таблицу. Пока пусто — товары берутся из CATALOG ниже.
const SHEET_URL = '';

// Районы Варшавы. Окно выбора района показывается при первом входе, дальше район
// запоминается. От района зависят цены (см. sale в CATALOG), район попадает в текст заказа.
// Новый район — просто допишите название в список.
const DISTRICTS = ['Bemowo', 'Ożarów'];

// Таймер акции под баннером (время по Варшаве). До старта — «до старта …», во время — «до конца …»,
// после окончания таймер сам исчезает. Убрать таймер: const SALE = null;
const SALE = {
  start: '2026-10-31T00:00:00+01:00', // 31 октября, 00:00
  end:   '2026-11-02T00:00:00+01:00', // конец 1 ноября
  // Цены на время акции по категориям — во всех районах. Включаются и выключаются сами.
  // Можно и по районам: liquid: { 'Bemowo': 30, 'Ożarów': 35 }
  prices: {
    liquid: 30, // все жидкости по 30 zł
  },
};

function saleActive(now = Date.now()) {
  return Boolean(SALE) && now >= Date.parse(SALE.start) && now < Date.parse(SALE.end);
}

// Оформление задаётся в index.html: <html data-theme="halloween"> (убрать атрибут — обычный вид)
const THEME = document.documentElement.dataset.theme || 'default';

// Курсы относительно злотого
const CURRENCIES = {
  PLN: { rate: 1,    symbol: 'zł', decimals: 0 },
  EUR: { rate: 0.24, symbol: '€',  decimals: 2 },
  UAH: { rate: 12.6, symbol: '₴',  decimals: 0 },
};

const CATALOG = [
  // ── Жидкости ──────────────────────────────
  {
    brand: 'elf', title: 'Elf Liq', category: 'liquid', folder: 'elf',
    firstId: 1, price: 50, sale: { 'Bemowo': 40, 'Ożarów': 50 },
    flavors: [
      'Blackcurrant Aniseed',
      'Pineapple Colada',
      'Strawberry Snoow',
      'Blue Razz Lemonade',
      'Green Grape Rose',
      'Sour Watermelon Gummy',
      'Strawberry Banana',
      'Blueberry Raspberry Pomegranate',
      'P&B Cloud',
      'Spearmint',
    ],
    soldOut: [],
  },
  {
    brand: 'vozol', title: 'Vozol', category: 'liquid', folder: 'vazool',
    firstId: 200, price: 50, sale: { 'Bemowo': 40, 'Ożarów': 50 },
    flavors: [
      'Dragon Fruit Banana Cherry',
      'Purple Candy',
      'Pineapple Passion Fruit Lime',
      'Strawberry Kiwi',
      'Love 777',
      'Grape Ice',
      'Watermelon Bubblegum',
      'Pomegranate Lemonade',
      'Mint Ice',
    ],
    soldOut: [
      'Dragon Fruit Banana Cherry',
      'Love 777',
      'Mint Ice',
    ],
  },
  {
    brand: 'chaser', title: 'Chaser LUX', category: 'liquid', folder: 'chaser',
    firstId: 100, price: 60, sale: { 'Bemowo': 40, 'Ożarów': 50 },
    flavors: [
      'Grape Mint',
      'Berry Lemonade',
      'Blackberry Lemonade',
      'Sour Apple',
      'Vitamin',
      'Coconut Melon',
      'Energetic',
      'Strawberry Cream',
      'Watermelon Raspberry',
      'Kiwi Passion Guava',
    ],
    soldOut: [
      'Grape Mint',
      'Berry Lemonade',
      'Blackberry Lemonade',
      'Sour Apple',
      'Vitamin',
      'Coconut Melon',
      'Energetic',
      'Strawberry Cream',
      'Watermelon Raspberry',
      'Kiwi Passion Guava',
    ],
  },

  // ── Одноразки ─────────────────────────────
  {
    brand: 'elfking', title: 'Elf King 40k', short: 'Elf King', category: 'disposable', folder: 'elfking',
    firstId: 400, price: 110, sale: 80,
    flavors: [
      'Milki Oolong',
      'Blue Razz Ice',
      'Sour Apple Ice',
      'Sour Pineapple Ice',
      'Sour Strawberry Dragonfruit',
    ],
    soldOut: [
       'Milki Oolong',
       'Blue Razz Ice',
       'Sour Apple Ice',
       'Sour Pineapple Ice',
       'Sour Strawberry Dragonfruit',
    ],
  },
  {
    brand: 'bcpro', title: 'BC Pro 40k', short: 'BC Pro', category: 'disposable', folder: 'bcpro',
    firstId: 600, price: 110, sale: 80,
    flavors: [
      'Pineapple Rom',
      'Grape Twist',
      'Strawberry Raspberry Frost',
      'Strawberry Kiwi',
      'Aurora Berries',
    ],
    soldOut: [
       'Pineapple Rom',
       'Grape Twist',
       'Strawberry Raspberry Frost',
       'Strawberry Kiwi',
       'Aurora Berries',
    ],
  },
  {
    brand: 'vozolreve', title: 'Vozol Reve 40k', short: 'Vozol Reve', category: 'disposable', folder: 'vozolreve',
    firstId: 500, price: 110, sale: 80,
    flavors: [
      'Watermelon Bubblegum',
      'Strawberry Mango',
      'Kiwi Passion Fruit',
      'Mango Ice',
      'Grape Ice',
    ],
    soldOut: [
       'Watermelon Bubblegum',
       'Strawberry Mango',
       'Kiwi Passion Fruit',
       'Mango Ice',
       'Grape Ice',
    ],
  },

  // ── Pod-системы ───────────────────────────
  {
    brand: 'vaporesso', title: 'Vaporesso', category: 'pod', folder: 'pod',
    firstId: 700, price: 180, sale: 140,
    flavors: [
      'XROS 6 Mini Black',
    ],
    soldOut: [],
  },

  // ── Картриджи ─────────────────────────────
  {
    brand: 'cartridge', title: 'Xros', category: 'cartridge', folder: 'cart',
    firstId: 300, price: 35, sale: 30,
    flavors: [
      { name: 'Cartridge 0.6Ω', img: 'xros.png' },
    ],
    soldOut: [],
  },
];

const CATEGORIES = ['liquid', 'disposable', 'pod', 'cartridge'];
const CATEGORY_ICONS = { all: 'i-grid', liquid: 'i-drop', disposable: 'i-zap', pod: 'i-podsys', cartridge: 'i-pod' };
const MAX_QTY = 99;

/* ── Переводы ─────────────────────────────────────────── */
const I18N = {
  ru: {
    locale: 'ru-RU',
    all: 'Все товары', liquid: 'Жидкости', disposable: 'Одноразки', pod: 'Pod-системы', cartridge: 'Картриджи',
    menu: 'Меню', back: 'Назад', close: 'Закрыть', language: 'Язык', currency: 'Валюта',
    addToCart: 'В корзину', outOfStock: 'Нет в наличии', inStock: 'В наличии',
    favorites: 'Избранное', favEmpty: 'В избранном пусто', favEmptyHint: 'Нажмите ♡ на товаре, чтобы сохранить его здесь',
    favAdded: 'Добавлено в избранное', favRemoved: 'Убрано из избранного',
    toCatalog: 'В каталог', notFound: 'Ничего не найдено', notFoundHint: 'Попробуйте сбросить фильтры',
    resetFilters: 'Сбросить фильтры',
    cart: 'Корзина', toCart: 'Корзина', emptyCart: 'Корзина пуста', emptyCartHint: 'Добавьте вкусы из каталога — они появятся здесь',
    clearCart: 'Очистить', cartCleared: 'Корзина очищена', undo: 'Вернуть',
    addedToCart: 'Добавлено в корзину', removedFromCart: 'Товар удалён',
    comment: 'Комментарий к заказу', commentPh: 'Удобное время, пожелания…',
    catalogUpdated: 'Цены обновлены: {time}',
    saleLabel: 'Распродажа', saleLabelHalloween: 'Хэллоуин', saleLiveLabel: 'Распродажа идёт',
    saleOffer: 'Все {what} по {price}', saleOfferAny: 'Большая распродажа', saleStartsIn: 'до старта', saleEndsIn: 'до конца',
    units: ['д', 'ч', 'мин', 'сек'],
    district: 'Район', districtTitle: 'Район доставки', districtRequired: 'Выберите район, чтобы оформить заказ',
    gateTitle: 'Выберите ваш район', gateSub: 'Варшава',
    districtChanged: 'Район: {d}',
    itemsSum: 'Товары, {n} шт.', discount: 'Скидка', total: 'Итого', checkout: 'Оформить заказ',
    contactAdmin: 'Написать консультанту', unavailable: 'Нет в наличии — не войдёт в заказ',
    orderTitle: 'Ваш заказ', orderNo: 'Заказ', step1: 'Нажмите «Отправить» — откроется чат с консультантом.',
    step2: 'Текст заказа уже скопирован. Если он не подставился сам — просто вставьте его в сообщение.',
    sendTelegram: 'Отправить в Telegram', copy: 'Скопировать текст', copied: 'Заказ скопирован ✅',
    copyFailed: 'Не удалось скопировать — выделите текст вручную',
    client: 'Клиент', pcs: 'шт.', saleUpTo: 'Скидки до −{n}%', moreFlavors: 'Другие вкусы {brand}',
    soldOutGroup: 'Нет в наличии', maxQty: 'Максимум {n} шт.',
    ageNote: '18+ · Продукция содержит никотин и предназначена только для совершеннолетних.',
    items: ['товар', 'товара', 'товаров'],
    days: ['день', 'дня', 'дней'],
  },
  ua: {
    locale: 'uk-UA',
    all: 'Всі товари', liquid: 'Рідини', disposable: 'Одноразки', pod: 'Pod-системи', cartridge: 'Картриджі',
    menu: 'Меню', back: 'Назад', close: 'Закрити', language: 'Мова', currency: 'Валюта',
    addToCart: 'До кошика', outOfStock: 'Немає в наявності', inStock: 'В наявності',
    favorites: 'Обране', favEmpty: 'В обраному порожньо', favEmptyHint: 'Натисніть ♡ на товарі, щоб зберегти його тут',
    favAdded: 'Додано в обране', favRemoved: 'Прибрано з обраного',
    toCatalog: 'До каталогу', notFound: 'Нічого не знайдено', notFoundHint: 'Спробуйте скинути фільтри',
    resetFilters: 'Скинути фільтри',
    cart: 'Кошик', toCart: 'Кошик', emptyCart: 'Кошик порожній', emptyCartHint: 'Додайте смаки з каталогу — вони з’являться тут',
    clearCart: 'Очистити', cartCleared: 'Кошик очищено', undo: 'Повернути',
    addedToCart: 'Додано до кошика', removedFromCart: 'Товар видалено',
    comment: 'Коментар до замовлення', commentPh: 'Зручний час, побажання…',
    catalogUpdated: 'Ціни оновлено: {time}',
    saleLabel: 'Розпродаж', saleLabelHalloween: 'Хелловін', saleLiveLabel: 'Розпродаж триває',
    saleOffer: 'Усі {what} по {price}', saleOfferAny: 'Великий розпродаж', saleStartsIn: 'до старту', saleEndsIn: 'до кінця',
    units: ['д', 'год', 'хв', 'сек'],
    district: 'Район', districtTitle: 'Район доставки', districtRequired: 'Оберіть район, щоб оформити замовлення',
    gateTitle: 'Оберіть ваш район', gateSub: 'Варшава',
    districtChanged: 'Район: {d}',
    itemsSum: 'Товари, {n} шт.', discount: 'Знижка', total: 'Разом', checkout: 'Оформити замовлення',
    contactAdmin: 'Написати консультанту', unavailable: 'Немає в наявності — не увійде в замовлення',
    orderTitle: 'Ваше замовлення', orderNo: 'Замовлення', step1: 'Натисніть «Надіслати» — відкриється чат з консультантом.',
    step2: 'Текст замовлення вже скопійовано. Якщо він не підставився сам — просто вставте його в повідомлення.',
    sendTelegram: 'Надіслати в Telegram', copy: 'Скопіювати текст', copied: 'Замовлення скопійовано ✅',
    copyFailed: 'Не вдалося скопіювати — виділіть текст вручну',
    client: 'Клієнт', pcs: 'шт.', saleUpTo: 'Знижки до −{n}%', moreFlavors: 'Інші смаки {brand}',
    soldOutGroup: 'Немає в наявності', maxQty: 'Максимум {n} шт.',
    ageNote: '18+ · Продукція містить нікотин і призначена лише для повнолітніх.',
    items: ['товар', 'товари', 'товарів'],
    days: ['день', 'дні', 'днів'],
  },
  en: {
    locale: 'en-GB',
    all: 'All products', liquid: 'Liquids', disposable: 'Disposables', pod: 'Pod systems', cartridge: 'Cartridges',
    menu: 'Menu', back: 'Back', close: 'Close', language: 'Language', currency: 'Currency',
    addToCart: 'Add to cart', outOfStock: 'Out of stock', inStock: 'In stock',
    favorites: 'Favorites', favEmpty: 'No favorites yet', favEmptyHint: 'Tap ♡ on a product to save it here',
    favAdded: 'Added to favorites', favRemoved: 'Removed from favorites',
    toCatalog: 'Browse catalog', notFound: 'Nothing found', notFoundHint: 'Try resetting the filters',
    resetFilters: 'Reset filters',
    cart: 'Cart', toCart: 'Cart', emptyCart: 'Your cart is empty', emptyCartHint: 'Add flavors from the catalog and they will show up here',
    clearCart: 'Clear', cartCleared: 'Cart cleared', undo: 'Undo',
    addedToCart: 'Added to cart', removedFromCart: 'Item removed',
    comment: 'Order comment', commentPh: 'Preferred time, wishes…',
    catalogUpdated: 'Prices updated: {time}',
    saleLabel: 'Sale', saleLabelHalloween: 'Halloween', saleLiveLabel: 'Sale is on',
    saleOffer: 'All {what} for {price}', saleOfferAny: 'Big sale', saleStartsIn: 'starts in', saleEndsIn: 'ends in',
    units: ['d', 'h', 'min', 'sec'],
    district: 'District', districtTitle: 'Delivery district', districtRequired: 'Choose a district to place the order',
    gateTitle: 'Choose your district', gateSub: 'Warsaw',
    districtChanged: 'District: {d}',
    itemsSum: 'Items, {n} pcs', discount: 'Discount', total: 'Total', checkout: 'Checkout',
    contactAdmin: 'Message consultant', unavailable: 'Out of stock — won’t be ordered',
    orderTitle: 'Your order', orderNo: 'Order', step1: 'Tap “Send” — a chat with the consultant will open.',
    step2: 'The order text is already copied. If it isn’t filled in automatically, just paste it into the message.',
    sendTelegram: 'Send via Telegram', copy: 'Copy text', copied: 'Order copied ✅',
    copyFailed: 'Couldn’t copy — please select the text manually',
    client: 'Customer', pcs: 'pcs', saleUpTo: 'Up to −{n}% off', moreFlavors: 'More {brand} flavors',
    soldOutGroup: 'Out of stock', maxQty: 'Max {n} pcs',
    ageNote: '18+ · Products contain nicotine and are intended for adults only.',
    items: ['item', 'items'],
    days: ['day', 'days'],
  },
};

/* ── Товары ───────────────────────────────────────────── */
const fileName = (name) => name.replace(/[^a-zA-Z0-9]/g, '_') + '.png';

// Товары встроенного каталога (CATALOG) — запасной вариант, если таблица не подключена или недоступна
function builtinRows() {
  return CATALOG.flatMap((b) => b.flavors.map((f, i) => {
    const flavor = typeof f === 'string' ? f : f.name;
    return {
      id: b.firstId + i,
      brand: b.brand,
      brandTitle: b.title,
      short: b.short || null,
      flavor,
      category: b.category,
      price: b.price,
      sale: b.sale ?? null,
      img: `images/${b.folder}/${typeof f === 'string' ? fileName(f) : f.img}`,
      outOfStock: (b.soldOut || []).includes(flavor),
    };
  }));
}

const products = [];
const productById = new Map();
const brandList = []; // бренды в порядке каталога: { brand, title, short, category, count }

function makeProduct(row, order) {
  const { sale, ...rest } = row;
  return {
    ...rest,
    order,
    name: `${row.brandTitle} – ${row.flavor}`,
    salePrices: sale,
    // цена и скидка считаются для выбранного района
    get sale() {
      const promo = saleActive() ? SALE.prices?.[this.category] : null;
      return promo != null ? districtPrice(promo, this.price) : districtPrice(this.salePrices, this.price);
    },
    get discount() {
      const s = this.sale;
      return s < this.price ? Math.round((1 - s / this.price) * 100) : 0;
    },
  };
}

function setProducts(rows) {
  products.length = 0;
  productById.clear();
  brandList.length = 0;
  rows.forEach((row, i) => {
    const p = makeProduct(row, i);
    products.push(p);
    productById.set(p.id, p);
  });
  const byKey = new Map();
  products.forEach((p) => {
    const key = `${p.category}|${p.brand}`;
    let b = byKey.get(key);
    if (!b) {
      b = { brand: p.brand, title: p.brandTitle, short: p.short, category: p.category, count: 0 };
      byKey.set(key, b);
      brandList.push(b);
    }
    b.count += 1;
  });
}

// sale: число — одна цена везде; объект { 'Район': цена, '*': цена для остальных } — цена по районам
function districtPrice(sale, price, district = state.district) {
  if (sale == null) return price;
  if (typeof sale !== 'object') return sale;
  return sale[district] ?? sale['*'] ?? sale[DISTRICTS[0]] ?? price;
}

/* ── Telegram ─────────────────────────────────────────── */
const tg = window.Telegram?.WebApp ?? null;
const isTg = Boolean(tg?.initData);
const tgVersion = (v) => { try { return isTg && tg.isVersionAtLeast(v); } catch { return false; } };

const haptic = {
  tap()     { if (tgVersion('6.1')) try { tg.HapticFeedback.impactOccurred('light'); } catch {} },
  select()  { if (tgVersion('6.1')) try { tg.HapticFeedback.selectionChanged(); } catch {} },
  success() { if (tgVersion('6.1')) try { tg.HapticFeedback.notificationOccurred('success'); } catch {} },
  warn()    { if (tgVersion('6.1')) try { tg.HapticFeedback.notificationOccurred('warning'); } catch {} },
};

// Цвет из текущей темы (css/style.css), чтобы шапка Telegram совпадала с сайтом
function themeColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#0b0a10';
}

function initTelegram() {
  if (!isTg) return;
  document.documentElement.classList.add('is-tg');
  try { tg.ready(); tg.expand(); } catch {}
  if (tgVersion('6.1')) {
    try { tg.setHeaderColor(themeColor('--bg')); tg.setBackgroundColor(themeColor('--bg')); } catch {}
    try { tg.BackButton.onClick(goBack); } catch {}
  }
  if (tgVersion('7.10')) try { tg.setBottomBarColor(themeColor('--bg')); } catch {}
  if (tgVersion('7.7')) try { tg.disableVerticalSwipes(); } catch {}
}

function openTelegramLink(url) {
  if (isTg) {
    try { tg.openTelegramLink(url); return; } catch {}
  }
  window.open(url, '_blank', 'noopener');
}

/* ── Хранилище ────────────────────────────────────────── */
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
  json(key, fallback) {
    try { const v = JSON.parse(storage.get(key)); return v ?? fallback; } catch { return fallback; }
  },
};

function detectLang() {
  const saved = storage.get('lang');
  if (I18N[saved]) return saved;
  const code = (tg?.initDataUnsafe?.user?.language_code || navigator.language || '').toLowerCase();
  return code.startsWith('uk') ? 'ua' : 'ru';
}

/* ── Google-таблица ───────────────────────────────────────
   Колонки (порядок любой, лишние колонки не мешают):
     id | Бренд | Вкус | Категория | Цена | Цена со скидкой |
     Цена Bemowo | Цена Ożarów | … | В наличии | Показывать | Фото
   • «Цена <район>» — цена в этом районе; новый столбец «Цена Wola»
     добавляет и новый район.
   • id не меняйте; для нового товара оставьте пустым.
   ========================================================== */
const catalogInfo = { at: 0, checkedAt: 0, json: '' };

const CATEGORY_NAMES = {
  liquid: ['liquid', 'liquids', 'жидкости', 'жидкость', 'жижа', 'жижи', 'рідини', 'рідина'],
  disposable: ['disposable', 'disposables', 'одноразки', 'одноразка', 'одноразові'],
  pod: ['pod', 'pods', 'pod-системы', 'pod-система', 'pod системы', 'под-системы', 'поды', 'pod-системи', 'pod systems'],
  cartridge: ['cartridge', 'cartridges', 'картриджи', 'картридж', 'картриджі'],
};

// Ссылку можно вставить любую: обычную ссылку на таблицу или «Опубликовать в интернете»
function sheetCsvUrl(url) {
  const u = String(url).trim();
  const gid = (u.match(/[#&?]gid=(\d+)/) || [])[1];
  if (/\/spreadsheets\/d\/e\//.test(u)) {
    const base = u.split('?')[0].split('#')[0].replace(/\/pub(html)?$/, '/pub');
    return `${base}?output=csv${gid ? `&gid=${gid}&single=true` : ''}`;
  }
  const id = (u.match(/\/spreadsheets\/d\/([\w-]+)/) || [])[1];
  if (id) return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${gid ? `&gid=${gid}` : ''}`;
  return u;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

const headKey = (s) => String(s ?? '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

function parseNumber(v) {
  const s = String(v ?? '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseBool(v, empty) {
  const s = headKey(v);
  if (!s) return empty;
  return ['true', 'да', 'так', 'yes', '1', '+', 'v', '✓', '✔', 'x', 'есть', 'є'].includes(s);
}

function slug(s) {
  return headKey(s).replace(/[^a-z0-9а-я]+/g, '-').replace(/^-|-$/g, '') || 'brand';
}

function hashId(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return 100000 + (h % 900000);
}

// Фото: путь в папке images, ссылка на картинку или ссылка на файл в Google Диске
function sheetImage(cell, brandTitle, flavor) {
  const v = String(cell || '').trim();
  const drive = v.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([\w-]+)/);
  if (drive) return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w1000`;
  if (/^https?:\/\//i.test(v)) return v;
  if (v) return v.startsWith('images/') ? v : `images/${v.replace(/^\/+/, '')}`;
  const known = CATALOG.find((b) => headKey(b.title) === headKey(brandTitle));
  return known ? `images/${known.folder}/${fileName(flavor)}` : 'images/no-photo.png';
}

function rowsFromSheet(table) {
  const problems = [];
  if (table.length < 2) return { rows: [], districts: [], problems: ['таблица пустая'] };
  const head = table[0].map(headKey);
  const col = (...names) => head.findIndex((h) => names.includes(h));
  const c = {
    id: col('id', 'номер'),
    brand: col('бренд', 'brand', 'марка'),
    flavor: col('вкус', 'название', 'товар', 'flavor', 'name', 'смак'),
    category: col('категория', 'category', 'категорія'),
    price: col('цена', 'старая цена', 'price', 'ціна'),
    sale: col('цена со скидкой', 'скидка', 'цена скидка', 'sale', 'ціна зі знижкою'),
    stock: col('в наличии', 'наличие', 'stock', 'в наявності'),
    visible: col('показывать', 'показать', 'visible', 'show', 'показувати'),
    img: col('фото', 'картинка', 'изображение', 'image', 'img', 'photo'),
  };
  if (c.brand < 0 || c.flavor < 0) {
    return { rows: [], districts: [], problems: ['нет колонок «Бренд» и «Вкус» в первой строке'] };
  }
  // колонки «Цена <район>» — цены по районам и сам список районов
  const districtCols = table[0]
    .map((h, i) => ({ i, m: String(h).trim().match(/^(?:цена|ціна|price)\s+(.+)$/i) }))
    .filter(({ m }) => m && !/^(со|зі)\s/i.test(m[1]) && headKey(m[1]) !== 'скидка')
    .map(({ i, m }) => ({ i, name: m[1].trim() }));

  const knownBrands = Object.fromEntries(CATALOG.map((b) => [headKey(b.title), b]));
  const usedIds = new Set();
  const rows = [];
  table.slice(1).forEach((r, n) => {
    const line = n + 2;
    const get = (i) => (i >= 0 ? String(r[i] ?? '').trim() : '');
    const brandTitle = get(c.brand);
    const flavor = get(c.flavor);
    if (!brandTitle && !flavor) return;
    if (!brandTitle || !flavor) { problems.push(`строка ${line}: нет бренда или вкуса — пропущена`); return; }
    if (!parseBool(get(c.visible), true)) return;

    const saleDefault = parseNumber(get(c.sale));
    const byDistrict = {};
    districtCols.forEach(({ i, name }) => {
      const v = parseNumber(get(i));
      if (v != null) byDistrict[name] = v;
    });
    let price = parseNumber(get(c.price));
    if (price == null) price = saleDefault ?? Object.values(byDistrict)[0] ?? null;
    if (price == null) { problems.push(`строка ${line} (${brandTitle} – ${flavor}): нет цены — пропущена`); return; }
    const sale = Object.keys(byDistrict).length
      ? { ...byDistrict, ...(saleDefault != null ? { '*': saleDefault } : {}) }
      : saleDefault;

    const rawCat = headKey(get(c.category));
    const category = Object.keys(CATEGORY_NAMES).find((k) => CATEGORY_NAMES[k].includes(rawCat)) || rawCat || 'liquid';
    if (rawCat && !CATEGORY_NAMES[category]) problems.push(`строка ${line}: неизвестная категория «${get(c.category)}»`);

    let id = parseInt(get(c.id), 10);
    if (!Number.isFinite(id) || id <= 0 || usedIds.has(id)) {
      id = hashId(`${headKey(brandTitle)}|${headKey(flavor)}`);
      while (usedIds.has(id)) id += 1;
    }
    usedIds.add(id);

    const known = knownBrands[headKey(brandTitle)];
    rows.push({
      id,
      brand: known ? known.brand : slug(brandTitle),
      brandTitle,
      short: known?.short || null,
      flavor,
      category,
      price,
      sale,
      img: sheetImage(get(c.img), brandTitle, flavor),
      outOfStock: !parseBool(get(c.stock), true),
    });
  });
  return { rows, districts: districtCols.map((d) => d.name), problems };
}

function useDistricts(list) {
  if (Array.isArray(list) && list.length) DISTRICTS.splice(0, DISTRICTS.length, ...list);
}

// При запуске: последняя сохранённая версия таблицы (мгновенно) или каталог из кода
function initCatalog() {
  const cached = SHEET_URL ? storage.json('catalogSheet', null) : null;
  if (cached && cached.url === SHEET_URL && Array.isArray(cached.rows) && cached.rows.length) {
    useDistricts(cached.districts);
    setProducts(cached.rows);
    catalogInfo.at = cached.at || 0;
    catalogInfo.json = JSON.stringify([cached.rows, cached.districts || []]);
  } else {
    setProducts(builtinRows());
  }
}
initCatalog();

async function refreshFromSheet() {
  if (!SHEET_URL) return;
  catalogInfo.checkedAt = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(sheetCsvUrl(SHEET_URL), { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error(`ответ ${res.status}`);
    const text = await res.text();
    if (/^\s*</.test(text)) throw new Error('вместо таблицы пришла страница — проверьте доступ к таблице');
    const { rows, districts, problems } = rowsFromSheet(parseCSV(text));
    problems.forEach((p) => console.warn('[таблица]', p));
    if (!rows.length) throw new Error('в таблице нет ни одного товара — оставляю прежний каталог');
    const json = JSON.stringify([rows, districts]);
    const changed = json !== catalogInfo.json;
    catalogInfo.at = Date.now();
    catalogInfo.json = json;
    storage.set('catalogSheet', JSON.stringify({ url: SHEET_URL, rows, districts, at: catalogInfo.at }));
    if (changed) applyCatalog(rows, districts);
    else safely(renderStatic);
  } catch (err) {
    console.warn('[таблица] не удалось обновить цены:', err.message);
  } finally {
    clearTimeout(timer);
  }
}

// Новые данные из таблицы: перестраиваем каталог, чистим корзину и избранное от исчезнувших товаров
function applyCatalog(rows, districts) {
  useDistricts(districts);
  setProducts(rows);
  const before = cart.length;
  cart = cart.filter((i) => productById.has(i.id));
  if (cart.length !== before) saveCart();
  [...favorites].forEach((id) => { if (!productById.has(id)) favorites.delete(id); });
  saveFavorites();
  if (state.brand && !brandList.some((b) => b.brand === state.brand)) state.brand = null;
  if (ui.overlay === 'sheet' && !productById.has(ui.sheetId)) closeOverlay();
  safely(renderDistricts);
  renderAll();
  if (state.district && !DISTRICTS.includes(state.district)) {
    state.district = null;
    safely(openDistrictGate);
  }
}

function loadCart() {
  // поддерживает и старый формат (целые объекты товара с qty)
  const raw = storage.json('cart', []);
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  return raw
    .map((x) => ({ id: Number(x?.id), qty: Math.min(MAX_QTY, Math.max(1, parseInt(x?.qty, 10) || 1)) }))
    .filter((x) => productById.has(x.id) && !seen.has(x.id) && seen.add(x.id));
}

function loadFavorites() {
  const raw = storage.json('favorites', []);
  return new Set(Array.isArray(raw) ? raw.map(Number).filter((id) => productById.has(id)) : []);
}

/* ── Состояние ────────────────────────────────────────── */
const state = {
  lang: detectLang(),
  currency: CURRENCIES[storage.get('currency')] ? storage.get('currency') : 'PLN',
  category: 'all',
  brand: null,
  favoritesOnly: false,
  view: 'shop',
  district: DISTRICTS.includes(storage.get('district')) ? storage.get('district') : null,
};
let cart = loadCart();
const favorites = loadFavorites();

const ui = {
  overlay: null,   // 'drawer' | 'sheet' | 'order'
  sheetId: null,
  order: null,
  shopScroll: 0,
};

const saveCart = () => storage.set('cart', JSON.stringify(cart));
const saveFavorites = () => storage.set('favorites', JSON.stringify([...favorites]));

/* ── Элементы ─────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const els = {
  shopView: $('shopView'), cartView: $('cartView'),
  heroPill: $('heroPill'), listAnchor: $('listAnchor'), catalogUpdated: $('catalogUpdated'), saleTimer: $('saleTimer'), filters: $('filters'),
  categoryChips: $('categoryChips'), brandChips: $('brandChips'),
  listHead: $('listHead'), grid: $('productGrid'),
  favBadge: $('favBadge'), cartBadge: $('cartBadge'), cartBtn: $('cartBtn'),
  cartBar: $('cartBar'), cartBarQty: $('cartBarQty'), cartBarTotal: $('cartBarTotal'), cartBarSave: $('cartBarSave'),
  cartHeadCount: $('cartHeadCount'), clearCartBtn: $('clearCartBtn'),
  cartEmpty: $('cartEmpty'), cartFilled: $('cartFilled'), cartList: $('cartList'),
  comment: $('orderComment'),
  districtPanel: $('districtPanel'), districtOptions: $('districtOptions'), districtError: $('districtError'),
  gate: $('districtGate'), gateOptions: $('gateOptions'), drawerDistricts: $('drawerDistricts'),
  sumCountLabel: $('sumCountLabel'), sumFull: $('sumFull'), sumSaveRow: $('sumSaveRow'),
  sumSaved: $('sumSaved'), sumTotal: $('sumTotal'), checkoutBtn: $('checkoutBtn'),
  drawer: $('drawer'), backdrop: $('backdrop'),
  sheet: $('sheet'), sheetBody: $('sheetBody'),
  order: $('orderModal'), orderMeta: $('orderMeta'), orderText: $('orderText'),
  toast: $('toast'),
};
const overlays = { drawer: els.drawer, sheet: els.sheet, order: els.order, gate: els.gate };

/* ── Утилиты ──────────────────────────────────────────── */
function t(key, vars) {
  let s = I18N[state.lang][key] ?? I18N.ru[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

function plural(n, key = 'items') {
  const forms = I18N[state.lang][key];
  if (forms.length === 2) return n === 1 ? forms[0] : forms[1];
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
}
const itemsText = (n) => `${n} ${plural(n)}`;

function money(pln, cur = state.currency) {
  const c = CURRENCIES[cur];
  const value = (pln * c.rate).toLocaleString(I18N[state.lang].locale, {
    minimumFractionDigits: c.decimals,
    maximumFractionDigits: c.decimals,
  });
  return `${value} ${c.symbol}`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const icon = (id) => `<svg class="ic"><use href="#${id}"/></svg>`;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const qtyOf = (id) => cart.find((i) => i.id === id)?.qty || 0;

function cartTotals() {
  let count = 0, full = 0, total = 0;
  for (const { id, qty } of cart) {
    const p = productById.get(id);
    if (p.outOfStock) continue;
    count += qty;
    full += p.price * qty;
    total += p.sale * qty;
  }
  return { count, full, total, saved: full - total };
}

/* ── Фильтрация ───────────────────────────────────────── */
function visibleProducts() {
  let list = products;
  if (state.favoritesOnly) {
    list = list.filter((p) => favorites.has(p.id));
  } else {
    if (state.category !== 'all') list = list.filter((p) => p.category === state.category);
    if (state.brand) list = list.filter((p) => p.brand === state.brand);
  }

  // в наличии — сверху, дальше порядок как в каталоге
  return [...list].sort((a, b) => (a.outOfStock - b.outOfStock) || (a.order - b.order));
}

function brandsOf(category) {
  return brandList.filter((b) => b.category === category);
}

/* ── Рендер: статичные тексты ─────────────────────────── */
function renderStatic() {
  document.documentElement.lang = state.lang === 'ua' ? 'uk' : state.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });

  document.querySelectorAll('[data-action="lang"]').forEach((b) => b.classList.toggle('is-active', b.dataset.value === state.lang));
  document.querySelectorAll('#curSeg button').forEach((b) => b.classList.toggle('is-active', b.dataset.value === state.currency));

  els.catalogUpdated.hidden = !catalogInfo.at;
  if (catalogInfo.at) {
    const time = new Date(catalogInfo.at).toLocaleString(I18N[state.lang].locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    els.catalogUpdated.textContent = t('catalogUpdated', { time });
  }

  const maxSale = Math.max(0, ...products.filter((p) => !p.outOfStock).map((p) => p.discount));
  els.heroPill.hidden = !maxSale;
  els.heroPill.textContent = `${THEME === 'halloween' ? '🎃' : '🔥'} ${t('saleUpTo', { n: maxSale })}`;

  document.querySelectorAll('[data-count]').forEach((el) => {
    const key = el.dataset.count;
    let n;
    if (key === 'all') n = products.length;
    else if (key === 'fav') n = favorites.size;
    else if (key === 'cart') n = cartTotals().count;
    else n = products.filter((p) => p.category === key).length;
    el.textContent = n || '';
  });
  renderNavActive();
}

function renderNavActive() {
  document.querySelectorAll('.drawer-nav .nav-item').forEach((el) => {
    let active = false;
    if (state.view === 'cart') active = el.dataset.action === 'cart';
    else if (state.favoritesOnly) active = el.dataset.action === 'favorites';
    else active = el.dataset.action === 'nav-category' && el.dataset.value === state.category;
    el.classList.toggle('is-active', active);
  });
}

/* ── Таймер акции ─────────────────────────────────────── */
const saleView = { key: '' };

const saleDay = (ms) => new Date(ms).toLocaleDateString(I18N[state.lang].locale, { timeZone: 'Europe/Warsaw', day: 'numeric', month: '2-digit' });

// «Все жидкости по 30 zł» — из SALE.prices (первая категория), с учётом района и валюты
function saleOfferText() {
  const [cat, value] = Object.entries(SALE.prices || {})[0] || [];
  if (cat == null) return t('saleOfferAny');
  return t('saleOffer', { what: t(cat).toLowerCase(), price: money(districtPrice(value, 0)) });
}

function renderSaleTimer(force = false) {
  const el = els.saleTimer;
  const now = Date.now();
  const start = SALE ? Date.parse(SALE.start) : NaN;
  const end = SALE ? Date.parse(SALE.end) : NaN;
  // акция началась или закончилась, пока магазин открыт, — пересчитываем цены везде
  const active = saleActive(now);
  if (saleView.active !== undefined && saleView.active !== active && !force) {
    saleView.active = active;
    renderAll();
    return;
  }
  saleView.active = active;
  if (!SALE || !(end > now)) { el.hidden = true; saleView.key = ''; return; }

  const live = now >= start;
  const key = `${live}|${state.lang}|${state.currency}|${state.district}`;
  if (force || key !== saleView.key) {
    saleView.key = key;
    const u = I18N[state.lang].units;
    const emoji = THEME === 'halloween' ? '🎃' : '🔥';
    const days = Math.round((end - start) / 86400000);
    const range = `<span class="nowrap">${esc(saleDay(start))}–${esc(saleDay(end - 1))}</span>`;
    const label = live
      ? `${esc(t('saleLiveLabel'))} · ${range}`
      : `${esc(THEME === 'halloween' ? t('saleLabelHalloween') : t('saleLabel'))} · <span class="nowrap">${days} ${esc(plural(days, 'days'))}</span> · ${range}`;
    el.classList.toggle('is-live', live);
    el.innerHTML = `
      <div class="sale-timer-label"><span class="sale-timer-emoji">${emoji}</span>${label}</div>
      <div class="sale-timer-offer">${esc(saleOfferText())}</div>
      <div class="sale-timer-row">
        <span class="sale-timer-sub">${esc(live ? t('saleEndsIn') : t('saleStartsIn'))}</span>
        <div class="sale-timer-clock">
          ${['d', 'h', 'm', 's'].map((k, i) => `<span class="tt" data-k="${k}"><b>00</b><i>${esc(u[i])}</i></span>`).join('')}
        </div>
      </div>`;
    el.hidden = false;
  }
  let left = Math.max(0, Math.floor(((live ? end : start) - now) / 1000));
  const parts = { d: Math.floor(left / 86400), h: Math.floor(left / 3600) % 24, m: Math.floor(left / 60) % 60, s: left % 60 };
  el.querySelectorAll('.tt').forEach((tile) => {
    const k = tile.dataset.k;
    tile.hidden = k === 'd' && parts.d === 0;
    tile.querySelector('b').textContent = String(parts[k]).padStart(2, '0');
  });
}

/* ── Рендер: фильтры ──────────────────────────────────── */
function renderChips() {
  // в избранном фильтров нет — прячем всю панель, чтобы не висела пустая полоса
  els.filters.hidden = state.favoritesOnly;

  const counts = { all: products.length };
  CATEGORIES.forEach((c) => { counts[c] = products.filter((p) => p.category === c).length; });

  els.categoryChips.innerHTML = ['all', ...CATEGORIES].map((c) => `
    <button class="chip ${state.category === c ? 'is-active' : ''}" data-action="category" data-value="${c}">
      ${icon(CATEGORY_ICONS[c])}<span>${esc(t(c))}</span><span class="chip-count">${counts[c]}</span>
    </button>`).join('');

  const brands = state.category === 'all' ? [] : brandsOf(state.category);
  els.brandChips.innerHTML = brands.length > 1 ? brands.map((b) => `
    <button class="chip ${state.brand === b.brand ? 'is-active' : ''}" data-action="brand" data-value="${b.brand}">
      ${esc(b.short || b.title)}<span class="chip-count">${b.count}</span>
    </button>`).join('') : '';

  revealActiveChip(els.categoryChips);
  revealActiveChip(els.brandChips);
}

function revealActiveChip(row) {
  const chip = row.querySelector('.is-active');
  if (!chip) return;
  const left = chip.offsetLeft - 12;
  const right = chip.offsetLeft + chip.offsetWidth + 12 - row.clientWidth;
  if (row.scrollLeft > left) row.scrollTo({ left, behavior: 'smooth' });
  else if (row.scrollLeft < right) row.scrollTo({ left: right, behavior: 'smooth' });
}

/* ── Рендер: сетка товаров ────────────────────────────── */
function ctaHTML(p, size = '') {
  if (p.outOfStock) {
    return `<button class="btn btn-soldout ${size === 'lg' ? 'btn-lg' : ''}" disabled>${esc(t('outOfStock'))}</button>`;
  }
  const qty = qtyOf(p.id);
  if (!qty) {
    return `<button class="btn btn-primary btn-add ${size === 'lg' ? 'btn-lg' : ''}" data-action="add" data-id="${p.id}">
      ${icon('i-plus')}<span>${esc(t('addToCart'))}</span></button>`;
  }
  return stepperHTML(p.id, qty, size);
}

function stepperHTML(id, qty, size = '') {
  return `<div class="stepper ${size ? 'stepper-' + size : ''}">
    <button data-action="dec" data-id="${id}" aria-label="−">${icon('i-minus')}</button>
    <span class="qty">${qty}</span>
    <button data-action="inc" data-id="${id}" aria-label="+" ${qty >= MAX_QTY ? 'disabled' : ''}>${icon('i-plus')}</button>
  </div>`;
}

function favHTML(id) {
  const on = favorites.has(id);
  return `<button class="fav-btn js-fav ${on ? 'is-on' : ''}" data-action="fav" data-id="${id}"
    aria-pressed="${on}" aria-label="${esc(t('favorites'))}">${icon('i-heart')}</button>`;
}

// Заглушка, если картинки товара ещё нет (или она не загрузилась)
const PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">'
  + '<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="163" y1="92" x2="237" y2="242">'
  + `<stop offset="0" stop-color="${themeColor('--violet')}"/><stop offset="1" stop-color="${themeColor('--pink')}"/></linearGradient></defs>`
  + `<rect width="400" height="400" fill="${themeColor('--surface-2')}"/>`
  + '<rect x="163" y="92" width="74" height="150" rx="26" fill="none" stroke="url(#g)" stroke-width="10"/>'
  + '<path d="M188 128h24" stroke="url(#g)" stroke-width="10" stroke-linecap="round"/>'
  + '<circle cx="200" cy="200" r="9" fill="url(#g)"/>'
  + '<text x="200" y="318" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800"'
  + ' font-size="34" letter-spacing="2" fill="#cdc8da">HORN HUB</text></svg>');

function imgFallback(img) {
  img.onerror = null;
  img.src = PLACEHOLDER_IMG;
}

const IMG_EVENTS = `onload="this.classList.add('is-loaded');this.parentNode.classList.add('is-ready')"
  onerror="imgFallback(this)"`;

function cardHTML(p, index) {
  const eager = index < 4;
  return `
  <article class="card ${p.outOfStock ? 'is-soldout' : ''}" data-id="${p.id}" style="animation-delay:${Math.min(index, 12) * 30}ms">
    <div class="media" data-action="open">
      <img src="${esc(p.img)}" alt="${esc(p.name)}" width="800" height="800"
        loading="${eager ? 'eager' : 'lazy'}" decoding="async" ${IMG_EVENTS}>
      ${p.discount && !p.outOfStock ? `<span class="tag tag-sale">−${p.discount}%</span>` : ''}
      ${p.outOfStock ? `<span class="tag tag-soldout">${esc(t('outOfStock'))}</span>` : ''}
      ${favHTML(p.id)}
    </div>
    <div class="card-body">
      <div class="card-brand">${esc(p.brandTitle)}</div>
      <h3 class="card-title" data-action="open">${esc(p.flavor)}</h3>
      <div class="card-stock ${p.outOfStock ? 'is-out' : ''}">${esc(t(p.outOfStock ? 'outOfStock' : 'inStock'))}</div>
      <div class="price">
        <span class="price-new">${money(p.sale)}</span>
        ${p.discount ? `<span class="price-old">${money(p.price)}</span>` : ''}
      </div>
      <div class="js-cta">${ctaHTML(p)}</div>
    </div>
  </article>`;
}

function renderListHead(count) {
  let title;
  if (state.favoritesOnly) title = t('favorites');
  else if (state.brand) title = brandList.find((b) => b.brand === state.brand)?.title || t('all');
  else title = t(state.category);

  els.listHead.innerHTML = `
    ${state.favoritesOnly ? `<button class="icon-btn" data-action="exit-favorites" aria-label="${esc(t('back'))}">${icon('i-back')}</button>` : ''}
    <h2 class="list-title">${esc(title)}</h2>
    <span class="list-count">${itemsText(count)}</span>`;
}

function renderGrid() {
  const list = visibleProducts();
  renderListHead(list.length);

  if (!list.length) {
    const fav = state.favoritesOnly;
    els.grid.innerHTML = `
      <div class="empty">
        <div class="empty-icon">${icon(fav ? 'i-heart' : 'i-sad')}</div>
        <div class="empty-title">${esc(t(fav ? 'favEmpty' : 'notFound'))}</div>
        <div class="empty-hint">${esc(t(fav ? 'favEmptyHint' : 'notFoundHint'))}</div>
        <button class="btn btn-primary" data-action="${fav ? 'exit-favorites' : 'reset-filters'}">
          ${esc(t(fav ? 'toCatalog' : 'resetFilters'))}</button>
      </div>`;
    return;
  }

  let html = '';
  let dividerShown = false;
  const hasAvailable = list.some((p) => !p.outOfStock);
  list.forEach((p, i) => {
    if (p.outOfStock && !dividerShown && hasAvailable) {
      dividerShown = true;
      html += `<div class="grid-divider">${esc(t('soldOutGroup'))} · ${list.length - i}</div>`;
    }
    html += cardHTML(p, i);
  });
  els.grid.innerHTML = html;
}

/* ── Рендер: точечные обновления ──────────────────────── */
function refreshProduct(id) {
  const p = productById.get(id);
  const card = els.grid.querySelector(`.card[data-id="${id}"]`);
  if (card) {
    card.querySelector('.js-cta').innerHTML = ctaHTML(p);
    card.querySelector('.js-fav').outerHTML = favHTML(id);
  }
  if (ui.overlay === 'sheet' && ui.sheetId === id) {
    els.sheetBody.querySelector('.js-cta').innerHTML = ctaHTML(p, 'lg');
    els.sheetBody.querySelector('.sheet-actions .js-fav').outerHTML = favHTML(id);
  }
}

function renderBadges(bump = false) {
  const { count } = cartTotals();
  els.cartBadge.hidden = !count;
  els.cartBadge.textContent = count > 99 ? '99+' : count;
  if (bump && count) {
    els.cartBadge.classList.remove('bump');
    void els.cartBadge.offsetWidth; // перезапуск анимации
    els.cartBadge.classList.add('bump');
  }
  els.favBadge.hidden = !favorites.size;
  els.favBadge.textContent = favorites.size;

  document.querySelector('[data-count="fav"]').textContent = favorites.size || '';
  document.querySelector('[data-count="cart"]').textContent = count || '';
}

function renderCartBar() {
  const { count, total, saved } = cartTotals();
  const visible = count > 0 && state.view === 'shop';
  els.cartBar.classList.toggle('is-visible', visible);
  els.cartBar.tabIndex = visible ? 0 : -1;
  els.cartBar.setAttribute('aria-hidden', String(!visible));
  document.body.classList.toggle('has-bar', visible);
  if (!count) return;
  els.cartBarQty.textContent = count > 99 ? '99+' : count;
  els.cartBarTotal.textContent = money(total);
  els.cartBarSave.textContent = saved ? `${t('discount')}: −${money(saved)}` : itemsText(count);
}

/* ── Рендер: корзина ──────────────────────────────────── */
function cartItemHTML({ id, qty }) {
  const p = productById.get(id);
  return `
  <div class="cart-item ${p.outOfStock ? 'is-soldout' : ''}" data-id="${id}">
    <span class="ci-media" data-action="open"><img src="${esc(p.img)}" alt="${esc(p.name)}" width="76" height="76" decoding="async" onerror="imgFallback(this)"></span>
    <div class="ci-info">
      <div class="card-brand">${esc(p.brandTitle)}</div>
      <div class="ci-name">${esc(p.flavor)}</div>
      <div class="ci-price">${money(p.sale)}${p.discount ? `<s>${money(p.price)}</s>` : ''}</div>
      ${p.outOfStock ? `<div class="ci-warn">${esc(t('unavailable'))}</div>` : ''}
    </div>
    <div class="ci-side">
      <button class="ci-remove" data-action="remove" data-id="${id}" aria-label="${esc(t('removedFromCart'))}">${icon('i-trash')}</button>
      <div class="ci-total">${money(p.sale * qty)}</div>
      <div class="js-cta">${p.outOfStock ? '' : stepperHTML(id, qty, 'sm')}</div>
    </div>
  </div>`;
}

function renderCart() {
  const empty = !cart.length;
  els.cartEmpty.hidden = !empty;
  els.cartFilled.hidden = empty;
  els.clearCartBtn.hidden = empty;
  els.cartList.innerHTML = cart.map(cartItemHTML).join('');
  renderSummary();
}

function updateCartRow(id) {
  const row = els.cartList.querySelector(`.cart-item[data-id="${id}"]`);
  const qty = qtyOf(id);
  if (!row || !qty) { renderCart(); return; }
  const p = productById.get(id);
  row.querySelector('.ci-total').textContent = money(p.sale * qty);
  row.querySelector('.js-cta').innerHTML = stepperHTML(id, qty, 'sm');
  renderSummary();
}

function renderSummary() {
  const { count, full, total, saved } = cartTotals();
  els.cartHeadCount.textContent = count ? `· ${itemsText(count)}` : '';
  els.sumCountLabel.textContent = t('itemsSum', { n: count });
  els.sumFull.textContent = money(full);
  els.sumSaveRow.hidden = !saved;
  els.sumSaved.textContent = `−${money(saved)}`;
  els.sumTotal.textContent = money(total);
  els.checkoutBtn.disabled = !count;
}

/* ── Рендер: карточка товара (sheet) ──────────────────── */
function renderSheet() {
  const p = productById.get(ui.sheetId);
  if (!p) return;
  els.sheet.dataset.id = p.id;
  const related = products.filter((x) => x.brand === p.brand && x.id !== p.id)
    .sort((a, b) => (a.outOfStock - b.outOfStock) || (a.order - b.order));

  els.sheetBody.innerHTML = `
    <div class="sheet-media ${p.outOfStock ? 'is-soldout' : ''}">
      <img src="${esc(p.img)}" alt="${esc(p.name)}" width="800" height="800" decoding="async" onerror="imgFallback(this)">
      ${p.discount && !p.outOfStock ? `<span class="tag tag-sale">−${p.discount}%</span>` : ''}
    </div>
    <div class="sheet-info">
      <div class="sheet-meta">
        <span class="pill">${icon(CATEGORY_ICONS[p.category])}${esc(t(p.category))}</span>
        <span class="pill stock ${p.outOfStock ? 'is-out' : ''}">${esc(t(p.outOfStock ? 'outOfStock' : 'inStock'))}</span>
      </div>
      <div class="sheet-brand">${esc(p.brandTitle)}</div>
      <h2 class="sheet-title">${esc(p.flavor)}</h2>
      <div class="sheet-price">
        <span class="price-new">${money(p.sale)}</span>
        ${p.discount ? `<span class="price-old">${money(p.price)}</span><span class="save-pill">−${money(p.price - p.sale)}</span>` : ''}
      </div>
      <div class="sheet-actions">
        <div class="js-cta">${ctaHTML(p, 'lg')}</div>
        ${favHTML(p.id)}
      </div>
    </div>
    ${related.length ? `
    <div class="related">
      <div class="related-title">${esc(t('moreFlavors', { brand: p.brandTitle }))}</div>
      <div class="related-row">
        ${related.map((r) => `
          <button class="mini ${r.outOfStock ? 'is-soldout' : ''}" data-action="open" data-id="${r.id}">
            <div class="media"><img src="${esc(r.img)}" alt="${esc(r.name)}" width="800" height="800" loading="lazy" decoding="async" ${IMG_EVENTS}></div>
            <div class="mini-name">${esc(r.flavor)}</div>
          </button>`).join('')}
      </div>
    </div>` : ''}`;
  els.sheetBody.scrollTop = 0;
}

// Ошибка в одной части не должна ронять весь магазин
function safely(fn) {
  try { fn(); } catch (err) { console.error(err); }
}

function renderAll() {
  safely(renderStatic);
  safely(() => renderSaleTimer(true));
  safely(renderChips);
  safely(renderGrid);
  safely(renderBadges);
  safely(renderCartBar);
  if (state.view === 'cart') safely(renderCart);
  if (ui.overlay === 'sheet') safely(renderSheet);
  if (ui.overlay === 'order') safely(() => buildOrder(ui.order?.id));
  safely(syncDistricts);
}

/* ── Оверлеи и навигация ──────────────────────────────── */
function openOverlay(name) {
  if (ui.overlay && ui.overlay !== name) closeOverlay();
  ui.overlay = name;
  const el = overlays[name];
  el.inert = false;
  el.setAttribute('aria-hidden', 'false');
  el.classList.add('is-open');
  els.backdrop.classList.add('is-open');
  document.body.classList.add('lock');
  syncBackButton();
}

function closeOverlay() {
  if (!ui.overlay) return;
  if (ui.overlay === 'gate' && !state.district) return; // без района в магазин не пускаем
  const el = overlays[ui.overlay];
  el.classList.remove('is-open');
  el.inert = true;
  el.setAttribute('aria-hidden', 'true');
  els.backdrop.classList.remove('is-open');
  document.body.classList.remove('lock');
  if (ui.overlay === 'sheet') ui.sheetId = null;
  ui.overlay = null;
  syncBackButton();
}

function syncBackButton() {
  if (!tgVersion('6.1')) return;
  const need = Boolean(ui.overlay) || state.view === 'cart' || state.favoritesOnly;
  try { need ? tg.BackButton.show() : tg.BackButton.hide(); } catch {}
}

function goBack() {
  if (ui.overlay) closeOverlay();
  else if (state.view === 'cart') showView('shop');
  else if (state.favoritesOnly) exitFavorites();
}

function showView(view) {
  if (state.view === view) return;
  if (view === 'cart') ui.shopScroll = window.scrollY;
  state.view = view;
  els.shopView.hidden = view !== 'shop';
  els.cartView.hidden = view !== 'cart';
  if (view === 'cart') {
    clearDistrictError();
    renderCart();
    window.scrollTo(0, 0);
  } else {
    window.scrollTo(0, ui.shopScroll);
  }
  renderCartBar();
  renderNavActive();
  syncBackButton();
}

function scrollToResults() {
  const header = document.getElementById('topbar').offsetHeight;
  const target = els.listAnchor.getBoundingClientRect().top + window.scrollY - header;
  if (window.scrollY > target) window.scrollTo({ top: target, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

/* ── Каталог: действия ────────────────────────────────── */
function goToShop() {
  closeOverlay();
  showView('shop');
}

function setCategory(cat) {
  goToShop();
  state.category = cat;
  state.brand = null;
  state.favoritesOnly = false;
  renderChips();
  renderGrid();
  renderNavActive();
  syncBackButton();
  scrollToResults();
}

function setBrand(brand) {
  state.brand = state.brand === brand ? null : brand;
  renderChips();
  renderGrid();
  scrollToResults();
}

function showFavorites() {
  goToShop();
  state.favoritesOnly = true;
  renderChips();
  renderGrid();
  renderNavActive();
  syncBackButton();
  scrollToResults();
}

function exitFavorites() {
  state.favoritesOnly = false;
  renderChips();
  renderGrid();
  renderNavActive();
  syncBackButton();
}

function resetFilters() {
  state.category = 'all';
  state.brand = null;
  state.favoritesOnly = false;
  renderChips();
  renderGrid();
  renderNavActive();
  syncBackButton();
}

/* ── Корзина: действия ────────────────────────────────── */
function setQty(id, qty) {
  const p = productById.get(id);
  if (!p) return;
  const prev = qtyOf(id);
  qty = Math.max(0, Math.min(MAX_QTY, qty));
  if (qty > prev && p.outOfStock) return;
  if (qty === prev) {
    if (qty === MAX_QTY) showToast(t('maxQty', { n: MAX_QTY }));
    return;
  }

  const idx = cart.findIndex((i) => i.id === id);
  if (qty === 0) cart.splice(idx, 1);
  else if (idx > -1) cart[idx].qty = qty;
  else cart.push({ id, qty });

  saveCart();
  onCartChange(id, qty > prev);
}

function onCartChange(id, increased) {
  refreshProduct(id);
  renderBadges(increased);
  renderCartBar();
  if (state.view === 'cart') updateCartRow(id);
}

function addToCart(id, srcEl) {
  if (productById.get(id)?.outOfStock) return;
  const wasEmpty = !qtyOf(id);
  const img = srcEl?.closest('.card, .sheet')?.querySelector('.media img, .sheet-media img');
  setQty(id, qtyOf(id) + 1);
  haptic.tap();
  if (wasEmpty) {
    flyToCart(img);
    showToast(t('addedToCart'));
  }
}

function removeFromCart(id) {
  const idx = cart.findIndex((i) => i.id === id);
  if (idx < 0) return;
  const item = { ...cart[idx] };
  setQty(id, 0);
  haptic.warn();
  showToast(t('removedFromCart'), {
    action: t('undo'),
    onAction: () => {
      if (qtyOf(id)) return;
      cart.splice(Math.min(idx, cart.length), 0, item);
      saveCart();
      onCartChange(id, true);
    },
  });
}

function clearCart() {
  if (!cart.length) return;
  const backup = cart.map((i) => ({ ...i }));
  cart = [];
  saveCart();
  renderCart();
  renderBadges();
  renderCartBar();
  renderGrid();
  haptic.warn();
  showToast(t('cartCleared'), {
    action: t('undo'),
    onAction: () => {
      cart = backup;
      saveCart();
      renderAll();
    },
  });
}

function toggleFavorite(id) {
  const on = !favorites.has(id);
  on ? favorites.add(id) : favorites.delete(id);
  saveFavorites();
  haptic.select();
  refreshProduct(id);
  if (on) document.querySelectorAll(`.js-fav[data-id="${id}"]`).forEach((b) => b.classList.add('pulse'));
  renderBadges();
  if (state.favoritesOnly) renderGrid();
  showToast(t(on ? 'favAdded' : 'favRemoved'));
}

/* ── Оформление заказа ────────────────────────────────── */
function buildOrder(existingId) {
  const id = existingId || String(Date.now()).slice(-6);
  const items = cart.map((i) => ({ ...i, p: productById.get(i.id) })).filter((i) => !i.p.outOfStock);
  const { count, total, saved } = cartTotals();
  const date = new Date().toLocaleString(I18N[state.lang].locale, { dateStyle: 'short', timeStyle: 'short' });
  const user = tg?.initDataUnsafe?.user;
  const client = user ? (user.username ? `@${user.username}` : [user.first_name, user.last_name].filter(Boolean).join(' ')) : '';
  const comment = els.comment.value.trim();
  const totalLine = `💰 ${t('total')}: ${money(total)}${state.currency !== 'PLN' ? ` (${money(total, 'PLN')})` : ''}`;

  const lines = [
    `🧾 ${t('orderNo')} #${id}`,
    `📅 ${date}`,
    client ? `👤 ${t('client')}: ${client}` : null,
    `📍 ${t('district')}: ${state.district}`,
    '',
    ...items.map((i, n) => `${n + 1}. ${i.p.name} × ${i.qty} — ${money(i.p.sale * i.qty)}`),
    '',
    `📦 ${itemsText(count)}`,
    saved ? `🏷 ${t('discount')}: −${money(saved)}` : null,
    totalLine,
    ...(comment ? ['', `💬 ${t('comment')}: ${comment}`] : []),
  ].filter((l) => l !== null);

  ui.order = { id, text: lines.join('\n') };
  els.orderMeta.textContent = `#${id} · ${state.district} · ${itemsText(count)} · ${money(total)}`;
  els.orderText.value = ui.order.text;
  return ui.order;
}

function checkout() {
  if (!cartTotals().count) {
    showToast(t('emptyCart'));
    return;
  }
  if (!state.district) {
    showDistrictError();
    return;
  }
  buildOrder();
  openOverlay('order');
  haptic.tap();
}

function copyText(text) {
  // Сначала синхронный способ — он работает почти во всех webview
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    if (ok) return Promise.resolve(true);
  } catch {}
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true, () => false);
  }
  return Promise.resolve(false);
}

function copyOrder() {
  copyText(ui.order.text).then((ok) => {
    showToast(t(ok ? 'copied' : 'copyFailed'));
    if (ok) haptic.success();
    else { els.orderText.focus(); els.orderText.select(); }
  });
}

function sendOrder() {
  const text = ui.order.text;
  // копируем и сразу открываем чат — в рамках одного нажатия, иначе браузер заблокирует окно
  copyText(text).then((ok) => showToast(t(ok ? 'copied' : 'copyFailed')));
  haptic.success();
  openTelegramLink(`${ADMIN_URL}?text=${encodeURIComponent(text)}`);
}

/* ── Район доставки ───────────────────────────────────── */
// Кнопки создаются один раз, дальше только переключаем состояние — так не теряется фокус
function renderDistricts() {
  els.districtOptions.innerHTML = DISTRICTS.map((d) => `
    <button class="district-btn" role="radio" data-action="district" data-value="${esc(d)}">
      ${icon('i-pin')}<span>${esc(d)}</span></button>`).join('');
  els.drawerDistricts.innerHTML = DISTRICTS.map((d) =>
    `<button data-action="district" data-value="${esc(d)}">${esc(d)}</button>`).join('');
  renderGate();
  syncDistricts();
}

// Окно выбора района (показывается при входе)
function renderGate() {
  els.gateOptions.innerHTML = DISTRICTS.map((d) => `
    <button class="gate-btn" data-action="district" data-value="${esc(d)}">
      <span class="gate-btn-icon">${icon('i-pin')}</span>
      <span class="gate-btn-name">${esc(d)}</span>
      ${icon('i-arrow')}</button>`).join('');
  syncDistricts();
}

function syncDistricts() {
  const radios = [...els.districtOptions.querySelectorAll('.district-btn')];
  radios.forEach((b) => {
    const on = b.dataset.value === state.district;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-checked', String(on));
  });
  // «бегающий» tabindex: в группу попадаем одним Tab, внутри — стрелками
  const current = radios.find((b) => b.dataset.value === state.district) || radios[0];
  radios.forEach((b) => { b.tabIndex = b === current ? 0 : -1; });

  document.querySelectorAll('#drawerDistricts button, #gateOptions button').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.value === state.district);
  });
  els.gate.classList.toggle('is-dismissible', Boolean(state.district));
}

// В Telegram район дополнительно хранится в облаке Telegram: не теряется,
// даже если приложение очистит данные сайта, и переносится на другие устройства
function saveDistrictToCloud(district) {
  if (tgVersion('6.9')) try { tg.CloudStorage.setItem('district', district); } catch {}
}

function loadDistrictFromCloud(done) {
  if (!tgVersion('6.9') || !tg.CloudStorage) { done(null); return; }
  let finished = false;
  const finish = (value) => { if (!finished) { finished = true; done(value); } };
  setTimeout(() => finish(null), 1500); // облако не ответило — просто спросим район
  try { tg.CloudStorage.getItem('district', (err, value) => finish(err ? null : value)); } catch { finish(null); }
}

function setDistrict(district) {
  if (!DISTRICTS.includes(district)) return;
  const prev = state.district;
  state.district = district;
  storage.set('district', district);
  saveDistrictToCloud(district);
  clearDistrictError();
  haptic.select();
  if (ui.overlay === 'gate') closeOverlay();
  if (prev !== district) {
    renderAll(); // цены зависят от района
    if (prev) showToast(t('districtChanged', { d: district }));
  } else {
    syncDistricts();
  }
}

function openDistrictGate() {
  openOverlay('gate');
  const btn = els.gateOptions.querySelector('.is-active') || els.gateOptions.querySelector('button');
  btn?.focus({ preventScroll: true });
}

function clearDistrictError() {
  els.districtPanel.classList.remove('is-invalid', 'shake');
  els.districtOptions.removeAttribute('aria-invalid');
  els.districtError.hidden = true;
}

function showDistrictError() {
  const panel = els.districtPanel;
  els.districtError.hidden = false; // role="alert" — экранный диктор зачитает текст
  els.districtOptions.setAttribute('aria-invalid', 'true');
  panel.classList.remove('shake');
  void panel.offsetWidth; // перезапуск анимации
  panel.classList.add('is-invalid', 'shake');
  els.districtOptions.querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
  panel.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
  haptic.warn();
}

/* ── Тост ─────────────────────────────────────────────── */
let toastTimer = null;
function showToast(message, opts = {}) {
  els.toast.innerHTML = `<span>${esc(message)}</span>${opts.action ? `<button class="toast-action">${esc(opts.action)}</button>` : ''}`;
  if (opts.action) {
    els.toast.querySelector('.toast-action').addEventListener('click', () => {
      hideToast();
      opts.onAction?.();
    }, { once: true });
  }
  els.toast.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, opts.action ? 4000 : 2000);
}
function hideToast() {
  clearTimeout(toastTimer);
  els.toast.classList.remove('is-show');
}

/* ── Анимация «в корзину» ─────────────────────────────── */
function flyToCart(img) {
  if (!img || !img.complete || !img.naturalWidth || reducedMotion() || !img.animate) return;
  const from = img.getBoundingClientRect();
  const to = els.cartBtn.getBoundingClientRect();
  if (!from.width || !to.width) return;

  const size = Math.min(from.width, 120);
  const clone = document.createElement('img');
  clone.src = img.currentSrc || img.src;
  clone.className = 'fly';
  Object.assign(clone.style, {
    width: `${size}px`, height: `${size}px`,
    left: `${from.left + (from.width - size) / 2}px`,
    top: `${from.top + (from.height - size) / 2}px`,
  });
  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  clone.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(.6)`, opacity: .9, offset: .55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.15)`, opacity: .2 },
  ], { duration: 700, easing: 'cubic-bezier(.45,0,.55,1)' }).onfinish = () => clone.remove();
}

/* ── События ──────────────────────────────────────────── */
const actions = {
  menu: () => { openOverlay('drawer'); haptic.tap(); },
  close: () => closeOverlay(),
  home: () => { resetFilters(); goToShop(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  back: () => goBack(),
  cart: () => { closeOverlay(); showView('cart'); haptic.tap(); },
  favorites: () => { showFavorites(); haptic.tap(); },
  'exit-favorites': () => exitFavorites(),
  'nav-category': (id, el) => setCategory(el.dataset.value),
  category: (id, el) => { setCategory(el.dataset.value); haptic.select(); },
  brand: (id, el) => { setBrand(el.dataset.value); haptic.select(); },
  'reset-filters': () => resetFilters(),
  open: (id) => {
    if (!productById.has(id)) return;
    ui.sheetId = id;
    renderSheet();
    openOverlay('sheet');
  },
  add: (id, el) => addToCart(id, el),
  inc: (id) => { setQty(id, qtyOf(id) + 1); haptic.select(); },
  dec: (id) => {
    if (state.view === 'cart' && qtyOf(id) === 1) removeFromCart(id);
    else { setQty(id, qtyOf(id) - 1); haptic.select(); }
  },
  remove: (id) => removeFromCart(id),
  fav: (id) => toggleFavorite(id),
  lang: (id, el) => {
    state.lang = el.dataset.value;
    storage.set('lang', state.lang);
    renderAll();
    haptic.select();
  },
  currency: (id, el) => {
    state.currency = el.dataset.value;
    storage.set('currency', state.currency);
    renderAll();
    haptic.select();
  },
  checkout: () => checkout(),
  'copy-order': () => copyOrder(),
  'send-order': () => sendOrder(),
  contact: () => openTelegramLink(ADMIN_URL),
  'clear-cart': () => clearCart(),
  district: (id, el) => setDistrict(el.dataset.value),
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const handler = actions[el.dataset.action];
  if (!handler) return;
  const id = Number(el.dataset.id ?? el.closest('[data-id]')?.dataset.id);
  handler(id, el, e);
});

safely(renderDistricts);
els.districtPanel.addEventListener('animationend', () => els.districtPanel.classList.remove('shake'));
els.districtOptions.addEventListener('keydown', (e) => {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!step) return;
  e.preventDefault();
  const i = DISTRICTS.indexOf(state.district);
  const next = DISTRICTS[(i + step + DISTRICTS.length) % DISTRICTS.length];
  setDistrict(next);
  els.districtOptions.querySelector('[tabindex="0"]')?.focus();
});
els.comment.value = storage.get('orderComment') || '';
els.comment.addEventListener('input', () => storage.set('orderComment', els.comment.value));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') goBack();
});

// Синхронизация между вкладками браузера
window.addEventListener('storage', (e) => {
  if (e.key === 'district') {
    if (DISTRICTS.includes(e.newValue) && e.newValue !== state.district) {
      state.district = e.newValue;
      if (ui.overlay === 'gate') closeOverlay();
      renderAll();
    }
    return;
  }
  if (e.key !== 'cart' && e.key !== 'favorites') return;
  cart = loadCart();
  const fresh = loadFavorites();
  favorites.clear();
  fresh.forEach((id) => favorites.add(id));
  renderAll();
});

/* ── Старт ────────────────────────────────────────────── */
safely(initTelegram);
renderAll();
refreshFromSheet();
if (SALE) setInterval(() => safely(() => renderSaleTimer()), 1000);
// Telegram может долго держать магазин открытым — при возвращении в него обновим цены
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - catalogInfo.checkedAt > 2 * 60 * 1000) refreshFromSheet();
});
// Окно выбора района — только если район ещё не выбран (обычно при первом входе)
if (!state.district) {
  loadDistrictFromCloud((saved) => {
    if (state.district) return; // уже выбрали, пока ждали облако
    if (DISTRICTS.includes(saved)) {
      state.district = saved;
      storage.set('district', saved);
      renderAll();
    } else {
      safely(openDistrictGate);
    }
  });
}
