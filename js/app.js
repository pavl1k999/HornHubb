// Admin
const ADMIN_NICK = 'pvlenemy';
const ADMIN_URL = `https://t.me/${ADMIN_NICK}`;

// Currency and language
const currencyRates = {
  PLN: 1,        // base
  EUR: 0.23,     // approximate
  UAH: 6.0       // approximate
};
const currencySymbols = { PLN: 'zł', EUR: '€', UAH: '₴' };
let currency = localStorage.getItem('currency') || 'PLN';

const i18n = {
  ru: {
    categories: "Категории",
    allProducts: "Все товары",
    liquids: "Жидкости",
    disposable: "Одноразки",
    cartridges: "Картриджи",
    priceFilter: "Фильтр по цене",
    favorites: "Избранное ❤️",
    sort: "Сортировка",
    priceAsc: "Цена ↑",
    priceDesc: "Цена ↓",
    byName: "По названию",
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
    categories: "Категорії",
    allProducts: "Всі товари",
    liquids: "Рідини",
    disposable: "Одноразки",
    cartridges: "Картриджі",
    priceFilter: "Фільтр за ціною",
    favorites: "Обране ❤️",
    sort: "Сортування",
    priceAsc: "Ціна ↑",
    priceDesc: "Ціна ↓",
    byName: "За назвою",
    back: "← Назад",
    cart: "Кошик",
    checkout: "Оформити замовлення",
    contactAdmin: "Написати адміну",
    emptyProducts: "Немає товарів у наявності",
    emptyCart: "Кошик порожній",
    addedToCart: "Додано до кошика ✅",
    removedFromCart: "Видалено з кошика",
  },
  en: {
    categories: "Categories",
    allProducts: "All products",
    liquids: "Liquids",
    disposable: "Disposables",
    cartridges: "Cartridges",
    priceFilter: "Price filter",
    favorites: "Favorites ❤️",
    sort: "Sort",
    priceAsc: "Price ↑",
    priceDesc: "Price ↓",
    byName: "By name",
    back: "← Back",
    cart: "Cart",
    checkout: "Checkout",
    contactAdmin: "Contact admin",
    emptyProducts: "No products available",
    emptyCart: "Cart is empty",
    addedToCart: "Added to cart ✅",
    removedFromCart: "Removed from cart",
  }
};
let lang = localStorage.getItem('lang') || 'ru';

// Products (base prices in PLN)
const products = [
  ...[
    'Strawberry Cherry Lemon','Sour Watermelon Gummy','Pink Lemonade Soda',
    'Pineapple Colada','Lemon Lime','Blueberry Raspberry Pomegranate',
    'Apple Pear','Strawberry Snow','Blackcurrant Aniseed','P&B Cloud','Grape Cherry'
  ].map((n,i)=>({id:i+1,name:`Elf Liq – ${n}`,price:45,category:'liquid',img:'images/elf.jpg'})),

  ...[
    'Grape Mint','Berry Lemonade','Blackberry Lemonade','Sour Apple','Vitamin',
    'Coconut Melon','Energetic','Strawberry Cream','Watermelon Raspberry','Kiwi Passion Guava'
  ].map((n,i)=>({id:100+i,name:`Chaser – ${n}`,price:45,category:'liquid',img:'images/chaser.jpg'})),

  ...[
    'Grape Ice','Watermelon Ice','Kiwi Passion Guava','Strawberry Ice Cream',
    'Sour Apple Ice','Love 777','Mixed Berries','Purple Candy','Dragon Fruit Banana Cherry'
  ].map((n,i)=>({id:200+i,name:`Vazool – ${n}`,price:60,category:'disposable',img:'images/vazool.jpg'})),

  {id:300,name:'Xros Cartridge 0.6Ω',price:20,category:'cartridge',img:'images/cart.jpg'}
];

// State
let cart = [];
let favorites = [];
let filtered = [...products];
let showingFavorites = false;

// Elements
const productList = document.getElementById('productList');
const cartCount = document.getElementById('cartCount');
const searchInput = document.getElementById('searchInput');
const autocompleteBox = document.getElementById('autocomplete');
const sortSelect = document.getElementById('sortSelect');
const priceMinEl = document.getElementById('priceMin');
const priceMaxEl = document.getElementById('priceMax');

// Utils
function formatPricePLN(pln){
  const rate = currencyRates[currency];
  const symbol = currencySymbols[currency];
  const converted = Math.round(pln * rate);
  return `${converted} ${symbol}`;
}

