<script setup>
const { user } = useAuth();
const { data: members, refresh } = await useFetch("/api/members");
const { data: plans } = await useFetch("/api/membership-plans");

const REGULAR_DURATIONS = [
  { id: "monthly", label: "Monthly" },
  { id: "annual",  label: "Annual" },
];
const ELITE_DURATIONS = [
  { id: "monthly",   label: "Monthly" },
  { id: "quarterly", label: "3 Months" },
  { id: "sixmonth",  label: "6 Months" },
  { id: "annual",    label: "Annual" },
];
const availableDurations = computed(() =>
  membershipForm.value.tier === "elite" ? ELITE_DURATIONS : REGULAR_DURATIONS
);

const categories = computed(() => {
  const set = new Set((plans.value || []).map((p) => p.category));
  return Array.from(set).sort();
});

const query = ref("");
const showAdd = ref(false);
const editing = ref(null);
const idCardFor = ref(null);
const membershipFor = ref(null);
const membershipForm = ref({ category: "", duration: "monthly" });
const recordSale = ref(false);
const saleConfirmation = ref("");

// Pause / Resume
const pauseFor = ref(null);
const pauseReason = ref("");
const resumeFor = ref(null);
const resumeReason = ref("");
const pauseError = ref("");
const resumeError = ref("");

async function pauseSubscription() {
  pauseError.value = "";
  try {
    await $fetch(`/api/members/${pauseFor.value.id}/pause`, { method: "POST", body: { reason: pauseReason.value } });
    pauseFor.value = null;
    pauseReason.value = "";
    await refresh();
  } catch (e) { pauseError.value = e.data?.statusMessage || "Could not pause subscription."; }
}

async function resumeSubscription() {
  resumeError.value = "";
  try {
    const result = await $fetch(`/api/members/${resumeFor.value.id}/resume`, { method: "POST", body: { reason: resumeReason.value } });
    resumeFor.value = null;
    resumeReason.value = "";
    await refresh();
    saleConfirmation.value = `Subscription resumed. Expiry extended by ${result.pausedDays} day${result.pausedDays === 1 ? "" : "s"}.`;
    setTimeout(() => (saleConfirmation.value = ""), 4000);
  } catch (e) { resumeError.value = e.data?.statusMessage || "Could not resume subscription."; }
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}
const newMember = ref({ firstName: "", lastName: "", email: "", phone: "", address: "", dob: "" });
const addError = ref("");

const filtered = computed(() =>
  (members.value || []).filter((m) => m.name.toLowerCase().includes(query.value.toLowerCase()))
);

function statusLabel(m) {
  if (m.membershipStatus === "paused")  return "Paused";
  if (m.membershipStatus === "active")  return "Active";
  if (m.membershipStatus === "expired") return "Expired";
  return "No membership";
}
function statusColor(m) {
  if (m.membershipStatus === "paused")  return "#f3c44b";
  if (m.membershipStatus === "active")  return "#8ee0ab";
  if (m.membershipStatus === "expired") return "#e88";
  return "#7a8190";
}

async function createMember() {
  addError.value = "";
  if (!newMember.value.firstName || !newMember.value.lastName) {
    addError.value = "First and last name are required.";
    return;
  }
  try {
    await $fetch("/api/members", { method: "POST", body: newMember.value });
    newMember.value = { firstName: "", lastName: "", email: "", phone: "", address: "", dob: "" };
    showAdd.value = false;
    await refresh();
  } catch (e) {
    addError.value = e.data?.statusMessage || "Could not create member.";
  }
}

function startEdit(m) {
  editing.value = { ...m };
}

async function saveEdit() {
  await $fetch(`/api/members/${editing.value.id}`, { method: "PUT", body: editing.value });
  editing.value = null;
  await refresh();
}

async function resetCredentials(id) {
  await $fetch(`/api/members/${id}/reset`, { method: "POST" });
  await refresh();
}

