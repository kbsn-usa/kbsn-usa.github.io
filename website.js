// --- Data & utils -----------------------------------------------------------
const CATEGORIES = [
  { key: "bricks", label: "Bricks" },
  { key: "rod", label: "Rod (Rebar)" },
  { key: "cement", label: "Cement" },
  { key: "tiles", label: "Tiles" },
  { key: "sanitary", label: "Sanitary" },
  { key: "cables", label: "Electrical Cables" },
  { key: "paint", label: "Paints" },
  { key: "tools", label: "Tools" },
];

const DISTRICTS = [
  "Dhaka","Chattogram","Gazipur","Narayanganj","Cumilla",
  "Rajshahi","Khulna","Sylhet","Barishal","Rangpur",
];

let PRODUCTS = []; // products will load here dynamically

async function loadProducts() {
  try {
    const res = await fetch("data/products.json");
    PRODUCTS = await res.json();
  } catch (err) {
    console.error("Failed to load products:", err);
  }
}

function formatBDT(n) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(n);
}

function estimateDeliveryCost(district, weightKg) {
  const base = 150;
  const distanceFactor = {
    Dhaka: 1, Gazipur: 1.1, Narayanganj: 1.1, Cumilla: 1.3, Chattogram: 1.6,
    Rajshahi: 1.5, Khulna: 1.5, Sylhet: 1.6, Barishal: 1.4, Rangpur: 1.7,
  };
  const d = distanceFactor[district] ?? 1.5;
  const perKg = 8;
  return Math.round(base * d + weightKg * perKg);
}

function leadTimeLabel(days) {
  if (days <= 1) return "Tomorrow";
  if (days === 2) return "In 2 days";
  return `${days} days`;
}

// --- State ------------------------------------------------------------------
let query = "";
let category = null; // key or null
let district = "Dhaka";
let selectedProduct = null;

// --- DOM refs ---------------------------------------------------------------
const pillsEl = document.getElementById("categoryPills");
const gridEl = document.getElementById("productsGrid");
const searchEl = document.getElementById("searchInput");
const districtEl = document.getElementById("districtSelect");
const cartCountEl = document.getElementById("cartCount");

const detailsSheet = document.getElementById("detailsSheet");
const closeDetailsBtn = document.getElementById("closeDetailsBtn");
const detailsTitle = document.getElementById("detailsTitle");
const detailsImage = document.getElementById("detailsImage");
const detailsPrice = document.getElementById("detailsPrice");
const detailsUnit = document.getElementById("detailsUnit");
const detailsLead = document.getElementById("detailsLead");
const detailsOrigin = document.getElementById("detailsOrigin");
const detailsQuality = document.getElementById("detailsQuality");
const detailsEstimator = document.getElementById("detailsEstimator");

const cartDrawer = document.getElementById("cartDrawer");
const closeCartBtn = document.getElementById("closeCartBtn");
const openCartBtn = document.getElementById("openCartBtn");
const cartItemsEl = document.getElementById("cartItems");
const cartSubtotalEl = document.getElementById("cartSubtotal");

// --- Init UI ----------------------------------------------------------------
function renderDistricts() {
  districtEl.innerHTML = DISTRICTS.map(
    d => `<option value="${d}">${d}</option>`
  ).join("");
  districtEl.value = district;
}

function renderPills() {
  const allActive = category === null;
  const pill = (key, label, active) => `
    <button data-cat="${key ?? ""}"
      class="px-3 py-1 text-sm rounded-full border ${active ? 'bg-black text-white border-black' : 'bg-neutral-100'}">
      ${label}
    </button>
  `;
  const first = pill("", "All", allActive);
  const rest = CATEGORIES.map(c => pill(c.key, c.label, category === c.key)).join("");
  pillsEl.innerHTML = first + rest;

  // Events
  pillsEl.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-cat");
      category = key ? key : null;
      renderPills(); // refresh active styles
    });
  });
}

function matches(p) {
  const catOk = !category || p.category === category;
  const q = query.trim().toLowerCase();
  const qOk =
    !q ||
    p.name.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q);
  return catOk && qOk;
}

