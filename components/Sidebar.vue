<script setup>
const { user, logout } = useAuth();
const route = useRoute();

const navByRole = {
  superadmin: [
    { to: "/", label: "Dashboard" },
    { to: "/members", label: "Gym members" },
    { to: "/membership-plans", label: "Membership plans" },
    { to: "/checkin", label: "Check-in" },
    { to: "/receipts", label: "Receipts" },
    { to: "/pos", label: "POS / inventory" },
    { to: "/inventory", label: "Inventory settings" },
    { to: "/reports", label: "Reports" },
    { to: "/thresholds", label: "Rank thresholds" },
    { to: "/settings", label: "Settings" },
    { to: "/receipt-settings", label: "Receipt settings" },
    { to: "/audit", label: "Audit trail" },
    { to: "/loginlogs", label: "Login logs" },
    { to: "/monitor", label: "Lobby monitor" },
    { to: "/account", label: "My account" },
  ],
  admin: [
    { to: "/", label: "Dashboard" },
    { to: "/members", label: "Gym members" },
    { to: "/membership-plans", label: "Membership plans" },
    { to: "/checkin", label: "Check-in" },
    { to: "/receipts", label: "Receipts" },
    { to: "/pos", label: "POS / inventory" },
    { to: "/inventory", label: "Inventory settings" },
    { to: "/reports", label: "Reports" },
    { to: "/thresholds", label: "Rank thresholds" },
    { to: "/settings", label: "Settings" },
    { to: "/receipt-settings", label: "Receipt settings" },
    { to: "/monitor", label: "Lobby monitor" },
    { to: "/account", label: "My account" },
  ],
  member: [{ to: "/profile", label: "My profile" }],
};

const nav = computed(() => navByRole[user.value?.role] || []);
const roleLabel = computed(() => ({ superadmin: "Super admin", admin: "Regular admin", member: "Gym member" }[user.value?.role]));
</script>

<template>
  <div style="width: 248px; background: #111419; border-right: 1px solid #1f242c; display: flex; flex-direction: column; padding: 24px 16px; min-height: 100vh;">
    <div style="display: flex; align-items: center; gap: 10px; padding: 0 8px 28px;">
      <img src="/logo.png" alt="Rank S logo" style="width: 40px; height: 40px; object-fit: contain;" />
      <div>
        <div style="font-weight: 800; font-size: 17px; letter-spacing: 0.5px;">RANK S</div>
        <div style="font-size: 11px; color: #6b7280;">Fitness gym</div>
      </div>
    </div>
    <div style="flex: 1;">
      <NuxtLink
        v-for="n in nav"
        :key="n.to"
        :to="n.to"
        style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 4px; border-radius: 8px; text-decoration: none; font-size: 13.5px;"
        :style="{ background: route.path === n.to ? '#1c2128' : 'transparent', color: route.path === n.to ? '#5bb8f5' : '#aab0bb', fontWeight: route.path === n.to ? 600 : 500 }"
      >
        {{ n.label }}
      </NuxtLink>
    </div>
    <div v-if="user?.role !== 'member'" style="border-top: 1px solid #1f242c; padding-top: 14px; margin-top: 14px;">
      <a href="/lobby" target="_blank" style="display: block; font-size: 11.5px; color: #5bb8f5; text-decoration: none; margin-bottom: 6px;">Open lobby display ↗</a>
      <a href="/kiosk" target="_blank" style="display: block; font-size: 11.5px; color: #5bb8f5; text-decoration: none; margin-bottom: 6px;">Open self-check-in kiosk ↗</a>
      <a href="/member-login" target="_blank" style="display: block; font-size: 11.5px; color: #5bb8f5; text-decoration: none; margin-bottom: 12px;">Open member account login ↗</a>
    </div>
    <div style="border-top: 1px solid #1f242c; padding-top: 14px; margin-top: 0;">
      <div style="font-size: 13px; font-weight: 600;">{{ user?.name }}</div>
      <div style="font-size: 11.5px; color: #6b7280; margin-bottom: 10px;">{{ roleLabel }}</div>
      <button @click="logout" style="font-size: 12.5px; color: #d4534f; background: transparent; border: 1px solid #2a2f38; border-radius: 7px; padding: 7px 10px; cursor: pointer; width: 100%;">
        Log out
      </button>
    </div>
  </div>
</template>
