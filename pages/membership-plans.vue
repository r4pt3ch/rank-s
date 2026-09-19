<script setup>
const { data: plans, refresh } = await useFetch("/api/membership-plans");

const TIERS = [
  { id: "walkin",  label: "Walk-In", rankLabel: "Rank F", note: "Charged the walk-in fee set in Settings per visit. No subscription." },
  { id: "regular", label: "Regular Member", rankLabel: "Rank E–A", durations: ["daily","monthly","quarterly","sixmonth","yearly"] },
  { id: "elite",   label: "Elite Member",   rankLabel: "Rank S",   durations: ["monthly","quarterly","sixmonth","yearly"] },
];
const DURATION_LABELS = { daily:"Daily", monthly:"Monthly", quarterly:"Quarterly", sixmonth:"6 months", yearly:"Yearly" };

const editing = ref(null);
const showAdd = ref(false);
const newPlan = ref({ tier: "regular", duration: "monthly", price: "", visitFee: "" });
const confirmDelete = ref(null);
const error = ref("");

function planFor(tier, duration) {
  return (plans.value || []).find((p) => p.tier === tier && p.duration === duration);
}

async function addPlan() {
  error.value = "";
  try {
    await $fetch("/api/membership-plans", { method: "POST", body: { ...newPlan.value, price: Number(newPlan.value.price)||0, visitFee: Number(newPlan.value.visitFee)||0 } });
    showAdd.value = false;
    await refresh();
  } catch (e) { error.value = e.data?.statusMessage || "Could not add plan."; }
}

async function saveEdit() {
  await $fetch(`/api/membership-plans/${editing.value.id}`, { method: "PUT", body: { price: editing.value.price, visitFee: editing.value.visitFee } });
  editing.value = null;
  await refresh();
}

async function deletePlan(id) {
  await $fetch(`/api/membership-plans/${id}`, { method: "DELETE" });
  confirmDelete.value = null;
  await refresh();
}
</script>

