export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/login" || to.path === "/kiosk" || to.path === "/lobby") return;

  const { user, fetchSession } = useAuth();
  if (!user.value) {
    try {
      await fetchSession();
    } catch {
      user.value = null;
    }
  }
  if (!user.value) {
    return navigateTo("/login");
  }

  const role = user.value.role;
  const superAdminOnly = ["/audit", "/loginlogs", "/thresholds", "/settings", "/receipt-settings"];
  const staffOnly = ["/members", "/membership-plans", "/checkin", "/receipts", "/pos", "/inventory", "/monitor", "/account", "/reports"];

  if (role === "member" && staffOnly.concat(superAdminOnly).some((p) => to.path.startsWith(p))) {
    return navigateTo("/profile");
  }
  if (role === "admin" && superAdminOnly.some((p) => to.path.startsWith(p))) {
    return navigateTo("/");
  }
});
