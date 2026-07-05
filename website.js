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

// --- Product Details Modal (create once) ---
const modal = document.createElement("div");
modal.id = "productModal";
modal.style.display = "none";
modal.style.position = "fixed";
modal.style.top = "0";
modal.style.left = "0";
modal.style.width = "100%";
modal.style.height = "100%";
modal.style.background = "rgba(0,0,0,0.6)";
modal.style.zIndex = "1000";
modal.innerHTML = `
  <div id="modalContent" style="background:#fff; margin:5% auto; padding:20px; width:80%; max-width:600px; border-radius:10px; position:relative;">
    <span id="modalClose" style="position:absolute; top:10px; right:15px; cursor:pointer; font-size:22px;">&times;</span>
    <div id="modalBody"></div>
  </div>
`;
document.body.appendChild(modal);

// Close modal function
document.getElementById("modalClose").onclick = () => {
  modal.style.display = "none";
};

// Close if clicked outside
window.onclick = (e) => {
  if (e.target === modal) modal.style.display = "none";
};

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
    productListEl.innerHTML = `<p class="text-neutral-500 col-span-full text-center py-10">No products found. Try a different search or category.</p>`;
    return;
  }

  // --- Step 1: Render cards with a data attribute ---
  productListEl.innerHTML = filtered.map((p) => {
    const minPrice = getMinPrice(p);
    const brands = getBrandObjects(p);
    const brandBadge = brands.length
      ? `<span class="inline-block text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 mt-2">${brands.length} brand${brands.length>1?'s':''} available</span>`
      : "";

    return `
      <div class="product-card group relative bg-white rounded-2xl overflow-hidden border border-neutral-200/80 shadow-sm hover:shadow-[0_24px_48px_-16px_rgba(10,22,40,.35)] cursor-pointer"
           data-id="${p.id}">
        <div class="overflow-hidden">
          <img src="${p.image}" alt="${p.name}" class="w-full h-44 object-cover group-hover:scale-105 transition duration-500">
        </div>
        <div class="p-4">
          <h3 class="text-lg font-semibold leading-snug">${p.name}</h3>
          <p class="text-xs text-neutral-500 mt-0.5">${p.origin || ""}</p>
          <p class="mt-2 text-lg font-bold text-emerald-600" style="font-family:Archivo,ui-sans-serif,sans-serif">From ${fmtMoney(minPrice)}</p>
          <div class="flex gap-3 text-xs text-neutral-500 mt-1">
            <span>Unit: ${p.unit || "-"}</span>
            <span>Weight: ${p.weight} kg</span>
          </div>
          ${brandBadge}
          <button onclick="addToCart('${p.id}')"
            class="mt-3 w-full bg-gradient-to-r from-emerald-600 to-green-500 text-white py-2.5 rounded-xl font-semibold shadow hover:opacity-90 transition">
            Add to Cart
          </button>
        </div>
      </div>`;
  }).join("");

  // --- Step 2: Attach click listeners after rendering ---
  document.querySelectorAll(".product-card").forEach(card => {
    const id = card.dataset.id;
    const product = products.find(p => p.id === id);
    card.addEventListener("click", (e) => {
      // avoid conflict when clicking "Add to Cart"
      if (e.target.tagName.toLowerCase() === "button") return;
      showProductDetails(product);
    });
  });
}

function showProductDetails(product) {
  const body = document.getElementById("modalBody");
  body.innerHTML = `
    <h4 class="text-lg-700 font-semibold mt-2">${product.name}</h4>
    <img src="${product.image}" alt="${product.name}" style="width:100%; max-height:250px; object-fit:contain; margin:10px 0;">
    <p><strong>Category:</strong> ${product.category}</p>
    <p><strong>Origin:</strong> ${product.origin}</p>
    <p><strong>Quality:</strong> ${product.quality}</p>
    <p><strong>Unit:</strong> ${product.unit}</p>
    <p><strong>Lead Time:</strong> ${product.leadTimeDays} days</p>
    <p><strong>Rating:</strong> ⭐ ${product.rating}</p>
    <p><strong>Weight:</strong> ${product.weight} kg</p>
    <h3 class="text-lg font-semibold mt-2">Available Brands & Prices</h3>
    <ul>
      ${product.brands.map(b => `<li>${b.name}: ${b.price} ৳</li>`).join("")}
    </ul>
  `;
  modal.style.display = "block";
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
      class="px-4 py-1.5 rounded-full border text-sm font-medium transition ${ACTIVE_CATEGORY === cat
        ? "bg-gradient-to-r from-emerald-600 to-green-500 text-white border-transparent shadow"
        : "bg-white text-neutral-600 border-neutral-200 hover:border-emerald-300 hover:text-emerald-700"}"
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
      <div class="flex justify-between"><span>Delivery Cost</span><span>${fmtMoney(deliveryCost)}</span></div>
      <div class="flex justify-between"><span>Deliver To</span><span>${DISTRICT || "Not selected"}</span></div>
      <div class="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span>${fmtMoney(grandTotal)}</span></div>
    </div>
    <button onclick="openCheckout()" class="w-full mt-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white py-3 rounded-xl font-semibold shadow hover:opacity-90 transition">
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


