<script setup>
const { data: checkins, refresh } = await useFetch("/api/checkins", { query: { today: "1" } });
const clearing = ref(false);
const cleared = ref(false);

let interval;
onMounted(() => {
  interval = setInterval(() => refresh(), 8000);
});
onUnmounted(() => {
  clearInterval(interval);
});

function initials(name) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

async function clearLobbyDisplay() {
  clearing.value = true;
  try {
    await $fetch("/api/lobby-reset", { method: "POST" });
    cleared.value = true;
    setTimeout(() => (cleared.value = false), 2500);
  } finally {
    clearing.value = false;
  }
}
</script>

<template>
  <div>
    <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px;">
      <div>
        <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Lobby monitor</h1>
        <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 0;">Live view of who is currently inside the gym and their rank level. Suitable for a second screen.</p>
      </div>
      <button class="rs-btn-secondary" style="font-size: 12px; padding: 7px 13px; white-space: nowrap;" :disabled="clearing" @click="clearLobbyDisplay">
        {{ clearing ? "Clearing..." : "Clear public lobby display" }}
      </button>
    </div>
    <div v-if="cleared" style="font-size: 12.5px; color: #8ee0ab; margin-bottom: 16px;">
      The public lobby board (/lobby) has been cleared. This view still shows today's full check-in history.
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
      <div v-if="!checkins?.length" style="grid-column: 1 / -1; font-size: 13px; color: #5d6470; padding: 18px 0; text-align: center;">
        No one has checked in yet today.
      </div>
      <div v-for="c in checkins" :key="c.id" class="rs-card" style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: #1c2128; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #5bb8f5;">
          {{ initials(c.name) }}
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 13.5px;">{{ c.name }}</div>
          <div style="font-size: 11px; color: #7a8190;">{{ new Date(c.time).toLocaleTimeString() }}</div>
        </div>
        <RankBadge v-if="c.rank" :rank="c.rank" />
        <span v-else style="font-size: 11px; color: #7a8190;">Walk-in</span>
      </div>
    </div>
  </div>
</template>
