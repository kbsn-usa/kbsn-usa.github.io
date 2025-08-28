/* ================== GLOBAL STATE ================== */
let products = [];
let districtRates = [];

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

  if (Array.isArray(prod.brands) && typeof prod.brands[0] === "object") {
    return prod.brands.map((b) => ({
      name: String(b.name).trim(),
      price: Number(b.price) || basePrice,
    }));
  }

  if (Array.isArray(prod.brands)) {
    return prod.brands.map((x) => ({ name: String(x).trim(), price: basePrice }));
  }

  if (typeof prod.brands === "string") {
    return prod.brands.split(",").map((s) => ({
      name: s.trim(),
      price: basePrice,
    }));
  }

  return [];
}

function getBrandNames(prod) {
  return getBrandObjects(prod).map((b) => b.name);
}

function getPriceForBrand(prod, brandName) {
  const brands = getBrandObjects(prod);
  const found = brands.find((b) => b.name === brandName);
  return found ? found.price : Number(prod.price) || 0;
}

function getMinPrice(prod) {
  const brands = getBrandObjects(prod);
  if (!brands.length) return Number(prod.price) || 0;
  return Math.min(...brands.map((b) => b.price));
}

/* ================== DELIVERY ================== */
function getDeliveryConfigByDistrict(districtName) {
  if (!districtRates || !districtRates.length) {
    return { name: "", minCost: 0, perKgRate: 0 };
  }
  const found = districtRates.find((d) => d.name === districtName);
  return found || { name: districtName, minCost: 0, perKgRate: 0 };
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
    const brandNames = getBrandNames(p).join(" ").toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.origin && p.origin.toLowerCase().includes(q)) ||
      brandNames.includes(q);

    const matchesCategory = ACTIVE_CATEGORY === "all" || p.category === ACTIVE_CATEGORY;
    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    productListEl.innerHTML = `<p class="text-gray-500">No products found.</p>`;
    return;
  }

  productListEl.innerHTML = filtered
    .map(
      (p) => `
      <div class="border rounded-lg p-3 shadow hover:shadow-lg transition bg-white cursor-pointer"
           onclick="openDetailsSheet('${p.id}')">
        <img src="${p.image}" alt="${p.name}" class="w-full h-40 object-cover rounded">
        <h3 class="text-lg font-semibold mt-2">${p.name}</h3>
        <p class="text-sm text-gray-500">${p.origin || ""}</p>
        <p class="text-gray-700 font-bold">From ${fmtMoney(getMinPrice(p))}</p>
        <p class="text-xs text-gray-500">Unit: ${p.unit || "-"}</p>
        <p class="text-xs text-gray-500">Weight: ${p.weight} kg</p>
      </div>`
    )
    .join("");

  if (window.lucide && lucide.createIcons) lucide.createIcons();
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

  categoryFiltersEl.innerHTML = categories
    .map(
      (cat) => `
    <button onclick="setCategory('${cat}')"
      class="px-3 py-1 rounded-full border ${
        ACTIVE_CATEGORY === cat
          ? "bg-black text-white"
          : "bg-white text-gray-600 hover:bg-gray-100"
      }">
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

/* ================== CART ================== */
function addToCart(id, brandName = null, qty = 1) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  const brandObjs = getBrandObjects(product);
  const defaultBrandName = brandName ?? (brandObjs[0]?.name || "");
  const defaultUnitPrice =
    brandName != null
      ? getPriceForBrand(product, brandName)
      : brandObjs[0]?.price ?? Number(product.price) || 0;

  const existingIndex = CART.findIndex(
    (i) => i.id === id && i.selectedBrand === defaultBrandName
  );

  if (existingIndex > -1) {
    CART[existingIndex].qty += Math.max(1, Number(qty) || 1);
  } else {
    CART.push({
      id: product.id,
      name: product.name,
      image: product.image,
      unit: product.unit,
      weight: product.weight,
      qty: Math.max(1, Number(qty) || 1),
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
  const prod = products.find((p) => p.id === CART[index].id);
  const newPrice = getPriceForBrand(prod, brandName);
  CART[index].selectedBrand = brandName;
  CART[index].unitPrice = newPrice;
  saveCart();
}

function saveCart() {
  localStorage.setItem("bpc-CART", JSON.stringify(CART));
  renderCart();
}

/* ================== DETAILS SHEET ================== */
function openDetailsSheet(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product || !detailsSheetEl) return;

  const brandObjs = getBrandObjects(product);

  detailsSheetEl.innerHTML = `
    <button onclick="closeDetailsSheet()" class="mb-4 text-gray-500 hover:text-gray-800">
      <i data-lucide="x" class="w-6 h-6"></i>
    </button>
    <img src="${product.image}" alt="${product.name}" class="w-full h-64 object-cover rounded-lg mb-4">
    <h2 class="text-2xl font-bold mb-1">${product.name}</h2>
    <p class="text-sm text-gray-500 mb-2">${product.origin || ""}</p>
    <p class="text-gray-700 mb-1">Category: ${product.category}</p>
    <p class="text-gray-700 mb-1">Quality: ${product.quality}</p>
    <p class="text-gray-700 mb-1">Unit: ${product.unit}</p>
    <p class="text-gray-700 mb-1">Weight: ${product.weight} kg</p>
    <p class="text-gray-700 mb-4">Rating: ${product.rating ?? "-"}</p>

    <label class="block text-sm font-medium mb-1">Choose Brand</label>
    <select id="detailsBrand" class="w-full border rounded-lg px-3 py-2 mb-4">
      ${brandObjs
        .map((b) => `<option value="${b.name}">${b.name} — ${fmtMoney(b.price)}</option>`)
        .join("")}
    </select>

    <div class="flex items-center gap-3 mb-4">
      <label class="text-sm font-medium">Qty:</label>
      <input id="detailsQty" type="number" value="1" min="1" class="w-20 border rounded px-2 py-1">
    </div>

    <button onclick="addFromDetails('${product.id}')"
      class="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800">
      Add to Cart
    </button>
  `;

  detailsSheetEl.classList.remove("hidden");
  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

function closeDetailsSheet() {
  if (detailsSheetEl) detailsSheetEl.classList.add("hidden");
}

function addFromDetails(productId) {
  const brandSel = document.getElementById("detailsBrand");
  const qtyEl = document.getElementById("detailsQty");
  const brand = brandSel ? brandSel.value : null;
  const qty = qtyEl ? parseInt(qtyEl.value) || 1 : 1;
  addToCart(productId, brand, qty);
  closeDetailsSheet();
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
          <input type="number" min="1" value="${item.qty}"
            onchange="updateQty(${index}, parseInt(this.value) || 1)"
            class="w-14 border rounded text-center text-sm" />
          <button onclick="updateQty(${index}, ${item.qty + 1})" class="px-2 py-1 bg-neutral-200 rounded">+</button>
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

  const deliveryCfg = getDeliveryConfigByDistrict(DISTRICT || "");
  const deliveryCost = getDeliveryCost(totalWeight);
  const grandTotal = subtotal + deliveryCost;

  cartSummaryEl.innerHTML = `
    <div class="space-y-2 text-sm">
      <div class="flex justify-between"><span>Subtotal</span><span>${fmtMoney(subtotal)}</span></div>
      <div class="flex justify-between">
        <span>Delivery (${DISTRICT || "Select district"})</span>
        <span>${fmtMoney(deliveryCost)}</span>
      </div>
      <div class="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span>${fmtMoney(grandTotal)}</span></div>
    </div>
    <button class="w-full mt-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white py-3 rounded-xl font-semibold shadow hover:opacity-90 transition">
      Proceed to Checkout
    </button>
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

/* ================== DISTRICT SELECT ================== */
function renderDistricts() {
  if (!districtSelectEl) return;
  const names = (districtRates || []).map((d) => d.name);

  districtSelectEl.innerHTML = `
    <option value="" disabled ${DISTRICT === "" ? "selected" : ""}>Deliver to</option>
    ${names
      .map((d) => `<option value="${d}" ${d === DISTRICT ? "selected" : ""}>${d}</option>`)
      .join("")}
  `;

  districtSelectEl.addEventListener("change", (e) => {
    DISTRICT = e.target.value;
    localStorage.setItem("bpc-DISTRICTS", DISTRICT);
    renderCart();
  });
}

/* ================== CATEGORY INIT ================== */
function initCategoryIfMissing() {
  if (!products.some((p) => p.category === ACTIVE_CATEGORY)) {
    ACTIVE_CATEGORY = "all";
  }
}

/* ================== EXPOSED ================== */
window.setCategory = setCategory;
window.addToCart = addToCart;
window.updateQty = updateQty;
window.removeFromCart = removeFromCart;
window.openDetailsSheet = openDetailsSheet;
window.closeDetailsSheet = closeDetailsSheet;
window.addFromDetails = addFromDetails;
