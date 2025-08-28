/* ================== GLOBAL STATE ================== */
let products = [];
let districtRates = [];

let CART = JSON.parse(localStorage.getItem("bpc-CART")) || [];
let DISTRICT = localStorage.getItem("bpc-DISTRICTS") || "";
let SEARCH_QUERY = "";
let ACTIVE_CATEGORY = "all";
let selectedProduct = null;

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
const detailsSheetEl = document.getElementById("detailsSheet");

/* ================== INIT ================== */
async function init() {
  try {
    const [prodRes, distRes] = await Promise.all([
      fetch("data/products.json"),
      fetch("data/districts.json"),
    ]);
    products = await prodRes.json();
    districtRates = await distRes.json();

    renderDistricts();
    initCategoryIfMissing();
    renderCategories();
    renderProducts();
    renderCart();
  } catch (err) {
    console.error("Error loading data:", err);
  }
}
init();

/* ================== UTILITIES ================== */
function fmtMoney(n) {
  const num = Number(n);
  if (!isFinite(num)) return "৳" + n;
  return "৳" + num.toLocaleString();
}

function getBrandObjects(prod) {
  if (!prod || prod.brands == null) return [];
  const basePrice = Number(prod.price) || 0;

  if (Array.isArray(prod.brands) && prod.brands.length && typeof prod.brands[0] === "object") {
    return prod.brands
      .filter((b) => b && typeof b.name === "string")
      .map((b) => ({ name: String(b.name).trim(), price: Number(b.price) || basePrice }))
      .filter((b) => b.name);
  }

  return [];
}

function getPriceForBrand(prod, brandName) {
  const brands = getBrandObjects(prod);
  const found = brands.find((b) => b.name === brandName);
  return found ? Number(found.price) || 0 : Number(prod.price) || 0;
}

function getMinPrice(prod) {
  const brands = getBrandObjects(prod);
  if (brands.length === 0) return Number(prod.price) || 0;
  return Math.min(...brands.map((b) => Number(b.price) || Infinity));
}

/* ================== DELIVERY ================== */
function getDeliveryConfigByDistrict(districtName) {
  if (!districtRates || !districtRates.length) return { name: "", minCost: 0, perKgRate: 0 };
  return districtRates.find((d) => d.name === districtName) || { name: districtName, minCost: 0, perKgRate: 0 };
}

function getDeliveryCost(totalWeight) {
  const { minCost, perKgRate } = getDeliveryConfigByDistrict(DISTRICT || "");
  const calc = (Number(totalWeight) || 0) * (Number(perKgRate) || 0);
  return Math.max(calc, Number(minCost) || 0);
}

