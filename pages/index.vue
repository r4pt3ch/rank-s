<script setup>
const { user } = useAuth();
if (user.value?.role === "member") {
  await navigateTo("/profile");
}

const { data: members } = await useFetch("/api/members");
const { data: checkins, refresh: refreshCheckins } = await useFetch("/api/checkins", { query: { today: "1" } });
const { data: notifications, refresh: refreshNotifications } = await useFetch("/api/notifications");
const { data: voidRequests } = await useFetch("/api/void-requests");
const { data: receiptVoidRequests } = await useFetch("/api/receipt-void-requests");
const totalVoidsPending = computed(() => (voidRequests.value?.length || 0) + (receiptVoidRequests.value?.length || 0));

const reportable = computed(() => (checkins.value || []).filter((c) => !c.duplicateVisit && !c.voided));
const walkins = computed(() => reportable.value.filter((c) => c.type === "walkin").length);
const memberVisits = computed(() => reportable.value.filter((c) => c.type === "member").length);

const dismissedExpired = ref(false);
const dismissedExpiring = ref(false);
const activityCleared = ref(false);

async function resetDashboard() {
  dismissedExpired.value = false;
  dismissedExpiring.value = false;
  activityCleared.value = false;
  await Promise.all([refreshCheckins(), refreshNotifications()]);
}
</script>