<template>
  <div>
    <h1 style="font-size:22px; font-weight:800; margin:0;">Membership plans</h1>
    <p style="font-size:13.5px; color:#8a909b; margin:6px 0 24px;">
      Configure subscription prices and per-visit fees for each tier: Walk-In (Rank F), Regular (Rank E–A), and Elite (Rank S).
    </p>

    <div v-for="tier in TIERS" :key="tier.id" class="rs-card" style="padding:0; margin-bottom:16px;">
      <div style="padding:14px 18px; border-bottom:1px solid #1c2026; display:flex; align-items:center; gap:12px;">
        <div style="flex:1;">
          <span style="font-weight:700; font-size:14px;">{{ tier.label }}</span>
          <span style="font-size:12px; color:#5bb8f5; margin-left:8px;">{{ tier.rankLabel }}</span>
        </div>
        <button v-if="tier.id !== 'walkin'" class="rs-btn-secondary" style="padding:5px 10px; font-size:11.5px;"
          @click="newPlan={ tier:tier.id, duration:tier.durations[0], price:'', visitFee:'' }; showAdd=true">Add plan</button>
      </div>

      <!-- Walk-in: just a note, price is in Settings -->
      <div v-if="tier.id === 'walkin'" style="padding:14px 18px; font-size:13px; color:#aab0bb;">
        {{ tier.note }}<br />
        <NuxtLink to="/settings" style="color:#5bb8f5; font-size:12px;">Set walk-in fee in Settings →</NuxtLink>
      </div>

      <!-- Regular/Elite: table of duration plans -->
      <template v-else>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr 110px; gap:8px; padding:10px 18px; font-size:11.5px; color:#7a8190; border-bottom:1px solid #1c2026;">
          <span>Duration</span><span>Subscription price</span><span>Visit fee</span><span></span>
        </div>
        <div v-for="dur in tier.durations" :key="dur" style="display:grid; grid-template-columns:1fr 1fr 1fr 110px; gap:8px; align-items:center; padding:10px 18px; border-bottom:1px solid #1c2026;">
          <span style="font-size:13px; font-weight:600;">{{ DURATION_LABELS[dur] }}</span>
          <template v-if="planFor(tier.id, dur)">
            <span style="font-size:12.5px;">₱{{ planFor(tier.id, dur).price.toLocaleString() }}</span>
            <span style="font-size:12.5px;">₱{{ planFor(tier.id, dur).visitFee.toLocaleString() }} / visit</span>
            <div style="display:flex; gap:6px; justify-content:flex-end;">
              <button class="rs-btn-secondary" style="padding:5px 9px;" @click="editing={...planFor(tier.id,dur)}">Edit</button>
              <button class="rs-btn-secondary" style="padding:5px 9px; color:#e88;" @click="confirmDelete=planFor(tier.id,dur)">Del</button>
            </div>
          </template>
          <template v-else>
            <span style="font-size:12px; color:#5d6470; grid-column:span 2;">Not configured</span>
            <button class="rs-btn-secondary" style="padding:5px 9px; justify-self:end;"
              @click="newPlan={tier:tier.id, duration:dur, price:'', visitFee:''}; showAdd=true">Add</button>
          </template>
        </div>
      </template>
    </div>

    <!-- Add plan modal -->
    <div v-if="showAdd" style="position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:50;">
      <div style="width:380px; background:#13161b; border:1px solid #232730; border-radius:14px; padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <div style="font-weight:800; font-size:16px;">Add plan</div>
          <button @click="showAdd=false; error=''" style="background:transparent; border:none; color:#8a909b; cursor:pointer;">✕</button>
        </div>
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Tier</label>
        <select v-model="newPlan.tier" class="rs-input" style="margin-bottom:14px;">
          <option value="regular">Regular Member (Rank E–A)</option>
          <option value="elite">Elite Member (Rank S)</option>
        </select>
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Duration</label>
        <select v-model="newPlan.duration" class="rs-input" style="margin-bottom:14px;">
          <option v-for="dur in (newPlan.tier==='elite' ? ['monthly','quarterly','sixmonth','yearly'] : ['daily','monthly','quarterly','sixmonth','yearly'])" :key="dur" :value="dur">{{ DURATION_LABELS[dur] }}</option>
        </select>
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Subscription price (₱)</label>
        <input v-model="newPlan.price" type="number" min="0" class="rs-input" style="margin-bottom:14px;" />
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Visit fee (₱ per check-in)</label>
        <input v-model="newPlan.visitFee" type="number" min="0" class="rs-input" style="margin-bottom:10px;" />
        <div v-if="error" style="color:#e36b6b; font-size:12.5px; margin-bottom:10px;">{{ error }}</div>
        <button class="rs-btn-primary" style="width:100%; justify-content:center;" @click="addPlan">Add plan</button>
      </div>
    </div>

    <!-- Edit modal -->
    <div v-if="editing" style="position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:50;">
      <div style="width:360px; background:#13161b; border:1px solid #232730; border-radius:14px; padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <div style="font-weight:800; font-size:16px;">Edit plan</div>
          <button @click="editing=null" style="background:transparent; border:none; color:#8a909b; cursor:pointer;">✕</button>
        </div>
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Subscription price (₱)</label>
        <input v-model.number="editing.price" type="number" min="0" class="rs-input" style="margin-bottom:14px;" />
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Visit fee (₱ per check-in)</label>
        <input v-model.number="editing.visitFee" type="number" min="0" class="rs-input" style="margin-bottom:16px;" />
        <button class="rs-btn-primary" style="width:100%; justify-content:center;" @click="saveEdit">Save changes</button>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="confirmDelete" style="position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:50;">
      <div style="width:340px; background:#13161b; border:1px solid #232730; border-radius:14px; padding:24px;">
        <div style="font-weight:800; font-size:16px; margin-bottom:10px;">Remove this plan?</div>
        <div style="display:flex; gap:8px;">
          <button class="rs-btn-secondary" style="flex:1; justify-content:center;" @click="confirmDelete=null">Cancel</button>
          <button class="rs-btn-secondary" style="flex:1; justify-content:center; color:#e88; border-color:#5a2424;" @click="deletePlan(confirmDelete.id)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>
