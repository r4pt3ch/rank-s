<script setup>
const { data: plans, refresh } = await useFetch("/api/membership-plans");

const TIERS = [
  { id: "walkin",  label: "Walk-In", rankLabel: "Rank F" },
  {
    id: "regular", label: "Regular Member", rankLabel: "Rank E–A",
    durations: ["monthly","annual"],
    hasVisitFee: true,
    note: "Monthly or Annual subscription. Each visit, staff selects Daily or Weekly check-in fee."
  },
  {
    id: "elite", label: "Elite Member", rankLabel: "Rank S",
    durations: ["monthly","quarterly","sixmonth","annual"],
    hasVisitFee: false,
    note: "Subscription includes unlimited access — no per-visit fee."
  },
];
const DURATION_LABELS = { monthly:"Monthly", quarterly:"3 Months", sixmonth:"6 Months", annual:"Annual" };

const editing = ref(null);
const showAdd = ref(false);
const newPlan = ref({ tier:"regular", studentType:"student", duration:"monthly", price:"", dailyFee:"", weeklyFee:"" });
const confirmDelete = ref(null);
const error = ref("");

function planFor(tier, studentType, duration) {
  return (plans.value || []).find((p) => p.tier === tier && p.studentType === studentType && p.duration === duration);
}

async function addPlan() {
  error.value = "";
  try {
    await $fetch("/api/membership-plans", {
      method: "POST",
      body: { ...newPlan.value, price: Number(newPlan.value.price)||0, dailyFee: Number(newPlan.value.dailyFee)||0, weeklyFee: Number(newPlan.value.weeklyFee)||0 },
    });
    showAdd.value = false;
    await refresh();
  } catch (e) { error.value = e.data?.statusMessage || "Could not add plan."; }
}

async function saveEdit() {
  await $fetch(`/api/membership-plans/${editing.value.id}`, {
    method: "PUT",
    body: { price: editing.value.price, dailyFee: editing.value.dailyFee, weeklyFee: editing.value.weeklyFee },
  });
  editing.value = null;
  await refresh();
}

async function deletePlan(id) {
  await $fetch(`/api/membership-plans/${id}`, { method: "DELETE" });
  confirmDelete.value = null;
  await refresh();
}

const currentTier = computed(() => TIERS.find(t => t.id === newPlan.value.tier));
</script>

