// ================== GLOBAL STATE ==================
let products = [];
let CART = JSON.parse(localStorage.getItem("bpc-CART")) || [];
let DISTRICT = localStorage.getItem("bpc-DISTRICTS") || "";
let SEARCH_QUERY = "";
let ACTIVE_CATEGORY = "all"; // <-- NEW

// ============== DOM Elements =================
const openCartBtnEl = document.getElementById("open-cart");
const closeCartBtnEl = document.getElementById("close-cart");
const cartSidebarEl = document.getElementById("cart-sidebar");
const cartOverlayEl = document.getElementById("cart-overlay");
const cartItemsEl = document.getElementById("cart-items");
const cartSubtotalEl = document.getElementById("cart-subtotal");
const cartDeliveryEl = document.getElementById("cart-delivery");
const cartTotalEl = document.getElementById("cart-total");
const cartCountEl = document.getElementById("cartCount");
const productListEl = document.getElementById("productsGrid");
const districtSelectEl = document.getElementById("districtSelect");
const searchInputEl = document.getElementById("searchInput");
const categoryFiltersEl = document.getElementById("categoryFilters"); // <-- NEW

// ================== Districts ==================
const allDistricts = [
  "Dhaka", "Gazipur", "Narayanganj", "Munshiganj", "Manikganj",
  "Tangail", "Kishoreganj", "Narsingdi",
  "Chattogram", "Cox's Bazar", "Khulna", "Rajshahi", "Sylhet", "Rangpur",
  "Barisal", "Mymensingh", "Cumilla", "Feni", "Noakhali", "Lakshmipur",
  "Chandpur", "Brahmanbaria", "Habiganj", "Moulvibazar", "Sunamganj",
  "Pabna", "Bogura", "Joypurhat", "Naogaon", "Natore", "Sirajganj",
  "Jashore", "Satkhira", "Magura", "Jhenaidah", "Narail", "Kushtia",
  "Meherpur", "Chuadanga", "Barishal", "Patuakhali", "Bhola",
  "Pirojpur", "Jhalokati", "Barguna", "Mymensingh", "Netrokona",
  "Sherpur", "Jamalpur", "Dinajpur", "Thakurgaon", "Panchagarh",
  "Nilphamari", "Lalmonirhat", "Kurigram", "Gaibandha", "Rangpur",
  "Bagerhat", "Khagrachhari", "Rangamati", "Bandarban"
];

// ================== INIT ==================
async function init() {
  try {
    const res = await fetch("data/products.json");
    products = await res.json();
    renderDistricts();
    renderCategories();
    renderProducts();
    renderCart();
  } catch (err) {
    console.error("Error loading products:", err);
  }
}
init();

// ================== PRODUCTS ==================
function renderProducts() {
  if (!productListEl) return;

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(SEARCH_QUERY) ||
      p.brand.toLowerCase().includes(SEARCH_QUERY);

    const matchesCategory =
      ACTIVE_CATEGORY === "all" || p.category === ACTIVE_CATEGORY;

    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    productListEl.innerHTML = `<p class="text-gray-500">No products found.</p>`;
    return;
  }

  productListEl.innerHTML = filtered
    .map(
      (p) => `
    <div class="border rounded-lg p-3 shadow hover:shadow-lg transition bg-white">
      <img src="${p.image}" alt="${p.name}" class="w-full h-40 object-cover rounded">
      <h3 class="text-lg font-semibold mt-2">${p.name}</h3>
      <p class="text-sm text-gray-500">${p.brand}</p>
      <p class="text-gray-700 font-bold">৳${p.price.toLocaleString()}</p>
      <p class="text-xs text-gray-500">Unit: ${p.unit}</p>
      <p class="text-xs text-gray-500">Weight: ${p.weight} kg</p>
      <button onclick="addToCart('${p.id}')" class="mt-2 w-full bg-black text-white py-2 rounded hover:bg-gray-800">Add to Cart</button>
    </div>`
    )
    .join("");
}

// ================== SEARCH ==================
if (searchInputEl) {
  searchInputEl.addEventListener("input", (e) => {
    SEARCH_QUERY = e.target.value.trim().toLowerCase();
    renderProducts();
  });
}

