// Admin
const ADMIN_NICK = 'pvlenemy';
const ADMIN_URL = `https://t.me/${ADMIN_NICK}`;

// Currency and language
const currencyRates = { PLN:1, EUR:0.24, UAH:11.7 };
const currencySymbols = { PLN:'zł', EUR:'€', UAH:'₴' };
let currency = localStorage.getItem('currency') || 'PLN';
let lang = localStorage.getItem('lang') || 'ru';

// I18n dictionary
const i18n = {
  ru:{categories:"Категории",allProducts:"Все товары",liquid:"Жидкости",disposable:"Одноразки",cartridge:"Картриджи",
    favorites:"Избранное ❤️",backToAll:"Все товары",sort:"Сортировка",priceAsc:"Цена ↑",priceDesc:"Цена ↓",byName:"По названию",
    back:"← Назад",cart:"Корзина",checkout:"Оформить заказ",contactAdmin:"Написать админу",
    emptyProducts:"Нет товара в наличии",emptyCart:"Корзина пуста",addedToCart:"Товар добавлен в корзину ✅",removedFromCart:"Товар удалён",
    orderTitle:"Ваш заказ",copyOrder:"Скопировать заказ",sendTelegram:"Открыть Telegram",close:"Закрыть",
    consultant:"Ваш консультант",orderNumber:"Номер заказа",total:"Итого",searchPlaceholder:"Поиск..."
  },
  ua:{categories:"Категорії",allProducts:"Всі товари",liquid:"Рідини",disposable:"Одноразки",cartridge:"Картриджі",
    favorites:"Обране ❤️",backToAll:"Всі товари",sort:"Сортування",priceAsc:"Ціна ↑",priceDesc:"Ціна ↓",byName:"За назвою",
    back:"← Назад",cart:"Кошик",checkout:"Оформити замовлення",contactAdmin:"Написати адміну",
    emptyProducts:"Немає товарів у наявності",emptyCart:"Кошик порожній",addedToCart:"Додано до кошика ✅",removedFromCart:"Видалено з кошика",
    orderTitle:"Ваше замовлення",copyOrder:"Скопіювати замовлення",sendTelegram:"Відкрити Telegram",close:"Закрити",
    consultant:"Ваш консультант",orderNumber:"Номер замовлення",total:"Разом",searchPlaceholder:"Пошук..."
  },
  en:{categories:"Categories",allProducts:"All products",liquid:"Liquids",disposable:"Disposables",cartridge:"Cartridges",
    favorites:"Favorites ❤️",backToAll:"All products",sort:"Sort",priceAsc:"Price ↑",priceDesc:"Price ↓",byName:"By name",
    back:"← Back",cart:"Cart",checkout:"Checkout",contactAdmin:"Contact admin",
    emptyProducts:"No products available",emptyCart:"Cart is empty",addedToCart:"Added to cart ✅",removedFromCart:"Removed from cart",
    orderTitle:"Your order",copyOrder:"Copy order",sendTelegram:"Open Telegram",close:"Close",
    consultant:"Your consultant",orderNumber:"Order number",total:"Total",searchPlaceholder:"Search..."
  }
};

// Products
const products = [
  ...['Strawberry Cherry Lemon','Sour Watermelon Gummy','Pink Lemonade Soda','Pineapple Colada'].map((n,i)=>({id:i+1,name:`Elf Liq – ${n}`,price:45,category:'liquid',img:'images/elf.jpg'})),
  ...['Grape Ice','Watermelon Ice','Kiwi Passion Guava','Strawberry Ice Cream'].map((n,i)=>({id:100+i,name:`Vazool – ${n}`,price:60,category:'disposable',img:'images/vazool.jpg'})),
  {id:300,name:'Xros Cartridge 0.6Ω',price:20,category:'cartridge',img:'images/cart.jpg'}
];

// State
let cart=[], favorites=[], filtered=[...products], showingFavorites=false;

// Elements
const productList=document.getElementById('productList');
const cartCount=document.getElementById('cartCount');
const searchInput=document.getElementById('searchInput');
const autocompleteBox=document.getElementById('autocomplete');
const sortSelect=document.getElementById('sortSelect');
const backAllBtn=document.getElementById('backAllBtn');

