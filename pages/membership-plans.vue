<script setup>
const { data: plans, refresh } = await useFetch("/api/membership-plans");

const TIERS = [
  { id: "walkin",  label: "Walk-In", rankLabel: "Rank F" },
  { id: "regular", label: "Regular Member", rankLabel: "Rank E–A", durations: ["daily","weekly","monthly","annual"] },
  { id: "elite",   label: "Elite Member",   rankLabel: "Rank S",   durations: ["monthly","annual"] },
];
const DURATION_LABELS = { daily:"Daily", weekly:"Weekly", monthly:"Monthly", annual:"Annual" };

const editing = ref(null);
const showAdd = ref(false);
const newPlan = ref({ tier: "regular", studentType: "student", duration: "monthly", price: "", visitFee: "" });
const confirmDelete = ref(null);
const error = ref("");

function planFor(tier, studentType, duration) {
  return (plans.value || []).find((p) => p.tier === tier && p.studentType === studentType && p.duration === duration);
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
      Separate subscription prices and visit fees for Student and Non-student variants of each plan. Walk-in fees are set in Settings.
    </p>

    <div v-for="tier in TIERS" :key="tier.id" class="rs-card" style="padding:0; margin-bottom:16px;">
      <!-- Tier header -->
      <div style="padding:14px 18px; border-bottom:1px solid #1c2026; display:flex; align-items:center; gap:12px;">
        <div style="flex:1;">
          <span style="font-weight:700; font-size:14px;">{{ tier.label }}</span>
          <span style="font-size:12px; color:#5bb8f5; margin-left:8px;">{{ tier.rankLabel }}</span>
        </div>
        <button v-if="tier.id !== 'walkin'" class="rs-btn-secondary" style="padding:5px 10px; font-size:11.5px;"
          @click="newPlan={ tier:tier.id, studentType:'student', duration:tier.durations[0], price:'', visitFee:'' }; showAdd=true">Add plan</button>
      </div>

      <!-- Walk-in: redirect to settings -->
      <div v-if="tier.id === 'walkin'" style="padding:14px 18px; font-size:13px; color:#aab0bb;">
        Walk-in fees are set separately for Student and Non-student in <NuxtLink to="/settings" style="color:#5bb8f5;">Settings →</NuxtLink>
      </div>

      <!-- Regular / Elite: student + non-student per duration -->
      <template v-else>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr 90px; gap:8px; padding:10px 18px; font-size:11px; color:#7a8190; border-bottom:1px solid #1c2026;">
          <span>Duration</span><span>Student — Sub / Visit</span><span></span><span>Non-student — Sub / Visit</span><span></span>
        </div>
        <div v-for="dur in tier.durations" :key="dur" style="border-bottom:1px solid #1c2026;">
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr 90px; gap:8px; align-items:center; padding:10px 18px;">
            <span style="font-size:13px; font-weight:600;">{{ DURATION_LABELS[dur] }}</span>

            <!-- Student -->
            <template v-if="planFor(tier.id,'student',dur)">
              <span style="font-size:12px;">₱{{ planFor(tier.id,'student',dur).price.toLocaleString() }} / ₱{{ planFor(tier.id,'student',dur).visitFee.toLocaleString() }}/visit</span>
              <div style="display:flex; gap:4px;">
                <button class="rs-btn-secondary" style="padding:4px 7px; font-size:11px;" @click="editing={...planFor(tier.id,'student',dur)}">Edit</button>
                <button class="rs-btn-secondary" style="padding:4px 7px; font-size:11px; color:#e88;" @click="confirmDelete=planFor(tier.id,'student',dur)">Del</button>
              </div>
            </template>
            <template v-else>
              <span style="font-size:11.5px; color:#5d6470;">Not set</span>
              <button class="rs-btn-secondary" style="padding:4px 7px; font-size:11px;"
                @click="newPlan={tier:tier.id, studentType:'student', duration:dur, price:'', visitFee:''}; showAdd=true">Add</button>
            </template>

            <!-- Non-student -->
            <template v-if="planFor(tier.id,'non-student',dur)">
              <span style="font-size:12px;">₱{{ planFor(tier.id,'non-student',dur).price.toLocaleString() }} / ₱{{ planFor(tier.id,'non-student',dur).visitFee.toLocaleString() }}/visit</span>
              <div style="display:flex; gap:4px;">
                <button class="rs-btn-secondary" style="padding:4px 7px; font-size:11px;" @click="editing={...planFor(tier.id,'non-student',dur)}">Edit</button>
                <button class="rs-btn-secondary" style="padding:4px 7px; font-size:11px; color:#e88;" @click="confirmDelete=planFor(tier.id,'non-student',dur)">Del</button>
              </div>
            </template>
            <template v-else>
              <span style="font-size:11.5px; color:#5d6470;">Not set</span>
              <button class="rs-btn-secondary" style="padding:4px 7px; font-size:11px;"
                @click="newPlan={tier:tier.id, studentType:'non-student', duration:dur, price:'', visitFee:''}; showAdd=true">Add</button>
            </template>
          </div>
        </div>
      </template>
    </div>

    <!-- Add plan modal -->
    <div v-if="showAdd" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:50;">
      <div style="width:380px;background:#13161b;border:1px solid #232730;border-radius:14px;padding:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <div style="font-weight:800;font-size:16px;">Add plan</div>
          <button @click="showAdd=false;error=''" style="background:transparent;border:none;color:#8a909b;cursor:pointer;">✕</button>
        </div>
        <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Tier</label>
        <select v-model="newPlan.tier" class="rs-input" style="margin-bottom:14px;">
          <option value="regular">Regular Member (Rank E–A)</option>
          <option value="elite">Elite Member (Rank S)</option>
        </select>
        <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Student type</label>
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <button class="rs-btn-secondary" style="flex:1;justify-content:center;font-size:12.5px;"
            :style="{ background:newPlan.studentType==='student'?'#1c2128':'transparent', color:newPlan.studentType==='student'?'#5bb8f5':'#aab0bb', borderColor:newPlan.studentType==='student'?'#2f8fd6':'#2a2f38' }"
            @click="newPlan.studentType='student'">Student</button>
          <button class="rs-btn-secondary" style="flex:1;justify-content:center;font-size:12.5px;"
            :style="{ background:newPlan.studentType==='non-student'?'#1c2128':'transparent', color:newPlan.studentType==='non-student'?'#5bb8f5':'#aab0bb', borderColor:newPlan.studentType==='non-student'?'#2f8fd6':'#2a2f38' }"
            @click="newPlan.studentType='non-student'">Non-student</button>
        </div>
        <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Duration</label>
        <select v-model="newPlan.duration" class="rs-input" style="margin-bottom:14px;">
          <option v-for="dur in (newPlan.tier==='elite' ? ['monthly','annual'] : ['daily','weekly','monthly','annual'])" :key="dur" :value="dur">{{ DURATION_LABELS[dur] }}</option>
        </select>
        <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Subscription price (₱)</label>
        <input v-model="newPlan.price" type="number" min="0" class="rs-input" style="margin-bottom:14px;" />
        <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Visit fee (₱ per check-in)</label>
        <input v-model="newPlan.visitFee" type="number" min="0" class="rs-input" style="margin-bottom:10px;" />
        <div v-if="error" style="color:#e36b6b;font-size:12.5px;margin-bottom:10px;">{{ error }}</div>
        <button class="rs-btn-primary" style="width:100%;justify-content:center;" @click="addPlan">Add plan</button>
      </div>
    </div>

    <!-- Edit modal -->
    <div v-if="editing" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:50;">
      <div style="width:360px;background:#13161b;border:1px solid #232730;border-radius:14px;padding:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <div style="font-weight:800;font-size:16px;">Edit — {{ editing.studentType }} / {{ DURATION_LABELS[editing.duration] }}</div>
          <button @click="editing=null" style="background:transparent;border:none;color:#8a909b;cursor:pointer;">✕</button>
        </div>
        <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Subscription price (₱)</label>
        <input v-model.number="editing.price" type="number" min="0" class="rs-input" style="margin-bottom:14px;" />
        <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Visit fee (₱ per check-in)</label>
        <input v-model.number="editing.visitFee" type="number" min="0" class="rs-input" style="margin-bottom:16px;" />
        <button class="rs-btn-primary" style="width:100%;justify-content:center;" @click="saveEdit">Save changes</button>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="confirmDelete" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:50;">
      <div style="width:340px;background:#13161b;border:1px solid #232730;border-radius:14px;padding:24px;">
        <div style="font-weight:800;font-size:16px;margin-bottom:10px;">Remove this plan?</div>
        <div style="display:flex;gap:8px;">
          <button class="rs-btn-secondary" style="flex:1;justify-content:center;" @click="confirmDelete=null">Cancel</button>
          <button class="rs-btn-secondary" style="flex:1;justify-content:center;color:#e88;border-color:#5a2424;" @click="deletePlan(confirmDelete.id)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>
