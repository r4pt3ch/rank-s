<script setup>
const { user } = useAuth();
const { data, refresh } = await useFetch("/api/settings");
const { data: receiptData } = await useFetch("/api/receipt-settings");

// Gym settings
const pointsPerCheckIn    = ref(data.value?.pointsPerCheckIn ?? 20);
const walkInFeeStudent    = ref(data.value?.walkInFeeStudent ?? 40);
const walkInFeeNonStudent = ref(data.value?.walkInFeeNonStudent ?? 60);
const lobbyAutoClearEnabled = ref(data.value?.lobbyAutoClearEnabled ?? false);
const lobbyDisplayMinutes   = ref(data.value?.lobbyDisplayMinutes ?? 60);
const utcOffset             = ref(data.value?.utcOffset ?? 8);

// Receipt settings
const form = ref({ ...receiptData.value });

const saved = ref("");
const error = ref("");
const clearing = ref(false);
const cleared = ref(false);
const clearingReports = ref(false);
const reportsCleared = ref(false);
const confirmClearReports = ref(false);

async function saveGym() {
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
    saved.value = "gym";
    setTimeout(() => (saved.value = ""), 2000);
  } catch (e) { error.value = e.data?.statusMessage || "Could not save."; }
}

async function saveReceipt() {
  error.value = "";
  try {
    await $fetch("/api/receipt-settings", { method: "PUT", body: form.value });
    saved.value = "receipt";
    setTimeout(() => (saved.value = ""), 2000);
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

async function clearReportsData() {
  clearingReports.value = true;
  try {
    await $fetch("/api/clear-reports", { method: "POST" });
    reportsCleared.value = true;
    confirmClearReports.value = false;
    setTimeout(() => (reportsCleared.value = false), 4000);
  } finally { clearingReports.value = false; }
}

const receiptToggles = [
  { key: "showLogo",         label: "Gym logo" },
  { key: "showAddress",      label: "Address" },
  { key: "showPhone",        label: "Phone number" },
  { key: "showReceiptNumber",label: "Receipt number" },
  { key: "showDateTime",     label: "Date and time" },
  { key: "showCashier",      label: "Cashier name" },
  { key: "showItemizedList", label: "Itemized list" },
  { key: "showFooterMessage",label: "Footer message" },
];
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Settings</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">Gym-wide configuration and receipt printing options.</p>

    <!-- Section: Gym settings -->
    <div style="font-size: 11px; font-weight: 700; color: #5d6470; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px;">Gym settings</div>
    <div class="rs-card" style="max-width: 500px; margin-bottom: 18px;">
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Time zone</div>
      <p style="font-size: 12.5px; color: #8a909b; margin: 0 0 12px;">Used to determine "today" for check-ins, the dashboard, and daily reports. Set to match your gym's local time.</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
        <div>
          <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">UTC offset (hours)</label>
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
            <option :value="8">UTC+8 (Manila / Singapore / Beijing)</option>
            <option :value="9">UTC+9 (Tokyo / Seoul)</option>
            <option :value="10">UTC+10 (Sydney)</option>
            <option :value="11">UTC+11 (Noumea)</option>
            <option :value="12">UTC+12 (Auckland)</option>
          </select>
        </div>
        <div style="padding-top:24px; font-size:12.5px; color:#aab0bb;">
          Current local time: <b>{{ new Date(Date.now() + utcOffset * 3600000).toISOString().replace("T", " ").slice(0, 16) }}</b>
        </div>
      </div>

      <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Points per check-in</div>
      <p style="font-size: 12.5px; color: #8a909b; margin: 0 0 10px;">Points earned by a member each time they check in.</p>
      <input v-model.number="pointsPerCheckIn" type="number" min="0" class="rs-input" style="margin-bottom: 20px;" />

      <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Walk-in entrance fees</div>
      <p style="font-size: 12.5px; color: #8a909b; margin: 0 0 12px;">Applied to walk-ins and members with an expired subscription until they renew.</p>
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
      <p style="font-size: 12.5px; color: #8a909b; margin: 0 0 12px;">How long check-ins stay on the public board (<code>/lobby</code>).</p>
      <label style="display:flex; align-items:center; gap:10px; margin-bottom:12px; cursor:pointer;">
        <input type="checkbox" v-model="lobbyAutoClearEnabled" style="width:16px; height:16px;" />
        <span style="font-size:13px;">Auto-clear old check-ins from the lobby board</span>
      </label>
      <div v-if="lobbyAutoClearEnabled" style="margin-bottom:16px;">
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Display duration (minutes)</label>
        <input v-model.number="lobbyDisplayMinutes" type="number" min="1" class="rs-input" />
        <div style="font-size:11.5px; color:#5d6470; margin-top:6px;">Check-ins older than this disappear automatically. They stay in Reports.</div>
      </div>

      <div v-if="error" style="color:#e36b6b; font-size:12.5px; margin-bottom:10px;">{{ error }}</div>
      <button class="rs-btn-primary" style="width:100%; justify-content:center;" @click="saveGym">Save gym settings</button>
      <div v-if="saved === 'gym'" style="margin-top:10px; font-size:12.5px; color:#8ee0ab; text-align:center;">Settings saved.</div>

      <div style="border-top:1px solid #1c2026; padding-top:14px; margin-top:18px;">
        <div style="font-size:12.5px; color:#8a909b; margin-bottom:10px;">Clear the lobby board immediately without deleting any records.</div>
        <button class="rs-btn-secondary" style="width:100%; justify-content:center;" :disabled="clearing" @click="clearLobbyNow">
          {{ clearing ? "Clearing..." : "Clear lobby display now" }}
        </button>
        <div v-if="cleared" style="margin-top:10px; font-size:12.5px; color:#8ee0ab; text-align:center;">Lobby display cleared.</div>
      </div>
    </div>

    <!-- Section: Receipt settings -->
    <div style="font-size: 11px; font-weight: 700; color: #5d6470; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px;">Receipt settings</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; max-width: 760px; margin-bottom: 18px;">
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
        <div v-for="t in receiptToggles" :key="t.key" class="rs-row">
          <span style="font-size:13px;">{{ t.label }}</span>
          <input type="checkbox" v-model="form[t.key]" style="width:16px; height:16px;" />
        </div>
        <button class="rs-btn-primary" style="width:100%; justify-content:center; margin-top:16px;" @click="saveReceipt">Save receipt settings</button>
        <div v-if="saved === 'receipt'" style="margin-top:10px; font-size:12.5px; color:#8ee0ab; text-align:center;">Receipt settings saved.</div>
      </div>
    </div>

    <!-- Section: Danger zone (super admin only) -->
    <template v-if="user?.role === 'superadmin'">
      <div style="font-size: 11px; font-weight: 700; color: #5d6470; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px;">Danger zone</div>
      <div class="rs-card" style="max-width: 500px; border-color: #5a2424;">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px; color: #e88;">Clear report data</div>
        <p style="font-size: 12.5px; color: #8a909b; margin: 0 0 16px;">Permanently deletes all check-in records and receipts. Cannot be undone. Member accounts, plans, and settings are not affected.</p>
        <div v-if="reportsCleared" style="font-size:13px; color:#8ee0ab; margin-bottom:12px;">All report data has been cleared.</div>
        <template v-if="!confirmClearReports">
          <button class="rs-btn-secondary" style="width:100%; justify-content:center; color:#e88; border-color:#5a2424;" @click="confirmClearReports=true">Clear all report data</button>
        </template>
        <template v-else>
          <div style="font-size:13px; color:#e88; font-weight:600; margin-bottom:12px;">Are you sure? This will permanently delete all check-ins and receipts.</div>
          <div style="display:flex; gap:8px;">
            <button class="rs-btn-secondary" style="flex:1; justify-content:center;" @click="confirmClearReports=false">Cancel</button>
            <button class="rs-btn-secondary" style="flex:1; justify-content:center; color:#e88; border-color:#5a2424;" :disabled="clearingReports" @click="clearReportsData">
              {{ clearingReports ? "Clearing..." : "Yes, delete everything" }}
            </button>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