// Utils
function formatPricePLN(pln){ return `${Math.round(pln*currencyRates[currency])} ${currencySymbols[currency]}`; }
function showToast(msgKeyOrText){ const t=document.getElementById('toast'); const msg=i18n[lang][msgKeyOrText]||msgKeyOrText; t.textContent=msg; t.className="toast show"; setTimeout(()=>t.className="toast",1800); }
function flyToCart(imgEl){ if(!imgEl)return; const cartBtn=document.querySelector('.cart-btn'); const rectImg=imgEl.getBoundingClientRect(); const rectCart=cartBtn.getBoundingClientRect(); const clone=document.createElement('img'); clone.src=imgEl.src; clone.className='fly-img'; clone.style.left=rectImg.left+'px'; clone.style.top=rectImg.top+'px'; document.body.appendChild(clone); const dx=rectCart.left-rectImg.left; const dy=rectCart.top-rectImg.top; clone.style.transform=`translate(${dx}px,${dy}px) scale(0.4)`; clone.style.opacity='0.2'; setTimeout(()=>clone.remove(),620); }

// Persistence
function saveCart(){ localStorage.setItem('cart',JSON.stringify(cart)); }
function loadCart(){ const d=localStorage.getItem('cart'); if(d){try{cart=JSON.parse(d);}catch(e){cart=[];}} }
function saveFavorites(){ localStorage.setItem('favorites',JSON.stringify(favorites)); }
function loadFavorites(){ const d=localStorage.getItem('favorites'); if(d){try{favorites=JSON.parse(d);}catch(e){favorites=[];}} }
function updateCartCount(){ cartCount.textContent=cart.reduce((s,p)=>s+(p.qty||0),0); }

// Rendering
function renderProducts(list=filtered){
  productList.innerHTML='';
  const items=showingFavorites ? list.filter(p=>favorites.includes(p.id)) : list;
  if(!items.length){ productList.innerHTML=`<p class="empty">${i18n[lang].emptyProducts}</p>`; return; }
  items.forEach(p=>{
    const favActive=favorites.includes(p.id);
    const catText=i18n[lang][p.category]||p.category;
    productList.innerHTML+=`
      <div class="product">
        <img src="${p.img}" onclick="previewImage('${p.img}')" alt="${p.name}">
        <h4>${p.name}</h4>
        <div class="muted">${catText}</div>
        <div class="price">${formatPricePLN(p.price)}</div>
        <div class="actions">
          <button class="btn btn-primary" onclick="addToCart(${p.id},this)">
            ${lang==='ru'?'В корзину':lang==='ua'?'До кошика':'Add to cart'}
          </button>
          <button class="btn btn-outline ${favActive?'active':''}" onclick="toggleFavorite(${p.id})">
            ${favActive?'❤️':'🤍'}
          </button>
        </div>
      </div>
    `;
  });
}

// Cart
function renderCart(){
  const box=document.getElementById('cartItems'), totalBox=document.getElementById('cartTotal'); box.innerHTML='';
  if(!cart.length){ box.innerHTML=`<p class="empty">${i18n[lang].emptyCart}</p>`; totalBox.textContent=''; return; }
  let totalPLN=0;
  cart.forEach((p,i)=>{ totalPLN+=p.price*p.qty;
    box.innerHTML+=`<div class="cart-item">
      <img src="${p.img}" alt="${p.name}">
      <div style="flex:1">
        <div class="name">${p.name}</div>
        <div class="line">${formatPricePLN(p.price)} × ${p.qty}</div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQty(${i},-1)">–</button>
          <div>${p.qty}</div>
          <button class="qty-btn" onclick="changeQty(${i},1)">+</button>
          <button class="remove-btn" onclick="removeFromCart(${i})">${lang==='ru'?'Удалить':lang==='ua'?'Видалити':'Remove'}</button>
        </div>
      </div>
    </div>`; });
  totalBox.textContent=`${i18n[lang].total}: ${formatPricePLN(totalPLN)}`;
}

