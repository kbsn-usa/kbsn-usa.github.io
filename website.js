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

// Products are loaded from /data/products.json
let PRODUCTS = [];

// Currency
function formatBDT(n) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

function estimateDeliveryCost(district, weightKg) {
  const base = 150;
  const distanceFactor = {
    Dhaka: 1, Gazipur: 1.1, Narayanganj: 1.1, Cumilla: 1.3, Chattogram: 1.6,
    Rajshahi: 1.5, Khulna: 1.5, Sylhet: 1.6, Barishal: 1.4, Rangpur: 1.7,
  };
  const d = distanceFactor[district] ?? 1.5;
  const perKg = 8;
  const w = Number.isFinite(+weightKg) && +weightKg > 0 ? +weightKg : 1;
  return Math.round(base * d + w * perKg);
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

// --- Cart (persistent) ------------------------------------------------------
let cart = JSON.parse(localStorage.getItem("cart") || "[]");

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function cartItemCount() {
  return cart.reduce((sum, it) => sum + (it.qty || 0), 0);
}

// Load products into PRODUCTS array
async function loadProducts() {
  try {
    const response = await fetch("data/products.json");
    PRODUCTS = await response.json();
  } catch (error) {
    console.error("Error loading products:", error);
  }
}


// --- Rendering --------------------------------------------------------------
function renderDistricts() {
  districtEl.innerHTML = DISTRICTS.map(d => `<option value="${d}">${d}</option>`).join("");
  districtEl.value = district;
}

function renderPills() {
  const active = category === null;
  const pill = (key, label, isActive) => `
    <button data-cat="${key ?? ""}"
      class="px-3 py-1 text-sm rounded-full border ${isActive ? "bg-black text-white border-black" : "bg-neutral-100"}">
      ${label}
    </button>
  `;
  const first = pill("", "All", active);
  const rest = CATEGORIES.map(c => pill(c.key, c.label, category === c.key)).join("");
  pillsEl.innerHTML = first + rest;

  // Events for pills
  pillsEl.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-cat");
      category = key ? key : null;
      renderPills();     // update active styles
      renderProducts();  // re-render grid
    });
  });
}

function matches(p) {
  const catOk = !category || p.category === category;
  const q = query.trim().toLowerCase();
  const qOk = !q
    || p.name?.toLowerCase().includes(q)
    || p.brand?.toLowerCase().includes(q)
    || p.category?.toLowerCase().includes(q);
  return catOk && qOk;
}

