export const useAuth = () => {
  const user = useState("auth_user", () => null);

  async function fetchSession() {
    const data = await $fetch("/api/auth/me");
    user.value = data.user;
    return data.user;
  }

  async function login(username, password) {
    const data = await $fetch("/api/auth/login", { method: "POST", body: { username, password } });
    user.value = data;
    return data;
  }

  async function memberLogin(pin) {
    const data = await $fetch("/api/auth/member-login", { method: "POST", body: { pin } });
    user.value = data;
    return data;
  }

  async function logout() {
    const wasMember = user.value?.role === "member";
    await $fetch("/api/auth/logout", { method: "POST" });
    user.value = null;
    await navigateTo(wasMember ? "/member-login" : "/login");
  }

  return { user, fetchSession, login, memberLogin, logout };
};
