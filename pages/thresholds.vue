<script setup>
const { data: thresholds } = await useFetch("/api/thresholds");
const RANKS = ["F", "E", "D", "C", "B", "A", "S", "SS", "SSS"];
const local = ref({ ...thresholds.value });
const saved = ref(false);

async function save() {
  await $fetch("/api/thresholds", { method: "PUT", body: local.value });
  saved.value = true;
  setTimeout(() => (saved.value = false), 2000);
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Rank thresholds</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">Set how many points a member needs to reach each rank, from F up to SSS.</p>

    <div class="rs-card" style="max-width: 480px;">
      <div v-for="r in RANKS" :key="r" style="display: flex; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px solid #1c2026;">
        <RankBadge :rank="r" />
        <input v-model.number="local[r]" type="number" class="rs-input" style="width: 100px;" />
        <span style="font-size: 12px; color: #7a8190;">points required</span>
      </div>
      <button class="rs-btn-primary" style="margin-top: 16px; width: 100%; justify-content: center;" @click="save">Save thresholds</button>
      <div v-if="saved" style="margin-top: 10px; font-size: 12.5px; color: #8ee0ab; text-align: center;">Thresholds saved.</div>
    </div>
  </div>
</template>
