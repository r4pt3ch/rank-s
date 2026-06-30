<script setup>
const { data, refresh } = await useFetch("/api/members/me");
const RANKS = ["F", "E", "D", "C", "B", "A", "S", "SS", "SSS"];

const form = ref({
  firstName: data.value?.firstName,
  lastName: data.value?.lastName,
  email: data.value?.email,
  phone: data.value?.phone,
  address: data.value?.address,
  dob: data.value?.dob,
});
const saved = ref(false);

const rankIdx = computed(() => RANKS.indexOf(data.value?.rank));
const nextRank = computed(() => RANKS[rankIdx.value + 1]);
const progress = computed(() => {
  if (!data.value || !nextRank.value) return 100;
  const cur = data.value.thresholds[data.value.rank];
  const next = data.value.thresholds[nextRank.value];
  return Math.min(100, Math.round(((data.value.points - cur) / (next - cur)) * 100));
});

async function save() {
  await $fetch("/api/members/me", { method: "PUT", body: form.value });
  saved.value = true;
  await refresh();
  setTimeout(() => (saved.value = false), 2000);
}

function categoryLabel(category) {
  if (!category) return "";
  return category.charAt(0).toUpperCase() + category.slice(1);
}
const DURATION_LABEL = { monthly: "Monthly", sixmonth: "6 months", yearly: "Yearly", lifetime: "Lifetime" };
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">My profile</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 18px;">View your rank progress and keep your personal information up to date.</p>

    <div
      v-if="data.membershipStatus === 'expired'"
      style="background: #2a1414; border: 1px solid #5a2424; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px; font-size: 13px; color: #f3a8a8;"
    >
      Your {{ categoryLabel(data.membershipCategory) }} membership expired on {{ new Date(data.membershipExpiry).toLocaleDateString() }}.
      Until you renew at the front desk, you'll be checked in and charged the walk-in rate instead of your membership rate.
    </div>
    <div
      v-else-if="data.membershipStatus === 'none'"
      style="background: #1c2128; border: 1px solid #2a2f38; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px; font-size: 13px; color: #aab0bb;"
    >
      You don't have a membership plan assigned yet. Ask the front desk to set one up.
    </div>
    <div
      v-else
      style="background: #142a1e; border: 1px solid #245a34; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px; font-size: 13px; color: #8ee0ab;"
    >
      {{ categoryLabel(data.membershipCategory) }} membership ({{ DURATION_LABEL[data.membershipDuration] }})
      <span v-if="data.membershipDuration !== 'lifetime'">— active until {{ new Date(data.membershipExpiry).toLocaleDateString() }}.</span>
      <span v-else>— never expires.</span>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px;">
      <div class="rs-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px;">
          <div>
            <div style="font-size: 12px; color: #8a909b;">Current rank</div>
            <div style="font-weight: 800; font-size: 22px; margin-top: 2px;">{{ data.points }} pts</div>
          </div>
          <RankBadge :rank="data.rank" size="lg" />
        </div>
        <div style="height: 8px; background: #1c2128; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
          <div style="height: 100%; background: #2f8fd6;" :style="{ width: progress + '%' }"></div>
        </div>
        <div style="font-size: 11.5px; color: #7a8190;">
          <span v-if="nextRank">{{ progress }}% to rank {{ nextRank }} ({{ data.thresholds[nextRank] }} pts)</span>
          <span v-else>Maximum rank reached</span>
        </div>
        <div style="display: flex; gap: 6px; margin-top: 18px; flex-wrap: wrap;">
          <span v-for="(r, i) in RANKS" :key="r" :style="{ opacity: i <= rankIdx ? 1 : 0.35 }">
            <RankBadge :rank="r" size="sm" />
          </span>
        </div>
      </div>

      <div class="rs-card">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 14px;">Personal information</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div>
            <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">First name</label>
            <input v-model="form.firstName" class="rs-input" />
          </div>
          <div>
            <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Last name</label>
            <input v-model="form.lastName" class="rs-input" />
          </div>
        </div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Email</label>
        <input v-model="form.email" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Phone</label>
        <input v-model="form.phone" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Address</label>
        <input v-model="form.address" class="rs-input" style="margin-bottom: 16px;" />
        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" @click="save">Save changes</button>
        <div v-if="saved" style="margin-top: 10px; font-size: 12.5px; color: #8ee0ab; text-align: center;">Profile saved.</div>
      </div>
    </div>
  </div>
</template>
