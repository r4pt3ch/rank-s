<script setup>
definePageMeta({ layout: false });

const { login, memberLogin } = useAuth();
const mode = ref("staff");
const username = ref("");
const password = ref("");
const pin = ref("");
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

async function submitMember() {
  error.value = "";
  try {
    await memberLogin(pin.value);
    await navigateTo("/profile");
  } catch (e) {
    error.value = e.data?.statusMessage || "Login failed.";
  }
}
</script>

<template>
  <div style="min-height: 100vh; background: radial-gradient(circle at 30% 20%, #1a1d23, #0a0b0d); display: flex; align-items: center; justify-content: center;">
    <div style="width: 380px; background: #13161b; border: 1px solid #232730; border-radius: 16px; padding: 36px 32px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
        <img src="/logo.png" alt="Rank S logo" style="width: 52px; height: 52px; object-fit: contain;" />
        <div>
          <div style="font-weight: 800; font-size: 20px; letter-spacing: 0.4px;">RANK S</div>
          <div style="font-size: 12px; color: #7a818c;">Fitness gym management system</div>
        </div>
      </div>

      <div style="display: flex; gap: 8px; margin-bottom: 22px;">
        <button class="rs-btn-secondary" :style="{ background: mode === 'staff' ? '#1c2128' : 'transparent', color: mode === 'staff' ? '#5bb8f5' : '#aab0bb' }" @click="mode = 'staff'">Staff</button>
        <button class="rs-btn-secondary" :style="{ background: mode === 'member' ? '#1c2128' : 'transparent', color: mode === 'member' ? '#5bb8f5' : '#aab0bb' }" @click="mode = 'member'">Gym member</button>
      </div>

      <form v-if="mode === 'staff'" @submit.prevent="submitStaff">
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Username</label>
        <input v-model="username" class="rs-input" placeholder="super or admin" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin: 16px 0 6px;">Password</label>
        <input v-model="password" type="password" class="rs-input" placeholder="••••••••" />
        <div v-if="error" style="color: #e36b6b; font-size: 12.5px; margin-top: 12px;">{{ error }}</div>
        <button type="submit" class="rs-btn-primary" style="margin-top: 22px; width: 100%; justify-content: center;">Sign in</button>
      </form>

      <form v-else @submit.prevent="submitMember">
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">4-digit PIN</label>
        <input v-model="pin" maxlength="4" class="rs-input" placeholder="0000" />
        <div v-if="error" style="color: #e36b6b; font-size: 12.5px; margin-top: 12px;">{{ error }}</div>
        <button type="submit" class="rs-btn-primary" style="margin-top: 22px; width: 100%; justify-content: center;">Sign in</button>
      </form>

      <div style="margin-top: 18px; font-size: 11.5px; color: #5d6470; line-height: 1.6;">
        Seeded demo accounts — Super admin: <b style="color:#a3a9b3">super / super123</b><br />
        Regular admin: <b style="color:#a3a9b3">admin / admin123</b><br />
        Run <code>npm run seed</code> to print sample member PINs to the console.
      </div>
    </div>
  </div>
</template>
