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
          
/* ================== INIT ================== */          
async function init() {          
  try {          
    const [prodRes, distRes] = await Promise.all([          
      fetch("https://github.com/kbsn-usa/kbsn-usa.github.io/blob/main/data/products.json"),          
      fetch("https://github.com/kbsn-usa/kbsn-usa.github.io/blob/main/data/districts.json"),          
    ]);          
    products = await prodRes.json();          
    districtRates = await distRes.json();          
          
    renderDistricts();          
    initCategoryIfMissing();          
    renderCategories();          
    renderProducts();          
    renderCart();          
    wireModalStaticHandlers();          
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
          
  // Already objects          
  if (Array.isArray(prod.brands) && prod.brands.length && typeof prod.brands[0] === "object") {          
    return prod.brands          
      .filter((b) => b && typeof b.name === "string")          
      .map((b) => ({ name: String(b.name).trim(), price: Number(b.price) || basePrice }))          
      .filter((b) => b.name);          
  }          
          
  // Array of names          
  if (Array.isArray(prod.brands)) {          
    return prod.brands          
      .map((x) => String(x).trim())          
      .filter(Boolean)          
      .map((name) => ({ name, price: basePrice }));          
  }          
          
  // Comma-separated string          
  if (typeof prod.brands === "string") {          
    return prod.brands          
      .split(",")          
      .map((s) => s.trim())          
      .filter(Boolean)          
      .map((name) => ({ name, price: basePrice }));          
  }          
          
  return [];          
}          
          
function getBrandNames(prod) {          
  return getBrandObjects(prod).map((b) => b.name);          
}          
          
function getPriceForBrand(prod, brandName) {          
  const brands = getBrandObjects(prod);          
  const found = brands.find((b) => b.name === brandName);          
  if (found) return Number(found.price) || 0;          
  return Number(prod.price) || 0; // fallback          
}          
          
function getMinPrice(prod) {          
  const brands = getBrandObjects(prod);          
  if (brands.length === 0) return Number(prod.price) || 0;          
  return Math.min(...brands.map((b) => Number(b.price) || Infinity));          
}          
          
/* ================== DELIVERY (districts.json) ================== */          
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
      (p.brand && p.brand.toLowerCase().includes(q)) ||          
      brandNames.includes(q);          
          
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
      const brands = getBrandObjects(p);          
      const brandBadge = brands.length          
        ? `<span class="inline-block text-[11px] text-neutral-600 bg-neutral-100 border rounded px-2 py-0.5 mt-1">${brands.length} brand${          
            brands.length > 1 ? "s" : ""          
          }</span>`          
        : "";          
          
      // Card is clickable to open modal; button does quick add (and stops propagation)          
      return `          
      <div class="border rounded-lg p-3 shadow hover:shadow-lg transition bg-white cursor-pointer"          
           onclick="openProductModal('${p.id}')">          
        <img src="${p.image}" alt="${p.name}" class="w-full h-40 object-cover rounded">          
        <h3 class="text-lg font-semibold mt-2">${p.name}</h3>          
        <p class="text-sm text-gray-500">${p.origin || ""}</p>          
        <p class="text-gray-700 font-bold">From ${fmtMoney(minPrice)}</p>          
        <p class="text-xs text-gray-500">Unit: ${p.unit || "-"}</p>          
        <p class="text-xs text-gray-500">Weight: ${p.weight} kg</p>          
        ${brandBadge}          
        <button onclick="event.stopPropagation(); addToCart('${p.id}')"          
          class="mt-3 w-full bg-black text-white py-2 rounded hover:bg-gray-800">          
          Add to Cart          
        </button>          
      </div>`;          
    })          
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
    <button          
      onclick="setCategory('${cat}')"          
      class="px-3 py-1 rounded-full border ${          
        ACTIVE_CATEGORY === cat ? "bg-black text-white" : "bg-white text-gray-600 hover:bg-gray-100"          
      }"          
    >          
      ${cat.charAt(0).toUpperCase() + cat.slice(1)}          
    </button>          
  `          
    )          
    .join("");          
}          
          
function setCategory(cat) {          
  ACTIVE_CATEGORY = cat;          
  renderCategories();          
  renderProducts();          
}          
          
/* ================== CART ================== */          
// Extended to allow optional brand + qty          
function addToCart(id, brandName = null, qty = 1) {          
  const product = products.find((p) => p.id === id);          
  if (!product) return;          
          
  const brandObjs = getBrandObjects(product);          
  const defaultBrandName = brandName ?? (brandObjs[0]?.name || "");          
  const defaultUnitPrice =          
    brandName != null ? getPriceForBrand(product, brandName) : brandObjs[0]?.price ?? (Number(product.price) || 0);          
          
  // If item already in cart with same product & same brand, bump qty          
  const existingIndex = CART.findIndex((i) => i.id === id && i.selectedBrand === defaultBrandName);          
          
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
          
/* ================== PRODUCT MODAL ================== */          
let selectedProduct = null;          
          
function openProductModal(productId) {          
  const product = products.find((p) => p.id === productId);          
  if (!product) return;          
  selectedProduct = product;          
          
  const m = {          
    modal: document.getElementById("productModal"),          
    image: document.getElementById("modalImage"),          
    name: document.getElementById("modalName"),          
    category: document.getElementById("modalCategory"),          
    origin: document.getElementById("modalOrigin"),          
    quality: document.getElementById("modalQuality"),          
    unit: document.getElementById("modalUnit"),          
    rating: document.getElementById("modalRating"),          
    brand: document.getElementById("modalBrand"),          
    qty: document.getElementById("modalQty"),          
    price: document.getElementById("modalPrice"),          
  };          
          
  if (!m.modal) return; // modal HTML not present          
          
  m.image.src = product.image || "";          
  m.image.alt = product.name || "";          
  m.name.textContent = product.name || "";          
  m.category.textContent = "Category: " + (product.category || "-");          
  m.origin.textContent = "Origin: " + (product.origin || "-");          
  m.quality.textContent = "Quality: " + (product.quality || "-");          
  m.unit.textContent = "Unit: " + (product.unit || "-");          
  m.rating.textContent = "Rating: " + (product.rating ?? "-");          
          
  // Populate brand options from normalized brand objects          
  const brandObjs = getBrandObjects(product);          
  m.brand.innerHTML = "";          
  if (brandObjs.length) {          
    brandObjs.forEach((b) => {          
      const opt = document.createElement("option");          
      opt.value = b.name;          
      opt.textContent = `${b.name} (${fmtMoney(b.price)})`;          
      m.brand.appendChild(opt);          
    });          
  } else {          
    const opt = document.createElement("option");          
    const base = Number(product.price) || 0;          
    opt.value = "";          
    opt.textContent = `Default (${fmtMoney(base)})`;          
    m.brand.appendChild(opt);          
  }          
          
  m.qty.value = 1;          
  updateModalPrice();          
          
  m.modal.classList.remove("hidden");          
}          
          
function wireModalStaticHandlers() {          
  const modal = document.getElementById("productModal");          
  if (!modal) return; // if the modal HTML isn't on this page, skip wiring          
          
  const closeBtn = document.getElementById("closeModal");          
  const minusBtn = document.getElementById("qtyMinus");          
  const plusBtn = document.getElementById("qtyPlus");          
  const qtyInput = document.getElementById("modalQty");          
  const brandSel = document.getElementById("modalBrand");          
  const addBtn = document.getElementById("addToCartFromModal");          
          
  if (closeBtn) {          
    closeBtn.addEventListener("click", () => {          
      const modal = document.getElementById("productModal");          
      if (modal) modal.classList.add("hidden");          
    });          
  }          
  // Close on backdrop click          
  modal.addEventListener("click", (e) => {          
    if (e.target === modal) modal.classList.add("hidden");          
  });          
          
  if (minusBtn) {          
    minusBtn.addEventListener("click", () => {          
      const qtyEl = document.getElementById("modalQty");          
      if (!qtyEl) return;          
      let qty = parseInt(qtyEl.value || "1", 10);          
      if (qty > 1) {          
        qtyEl.value = qty - 1;          
        updateModalPrice();          
      }          
    });          
  }          
  if (plusBtn) {          
    plusBtn.addEventListener("click", () => {          
      const qtyEl = document.getElementById("modalQty");          
      if (!qtyEl) return;          
      let qty = parseInt(qtyEl.value || "1", 10);          
      qtyEl.value = qty + 1;          
      updateModalPrice();          
    });          
  }          
  if (qtyInput) qtyInput.addEventListener("input", updateModalPrice);          
  if (brandSel) brandSel.addEventListener("change", updateModalPrice);          
  if (addBtn) {          
    addBtn.addEventListener("click", () => {          
      if (!selectedProduct) return;          
      const brand = (document.getElementById("modalBrand") || {}).value ?? null;          
      const qty = parseInt((document.getElementById("modalQty") || {}).value || "1", 10);          
      addToCart(selectedProduct.id, brand, qty);          
      const modal = document.getElementById("productModal");          
      if (modal) modal.classList.add("hidden");          
    });          
  }          
}          
          
function updateModalPrice() {          
  if (!selectedProduct) return;          
  const brandSel = document.getElementById("modalBrand");          
  const qtyEl = document.getElementById("modalQty");          
  const priceEl = document.getElementById("modalPrice");          
  if (!brandSel || !qtyEl || !priceEl) return;          
          
  const brand = brandSel.value || null;          
  const qty = Math.max(1, parseInt(qtyEl.value || "1", 10));          
  const unitPrice = brand ? getPriceForBrand(selectedProduct, brand) : Number(selectedProduct.price) || 0;          
  priceEl.textContent = fmtMoney(unitPrice * qty);          
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
    const product = products.find((p) => p.id === item.id) || {};          
    const brandObjs = getBrandObjects(product);          
          
    subtotal += (item.unitPrice || 0) * item.qty;          
    totalWeight += (item.weight || 0) * item.qty;          
          
    const brandSelectHTML = brandObjs.length          
      ? `          
        <label class="text-xs text-neutral-500 mt-2 block">Brand</label>          
        <select onchange="updateBrand(${index}, this.value)"          
          class="w-full border rounded text-sm px-2 py-1">          
          ${brandObjs          
            .map(          
              (b) => `          
            <option value="${b.name}" ${item.selectedBrand === b.name ? "selected" : ""}>          
              ${b.name} — ${fmtMoney(b.price)}          
            </option>          
          `          
            )          
            .join("")}          
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
          
  const deliveryCfg = getDeliveryConfigByDistrict(DISTRICT || "");          
  const deliveryCost = getDeliveryCost(totalWeight);          
  const grandTotal = subtotal + deliveryCost;          
          
  cartSummaryEl.innerHTML = `          
    <div class="space-y-2 text-sm">          
      <div class="flex justify-between"><span>Subtotal</span><span>${fmtMoney(subtotal)}</span></div>          
      <div class="flex justify-between">          
        <span>Delivery (${DISTRICT || "Select district"} — min ${fmtMoney(deliveryCfg.minCost)}, ${deliveryCfg.perKgRate}/kg)</span>          
        <span>${fmtMoney(deliveryCost)}</span>          
      </div>          
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
          
/* ================== DISTRICT SELECT ================== */          
function renderDistricts() {          
  if (!districtSelectEl) return;          
          
  // Build options from districts.json to avoid drift          
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
          
/* ================== CATEGORY INIT (after products load) ================== */          
function initCategoryIfMissing() {          
  if (!products.some((p) => p.category === ACTIVE_CATEGORY)) {          
    ACTIVE_CATEGORY = "all";          
  }          
}          
          
/* ================== EXPOSED (for inline handlers) ================== */          
window.setCategory = setCategory;          
window.addToCart = addToCart;          
window.updateQty = updateQty;          
window.updateBrand = updateBrand;          
window.removeFromCart = removeFromCart;          
window.openCart = openCart;          
window.closeCart = closeCart;          
window.openProductModal = openProductModal;