/* ================== CHECKOUT (auto order email) ================== */
const EMAILJS_SERVICE_ID = "service_bpcproc_2025";
const EMAILJS_TEMPLATE_ID = "template_bpcproc_request";

const checkoutModalEl   = document.getElementById("checkout-modal");
const checkoutFormViewEl = document.getElementById("checkout-form-view");
const checkoutSuccessEl = document.getElementById("checkout-success");
const coItemsEl    = document.getElementById("co-items");
const coSubtotalEl = document.getElementById("co-subtotal");
const coDeliveryEl = document.getElementById("co-delivery");
const coTotalEl    = document.getElementById("co-total");
const coDistrictEl = document.getElementById("co-district");
const coFormEl     = document.getElementById("checkoutForm");
const coSubmitBtn  = document.getElementById("coSubmitBtn");
const coBtnTextEl  = document.getElementById("coBtnText");
const coBtnSpinnerEl = document.getElementById("coBtnSpinner");

function notify(msg, type = "success") {
  if (typeof showToast === "function") { showToast(msg, type); return; }
  if (window.Toastify) {
    Toastify({ text: msg, duration: 3000, gravity: "top", position: "right",
      style: { background: type === "success" ? "#059669" : "#dc2626" } }).showToast();
    return;
  }
  alert(msg);
}

function cartTotals() {
  let subtotal = 0, totalWeight = 0;
  CART.forEach(i => {
    subtotal += (i.unitPrice || 0) * i.qty;
    totalWeight += (i.weight || 0) * i.qty;
  });
  const delivery = getDeliveryCost(totalWeight);
  return { subtotal, totalWeight, delivery, total: subtotal + delivery };
}

function refreshCheckoutSummary() {
  if (!coItemsEl) return;
  coItemsEl.innerHTML = CART.map(i => `
    <div class="flex justify-between gap-3">
      <span class="text-neutral-700">${i.name}${i.selectedBrand ? ` <span class="text-neutral-400">(${i.selectedBrand})</span>` : ""} &times; ${i.qty}</span>
      <span class="font-medium whitespace-nowrap">${fmtMoney((i.unitPrice || 0) * i.qty)}</span>
    </div>`).join("");
  const t = cartTotals();
  coSubtotalEl.textContent = fmtMoney(t.subtotal);
  coDeliveryEl.textContent = DISTRICT ? fmtMoney(t.delivery) : "Select district";
  coTotalEl.textContent = fmtMoney(t.total);
}

