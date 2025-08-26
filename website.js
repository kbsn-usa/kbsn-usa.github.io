// =======================
// BPC Website JavaScript
// =======================

// ---------- Config ----------
const DISTRICTS = [
  "Dhaka","Chattogram","Gazipur","Narayanganj","Cumilla",
  "Rajshahi","Khulna","Sylhet","Barishal","Rangpur",
];

// ---------- State ----------
let PRODUCTS = [];
let FILTER = { category: "all", query: "" };
let DISTRICT = localStorage.getItem("bpc-district") || "Dhaka";
let CART = JSON.parse(localStorage.getItem("bpc-cart") || "[]");

// ---------- DOM ----------
const gridEl = document.getElementById("productsGrid");
const pillsEl = document.getElementById("categoryPills");
const searchEl = document.getElementById("searchInput");
const districtEl = document.getElementById("districtSelect");
const cartCountEl = document.getElementById("cartCount");
const detailsSheetEl = document.getElementById("detailsSheet");
const cartDrawerEl = document.getElementById("cartDrawer");
const openCartBtn = document.getElementById("openCartBtn");

// ---------- Utils ----------
const BDT = (n) =>
  `৳${(n ?? 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

const leadTimeLabel = (days) => {
  const d = Number(days || 2);
  if (d <= 1) return "Tomorrow";
  if (d === 2) return "In 2 days";
  return `${d} days`;
};

function saveAll() {
  localStorage.setItem("bpc-district", DISTRICT);
  localStorage.setItem("bpc-cart", JSON.stringify(CART));
}

function cartItemCount() {
  return CART.reduce((s, it) => s + (it.qty || 0), 0);
}

function setCartCount() {
  if (cartCountEl) cartCountEl.textContent = String(cartItemCount());
}

// ---------- Products ----------
function categoryListFromProducts() {
  const set = new Set(PRODUCTS.map((p) => p.category).filter(Boolean));
  return ["all", ...Array.from(set)];
}

function renderCategoryPills() {
  const cats = categoryListFromProducts();
  pillsEl.innerHTML = cats
    .map(
      (c) => `
      <button data-cat="${c}"
        class="px-3 py-1 rounded-full border text-sm ${
          FILTER.category === c ? "bg-black text-white border-black" : "bg-neutral-100"
        }">
        ${c[0].toUpperCase()}${c.slice(1)}
      </button>`
    )
    .join("");

  pillsEl.querySelectorAll("[data-cat]").forEach((btn) =>
    btn.addEventListener("click", () => {
      FILTER.category = btn.dataset.cat;
      renderCategoryPills();
      renderProducts();
    })
  );
}

function productCard(p) {
  return `
  <div class="bg-white rounded-xl border overflow-hidden hover:shadow-sm transition flex flex-col h-full">
    <div class="h-40 w-full bg-center bg-cover" style="background-image:url('${p.image}')" data-detail="${p.id}"></div>
    <div class="p-4 flex flex-col gap-2 flex-1">
      <div class="flex-1">
        <div class="font-semibold leading-snug line-clamp-2">${p.name}</div>
        <div class="text-xs text-neutral-500">${p.brand ?? ""}</div>
      </div>
      <div class="flex items-center justify-between">
        <div>
          <div class="text-lg font-bold">${BDT(p.price)}</div>
          <div class="text-xs text-neutral-500">${p.unit ?? ""}</div>
        </div>
        <div class="text-xs text-neutral-600 flex items-center gap-1">
          <i data-lucide="truck" class="w-4 h-4"></i>${leadTimeLabel(p.leadTimeDays)}
        </div>
      </div>
      <div class="mt-1 flex gap-2">
        <button class="flex-1 bg-black text-white rounded-lg px-3 py-2 h-10 flex items-center justify-center gap-2" data-add="${p.id}">
          <i data-lucide="shopping-cart" class="w-4 h-4"></i> Add
        </button>
        <button class="border rounded-lg px-3 py-2 h-10 flex items-center justify-center gap-2" data-detail="${p.id}">
          <i data-lucide="info" class="w-4 h-4"></i> Details
        </button>
      </div>
    </div>
  </div>`;
}

function renderProducts() {
  let items = PRODUCTS.slice();

  if (FILTER.category && FILTER.category !== "all") {
    items = items.filter((p) => p.category === FILTER.category);
  }
  const q = (FILTER.query || "").toLowerCase().trim();
  if (q) {
    items = items.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }

  if (!items.length) {
    gridEl.innerHTML =
      '<div class="col-span-full text-center text-neutral-500 py-10">No products found.</div>';
  } else {
    gridEl.innerHTML = items.map(productCard).join("");
  }

  // attach handlers
  gridEl.querySelectorAll("[data-add]").forEach((btn) =>
    btn.addEventListener("click", () => addToCartById(btn.dataset.add))
  );
  gridEl.querySelectorAll("[data-detail]").forEach((btn) =>
    btn.addEventListener("click", () => openDetails(btn.dataset.detail))
  );

  lucide.createIcons();
}

// ---------- Details Sheet ----------
function openDetails(productId) {
  const p = PRODUCTS.find((x) => String(x.id) === String(productId));
  if (!p || !detailsSheetEl) return;

  detailsSheetEl.classList.remove("hidden");
  detailsSheetEl.innerHTML = `
    <div class="h-full w-full max-w-xl ml-auto bg-white p-6 overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Product Details</h2>
        <button class="border rounded px-2 py-1 text-sm" id="closeDetailsBtn">Close</button>
      </div>

      <div class="w-full h-48 bg-center bg-cover rounded-lg mb-4" style="background-image:url('${p.image}')"></div>
      <h3 class="text-2xl font-bold">${p.name}</h3>
      <div class="text-sm text-neutral-500">${p.brand ?? ""} ${p.unit ? "• " + p.unit : ""}</div>

      <div class="mt-3 text-xl font-semibold">${BDT(p.price)}</div>
      <div class="text-sm text-neutral-600">Lead time: ${leadTimeLabel(p.leadTimeDays)}</div>
      <div class="text-sm text-neutral-600">Origin: ${p.origin ?? "-"}</div>
      <div class="text-sm text-neutral-600">Quality: ${p.quality ?? "Standard"}</div>

      <div class="mt-5">
        <button class="bg-black text-white rounded-lg px-4 py-2" id="detailsAddBtn">Add to Cart</button>
      </div>
    </div>
  `;

  detailsSheetEl.querySelector("#closeDetailsBtn").addEventListener("click", closeDetails);
  detailsSheetEl.querySelector("#detailsAddBtn").addEventListener("click", () => {
    addToCartById(p.id);
    closeDetails();
    openCart(); // optional UX
  });

  lucide.createIcons();
}

function closeDetails() {
  detailsSheetEl.classList.add("hidden");
  detailsSheetEl.innerHTML = "";
}

// ---------- Cart Drawer ----------
function openCart() {
  if (!cartDrawerEl) return;
  cartDrawerEl.classList.remove("hidden");
  renderCart();
}

function closeCart() {
  if (!cartDrawerEl) return;
  cartDrawerEl.classList.add("hidden");
  cartDrawerEl.innerHTML = ""; // optional cleanup
}

function addToCartById(id) {
  const p = PRODUCTS.find((x) => String(x.id) === String(id));
  if (!p) return;
  const existing = CART.find((x) => String(x.id) === String(id));
  if (existing) existing.qty += 1;
  else CART.push({ ...p, qty: 1 });
  saveAll();
  setCartCount();
  renderCart(); // refresh drawer if open
}

function updateQty(id, delta) {
  const it = CART.find((x) => String(x.id) === String(id));
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) {
    CART = CART.filter((x) => String(x.id) !== String(id));
  }
  saveAll();
  setCartCount();
  renderCart();
}

function removeFromCart(id) {
  CART = CART.filter((x) => String(x.id) !== String(id));
  saveAll();
  setCartCount();
  renderCart();
}

function renderCart() {
  if (!cartDrawerEl) return;

  const subtotal = CART.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);

  cartDrawerEl.innerHTML = `
    <div class="h-full flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Your Cart</h2>
        <button class="border rounded px-2 py-1 text-sm" id="closeCartBtn">Close</button>
      </div>

      <div class="flex-1 overflow-y-auto space-y-3" id="cartItems">
        ${
          CART.length
            ? CART.map(
                (it) => `
          <div class="border rounded-xl p-3 flex items-center gap-3">
            <div class="h-14 w-14 rounded bg-center bg-cover" style="background-image:url('${it.image}')"></div>
            <div class="flex-1">
              <div class="text-sm font-medium line-clamp-1">${it.name}</div>
              <div class="text-xs text-neutral-500">${it.unit ?? ""}</div>
              <div class="text-xs text-neutral-500">${BDT(it.price)} × ${it.qty}</div>
            </div>
            <div class="flex items-center gap-2">
              <button class="h-8 w-8 border rounded grid place-items-center" data-dec="${it.id}">-</button>
              <button class="h-8 w-8 border rounded grid place-items-center" data-inc="${it.id}">+</button>
              <button class="h-8 w-8 border rounded grid place-items-center" data-del="${it.id}" title="Remove">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>`
              ).join("")
            : `<div class="text-sm text-neutral-500">Cart is empty.</div>`
        }
      </div>

      <div class="border-t pt-4 mt-4 space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span>Deliver to</span>
          <select id="cartDistrict" class="h-9 border rounded px-2">
            ${DISTRICTS.map((d) => `<option value="${d}">${d}</option>`).join("")}
          </select>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span>Subtotal</span><span id="cartSubtotal">${BDT(subtotal)}</span>
        </div>
        <button class="w-full bg-black text-white rounded-lg h-11">Checkout</button>
      </div>
    </div>
  `;

  // wire controls
  cartDrawerEl.querySelector("#closeCartBtn").addEventListener("click", closeCart);

  cartDrawerEl.querySelectorAll("[data-inc]").forEach((b) =>
    b.addEventListener("click", () => updateQty(b.dataset.inc, +1))
  );
  cartDrawerEl.querySelectorAll("[data-dec]").forEach((b) =>
    b.addEventListener("click", () => updateQty(b.dataset.dec, -1))
  );
  cartDrawerEl.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => removeFromCart(b.dataset.del))
  );

  const cartDistrict = cartDrawerEl.querySelector("#cartDistrict");
  cartDistrict.value = DISTRICT;
  cartDistrict.addEventListener("change", (e) => {
    DISTRICT = e.target.value;
    saveAll();
  });

  lucide.createIcons();
}

// ---------- Bootstrap ----------
(async function init() {
  // District select in header
  if (districtEl) {
    districtEl.innerHTML = DISTRICTS.map((d) => `<option value="${d}">${d}</option>`).join("");
    districtEl.value = DISTRICT;
    districtEl.addEventListener("change", (e) => {
      DISTRICT = e.target.value;
      saveAll();
    });
  }

  // Search
  if (searchEl) {
    searchEl.addEventListener("input", (e) => {
      FILTER.query = e.target.value || "";
      renderProducts();
    });
  }

  // Cart open button
  if (openCartBtn) {
    openCartBtn.addEventListener("click", openCart);
  }

  // Load products
  try {
    const res = await fetch("data/products.json");
    PRODUCTS = await res.json();
  } catch (e) {
    console.error("Failed to load products.json", e);
    PRODUCTS = [];
  }

  renderCategoryPills();
  renderProducts();
  setCartCount();
  lucide.createIcons();
})();
