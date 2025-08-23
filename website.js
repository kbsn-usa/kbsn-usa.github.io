// website.js

// Add to cart simulation
function addToCart(product) {
  alert(product + " has been added to your cart!");
}

// Contact form handler
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;

    alert(`Thank you, ${name}! We will contact you at ${email}.`);
    form.reset();
  });
});
