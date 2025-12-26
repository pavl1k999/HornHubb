const ADMIN_NICK = '@pvlenemy';
const ADMIN_URL = `https://t.me/${pvlenemy}`;

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

let cart = [];
let filtered = [...products];

const productList = document.getElementById('productList');
const cartCount = document.getElementById('cartCount');

function renderProducts(list=filtered){
  productList.innerHTML='';
  if(!list.length){
    productList.innerHTML='<p style="color:#aaa;padding:16px">Нет товара в наличии</p>';
    return;
  }
  list.forEach(p=>{
    productList.innerHTML+=`
      <div class="product">
        <img src="${p.img}">
        <h4>${p.name}</h4>
        <span>${p.price} zł</span>
        <button onclick="addToCart(${p.id})">В корзину</button>
      </div>`;
  });
}

function addToCart(id){
  cart.push(products.find(p=>p.id===id));
  cartCount.textContent = cart.length;
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

function renderCart(){
  const box=document.getElementById('cartItems');
  const totalBox=document.getElementById('cartTotal');
  box.innerHTML='';
  let total=0;
  cart.forEach((p,i)=>{
    total+=p.price;
    box.innerHTML+=`
      <div class="cart-item">
        <img src="${p.img}">
        <div>
          <div>${p.name}</div>
          <div>${p.price} zł</div>
          <button class="remove-btn" onclick="removeFromCart(${i})">Удалить</button>
        </div>
      </div>`;
  });
  totalBox.textContent = `Итого: ${total} zł`;
}

function removeFromCart(i){
  cart.splice(i,1);
  cartCount.textContent = cart.length;
  renderCart();
}

function checkout(){
  if(!cart.length) return alert('Корзина пуста');
  window.open(ADMIN_URL, '_blank');
}

function filterCategory(cat){
  toggleMenu(false);
  filtered = cat==='all' ? [...products] : product



