// ================== GLOBAL STATE ==================
let products = [];
let CART = JSON.parse(localStorage.getItem("bpc-CART")) || [];
let DISTRICT = localStorage.getItem("bpc-DISTRICT") || "Dhaka";

// Elements
const productListEl = document.getElementById("productList");
const cartDrawerEl = document.getElementById("cartDrawer");
const cartCountEl = document.getElementById("cartCount");
const openCartBtnEl = document.getElementById("openCartBtn");
const cartOverlayEl = document.getElementById("cartOverlay");
const districtSelectEl = document.getElementById("districtSelect");

// Districts
const allDistricts = [
  "Dhaka", "Gazipur", "Narayanganj", "Munshiganj", "Manikganj",
  "Tangail", "Kishoreganj", "Narsingdi", // around Dhaka
  "Chattogram", "Cox's Bazar", "Khulna", "Rajshahi", "Sylhet", "Rangpur",
  "Barisal", "Mymensingh", "Cumilla", "Feni", "Noakhali", "Lakshmipur",
  "Chandpur", "Brahmanbaria", "Habiganj", "Moulvibazar", "Sunamganj",
  "Pabna", "Bogura", "Joypurhat", "Naogaon", "Natore", "Sirajganj",
  "Jashore", "Satkhira", "Magura", "Jhenaidah", "Narail", "Kushtia",
  "Meherpur", "Chuadanga", "Barishal", "Patuakhali", "Bhola",
  "Pirojpur", "Jhalokati", "Barguna", "Mymensingh", "Netrokona",
  "Sherpur", "Jamalpur", "Dinajpur", "Thakurgaon", "Panchagarh",
  "Nilphamari", "Lalmonirhat", "Kurigram", "Gaibandha", "Rangpur",
  "Bagerhat", "Khagrachhari", "Rangamati", "Bandarban"
];

// ================== INIT ==================
async function init() {
  try {
    const res = await fetch("data/products.json");
    products = await res.json();
    renderProducts();
    renderCart();
    renderDistricts();
  } catch (err) {
    console.error("Error loading products:", err);
  }
}
init();

// ================== PRODUCTS ==================
function renderProducts() {
  if (!productListEl) return;

  productListEl.innerHTML = products
    .map(
      (p) => `
    <div class="border rounded-lg p-3 shadow hover:shadow-lg transition">
      <img src="${p.image}" alt="${p.name}" class="w-full h-40 object-cover rounded">
      <h3 class="text-lg font-semibold mt-2">${p.name}</h3>
      <p class="text-sm text-gray-500">${p.brand}</p>
      <p class="text-gray-700 font-bold">৳${p.price.toLocaleString()}</p>
      <p class="text-xs text-gray-500">Unit: ${p.unit}</p>
      <p class="text-xs text-gray-500">Weight: ${p.weight} kg</p>
      <button onclick="addToCart('${p.id}')" class="mt-2 w-full bg-black text-white py-2 rounded hover:bg-gray-800">Add to Cart</button>
    </div>`
    )
    .join("");
}

// ================== CART ==================
function addToCart(id) {
  const item = CART.find((i) => i.id === id);
  if (item) {
    item.qty += 1;
  } else {
    CART.push({ id, qty: 1 });
  }
  saveCart();
}

function removeFromCart(id) {
  CART = CART.filter((i) => i.id !== id);
  saveCart();
}

function updateQty(id, qty) {
  const item = CART.find((i) => i.id === id);
  if (item) {
    item.qty = qty > 0 ? qty : 1;
  }
  saveCart();
}

function saveCart() {
  localStorage.setItem("bpc-CART", JSON.stringify(CART));
  renderCart();
}

function getDeliveryCost(totalWeight) {
  const insideDhaka = [
    "Dhaka","Gazipur","Narayanganj","Munshiganj","Manikganj",
    "Tangail","Kishoreganj","Narsingdi"
  ];
  const perKgRate = insideDhaka.includes(DISTRICT) ? 2.1 : 3.5;
  const minCost = insideDhaka.includes(DISTRICT) ? 150 : 200;

  const calc = totalWeight * perKgRate;
  return Math.max(calc, minCost);
}

function renderCart() {
  if (!cartDrawerEl || !cartCountEl) return;

  const detailed = CART.map((c) => {
    const p = products.find((pr) => pr.id === c.id);
    return { ...p, qty: c.qty, subtotal: p.price * c.qty, weight: p.weight * c.qty };
  });

  const subtotal = detailed.reduce((sum, i) => sum + i.subtotal, 0);
  const totalWeight = detailed.reduce((sum, i) => sum + i.weight, 0);
  const deliveryCost = getDeliveryCost(totalWeight);
  const grandTotal = subtotal + deliveryCost;

  cartCountEl.textContent = CART.reduce((sum, i) => sum + i.qty, 0);

  cartDrawerEl.innerHTML = `
    <div class="p-4 flex-1 overflow-y-auto">
      <h2 class="text-lg font-semibold mb-2">Your Cart</h2>
      ${
        detailed.length === 0
          ? "<p class='text-gray-500'>Cart is empty.</p>"
          : detailed
              .map(
                (i) => `
          <div class="flex justify-between items-center mb-2 border-b pb-2">
            <div>
              <p class="font-semibold">${i.name}</p>
              <p class="text-sm text-gray-500">৳${i.price} × ${i.qty}</p>
              <p class="text-xs text-gray-400">${i.weight} kg</p>
            </div>
            <div class="flex items-center gap-2">
              <input type="number" min="1" value="${i.qty}" 
                onchange="updateQty('${i.id}', this.value)" 
                class="w-12 border rounded text-center">
              <button onclick="removeFromCart('${i.id}')" class="text-red-500">✕</button>
            </div>
          </div>`
              )
              .join("")
      }
    </div>
    <div class="p-4 border-t">
      <p class="flex justify-between"><span>Subtotal:</span> <span>৳${subtotal.toLocaleString()}</span></p>
      <p class="flex justify-between"><span>Total Weight:</span> <span>${totalWeight} kg</span></p>
      <p class="flex justify-between"><span>Delivery:</span> <span>৳${deliveryCost.toLocaleString()}</span></p>
      <p class="flex justify-between font-bold text-lg mt-2"><span>Total:</span> <span>৳${grandTotal.toLocaleString()}</span></p>
      <button class="w-full mt-3 bg-green-600 text-white py-2 rounded">Checkout</button>
    </div>
  `;
}

// ================== CART OPEN/CLOSE ==================
function openCart() {
  if (!cartDrawerEl) return;
  cartDrawerEl.classList.add("active");
  cartOverlayEl.classList.remove("hidden");
  renderCart();
}
function closeCart() {
  if (!cartDrawerEl) return;
  cartDrawerEl.classList.remove("active");
  cartOverlayEl.classList.add("hidden");
}

if (openCartBtnEl) openCartBtnEl.addEventListener("click", openCart);
if (cartOverlayEl) cartOverlayEl.addEventListener("click", closeCart);

// ================== DISTRICT ==================
function renderDistricts() {
  if (!districtSelectEl) return;
  districtSelectEl.innerHTML = allDistricts
    .map((d) => `<option value="${d}" ${d === DISTRICT ? "selected" : ""}>${d}</option>`)
    .join("");
  districtSelectEl.addEventListener("change", (e) => {
    DISTRICT = e.target.value;
    localStorage.setItem("bpc-DISTRICT", DISTRICT);
    renderCart();
  });
}
