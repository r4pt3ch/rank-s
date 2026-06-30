<script setup>
definePageMeta({ layout: false });

const { data: checkins, refresh } = await useFetch("/api/public/lobby");

let interval;
onMounted(() => {
  interval = setInterval(() => refresh(), 5000);
});
onUnmounted(() => clearInterval(interval));

const last = computed(() => (checkins.value || [])[0] || null);
const rest = computed(() => (checkins.value || []).slice(1, 13));

function initials(name) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}
</script>

<template>
  <div style="min-height: 100vh; background: #0a0b0d; color: #eceef2; font-family: 'Inter', system-ui, sans-serif; padding: 40px;">
    <div style="display: flex; align-items: center; gap: 18px; margin-bottom: 36px;">
      <img src="/logo.png" alt="Rank S logo" style="width: 190px; height: 190px; object-fit: contain; flex-shrink: 0;" />
      <div>
        <div style="font-weight: 800; font-size: 30px; letter-spacing: 0.8px;">RANK S — LOBBY</div>
        <div style="font-size: 14px; color: #7a818c; margin-top: 2px;">Live check-in board</div>
      </div>
    </div>

    <div v-if="!last" style="text-align: center; padding: 80px 0; color: #5d6470; font-size: 18px;">Waiting for the first check-in of the day...</div>

    <template v-else>
      <div style="background: linear-gradient(135deg, #11151c, #0d0f13); border: 1px solid #2f8fd6; border-radius: 20px; padding: 40px; margin-bottom: 36px; display: flex; align-items: center; gap: 36px;">
        <div style="width: 110px; height: 110px; border-radius: 50%; background: #1c2128; display: flex; align-items: center; justify-content: center; font-size: 38px; font-weight: 800; color: #5bb8f5; flex-shrink: 0;">
          {{ initials(last.name) }}
        </div>
        <div style="flex: 1;">
          <div style="font-size: 13px; color: #5bb8f5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Just checked in</div>
          <div style="font-size: 38px; font-weight: 800; line-height: 1.1;">{{ last.name }}</div>
          <div style="font-size: 15px; color: #aab0bb; margin-top: 6px;">{{ new Date(last.time).toLocaleTimeString() }}</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0;">
          <div v-if="last.rank" style="font-size: 11px; color: #7a8190; text-transform: uppercase; letter-spacing: 1px;">Rank</div>
          <RankBadge v-if="last.rank" :rank="last.rank" size="xl" />
          <span v-else style="font-size: 16px; color: #aab0bb; border: 1px solid #2a2f38; border-radius: 10px; padding: 14px 22px; font-weight: 700;">Walk-in</span>
        </div>
      </div>

      <div style="font-size: 13px; color: #7a8190; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;">Recent arrivals</div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
        <div v-for="c in rest" :key="c.id" style="background: #13161b; border: 1px solid #1f242c; border-radius: 14px; padding: 16px; display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: #1c2128; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #5bb8f5; flex-shrink: 0;">
            {{ initials(c.name) }}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ c.name }}</div>
            <div style="font-size: 11px; color: #7a8190;">{{ new Date(c.time).toLocaleTimeString() }}</div>
          </div>
          <RankBadge v-if="c.rank" :rank="c.rank" size="lg" />
          <span v-else style="font-size: 11px; color: #7a8190; font-weight: 600;">Walk-in</span>
        </div>
      </div>
    </template>
  </div>
</template>
