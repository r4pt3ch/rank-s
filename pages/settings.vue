<script setup>
const { data } = await useFetch("/api/settings");
const pointsPerCheckIn = ref(data.value?.pointsPerCheckIn ?? 20);
const walkInFee = ref(data.value?.walkInFee ?? 50);
const saved = ref(false);
const error = ref("");

async function save() {
  error.value = "";
  try {
    await $fetch("/api/settings", { method: "PUT", body: { pointsPerCheckIn: pointsPerCheckIn.value, walkInFee: walkInFee.value } });
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
  } catch (e) {
    error.value = e.data?.statusMessage || "Could not save settings.";
  }
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Settings</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">Configure gym-wide behavior.</p>

    <div class="rs-card" style="max-width: 420px;">
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Points per check-in</div>
      <p style="font-size: 12.5px; color: #8a909b; margin: 0 0 14px;">
        How many points a gym member earns every time they check in, whether by search, PIN, QR code, or barcode.
      </p>
      <input v-model.number="pointsPerCheckIn" type="number" min="0" class="rs-input" style="margin-bottom: 20px;" />

      <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Walk-in entrance fee</div>
      <p style="font-size: 12.5px; color: #8a909b; margin: 0 0 14px;">
        The flat fee charged to a walk-in guest each time they check in. This also applies to members whose membership has expired and haven't renewed.
      </p>
      <input v-model.number="walkInFee" type="number" min="0" class="rs-input" style="margin-bottom: 16px;" />

      <div v-if="error" style="color: #e36b6b; font-size: 12.5px; margin-bottom: 12px;">{{ error }}</div>
      <button class="rs-btn-primary" style="width: 100%; justify-content: center;" @click="save">Save settings</button>
      <div v-if="saved" style="margin-top: 10px; font-size: 12.5px; color: #8ee0ab; text-align: center;">Settings saved.</div>
    </div>
  </div>
</template>
