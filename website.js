// -------------------------------
// Global State
// -------------------------------
let products = [];
let districts = {};
let cart = [];

// -------------------------------
// Load Products + Districts
// -------------------------------
async function loadProducts() {
  try {
    const res = await fetch("products.json");
    products = await res.json();
    renderProducts(products);
  } catch (err) {
    console.error("Error loading products:", err);
  }
}

async function loadDistricts() {
  try {
    const res = await fetch("districts.json");
    districts = await res.json();

    const districtSelect = document.getElementById("districtSelect");
    if (districtSelect) {
      Object.keys(districts).forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = `${d} (৳${districts[d].deliveryRate})`;
        districtSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("Error loading districts:", err);
  }
}

// -------------------------------
// Render Product Grid
// -------------------------------
function renderProducts(list) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (list.length === 0) {
    grid.innerHTML = `<p class="text-center text-neutral-500 w-full">No products found</p>`;
    return;
  }

  list.forEach((p) => {
    const card = document.createElement("div");
    card.className =
      "bg-white border rounded-2xl shadow hover:shadow-lg p-4 cursor-pointer transition";
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}" class="w-full h-40 object-cover rounded-xl mb-3">
      <h3 class="font-semibold text-lg">${p.name}</h3>
      <p class="text-sm text-neutral-600">Category: ${p.category}</p>
      <p class="text-sm text-neutral-600">Rating: ⭐ ${p.rating}</p>
    `;
    card.addEventListener("click", () => openProductDetails(p));
    grid.appendChild(card);
  });
}

// -------------------------------
// Product Details Sidebar
// -------------------------------
function openProductDetails(product) {
  const sheet = document.getElementById("detailsSheet");
  if (!sheet) return;

  // Brand options
  const brandOptions = product.brands
    .map(
      (b, i) => `
        <div class="flex justify-between items-center border p-2 rounded-lg mb-2">
          <span>${b.name}</span>
          <span class="font-semibold">৳${b.price}</span>
          <button onclick="addToCart('${product.id}', ${i})" 
            class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700">
            Add
          </button>
        </div>
      `
    )
    .join("");

  sheet.innerHTML = `
    <button onclick="closeProductDetails()" 
      class="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-200">
      <i data-lucide="x" class="h-5 w-5"></i>
    </button>

    <img src="${product.image}" alt="${product.name}" 
      class="w-full h-60 object-cover rounded-xl mb-4">
    <h2 class="text-2xl font-bold mb-2">${product.name}</h2>
    <p class="text-sm text-neutral-600 mb-2">Origin: ${product.origin}</p>
    <p class="text-sm text-neutral-600 mb-2">Quality: ${product.quality}</p>
    <p class="text-sm text-neutral-600 mb-2">Unit: ${product.unit}</p>
    <p class="text-sm text-neutral-600 mb-4">Lead Time: ${product.leadTimeDays} days</p>

    <h3 class="text-lg font-semibold mb-2">Available Brands</h3>
    ${brandOptions}
  `;

  sheet.classList.remove("hidden");
}

function closeProductDetails() {
  document.getElementById("detailsSheet").classList.add("hidden");
}

// -------------------------------
// Cart Functions
// -------------------------------
function addToCart(productId, brandIndex) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const brand = product.brands[brandIndex];
  const existing = cart.find(
    (c) => c.product.id === productId && c.brand.name === brand.name
  );

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ product, brand, qty: 1 });
  }

  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function updateQty(index, change) {
  cart[index].qty += change;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  renderCart();
}

function renderCart() {
  const cartGrid = document.getElementById("cartGrid");
  const cartTotal = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");

  if (!cartGrid) return;

  cartGrid.innerHTML = "";

  if (cart.length === 0) {
    cartGrid.innerHTML = `<p class="text-center text-neutral-500">Your cart is empty</p>`;
    cartTotal.textContent = "৳0";
    checkoutBtn.classList.add("hidden");
    return;
  }

  let subtotal = 0;

  cart.forEach((c, i) => {
    const total = c.qty * c.brand.price;
    subtotal += total;

    const item = document.createElement("div");
    item.className =
      "flex justify-between items-center bg-white p-3 rounded-xl shadow mb-2";
    item.innerHTML = `
      <div>
        <h4 class="font-semibold">${c.product.name}</h4>
        <p class="text-sm text-neutral-600">${c.brand.name}</p>
        <p class="text-sm">৳${c.brand.price} x ${c.qty} = <b>৳${total}</b></p>
      </div>
      <div class="flex gap-2">
        <button onclick="updateQty(${i}, -1)" 
          class="px-2 py-1 bg-neutral-200 rounded-lg">-</button>
        <button onclick="updateQty(${i}, 1)" 
          class="px-2 py-1 bg-neutral-200 rounded-lg">+</button>
        <button onclick="removeFromCart(${i})" 
          class="px-2 py-1 bg-red-500 text-white rounded-lg">x</button>
      </div>
    `;
    cartGrid.appendChild(item);
  });

  // Delivery cost
  const districtSelect = document.getElementById("districtSelect");
  let deliveryCost = 0;
  if (districtSelect && districtSelect.value && districts[districtSelect.value]) {
    deliveryCost = districts[districtSelect.value].deliveryRate;
  }

  const grandTotal = subtotal + deliveryCost;
  cartTotal.textContent = `৳${grandTotal}`;
  checkoutBtn.classList.remove("hidden");
}

// -------------------------------
// Search
// -------------------------------
function setupSearch() {
  const searchBox = document.getElementById("searchBox");
  if (!searchBox) return;

  searchBox.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = products.filter((p) =>
      p.name.toLowerCase().includes(term)
    );
    renderProducts(filtered);
  });
}

// -------------------------------
// Init
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadDistricts();
  setupSearch();
  renderCart();
});
