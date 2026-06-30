<script setup>
const { data: plans, refresh } = await useFetch("/api/membership-plans");

const DURATIONS = [
  { id: "monthly", label: "Monthly" },
  { id: "sixmonth", label: "6 months" },
  { id: "yearly", label: "Yearly" },
  { id: "lifetime", label: "Lifetime" },
];
const SUGGESTED_CATEGORIES = ["Student", "Regular", "Senior citizen"];

const showAdd = ref(false);
const editing = ref(null);
const confirmDelete = ref(null);
const error = ref("");
const newPlan = ref({ category: "", duration: "monthly", price: "", visitFee: "" });

const categories = computed(() => {
  const set = new Set((plans.value || []).map((p) => p.category));
  return Array.from(set).sort();
});

function plansForCategory(category) {
  return (plans.value || []).filter((p) => p.category === category);
}

function openAdd(prefillCategory) {
  newPlan.value = { category: prefillCategory || "", duration: "monthly", price: "", visitFee: "" };
  error.value = "";
  showAdd.value = true;
}

async function addPlan() {
  error.value = "";
  if (!newPlan.value.category.trim()) {
    error.value = "Enter a membership category.";
    return;
  }
  try {
    await $fetch("/api/membership-plans", {
      method: "POST",
      body: { ...newPlan.value, price: Number(newPlan.value.price) || 0, visitFee: Number(newPlan.value.visitFee) || 0 },
    });
    showAdd.value = false;
    await refresh();
  } catch (e) {
    error.value = e.data?.statusMessage || "Could not add plan.";
  }
}

function startEdit(plan) {
  editing.value = { ...plan };
}

async function saveEdit() {
  await $fetch(`/api/membership-plans/${editing.value.id}`, {
    method: "PUT",
    body: { category: editing.value.category, price: editing.value.price, visitFee: editing.value.visitFee },
  });
  editing.value = null;
  await refresh();
}

async function deletePlan(id) {
  await $fetch(`/api/membership-plans/${id}`, { method: "DELETE" });
  confirmDelete.value = null;
  await refresh();
}