// Interactions
function addToCart(id,btnEl){ const base=products.find(p=>p.id===id); const exist=cart.find(p=>p.id===id); if(exist){exist.qty++;}else{cart.push({...base,qty:1});} updateCartCount(); saveCart(); showToast('addedToCart'); flyToCart(btnEl.closest('.product')?.querySelector('img')); renderCart(); }
function removeFromCart(i){ cart.splice(i,1); updateCartCount(); saveCart(); renderCart(); showToast('removedFromCart'); }
function changeQty(i,delta){ cart[i].qty+=delta; if(cart[i].qty<=0) cart.splice(i,1); updateCartCount(); saveCart(); renderCart(); }

function openCart(){ document.getElementById('mainPage').classList.add('hidden'); document.getElementById('cartPage').classList.remove('hidden'); document.getElementById('adminBtn').href=ADMIN_URL; renderCart(); }
function closeCart(){ document.getElementById('cartPage').classList.add('hidden'); document.getElementById('mainPage').classList.remove('hidden'); }

// Filtering & sorting
function filterCategory(cat){ toggleMenu(false); backAllBtn.classList.add('hidden'); showingFavorites=false; filtered=(cat==='all')?[...products]:products.filter(p=>p.category===cat); sortProducts(sortSelect.value); renderProducts(); }
function sortProducts(t){ if(t==='low') filtered.sort((a,b)=>a.price-b.price); else if(t==='high') filtered.sort((a,b)=>b.price-a.price); else if(t==='name') filtered.sort((a,b)=>a.name.localeCompare(b.name)); renderProducts(); }

// Favorites
function toggleFavorite(id){ const idx=favorites.indexOf(id); if(idx>-1) favorites.splice(idx,1); else favorites.push(id); saveFavorites(); renderProducts(); }
function showFavorites(){ toggleMenu(false); showingFavorites=true; backAllBtn.classList.remove('hidden'); filtered=products.filter(p=>favorites.includes(p.id)); renderProducts(); }
function backToAll(){ showingFavorites=false; backAllBtn.classList.add('hidden'); filtered=[...products]; renderProducts(); }

// Search
function searchProducts(q){ backAllBtn.classList.add('hidden'); showingFavorites=false; const v=q.toLowerCase(); filtered=products.filter(p=>p.name.toLowerCase().includes(v)); renderProducts();
  if(q.trim().length && filtered.length){ autocompleteBox.innerHTML=filtered.slice(0,6).map(p=>`<div class="autocomplete-item" onclick="selectSearch('${p.name.replace(/'/g,"\\'")}')">${p.name}</div>`).join(''); autocompleteBox.classList.add('active'); }
  else autocompleteBox.classList.remove('active'); }
function selectSearch(name){ searchInput.value=name; autocompleteBox.classList.remove('active'); filtered=products.filter(p=>p.name===name); renderProducts(); }

// Sidebar toggle
function toggleMenu(force){ const s=document.getElementById('sidebar'); force===false?s.classList.remove('active'):s.classList.toggle('active'); }

// Header compact
window.addEventListener('scroll',()=>{ document.getElementById('header').classList.toggle('compact',window.scrollY>20); });

// Image preview
function previewImage(src){ window.open(src,'_blank'); }

// Language & currency
function applyI18n(){ document.querySelectorAll('[data-i18n]').forEach(el=>{ const k=el.getAttribute('data-i18n'); if(i18n[lang][k]) el.textContent=i18n[lang][k]; }); searchInput.placeholder=i18n[lang].searchPlaceholder; renderProducts(); renderCart(); }
function setLang(l){ lang=l; localStorage.setItem('lang',l); document.getElementById('langSelect').value=lang; applyI18n(); }
function setCurrency(c){ currency=c; localStorage.setItem('currency',c); document.getElementById('currencySelect').value=currency; renderProducts(); renderCart(); }

// Checkout
let lastOrderText='';
function checkout(){
  if(!cart.length)return alert(i18n[lang].emptyCart);
  const orderId=Date.now().toString().slice(-6);
  const totalPLN=cart.reduce((s,p)=>s+p.price*p.qty,0);
  const lines=cart.map(p=>`• ${p.name} × ${p.qty} — ${formatPricePLN(p.price*p.qty)}`);
  lastOrderText=`${i18n[lang].orderNumber}: ${orderId}\n${i18n[lang].