function openCheckout() {
  if (!checkoutModalEl) return;
  if (CART.length === 0) { notify("Your cart is empty.", "error"); return; }
  coDistrictEl.innerHTML =
    `<option value="" disabled ${DISTRICT === "" ? "selected" : ""}>Delivery District *</option>` +
    allDistricts.map(d => `<option value="${d}" ${d === DISTRICT ? "selected" : ""}>${d}</option>`).join("");
  checkoutFormViewEl.classList.remove("hidden");
  checkoutSuccessEl.classList.add("hidden");
  const coFbOpen = document.getElementById("co-fallback");
  if (coFbOpen) coFbOpen.classList.add("hidden");
  refreshCheckoutSummary();
  checkoutModalEl.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  closeCart();
  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

function closeCheckout() {
  if (!checkoutModalEl) return;
  checkoutModalEl.classList.add("hidden");
  document.body.style.overflow = "";
}

if (coDistrictEl) {
  coDistrictEl.addEventListener("change", (e) => {
    DISTRICT = e.target.value;
    localStorage.setItem("bpc-DISTRICTS", DISTRICT);
    if (districtSelectEl) districtSelectEl.value = DISTRICT;
    renderCart();
    refreshCheckoutSummary();
  });
}

function makeOrderId() {
  const d = new Date();
  const ymd = String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  return "BPC-" + ymd + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function buildOrderMessage(orderId, c) {
  const t = cartTotals();
  const lines = CART.map((i, n) =>
    `${n + 1}. ${i.name}${i.selectedBrand ? " — Brand: " + i.selectedBrand : ""} — ${i.qty} x ${fmtMoney(i.unitPrice || 0)} = ${fmtMoney((i.unitPrice || 0) * i.qty)}`
  );
  return [
    "=== NEW ORDER REQUEST (Website Cart) ===",
    "Order ID: " + orderId,
    "Date: " + new Date().toLocaleString("en-GB"),
    "",
    "--- CUSTOMER ---",
    "Name: " + c.name,
    "Phone: " + c.phone,
    "Email: " + (c.email || "Not provided"),
    "District: " + DISTRICT,
    "Address: " + c.address,
    "",
    "--- ITEMS ---",
    ...lines,
    "",
    "Subtotal: " + fmtMoney(t.subtotal),
    "Delivery (" + DISTRICT + "): " + fmtMoney(t.delivery),
    "TOTAL: " + fmtMoney(t.total),
    "Approx. weight: " + t.totalWeight + " kg",
    "",
    "Payment: NOT PAID — arrange on confirmation call (bKash / Nagad / Bank / COD)",
    c.notes ? "Customer notes: " + c.notes : ""
  ].join("\n");
}

if (coFormEl) {
  coFormEl.addEventListener("submit", function (e) {
    e.preventDefault();
    if (CART.length === 0) { notify("Your cart is empty.", "error"); return; }
    if (!DISTRICT) { notify("Please select your delivery district.", "error"); return; }
    if (!window.emailjs) { notify("Email service failed to load. Please order via WhatsApp.", "error"); return; }

    const customer = {
      name: document.getElementById("coName").value.trim(),
      phone: document.getElementById("coPhone").value.trim(),
      email: document.getElementById("coEmail").value.trim(),
      address: document.getElementById("coAddress").value.trim(),
      notes: document.getElementById("coNotes").value.trim()
    };
    const orderId = makeOrderId();
    const coFbRetry = document.getElementById("co-fallback");
    if (coFbRetry) coFbRetry.classList.add("hidden");

    coBtnTextEl.textContent = "Sending...";
    coBtnSpinnerEl.classList.remove("hidden");
    coSubmitBtn.disabled = true;

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      name: customer.name + " (ORDER " + orderId + ")",
      phone: customer.phone,
      address: DISTRICT + " — " + customer.address,
      email: customer.email || "Not provided",
      message: buildOrderMessage(orderId, customer)
    }).then(function () {
      document.getElementById("co-order-id").textContent = orderId;
      const wa = document.getElementById("co-wa-link");
      if (wa) wa.href = "https://wa.me/8801714736623?text=" +
        encodeURIComponent("Hi BPC, I just sent order " + orderId + " from the website.");
      checkoutFormViewEl.classList.add("hidden");
      checkoutSuccessEl.classList.remove("hidden");
      CART = [];
      saveCart();
      coFormEl.reset();
      notify("Order request sent!", "success");
      if (window.lucide && lucide.createIcons) lucide.createIcons();
    }).catch(function (err) {
      console.error("Order email error:", err);
      notify("Failed to send order. Please try again or WhatsApp us.", "error");
      const coFb = document.getElementById("co-fallback");
      const coFbWa = document.getElementById("co-fallback-wa");
      if (coFb && coFbWa) {
        coFbWa.href = "https://wa.me/8801714736623?text=" +
          encodeURIComponent(buildOrderMessage(orderId, customer));
        coFb.classList.remove("hidden");
      }
    }).finally(function () {
      coBtnTextEl.textContent = "Send Order Request";
      coBtnSpinnerEl.classList.add("hidden");
      coSubmitBtn.disabled = false;
    });
  });
}

document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCheckout(); });

window.openCheckout = openCheckout;
window.closeCheckout = closeCheckout;
