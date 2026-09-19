<script setup>
const { data: members } = await useFetch("/api/members");
const { data: checkins, refresh } = await useFetch("/api/checkins", { query: { today: "1" } });
const { data: allServices } = await useFetch("/api/services");

const tab = ref("member"); // 'member' | 'walkin'
const search = ref("");
const pinInput = ref("");
const walkinName = ref("");
const walkinStudentType = ref("non-student");
const feedback = ref(null);

// services modal state
const showServices = ref(false);
const lastCheckinId = ref(null);
const lastCheckinName = ref("");
const selectedServices = ref([]);
const addingServices = ref(false);
const servicesDone = ref(false);

const activeServices = computed(() => (allServices.value || []).filter((s) => s.active));

const matches = computed(() =>
  search.value ? (members.value || []).filter((m) => m.name.toLowerCase().includes(search.value.toLowerCase())) : []
);

function feeText(result) {
  if (result.duplicateVisit) return " Already checked in today — no additional charge.";
  if (!result.fee) return "";
  if (result.expiredBilling) return ` Membership expired — billed as walk-in: ₱${result.fee}.`;
  return ` Fee charged: ₱${result.fee}.`;
}

function openServicesModal(checkinId, name) {
  lastCheckinId.value = checkinId;
  lastCheckinName.value = name;
  selectedServices.value = [];
  addingServices.value = false;
  servicesDone.value = false;
  showServices.value = true;
}

function toggleService(s) {
  const idx = selectedServices.value.findIndex((x) => x.id === s.id);
  if (idx >= 0) selectedServices.value.splice(idx, 1);
  else selectedServices.value.push({ id: s.id, name: s.name, price: s.price });
}

const servicesTotal = computed(() => selectedServices.value.reduce((sum, s) => sum + s.price, 0));

async function addServices() {
  if (!selectedServices.value.length) { showServices.value = false; return; }
  addingServices.value = true;
  await $fetch(`/api/checkins/${lastCheckinId.value}/services`, {
    method: "POST",
    body: { services: selectedServices.value },
  });
  servicesDone.value = true;
  addingServices.value = false;
  await refresh();
}

async function checkInMember(member) {
  try {
    const result = await $fetch("/api/checkins", { method: "POST", body: { memberId: member.id } });
    feedback.value = { ok: true, text: `${result.name} checked in.${result.leveledUp ? ` Leveled up to ${result.rank}!` : ""}${feeText(result)}` };
    search.value = "";
    await refresh();
    openServicesModal(result.id, result.name);
  } catch (e) {
    feedback.value = { ok: false, text: e.data?.statusMessage || "Check-in failed." };
  }
}

async function checkInByPin() {
  try {
    const result = await $fetch("/api/checkins", { method: "POST", body: { pin: pinInput.value } });
    feedback.value = { ok: true, text: `${result.name} checked in.${result.leveledUp ? ` Leveled up to ${result.rank}!` : ""}${feeText(result)}` };
    pinInput.value = "";
    await refresh();
    openServicesModal(result.id, result.name);
  } catch (e) {
    feedback.value = { ok: false, text: e.data?.statusMessage || "No member found with that PIN." };
  }
}

async function checkInWalkIn() {
  if (!walkinName.value) return;
  try {
    const result = await $fetch("/api/checkins", { method: "POST", body: { name: walkinName.value, studentType: walkinStudentType.value } });
    feedback.value = { ok: true, text: `Walk-in "${walkinName.value}" (${walkinStudentType.value}) logged.${feeText(result)}` };
    walkinName.value = "";
    await refresh();
    openServicesModal(result.id, result.name);
  } catch (e) {
    feedback.value = { ok: false, text: e.data?.statusMessage || "Check-in failed." };
  }
}

