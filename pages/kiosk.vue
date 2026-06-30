<script setup>
definePageMeta({ layout: false });

const mode = ref(null); // 'member' | 'walkin'
const pin = ref("");
const name = ref("");
const result = ref(null);
const error = ref("");
const loading = ref(false);

async function submitMember() {
  error.value = "";
  loading.value = true;
  try {
    const res = await $fetch("/api/public/kiosk-checkin", { method: "POST", body: { mode: "member", pin: pin.value } });
    result.value = res;
    pin.value = "";
  } catch (e) {
    error.value = e.data?.statusMessage || "Check-in failed.";
    pin.value = "";
    setTimeout(() => (error.value = ""), 4000);
  } finally {
    loading.value = false;
  }
}

async function submitWalkin() {
  error.value = "";
  loading.value = true;
  try {
    const res = await $fetch("/api/public/kiosk-checkin", { method: "POST", body: { mode: "walkin", name: name.value } });
    result.value = res;
    name.value = "";
  } catch (e) {
    error.value = e.data?.statusMessage || "Check-in failed.";
  } finally {
    loading.value = false;
  }
}

function reset() {
  mode.value = null;
  result.value = null;
  error.value = "";
}

function pressDigit(d) {
  if (pin.value.length < 6) pin.value += d;
}
function backspace() {
  pin.value = pin.value.slice(0, -1);
}
</script>

<template>
  <div style="min-height: 100vh; background: radial-gradient(circle at 30% 20%, #1a1d23, #0a0b0d); display: flex; align-items: center; justify-content: center; font-family: 'Inter', system-ui, sans-serif; color: #eceef2; padding: 24px;">
    <div style="width: 420px;">
      <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 28px;">
        <div style="position: relative; width: 156px; height: 156px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle, rgba(47,143,214,0.5), rgba(47,143,214,0) 70%); filter: blur(3px);"></div>
          <img src="/logo.png" alt="Rank S logo" style="position: relative; width: 140px; height: 140px; object-fit: contain; filter: drop-shadow(0 8px 22px rgba(47,143,214,0.6));" />
        </div>
        <div style="font-weight: 800; font-size: 28px; letter-spacing: 1px;">RANK S</div>
        <div style="font-size: 13px; color: #7a818c; margin-top: 2px;">Self check-in kiosk</div>
      </div>

      <!-- Result confirmation -->
      <div v-if="result" style="background: #13161b; border: 1px solid #232730; border-radius: 16px; padding: 28px; text-align: center;">
        <div style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">Welcome, {{ result.name }}!</div>
        <div v-if="result.rank" style="margin: 14px 0;">
          <RankBadge :rank="result.rank" size="lg" />
        </div>
        <div v-if="result.leveledUp" style="color: #8ee0ab; font-size: 13px; margin-bottom: 10px;">Leveled up to {{ result.rank }}!</div>
        <div v-if="result.duplicateVisit" style="font-size: 13px; color: #aab0bb; margin-bottom: 4px;">
          You already checked in earlier today — no additional fee.
        </div>
        <div v-else-if="result.fee" style="font-size: 13px; color: #aab0bb; margin-bottom: 4px;">
          Fee charged: <b style="color: #5bb8f5;">₱{{ result.fee }}</b>
          <span v-if="result.expiredBilling" style="color: #e88;"> (membership expired — billed as walk-in)</span>
        </div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 14px;">Have a great workout!</div>
        <button class="rs-btn-primary" style="width: 100%; justify-content: center; margin-top: 20px;" @click="reset">Done</button>
      </div>

      <!-- Mode selection -->
      <div v-else-if="!mode" style="display: flex; flex-direction: column; gap: 12px;">
        <button class="rs-btn-primary" style="justify-content: center; padding: 18px; font-size: 15px;" @click="mode = 'member'">I'm a gym member</button>
        <button class="rs-btn-secondary" style="justify-content: center; padding: 18px; font-size: 15px;" @click="mode = 'walkin'">Walk-in guest</button>
      </div>

      <!-- Member PIN entry -->
      <div v-else-if="mode === 'member'" style="background: #13161b; border: 1px solid #232730; border-radius: 16px; padding: 24px;">
        <div style="text-align: center; font-size: 14px; color: #aab0bb; margin-bottom: 14px;">Enter your PIN</div>
        <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 18px;">
          <div v-for="i in 6" :key="i" style="width: 34px; height: 48px; border: 1px solid #2a2f38; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700;">
            {{ pin[i - 1] ? "•" : "" }}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;">
          <button v-for="d in [1,2,3,4,5,6,7,8,9]" :key="d" class="rs-btn-secondary" style="padding: 16px; font-size: 16px; justify-content: center;" @click="pressDigit(String(d))">{{ d }}</button>
          <button class="rs-btn-secondary" style="padding: 16px; font-size: 13px; justify-content: center;" @click="mode = null; pin = ''">Cancel</button>
          <button class="rs-btn-secondary" style="padding: 16px; font-size: 16px; justify-content: center;" @click="pressDigit('0')">0</button>
          <button class="rs-btn-secondary" style="padding: 16px; font-size: 13px; justify-content: center;" @click="backspace">⌫</button>
        </div>
        <div v-if="error" style="color: #e88; font-size: 12.5px; text-align: center; margin-bottom: 10px;">{{ error }}</div>
        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" :disabled="pin.length < 4 || loading" @click="submitMember">
          {{ loading ? "Checking in..." : "Check in" }}
        </button>
      </div>

      <!-- Walk-in name entry -->
      <div v-else style="background: #13161b; border: 1px solid #232730; border-radius: 16px; padding: 24px;">
        <div style="text-align: center; font-size: 14px; color: #aab0bb; margin-bottom: 14px;">Enter your name</div>
        <input v-model="name" class="rs-input" placeholder="Juan Dela Cruz" style="margin-bottom: 14px; text-align: center; font-size: 15px;" @keyup.enter="submitWalkin" />
        <div v-if="error" style="color: #e88; font-size: 12.5px; text-align: center; margin-bottom: 10px;">{{ error }}</div>
        <button class="rs-btn-primary" style="width: 100%; justify-content: center; margin-bottom: 10px;" :disabled="!name || loading" @click="submitWalkin">
          {{ loading ? "Checking in..." : "Check in" }}
        </button>
        <button class="rs-btn-secondary" style="width: 100%; justify-content: center;" @click="mode = null">Cancel</button>
      </div>
    </div>
  </div>
</template>
