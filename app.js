const products = [
  // Под-системы
  {id:1,name:'Pod X',price:1200,category:'pods',img:'images/pod.jpg'},
  {id:2,name:'Pod Y',price:1100,category:'pods',img:'images/pod.jpg'},
  {id:3,name:'Pod Z',price:1300,category:'pods',img:'images/pod.jpg'},
  // Жидкости
  {id:4,name:'Liquid Berry',price:300,category:'liquid',img:'images/liquid.jpg'},
  {id:5,name:'Liquid Mint',price:350,category:'liquid',img:'images/liquid.jpg'},
  {id:6,name:'Liquid Cola',price:280,category:'liquid',img:'images/liquid.jpg'},
  // Картриджи
  {id:7,name:'Cartridge A',price:250,category:'cartridge',img:'images/cart.jpg'},
  {id:8,name:'Cartridge B',price:270,category:'cartridge',img:'images/cart.jpg'},
  {id:9,name:'Cartridge C',price:230,category:'cartridge',img:'images/cart.jpg'},
  // Одноразки
  {id:10,name:'Disposable Puff 2000',price:900,category:'disposable',img:'images/disposable.jpg'},
  {id:11,name:'Disposable Puff 3000',price:1100,category:'disposable',img:'images/disposable.jpg'},
  {id:12,name:'Disposable Puff 1500',price:750,category:'disposable',img:'images/disposable.jpg'}
];

let cart = [];
let currentProducts = [...products];

const productList = document.getElementById('productList');
const cartCount = document.getElementById('cartCount');
const cartPage = document.getElementById('cartPage');
const mainPage = document.getElementById('mainPage');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');

function renderProducts(list = currentProducts) {
  productList.innerHTML = '';
  list.forEach(p=>{
    const div = document.createElement('div');
    div.className='product';
    div.innerHTML = `<img src="${p.img}"><h4>${p.name}</h4><span>${p.price} ₴</span><button onclick='addToCart(${JSON.stringify(p)})'>В корзину</button>`;
    productList.appendChild(div);
  });
}

function addToCart(product){
  cart.push(product);
  cartCount.textContent = cart.length;
  cartCount.classList.add('animate');
  setTimeout(()=>cartCount.classList.remove('animate'),300);
}

function openCart(){
  mainPage.classList.add('hidden');
  cartPage.classList.remove('hidden');
  renderCart();
}

function closeCart(){
  cartPage.classList.add('hidden');
  mainPage.classList.remove('hidden');
}

function renderCart(){
  cartItems.innerHTML='';
  let total=0;
  cart.forEach((p,i)=>{
    total+=p.price;
    cartItems.innerHTML+=`<div class="cart-item">
      <img src="${p.img}">
      <div>
        <div>${p.name}</div>
        <div>${p.price} ₴</div>
        <button class="remove-btn" onclick="removeFromCart(${i})">Удалить</button>
      </div>
    </div>`;
  });
  cartTotal.textContent=`Итого: ${total} ₴`;
}

function removeFromCart(index){
  cart.splice(index,1);
  cartCount.textContent=cart.length;
  renderCart();
}

function filterCategory(cat){
  toggleMenu(false);
  currentProducts=cat==='all'? [...products] : products.filter(p=>p.category===cat);
  renderProducts();
}

function toggleMenu(force){
  const sb=document.getElementById('sidebar');
  if(force===false) sb.classList.remove('active');
  else sb.classList.toggle('active');
}

function searchProducts(query){
  const q=query.toLowerCase();
  currentProducts=currentProducts.filter(p=>p.name.toLowerCase().includes(q));
  renderProducts();
}

function sortProducts(mode){
  if(mode==='priceAsc') currentProducts.sort((a,b)=>a.price-b.price);
  else if(mode==='priceDesc') currentProducts.sort((a,b)=>b.price-a.price);
  renderProducts();
}

function checkout(){
  const order={items:cart,total:cart.reduce((s,p)=>s+p.price,0)};
  if(window.Telegram && Telegram.WebApp){
    Telegram.WebApp.sendData(JSON.stringify(order));
  } else alert('Заказ сформирован (эмуляция): '+JSON.stringify(order));
}

renderProducts();
