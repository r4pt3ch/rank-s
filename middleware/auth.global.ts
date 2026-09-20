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
  const superAdminOnly = ["/audit", "/loginlogs", "/users"];
  const adminAndAbove = ["/membership-plans", "/services", "/thresholds", "/settings"];
  const staffOnly = ["/members", "/checkin", "/receipts", "/pos", "/inventory", "/monitor", "/account", "/reports"];

  if (role === "member" && [...staffOnly, ...adminAndAbove, ...superAdminOnly].some((p) => to.path.startsWith(p))) {
    return navigateTo("/profile");
  }
  if (role === "user" && [...adminAndAbove, ...superAdminOnly].some((p) => to.path.startsWith(p))) {
    return navigateTo("/");
  }
  if (role === "admin" && superAdminOnly.some((p) => to.path.startsWith(p))) {
    return navigateTo("/");
  }
});
