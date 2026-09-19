<script setup>
const { data: services, refresh } = await useFetch("/api/services");
const showAdd = ref(false);
const editing = ref(null);
const confirmDelete = ref(null);
const error = ref("");
const newService = ref({ name: "", price: "", category: "" });

async function addService() {
  error.value = "";
  if (!newService.value.name || newService.value.price === "") return;
  try {
    await $fetch("/api/services", { method: "POST", body: { ...newService.value, price: Number(newService.value.price) } });
    newService.value = { name: "", price: "", category: "" };
    showAdd.value = false;
    await refresh();
  } catch (e) { error.value = e.data?.statusMessage || "Could not add service."; }
}

async function saveEdit() {
  await $fetch(`/api/services/${editing.value.id}`, { method: "PUT", body: { name: editing.value.name, price: editing.value.price, category: editing.value.category } });
  editing.value = null;
  await refresh();
}

async function toggleActive(s) {
  await $fetch(`/api/services/${s.id}`, { method: "PUT", body: { active: !s.active } });
  await refresh();
}

async function deleteService(id) {
  await $fetch(`/api/services/${id}`, { method: "DELETE" });
  confirmDelete.value = null;
  await refresh();
}

const categories = computed(() => {
  const set = new Set((services.value || []).map((s) => s.category || "General"));
  return Array.from(set).sort();
});
</script>

<template>
  <div>
    <h1 style="font-size:22px; font-weight:800; margin:0;">Services</h1>
    <p style="font-size:13.5px; color:#8a909b; margin:6px 0 24px;">
      Define the services clients can purchase at check-in — massage, locker rental, personal training sessions, etc.
    </p>

    <div style="display:flex; justify-content:flex-end; margin-bottom:14px;">
      <button class="rs-btn-primary" @click="showAdd=true">Add service</button>
    </div>

    <div class="rs-card" style="padding:0;">
      <div style="display:grid; grid-template-columns:2fr 1fr 1fr 60px 120px; gap:8px; padding:12px 18px; font-size:11.5px; color:#7a8190; border-bottom:1px solid #1c2026;">
        <span>Service</span><span>Category</span><span>Price</span><span>Active</span><span></span>
      </div>
      <div v-if="!services?.length" style="padding:24px; text-align:center; color:#5d6470; font-size:13px;">No services yet. Add some above.</div>
      <div v-for="s in services" :key="s.id" style="display:grid; grid-template-columns:2fr 1fr 1fr 60px 120px; gap:8px; align-items:center; padding:10px 18px; border-bottom:1px solid #1c2026;">
        <span style="font-weight:600; font-size:13px;" :style="{ color: s.active ? '#eceef2' : '#5d6470' }">{{ s.name }}</span>
        <span style="font-size:12.5px; color:#aab0bb;">{{ s.category }}</span>
        <span style="font-size:12.5px; color:#5bb8f5;">₱{{ s.price.toLocaleString() }}</span>
        <div style="display:flex; justify-content:center;">
          <input type="checkbox" :checked="s.active" style="width:16px; height:16px; cursor:pointer;" @change="toggleActive(s)" />
        </div>
        <div style="display:flex; gap:6px; justify-content:flex-end;">
          <button class="rs-btn-secondary" style="padding:5px 9px;" @click="editing={...s}">Edit</button>
          <button class="rs-btn-secondary" style="padding:5px 9px; color:#e88;" @click="confirmDelete=s">Del</button>
        </div>
      </div>
    </div>

    <!-- Add service modal -->
    <div v-if="showAdd" style="position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:50;">
      <div style="width:380px; background:#13161b; border:1px solid #232730; border-radius:14px; padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <div style="font-weight:800; font-size:16px;">Add service</div>
          <button @click="showAdd=false; error=''" style="background:transparent; border:none; color:#8a909b; cursor:pointer;">✕</button>
        </div>
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Service name</label>
        <input v-model="newService.name" class="rs-input" placeholder="e.g. Personal training session" style="margin-bottom:14px;" />
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Price (₱)</label>
        <input v-model="newService.price" type="number" min="0" class="rs-input" style="margin-bottom:14px;" />
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Category</label>
        <input v-model="newService.category" class="rs-input" placeholder="e.g. Training, Wellness, Rental" list="service-categories" style="margin-bottom:10px;" />
        <datalist id="service-categories">
          <option v-for="c in categories" :key="c" :value="c" />
        </datalist>
        <div v-if="error" style="color:#e36b6b; font-size:12.5px; margin-bottom:10px;">{{ error }}</div>
        <button class="rs-btn-primary" style="width:100%; justify-content:center;" @click="addService">Add service</button>
      </div>
    </div>

    <!-- Edit modal -->
    <div v-if="editing" style="position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:50;">
      <div style="width:360px; background:#13161b; border:1px solid #232730; border-radius:14px; padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <div style="font-weight:800; font-size:16px;">Edit service</div>
          <button @click="editing=null" style="background:transparent; border:none; color:#8a909b; cursor:pointer;">✕</button>
        </div>
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Service name</label>
        <input v-model="editing.name" class="rs-input" style="margin-bottom:14px;" />
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Price (₱)</label>
        <input v-model.number="editing.price" type="number" min="0" class="rs-input" style="margin-bottom:14px;" />
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Category</label>
        <input v-model="editing.category" class="rs-input" style="margin-bottom:16px;" />
        <button class="rs-btn-primary" style="width:100%; justify-content:center;" @click="saveEdit">Save changes</button>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="confirmDelete" style="position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:50;">
      <div style="width:340px; background:#13161b; border:1px solid #232730; border-radius:14px; padding:24px;">
        <div style="font-weight:800; font-size:16px; margin-bottom:10px;">Remove "{{ confirmDelete.name }}"?</div>
        <div style="display:flex; gap:8px;">
          <button class="rs-btn-secondary" style="flex:1; justify-content:center;" @click="confirmDelete=null">Cancel</button>
          <button class="rs-btn-secondary" style="flex:1; justify-content:center; color:#e88; border-color:#5a2424;" @click="deleteService(confirmDelete.id)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>