function stars(rating) {
  const filled = Math.round(rating);
  return Array.from({ length: 5 })
    .map((_, i) =>
      `<i data-lucide="star" class="w-4 h-4 ${i < filled ? 'fill-current text-amber-600' : 'text-amber-600'}"></i>`
    )
    .join("");
}

function productCard(p) {
  return `
  <div class="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow">
    <div class="h-36 w-full bg-cover bg-center cursor-pointer"
         style="background-image:url('${p.image}')"
         data-open-details="${p.id}"></div>
    <div class="p-4 space-y-2">
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="font-medium leading-tight line-clamp-2">${p.name}</div>
          <div class="text-xs text-neutral-500">${p.brand}</div>
        </div>
        <span class="badge badge-emerald">${p.quality}</span>
      </div>
      <div class="flex items-center gap-1 text-amber-600">
        ${stars(p.rating)} <span class="text-xs ml-1 text-neutral-500">${p.rating.toFixed(1)}</span>
      </div>
      <div class="flex items-center justify-between">
        <div>
          <div class="text-lg font-semibold">${formatBDT(p.price)}</div>
          <div class="text-xs text-neutral-500">${p.unit}</div>
        </div>
        <div class="text-xs text-neutral-600 flex items-center gap-1">
          <i data-lucide="truck" class="h-4 w-4"></i> ${leadTimeLabel(p.leadTimeDays)}
        </div>
      </div>
      <div class="flex gap-2 pt-1">
        <button class="flex-1 bg-black text-white rounded-lg px-3 py-2 h-10 flex items-center justify-center gap-2"
                data-add="${p.id}">
          <i data-lucide="shopping-cart" class="h-4 w-4"></i> Add
        </button>
        <button class="border rounded-lg px-3 py-2 h-10 flex items-center justify-center gap-2"
                data-open-details="${p.id}">
          <i data-lucide="info" class="h-4 w-4"></i> Details
        </button>
      </div>
    </div>
  </div>`;
}

// ✅ Cart (persistent with localStorage)
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// ✅ Utility Functions
function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// ✅ Render Products
function renderProducts() {
  const grid = document.getElementById("productsGrid");
  grid.innerHTML = "";

  PRODUCTS.filter(matches).forEach(product => {
    const card = document.createElement("div");
    card.className = "bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition cursor-pointer";
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}" 
        loading="lazy" class="w-full h-40 object-cover">
      <div class="p-4 space-y-2">
        <h3 class="font-semibold text-lg">${product.name}</h3>
        <p class="text-black font-bold">${formatBDT(product.price)} <span class="text-sm font-normal text-neutral-500">/${product.unit}</span></p>
        <button class="bg-black text-white px-4 py-2 rounded-lg text-sm w-full hover:bg-neutral-800">Add to Cart</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", () => addToCart(product));
    card.querySelector("img").addEventListener("click", () => openDetails(product));
    grid.appendChild(card);
  });
}

  // hook buttons
  gridEl.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-add");
      const p = PRODUCTS.find(x => x.id === id);
      addToCart(p);
      openCart();
      lucide.createIcons();
    });
  });
  gridEl.querySelectorAll("[data-open-details]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-open-details");
      const p = PRODUCTS.find(x => x.id === id);
      openDetails(p);
      lucide.createIcons();
    });
  });

  lucide.createIcons();
}

