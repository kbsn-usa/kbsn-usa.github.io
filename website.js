// =======================
// BPC Website JavaScript
// =======================

// Elements
const productsEl = document.getElementById("productsGrid");
const cartItemsEl = document.getElementById("cart-items");
const cartSubtotalEl = document.getElementById("cart-subtotal");
const cartCountEl = document.getElementById("cartCount");
const categoryPillsEl = document.getElementById("categoryPills");
const searchInputEl = document.getElementById("searchInput");
const districtSelectEl = document.getElementById("districtSelect");
const detailsSheetEl = document.getElementById("detailsSheet");

// Cart state
let cart = JSON.parse(localStorage.getItem("bpc-cart")) || [];
let district = localStorage.getItem("bpc-district") || "Dhaka";
let productsData = [];

// =======================
// Utility Functions
// =======================

function formatBDT(amount) {
  return `৳${amount.toLocaleString("en-BD")}`;
}

function saveCart() {
  localStorage.setItem("bpc-cart", JSON.stringify(cart));
  localStorage.setItem("bpc-district", district);
}

function cartItemCount() {
  return cart.reduce((sum, item) => sum + (item.qty || 0), 0);
}

// =======================
// Product Rendering
// =======================

function productCard(p) {
  return `
    <div class="border rounded-xl p-4 flex flex-col shadow-sm">
      <div class="h-32 bg-gray-100 mb-2 rounded-md bg-center bg-cover" 
           style="background-image: url('${p.image}')"></div>
      <h3 class="font-semibold text-sm line-clamp-2">${p.name}</h3>
      <div class="text-xs text-neutral-500">${p.brand || ""}</div>
      <div class="text-xs text-neutral-500">Unit: ${p.unit || ""}</div>
      <div class="font-bold mt-1">${formatBDT(p.price)}</div>
      <div class="mt-auto flex gap-2 pt-2">
        <button class="flex-1 bg-blue-600 text-white py-1 rounded text-sm" data-add="${p.id}">Add to Cart</button>
        <button class="px-2 py-1 border rounded text-sm" data-detail="${p.id}">Details</button>
      </div>
    </div>
  `;
}

function renderProducts(category = "all", query = "") {
  let filtered = productsData;

  if (category !== "all") {
    filtered = filtered.filter(p => p.category === category);
  }
  if (query) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  if (!filtered.length) {
    productsEl.innerHTML = `<div class="text-center text-neutral-500 py-10">No products found.</div>`;
    return;
  }

  productsEl.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      ${filtered.map(productCard).join("")}
    </div>
  `;

  // Add to cart handlers
  productsEl.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      addToCart(btn.dataset.add);
    });
  });

  // Product details handlers
  productsEl.querySelectorAll("[data-detail]").forEach(btn => {
    btn.addEventListener("click", () => {
      showProductDetails(btn.dataset.detail);
    });
  });
}

// =======================
// Cart Functions
// =======================

function addToCart(productId) {
  const existing = cart.find(it => it.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    const product = productsData.find(p => p.id === productId);
    if (product) cart.push({ ...product, qty: 1 });
  }
  renderCart();
}

function renderCart() {
  if (!cart.length) {
    cartItemsEl.innerHTML = `<div class="text-sm text-neutral-500">Cart is empty.</div>`;
    cartSubtotalEl.textContent = formatBDT(0);
    cartCountEl.textContent = "0";
    saveCart();
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
          <button class="h-8 w-8 border rounded grid place-items-center" data-del="${item.id}">🗑</button>
        </div>
      </div>
    </div>
  `).join("");

  const subtotal = cart.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 0), 0);

  // Delivery rule
  const insideDhaka = ["Dhaka", "Gazipur", "Narayanganj"].includes(district);
  const deliveryCost = insideDhaka ? 150 : 200;
  const total = subtotal + deliveryCost;

  cartSubtotalEl.innerHTML = `
    <div class="flex justify-between text-sm">
      <span>Subtotal</span><span>${formatBDT(subtotal)}</span>
    </div>
    <div class="flex justify-between text-sm">
      <span>Delivery</span><span>${formatBDT(deliveryCost)}</span>
    </div>
    <div class="flex justify-between font-semibold">
      <span>Total</span><span>${formatBDT(total)}</span>
    </div>
  `;

  cartCountEl.textContent = String(cartItemCount());

  // Quantity controls
  cartItemsEl.querySelectorAll("[data-inc]").forEach(btn =>
    btn.addEventListener("click", () => {
      const item = cart.find(it => it.id === btn.dataset.inc);
      if (item) item.qty += 1;
      renderCart();
    })
  );
  cartItemsEl.querySelectorAll("[data-dec]").forEach(btn =>
    btn.addEventListener("click", () => {
      const item = cart.find(it => it.id === btn.dataset.dec);
      if (item && item.qty > 1) item.qty -= 1;
      else cart = cart.filter(it => it.id !== btn.dataset.dec);
      renderCart();
    })
  );
  cartItemsEl.querySelectorAll("[data-del]").forEach(btn =>
    btn.addEventListener("click", () => {
      cart = cart.filter(it => it.id !== btn.dataset.del);
      renderCart();
    })
  );

  saveCart();
}

// =======================
// Product Details Modal
// =======================

function showProductDetails(productId) {
  const product = productsData.find(p => p.id === productId);
  if (!product || !detailsSheetEl) return;

  detailsSheetEl.classList.remove("hidden");
  detailsSheetEl.innerHTML = `
    <div class="p-4 max-w-md mx-auto bg-white rounded-2xl shadow-lg">
      <button onclick="closeDetails()" class="mb-3 text-sm text-neutral-500">✕ Close</button>
      <img src="${product.image}" class="w-full h-48 object-cover rounded mb-3" />
      <h2 class="text-xl font-bold mb-1">${product.name}</h2>
      <p class="text-sm text-neutral-500 mb-1">Brand: ${product.brand || "-"}</p>
      <p class="text-sm text-neutral-500 mb-1">Origin: ${product.origin || "-"}</p>
      <p class="text-sm text-neutral-500 mb-1">Quality: ${product.quality || "-"}</p>
      <p class="text-sm text-neutral-500 mb-3">Lead Time: ${product.leadTimeDays || "N/A"} days</p>
      <div class="font-bold text-emerald-600 mb-4">${formatBDT(product.price)} / ${product.unit || ""}</div>
      <button onclick="addToCart('${product.id}')" class="bg-blue-600 text-white rounded px-4 py-2">
        Add to Cart
      </button>
    </div>
  `;
}

function closeDetails() {
  if (detailsSheetEl) detailsSheetEl.classList.add("hidden");
}

// =======================
// Init
// =======================

async function init() {
  try {
    const res = await fetch("/data/products.json");
    productsData = await res.json();

    // Render categories
    const categories = ["all", ...new Set(productsData.map(p => p.category))];
    categoryPillsEl.innerHTML = categories
      .map(c => `<button class="px-3 py-1 border rounded text-sm" data-cat="${c}">${c}</button>`)
      .join("");

    categoryPillsEl.querySelectorAll("[data-cat]").forEach(btn =>
      btn.addEventListener("click", () => renderProducts(btn.dataset.cat, searchInputEl.value))
    );

    // Search
    searchInputEl.addEventListener("input", () => {
      renderProducts("all", searchInputEl.value);
    });

    // District select
    districtSelectEl.value = district;
    districtSelectEl.addEventListener("change", e => {
      district = e.target.value;
      saveCart();
      renderCart();
    });

    // Initial render
    renderProducts();
    renderCart();
  } catch (err) {
    console.error("Error initializing site:", err);
  }
}

init();
