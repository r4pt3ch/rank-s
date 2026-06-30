export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/login" || to.path === "/kiosk" || to.path === "/lobby" || to.path === "/member-login") return;

  const { user, fetchSession } = useAuth();
  if (!user.value) {
    try {
      await fetchSession();
    } catch {
      user.value = null;
    }
  }
  if (!user.value) {
    return navigateTo(to.path.startsWith("/profile") ? "/member-login" : "/login");
  }

  const role = user.value.role;
  const superAdminOnly = ["/audit", "/loginlogs"];
  const staffOnly = ["/members", "/membership-plans", "/checkin", "/receipts", "/pos", "/inventory", "/monitor", "/account", "/reports", "/thresholds", "/settings", "/receipt-settings"];

  if (role === "member" && staffOnly.concat(superAdminOnly).some((p) => to.path.startsWith(p))) {
    return navigateTo("/profile");
  }
  if (role === "admin" && superAdminOnly.some((p) => to.path.startsWith(p))) {
    return navigateTo("/");
  }
});
