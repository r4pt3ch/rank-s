<script setup>
const { data, refresh } = await useFetch("/api/settings");
const pointsPerCheckIn = ref(data.value?.pointsPerCheckIn ?? 20);
const walkInFee = ref(data.value?.walkInFee ?? 50);
const lobbyAutoClearEnabled = ref(data.value?.lobbyAutoClearEnabled ?? false);
const lobbyDisplayMinutes = ref(data.value?.lobbyDisplayMinutes ?? 60);

const saved = ref(false);
const error = ref("");
const clearing = ref(false);
const cleared = ref(false);

async function save() {
  error.value = "";
  try {
    await $fetch("/api/settings", {
      method: "PUT",
      body: {
        pointsPerCheckIn: pointsPerCheckIn.value,
        walkInFee: walkInFee.value,
        lobbyAutoClearEnabled: lobbyAutoClearEnabled.value,
        lobbyDisplayMinutes: lobbyDisplayMinutes.value,
      },
    });
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
  } catch (e) {
    error.value = e.data?.statusMessage || "Could not save settings.";
  }
}

async function clearLobbyNow() {
  clearing.value = true;
  try {
    await $fetch("/api/lobby-reset", { method: "POST" });
    cleared.value = true;
    await refresh();
    setTimeout(() => (cleared.value = false), 2500);
  } finally {
    clearing.value = false;
  }
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Settings</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">Configure gym-wide behavior.</p>

    <div class="rs-card" style="max-width: 460px; margin-bottom: 18px;">
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

    <div class="rs-card" style="max-width: 460px;">
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Lobby display</div>
      <p style="font-size: 12.5px; color: #8a909b; margin: 0 0 16px;">
        Control how long check-ins stay visible on the public lobby board (<code>/lobby</code>), and clear it on demand.
      </p>

      <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; cursor: pointer;">
        <input type="checkbox" v-model="lobbyAutoClearEnabled" style="width: 16px; height: 16px;" />
        <span style="font-size: 13px;">Automatically clear old check-ins from the board</span>
      </label>

      <div v-if="lobbyAutoClearEnabled" style="margin-bottom: 16px;">
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Display duration (minutes)</label>
        <input v-model.number="lobbyDisplayMinutes" type="number" min="1" class="rs-input" />
        <div style="font-size: 11.5px; color: #5d6470; margin-top: 6px;">Check-ins older than this disappear from the lobby board automatically. They stay in Reports and the audit trail regardless.</div>
      </div>

      <button class="rs-btn-primary" style="width: 100%; justify-content: center; margin-bottom: 16px;" @click="save">Save settings</button>

      <div style="border-top: 1px solid #1c2026; padding-top: 16px;">
        <div style="font-size: 12.5px; color: #8a909b; margin-bottom: 10px;">
          Clear the lobby board right now — useful at the start of a new day or after testing. This doesn't delete any check-in records.
        </div>
        <button class="rs-btn-secondary" style="width: 100%; justify-content: center;" :disabled="clearing" @click="clearLobbyNow">
          {{ clearing ? "Clearing..." : "Clear lobby display now" }}
        </button>
        <div v-if="cleared" style="margin-top: 10px; font-size: 12.5px; color: #8ee0ab; text-align: center;">Lobby display cleared.</div>
      </div>
    </div>
  </div>
</template>