function reopenServices(c) {
  openServicesModal(c.id, c.name);
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Check-in</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 18px;">Log members and walk-ins entering the gym. After check-in, add any services they want to purchase.</p>

    <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 18px;">
      <!-- Left: check-in forms -->
      <div class="rs-card">
        <div style="display: flex; gap: 8px; margin-bottom: 18px;">
          <button class="rs-btn-secondary" style="flex:1; justify-content:center;"
            :style="{ background: tab==='member' ? '#1c2128':'transparent', color: tab==='member' ? '#5bb8f5':'#aab0bb', borderColor: tab==='member' ? '#2f8fd6':'#2a2f38' }"
            @click="tab='member'">Member check-in</button>
          <button class="rs-btn-secondary" style="flex:1; justify-content:center;"
            :style="{ background: tab==='walkin' ? '#1c2128':'transparent', color: tab==='walkin' ? '#5bb8f5':'#aab0bb', borderColor: tab==='walkin' ? '#2f8fd6':'#2a2f38' }"
            @click="tab='walkin'">Walk-in (Rank F)</button>
        </div>

        <!-- Member tab -->
        <template v-if="tab === 'member'">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 10px; color: #aab0bb;">Search by name</div>
          <input v-model="search" class="rs-input" placeholder="Search member name..." style="margin-bottom: 10px;" />
          <div v-for="m in matches" :key="m.id" class="rs-row">
            <span style="font-size: 13.5px; font-weight: 600;">{{ m.name }}</span>
            <RankBadge :rank="m.rank" size="sm" />
            <button class="rs-btn-secondary" @click="checkInMember(m)">Check in</button>
          </div>
          <div style="border-top: 1px solid #1c2026; margin-top: 16px; padding-top: 16px;">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 10px; color: #aab0bb;">Or use PIN</div>
            <div style="display: flex; gap: 10px;">
              <input v-model="pinInput" maxlength="6" class="rs-input" placeholder="PIN" style="width: 120px;" />
              <button class="rs-btn-primary" @click="checkInByPin">Check in</button>
            </div>
          </div>
        </template>

        <!-- Walk-in tab -->
        <template v-else>
          <div style="background: #1c2128; border: 1px solid #2a2f38; border-radius: 10px; padding: 16px; margin-bottom: 14px;">
            <div style="font-size: 12.5px; color: #aab0bb; margin-bottom: 6px;">Walk-ins are logged as <b style="color:#f3a8a8">Rank F</b>. Fee is based on student type (set in Settings).</div>
          </div>
          <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Guest name</label>
          <input v-model="walkinName" class="rs-input" placeholder="Guest's name" style="margin-bottom: 14px;" @keyup.enter="checkInWalkIn" />
          <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Student type</label>
          <div style="display: flex; gap: 8px; margin-bottom: 14px;">
            <button class="rs-btn-secondary" style="flex:1; justify-content:center; font-size:12.5px;"
              :style="{ background: walkinStudentType==='student' ? '#1c2128':'transparent', color: walkinStudentType==='student' ? '#5bb8f5':'#aab0bb', borderColor: walkinStudentType==='student' ? '#2f8fd6':'#2a2f38' }"
              @click="walkinStudentType='student'">Student</button>
            <button class="rs-btn-secondary" style="flex:1; justify-content:center; font-size:12.5px;"
              :style="{ background: walkinStudentType==='non-student' ? '#1c2128':'transparent', color: walkinStudentType==='non-student' ? '#5bb8f5':'#aab0bb', borderColor: walkinStudentType==='non-student' ? '#2f8fd6':'#2a2f38' }"
              @click="walkinStudentType='non-student'">Non-student</button>
          </div>
          <button class="rs-btn-primary" style="width:100%; justify-content:center;" :disabled="!walkinName" @click="checkInWalkIn">Log walk-in</button>
        </template>

        <div v-if="feedback" style="margin-top: 16px; padding: 14px; border-radius: 10px;"
          :style="{ background: feedback.ok ? '#142a1e' : '#2a1414', border: `1px solid ${feedback.ok ? '#245a34' : '#5a2424'}` }">
          <span :style="{ color: feedback.ok ? '#8ee0ab' : '#e88', fontSize: '13px' }">{{ feedback.text }}</span>
        </div>
      </div>

      <!-- Right: today's log -->
      <div class="rs-card">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px;">Today's log ({{ checkins?.length || 0 }})</div>
        <div v-if="!checkins?.length" style="font-size: 13px; color: #5d6470; padding: 18px 0; text-align: center;">No check-ins yet.</div>
        <div v-for="c in checkins" :key="c.id" style="display:flex; align-items:center; gap:8px; padding:9px 0; border-bottom:1px solid #1c2026;">
          <span style="font-size:13px; font-weight:600; flex:1;">{{ c.name }}</span>
          <span v-if="c.duplicateVisit" style="font-size:10px; color:#aab0bb; border:1px solid #2a2f38; border-radius:4px; padding:2px 5px;">repeat</span>
          <span v-else-if="c.expiredBilling" style="font-size:10px; color:#e88; border:1px solid #5a2424; border-radius:4px; padding:2px 5px;">expired</span>
          <span style="font-size:11.5px; color:#5bb8f5;">₱{{ c.fee }}</span>
          <span style="font-size:11px; color:#7a8190;">{{ new Date(c.time).toLocaleTimeString() }}</span>
          <RankBadge v-if="c.rank" :rank="c.rank" size="sm" />
          <span v-else style="font-size:10px; color:#f3a8a8; border:1px solid #5a2424; border-radius:4px; padding:2px 5px;">Walk-in</span>
          <button class="rs-btn-secondary" style="padding:3px 7px; font-size:11px;" @click="reopenServices(c)">+ Service</button>
        </div>
      </div>
    </div>

    <!-- Services modal -->
    <div v-if="showServices" style="position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:60;">
      <div style="width:420px; background:#13161b; border:1px solid #232730; border-radius:14px; padding:24px;">
        <div style="font-weight:800; font-size:16px; margin-bottom:6px;">Add services</div>
        <div style="font-size:12.5px; color:#8a909b; margin-bottom:16px;">{{ lastCheckinName }} — select any services to add to this visit.</div>

        <div v-if="servicesDone" style="padding:16px; background:#142a1e; border:1px solid #245a34; border-radius:10px; text-align:center; font-size:13px; color:#8ee0ab; margin-bottom:14px;">
          Services added — ₱{{ servicesTotal.toLocaleString() }} billed.
        </div>

        <template v-if="!servicesDone">
          <div v-if="!activeServices.length" style="font-size:13px; color:#5d6470; text-align:center; padding:18px 0;">
            No services configured yet. Add them under <NuxtLink to="/services" style="color:#5bb8f5;">Services settings</NuxtLink>.
          </div>
          <div v-for="s in activeServices" :key="s.id"
            style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid #1c2026; cursor:pointer;"
            @click="toggleService(s)">
            <div style="width:18px; height:18px; border-radius:4px; border:1px solid #2a2f38; display:flex; align-items:center; justify-content:center;"
              :style="{ background: selectedServices.find(x=>x.id===s.id) ? '#2f8fd6' : 'transparent', borderColor: selectedServices.find(x=>x.id===s.id) ? '#2f8fd6' : '#2a2f38' }">
              <span v-if="selectedServices.find(x=>x.id===s.id)" style="color:#fff; font-size:11px;">✓</span>
            </div>
            <span style="flex:1; font-size:13px; font-weight:600;">{{ s.name }}</span>
            <span style="font-size:12px; color:#aab0bb;">{{ s.category }}</span>
            <span style="font-size:13px; font-weight:700; color:#5bb8f5;">₱{{ s.price.toLocaleString() }}</span>
          </div>
          <div v-if="selectedServices.length" style="display:flex; justify-content:space-between; font-weight:700; padding:12px 0 6px;">
            <span>Total</span><span>₱{{ servicesTotal.toLocaleString() }}</span>
          </div>
        </template>

        <div style="display:flex; gap:8px; margin-top:14px;">
          <button class="rs-btn-secondary" style="flex:1; justify-content:center;" @click="showServices=false">
            {{ servicesDone ? 'Close' : 'Skip' }}
          </button>
          <button v-if="!servicesDone" class="rs-btn-primary" style="flex:1; justify-content:center;"
            :disabled="!selectedServices.length || addingServices" @click="addServices">
            {{ addingServices ? 'Saving...' : `Add (₱${servicesTotal.toLocaleString()})` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