function durationLabel(id) {
  return DURATIONS.find((d) => d.id === id)?.label || id;
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Membership plans</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">
      Set the subscription price and per-visit fee for each membership type and duration. Categories are fully editable — add your own beyond Student, Regular, and Senior citizen.
    </p>

    <div style="display: flex; justify-content: flex-end; margin-bottom: 14px;">
      <button class="rs-btn-primary" @click="openAdd('')">Add plan</button>
    </div>

    <div v-if="!categories.length" style="font-size: 13px; color: #5d6470; padding: 24px 0; text-align: center;">
      No membership categories yet. Try adding "Student", "Regular", or "Senior citizen" to start, or any category of your own.
    </div>

    <div v-for="cat in categories" :key="cat" class="rs-card" style="padding: 0; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid #1c2026;">
        <span style="font-weight: 700; font-size: 14px;">{{ cat }}</span>
        <button class="rs-btn-secondary" style="padding: 5px 10px; font-size: 11.5px;" @click="openAdd(cat)">Add duration</button>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 110px; gap: 8px; padding: 10px 18px; font-size: 11.5px; color: #7a8190; border-bottom: 1px solid #1c2026;">
        <span>Duration</span><span>Subscription price</span><span>Visit fee</span><span></span>
      </div>
      <div v-for="p in plansForCategory(cat)" :key="p.id" style="display: grid; grid-template-columns: 1fr 1fr 1fr 110px; gap: 8px; align-items: center; padding: 10px 18px; border-bottom: 1px solid #1c2026;">
        <span style="font-size: 13px; font-weight: 600;">{{ durationLabel(p.duration) }}</span>
        <span style="font-size: 12.5px;">₱{{ p.price.toLocaleString() }}</span>
        <span style="font-size: 12.5px;">₱{{ p.visitFee.toLocaleString() }} / visit</span>
        <div style="display: flex; gap: 6px; justify-content: flex-end;">
          <button class="rs-btn-secondary" style="padding: 5px 9px;" @click="startEdit(p)">Edit</button>
          <button class="rs-btn-secondary" style="padding: 5px 9px; color: #e88;" @click="confirmDelete = p">Delete</button>
        </div>
      </div>
    </div>

    <!-- Add plan modal -->
    <div v-if="showAdd" style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 50;">
      <div style="width: 380px; background: #13161b; border: 1px solid #232730; border-radius: 14px; padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div style="font-weight: 800; font-size: 16px;">Add membership plan</div>
          <button @click="showAdd = false" style="background: transparent; border: none; color: #8a909b; cursor: pointer;">✕</button>
        </div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Category</label>
        <input v-model="newPlan.category" class="rs-input" placeholder="e.g. Student, Regular, VIP..." list="category-suggestions" style="margin-bottom: 4px;" />
        <datalist id="category-suggestions">
          <option v-for="c in SUGGESTED_CATEGORIES" :key="c" :value="c" />
          <option v-for="c in categories" :key="c" :value="c" />
        </datalist>
        <div style="font-size: 11px; color: #5d6470; margin-bottom: 14px;">Type a new category or pick an existing one.</div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Duration</label>
        <select v-model="newPlan.duration" class="rs-input" style="margin-bottom: 14px;">
          <option v-for="d in DURATIONS" :key="d.id" :value="d.id">{{ d.label }}</option>
        </select>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Subscription price (₱)</label>
        <input v-model="newPlan.price" type="number" min="0" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Visit fee (₱ per check-in)</label>
        <input v-model="newPlan.visitFee" type="number" min="0" class="rs-input" style="margin-bottom: 10px;" />
        <div v-if="error" style="color: #e36b6b; font-size: 12.5px; margin-bottom: 10px;">{{ error }}</div>
        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" @click="addPlan">Add plan</button>
      </div>
    </div>

    <!-- Edit plan modal -->
    <div v-if="editing" style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 50;">
      <div style="width: 360px; background: #13161b; border: 1px solid #232730; border-radius: 14px; padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div style="font-weight: 800; font-size: 16px;">Edit plan</div>
          <button @click="editing = null" style="background: transparent; border: none; color: #8a909b; cursor: pointer;">✕</button>
        </div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Category</label>
        <input v-model="editing.category" class="rs-input" style="margin-bottom: 14px;" />
        <div style="font-size: 11.5px; color: #7a8190; margin-bottom: 10px;">Duration: {{ durationLabel(editing.duration) }} (fixed per plan)</div>
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Subscription price (₱)</label>
        <input v-model.number="editing.price" type="number" min="0" class="rs-input" style="margin-bottom: 14px;" />
        <label style="font-size: 12px; color: #9aa1ab; display: block; margin-bottom: 6px;">Visit fee (₱ per check-in)</label>
        <input v-model.number="editing.visitFee" type="number" min="0" class="rs-input" style="margin-bottom: 16px;" />
        <button class="rs-btn-primary" style="width: 100%; justify-content: center;" @click="saveEdit">Save changes</button>
      </div>
    </div>

    <!-- Delete confirmation -->
    <div v-if="confirmDelete" style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 50;">
      <div style="width: 340px; background: #13161b; border: 1px solid #232730; border-radius: 14px; padding: 24px;">
        <div style="font-weight: 800; font-size: 16px; margin-bottom: 10px;">Remove this plan?</div>
        <p style="font-size: 13px; color: #aab0bb; margin-bottom: 18px;">Members currently on this plan keep their membership, but it can't be assigned to anyone new until re-added.</p>
        <div style="display: flex; gap: 8px;">
          <button class="rs-btn-secondary" style="flex: 1; justify-content: center;" @click="confirmDelete = null">Cancel</button>
          <button class="rs-btn-secondary" style="flex: 1; justify-content: center; color: #e88; border-color: #5a2424;" @click="deletePlan(confirmDelete.id)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>