function showToast(msgKeyOrText){
  const t=document.getElementById('toast');
  const msg = i18n[lang][msgKeyOrText] || msgKeyOrText;
  t.textContent = msg;
  t.className = "toast show";
  setTimeout(()=>t.className="toast", 1800);
}

function flyToCart(imgEl){
  const cartBtn = document.querySelector('.cart-btn');
  if(!imgEl || !cartBtn) return;
  const rectImg = imgEl.getBoundingClientRect();
  const rectCart = cartBtn.getBoundingClientRect();

  const clone = document.createElement('img');
  clone.src = imgEl.src;
  clone.className = 'fly-img';
  clone.style.left = rectImg.left + 'px';
  clone.style.top = rectImg.top + 'px';
  document.body.appendChild(clone);

  const dx = rectCart.left - rectImg.left;
  const dy = rectCart.top - rectImg.top;
  clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.4)`;
  clone.style.opacity = '0.2';
  setTimeout(()=> clone.remove(), 620);
}

// Persistence
function saveCart(){ localStorage.setItem('cart', JSON.stringify(cart)); }
function loadCart(){
  const data = localStorage.getItem('cart');
  if(data) {
    try { cart = JSON.parse(data); } catch(e){ cart=[]; }
  }
}
function saveFavorites(){ localStorage.setItem('favorites', JSON.stringify(favorites)); }
function loadFavorites(){
  const data = localStorage.getItem('favorites');
  if(data){
    try { favorites = JSON.parse(data); } catch(e){ favorites=[]; }
  }
}
function updateCartCount(){
  const totalQty = cart.reduce((sum,p)=>sum + (p.qty||0), 0);
  cartCount.textContent = totalQty;
}

// Rendering
function renderProducts(list = filtered){
  productList.innerHTML = '';
  const items = showingFavorites ? list.filter(p=>favorites.includes(p.id)) : list;
  if(!items.length){
    productList.innerHTML = `<p class="empty">${i18n[lang].emptyProducts}</p>`;
    return;
  }
  items.forEach(p=>{
    const favActive = favorites.includes(p.id);
    productList.innerHTML += `
      <div class="product">
        <img src="${p.img}" onclick="previewImage('${p.img}')" alt="${p.name}">
        <h4>${p.name}</h4>
        <div class="muted">${p.category}</div>
        <div class="price">${formatPricePLN(p.price)}</div>
        <div class="actions">
          <button class="btn btn-primary" onclick="addToCart(${p.id}, this)">В корзину</button>
          <button class="btn btn-outline ${favActive?'active':''}" onclick="toggleFavorite(${p.id})">${favActive?'❤️':'🤍'}</button>
        </div>
      </div>
    `;
  });
}

function renderCart(){
  const box=document.getElementById('cartItems');
  const totalBox=document.getElementById('cartTotal');
  box.innerHTML='';
  if(!cart.length){
    box.innerHTML = `<p class="empty">${i18n[lang].emptyCart}</p>`;
    totalBox.textContent = '';
    return;
  }
  let totalPLN=0;
  cart.forEach((p,i)=>{
    totalPLN+=p.price*p.qty;
    box.innerHTML+=`
      <div class="cart-item">
        <img src="${p.img}" alt="${p.name}">
        <div style="flex:1">
          <div class="name">${p.name}</div>
          <div class="line">${formatPricePLN(p.price)} × ${p.qty}</div>
          <div class="qty-controls">
            <button class="qty-btn" onclick="changeQty(${i},-1)">–</button>
            <div>${p.qty}</div>
            <button class="qty-btn" onclick="changeQty(${i},1)">+</button>
            <button class="remove-btn" onclick="removeFromCart(${i})">Удалить</button>
          </div>
        </div>
      </div>`;
  });
  totalBox.textContent = `Итого: ${formatPricePLN(totalPLN)}`;
}

// Interactions
function addToCart(id, btnEl){
  const base = products.find(p=>p.id===id);
  const exist = cart.find(p=>p.id===id);
  if(exist){ exist.qty++; }
  else { cart.push({...base, qty:1}); }
  updateCartCount();
  saveCart();
  showToast('addedToCart');

  // fly animation using closest product image
  const card = btnEl?.closest('.product');
  const img = card?.querySelector('img');
  if(img) flyToCart(img);
}

function removeFromCart(i){
  cart.splice(i,1);
  updateCartCount(); renderCart(); saveCart();
  showToast('removedFromCart');
}

function changeQty(i,delta){
  cart[i].qty += delta;
  if(cart[i].qty <= 0){ cart.splice(i,1); }
  updateCartCount(); renderCart(); saveCart();
}

function openCart(){
  mainPage.classList.add('hidden');
  cartPage.classList.remove('hidden');
  document.getElementById('adminBtn').href = ADMIN_URL;
  renderCart();
}
function closeCart(){
  cartPage.classList.add('hidden');
  mainPage.classList.remove('hidden');
}

function filterCategory(cat){
  toggleMenu(false);
  showingFavorites = false;
  if(cat==='all'){ filtered = [...products]; }
  else { filtered = products.filter(p=>p.category===cat); }
  applyPriceFilter(true);
  renderProducts();
}

function searchProducts(q){
  const v = q.toLowerCase();
  const candidates = products.filter(p=>p.name.toLowerCase().includes(v));
  // update filtered by search
  filtered = products.filter(p=>p.name.toLowerCase().includes(v));
  renderProducts();

  // autocomplete
  if(q.trim().length && candidates.length){
    autocompleteBox.innerHTML = candidates.slice(0,6).map(p=>(
      `<div class="autocomplete-item" onclick="selectSearch('${p.name.replace(/'/g,"\\'")}')">${p.name}</div>`
    )).join('');
    autocompleteBox.classList.add('active');
  } else {
    autocompleteBox.classList.remove('active');
  }
}
function selectSearch(name){
  searchInput.value = name;
  autocompleteBox.classList.remove('active');
  filtered = products.filter(p=>p.name===name);
  renderProducts();
}

