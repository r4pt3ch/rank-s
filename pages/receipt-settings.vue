<script setup>
const { data } = await useFetch("/api/receipt-settings");
const form = ref({ ...data.value });
const saved = ref(false);
const error = ref("");

async function save() {
  error.value = "";
  try {
    await $fetch("/api/receipt-settings", { method: "PUT", body: form.value });
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
  } catch (e) {
    error.value = e.data?.statusMessage || "Could not save receipt settings.";
  }
}

const toggles = [
  { key: "showLogo", label: "Gym logo" },
  { key: "showAddress", label: "Address" },
  { key: "showPhone", label: "Phone number" },
  { key: "showReceiptNumber", label: "Receipt number" },
  { key: "showDateTime", label: "Date and time" },
  { key: "showCashier", label: "Cashier name" },
  { key: "showItemizedList", label: "Itemized list of products" },
  { key: "showFooterMessage", label: "Footer message" },
];
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Receipt settings</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">Control what's included on printed receipts for POS sales and walk-in / member transactions.</p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px;">
      <div class="rs-card">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 14px;">Gym details</div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Gym name</label>
        <input v-model="form.gymName" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Address</label>
        <input v-model="form.address" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Phone</label>
        <input v-model="form.phone" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Footer message</label>
        <input v-model="form.footerMessage" class="rs-input" placeholder="Thank you for training with us!" />
      </div>

      <div class="rs-card">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 14px;">What to print</div>
        <div v-for="t in toggles" :key="t.key" class="rs-row">
          <span style="font-size: 13px;">{{ t.label }}</span>
          <input type="checkbox" v-model="form[t.key]" style="width: 16px; height: 16px;" />
        </div>
        <div v-if="error" style="color: #e36b6b; font-size: 12.5px; margin-top: 12px;">{{ error }}</div>
        <button class="rs-btn-primary" style="width: 100%; justify-content: center; margin-top: 16px;" @click="save">Save receipt settings</button>
        <div v-if="saved" style="margin-top: 10px; font-size: 12.5px; color: #8ee0ab; text-align: center;">Receipt settings saved.</div>
      </div>
    </div>
  </div>
</template>
