<script setup>
const { user } = useAuth();
const { data, refresh } = await useFetch("/api/settings");

const pointsPerCheckIn    = ref(data.value?.pointsPerCheckIn ?? 20);
const walkInFeeStudent    = ref(data.value?.walkInFeeStudent ?? 40);
const walkInFeeNonStudent = ref(data.value?.walkInFeeNonStudent ?? 60);
const lobbyAutoClearEnabled = ref(data.value?.lobbyAutoClearEnabled ?? false);
const lobbyDisplayMinutes   = ref(data.value?.lobbyDisplayMinutes ?? 60);
const utcOffset             = ref(data.value?.utcOffset ?? 8);

const saved    = ref(false);
const error    = ref("");
const clearing = ref(false);
const cleared  = ref(false);

async function save() {
  error.value = "";
  try {
    await $fetch("/api/settings", {
      method: "PUT",
      body: {
        pointsPerCheckIn: pointsPerCheckIn.value,
        walkInFeeStudent: walkInFeeStudent.value,
        walkInFeeNonStudent: walkInFeeNonStudent.value,
        lobbyAutoClearEnabled: lobbyAutoClearEnabled.value,
        lobbyDisplayMinutes: lobbyDisplayMinutes.value,
        utcOffset: utcOffset.value,
      },
    });
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
  } catch (e) { error.value = e.data?.statusMessage || "Could not save."; }
}

async function clearLobbyNow() {
  clearing.value = true;
  try {
    await $fetch("/api/lobby-reset", { method: "POST" });
    cleared.value = true;
    await refresh();
    setTimeout(() => (cleared.value = false), 2500);
  } finally { clearing.value = false; }
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Gym settings</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">Configure gym-wide defaults — timezone, points, walk-in fees, and lobby display.</p>

    <div class="rs-card" style="max-width: 500px; margin-bottom: 18px;">
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Time zone</div>
      <p style="font-size: 12.5px; color: #8a909b; margin: 0 0 12px;">Used for the daily check-in reset, dashboard, and report periods.</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
        <div>
          <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">UTC offset</label>
          <select v-model.number="utcOffset" class="rs-input">
            <option :value="-12">UTC-12</option>
            <option :value="-11">UTC-11</option>
            <option :value="-10">UTC-10 (Hawaii)</option>
            <option :value="-9">UTC-9 (Alaska)</option>
            <option :value="-8">UTC-8 (Los Angeles)</option>
            <option :value="-7">UTC-7 (Denver)</option>
            <option :value="-6">UTC-6 (Chicago)</option>
            <option :value="-5">UTC-5 (New York)</option>
            <option :value="-4">UTC-4 (Atlantic)</option>
            <option :value="-3">UTC-3 (São Paulo)</option>
            <option :value="0">UTC+0 (London)</option>
            <option :value="1">UTC+1 (Paris)</option>
            <option :value="2">UTC+2 (Cairo)</option>
            <option :value="3">UTC+3 (Moscow)</option>
            <option :value="4">UTC+4 (Dubai)</option>
            <option :value="5">UTC+5 (Karachi)</option>
            <option :value="5.5">UTC+5:30 (Mumbai)</option>
            <option :value="6">UTC+6 (Dhaka)</option>
            <option :value="7">UTC+7 (Bangkok)</option>
            <option :value="8">UTC+8 (Manila / Singapore)</option>
            <option :value="9">UTC+9 (Tokyo / Seoul)</option>
            <option :value="10">UTC+10 (Sydney)</option>
            <option :value="11">UTC+11 (Noumea)</option>
            <option :value="12">UTC+12 (Auckland)</option>
          </select>
        </div>
        <div style="padding-top:24px; font-size:12.5px; color:#aab0bb;">
          Current local time: <b>{{ new Date(Date.now() + utcOffset * 3600000).toISOString().replace("T"," ").slice(0,16) }}</b>
        </div>
      </div>

      <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Points per check-in</div>
      <p style="font-size: 12.5px; color: #8a909b; margin: 0 0 10px;">Points earned by a member each time they check in.</p>
      <input v-model.number="pointsPerCheckIn" type="number" min="0" class="rs-input" style="margin-bottom: 20px;" />

      <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Walk-in entrance fees</div>
      <p style="font-size: 12.5px; color: #8a909b; margin: 0 0 12px;">Applied to walk-ins and members with an expired subscription.</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
        <div>
          <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Student (₱)</label>
          <input v-model.number="walkInFeeStudent" type="number" min="0" class="rs-input" />
        </div>
        <div>
          <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Non-student (₱)</label>
          <input v-model.number="walkInFeeNonStudent" type="number" min="0" class="rs-input" />
        </div>
      </div>

      <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Lobby display</div>
      <p style="font-size: 12.5px; color: #8a909b; margin: 0 0 12px;">How long check-ins stay on the public lobby board.</p>
      <label style="display:flex; align-items:center; gap:10px; margin-bottom:12px; cursor:pointer;">
        <input type="checkbox" v-model="lobbyAutoClearEnabled" style="width:16px; height:16px;" />
        <span style="font-size:13px;">Auto-clear old check-ins from the lobby board</span>
      </label>
      <div v-if="lobbyAutoClearEnabled" style="margin-bottom:16px;">
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Display duration (minutes)</label>
        <input v-model.number="lobbyDisplayMinutes" type="number" min="1" class="rs-input" />
      </div>

      <div v-if="error" style="color:#e36b6b; font-size:12.5px; margin-bottom:10px;">{{ error }}</div>
      <button class="rs-btn-primary" style="width:100%; justify-content:center;" @click="save">Save settings</button>
      <div v-if="saved" style="margin-top:10px; font-size:12.5px; color:#8ee0ab; text-align:center;">Settings saved.</div>

      <div style="border-top:1px solid #1c2026; padding-top:14px; margin-top:18px;">
        <div style="font-size:12.5px; color:#8a909b; margin-bottom:10px;">Clear the lobby board immediately without deleting any records.</div>
        <button class="rs-btn-secondary" style="width:100%; justify-content:center;" :disabled="clearing" @click="clearLobbyNow">
          {{ clearing ? "Clearing..." : "Clear lobby display now" }}
        </button>
        <div v-if="cleared" style="margin-top:10px; font-size:12.5px; color:#8ee0ab; text-align:center;">Lobby display cleared.</div>
      </div>
    </div>
  </div>
</template>
