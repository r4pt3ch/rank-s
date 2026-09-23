<script setup>
const { user } = useAuth();
if (user.value?.role !== "superadmin") await navigateTo("/");

const clearing = ref(false);
const cleared  = ref(false);
const confirm  = ref(false);
const error    = ref("");

async function clearData() {
  clearing.value = true;
  error.value = "";
  try {
    const result = await $fetch("/api/clear-reports", { method: "POST" });
    cleared.value = true;
    confirm.value = false;
    setTimeout(() => (cleared.value = false), 5000);
  } catch (e) {
    error.value = e.data?.statusMessage || "Could not clear data.";
  } finally {
    clearing.value = false;
  }
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: #e88;">Clear report data</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">Super admin only. Permanently deletes all check-in records and receipts. Member accounts, plans, and settings are not affected.</p>

    <div class="rs-card" style="max-width: 500px; border-color: #5a2424;">
      <div style="font-size: 13.5px; color: #aab0bb; margin-bottom: 16px; line-height: 1.6;">
        This action will permanently erase:
        <ul style="margin: 8px 0 0 18px; color: #e88;">
          <li>All check-in records</li>
          <li>All receipts (visit fees, services, memberships)</li>
        </ul>
        <div style="margin-top: 10px;">Reports will be empty after this. <b>This cannot be undone.</b></div>
      </div>

      <div v-if="cleared" style="font-size:13px; color:#8ee0ab; margin-bottom:16px; padding:12px; background:#142a1e; border:1px solid #245a34; border-radius:8px;">
        All report data has been cleared successfully.
      </div>

      <div v-if="error" style="color:#e36b6b; font-size:12.5px; margin-bottom:12px;">{{ error }}</div>

      <template v-if="!confirm">
        <button class="rs-btn-secondary" style="width:100%; justify-content:center; color:#e88; border-color:#5a2424;" @click="confirm=true">
          Clear all report data
        </button>
      </template>
      <template v-else>
        <div style="font-size:14px; font-weight:700; color:#e88; margin-bottom:14px; text-align:center;">
          Are you absolutely sure?
        </div>
        <div style="display:flex; gap:8px;">
          <button class="rs-btn-secondary" style="flex:1; justify-content:center;" @click="confirm=false">Cancel</button>
          <button class="rs-btn-secondary"
            style="flex:1; justify-content:center; color:#e88; border-color:#5a2424;"
            :disabled="clearing"
            @click="clearData">
            {{ clearing ? "Clearing..." : "Yes, delete everything" }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
