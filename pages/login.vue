<script setup>
definePageMeta({ layout: false });

const { login } = useAuth();
const username = ref("");
const password = ref("");
const error = ref("");

async function submitStaff() {
  error.value = "";
  try {
    const u = await login(username.value, password.value);
    await navigateTo(u.role === "member" ? "/profile" : "/");
  } catch (e) {
    error.value = e.data?.statusMessage || "Login failed.";
  }
}
</script>

<template>
  <div style="min-height: 100vh; background: radial-gradient(circle at 30% 20%, #1a1d23, #0a0b0d); display: flex; align-items: center; justify-content: center;">
    <div style="width: 460px; background: #13161b; border: 1px solid #232730; border-radius: 18px; padding: 24px 32px 32px;">
      <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 8px;">
        <img src="/logo.png" alt="Rank S logo" style="width: 280px; height: 280px; object-fit: contain;" />
        <div style="font-weight: 800; font-size: 26px; letter-spacing: 0.8px; text-align: center; margin-top: -8px;">RANK S</div>
        <div style="font-size: 12.5px; color: #7a818c; text-align: center; margin-top: 2px;">Fitness gym management system</div>
      </div>

      <form @submit.prevent="submitStaff" style="margin-top: 22px;">
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Username</label>
        <input v-model="username" class="rs-input" placeholder="super or admin" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin: 16px 0 6px;">Password</label>
        <input v-model="password" type="password" class="rs-input" placeholder="••••••••" />
        <div v-if="error" style="color: #e36b6b; font-size: 12.5px; margin-top: 12px;">{{ error }}</div>
        <button type="submit" class="rs-btn-primary" style="margin-top: 22px; width: 100%; justify-content: center;">Sign in</button>
      </form>

      <div style="margin-top: 18px; font-size: 11.5px; color: #5d6470; text-align: center;">
        Gym member? Use the self check-in kiosk instead.
      </div>
    </div>
  </div>
</template>
