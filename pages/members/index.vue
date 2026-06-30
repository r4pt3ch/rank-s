<script setup>
const { data: members, refresh } = await useFetch("/api/members");
const { data: plans } = await useFetch("/api/membership-plans");

const DURATIONS = [
  { id: "monthly", label: "Monthly" },
  { id: "sixmonth", label: "6 months" },
  { id: "yearly", label: "Yearly" },
  { id: "lifetime", label: "Lifetime" },
];

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
const newMember = ref({ firstName: "", lastName: "", email: "", phone: "", address: "", dob: "" });
const addError = ref("");

const filtered = computed(() =>
  (members.value || []).filter((m) => m.name.toLowerCase().includes(query.value.toLowerCase()))
);

function statusLabel(m) {
  if (m.membershipStatus === "active") return m.membershipDuration === "lifetime" ? "Lifetime" : "Active";
  if (m.membershipStatus === "expired") return "Expired";
  return "No membership";
}
function statusColor(m) {
  if (m.membershipStatus === "active") return "#8ee0ab";
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
    category: m.membershipCategory || "",
    duration: m.membershipDuration || "monthly",
  };
}

async function saveMembership() {
  await $fetch(`/api/members/${membershipFor.value.id}/membership`, { method: "PUT", body: membershipForm.value });
  membershipFor.value = null;
  await refresh();
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Gym members</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">Create accounts, issue QR / barcode / PIN credentials, and manage member information and membership.</p>

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
        <div style="font-size: 11.5px; color: #7a8190; margin-bottom: 10px;">A unique QR code, barcode, and 4-digit PIN are generated automatically. Membership can be assigned afterward.</div>
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
        <div style="font-size: 12px; margin-bottom: 14px;" :style="{ color: statusColor(membershipFor) }">
          Current status: {{ statusLabel(membershipFor) }}
          <span v-if="membershipFor.membershipExpiry && membershipFor.membershipDuration !== 'lifetime'" style="color: #7a8190;">
            ({{ new Date(membershipFor.membershipExpiry).toLocaleDateString() }})
          </span>
        </div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Category</label>
        <input v-model="membershipForm.category" class="rs-input" placeholder="e.g. Student, Regular, VIP..." list="member-category-suggestions" style="margin-bottom: 4px;" />
        <datalist id="member-category-suggestions">
          <option v-for="c in categories" :key="c" :value="c" />
        </datalist>
        <div style="font-size: 11px; color: #5d6470; margin-bottom: 14px;">Must match a category configured on the Membership plans page for the visit fee to apply.</div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Duration</label>
        <select v-model="membershipForm.duration" class="rs-input" style="margin-bottom: 10px;">
          <option v-for="d in DURATIONS" :key="d.id" :value="d.id">{{ d.label }}</option>
        </select>
        <div style="font-size: 11.5px; color: #7a8190; margin-bottom: 16px;">
          Setting this starts a new membership period from today. Use this both to assign a first-time membership and to renew an expired one.
        </div>
        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" @click="saveMembership">Save membership</button>
      </div>
    </div>
  </div>
</template>
