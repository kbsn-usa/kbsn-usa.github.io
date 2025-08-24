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

const MOCK_PRODUCTS = [
  {
    id: "p1",
    name: "Solid Clay Bricks (1st Class)",
    category: "bricks",
    brand: "Shah Cement Bricks",
    origin: "Tongi Kiln, Gazipur",
    quality: "Premium",
    unit: "1000 pcs",
    price: 9500,
    leadTimeDays: 2,
    rating: 4.7,
    image: "https://bpcproc.com/assets/Solid Clay Bricks (1st Class).webp",
  },
  {
    id: "p2",
    name: "60 Grade Rod (12mm)",
    category: "rod",
    brand: "BSRM",
    origin: "BSRM Plant, Chattogram",
    quality: "Premium",
    unit: "per ton",
    price: 88500,
    leadTimeDays: 3,
    rating: 4.8,
    image: "https://bpcproc.com/assets/60 Grade Rod (12mm).webp",
  },
  {
    id: "p3",
    name: "OPC Cement (50kg)",
    category: "cement",
    brand: "Shah Cement",
    origin: "Mongla, Khulna",
    quality: "Standard",
    unit: "per bag",
    price: 520,
    leadTimeDays: 1,
    rating: 4.5,
    image: "https://bpcproc.com/assets/OPC Cement (50kg).webp",
  },
  {
    id: "p4",
    name: "Ceramic Floor Tiles 24x24",
    category: "tiles",
    brand: "RAK",
    origin: "Savar, Dhaka",
    quality: "Premium",
    unit: "per box",
    price: 1450,
    leadTimeDays: 2,
    rating: 4.3,
    image: "https://bpcproc.com/assets/Ceramic Floor Tiles 24x24.webp",
  },
  {
    id: "p5",
    name: "CPVC Pipe 1 inch",
    category: "sanitary",
    brand: "Partex",
    origin: "Narayanganj",
    quality: "Standard",
    unit: "per 10ft",
    price: 320,
    leadTimeDays: 2,
    rating: 4.1,
    image: "https://bpcproc.com/assets/CPVC Pipe 1 inch.webp",
  },
  {
    id: "p6",
    name: "3-Core Copper Cable 2.5mm",
    category: "cables",
    brand: "BRB Cables",
    origin: "Sreepur, Gazipur",
    quality: "Premium",
    unit: "per meter",
    price: 110,
    leadTimeDays: 1,
    rating: 4.6,
    image: "https://bpcproc.com/assets/3-Core Copper Cable 2.5mm.webp",
  },
];

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
let cart = [];
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
      renderProducts();
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

function renderProducts() {
  const list = MOCK_PRODUCTS.filter(matches);
  gridEl.innerHTML = list.map(productCard).join("");

  // hook buttons
  gridEl.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-add");
      const p = MOCK_PRODUCTS.find(x => x.id === id);
      cart.push(p);
      cartCountEl.textContent = String(cart.length);
      openCart();
      renderCart();
      lucide.createIcons();
    });
  });
  gridEl.querySelectorAll("[data-open-details]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-open-details");
      const p = MOCK_PRODUCTS.find(x => x.id === id);
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

function openDetails(p) {
  selectedProduct = p;
  detailsTitle.textContent = p.name;
  detailsImage.style.backgroundImage = `url('${p.image}')`;
  detailsPrice.textContent = formatBDT(p.price);
  detailsUnit.textContent = p.unit;
  detailsLead.textContent = `Lead time: ${leadTimeLabel(p.leadTimeDays)}`;
  detailsOrigin.textContent = `Origin: ${p.origin}`;
  detailsQuality.innerHTML = `
    <span class="badge badge-emerald">${p.quality}</span>
    <span class="text-neutral-600">Brand: ${p.brand}</span>
  `;
  renderEstimator(detailsEstimator, district, 1000);
  detailsSheet.classList.remove("hidden");
  detailsSheet.classList.add("sheet-open");
}

function closeDetails() {
  detailsSheet.classList.add("hidden");
  detailsSheet.classList.remove("sheet-open");
  selectedProduct = null;
}

function renderCart() {
  if (!cart.length) {
    cartItemsEl.innerHTML = `<div class="text-sm text-neutral-500">Cart is empty.</div>`;
    cartSubtotalEl.textContent = formatBDT(0);
    return;
  }
  cartItemsEl.innerHTML = cart.map(p => `
    <div class="border rounded-xl">
      <div class="p-3 flex items-center gap-3">
        <div class="h-14 w-14 rounded bg-cover bg-center"
             style="background-image:url('${p.image}')"></div>
        <div class="flex-1">
          <div class="text-sm font-medium line-clamp-1">${p.name}</div>
          <div class="text-xs text-neutral-500">${p.unit}</div>
        </div>
        <div class="text-sm font-semibold">${formatBDT(p.price)}</div>
      </div>
    </div>
  `).join("");
  const subtotal = cart.reduce((sum, p) => sum + p.price, 0);
  cartSubtotalEl.textContent = formatBDT(subtotal);
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
    renderProducts();
  });

  // District
  renderDistricts();
  districtEl.addEventListener("change", (e) => {
    district = e.target.value;
  });

  // Pills + products
  renderPills();
  renderProducts();

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

  lucide.createIcons();
});
