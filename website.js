// ================== GLOBAL STATE ==================
let PRODUCTS = [];
let CART = JSON.parse(localStorage.getItem("bpc-CART")) || [];
let DISTRICT = localStorage.getItem("bpc-DISTRICTS") || "Dhaka";

// ================== DISTRICT LIST ==================
const allDistricts = [
  "Dhaka","Faridpur","Gazipur","Gopalganj","Kishoreganj","Madaripur","Manikganj","Munshiganj","Narayanganj","Narsingdi","Rajbari","Shariatpur","Tangail",
  "Chattogram","Bandarban","Brahmanbaria","Chandpur","Cox's Bazar","Cumilla","Feni","Khagrachhari","Lakshmipur","Noakhali","Rangamati",
  "Khulna","Bagerhat","Chuadanga","Jashore","Jhenaidah","Kushtia","Magura","Meherpur","Narail","Satkhira",
  "Barishal","Barguna","Bhola","Jhalokati","Patuakhali","Pirojpur",
  "Sylhet","Habiganj","Moulvibazar","Sunamganj",
  "Rajshahi","Bogura","Joypurhat","Naogaon","Natore","Chapai Nawabganj","Pabna","Sirajganj",
  "Rangpur","Dinajpur","Gaibandha","Kurigram","Lalmonirhat","Nilphamari","Panchagarh","Thakurgaon",
  "Mymensingh","Jamalpur","Netrokona","Sherpur"
];

// ================== DOM ELEMENTS ==================
const productGrid = document.getElementById("productsGrid");
const cartSidebar = document.getElementById("cart-sidebar");
const cartItemsEl = document.getElementById("cart-items");
const cartSubtotalEl = document.getElementById("cart-subtotal");
const cartDeliveryEl = document.getElementById("cart-delivery");
const cartTotalEl = document.getElementById("cart-total");
const cartCountEl = document.getElementById("cartCount");
const districtSelectEl = document.getElementById("districtSelect");
const cartBtn = document.getElementById("openCartBtn");
const closeCartBtn = document.getElementById("close-cart");
const productModal = document.getElementById("detailsSheet");
const modalContent = document.getElementById("detailsSheet");

// ================== HELPERS ==================
function saveCart() {
  localStorage.setItem("bpc-CART", JSON.stringify(CART));
}

function BDT(x) {
  return `৳${x.toLocaleString()}`;
}

// ================== DELIVERY COST ==================
function calculateDeliveryCost() {
  const totalWeight = CART.reduce((sum, it) => sum + (it.weight || 0) * it.qty, 0);
  let perKgRate = DISTRICT === "Dhaka" || ["Gazipur","Narayanganj","Narsingdi","Manikganj","Munshiganj"].includes(DISTRICT)
    ? 2.1
    : 2.5;

  let minCost = DISTRICT === "Dhaka" || ["Gazipur","Narayanganj","Narsingdi","Manikganj","Munshiganj"].includes(DISTRICT)
    ? 150
    : 200;

  let calculated = totalWeight * perKgRate;
  return Math.max(minCost, Math.ceil(calculated));
}

// ================== RENDER PRODUCTS ==================
function renderProducts() {
  productGrid.innerHTML = PRODUCTS.map(p => `
    <div class="border rounded-lg shadow-sm p-3 flex flex-col">
      <img src="${p.image}" alt="${p.name}" class="h-40 w-full object-contain cursor-pointer" onclick="openProductModal('${p.id}')"/>
      <h3 class="font-semibold mt-2">${p.name}</h3>
      <p class="text-sm text-neutral-600">${p.brand}</p>
      <p class="text-xs text-neutral-500">Origin: ${p.origin}</p>
      <p class="text-xs text-neutral-500">Unit: ${p.unit ?? ""}</p>
      <p class="text-xs text-neutral-500">Weight: ${p.weight ?? 0} kg</p>
      <p class="font-bold mt-1">${BDT(p.price)}</p>
      <button class="mt-auto bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700" onclick="addToCart('${p.id}')">Add to Cart</button>
    </div>
  `).join("");
}

// ================== CART FUNCTIONS ==================
function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  const existing = CART.find(it => it.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    CART.push({...product, qty: 1});
  }
  saveCart();
  renderCart();
  openCart();
}

function removeFromCart(id) {
  CART = CART.filter(it => it.id !== id);
  saveCart();
  renderCart();
}

function changeQty(id, qty) {
  const item = CART.find(it => it.id === id);
  if (item) {
    item.qty = Math.max(1, qty);
    saveCart();
    renderCart();
  }
}

function renderCart() {
  cartItemsEl.innerHTML = CART.map(it => `
    <div class="flex justify-between items-center border-b py-2">
      <div>
        <p class="font-medium">${it.name}</p>
        <p class="text-xs text-neutral-500">${BDT(it.price)} × ${it.qty} | ${it.weight} kg each</p>
      </div>
      <div class="flex items-center gap-2">
        <input type="number" min="1" value="${it.qty}" class="w-12 border rounded text-center"
          onchange="changeQty('${it.id}', parseInt(this.value))"/>
        <button class="text-red-500" onclick="removeFromCart('${it.id}')">✕</button>
      </div>
    </div>
  `).join("");

  const subtotal = CART.reduce((sum, it) => sum + it.price * it.qty, 0);
  const delivery = calculateDeliveryCost();
  const total = subtotal + delivery;

  cartSubtotalEl.textContent = BDT(subtotal);
  cartDeliveryEl.textContent = BDT(delivery);
  cartTotalEl.textContent = BDT(total);
  cartCountEl.textContent = CART.reduce((sum, it) => sum + it.qty, 0);
}

// ================== CART SIDEBAR ==================
function openCart() {
  cartSidebar.classList.remove("translate-x-full");
}
function closeCart() {
  cartSidebar.classList.add("translate-x-full");
}

// ================== PRODUCT MODAL ==================
function openProductModal(id) {
  const p = PRODUCTS.find(p => p.id === id);
  if (!p) return;

  modalContent.innerHTML = `
    <div class="p-4">
      <img src="${p.image}" alt="${p.name}" class="h-60 mx-auto object-contain"/>
      <h2 class="text-xl font-bold mt-3">${p.name}</h2>
      <p class="text-sm text-neutral-600">${p.brand}</p>
      <p class="text-sm text-neutral-600">Origin: ${p.origin}</p>
      <p class="text-sm text-neutral-600">Unit: ${p.unit ?? ""}</p>
      <p class="text-sm text-neutral-600">Weight: ${p.weight ?? 0} kg</p>
      <p class="text-lg font-bold mt-2">${BDT(p.price)}</p>
      <button class="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onclick="addToCart('${p.id}')">Add to Cart</button>
    </div>
  `;
  productModal.classList.remove("hidden");
}
function closeProductModal() {
  productModal.classList.add("hidden");
}

// ================== INIT ==================
async function init() {
  const res = await fetch("products.json");
  PRODUCTS = await res.json();

  renderProducts();
  renderCart();

  // Populate district dropdown
  districtSelectEl.innerHTML = allDistricts
    .map(d => `<option value="${d}" ${d === DISTRICT ? "selected" : ""}>${d}</option>`)
    .join("");

  districtSelectEl.addEventListener("change", e => {
    DISTRICT = e.target.value;
    localStorage.setItem("bpc-DISTRICTS", DISTRICT);
    renderCart();
  });
}

init();

// ================== EVENT LISTENERS ==================
cartBtn.addEventListener("click", openCart);
closeCartBtn.addEventListener("click", closeCart);
closeModalBtn.addEventListener("click", closeProductModal);