function sortProducts(t){
  if(t==='low') filtered.sort((a,b)=>a.price-b.price);
  else if(t==='high') filtered.sort((a,b)=>b.price-a.price);
  else if(t==='name') filtered.sort((a,b)=>a.name.localeCompare(b.name));
  renderProducts();
}

function applyPriceFilter(skipRender){
  const min = Number(priceMinEl.value)||0;
  const max = Number(priceMaxEl.value)||Infinity;
  // filter from full set or current filter
  const base = showingFavorites ? products.filter(p=>favorites.includes(p.id)) : products;
  filtered = base.filter(p=>p.price>=min && p.price<=max);
  if(!skipRender) renderProducts();
}

function toggleFavorite(id){
  const idx = favorites.indexOf(id);
  if(idx>-1) favorites.splice(idx,1);
  else favorites.push(id);
  saveFavorites();
  renderProducts();
}

function showFavorites(){
  toggleMenu(false);
  showingFavorites = true;
  filtered = products.filter(p=>favorites.includes(p.id));
  renderProducts();
}

// Sidebar
function toggleMenu(force){
  const s=document.getElementById('sidebar');
  force===false ? s.classList.remove('active') : s.classList.toggle('active');
}

// Header compact
window.addEventListener('scroll',()=>{
  document.getElementById('header')
    .classList.toggle('compact', window.scrollY>20);
});

// Image preview (simple)
function previewImage(src){
  // Could be expanded with a modal; for now, open in new tab
  window.open(src, '_blank');
}

// Language and currency
function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if(i18n[lang][key]) el.textContent = i18n[lang][key];
  });
}
function setLang(l){
  lang = l; localStorage.setItem('lang', l);
  applyI18n(); renderProducts(); renderCart();
}
function setCurrency(c){
  currency = c; localStorage.setItem('currency', c);
  renderProducts(); renderCart();
}

// Init
window.addEventListener('click', (e)=>{
  if(!document.querySelector('.search-box')?.contains(e.target)){
    autocompleteBox.classList.remove('active');
  }
});

window.addEventListener('load', ()=>{
  // load state
  loadCart(); loadFavorites();
  // set selects
  document.getElementById('langSelect').value = lang;
  document.getElementById('currencySelect').value = currency;
  // initial render
  filtered = [...products];
  applyI18n();
  renderProducts();
  updateCartCount();
});

/********************
 * CHECKOUT → ADMIN
 ********************/
function checkout(){
  if(!cart.length){
    showToast('emptyCart');
    return;
  }

  let text = `🧾 НОВЫЙ ЗАКАЗ\n\n`;
  let totalPLN = 0;

  cart.forEach(p=>{
    text += `• ${p.name} × ${p.qty} = ${p.price * p.qty} PLN\n`;
    totalPLN += p.price * p.qty;
  });

  text += `\n💰 Итого: ${totalPLN} PLN`;
  text += `\n\n✍️ Напишите мне для подтверждения заказа`;

  const url =
    `https://t.me/${ADMIN_NICK}?text=` +
    encodeURIComponent(text);

  // открываем чат с админом
  window.open(url, '_blank');

  // очистка корзины после перехода
  cart = [];
  saveCart();
  updateCartCount();
  renderCart();
}



