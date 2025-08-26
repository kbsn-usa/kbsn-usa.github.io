// ================== GLOBAL STATE ==================
let products = [];
let CART = JSON.parse(localStorage.getItem("bpc-CART")) || [];
let DISTRICT = localStorage.getItem("bpc-DISTRICTS") || "";
let SEARCH_QUERY = "";
let ACTIVE_CATEGORY = "all"; // <-- NEW

// ============== DOM Elements =================
const openCartBtnEl = document.getElementById("open-cart");
const closeCartBtnEl = document.getElementById("close-cart");
const cartSidebarEl = document.getElementById("cart-sidebar");
const cartOverlayEl = document.getElementById("cart-overlay");
const cartItemsEl = document.getElementById("cart-items");
const cartSubtotalEl = document.getElementById("cart-subtotal");
const cartDeliveryEl = document.getElementById("cart-delivery");
const cartTotalEl = document.getElementById("cart-total");
const cartCountEl = document.getElementById("cartCount");
const productListEl = document.getElementById("productsGrid");
const districtSelectEl = document.getElementById("districtSelect");
const searchInputEl = document.getElementById("searchInput");
const categoryFiltersEl = document.getElementById("categoryFilters"); // <-- NEW

// ================== Districts ==================
const allDistricts = [
  "Dhaka", "Gazipur", "Narayanganj", "Munshiganj", "Manikganj",
  "Tangail", "Kishoreganj", "Narsingdi",
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
    renderDistricts();
    renderCategories();
    renderProducts();
    renderCart();
  } catch (err) {
    console.error("Error loading products:", err);
  }
}
init();

// ================== PRODUCTS ==================
function renderProducts() {
  if (!productListEl) return;

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(SEARCH_QUERY) ||
      p.brand.toLowerCase().includes(SEARCH_QUERY);

    const matchesCategory =
      ACTIVE_CATEGORY === "all" || p.category === ACTIVE_CATEGORY;

    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    productListEl.innerHTML = `<p class="text-gray-500">No products found.</p>`;
    return;
  }

  productListEl.innerHTML = filtered
    .map(
      (p) => `
    <div class="border rounded-lg p-3 shadow hover:shadow-lg transition bg-white">
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

// ================== SEARCH ==================
if (searchInputEl) {
  searchInputEl.addEventListener("input", (e) => {
    SEARCH_QUERY = e.target.value.trim().toLowerCase();
    renderProducts();
  });
}

// ================== CATEGORY FILTERS ==================
function renderCategories() {
  if (!categoryFiltersEl) return;

  const categories = ["all", ...new Set(products.map((p) => p.category))];

  categoryFiltersEl.innerHTML = categories
    .map(
      (cat) => `
      <button
        onclick="setCategory('${cat}')"
        class="px-3 py-1 rounded-full border ${
          ACTIVE_CATEGORY === cat
            ? "bg-black text-white"
            : "bg-white text-gray-600 hover:bg-gray-100"
        }"
      >
        ${cat.charAt(0).toUpperCase() + cat.slice(1)}
      </button>`
    )
    .join("");
}

function setCategory(cat) {
  ACTIVE_CATEGORY = cat;
  renderCategories();
  renderProducts();
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
    "Dhaka", "Gazipur", "Narayanganj", "Munshiganj", "Manikganj",
    "Tangail", "Kishoreganj", "Narsingdi"
  ];
  const perKgRate = insideDhaka.includes(DISTRICT) ? 2.1 : 3.5;
  const minCost = insideDhaka.includes(DISTRICT) ? 150 : 200;

  const calc = totalWeight * perKgRate;
  return Math.max(calc, minCost);
}

function renderCart() {
  if (!cartSidebarEl || !cartCountEl) return;

  const detailed = CART.map((c) => {
    const p = products.find((pr) => pr.id === c.id);
    return { ...p, qty: c.qty, subtotal: p.price * c.qty, weight: p.weight * c.qty };
  });

  const subtotal = detailed.reduce((sum, i) => sum + i.subtotal, 0);
  const totalWeight = detailed.reduce((sum, i) => sum + i.weight, 0);
  const deliveryCost = getDeliveryCost(totalWeight);
  const grandTotal = subtotal + deliveryCost;

  cartCountEl.textContent = CART.reduce((sum, i) => sum + i.qty, 0);

  cartItemsEl.innerHTML =
    detailed.length === 0
      ? "<p class='text-gray-500 text-center py-6'>Your cart is empty.</p>"
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
          .join("");

  cartSubtotalEl.textContent = `৳${subtotal.toLocaleString()}`;
  cartDeliveryEl.textContent = `৳${deliveryCost.toLocaleString()}`;
  cartTotalEl.textContent = `৳${grandTotal.toLocaleString()}`;
}

// ================== CART OPEN/CLOSE ==================
function openCart() {
  cartSidebarEl.classList.remove("translate-x-full");
  cartOverlayEl.classList.remove("hidden");
}
function closeCart() {
  cartSidebarEl.classList.add("translate-x-full");
  cartOverlayEl.classList.add("hidden");
}

if (openCartBtnEl) openCartBtnEl.addEventListener("click", openCart);
if (closeCartBtnEl) closeCartBtnEl.addEventListener("click", closeCart);
if (cartOverlayEl) cartOverlayEl.addEventListener("click", closeCart);

// ================== DISTRICT ==================
function renderDistricts() {
  if (!districtSelectEl) return;

  districtSelectEl.innerHTML = `
    <option value="" disabled ${DISTRICT === "" ? "selected" : ""}>Deliver to</option>
    ${allDistricts
      .map((d) => `<option value="${d}" ${d === DISTRICT ? "selected" : ""}>${d}</option>`)
      .join("")}
  `;

  // ✅ Only save when user selects a district
  districtSelectEl.addEventListener("change", (e) => {
    DISTRICT = e.target.value;
    localStorage.setItem("bpc-DISTRICTS", DISTRICT);
    renderCart();
  });
}
