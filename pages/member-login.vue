<script setup>
definePageMeta({ layout: false });

const { memberLogin } = useAuth();
const pin = ref("");
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    await memberLogin(pin.value);
    await navigateTo("/profile");
  } catch (e) {
    error.value = e.data?.statusMessage || "Login failed.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="min-height: 100vh; background: radial-gradient(circle at 30% 20%, #1a1d23, #0a0b0d); display: flex; align-items: center; justify-content: center;">
    <div style="width: 460px; background: #13161b; border: 1px solid #232730; border-radius: 18px; padding: 24px 32px 32px;">
      <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 8px;">
        <img src="/logo.png" alt="Rank S logo" style="width: 240px; height: 240px; object-fit: contain;" />
        <div style="font-weight: 800; font-size: 24px; letter-spacing: 0.8px; text-align: center; margin-top: -8px;">RANK S</div>
        <div style="font-size: 12.5px; color: #7a818c; text-align: center; margin-top: 2px;">Member account</div>
      </div>

      <form @submit.prevent="submit" style="margin-top: 22px;">
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Your PIN</label>
        <input v-model="pin" maxlength="6" class="rs-input" placeholder="PIN" style="text-align: center; font-size: 18px; letter-spacing: 2px;" />
        <div v-if="error" style="color: #e36b6b; font-size: 12.5px; margin-top: 12px;">{{ error }}</div>
        <button type="submit" class="rs-btn-primary" style="margin-top: 22px; width: 100%; justify-content: center;" :disabled="!pin || loading">
          {{ loading ? "Signing in..." : "Sign in" }}
        </button>
      </form>

      <div style="margin-top: 18px; font-size: 11.5px; color: #5d6470; text-align: center; line-height: 1.6;">
        Use this to check your rank progress or update your details.<br />
        Signing in here doesn't count as a gym visit — to check in, use the kiosk at the front desk.
      </div>
    </div>
  </div>
</template>
