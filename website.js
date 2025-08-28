/* ================== GLOBAL STATE ================== */
let products = [];
let CART = JSON.parse(localStorage.getItem("bpc-CART")) || [];
let DISTRICT = localStorage.getItem("bpc-DISTRICTS") || "";
let SEARCH_QUERY = "";
let ACTIVE_CATEGORY = "all";

/* ================== DOM ELEMENTS ================== */
const openCartBtnEl = document.getElementById("open-cart");
const closeCartBtnEl = document.getElementById("close-cart");
const cartSidebarEl = document.getElementById("cart-sidebar");
const cartOverlayEl = document.getElementById("cart-overlay");
const cartItemsEl = document.getElementById("cart-items");
const cartSummaryEl = document.getElementById("cart-summary");
const cartCountEl = document.getElementById("cartCount");
const productListEl = document.getElementById("productsGrid");
const districtSelectEl = document.getElementById("districtSelect");
const searchInputEl = document.getElementById("searchInput");
const categoryFiltersEl = document.getElementById("categoryFilters");
const emptyCartEl = document.getElementById("empty-cart");

/* ================== DISTRICTS ================== */
const allDistricts = [
  "Dhaka","Gazipur","Narayanganj","Munshiganj","Manikganj",
  "Tangail","Kishoreganj","Narsingdi","Chattogram","Cox's Bazar",
  "Khulna","Rajshahi","Sylhet","Rangpur","Barisal","Mymensingh",
  "Cumilla","Feni","Noakhali","Lakshmipur","Chandpur","Brahmanbaria",
  "Habiganj","Moulvibazar","Sunamganj","Pabna","Bogura","Joypurhat",
  "Naogaon","Natore","Sirajganj","Jashore","Satkhira","Magura",
  "Jhenaidah","Narail","Kushtia","Meherpur","Chuadanga","Barishal",
  "Patuakhali","Bhola","Pirojpur","Jhalokati","Barguna","Mymensingh",
  "Netrokona","Sherpur","Jamalpur","Dinajpur","Thakurgaon","Panchagarh",
  "Nilphamari","Lalmonirhat","Kurigram","Gaibandha","Rangpur",
  "Bagerhat","Khagrachhari","Rangamati","Bandarban"
];

/* ================== INIT ================== */
async function init() {
  try {
    const res = await fetch("data/products.json");
    products = await res.json();
    await loadDeliveryRates();
    renderDistricts();
    renderCategories();
    renderProducts();
    renderCart();
  } catch (err) {
    console.error("Error loading products:", err);
  }
}
init();

/* ================== UTILITIES ================== */
function fmtMoney(n) {
  const num = Number(n);
  if (!isFinite(num)) return "৳" + n;
  return "৳" + num.toLocaleString();
}

/**
 * Normalize product.brands into array of { name, price }
 * Supports:
 * - New format: [{name, price}, ...]
 * - Legacy array: ["Akij", "BSRM"]  (uses product.price for each)
 * - Legacy string: "Akij, BSRM"     (uses product.price for each)
 */
function getBrandObjects(prod) {
  if (!prod || prod.brands == null) return [];
  const basePrice = Number(prod.price) || 0;

  // Already in new format
  if (Array.isArray(prod.brands) && prod.brands.length && typeof prod.brands[0] === "object") {
    return prod.brands
      .filter(b => b && typeof b.name === "string")
      .map(b => ({ name: String(b.name).trim(), price: Number(b.price) || basePrice }))
      .filter(b => b.name);
  }

  // Legacy array of names
  if (Array.isArray(prod.brands)) {
    return prod.brands
      .map(x => String(x).trim())
      .filter(Boolean)
      .map(name => ({ name, price: basePrice }));
  }

  // Legacy comma-separated string
  if (typeof prod.brands === "string") {
    return prod.brands
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .map(name => ({ name, price: basePrice }));
  }

  return [];
}

function getBrandNames(prod) {
  return getBrandObjects(prod).map(b => b.name);
}

function getPriceForBrand(prod, brandName) {
  const brands = getBrandObjects(prod);
  const found = brands.find(b => b.name === brandName);
  if (found) return Number(found.price) || 0;
  // fallback to product.price if no brand match
  return Number(prod.price) || 0;
}

function getMinPrice(prod) {
  const brands = getBrandObjects(prod);
  if (brands.length === 0) return Number(prod.price) || 0;
  return Math.min(...brands.map(b => Number(b.price) || Infinity));
}

