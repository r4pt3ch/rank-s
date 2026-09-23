<script setup>
const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  total: { type: Number, default: 0 },
  perPage: { type: Number, default: 20 },
});
const emit = defineEmits(["prev", "next"]);
const from = computed(() => ((props.page - 1) * props.perPage) + 1);
const to   = computed(() => Math.min(props.page * props.perPage, props.total));
</script>

<template>
  <div v-if="totalPages > 1" style="display:flex; align-items:center; justify-content:space-between; padding:12px 18px; border-top:1px solid #1c2026; font-size:12.5px; color:#7a8190;">
    <span>{{ from }}–{{ to }} of {{ total }}</span>
    <div style="display:flex; gap:6px;">
      <button class="rs-btn-secondary" style="padding:5px 12px; font-size:12px;" :disabled="page <= 1" @click="emit('prev')">← Prev</button>
      <span style="padding:5px 10px; font-size:12px;">{{ page }} / {{ totalPages }}</span>
      <button class="rs-btn-secondary" style="padding:5px 12px; font-size:12px;" :disabled="page >= totalPages" @click="emit('next')">Next →</button>
    </div>
  </div>
</template>