function stars(rating) {
  const filled = Math.round(rating || 0);
  return Array.from({ length: 5 })
    .map((_, i) =>
      `<i data-lucide="star" class="w-4 h-4 ${i < filled ? "fill-current text-amber-600" : "text-amber-600"}"></i>`
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
            <div class="text-xs text-neutral-500">${p.brand ?? ""}</div>
          </div>
          <span class="badge badge-emerald">${p.quality ?? "Standard"}</span>
        </div>
        <div class="flex items-center gap-1 text-amber-600">
          ${stars(p.rating)} <span class="text-xs ml-1 text-neutral-500">${(p.rating ?? 0).toFixed(1)}</span>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-semibold">${formatBDT(p.price)}</div>
            <div class="text-xs text-neutral-500">${p.unit ?? ""}</div>
          </div>
          <div class="text-xs text-neutral-600 flex items-center gap-1">
            <i data-lucide="truck" class="h-4 w-4"></i> ${leadTimeLabel(p.leadTimeDays ?? 2)}
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
    </div>
  `;
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
    estC.textContent = formatBDT(estimateDeliveryCost(estD.value, parseInt(estW.value || "1", 10)));
  };
  estD.addEventListener("change", update);
  estW.addEventListener("input", update);
  update();
}

// --- Details ---------------------------------------------------------------
function openDetails(product) {
  selectedProduct = product;
  detailsTitle.textContent = product.name ?? "Product";
  detailsImage.style.backgroundImage = `url('${product.image}')`;
  detailsPrice.textContent = formatBDT(product.price);
  detailsUnit.textContent = `Unit: ${product.unit ?? ""}`;
  detailsLead.textContent = `Lead Time: ${leadTimeLabel(product.leadTimeDays ?? 2)}`;
  detailsOrigin.textContent = `Origin: ${product.origin ?? ""}`;
  detailsQuality.textContent = `Quality: ${product.quality ?? "Standard"}`;

  renderEstimator(detailsEstimator, district, 1000);

  detailsSheet.classList.remove("hidden");
  detailsSheet.classList.add("sheet-open");
  lucide.createIcons();
}

function closeDetails() {
  detailsSheet.classList.add("hidden");
  detailsSheet.classList.remove("sheet-open");
  selectedProduct = null;
}

// --- Cart -------------------------------------------------------------------
function renderCart() {
  if (!cart.length) {
    cartItemsEl.innerHTML = `<div class="text-sm text-neutral-500">Cart is empty.</div>`;
    cartSubtotalEl.textContent = formatBDT(0);
    cartCountEl.textContent = "0";
    saveCart();
    lucide.createIcons();
    return;
  }

  cartItemsEl.innerHTML = cart.map(item => `
    <div class="border rounded-xl">
      <div class="p-3 flex items-center gap-3">
        <div class="h-14 w-14 rounded bg-cover bg-center" style="background-image:url('${item.image}')"></div>
        <div class="flex-1">
          <div class="text-sm font-medium line-clamp-1">${item.name}</div>
          <div class="text-xs text-neutral-500">${item.qty} × ${formatBDT(item.price)} ${item.unit ? `(${item.unit})` : ""}</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="h-8 w-8 border rounded grid place-items-center" data-dec="${item.id}">-</button>
          <button class="h-8 w-8 border rounded grid place-items-center" data-inc="${item.id}">+</button>
          <button class="h-8 w-8 border rounded grid place-items-center" data-del="${item.id}" aria-label="Remove ${item.name}">
            <i data-lucide="trash-2" class="h-4 w-4"></i>
          </button>
        </div>
      </div>
    </div>
  `).join("");

  const subtotal = cart.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 0), 0);
  cartSubtotalEl.textContent = formatBDT(subtotal);
  cartCountEl.textContent = String(cartItemCount());

  // quantity + remove handlers
  cartItemsEl.querySelectorAll("[data-inc]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-inc");
      const it = cart.find(x => x.id === id);
      if (it) it.qty += 1;
      renderCart();
      saveCart();
    });
  });
  cartItemsEl.querySelectorAll("[data-dec]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-dec");
      const it = cart.find(x => x.id === id);
      if (it) {
        it.qty = Math.max(1, it.qty - 1);
      }
      renderCart();
      saveCart();
    });
  });
  cartItemsEl.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      cart = cart.filter(x => x.id !== id);
      renderCart();
      saveCart();
    });
  });

  saveCart();
  lucide.createIcons();
}

function addToCart(product) {
  const existing = cart.find(p => p.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  renderCart();
  saveCart();
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
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("data/products.json");
    const products = await res.json();
    renderProducts(products);
  } catch (error) {
    console.error("Error loading products:", error);
  }
});

function renderProducts(products) {
  const container = document.getElementById("products-container"); // your grid element
  container.innerHTML = "";

  products.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p>${p.brand} — ${p.unit}</p>
      <p>৳${p.price}</p>
    `;
    container.appendChild(card);
  });
}

  // District
  renderDistricts();
  districtEl.addEventListener("change", (e) => {
    district = e.target.value;
  });

  // Pills
  renderPills();

  // Search
  searchEl.addEventListener("input", (e) => {
    query = e.target.value || "";
    renderProducts();
  });

  // Buttons
  closeDetailsBtn.addEventListener("click", closeDetails);
  openCartBtn.addEventListener("click", openCart);
  closeCartBtn.addEventListener("click", closeCart);

  // Estimator (hero)
  const heroMount = document.getElementById("deliveryEstimatorMount");
  renderEstimator(heroMount, district, 1000);

  // Quote form (demo)
  const quoteForm = document.getElementById("quoteForm");
  quoteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Thanks! We will contact you shortly.");
    quoteForm.reset();
  });

  // Load products then render
  await loadProducts();
  renderProducts();
  renderCart();
  lucide.createIcons();
});
