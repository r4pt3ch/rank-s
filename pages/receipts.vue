<script setup>
const { data: products } = await useFetch("/api/products");
const { data: receipts, refresh } = await useFetch("/api/receipts");
const { data: receiptSettings } = await useFetch("/api/receipt-settings");

const name = ref("");
const selected = ref([]);
const lastReceipt = ref(null);

function addItem(p) {
  const existing = selected.value.find((i) => i.id === p.id);
  if (existing) existing.qty++;
  else selected.value.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
}
function removeItem(id) {
  selected.value = selected.value.filter((i) => i.id !== id);
}
const total = computed(() => selected.value.reduce((s, i) => s + i.price * i.qty, 0));

async function issue() {
  if (!name.value) return;
  const receipt = await $fetch("/api/receipts", { method: "POST", body: { name: name.value, items: selected.value } });
  name.value = "";
  selected.value = [];
  lastReceipt.value = receipt;
  await refresh();
}

function reprint(r) {
  lastReceipt.value = r;
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Temporary receipts</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">Issue a receipt for a member or walk-in entry fee / merchandise.</p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px;">
      <div class="rs-card">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 14px;">New receipt</div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Name</label>
        <input v-model="name" class="rs-input" placeholder="Member or walk-in name" style="margin-bottom: 14px;" />
        <div style="font-size: 12.5px; color: #8a909b; margin-bottom: 8px;">Add items</div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px;">
          <button v-for="p in products" :key="p.id" class="rs-btn-secondary" style="font-size: 11.5px; padding: 6px 10px;" @click="addItem(p)">+ {{ p.name }}</button>
        </div>
        <div v-for="i in selected" :key="i.id" class="rs-row">
          <span style="font-size: 13px;">{{ i.name }} x{{ i.qty }}</span>
          <span style="font-size: 12.5px;">₱{{ (i.price * i.qty).toLocaleString() }}</span>
          <button class="rs-btn-secondary" style="padding: 4px 8px;" @click="removeItem(i.id)">✕</button>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 14px 0 6px; font-weight: 700;">
          <span>Total</span><span>₱{{ total.toLocaleString() }}</span>
        </div>
        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" :disabled="!name" @click="issue">Issue receipt</button>
      </div>

      <div class="rs-card">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px;">Recent receipts</div>
        <div v-if="!receipts?.length" style="font-size: 13px; color: #5d6470; padding: 18px 0; text-align: center;">No receipts issued yet.</div>
        <div v-for="r in (receipts || []).slice(0, 10)" :key="r.id" style="padding: 10px 0; border-bottom: 1px solid #1c2026;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; font-size: 13px;">{{ r.name }}</span>
            <span style="font-weight: 700; font-size: 13px;">₱{{ r.total.toLocaleString() }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
            <span style="font-size: 11px; color: #7a8190;">{{ new Date(r.time).toLocaleString() }} · issued by {{ r.issuedBy }}</span>
            <button class="rs-btn-secondary" style="padding: 3px 8px; font-size: 11px;" @click="reprint(r)">Print</button>
          </div>
        </div>
      </div>
    </div>

    <PrintableReceipt v-if="lastReceipt" :receipt="lastReceipt" :settings="receiptSettings" @close="lastReceipt = null" />
  </div>
</template>
