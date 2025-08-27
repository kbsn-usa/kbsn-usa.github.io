// ================== GLOBAL STATE ==================
let products = [];
let CART = JSON.parse(localStorage.getItem("bpc-CART")) || [];
let DISTRICT = localStorage.getItem("bpc-DISTRICTS") || "";
let SEARCH_QUERY = "";
let ACTIVE_CATEGORY = "all";

// ================== DOM Elements ==================
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
      <button onclick="addToCart('${p.id}')" 
        class="mt-2 w-full bg-black text-white py-2 rounded hover:bg-gray-800">
        Add to Cart
      </button>
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
  const product = products.find((p) => p.id === id);
  if (!product) return;

  const item = CART.find((i) => i.id === id);
  if (item) {
    item.qty += 1;
  } else {
    CART.push({
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      weight: product.weight,
      qty: 1
    });
  }
  saveCart();
}

function removeFromCart(index) {
  CART.splice(index, 1);
  saveCart();
}

function updateQty(index, qty) {
  if (CART[index]) {
    if (qty <= 0) {
      removeFromCart(index);
    } else {
      CART[index].qty = qty;
    }
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

// ================== CART RENDER ==================
function renderCart() {
  if (!cartItemsEl) return;

  cartItemsEl.innerHTML = "";

  if (CART.length === 0) {
    cartItemsEl.innerHTML = `<p class="text-gray-500 text-center py-6">Your cart is empty.</p>`;
    cartSummaryEl.classList.add("hidden");
    cartCountEl.textContent = "0";
    return;
  }

  cartSummaryEl.classList.remove("hidden");
  let subtotal = 0;
  let totalWeight = 0;

  CART.forEach((item, index) => {
    subtotal += item.price * item.qty;
    totalWeight += item.weight * item.qty;

    const div = document.createElement("div");
    div.className =
      "flex items-center gap-4 p-3 border rounded-xl bg-white shadow-sm mb-2";

    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="h-14 w-14 rounded-lg object-cover border" />
      <div class="flex-1">
        <h4 class="font-medium text-sm">${item.name}</h4>
        <p class="text-xs text-neutral-500">৳${item.price} per unit</p>
        <div class="flex items-center gap-2 mt-2">
           <button onclick="updateQty(${index}, ${item.qty - 1})" class="px-2 py-1 bg-neutral-200 rounded hover:bg-neutral-300">–</button>
            <input type="number" min="1" value="${item.qty}" 
             onchange="updateQty(${index}, parseInt(this.value) || 1)" 
             class="w-12 border rounded text-center text-sm" />
           <button onclick="updateQty(${index}, ${item.qty + 1})" class="px-2 py-1 bg-neutral-200 rounded hover:bg-neutral-300">+</button>
        </div>
      </div>
      <div class="flex flex-col items-end gap-2">
        <span class="font-semibold">৳${(item.price * item.qty).toLocaleString()}</span>
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
  <div class="p-4 border-t space-y-2 text-sm">
    <div class="flex justify-between"><span>Subtotal:</span><span>৳${subtotal.toLocaleString()}</span></div>
    <div class="flex justify-between"><span>Delivery:</span><span>৳${deliveryCost.toLocaleString()}</span></div>
    <div class="flex justify-between"><span>Deliver To:</span><span>${DISTRICT || "Not selected"}</span></div>
    <div class="flex justify-between font-bold text-lg"><span>Total:</span><span>৳${grandTotal.toLocaleString()}</span></div>
    <button class="w-full mt-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white py-3 rounded-xl font-semibold shadow hover:opacity-90 transition">
      Proceed to Checkout
    </button>
  </div>
`;

  cartCountEl.textContent = CART.reduce((sum, i) => sum + i.qty, 0);
  lucide.createIcons();
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

// ================== QUOTATION FORM ==================
const quotationFormEl = document.getElementById("quotationForm");
if (quotationFormEl) {
  quotationFormEl.addEventListener("submit", function (e) {
    e.preventDefault();

    const templateParams = {
      name: document.getElementById("qName").value,
      phone: document.getElementById("qPhone").value,
      company: document.getElementById("qCompany").value,
      message: document.getElementById("qMessage").value
    };

    emailjs
      .send("service_bpcproc_2025", "template_bpcproc_request", templateParams)
      .then(
        () => {
          alert("Quotation request sent successfully!");
          quotationFormEl.reset();
        },
        (error) => {
          alert("Failed to send request. Please try again.");
          console.error(error);
        }
      );
  });
}

// ================== DISTRICT ==================
function renderDistricts() {
  if (!districtSelectEl) return;

  districtSelectEl.innerHTML = `
    <option value="" disabled ${DISTRICT === "" ? "selected" : ""}>Deliver to</option>
    ${allDistricts
      .map(
        (d) =>
          `<option value="${d}" ${d === DISTRICT ? "selected" : ""}>${d}</option>`
      )
      .join("")}
  `;

  districtSelectEl.addEventListener("change", (e) => {
    DISTRICT = e.target.value;
    localStorage.setItem("bpc-DISTRICTS", DISTRICT);
    renderCart();
  });
}
