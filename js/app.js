// ———————————————————————————
// CONFIG (official mid‑market rates)
// 1 PLN ≈ 11.7 UAH (National Bank) :contentReference[oaicite:2]{index=2}
// 1 EUR ≈ 4.23 PLN (bank average) :contentReference[oaicite:3]{index=3}
const EXCHANGE_RATES = {
  PLN_EUR: 1/4.23,
  PLN_UAH: 11.7,
};

// ADMIN
const ADMIN_NICK = 'pvlenemy';
const ADMIN_URL = `https://t.me/${ADMIN_NICK}`;

// i18n
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
    addedToCart: "Товар добавлен в корзину ✅",
    removedFromCart: "Товар удалён",
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
    addedToCart: "Додано в кошик",
    removedFromCart: "Видалено",
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
    addedToCart: "Added to cart",
    removedFromCart: "Removed",
  }
};

let lang = localStorage.getItem('lang') || 'ru';
let currency = localStorage.getItem('currency') || 'PLN';

const products = [
  ...[
    'Strawberry Cherry Lemon','Sour Watermelon Gummy','Pink Lemonade Soda',
    'Pineapple Colada','Lemon Lime','Blueberry Raspberry Pomegranate',
    'Apple Pear','Strawberry Snow','Blackcurrant Aniseed','P&B Cloud','Grape Cherry'
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

const productList = document.getElementById('productList');
const cartCount = document.getElementById('cartCount');
const searchInput = document.getElementById('searchInput');

// ———————————————————————————
// PRICE FORMAT
function formatPrice(p){
  if(currency === 'PLN') return `${p} zł`;
  if(currency === 'UAH') return `${Math.round(p * EXCHANGE_RATES.PLN_UAH)} ₴`;
  if(currency === 'EUR') return `${(p * EXCHANGE_RATES.PLN_EUR).toFixed(2)} €`;
}

// ———————————————————————————
// i18n APPLY
function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if(i18n[lang][key]) el.textContent = i18n[lang][key];
  });
  searchInput.placeholder = i18n[lang].searchPlaceholder;
}
function setLang(l){
  lang = l; localStorage.setItem('lang',l);
  applyI18n(); renderProducts(); renderCart();
}
function setCurrency(c){
  currency = c; localStorage.setItem('currency',c);
  renderProducts(); renderCart();
}

// ———————————————————————————
// RENDER PRODUCTS
function renderProducts(list=filtered){
  productList.innerHTML = '';
  if(!list.length){
    productList.innerHTML = `<p class="empty">${i18n[lang].emptyProducts}</p>`;
    return;
  }
  list.forEach(p=>{
    productList.innerHTML += `
      <div class="product">
        <h4>${p.name}</h4>
        <div class="price">${formatPrice(p.price)}</div>
        <button onclick="addToCart(${p.id})">${i18n[lang].addedToCart}</button>
      </div>`;
  });
}

// Filter category
function filterCategory(cat){
  if(cat === 'all') filtered = [...products];
  else filtered = products.filter(p=>p.category === cat);
  renderProducts();
}

// ———————————————————————————
// CART
function addToCart(id){
  const p = products.find(x=>x.id === id);
  cart.push({...p, qty:1});
  updateCart();
}
function updateCart(){
  cartCount.textContent = cart.length;
}
function renderCart(){
  const box = document.getElementById('cartItems');
  box.innerHTML = '';
  cart.forEach(p=> box.innerHTML += `<div>${p.name} × ${p.qty} — ${formatPrice(p.price)}</div>`);
  document.getElementById('cartTotal').textContent = `${formatPrice(cart.reduce((s,p)=>s+p.price*p.qty,0))}`;
}

// ———————————————————————————
// CHECKOUT
function checkout(){
  if(!cart.length){ alert(i18n[lang].emptyCart); return; }
  const text = cart.map(p=>`${p.name} × ${p.qty} — ${formatPrice(p.price*p.qty)}`).join('\n');
  const msg = `Заказ:\n${text}`;
  window.open(`https://t.me/${ADMIN_NICK}?text=${encodeURIComponent(msg)}`,'_blank');
}

// INIT
window.addEventListener('load',()=>{
  applyI18n();
  renderProducts();
  updateCart();
});