/* ================== PRODUCTS ================== */
function renderProducts() {
  if (!productListEl) return;

  const filtered = products.filter((p) => {
    const q = SEARCH_QUERY;
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.origin && p.origin.toLowerCase().includes(q));

    const matchesCategory = ACTIVE_CATEGORY === "all" || p.category === ACTIVE_CATEGORY;
    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    productListEl.innerHTML = `<p class="text-gray-500">No products found.</p>`;
    return;
  }

  productListEl.innerHTML = filtered
    .map((p) => {
      const minPrice = getMinPrice(p);
      return `
        <div class="border rounded-lg p-3 shadow hover:shadow-lg transition bg-white cursor-pointer"
             onclick="openProductDetails('${p.id}')">
          <img src="${p.image}" alt="${p.name}" class="w-full h-40 object-cover rounded">
          <h3 class="text-lg font-semibold mt-2">${p.name}</h3>
          <p class="text-sm text-gray-500">${p.origin || ""}</p>
          <p class="text-gray-700 font-bold">From ${fmtMoney(minPrice)}</p>
          <p class="text-xs text-gray-500">Unit: ${p.unit || "-"}</p>
        </div>`;
    })
    .join("");

  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

/* ================== PRODUCT DETAILS ================== */
function openProductDetails(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product || !detailsSheetEl) return;
  selectedProduct = product;

  const brandOptions = getBrandObjects(product)
    .map((b) => `<option value="${b.name}">${b.name} — ${fmtMoney(b.price)}</option>`)
    .join("");

  detailsSheetEl.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">${product.name}</h2>
      <button onclick="closeProductDetails()" class="p-2 hover:bg-neutral-200 rounded-full">
        <i data-lucide="x" class="h-5 w-5"></i>
      </button>
    </div>
    <img src="${product.image}" alt="${product.name}" class="w-full h-56 object-cover rounded-lg mb-4">
    <p class="text-sm text-gray-600 mb-1"><strong>Category:</strong> ${product.category}</p>
    <p class="text-sm text-gray-600 mb-1"><strong>Origin:</strong> ${product.origin}</p>
    <p class="text-sm text-gray-600 mb-1"><strong>Quality:</strong> ${product.quality}</p>
    <p class="text-sm text-gray-600 mb-1"><strong>Unit:</strong> ${product.unit}</p>
    <p class="text-sm text-gray-600 mb-1"><strong>Rating:</strong> ${product.rating ?? "-"}</p>

    <label class="block mt-3 text-sm">Choose Brand</label>
    <select id="detailsBrand" class="w-full border rounded p-2">${brandOptions}</select>

    <label class="block mt-3 text-sm">Quantity</label>
    <input id="detailsQty" type="number" value="1" min="1" class="w-20 border rounded p-2">

    <p class="mt-4 font-bold text-lg">Price: <span id="detailsPrice">${fmtMoney(getMinPrice(product))}</span></p>

    <button onclick="addDetailsToCart()" 
      class="mt-4 w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800">
      Add to Cart
    </button>
  `;

  detailsSheetEl.classList.remove("hidden");
  if (window.lucide && lucide.createIcons) lucide.createIcons();

  document.getElementById("detailsBrand").addEventListener("change", updateDetailsPrice);
  document.getElementById("detailsQty").addEventListener("input", updateDetailsPrice);
}

function closeProductDetails() {
  if (detailsSheetEl) detailsSheetEl.classList.add("hidden");
  selectedProduct = null;
}

function updateDetailsPrice() {
  if (!selectedProduct) return;
  const brand = document.getElementById("detailsBrand").value;
  const qty = Math.max(1, parseInt(document.getElementById("detailsQty").value) || 1);
  const unitPrice = getPriceForBrand(selectedProduct, brand);
  document.getElementById("detailsPrice").textContent = fmtMoney(unitPrice * qty);
}

function addDetailsToCart() {
  if (!selectedProduct) return;
  const brand = document.getElementById("detailsBrand").value;
  const qty = Math.max(1, parseInt(document.getElementById("detailsQty").value) || 1);
  addToCart(selectedProduct.id, brand, qty);
  closeProductDetails();
}

/* ================== CART ================== */
function addToCart(id, brandName = null, qty = 1) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  const brandObjs = getBrandObjects(product);
  const defaultBrandName = brandName ?? (brandObjs[0]?.name || "");
  const defaultUnitPrice = getPriceForBrand(product, defaultBrandName);

  const existingIndex = CART.findIndex((i) => i.id === id && i.selectedBrand === defaultBrandName);
  if (existingIndex > -1) {
    CART[existingIndex].qty += qty;
  } else {
    CART.push({
      id: product.id,
      name: product.name,
      image: product.image,
      unit: product.unit,
      weight: product.weight,
      qty,
      selectedBrand: defaultBrandName,
      unitPrice: defaultUnitPrice,
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
  if (qty <= 0) return removeFromCart(index);
  CART[index].qty = qty;
  saveCart();
}

function updateBrand(index, brandName) {
  if (!CART[index]) return;
  const prod = products.find((p) => p.id === CART[index].id);
  CART[index].selectedBrand = brandName;
  CART[index].unitPrice = getPriceForBrand(prod, brandName);
  saveCart();
}

function saveCart() {
  localStorage.setItem("bpc-CART", JSON.stringify(CART));
  renderCart();
}

function renderCart() {
  if (!cartItemsEl) return;
  cartItemsEl.innerHTML = "";

  if (CART.length === 0) {
    emptyCartEl.classList.remove("hidden");
    cartSummaryEl.classList.add("hidden");
    cartCountEl.textContent = "0";
    return;
  }

  emptyCartEl.classList.add("hidden");
  cartSummaryEl.classList.remove("hidden");

  let subtotal = 0;
  let totalWeight = 0;

  CART.forEach((item, index) => {
    subtotal += (item.unitPrice || 0) * item.qty;
    totalWeight += (item.weight || 0) * item.qty;

    const div = document.createElement("div");
    div.className = "flex items-center gap-4 p-3 border rounded-xl bg-white shadow-sm mb-2";

    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="h-14 w-14 rounded-lg object-cover border" />
      <div class="flex-1">
        <h4 class="font-medium text-sm">${item.name}</h4>
        <p class="text-xs text-neutral-500">${fmtMoney(item.unitPrice)} per ${item.unit}</p>
        <div class="flex items-center gap-2 mt-2">
          <button onclick="updateQty(${index}, ${item.qty - 1})" class="px-2 py-1 bg-neutral-200 rounded">–</button>
          <input type="number" min="1" value="${item.qty}" onchange="updateQty(${index}, parseInt(this.value)||1)" class="w-14 border rounded text-center text-sm" />
          <button onclick="updateQty(${index}, ${item.qty + 1})" class="px-2 py-1 bg-neutral-200 rounded">+</button>
        </div>
      </div>
      <div class="flex flex-col items-end gap-2">
        <span class="font-semibold">${fmtMoney(item.unitPrice * item.qty)}</span>
        <button onclick="removeFromCart(${index})" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
      </div>
    `;
    cartItemsEl.appendChild(div);
  });

  const deliveryCfg = getDeliveryConfigByDistrict(DISTRICT || "");
  const deliveryCost = getDeliveryCost(totalWeight);
  const grandTotal = subtotal + deliveryCost;

  cartSummaryEl.innerHTML = `
    <div class="space-y-2 text-sm">
      <div class="flex justify-between"><span>Subtotal</span><span>${fmtMoney(subtotal)}</span></div>
      <div class="flex justify-between"><span>Delivery (${DISTRICT || "Select district"})</span><span>${fmtMoney(deliveryCost)}</span></div>
      <div class="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span>${fmtMoney(grandTotal)}</span></div>
    </div>
    <button class="w-full mt-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white py-3 rounded-xl font-semibold shadow">Proceed to Checkout</button>
  `;

  cartCountEl.textContent = CART.reduce((sum, i) => sum + i.qty, 0);
  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

