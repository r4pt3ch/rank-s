<script setup>
const props = defineProps({
  receipt: { type: Object, required: true },
  settings: { type: Object, required: true },
});
const emit = defineEmits(["close"]);

const receiptNo = computed(() => (props.receipt.id ? props.receipt.id.slice(-6).toUpperCase() : ""));
const dateTime = computed(() => new Date(props.receipt.time || Date.now()).toLocaleString());

function doPrint() {
  window.print();
}
</script>

<template>
  <div class="rs-print-overlay">
    <div class="rs-print-sheet">
      <div class="rs-print-actions">
        <button class="rs-btn-secondary" @click="emit('close')">Close</button>
        <button class="rs-btn-primary" @click="doPrint">Print receipt</button>
      </div>

      <div class="rs-receipt" id="rs-receipt-area">
        <div style="text-align: center; margin-bottom: 10px;">
          <img v-if="settings.showLogo" src="/logo.png" alt="logo" style="width: 48px; height: 48px; object-fit: contain; margin: 0 auto 6px;" />
          <div style="font-weight: 800; font-size: 15px;">{{ settings.gymName }}</div>
          <div v-if="settings.showAddress && settings.address" style="font-size: 11px; color: #555;">{{ settings.address }}</div>
          <div v-if="settings.showPhone && settings.phone" style="font-size: 11px; color: #555;">{{ settings.phone }}</div>
        </div>

        <div style="border-top: 1px dashed #888; margin: 10px 0;"></div>

        <div v-if="settings.showReceiptNumber" style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">
          <span>Receipt no.</span><span>{{ receiptNo }}</span>
        </div>
        <div v-if="settings.showDateTime" style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">
          <span>Date</span><span>{{ dateTime }}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">
          <span>Customer</span><span>{{ receipt.name }}</span>
        </div>
        <div v-if="settings.showCashier && receipt.issuedBy" style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">
          <span>Cashier</span><span>{{ receipt.issuedBy }}</span>
        </div>

        <div style="border-top: 1px dashed #888; margin: 10px 0;"></div>

        <div v-if="settings.showItemizedList && receipt.items?.length">
          <div v-for="(i, idx) in receipt.items" :key="idx" style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 3px;">
            <span>{{ i.name }} x{{ i.qty }}</span>
            <span>₱{{ (i.price * i.qty).toLocaleString() }}</span>
          </div>
          <div style="border-top: 1px dashed #888; margin: 10px 0;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 13px;">
          <span>Total</span><span>₱{{ receipt.total.toLocaleString() }}</span>
        </div>

        <div v-if="settings.showFooterMessage && settings.footerMessage" style="text-align: center; font-size: 11px; color: #555; margin-top: 14px;">
          {{ settings.footerMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.rs-print-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}
.rs-print-sheet {
  background: #1a1d23;
  border: 1px solid #2a2f38;
  border-radius: 14px;
  padding: 18px;
  width: 320px;
}
.rs-print-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.rs-print-actions button {
  flex: 1;
  justify-content: center;
}
.rs-receipt {
  background: #fff;
  color: #111;
  padding: 16px;
  border-radius: 6px;
  font-family: "Courier New", monospace;
}

@media print {
  body * {
    visibility: hidden;
  }
  .rs-receipt,
  .rs-receipt * {
    visibility: visible;
  }
  .rs-receipt {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }
  .rs-print-actions {
    display: none;
  }
}
</style>