<template>
  <div>
    <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px;">
      <div>
        <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Welcome back, {{ user?.name?.split(" ")[0] }}</h1>
        <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 0;">Today's overview of who's in the gym.</p>
      </div>
      <button class="rs-btn-secondary" style="font-size: 12px; padding: 7px 13px;" @click="resetDashboard">Reset view</button>
    </div>

    <div
      v-if="user?.role === 'superadmin' && totalVoidsPending > 0"
      style="background: #2a1a2a; border: 1px solid #7a2474; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; font-size: 13px; color: #e8a8e8; display: flex; align-items: flex-start; gap: 10px;"
    >
      <div style="flex: 1;">
        {{ totalVoidsPending }} void request{{ totalVoidsPending > 1 ? "s" : "" }} pending your approval
        <span v-if="voidRequests?.length"> ({{ voidRequests.length }} check-in<span v-if="voidRequests.length > 1">s</span>)</span>
        <span v-if="receiptVoidRequests?.length"> ({{ receiptVoidRequests.length }} sale<span v-if="receiptVoidRequests.length > 1">s</span>)</span>.
        <NuxtLink to="/checkin" v-if="voidRequests?.length" style="color: #e8a8e8; text-decoration: underline; margin-left:4px;">Check-in →</NuxtLink>
        <NuxtLink to="/reports" v-if="receiptVoidRequests?.length" style="color: #e8a8e8; text-decoration: underline; margin-left:4px;">Reports →</NuxtLink>
      </div>
    </div>

    <div
      v-if="notifications?.expired?.length && !dismissedExpired"
      style="background: #2a1414; border: 1px solid #5a2424; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; font-size: 13px; color: #f3a8a8; display: flex; align-items: flex-start; gap: 10px;"
    >
      <div style="flex: 1;">
        {{ notifications.expired.length }} membership{{ notifications.expired.length > 1 ? "s" : "" }} expired:
        {{ notifications.expired.slice(0, 4).map((m) => m.name).join(", ") }}{{ notifications.expired.length > 4 ? ", and more" : "" }}.
        They'll be billed as walk-ins until renewed.
        <NuxtLink to="/members" style="color: #f3a8a8; text-decoration: underline;">Review members →</NuxtLink>
      </div>
      <button @click="dismissedExpired = true" style="background: transparent; border: none; color: #f3a8a8; cursor: pointer; font-size: 14px; line-height: 1;">✕</button>
    </div>
    <div
      v-if="notifications?.expiringSoon?.length && !dismissedExpiring"
      style="background: #2a2414; border: 1px solid #5a4f24; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; font-size: 13px; color: #f3d8a8; display: flex; align-items: flex-start; gap: 10px;"
    >
      <div style="flex: 1;">
        {{ notifications.expiringSoon.length }} membership{{ notifications.expiringSoon.length > 1 ? "s" : "" }} expiring within 7 days:
        {{ notifications.expiringSoon.slice(0, 4).map((m) => m.name).join(", ") }}{{ notifications.expiringSoon.length > 4 ? ", and more" : "" }}.
      </div>
      <button @click="dismissedExpiring = true" style="background: transparent; border: none; color: #f3d8a8; cursor: pointer; font-size: 14px; line-height: 1;">✕</button>
    </div>

    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 26px;">
      <div class="rs-card" style="padding: 16px;">
        <div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Total members</div>
        <div style="font-size: 26px; font-weight: 800;">{{ members?.length || 0 }}</div>
      </div>
      <div class="rs-card" style="padding: 16px;">
        <div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Checked in today</div>
        <div style="font-size: 26px; font-weight: 800;">{{ reportable.length }}</div>
      </div>
      <div class="rs-card" style="padding: 16px;">
        <div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Member visits</div>
        <div style="font-size: 26px; font-weight: 800;">{{ memberVisits }}</div>
      </div>
      <div class="rs-card" style="padding: 16px;">
        <div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Walk-ins</div>
        <div style="font-size: 26px; font-weight: 800;">{{ walkins }}</div>
      </div>
    </div>

    <div class="rs-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div style="font-weight: 700; font-size: 14.5px;">Recent activity</div>
        <button v-if="!activityCleared" class="rs-btn-secondary" style="padding: 4px 10px; font-size: 11px;" @click="activityCleared = true">Clear</button>
        <button v-else class="rs-btn-secondary" style="padding: 4px 10px; font-size: 11px;" @click="activityCleared = false">Show again</button>
      </div>
      <div v-if="activityCleared" style="font-size: 13px; color: #5d6470; padding: 18px 0; text-align: center;">Display cleared. Today's check-ins are still recorded — see Reports for the full log.</div>
      <template v-else>
        <div v-if="!checkins?.length" style="font-size: 13px; color: #5d6470; padding: 18px 0; text-align: center;">No check-ins yet today.</div>
        <template v-else>
          <div style="display: grid; grid-template-columns: 1fr 110px 80px 70px; gap: 8px; padding: 7px 0; font-size: 11px; color: #5d6470; border-bottom: 1px solid #1c2026;">
            <span>Name</span><span>Time</span><span style="text-align:center;">Type</span><span style="text-align:right;">Fee</span>
          </div>
          <div v-for="c in (checkins || []).slice(0, 8)" :key="c.id"
            style="display: grid; grid-template-columns: 1fr 110px 80px 70px; gap: 8px; align-items: center; padding: 9px 0; border-bottom: 1px solid #1c2026;"
            :style="{ opacity: c.voided ? 0.4 : 1 }">
            <span style="font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ c.name }}</span>
            <span style="font-size: 12px; color: #7a8190;">{{ new Date(c.time).toLocaleTimeString() }}</span>
            <div style="display:flex; justify-content:center;">
              <RankBadge v-if="c.rank" :rank="c.rank" size="sm" />
              <span v-else-if="c.visitType === 'weekly'" style="font-size:10px; color:#8ee0ab; border:1px solid #245a34; border-radius:4px; padding:2px 5px;">Walk-in · Weekly</span>
              <span v-else-if="c.visitType === 'monthly'" style="font-size:10px; color:#8ee0ab; border:1px solid #245a34; border-radius:4px; padding:2px 5px;">Walk-in · Monthly</span>
              <span v-else style="font-size: 11px; color: #aab0bb; border: 1px solid #2a2f38; border-radius: 4px; padding: 2px 5px;">Walk-in</span>
            </div>
            <span style="font-size: 12.5px; color: #5bb8f5; text-align: right;">{{ c.fee ? `₱${c.fee}` : '—' }}</span>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