function renderEstimator(mountEl, defaultDistrict = "Dhaka", defaultWeight = 1000) {
  mountEl.innerHTML = `
    <div class="border rounded-2xl bg-white">
      <div class="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div class="col-span-2">
          <label class="text-xs text-neutral-600">Delivery District</label>
          <select class="h-11 w-full border rounded-lg px-3" id="estDistrict">
            ${DISTRICTS.map(d => `<option value="${d}">${d}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="text-xs text-neutral-600">Estimated Weight (kg)</label>
          <input type="number" id="estWeight" class="h-11 w-full border rounded-lg px-3" min="1" />
        </div>
        <div>
          <div class="text-xs text-neutral-600">Approx. Delivery Cost</div>
          <div class="text-2xl font-bold" id="estCost"></div>
          <div class="text-xs text-neutral-500">Time: 1–3 days</div>
        </div>
      </div>
    </div>
  `;
  const estD = mountEl.querySelector("#estDistrict");
  const estW = mountEl.querySelector("#estWeight");
  const estC = mountEl.querySelector("#estCost");
  estD.value = defaultDistrict;
  estW.value = String(defaultWeight);
  const update = () => {
    estC.textContent = formatBDT(estimateDeliveryCost(estD.value, parseInt(estW.value || "0")));
  };
  estD.addEventListener("change", update);
  estW.addEventListener("input", update);
  update();
}

// ✅ Product Details Modal
function openDetails(product) {
  const sheet = document.getElementById("detailsSheet");
  document.getElementById("detailsImage").style.backgroundImage = `url(${product.image})`;
  document.getElementById("detailsTitle").textContent = product.name;
  document.getElementById("detailsPrice").textContent = formatBDT(product.price);
  document.getElementById("detailsUnit").textContent = `Unit: ${product.unit}`;
  document.getElementById("detailsLead").textContent = `Lead Time: ${leadTimeLabel(product.leadTimeDays)}`;
  document.getElementById("detailsOrigin").textContent = `Origin: ${product.origin}`;
  document.getElementById("detailsQuality").textContent = `Quality: ${product.quality}`;

  sheet.classList.remove("hidden");
  sheet.focus();
}

function closeDetails() {
  document.getElementById("detailsSheet").classList.add("hidden");
}

// ✅ Cart Handling
function renderCart() {
  const itemsContainer = document.getElementById("cartItems");
  const subtotalEl = document.getElementById("cartSubtotal");
  const countEl = document.getElementById("cartCount");

  itemsContainer.innerHTML = "";

  let subtotal = 0;

  cart.forEach(item => {
    subtotal += item.price * item.qty;
    const itemEl = document.createElement("div");
    itemEl.className = "flex justify-between items-center border-b pb-2";
    itemEl.innerHTML = `
      <div>
        <p class="font-medium">${item.name}</p>
        <p class="text-sm text-neutral-500">${item.qty} × ${formatBDT(item.price)}</p>
      </div>
      <button aria-label="Remove ${item.name}">
        <i data-lucide="trash-2" class="h-5 w-5 text-red-500"></i>
      </button>
    `;
    itemEl.querySelector("button").addEventListener("click", () => removeFromCart(item.id));
    itemsContainer.appendChild(itemEl);
  });

  subtotalEl.textContent = formatBDT(subtotal);
  countEl.textContent = cart.length;

  saveCart();
  lucide.createIcons(); // refresh icons
}

function addToCart(product) {
  const existing = cart.find(p => p.id === product.id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  renderCart();
}

function openCart() {
  cartDrawer.classList.remove("hidden");
  cartDrawer.classList.add("sheet-open");
}
function closeCart() {
  cartDrawer.classList.add("hidden");
  cartDrawer.classList.remove("sheet-open");
}

// --- Wiring -----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Search
  searchEl.addEventListener("input", (e) => {
    query = e.target.value || "";
  });

  // District
  renderDistricts();
  districtEl.addEventListener("change", (e) => {
    district = e.target.value;
  });

  // Pills
  renderPills();

  // Load products dynamically
  loadProducts();

  // Hero estimator
  const heroMount = document.getElementById("deliveryEstimatorMount");
  renderEstimator(heroMount, district, 1000);

  // Details & cart controls
  closeDetailsBtn.addEventListener("click", closeDetails);
  openCartBtn.addEventListener("click", openCart);
  closeCartBtn.addEventListener("click", closeCart);

  // Quotation form (demo)
  const quoteForm = document.getElementById("quoteForm");
  quoteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Thanks! We will contact you shortly.");
    quoteForm.reset();
  });

  // ✅ Initialize
renderProducts();
renderCart();
  lucide.createIcons();
});
