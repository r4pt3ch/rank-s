<script setup>
const { data: products, refresh } = await useFetch("/api/products");

const showAdd = ref(false);
const editing = ref(null);
const confirmDelete = ref(null);
const error = ref("");

const newProduct = ref({ name: "", price: "", stock: "", category: "" });

async function addProduct() {
  error.value = "";
  if (!newProduct.value.name || newProduct.value.price === "") return;
  try {
    await $fetch("/api/products", { method: "POST", body: newProduct.value });
    newProduct.value = { name: "", price: "", stock: "", category: "" };
    showAdd.value = false;
    await refresh();
  } catch (e) {
    error.value = e.data?.statusMessage || "Could not add product.";
  }
}

function startEdit(p) {
  editing.value = { ...p, price: p.price, stock: p.stock };
}

async function saveEdit() {
  error.value = "";
  try {
    await $fetch(`/api/products/${editing.value.id}`, {
      method: "PUT",
      body: {
        name: editing.value.name,
        category: editing.value.category,
        price: editing.value.price,
        stock: editing.value.stock,
      },
    });
    editing.value = null;
    await refresh();
  } catch (e) {
    error.value = e.data?.statusMessage || "Could not save changes.";
  }
}

async function deleteProduct(id) {
  await $fetch(`/api/products/${id}`, { method: "DELETE" });
  confirmDelete.value = null;
  await refresh();
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Inventory settings</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">Add, modify, or delete POS products — including their price and quantity in stock.</p>

    <div style="display: flex; justify-content: flex-end; margin-bottom: 14px;">
      <button class="rs-btn-primary" @click="showAdd = true">Add product</button>
    </div>

    <div class="rs-card" style="padding: 0;">
      <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 110px; gap: 8px; padding: 12px 18px; font-size: 11.5px; color: #7a8190; border-bottom: 1px solid #1c2026;">
        <span>Product</span><span>Category</span><span>Price (₱)</span><span>Stock</span><span></span>
      </div>
      <div v-if="!products?.length" style="padding: 24px; text-align: center; color: #5d6470; font-size: 13px;">No products yet.</div>
      <div
        v-for="p in products"
        :key="p.id"
        style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 110px; gap: 8px; align-items: center; padding: 12px 18px; border-bottom: 1px solid #1c2026;"
      >
        <span style="font-weight: 600; font-size: 13px;">{{ p.name }}</span>
        <span style="font-size: 12.5px; color: #aab0bb;">{{ p.category }}</span>
        <span style="font-size: 12.5px;">₱{{ p.price.toLocaleString() }}</span>
        <span style="font-size: 12.5px;" :style="{ color: p.stock <= 5 ? '#e88' : '#eceef2' }">{{ p.stock }}</span>
        <div style="display: flex; gap: 6px; justify-content: flex-end;">
          <button class="rs-btn-secondary" style="padding: 6px 9px;" @click="startEdit(p)">Edit</button>
          <button class="rs-btn-secondary" style="padding: 6px 9px; color: #e88;" @click="confirmDelete = p">Delete</button>
        </div>
      </div>
    </div>

    <!-- Add product modal -->
    <div v-if="showAdd" style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 50;">
      <div style="width: 380px; background: #13161b; border: 1px solid #232730; border-radius: 14px; padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div style="font-weight: 800; font-size: 16px;">Add product</div>
          <button @click="showAdd = false; error = ''" style="background: transparent; border: none; color: #8a909b; cursor: pointer;">✕</button>
        </div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Product name</label>
        <input v-model="newProduct.name" class="rs-input" placeholder="Resistance band" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Price (₱)</label>
        <input v-model="newProduct.price" type="number" min="0" class="rs-input" placeholder="350" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Quantity in stock</label>
        <input v-model="newProduct.stock" type="number" min="0" class="rs-input" placeholder="20" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Category</label>
        <input v-model="newProduct.category" class="rs-input" placeholder="Accessory" style="margin-bottom: 10px;" />
        <div v-if="error" style="color: #e36b6b; font-size: 12.5px; margin-bottom: 10px;">{{ error }}</div>
        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" @click="addProduct">Add to inventory</button>
      </div>
    </div>

    <!-- Edit product modal -->
    <div v-if="editing" style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 50;">
      <div style="width: 380px; background: #13161b; border: 1px solid #232730; border-radius: 14px; padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div style="font-weight: 800; font-size: 16px;">Edit product</div>
          <button @click="editing = null; error = ''" style="background: transparent; border: none; color: #8a909b; cursor: pointer;">✕</button>
        </div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Product name</label>
        <input v-model="editing.name" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Price (₱)</label>
        <input v-model.number="editing.price" type="number" min="0" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Quantity in stock</label>
        <input v-model.number="editing.stock" type="number" min="0" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Category</label>
        <input v-model="editing.category" class="rs-input" style="margin-bottom: 10px;" />
        <div v-if="error" style="color: #e36b6b; font-size: 12.5px; margin-bottom: 10px;">{{ error }}</div>
        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" @click="saveEdit">Save changes</button>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div v-if="confirmDelete" style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 50;">
      <div style="width: 340px; background: #13161b; border: 1px solid #232730; border-radius: 14px; padding: 24px;">
        <div style="font-weight: 800; font-size: 16px; margin-bottom: 10px;">Delete product?</div>
        <p style="font-size: 13px; color: #aab0bb; margin-bottom: 18px;">
          This removes <b>{{ confirmDelete.name }}</b> from inventory permanently. This can't be undone.
        </p>
        <div style="display: flex; gap: 8px;">
          <button class="rs-btn-secondary" style="flex: 1; justify-content: center;" @click="confirmDelete = null">Cancel</button>
          <button class="rs-btn-secondary" style="flex: 1; justify-content: center; color: #e88; border-color: #5a2424;" @click="deleteProduct(confirmDelete.id)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>