function openMembership(m) {
  membershipFor.value = m;
  membershipForm.value = {
    tier: m.membershipTier || m.membershipCategory || "regular",
    studentType: m.membershipStudentType || "non-student",
    duration: m.membershipDuration || "monthly",
  };
  recordSale.value = false;
}

const matchedPlan = computed(() => {
  if (!membershipFor.value) return null;
  return (plans.value || []).find((p) =>
    p.tier === membershipForm.value.tier &&
    p.studentType === membershipForm.value.studentType &&
    p.duration === membershipForm.value.duration
  );
});

async function saveMembership() {
  const result = await $fetch(`/api/members/${membershipFor.value.id}/membership`, {
    method: "PUT",
    body: { ...membershipForm.value, recordSale: recordSale.value },
  });
  membershipFor.value = null;
  await refresh();
  if (result.saleRecorded) {
    saleConfirmation.value = `Recorded membership sale of ₱${result.saleAmount.toLocaleString()}.`;
    setTimeout(() => (saleConfirmation.value = ""), 4000);
  }
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Gym members</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 12px;">Create accounts, issue QR / barcode / PIN credentials, and manage member information and membership.</p>
    <p v-if="saleConfirmation" style="font-size: 13px; color: #8ee0ab; margin: 0 0 18px;">{{ saleConfirmation }}</p>

    <div style="display: flex; gap: 10px; margin-bottom: 18px;">
      <input v-model="query" class="rs-input" placeholder="Search members..." />
      <button class="rs-btn-primary" @click="showAdd = true">Create member</button>
    </div>

    <div class="rs-card" style="padding: 0;">
      <div v-if="!filtered.length" style="padding: 24px; text-align: center; color: #5d6470; font-size: 13px;">No members found.</div>
      <div v-for="m in filtered" :key="m.id" style="display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-bottom: 1px solid #1c2026;">
        <div style="width: 38px; height: 38px; border-radius: 50%; background: #1c2128; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: #5bb8f5;">
          {{ m.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() }}
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 13.5px;">{{ m.name }}</div>
          <div style="font-size: 11.5px; color: #7a8190;">
            {{ m.email }} · PIN {{ m.pin }} · {{ m.points }} pts ·
            <span :style="{ color: statusColor(m) }">{{ statusLabel(m) }}</span>
          </div>
        </div>
        <RankBadge :rank="m.rank" />
        <button class="rs-btn-secondary" @click="openMembership(m)">Membership</button>
        <button class="rs-btn-secondary" @click="idCardFor = m">ID card</button>
        <button class="rs-btn-secondary" @click="startEdit(m)">Edit</button>
        <button class="rs-btn-secondary" @click="resetCredentials(m.id)">Reset</button>
      </div>
    </div>

    <!-- Add member modal -->
    <div v-if="showAdd" style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 50;">
      <div style="width: 420px; background: #13161b; border: 1px solid #232730; border-radius: 14px; padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div style="font-weight: 800; font-size: 16px;">Create gym member</div>
          <button @click="showAdd = false" style="background: transparent; border: none; color: #8a909b; cursor: pointer;">✕</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div>
            <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">First name</label>
            <input v-model="newMember.firstName" class="rs-input" placeholder="Juan" />
          </div>
          <div>
            <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Last name</label>
            <input v-model="newMember.lastName" class="rs-input" placeholder="Dela Cruz" />
          </div>
        </div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Email</label>
        <input v-model="newMember.email" class="rs-input" placeholder="name@example.com" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Phone</label>
        <input v-model="newMember.phone" class="rs-input" placeholder="0917 000 0000" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Address</label>
        <input v-model="newMember.address" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Date of birth</label>
        <input v-model="newMember.dob" type="date" class="rs-input" style="margin-bottom: 10px;" />
        <div style="font-size: 11.5px; color: #7a8190; margin-bottom: 10px;">A unique QR code, barcode, and 6-digit PIN are generated automatically. Membership can be assigned afterward.</div>
        <div v-if="addError" style="color: #e36b6b; font-size: 12.5px; margin-bottom: 10px;">{{ addError }}</div>
        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" @click="createMember">Create member</button>
      </div>
    </div>

    <!-- Edit member modal -->
    <div v-if="editing" style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 50;">
      <div style="width: 420px; background: #13161b; border: 1px solid #232730; border-radius: 14px; padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div style="font-weight: 800; font-size: 16px;">Edit member information</div>
          <button @click="editing = null" style="background: transparent; border: none; color: #8a909b; cursor: pointer;">✕</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div>
            <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">First name</label>
            <input v-model="editing.firstName" class="rs-input" />
          </div>
          <div>
            <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Last name</label>
            <input v-model="editing.lastName" class="rs-input" />
          </div>
        </div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Email</label>
        <input v-model="editing.email" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Phone</label>
        <input v-model="editing.phone" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Address</label>
        <input v-model="editing.address" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Points</label>
        <input v-model.number="editing.points" type="number" class="rs-input" style="margin-bottom: 16px;" />

        <!-- Subscription status quick actions -->
        <div v-if="editing.membershipDuration" style="border-top:1px solid #1c2026; padding-top:14px; margin-bottom:16px;">
          <div style="font-size:12px; color:#9aa1ab; margin-bottom:8px;">Subscription</div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:12.5px; font-weight:600;" :style="{ color: editing.membershipPaused ? '#f3c44b' : editing.membershipStatus === 'active' ? '#8ee0ab' : '#e88' }">
              {{ editing.membershipPaused ? "Paused" : editing.membershipStatus === "active" ? "Active" : "Expired" }}
            </span>
            <span style="font-size:12px; color:#7a8190;">
              {{ editing.membershipTier || editing.membershipCategory }} / {{ editing.membershipDuration }}
              <template v-if="editing.membershipExpiry"> · Expires {{ formatDate(editing.membershipExpiry) }}</template>
            </span>
          </div>
          <div v-if="editing.membershipPaused && editing.membershipPauseReason" style="font-size:11.5px; color:#aab0bb; margin-top:6px;">
            Paused: "{{ editing.membershipPauseReason }}"
          </div>
          <button v-if="editing.membershipPaused"
            class="rs-btn-secondary"
            style="margin-top:10px; width:100%; justify-content:center; color:#8ee0ab; border-color:#245a34;"
            @click="resumeFor = editing; editing = null">
            Resume subscription
          </button>
          <button v-else-if="!editing.membershipPaused && user?.role === 'superadmin'"
            class="rs-btn-secondary"
            style="margin-top:10px; width:100%; justify-content:center; color:#f3c44b; border-color:#5a4a14;"
            @click="pauseFor = editing; editing = null">
            Pause subscription
          </button>
        </div>

        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" @click="saveEdit">Save changes</button>
      </div>
    </div>

    <!-- ID card modal -->
    <div v-if="idCardFor" style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 50;">
      <div style="width: 360px; background: #13161b; border: 1px solid #232730; border-radius: 14px; padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div style="font-weight: 800; font-size: 16px;">Member ID</div>
          <button @click="idCardFor = null" style="background: transparent; border: none; color: #8a909b; cursor: pointer;">✕</button>
        </div>
        <div style="border: 1px solid #2a2f38; border-radius: 14px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 11px; color: #aab0bb;">RANK S MEMBER ID</div>
              <div style="font-weight: 800; font-size: 17px; margin-top: 4px;">{{ idCardFor.name }}</div>
            </div>
            <RankBadge :rank="idCardFor.rank" size="lg" />
          </div>
          <div style="font-size: 12px; line-height: 1.9; margin-top: 18px;">
            <div><span style="color: #8a909b;">QR: </span>{{ idCardFor.qr }}</div>
            <div><span style="color: #8a909b;">Barcode: </span>{{ idCardFor.barcode }}</div>
            <div><span style="color: #8a909b;">PIN: </span>{{ idCardFor.pin }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Membership assign/renew modal -->
    <div v-if="membershipFor" style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 50;">
      <div style="width: 380px; background: #13161b; border: 1px solid #232730; border-radius: 14px; padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div style="font-weight: 800; font-size: 16px;">Membership — {{ membershipFor.name }}</div>
          <button @click="membershipFor = null" style="background: transparent; border: none; color: #8a909b; cursor: pointer;">✕</button>
        </div>
        <div style="font-size: 12px; margin-bottom: 6px;" :style="{ color: statusColor(membershipFor) }">
          Current status: {{ statusLabel(membershipFor) }}
          <span v-if="membershipFor.membershipPaused" style="color: #f3c44b;"> — paused on {{ formatDate(membershipFor.membershipPausedAt) }}</span>
        </div>
        <div v-if="membershipFor.membershipStart || membershipFor.membershipExpiry" style="font-size: 11.5px; color: #7a8190; margin-bottom: 10px;">
          <span v-if="membershipFor.membershipStart">Start: {{ formatDate(membershipFor.membershipStart) }}</span>
          <span v-if="membershipFor.membershipExpiry"> &nbsp;·&nbsp; Expiry: {{ formatDate(membershipFor.membershipExpiry) }}</span>
        </div>
        <div v-if="membershipFor.membershipPauseReason" style="font-size:11.5px; color:#aab0bb; background:#1c2128; border-radius:6px; padding:8px 10px; margin-bottom:10px;">
          Pause reason: {{ membershipFor.membershipPauseReason }}
        </div>
        <div style="display:flex; gap:8px; margin-bottom:14px;">
          <button v-if="membershipFor.membershipPaused"
            class="rs-btn-secondary"
            style="color:#8ee0ab; border-color:#245a34; font-size:11.5px; padding:5px 10px;"
            @click="resumeFor=membershipFor">
            Resume subscription
          </button>
          <button v-else-if="!membershipFor.membershipPaused && user?.role === 'superadmin'"
            class="rs-btn-secondary"
            style="color:#f3c44b; border-color:#5a4a14; font-size:11.5px; padding:5px 10px;"
            @click="pauseFor=membershipFor">
            Pause subscription
          </button>
        </div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Tier</label>
        <select v-model="membershipForm.tier" class="rs-input" style="margin-bottom: 14px;" @change="membershipForm.duration = 'monthly'">
          <option value="regular">Regular Member (Rank E–A)</option>
          <option value="elite">Elite Member (Rank S)</option>
        </select>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Student type</label>
        <div style="display: flex; gap: 8px; margin-bottom: 14px;">
          <button class="rs-btn-secondary" style="flex:1; justify-content:center; font-size:12.5px;"
            :style="{ background: membershipForm.studentType==='student' ? '#1c2128':'transparent', color: membershipForm.studentType==='student' ? '#5bb8f5':'#aab0bb', borderColor: membershipForm.studentType==='student' ? '#2f8fd6':'#2a2f38' }"
            @click="membershipForm.studentType='student'">Student</button>
          <button class="rs-btn-secondary" style="flex:1; justify-content:center; font-size:12.5px;"
            :style="{ background: membershipForm.studentType==='non-student' ? '#1c2128':'transparent', color: membershipForm.studentType==='non-student' ? '#5bb8f5':'#aab0bb', borderColor: membershipForm.studentType==='non-student' ? '#2f8fd6':'#2a2f38' }"
            @click="membershipForm.studentType='non-student'">Non-student</button>
        </div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Duration</label>
        <select v-model="membershipForm.duration" class="rs-input" style="margin-bottom: 10px;">
          <option v-for="d in availableDurations" :key="d.id" :value="d.id">{{ d.label }}</option>
        </select>
        <div style="font-size: 11.5px; color: #7a8190; margin-bottom: 16px;">
          Setting this starts a new membership period from today. Use this both to assign a first-time membership and to renew an expired one.
        </div>
        <div v-if="matchedPlan" style="font-size: 13px; margin-bottom: 12px;">
          Subscription price: <b style="color: #5bb8f5;">₱{{ matchedPlan.price.toLocaleString() }}</b>
        </div>
        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; cursor: pointer;">
          <input type="checkbox" v-model="recordSale" style="width: 16px; height: 16px;" />
          <span style="font-size: 12.5px; color: #aab0bb;">Record this as a paid sale in Reports</span>
        </label>
        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" @click="saveMembership">Save membership</button>
      </div>
    </div>

    <!-- Pause subscription modal -->
    <div v-if="pauseFor" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:60;">
      <div style="width:380px;background:#13161b;border:1px solid #232730;border-radius:14px;padding:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-weight:800;font-size:16px;">Pause subscription</div>
          <button @click="pauseFor=null;pauseReason='';pauseError=''" style="background:transparent;border:none;color:#8a909b;cursor:pointer;">✕</button>
        </div>
        <p style="font-size:13px;color:#aab0bb;margin:0 0 14px;">
          Pausing <b>{{ pauseFor.name }}</b>'s subscription stops their expiry clock. When you resume it, the expiry will be extended by the number of days it was paused.
        </p>
        <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Reason for pausing</label>
        <input v-model="pauseReason" class="rs-input" placeholder="e.g. Medical leave, travelling abroad..." style="margin-bottom:10px;" />
        <div v-if="pauseError" style="color:#e36b6b;font-size:12.5px;margin-bottom:10px;">{{ pauseError }}</div>
        <div style="display:flex;gap:8px;">
          <button class="rs-btn-secondary" style="flex:1;justify-content:center;" @click="pauseFor=null;pauseReason='';pauseError=''">Cancel</button>
          <button class="rs-btn-primary" style="flex:1;justify-content:center;background:#5a4a14;border-color:#f3c44b;color:#f3c44b;" @click="pauseSubscription">Pause subscription</button>
        </div>
      </div>
    </div>

    <!-- Resume subscription modal -->
    <div v-if="resumeFor" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:60;">
      <div style="width:380px;background:#13161b;border:1px solid #232730;border-radius:14px;padding:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-weight:800;font-size:16px;">Resume subscription</div>
          <button @click="resumeFor=null;resumeReason='';resumeError=''" style="background:transparent;border:none;color:#8a909b;cursor:pointer;">✕</button>
        </div>
        <p style="font-size:13px;color:#aab0bb;margin:0 0 6px;">
          Resuming <b>{{ resumeFor.name }}</b>'s subscription. The expiry date will automatically be extended by the number of days the subscription was paused.
        </p>
        <div v-if="resumeFor.membershipPausedAt" style="font-size:12px;color:#7a8190;margin-bottom:14px;">
          Paused since: {{ formatDate(resumeFor.membershipPausedAt) }}
          <span v-if="resumeFor.membershipPauseReason"> — "{{ resumeFor.membershipPauseReason }}"</span>
        </div>
        <label style="font-size:12px;color:#9aa1ab;display:block;margin-bottom:6px;">Reason for resuming</label>
        <input v-model="resumeReason" class="rs-input" placeholder="e.g. Returned from leave, cleared medically..." style="margin-bottom:10px;" />
        <div v-if="resumeError" style="color:#e36b6b;font-size:12.5px;margin-bottom:10px;">{{ resumeError }}</div>
        <div style="display:flex;gap:8px;">
          <button class="rs-btn-secondary" style="flex:1;justify-content:center;" @click="resumeFor=null;resumeReason='';resumeError=''">Cancel</button>
          <button class="rs-btn-primary" style="flex:1;justify-content:center;" @click="resumeSubscription">Resume subscription</button>
        </div>
      </div>
    </div>
  </div>
</template>
