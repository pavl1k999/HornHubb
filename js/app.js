const ADMIN_NICK = '@pvlenemy';

const products = [
  // Elf Liq – 45 zl
  ...[
    'Strawberry Cherry Lemon','Sour Watermelon Gummy','Pink Lemonade Soda',
    'Pineapple Colada','Lemon Lime','Blueberry Raspberry Pomegranate',
    'Apple Pear','Strawberry Snow','Blackcurrant Aniseed',
    'P&B Cloud','Grape Cherry'
  ].map((n,i)=>({id:i+1,name:`Elf Liq – ${n}`,price:45,category:'liquid',img:'images/elf.jpg'})),

  // Chaser – 45 zl
  ...[
    'Grape Mint','Berry Lemonade','Blackberry Lemonade','Sour Apple',
    'Vitamin','Coconut Melon','Energetic','Strawberry Cream',
    'Watermelon Raspberry','Kiwi Passion Guava'
  ].map((n,i)=>({id:100+i,name:`Chaser – ${n}`,price:45,category:'liquid',img:'images/chaser.jpg'})),

  // Vazool – 60 zl
  ...[
    'Grape Ice','Watermelon Ice','Kiwi Passion Guava','Strawberry Ice Cream',
    'Sour Apple Ice','Love 777','Mixed Berries','Purple Candy',
    'Dragon Fruit Banana Cherry'
  ].map((n,i)=>({id:200+i,name:`Vazool – ${n}`,price:60,category:'disposable',img:'images/vazool.jpg'})),

  // Cartridge
  {id:300,name:'Xros Cartridge 0.6Ω',price:20,category:'cartridge',img:'images/cart.jpg'}
];

let cart = [];
let filtered = [...products];

const productList = document.getElementById('productList');
const cartCount = document.getElementById('cartCount');

function renderProducts(list=filtered){
  productList.innerHTML='';
  if(list.length===0){
    productList.innerHTML='<p style="padding:16px;color:#aaa">Нет товара в наличии</p>';
    return;
  }
  list.forEach(p=>{
    productList.innerHTML+=`
      <div class="product">
        <img src="${p.img}">
        <h4>${p.name}</h4>
        <span>${p.price} zł</span>
        <button onclick='addToCart(${p.id})'>В корзину</button>
      </div>`;
  });
}

function addToCart(id){
  const p = products.find(x=>x.id===id);
  cart.push(p);
  cartCount.textContent = cart.length;
}

function openCart(){
  document.getElementById('mainPage').classList.add('hidden');
  document.getElementById('cartPage').classList.remove('hidden');
  renderCart();
}

function closeCart(){
  document.getElementById('cartPage').classList.add('hidden');
  document.getElementById('mainPage').classList.remove('hidden');
}

function renderCart(){
  const box = document.getElementById('cartItems');
  const totalBox = document.getElementById('cartTotal');
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
  const text = cart.map(p=>`${p.name} – ${p.price} zł`).join('\n');
  const total = cart.reduce((s,p)=>s+p.price,0);
  alert(`Заказ отправлен!\n\nНапишите админу: ${ADMIN_NICK}\n\n${text}\n\nИтого: ${total} zł`);
}

function filterCategory(cat){
  toggleMenu(false);
  filtered = cat==='all' ? [...products] : products.filter(p=>p.category===cat);
  renderProducts();
}

function searchProducts(q){
  filtered = products.filter(p=>p.name.toLowerCase().includes(q.toLowerCase()));
  renderProducts();
}

function sortProducts(type){
  if(type==='low') filtered.sort((a,b)=>a.price-b.price);
  if(type==='high') filtered.sort((a,b)=>b.price-a.price);
  if(type==='name') filtered.sort((a,b)=>a.name.localeCompare(b.name));
  renderProducts();
}

function toggleMenu(force){
  const s=document.getElementById('sidebar');
  force===false ? s.classList.remove('active') : s.classList.toggle('active');
}

// скрытие шапки при скролле
let last=0;
window.addEventListener('scroll',()=>{
  const h=document.getElementById('header');
  const cur=window.scrollY;
  cur>last ? h.classList.add('hide') : h.classList.remove('hide');
  last=cur;
});

renderProducts();


