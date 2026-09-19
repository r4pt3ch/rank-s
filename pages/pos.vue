<script setup>
const { data: products, refresh } = await useFetch("/api/products");
const { data: receiptSettings } = await useFetch("/api/receipt-settings");

const cart = ref([]);
const buyer = ref("");
const showAdd = ref(false);
const newProduct = ref({ name: "", price: "", stock: "", category: "" });
const lastReceipt = ref(null);
const activeCategory = ref("All");

const categories = computed(() => {
  const set = new Set((products.value || []).map((p) => p.category || "General"));
  return ["All", ...Array.from(set)];
});

const visibleProducts = computed(() => {
  if (activeCategory.value === "All") return products.value || [];
  return (products.value || []).filter((p) => (p.category || "General") === activeCategory.value);
});

const groupedProducts = computed(() => {
  const groups = {};
  for (const p of visibleProducts.value) {
    const cat = p.category || "General";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  }
  return groups;
});

function addToCart(p) {
  if (p.stock <= 0) return;
  const existing = cart.value.find((i) => i.id === p.id);
  if (existing) {
    if (existing.qty < p.stock) existing.qty++;
  } else {
    cart.value.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
  }
}
function changeQty(id, delta) {
  const item = cart.value.find((i) => i.id === id);
  if (item) item.qty = Math.max(1, item.qty + delta);
}
function removeFromCart(id) {
  cart.value = cart.value.filter((i) => i.id !== id);
}
const total = computed(() => cart.value.reduce((s, i) => s + i.price * i.qty, 0));

async function checkout() {
  if (!cart.value.length) return;
  const receipt = await $fetch("/api/receipts", {
    method: "POST",
    body: { name: buyer.value || "Walk-in customer", items: cart.value, deductStock: true },
  });
  cart.value = [];
  buyer.value = "";
  lastReceipt.value = receipt;
  await refresh();
}

async function addProduct() {
  if (!newProduct.value.name || !newProduct.value.price) return;
  await $fetch("/api/products", { method: "POST", body: newProduct.value });
  newProduct.value = { name: "", price: "", stock: "", category: "" };
  showAdd.value = false;
  await refresh();
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Point of sale</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 8px;">Tap a product to add it to the cart. Sells deduct from inventory automatically.</p>
    <p style="font-size: 12.5px; margin: 0 0 24px;">
      <NuxtLink to="/inventory" style="color: #5bb8f5; text-decoration: none;">Manage products, prices, and stock levels →</NuxtLink>
      &nbsp;·&nbsp;
      <NuxtLink to="/receipt-settings" style="color: #5bb8f5; text-decoration: none;">Receipt settings →</NuxtLink>
    </p>

    <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px;">
      <div class="rs-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div style="font-weight: 700; font-size: 14px;">Products</div>
          <button class="rs-btn-secondary" @click="showAdd = true">Add product</button>
        </div>

        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px;">
          <button
            v-for="cat in categories"
            :key="cat"
            class="rs-btn-secondary"
            style="padding: 7px 13px; font-size: 12px;"
            :style="{ background: activeCategory === cat ? '#1c2128' : 'transparent', color: activeCategory === cat ? '#5bb8f5' : '#aab0bb', borderColor: activeCategory === cat ? '#2f8fd6' : '#2a2f38' }"
            @click="activeCategory = cat"
          >
            {{ cat }}
          </button>
        </div>

        <div v-if="!visibleProducts.length" style="font-size: 13px; color: #5d6470; padding: 18px 0; text-align: center;">No products in this category.</div>

        <div v-for="(items, cat) in groupedProducts" :key="cat" style="margin-bottom: 20px;">
          <div v-if="activeCategory === 'All'" style="font-size: 11.5px; color: #7a8190; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">{{ cat }}</div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <button
              v-for="p in items"
              :key="p.id"
              class="rs-pos-tile"
              :disabled="p.stock <= 0"
              :style="{ opacity: p.stock <= 0 ? 0.4 : 1, cursor: p.stock <= 0 ? 'not-allowed' : 'pointer' }"
              @click="addToCart(p)"
            >
              <div style="font-weight: 600; font-size: 12.5px; line-height: 1.3;">{{ p.name }}</div>
              <div style="font-size: 12px; color: #5bb8f5; font-weight: 700; margin-top: 6px;">₱{{ p.price.toLocaleString() }}</div>
              <div style="font-size: 10.5px; margin-top: 4px;" :style="{ color: p.stock <= 5 ? '#e88' : '#7a8190' }">{{ p.stock <= 0 ? "Out of stock" : `${p.stock} left` }}</div>
            </button>
          </div>
        </div>
      </div>

      <div class="rs-card">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 14px;">Cart</div>
        <input v-model="buyer" class="rs-input" placeholder="Walk-in customer" style="margin-bottom: 14px;" />
        <div v-if="!cart.length" style="font-size: 13px; color: #5d6470; padding: 18px 0; text-align: center;">Cart is empty.</div>
        <div v-for="i in cart" :key="i.id" style="display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #1c2026;">
          <span style="flex: 1; font-size: 12.5px;">{{ i.name }}</span>
          <button class="rs-btn-secondary" style="padding: 2px 7px;" @click="changeQty(i.id, -1)">-</button>
          <span style="font-size: 12px; min-width: 20px; text-align: center;">{{ i.qty }}</span>
          <button class="rs-btn-secondary" style="padding: 2px 7px;" @click="changeQty(i.id, 1)">+</button>
          <span style="font-size: 12.5px; min-width: 56px; text-align: right;">₱{{ (i.price * i.qty).toLocaleString() }}</span>
          <button class="rs-btn-secondary" style="padding: 2px 7px;" @click="removeFromCart(i.id)">✕</button>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 14px 0 6px; font-weight: 700;">
          <span>Total</span><span>₱{{ total.toLocaleString() }}</span>
        </div>
        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" @click="checkout">Checkout</button>
      </div>
    </div>

    <div v-if="showAdd" style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 50;">
      <div style="width: 420px; background: #13161b; border: 1px solid #232730; border-radius: 14px; padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div style="font-weight: 800; font-size: 16px;">Add product</div>
          <button @click="showAdd = false" style="background: transparent; border: none; color: #8a909b; cursor: pointer;">✕</button>
        </div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Product name</label>
        <input v-model="newProduct.name" class="rs-input" placeholder="Resistance band" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Price (₱)</label>
        <input v-model="newProduct.price" class="rs-input" placeholder="350" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Starting stock</label>
        <input v-model="newProduct.stock" class="rs-input" placeholder="20" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Category</label>
        <input v-model="newProduct.category" class="rs-input" placeholder="Accessory" style="margin-bottom: 16px;" />
        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" @click="addProduct">Add to inventory</button>
      </div>
    </div>

    <PrintableReceipt v-if="lastReceipt" :receipt="lastReceipt" :settings="receiptSettings" @close="lastReceipt = null" />
  </div>
</template>
