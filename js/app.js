const products = [
  {id:1, name:'Pod X', price:1200, category:'pods', img:'https://via.placeholder.com/300?text=Pod+X'},
  {id:2, name:'Pod Y', price:1100, category:'pods', img:'https://via.placeholder.com/300?text=Pod+Y'},
  {id:3, name:'Liquid A', price:300, category:'liquid', img:'https://via.placeholder.com/300?text=Liquid+A'},
  {id:4, name:'Liquid B', price:450, category:'liquid', img:'https://via.placeholder.com/300?text=Liquid+B'},
  {id:5, name:'Cartridge 1', price:250, category:'cartridge', img:'https://via.placeholder.com/300?text=Cartridge+1'},
  {id:6, name:'Cartridge 2', price:350, category:'cartridge', img:'https://via.placeholder.com/300?text=Cartridge+2'},
  {id:7, name:'Disposable A', price:900, category:'disposable', img:'https://via.placeholder.com/300?text=Disposable+A'},
  {id:8, name:'Disposable B', price:750, category:'disposable', img:'https://via.placeholder.com/300?text=Disposable+B'},
  {id:9, name:'Pod Z', price:1350, category:'pods', img:'https://via.placeholder.com/300?text=Pod+Z'},
  {id:10, name:'Liquid C', price:500, category:'liquid', img:'https://via.placeholder.com/300?text=Liquid+C'}
];

let cart = [];
let filteredProducts = [...products];

const productList = document.getElementById('productList');
const cartCount = document.getElementById('cartCount');
const cartPage = document.getElementById('cartPage');
const mainPage = document.getElementById('mainPage');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');

function renderProducts(list = filteredProducts) {
  productList.innerHTML = '';
  list.forEach(p => {
    productList.innerHTML += `
      <div class="product">
        <img src="${p.img}">
        <h4>${p.name}</h4>
        <span>${p.price} ₴</span>
        <button onclick='addToCart(${JSON.stringify(p)})'>В корзину</button>
      </div>`;
  });
}

function addToCart(product) {
  cart.push(product);
  cartCount.textContent = cart.length;
}

function openCart() {
  mainPage.classList.add('hidden');
  cartPage.classList.remove('hidden');
  renderCart();
}

function closeCart() {
  cartPage.classList.add('hidden');
  mainPage.classList.remove('hidden');
}

function renderCart() {
  cartItems.innerHTML = '';
  let total = 0;
  cart.forEach((p,i) => {
    total += p.price;
    cartItems.innerHTML += `
      <div class="cart-item">
        <img src="${p.img}">
        <div>
          <div>${p.name}</div>
          <div>${p.price} ₴</div>
          <button class="remove-btn" onclick="removeFromCart(${i})">Удалить</button>
        </div>
      </div>`;
  });
  cartTotal.textContent = `Итого: ${total} ₴`;
}

function removeFromCart(index) {
  cart.splice(index,1);
  cartCount.textContent = cart.length;
  renderCart();
}

function filterCategory(cat) {
  toggleMenu(false);
  filteredProducts = cat==='all' ? [...products] : products.filter(p => p.category===cat);
  renderProducts();
}

function searchProducts(query) {
  filteredProducts = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  renderProducts();
}

function sortProducts(type) {
  if(type==='priceAsc') filteredProducts.sort((a,b)=>a.price-b.price);
  else if(type==='priceDesc') filteredProducts.sort((a,b)=>b.price-a.price);
  renderProducts();
}

function toggleMenu(force) {
  const sb = document.getElementById('sidebar');
  if(force===false) sb.classList.remove('active');
  else sb.classList.toggle('active');
}

function checkout() {
  const order = {
    items: cart,
    total: cart.reduce((s,p)=>s+p.price,0)
  };
  if(window.Telegram && Telegram.WebApp){
    Telegram.WebApp.sendData(JSON.stringify(order));
  } else {
    alert('Заказ сформирован (эмуляция): '+JSON.stringify(order));
  }
}

renderProducts();