/* ================== PRODUCTS ================== */
function renderProducts() {
  if (!productListEl) return;

  const filtered = products.filter((p) => {
    const q = SEARCH_QUERY;
    const brandNames = getBrandNames(p).join(" ").toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      brandNames.includes(q);

    const matchesCategory = ACTIVE_CATEGORY === "all" || p.category === ACTIVE_CATEGORY;
    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    productListEl.innerHTML = `<p class="text-gray-500">No products found.</p>`;
    return;
  }

  productListEl.innerHTML = filtered.map((p) => {
    const minPrice = getMinPrice(p);
    const brands = getBrandObjects(p);
    const brandBadge = brands.length
      ? `<span class="inline-block text-[11px] text-neutral-600 bg-neutral-100 border rounded px-2 py-0.5 mt-1">${brands.length} brand${brands.length>1?'s':''}</span>`
      : "";

    return `
      <div class="border rounded-lg p-3 shadow hover:shadow-lg transition bg-white">
        <img src="${p.image}" alt="${p.name}" class="w-full h-40 object-cover rounded">
        <h3 class="text-lg font-semibold mt-2">${p.name}</h3>
        <p class="text-sm text-gray-500">${p.origin || ""}</p>
        <p class="text-gray-700 font-bold">From ${fmtMoney(minPrice)}</p>
        <p class="text-xs text-gray-500">Unit: ${p.unit || "-"}</p>
        <p class="text-xs text-gray-500">Weight: ${p.weight} kg</p>
        ${brandBadge}
        <button onclick="addToCart('${p.id}')"
          class="mt-3 w-full bg-black text-white py-2 rounded hover:bg-gray-800">
          Add to Cart
        </button>
      </div>`;
  }).join("");
}

/* ================== SEARCH ================== */
if (searchInputEl) {
  searchInputEl.addEventListener("input", (e) => {
    SEARCH_QUERY = e.target.value.trim().toLowerCase();
    renderProducts();
  });
}

/* ================== CATEGORY FILTERS ================== */
function renderCategories() {
  if (!categoryFiltersEl) return;
  const categories = ["all", ...new Set(products.map((p) => p.category))];

  categoryFiltersEl.innerHTML = categories.map((cat) => `
    <button
      onclick="setCategory('${cat}')"
      class="px-3 py-1 rounded-full border ${ACTIVE_CATEGORY === cat
        ? "bg-black text-white"
        : "bg-white text-gray-600 hover:bg-gray-100"}"
    >
      ${cat.charAt(0).toUpperCase() + cat.slice(1)}
    </button>
  `).join("");
}

function setCategory(cat) {
  ACTIVE_CATEGORY = cat;
  renderCategories();
  renderProducts();
}

/* ================== CART ================== */
function addToCart(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  const brandObjs = getBrandObjects(product);
  const defaultBrandName = brandObjs[0]?.name || "";
  const defaultUnitPrice = brandObjs[0]?.price ?? (Number(product.price) || 0);

  // If item already in cart with the same product & same brand, bump qty.
  // If exists but brand differs, we'll add as a separate line item.
  const existingIndex = CART.findIndex(
    i => i.id === id && i.selectedBrand === defaultBrandName
  );

  if (existingIndex > -1) {
    CART[existingIndex].qty += 1;
  } else {
    CART.push({
      id: product.id,
      name: product.name,
      image: product.image,
      unit: product.unit,
      weight: product.weight,
      qty: 1,
      selectedBrand: defaultBrandName,
      unitPrice: defaultUnitPrice
    });
  }

  saveCart();
  openCart();
}

function removeFromCart(index) {
  CART.splice(index, 1);
  saveCart();
}

function updateQty(index, qty) {
  if (!CART[index]) return;
  const safeQty = Number.isFinite(qty) ? Math.floor(qty) : 1;
  if (safeQty <= 0) {
    removeFromCart(index);
    return;
  }
  CART[index].qty = safeQty;
  saveCart();
}

function updateBrand(index, brandName) {
  if (!CART[index]) return;
  const prod = products.find(p => p.id === CART[index].id);
  const newPrice = getPriceForBrand(prod, brandName);
  CART[index].selectedBrand = brandName;
  CART[index].unitPrice = newPrice;
  saveCart();
}

function saveCart() {
  localStorage.setItem("bpc-CART", JSON.stringify(CART));
  renderCart();
}

/* ================== DELIVERY COST ================== */
let deliveryRates = {}; // loaded from districts.json

async function loadDeliveryRates() {
  try {
    const res = await fetch("data/districts.json");
    const data = await res.json();
    deliveryRates = data; // example: { "Dhaka": { perKg: 2.0, minCost: 125 }, ... }
  } catch (err) {
    console.error("Error loading delivery rates:", err);
  }
}

function getDeliveryCost(totalWeight) {
  if (!DISTRICT || !deliveryRates[DISTRICT]) {
    return 0; // default if district not selected
  }
  const { perKg, minCost } = deliveryRates[DISTRICT];
  const calc = totalWeight * perKg;
  return Math.max(calc, minCost);
}

/* ================== CART RENDER ================== */
function renderCart() {
  if (!cartItemsEl) return;

  cartItemsEl.innerHTML = "";

  if (CART.length === 0) {
    if (emptyCartEl) emptyCartEl.classList.remove("hidden");
    cartSummaryEl.classList.add("hidden");
    if (cartCountEl) cartCountEl.textContent = "0";
    return;
  }
  if (emptyCartEl) emptyCartEl.classList.add("hidden");
  cartSummaryEl.classList.remove("hidden");

  let subtotal = 0;
  let totalWeight = 0;

  CART.forEach((item, index) => {
    const product = products.find(p => p.id === item.id) || {};
    const brandObjs = getBrandObjects(product);

    subtotal += (item.unitPrice || 0) * item.qty;
    totalWeight += (item.weight || 0) * item.qty;

    const brandSelectHTML = brandObjs.length
      ? `
        <label class="text-xs text-neutral-500 mt-2 block">Brand</label>
        <select onchange="updateBrand(${index}, this.value)"
          class="w-full border rounded text-sm px-2 py-1">
          ${brandObjs.map(b => `
            <option value="${b.name}" ${item.selectedBrand === b.name ? "selected" : ""}>
              ${b.name} — ${fmtMoney(b.price)}
            </option>
          `).join("")}
        </select>
      `
      : "";

    const div = document.createElement("div");
    div.className = "flex items-center gap-4 p-3 border rounded-xl bg-white shadow-sm mb-2";

    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="h-14 w-14 rounded-lg object-cover border" />
      <div class="flex-1">
        <h4 class="font-medium text-sm">${item.name}</h4>
        <p class="text-xs text-neutral-500">${fmtMoney(item.unitPrice)} per ${item.unit || "unit"}</p>
        ${brandSelectHTML}
        <div class="flex items-center gap-2 mt-2">
          <button onclick="updateQty(${index}, ${item.qty - 1})" class="px-2 py-1 bg-neutral-200 rounded hover:bg-neutral-300">–</button>
          <input type="number" min="1" value="${item.qty}"
            onchange="updateQty(${index}, parseInt(this.value) || 1)"
            class="w-14 border rounded text-center text-sm" />
          <button onclick="updateQty(${index}, ${item.qty + 1})" class="px-2 py-1 bg-neutral-200 rounded hover:bg-neutral-300">+</button>
        </div>
      </div>
      <div class="flex flex-col items-end gap-2">
        <span class="font-semibold">${fmtMoney((item.unitPrice || 0) * item.qty)}</span>
        <button onclick="removeFromCart(${index})" class="text-red-500 hover:text-red-700">
          <i data-lucide="trash-2" class="h-4 w-4"></i>
        </button>
      </div>
    `;

    cartItemsEl.appendChild(div);
  });

  const deliveryCost = getDeliveryCost(totalWeight);
  const grandTotal = subtotal + deliveryCost;

  cartSummaryEl.innerHTML = `
    <div class="space-y-2 text-sm">
      <div class="flex justify-between"><span>Subtotal</span><span>${fmtMoney(subtotal)}</span></div>
      <div class="flex justify-between"><span>Delivery</span><span>${fmtMoney(deliveryCost)}</span></div>
      <div class="flex justify-between"><span>Deliver To</span><span>${DISTRICT || "Not selected"}</span></div>
      <div class="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span>${fmtMoney(grandTotal)}</span></div>
    </div>
    <button class="w-full mt-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white py-3 rounded-xl font-semibold shadow hover:opacity-90 transition">
      Proceed to Checkout
    </button>
    <p class="text-[11px] text-neutral-500 mt-2 text-center">
      Payments: bKash • Nagad • Bank • COD | VAT invoice available
    </p>
  `;

  if (cartCountEl) {
    cartCountEl.textContent = CART.reduce((sum, i) => sum + i.qty, 0);
  }
  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

/* ================== CART OPEN/CLOSE ================== */
function openCart() {
  if (!cartSidebarEl || !cartOverlayEl) return;
  cartSidebarEl.classList.remove("translate-x-full");
  cartOverlayEl.classList.remove("hidden");
}
function closeCart() {
  if (!cartSidebarEl || !cartOverlayEl) return;
  cartSidebarEl.classList.add("translate-x-full");
  cartOverlayEl.classList.add("hidden");
}
if (openCartBtnEl) openCartBtnEl.addEventListener("click", openCart);
if (closeCartBtnEl) closeCartBtnEl.addEventListener("click", closeCart);
if (cartOverlayEl) cartOverlayEl.addEventListener("click", closeCart);

/* ================== DISTRICT ================== */
function renderDistricts() {
  if (!districtSelectEl) return;

  districtSelectEl.innerHTML = `
    <option value="" disabled ${DISTRICT === "" ? "selected" : ""}>Deliver to</option>
    ${allDistricts.map((d) =>
      `<option value="${d}" ${d === DISTRICT ? "selected" : ""}>${d}</option>`
    ).join("")}
  `;

  districtSelectEl.addEventListener("change", (e) => {
    DISTRICT = e.target.value;
    localStorage.setItem("bpc-DISTRICTS", DISTRICT);
    renderCart();
  });
}

/* ================== EXPOSED (for inline handlers) ================== */
window.setCategory = setCategory;
window.addToCart = addToCart;
window.updateQty = updateQty;
window.updateBrand = updateBrand;
window.removeFromCart = removeFromCart;
window.openCart = openCart;
window.closeCart = closeCart;