// ================== CATEGORY FILTERS ==================
function renderCategories() {
  if (!categoryFiltersEl) return;

  const categories = ["all", ...new Set(products.map((p) => p.category))];

  categoryFiltersEl.innerHTML = categories
    .map(
      (cat) => `
      <button
        onclick="setCategory('${cat}')"
        class="px-3 py-1 rounded-full border ${
          ACTIVE_CATEGORY === cat
            ? "bg-black text-white"
            : "bg-white text-gray-600 hover:bg-gray-100"
        }"
      >
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

// ================== CART ==================
function addToCart(id) {
  const item = CART.find((i) => i.id === id);
  if (item) {
    item.qty += 1;
  } else {
    CART.push({ id, qty: 1 });
  }
  saveCart();
}

function removeFromCart(id) {
  CART = CART.filter((i) => i.id !== id);
  saveCart();
}

function updateQty(id, qty) {
  const item = CART.find((i) => i.id === id);
  if (item) {
    item.qty = qty > 0 ? qty : 1;
  }
  saveCart();
}

function saveCart() {
  localStorage.setItem("bpc-CART", JSON.stringify(CART));
  renderCart();
}

function getDeliveryCost(totalWeight) {
  const insideDhaka = [
    "Dhaka", "Gazipur", "Narayanganj", "Munshiganj", "Manikganj",
    "Tangail", "Kishoreganj", "Narsingdi"
  ];
  const perKgRate = insideDhaka.includes(DISTRICT) ? 2.1 : 3.5;
  const minCost = insideDhaka.includes(DISTRICT) ? 150 : 200;

  const calc = totalWeight * perKgRate;
  return Math.max(calc, minCost);
}

// ==== CART RENDER FIX ====
function renderCart() {
  cartItemsEl.innerHTML = "";
  if (cart.length === 0) {
    cartItemsEl.innerHTML = `<p class="text-gray-500">Your cart is empty.</p>`;
    cartSummaryEl.innerHTML = ""; // hide totals if empty
    return;
  }

  let subtotal = 0;
  let totalWeight = 0;

  cart.forEach(item => {
    subtotal += item.price * item.quantity;
    totalWeight += item.weight * item.quantity;

    cartItemsEl.innerHTML += `
      <div class="flex justify-between items-center border-b py-2">
        <div>
          <p class="font-medium">${item.name}</p>
          <p class="text-sm text-gray-500">Qty: ${item.quantity}</p>
        </div>
        <p>৳${item.price * item.quantity}</p>
      </div>
    `;
  });

  // Calculate delivery cost
  let delivery = 0;
  if (DISTRICT === "Dhaka") {
    delivery = Math.max(150, totalWeight * 2.1);
  } else {
    delivery = Math.max(200, totalWeight * 3.5);
  }

  const total = subtotal + delivery;

  cartSummaryEl.innerHTML = `
    <div class="pt-4 border-t mt-4">
      <p class="flex justify-between"><span>Subtotal:</span> <span>৳${subtotal}</span></p>
      <p class="flex justify-between"><span>Delivery:</span> <span>৳${delivery}</span></p>
      <p class="flex justify-between font-bold"><span>Total:</span> <span>৳${total}</span></p>
      <button class="w-full mt-3 bg-green-600 text-white py-2 rounded">Checkout</button>
    </div>
  `;
}

// ================== CART OPEN/CLOSE ==================
function openCart() {
  cartSidebarEl.classList.remove("translate-x-full");
  cartOverlayEl.classList.remove("hidden");
}
function closeCart() {
  cartSidebarEl.classList.add("translate-x-full");
  cartOverlayEl.classList.add("hidden");
}

if (openCartBtnEl) openCartBtnEl.addEventListener("click", openCart);
if (closeCartBtnEl) closeCartBtnEl.addEventListener("click", closeCart);
if (cartOverlayEl) cartOverlayEl.addEventListener("click", closeCart);

// ==== QUOTATION FORM ====
const quotationForm = document.getElementById("quotationForm");

quotationForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("q-name").value;
  const phone = document.getElementById("q-phone").value;
  const company = document.getElementById("q-company").value;
  const message = document.getElementById("q-message").value;

  emailjs.send("service_bpcproc_2025", "template_ioi1yjo", {
    from_name: name,
    phone_number: phone,
    company: company,
    message: message,
  }, "fpDzznXzakdQE1aQh")
  .then(() => {
    alert("Your quotation request has been sent ✅");
    quotationForm.reset();
  })
  .catch(err => {
    console.error("Email send failed:", err);
    alert("Something went wrong, please try again.");
  });
});
// ================== DISTRICT ==================
function renderDistricts() {
  if (!districtSelectEl) return;

  districtSelectEl.innerHTML = `
    <option value="" disabled ${DISTRICT === "" ? "selected" : ""}>Deliver to</option>
    ${allDistricts
      .map((d) => `<option value="${d}" ${d === DISTRICT ? "selected" : ""}>${d}</option>`)
      .join("")}
  `;

  // ✅ Only save when user selects a district
  districtSelectEl.addEventListener("change", (e) => {
    DISTRICT = e.target.value;
    localStorage.setItem("bpc-DISTRICTS", DISTRICT);
    renderCart();
  });
}
