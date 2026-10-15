'use strict';

/* ==========================================================
   HORN HUB — магазин (Telegram Mini App)
   ----------------------------------------------------------
   Как обновлять каталог (всё в CATALOG ниже):
   • price — старая цена, sale — цена со скидкой (в злотых).
     Если скидки нет — просто не указывайте sale.
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
    firstId: 1, price: 50, sale: 40,
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
    firstId: 200, price: 50, sale: 40,
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
    firstId: 100, price: 60, sale: 40,
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
    comment: 'Комментарий к заказу', commentPh: 'Адрес, удобное время, пожелания…',
    itemsSum: 'Товары, {n} шт.', discount: 'Скидка', total: 'Итого', checkout: 'Оформить заказ',
    contactAdmin: 'Написать консультанту', unavailable: 'Нет в наличии — не войдёт в заказ',
    orderTitle: 'Ваш заказ', orderNo: 'Заказ', step1: 'Нажмите «Отправить» — откроется чат с консультантом.',
    step2: 'Текст заказа уже скопирован. Если он не подставился сам — просто вставьте его в сообщение.',
    sendTelegram: 'Отправить в Telegram', copy: 'Скопировать текст', copied: 'Заказ скопирован ✅',
    copyFailed: 'Не удалось скопировать — выделите текст вручную',
    client: 'Клиент', pcs: 'шт.', saleUpTo: '🔥 Скидки до −{n}%', moreFlavors: 'Другие вкусы {brand}',
    soldOutGroup: 'Нет в наличии', maxQty: 'Максимум {n} шт.',
    ageNote: '18+ · Продукция содержит никотин и предназначена только для совершеннолетних.',
    items: ['товар', 'товара', 'товаров'],
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
    comment: 'Коментар до замовлення', commentPh: 'Адреса, зручний час, побажання…',
    itemsSum: 'Товари, {n} шт.', discount: 'Знижка', total: 'Разом', checkout: 'Оформити замовлення',
    contactAdmin: 'Написати консультанту', unavailable: 'Немає в наявності — не увійде в замовлення',
    orderTitle: 'Ваше замовлення', orderNo: 'Замовлення', step1: 'Натисніть «Надіслати» — відкриється чат з консультантом.',
    step2: 'Текст замовлення вже скопійовано. Якщо він не підставився сам — просто вставте його в повідомлення.',
    sendTelegram: 'Надіслати в Telegram', copy: 'Скопіювати текст', copied: 'Замовлення скопійовано ✅',
    copyFailed: 'Не вдалося скопіювати — виділіть текст вручну',
    client: 'Клієнт', pcs: 'шт.', saleUpTo: '🔥 Знижки до −{n}%', moreFlavors: 'Інші смаки {brand}',
    soldOutGroup: 'Немає в наявності', maxQty: 'Максимум {n} шт.',
    ageNote: '18+ · Продукція містить нікотин і призначена лише для повнолітніх.',
    items: ['товар', 'товари', 'товарів'],
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
    comment: 'Order comment', commentPh: 'Address, preferred time, wishes…',
    itemsSum: 'Items, {n} pcs', discount: 'Discount', total: 'Total', checkout: 'Checkout',
    contactAdmin: 'Message consultant', unavailable: 'Out of stock — won’t be ordered',
    orderTitle: 'Your order', orderNo: 'Order', step1: 'Tap “Send” — a chat with the consultant will open.',
    step2: 'The order text is already copied. If it isn’t filled in automatically, just paste it into the message.',
    sendTelegram: 'Send via Telegram', copy: 'Copy text', copied: 'Order copied ✅',
    copyFailed: 'Couldn’t copy — please select the text manually',
    client: 'Customer', pcs: 'pcs', saleUpTo: '🔥 Up to −{n}% off', moreFlavors: 'More {brand} flavors',
    soldOutGroup: 'Out of stock', maxQty: 'Max {n} pcs',
    ageNote: '18+ · Products contain nicotine and are intended for adults only.',
    items: ['item', 'items'],
  },
};

/* ── Товары ───────────────────────────────────────────── */
const fileName = (name) => name.replace(/[^a-zA-Z0-9]/g, '_') + '.png';

const products = CATALOG.flatMap((b) => b.flavors.map((f, i) => {
  const flavor = typeof f === 'string' ? f : f.name;
  const file = typeof f === 'string' ? fileName(f) : f.img;
  return {
    id: b.firstId + i,
    brand: b.brand,
    brandTitle: b.title,
    flavor,
    name: `${b.title} – ${flavor}`,
    category: b.category,
    price: b.price,
    sale: b.sale ?? b.price,
    img: `images/${b.folder}/${file}`,
    outOfStock: (b.soldOut || []).includes(flavor),
  };
}));
products.forEach((p, i) => {
  p.order = i;
  p.discount = p.sale < p.price ? Math.round((1 - p.sale / p.price) * 100) : 0;
});
const productById = new Map(products.map((p) => [p.id, p]));

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