<template>
  <div>
    <h1 style="font-size:22px; font-weight:800; margin:0;">Membership plans</h1>
    <p style="font-size:13.5px; color:#8a909b; margin:6px 0 24px;">
      Configure subscription prices for each plan. Regular members also have daily and weekly check-in fees. Elite members have no check-in fee — subscription covers unlimited access.
    </p>

    <div v-for="tier in TIERS" :key="tier.id" class="rs-card" style="padding:0; margin-bottom:16px;">
      <div style="padding:14px 18px; border-bottom:1px solid #1c2026; display:flex; align-items:center; gap:12px;">
        <div style="flex:1;">
          <span style="font-weight:700; font-size:14px;">{{ tier.label }}</span>
          <span style="font-size:12px; color:#5bb8f5; margin-left:8px;">{{ tier.rankLabel }}</span>
          <span v-if="tier.note" style="font-size:11px; color:#5d6470; margin-left:10px;">{{ tier.note }}</span>
        </div>
        <button v-if="tier.id !== 'walkin'" class="rs-btn-secondary" style="padding:5px 10px; font-size:11.5px;"
          @click="newPlan={ tier:tier.id, studentType:'student', duration:tier.durations[0], price:'', dailyFee:'', weeklyFee:'' }; showAdd=true">
          Add plan
        </button>
      </div>

      <div v-if="tier.id === 'walkin'" style="padding:14px 18px; font-size:13px; color:#aab0bb;">
        Walk-in fees are set separately for Student and Non-student in <NuxtLink to="/settings" style="color:#5bb8f5;">Settings →</NuxtLink>
      </div>

      <template v-else>
        <div v-for="dur in tier.durations" :key="dur">
          <div style="padding:9px 18px; font-size:12px; font-weight:700; color:#5bb8f5; background:#0d0f12; border-bottom:1px solid #1c2026;">
            {{ DURATION_LABELS[dur] }}
          </div>

          <!-- Column headers -->
          <div :style="`display:grid; grid-template-columns:120px 1fr ${tier.hasVisitFee ? '1fr 1fr' : ''} 100px; gap:8px; padding:8px 18px; font-size:11px; color:#5d6470; border-bottom:1px solid #1c2026;`">
            <span>Student type</span>
            <span>Subscription price</span>
            <template v-if="tier.hasVisitFee">
              <span>Daily check-in fee</span>
              <span>Weekly check-in fee</span>
            </template>
            <span></span>
          </div>

          <!-- Student row -->
          <div v-for="sType in ['student','non-student']" :key="sType"
            :style="`display:grid; grid-template-columns:120px 1fr ${tier.hasVisitFee ? '1fr 1fr' : ''} 100px; gap:8px; align-items:center; padding:10px 18px; border-bottom:1px solid #1c2026;`">
            <span style="font-size:12.5px; font-weight:600; color:#aab0bb; text-transform:capitalize;">{{ sType }}</span>
            <template v-if="planFor(tier.id, sType, dur)">
              <span style="font-size:12.5px;">₱{{ planFor(tier.id, sType, dur).price.toLocaleString() }}</span>
              <template v-if="tier.hasVisitFee">
                <span style="font-size:12.5px;">₱{{ planFor(tier.id, sType, dur).dailyFee.toLocaleString() }}</span>
                <span style="font-size:12.5px;">₱{{ planFor(tier.id, sType, dur).weeklyFee.toLocaleString() }}</span>
              </template>
              <div style="display:flex; gap:4px; justify-content:flex-end;">
                <button class="rs-btn-secondary" style="padding:4px 8px; font-size:11px;" @click="editing={...planFor(tier.id, sType, dur)}">Edit</button>
                <button class="rs-btn-secondary" style="padding:4px 8px; font-size:11px; color:#e88;" @click="confirmDelete=planFor(tier.id, sType, dur)">Del</button>
              </div>
            </template>
            <template v-else>
              <span style="font-size:11.5px; color:#5d6470;" :style="`grid-column: span ${tier.hasVisitFee ? 3 : 1}`">Not configured</span>
              <button class="rs-btn-secondary" style="padding:4px 8px; font-size:11px; justify-self:end;"
                @click="newPlan={tier:tier.id, studentType:sType, duration:dur, price:'', dailyFee:'', weeklyFee:''}; showAdd=true">Add</button>
            </template>
          </div>
        </div>
      </template>
    </div>

    <!-- Add plan modal -->
    <div v-if="showAdd" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:50;">
      <div style="width:400px;background:#13161b;border:1px solid #232730;border-radius:14px;padding:24px;max-height:90vh;overflow-y:auto;">
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
          <button class="rs-btn-secondary" style="flex:1;justify-content:center;"
            :style="{ background:newPlan.studentType==='student'?'#1c2128':'transparent', color:newPlan.studentType==='student'?'#5bb8f5':'#aab0bb', borderColor:newPlan.studentType==='student'?'#2f8fd6':'#2a2f38' }"
            @click="newPlan.studentType='student'">Student</button>
          <button class="rs-btn-secondary" style="flex:1;justify-content:center;"
            :style="{ background:newPlan.studentType==='non-student'?'#1c2128':'transparent', color:newPlan.studentType==='non-student'?'#5bb8f5':'#aab0bb', borderColor:newPlan.studentType==='non-student'?'#2f8fd6':'#2a2f38' }"
            @click="newPlan.studentType='non-student'">Non-student</button>
        </div>
        <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Duration</label>
        <select v-model="newPlan.duration" class="rs-input" style="margin-bottom:14px;">
          <option v-for="dur in (currentTier?.durations || ['monthly','annual'])" :key="dur" :value="dur">{{ DURATION_LABELS[dur] }}</option>
        </select>
        <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Subscription price (₱)</label>
        <input v-model="newPlan.price" type="number" min="0" class="rs-input" :style="`margin-bottom:${currentTier?.hasVisitFee ? '14px' : '10px'};`" />
        <template v-if="currentTier?.hasVisitFee">
          <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Daily check-in fee (₱)</label>
          <input v-model="newPlan.dailyFee" type="number" min="0" class="rs-input" style="margin-bottom:14px;" />
          <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Weekly check-in fee (₱)</label>
          <input v-model="newPlan.weeklyFee" type="number" min="0" class="rs-input" style="margin-bottom:10px;" />
        </template>
        <div v-if="error" style="color:#e36b6b;font-size:12.5px;margin-bottom:10px;">{{ error }}</div>
        <button class="rs-btn-primary" style="width:100%;justify-content:center;" @click="addPlan">Add plan</button>
      </div>
    </div>

    <!-- Edit modal -->
    <div v-if="editing" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:50;">
      <div style="width:380px;background:#13161b;border:1px solid #232730;border-radius:14px;padding:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <div style="font-weight:800;font-size:16px;">Edit — {{ editing.studentType }} / {{ DURATION_LABELS[editing.duration] }}</div>
          <button @click="editing=null" style="background:transparent;border:none;color:#8a909b;cursor:pointer;">✕</button>
        </div>
        <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Subscription price (₱)</label>
        <input v-model.number="editing.price" type="number" min="0" class="rs-input" style="margin-bottom:14px;" />
        <template v-if="editing.tier === 'regular'">
          <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Daily check-in fee (₱)</label>
          <input v-model.number="editing.dailyFee" type="number" min="0" class="rs-input" style="margin-bottom:14px;" />
          <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Weekly check-in fee (₱)</label>
          <input v-model.number="editing.weeklyFee" type="number" min="0" class="rs-input" style="margin-bottom:16px;" />
        </template>
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
