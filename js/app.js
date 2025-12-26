// ========== CONFIG ==========
const ADMIN_NICK = 'pvlenemy';
const ADMIN_URL = `https://t.me/${ADMIN_NICK}`;

// С live‑курсами: 1 PLN ≈ 4.23 EUR, 1 PLN ≈ 11.7 UAH
const LIVE_RATES = { EUR: 1/4.23, UAH: 11.7 };

const i18n = {
  ru: {
    title: "VAPE SHOP",
    allProducts: "Все товары",
    liquids: "Жидкости",
    disposable: "Одноразки",
    cartridges: "Картриджи",
    sort: "Сортировка",
    priceAsc: "Цена ↑",
    priceDesc: "Цена ↓",
    byName: "По названию",
    searchPlaceholder: "Поиск...",
    back: "← Назад",
    cart: "Корзина",
    checkout: "Оформить заказ",
    contactAdmin: "Написать админу",
    emptyProducts: "Нет товара в наличии",
    emptyCart: "Корзина пуста",
    addedToCart: "Товар добавлен",
    favorites: "Избранное ❤️",
  },
  ua: {
    title: "VAPE SHOP",
    allProducts: "Всі товари",
    liquids: "Рідини",
    disposable: "Одноразки",
    cartridges: "Картриджі",
    sort: "Сортування",
    priceAsc: "Ціна ↑",
    priceDesc: "Ціна ↓",
    byName: "За назвою",
    searchPlaceholder: "Пошук...",
    back: "← Назад",
    cart: "Кошик",
    checkout: "Оформити замовлення",
    contactAdmin: "Написати адміну",
    emptyProducts: "Немає товарів",
    emptyCart: "Кошик порожній",
    addedToCart: "Додано",
    favorites: "Обране ❤️",
  },
  en: {
    title: "VAPE SHOP",
    allProducts: "All products",
    liquids: "Liquids",
    disposable: "Disposables",
    cartridges: "Cartridges",
    sort: "Sort",
    priceAsc: "Price ↑",
    priceDesc: "Price ↓",
    byName: "By name",
    searchPlaceholder: "Search...",
    back: "← Back",
    cart: "Cart",
    checkout: "Checkout",
    contactAdmin: "Contact admin",
    emptyProducts: "No products",
    emptyCart: "Cart is empty",
    addedToCart: "Added",
    favorites: "Favorites ❤️",
  },
};

let lang = localStorage.getItem('lang') || 'ru';
let currency = localStorage.getItem('currency') || 'PLN';

// ========== PRODUCTS ==========
const products = [
  ...[
    'Strawberry Cherry Lemon','Sour Watermelon Gummy','Pink Lemonade Soda',
    'Pineapple Colada','Lemon Lime','Blueberry Raspberry Pomegranate',
    'Apple Pear','Strawberry Snow','Blackcurrant Aniseed',
    'P&B Cloud','Grape Cherry'
  ].map((n,i)=>({id:i+1,name:`Elf Liq – ${n}`,price:45,category:'liquid'})),
  ...[
    'Grape Mint','Berry Lemonade','Blackberry Lemonade','Sour Apple',
    'Vitamin','Coconut Melon','Energetic','Strawberry Cream',
    'Watermelon Raspberry','Kiwi Passion Guava'
  ].map((n,i)=>({id:100+i,name:`Chaser – ${n}`,price:45,category:'liquid'})),
  ...[
    'Grape Ice','Watermelon Ice','Kiwi Passion Guava','Strawberry Ice Cream',
    'Sour Apple Ice','Love 777','Mixed Berries','Purple Candy','Dragon Fruit Banana Cherry'
  ].map((n,i)=>({id:200+i,name:`Vazool – ${n}`,price:60,category:'disposable'})),
  {id:300,name:'Xros Cartridge 0.6Ω',price:20,category:'cartridge'}
];

let cart = [];
let filtered = [...products];

// ========== DOM ELEMENTS ==========
const productList  = document.getElementById('productList');
const cartCount    = document.getElementById('cartCount');
const searchInput  = document.getElementById('searchInput');

// ========== UTILS ==========
function formatPrice(val){
  if(currency === 'PLN') return `${val} zł`;
  if(currency === 'EUR') return `${(val * LIVE_RATES.EUR).toFixed(2)} €`;
  if(currency === 'UAH') return `${Math.round(val * LIVE_RATES.UAH)} ₴`;
}

function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if(i18n[lang][key]) el.textContent = i18n[lang][key];
  });
  searchInput.placeholder = i18n[lang].searchPlaceholder;
}

function saveSettings(){
  localStorage.setItem('lang', lang);
  localStorage.setItem('currency', currency);
}

// ========== RENDERING ==========
function renderProducts(list = filtered){
  productList.innerHTML = '';
  if(!list.length){
    productList.innerHTML = `<p class="empty">${i18n[lang].emptyProducts}</p>`;
    return;
  }
  list.forEach(p => {
    productList.innerHTML += `
      <div class="product">
        <h4>${p.name}</h4>
        <div class="price">${formatPrice(p.price)}</div>
        <button onclick="addToCart(${p.id})">${i18n[lang].addedToCart}</button>
      </div>
    `;
  });
}

function renderCart(){
  const box = document.getElementById('cartItems');
  box.innerHTML = '';
  let total = 0;
  cart.forEach(p=>{
    total += p.price;
    box.innerHTML += `<div>${p.name} × ${formatPrice(p.price)}</div>`;
  });
  document.getElementById('cartTotal').textContent = formatPrice(total);
}

// ========== CART LOGIC ==========
function addToCart(id){
  const item = products.find(p=>p.id===id);
  if(item){ cart.push(item); }
  cartCount.textContent = cart.length;
  renderCart();
}

function filterCategory(cat){
  if(cat === 'all') filtered = [...products];
  else filtered = products.filter(p => p.category === cat);
  renderProducts();
}

function searchProducts(q){
  const term = q.toLowerCase();
  filtered = products.filter(p=>p.name.toLowerCase().includes(term));
  renderProducts();
}

function sortProducts(mode){
  if(mode === 'low') filtered.sort((a,b)=>a.price-b.price);
  if(mode === 'high') filtered.sort((a,b)=>b.price-a.price);
  if(mode === 'name') filtered.sort((a,b)=>a.name.localeCompare(b.name));
  renderProducts();
}

// ========== CHECKOUT ==========
function checkout(){
  if(!cart.length){
    alert(i18n[lang].emptyCart);
    return;
  }
  const text = cart.map(p=>`${p.name} — ${formatPrice(p.price)}`).join('\n');
  const message = `Заказ:\n${text}`;
  const tgUrl = `https://t.me/${ADMIN_NICK}?text=${encodeURIComponent(message)}`;
  window.open(tgUrl, '_blank');
}

// ========== INIT ==========
window.addEventListener('load',()=>{
  applyI18n();
  renderProducts();
  cartCount.textContent = cart.length;
});
