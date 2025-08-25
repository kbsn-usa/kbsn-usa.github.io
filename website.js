// =======================
// BPC Website JavaScript
// =======================

// Elements
const productsEl = document.getElementById("products");
const cartItemsEl = document.getElementById("cart-items");
const cartSubtotalEl = document.getElementById("cart-subtotal");
const cartCountEl = document.getElementById("cart-count");
const categoryPillsEl = document.getElementById("category-pills");
const searchInputEl = document.getElementById("search-input");
const districtSelectEl = document.getElementById("district-select");

// Cart state
let cart = JSON.parse(localStorage.getItem("bpc-cart")) || [];
let district = localStorage.getItem("bpc-district") || "Dhaka";
let productsData = [];

// =======================
// Utility Functions
// =======================

// Format currency in BDT
function formatBDT(amount) {
  return `৳${amount.toLocaleString("en-BD")}`;
}

// Save cart & district in localStorage
function saveCart() {
  localStorage.setItem("bpc-cart", JSON.stringify(cart));
  localStorage.setItem("bpc-district", district);
}

// Count cart items
function cartItemCount() {
  return cart.reduce((sum, item) => sum + (item.qty || 0), 0);
}

// =======================
// Product Rendering
// =======================

// Product card template
function productCard(p) {
  return `
    <div class="border rounded-xl p-4 flex flex-col">
      <div class="h-32 bg-gray-100 mb-2 rounded-md bg-center bg-cover" style="background-image: url('${p.image}')"></div>
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

// Render products by category & search
async function loadProducts() {
  try {
    const res = await fetch("/data/products.json");
    const products = await res.json();
    renderProducts(products);
  } catch (err) {
    console.error("Error loading products:", err);
  }
}

function renderProducts(products) {
  const grid = document.getElementById("productsGrid");
  grid.innerHTML = "";

  products.forEach((p) => {
    grid.innerHTML += `
      <div class="border rounded-lg p-4 shadow bg-white">
        <img src="${p.image}" alt="${p.name}" class="w-full h-40 object-cover mb-3 rounded">
        <h3 class="font-bold text-lg">${p.name}</h3>
        <p class="text-sm text-gray-600">${p.brand} - ${p.quality}</p>
        <p class="text-sm">Unit: ${p.unit}</p>
        <p class="font-semibold mt-2">৳${p.price.toLocaleString()}</p>
        <button onclick="addToCart('${p.id}')" class="mt-3 bg-blue-600 text-white px-3 py-1 rounded">
          Add to Cart
        </button>
      </div>
    `;
  });
}

document.addEventListener("DOMContentLoaded", loadProducts);

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

  // Attach add-to-cart handlers
  productsEl.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      addToCart(btn.dataset.add);
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
          <button class="h-8 w-8 border rounded grid place-items-center" data-del="${item.id}">
            🗑
          </button>
        </div>
      </div>
    </div>
  `).join("");

  const subtotal = cart.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 0), 0);

  // delivery rule
  const insideDhaka = ["Dhaka", "Gazipur", "Narayanganj"].includes(district);
  const deliveryCost = insideDhaka ? 150 : 200;
  const total = subtotal + deliveryCost;

  // update cart footer
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

  // Handlers for + / - / delete
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
// Init
// =======================

async function init() {
  // Load products.json
  const res = await fetch("data/products.json");
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
}

init();
