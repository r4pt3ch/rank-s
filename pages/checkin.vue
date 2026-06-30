<script setup>
const { data: members } = await useFetch("/api/members");
const { data: checkins, refresh } = await useFetch("/api/checkins", { query: { today: "1" } });

const search = ref("");
const pinInput = ref("");
const feedback = ref(null);

const matches = computed(() =>
  search.value ? (members.value || []).filter((m) => m.name.toLowerCase().includes(search.value.toLowerCase())) : []
);

function feeText(result) {
  if (!result.fee) return "";
  if (result.expiredBilling) return ` Membership expired — billed as walk-in: ₱${result.fee}.`;
  return ` Fee charged: ₱${result.fee}.`;
}

async function checkInMember(member) {
  try {
    const result = await $fetch("/api/checkins", { method: "POST", body: { memberId: member.id } });
    feedback.value = {
      ok: true,
      text: `${result.name} checked in.${result.leveledUp ? ` Leveled up to ${result.rank}!` : ""}${feeText(result)}`,
    };
    search.value = "";
    await refresh();
  } catch (e) {
    feedback.value = { ok: false, text: e.data?.statusMessage || "Check-in failed." };
  }
}

async function checkInByPin() {
  try {
    const result = await $fetch("/api/checkins", { method: "POST", body: { pin: pinInput.value } });
    feedback.value = {
      ok: true,
      text: `${result.name} checked in.${result.leveledUp ? ` Leveled up to ${result.rank}!` : ""}${feeText(result)}`,
    };
    pinInput.value = "";
    await refresh();
  } catch (e) {
    feedback.value = { ok: false, text: e.data?.statusMessage || "No member found with that PIN." };
  }
}

async function checkInWalkIn() {
  const result = await $fetch("/api/checkins", { method: "POST", body: { name: "Walk-in guest" } });
  feedback.value = { ok: true, text: `Walk-in guest logged.${feeText(result)}` };
  await refresh();
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Check-in</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">Scan or search to log members and walk-ins coming into the gym. Visit fees are billed and recorded as sales automatically.</p>

    <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 18px;">
      <div class="rs-card">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px;">Find member</div>
        <input v-model="search" class="rs-input" placeholder="Search by name (simulates QR / barcode scan)..." style="margin-bottom: 12px;" />
        <div v-for="m in matches" :key="m.id" class="rs-row">
          <span style="font-size: 13.5px; font-weight: 600;">{{ m.name }}</span>
          <span style="font-size: 12px; color: #7a8190;">{{ m.points }} pts</span>
          <button class="rs-btn-secondary" @click="checkInMember(m)">Check in</button>
        </div>

        <div style="border-top: 1px solid #1c2026; margin-top: 16px; padding-top: 16px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 10px;">Or enter 4-digit PIN</div>
          <div style="display: flex; gap: 10px;">
            <input v-model="pinInput" maxlength="4" class="rs-input" placeholder="0000" style="width: 110px;" />
            <button class="rs-btn-primary" @click="checkInByPin">Check in</button>
          </div>
        </div>

        <div style="border-top: 1px solid #1c2026; margin-top: 16px; padding-top: 16px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 10px;">Walk-in guest</div>
          <button class="rs-btn-secondary" @click="checkInWalkIn">Log walk-in</button>
        </div>

        <div
          v-if="feedback"
          style="margin-top: 16px; padding: 14px; border-radius: 10px;"
          :style="{ background: feedback.ok ? '#142a1e' : '#2a1414', border: `1px solid ${feedback.ok ? '#245a34' : '#5a2424'}` }"
        >
          <span :style="{ color: feedback.ok ? '#8ee0ab' : '#e88', fontSize: '13px' }">{{ feedback.text }}</span>
        </div>
      </div>

      <div class="rs-card">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px;">Today's log ({{ checkins?.length || 0 }})</div>
        <div v-if="!checkins?.length" style="font-size: 13px; color: #5d6470; padding: 18px 0; text-align: center;">No check-ins yet.</div>
        <div v-for="c in checkins" :key="c.id" style="display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #1c2026;">
          <span style="font-size: 13.5px; font-weight: 600; flex: 1;">{{ c.name }}</span>
          <span v-if="c.expiredBilling" style="font-size: 10.5px; color: #e88; border: 1px solid #5a2424; border-radius: 5px; padding: 2px 6px;">expired</span>
          <span style="font-size: 12px; color: #5bb8f5;">₱{{ c.fee }}</span>
          <span style="font-size: 12px; color: #7a8190;">{{ new Date(c.time).toLocaleTimeString() }}</span>
          <RankBadge v-if="c.rank" :rank="c.rank" size="sm" />
          <span v-else style="font-size: 11px; color: #7a8190;">Walk-in</span>
        </div>
      </div>
    </div>
  </div>
</template>
