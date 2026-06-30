<script setup>
const { data, refresh } = await useFetch("/api/users/me");
const { user: sessionUser } = useAuth();

const form = ref({ name: data.value?.name, email: data.value?.email });
const passwords = ref({ currentPassword: "", newPassword: "", confirmPassword: "" });

const saved = ref(false);
const error = ref("");
const pwError = ref("");
const pwSaved = ref(false);

async function saveProfile() {
  error.value = "";
  try {
    const updated = await $fetch("/api/users/me", { method: "PUT", body: { name: form.value.name, email: form.value.email } });
    sessionUser.value = { ...sessionUser.value, name: updated.name };
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
    await refresh();
  } catch (e) {
    error.value = e.data?.statusMessage || "Could not save profile.";
  }
}

async function changePassword() {
  pwError.value = "";
  if (!passwords.value.newPassword || passwords.value.newPassword !== passwords.value.confirmPassword) {
    pwError.value = "New password and confirmation must match.";
    return;
  }
  try {
    await $fetch("/api/users/me", {
      method: "PUT",
      body: { currentPassword: passwords.value.currentPassword, newPassword: passwords.value.newPassword },
    });
    passwords.value = { currentPassword: "", newPassword: "", confirmPassword: "" };
    pwSaved.value = true;
    setTimeout(() => (pwSaved.value = false), 2000);
  } catch (e) {
    pwError.value = e.data?.statusMessage || "Could not change password.";
  }
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">My account</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">Update your own name, email, and password.</p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px;">
      <div class="rs-card">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 14px;">Profile</div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Username</label>
        <input :value="data.username" disabled class="rs-input" style="margin-bottom: 14px; opacity: 0.6;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Full name</label>
        <input v-model="form.name" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Email</label>
        <input v-model="form.email" class="rs-input" placeholder="you@example.com" style="margin-bottom: 10px;" />
        <div style="font-size: 11.5px; color: #7a8190; margin-bottom: 14px;">Role: {{ data.role === "superadmin" ? "Super admin" : "Regular admin" }}</div>
        <div v-if="error" style="color: #e36b6b; font-size: 12.5px; margin-bottom: 10px;">{{ error }}</div>
        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" @click="saveProfile">Save profile</button>
        <div v-if="saved" style="margin-top: 10px; font-size: 12.5px; color: #8ee0ab; text-align: center;">Profile saved.</div>
      </div>

      <div class="rs-card">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 14px;">Change password</div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Current password</label>
        <input v-model="passwords.currentPassword" type="password" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">New password</label>
        <input v-model="passwords.newPassword" type="password" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Confirm new password</label>
        <input v-model="passwords.confirmPassword" type="password" class="rs-input" style="margin-bottom: 10px;" />
        <div v-if="pwError" style="color: #e36b6b; font-size: 12.5px; margin-bottom: 10px;">{{ pwError }}</div>
        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" @click="changePassword">Update password</button>
        <div v-if="pwSaved" style="margin-top: 10px; font-size: 12.5px; color: #8ee0ab; text-align: center;">Password updated.</div>
      </div>
    </div>
  </div>
</template>