/* ================== CART OPEN/CLOSE ================== */
function openCart() {
  cartSidebarEl.classList.remove("translate-x-full");
  cartOverlayEl.classList.remove("hidden");
}
function closeCart() {
  cartSidebarEl.classList.add("translate-x-full");
  cartOverlayEl.classList.add("hidden");
}
openCartBtnEl?.addEventListener("click", openCart);
closeCartBtnEl?.addEventListener("click", closeCart);
cartOverlayEl?.addEventListener("click", closeCart);

/* ================== DISTRICT SELECT ================== */
function renderDistricts() {
  if (!districtSelectEl) return;
  const names = (districtRates || []).map((d) => d.name);

  districtSelectEl.innerHTML = `
    <option value="" disabled ${DISTRICT === "" ? "selected" : ""}>Deliver to</option>
    ${names.map((d) => `<option value="${d}" ${d === DISTRICT ? "selected" : ""}>${d}</option>`).join("")}
  `;

  districtSelectEl.addEventListener("change", (e) => {
    DISTRICT = e.target.value;
    localStorage.setItem("bpc-DISTRICTS", DISTRICT);
    renderCart();
  });
}

/* ================== CATEGORY ================== */
function renderCategories() {
  if (!categoryFiltersEl) return;
  const categories = ["all", ...new Set(products.map((p) => p.category))];

  categoryFiltersEl.innerHTML = categories
    .map(
      (cat) => `
      <button onclick="setCategory('${cat}')" class="px-3 py-1 rounded-full border ${
        ACTIVE_CATEGORY === cat ? "bg-black text-white" : "bg-white text-gray-600"
      }">${cat}</button>
    `
    )
    .join("");
}
function setCategory(cat) {
  ACTIVE_CATEGORY = cat;
  renderCategories();
  renderProducts();
}
function initCategoryIfMissing() {
  if (!products.some((p) => p.category === ACTIVE_CATEGORY)) {
    ACTIVE_CATEGORY = "all";
  }
}

/* ================== SEARCH ================== */
searchInputEl?.addEventListener("input", (e) => {
  SEARCH_QUERY = e.target.value.trim().toLowerCase();
  renderProducts();
});

/* ================== EXPOSED ================== */
window.setCategory = setCategory;
window.addToCart = addToCart;
window.updateQty = updateQty;
window.updateBrand = updateBrand;
window.removeFromCart = removeFromCart;
window.openProductDetails = openProductDetails;
window.closeProductDetails = closeProductDetails;