function initTelegram() {
  if (!isTg) return;
  document.documentElement.classList.add('is-tg');
  try { tg.ready(); tg.expand(); } catch {}
  if (tgVersion('6.1')) {
    try { tg.setHeaderColor('#0b0a10'); tg.setBackgroundColor('#0b0a10'); } catch {}
    try { tg.BackButton.onClick(goBack); } catch {}
  }
  if (tgVersion('7.10')) try { tg.setBottomBarColor('#0b0a10'); } catch {}
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
  heroPill: $('heroPill'), listAnchor: $('listAnchor'), filters: $('filters'),
  categoryChips: $('categoryChips'), brandChips: $('brandChips'),
  listHead: $('listHead'), grid: $('productGrid'),
  favBadge: $('favBadge'), cartBadge: $('cartBadge'), cartBtn: $('cartBtn'),
  cartBar: $('cartBar'), cartBarQty: $('cartBarQty'), cartBarTotal: $('cartBarTotal'), cartBarSave: $('cartBarSave'),
  cartHeadCount: $('cartHeadCount'), clearCartBtn: $('clearCartBtn'),
  cartEmpty: $('cartEmpty'), cartFilled: $('cartFilled'), cartList: $('cartList'),
  comment: $('orderComment'),
  sumCountLabel: $('sumCountLabel'), sumFull: $('sumFull'), sumSaveRow: $('sumSaveRow'),
  sumSaved: $('sumSaved'), sumTotal: $('sumTotal'), checkoutBtn: $('checkoutBtn'),
  drawer: $('drawer'), backdrop: $('backdrop'),
  sheet: $('sheet'), sheetBody: $('sheetBody'),
  order: $('orderModal'), orderMeta: $('orderMeta'), orderText: $('orderText'),
  toast: $('toast'),
};
const overlays = { drawer: els.drawer, sheet: els.sheet, order: els.order };

/* ── Утилиты ──────────────────────────────────────────── */
function t(key, vars) {
  let s = I18N[state.lang][key] ?? I18N.ru[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

function plural(n) {
  const forms = I18N[state.lang].items;
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
  return CATALOG.filter((b) => b.category === category);
}

/* ── Рендер: статичные тексты ─────────────────────────── */
function renderStatic() {
  document.documentElement.lang = state.lang === 'ua' ? 'uk' : state.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });

  document.querySelectorAll('#langSeg button').forEach((b) => b.classList.toggle('is-active', b.dataset.value === state.lang));
  document.querySelectorAll('#curSeg button').forEach((b) => b.classList.toggle('is-active', b.dataset.value === state.currency));

  const maxSale = Math.max(0, ...products.filter((p) => !p.outOfStock).map((p) => p.discount));
  els.heroPill.hidden = !maxSale;
  els.heroPill.textContent = t('saleUpTo', { n: maxSale });

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
      ${esc(b.short || b.title)}<span class="chip-count">${b.flavors.length}</span>
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
  + '<stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ff5fa2"/></linearGradient></defs>'
  + '<rect width="400" height="400" fill="#1f1c29"/>'
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
  else if (state.brand) title = CATALOG.find((b) => b.brand === state.brand).title;
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
    <img src="${esc(p.img)}" alt="${esc(p.name)}" width="76" height="76" decoding="async" data-action="open" onerror="imgFallback(this)">
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

function renderAll() {
  renderStatic();
  renderChips();
  renderGrid();
  renderBadges();
  renderCartBar();
  if (state.view === 'cart') renderCart();
  if (ui.overlay === 'sheet') renderSheet();
  if (ui.overlay === 'order') buildOrder(ui.order?.id);
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
    '',
    ...items.map((i, n) => `${n + 1}. ${i.p.name} × ${i.qty} — ${money(i.p.sale * i.qty)}`),
    '',
    `📦 ${itemsText(count)}`,
    saved ? `🏷 ${t('discount')}: −${money(saved)}` : null,
    totalLine,
    ...(comment ? ['', `💬 ${t('comment')}: ${comment}`] : []),
  ].filter((l) => l !== null);

  ui.order = { id, text: lines.join('\n') };
  els.orderMeta.textContent = `#${id} · ${itemsText(count)} · ${money(total)}`;
  els.orderText.value = ui.order.text;
  return ui.order;
}

function checkout() {
  if (!cartTotals().count) {
    showToast(t('emptyCart'));
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
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const handler = actions[el.dataset.action];
  if (!handler) return;
  const id = Number(el.dataset.id ?? el.closest('[data-id]')?.dataset.id);
  handler(id, el, e);
});

els.comment.value = storage.get('orderComment') || '';
els.comment.addEventListener('input', () => storage.set('orderComment', els.comment.value));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') goBack();
});

// Синхронизация между вкладками браузера
window.addEventListener('storage', (e) => {
  if (e.key !== 'cart' && e.key !== 'favorites') return;
  cart = loadCart();
  const fresh = loadFavorites();
  favorites.clear();
  fresh.forEach((id) => favorites.add(id));
  renderAll();
});

/* ── Старт ────────────────────────────────────────────── */
initTelegram();
renderAll();
