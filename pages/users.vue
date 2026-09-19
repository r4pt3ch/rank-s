<script setup>
const { user: self } = useAuth();
const { data: users, refresh } = await useFetch("/api/users");
const showAdd = ref(false);
const editing = ref(null);
const confirmDelete = ref(null);
const error = ref("");

const newUser = ref({ username: "", name: "", password: "", email: "", role: "admin" });

async function addUser() {
  error.value = "";
  try {
    await $fetch("/api/users", { method: "POST", body: newUser.value });
    newUser.value = { username: "", name: "", password: "", email: "", role: "admin" };
    showAdd.value = false;
    await refresh();
  } catch (e) { error.value = e.data?.statusMessage || "Could not create user."; }
}

async function saveEdit() {
  error.value = "";
  const body = { name: editing.value.name, email: editing.value.email, role: editing.value.role };
  if (editing.value.newPassword) body.newPassword = editing.value.newPassword;
  try {
    await $fetch(`/api/users/${editing.value.id}`, { method: "PUT", body });
    editing.value = null;
    await refresh();
  } catch (e) { error.value = e.data?.statusMessage || "Could not save changes."; }
}

async function deleteUser(id) {
  await $fetch(`/api/users/${id}`, { method: "DELETE" });
  confirmDelete.value = null;
  await refresh();
}

function roleLabel(role) {
  return role === "superadmin" ? "Super admin" : "Regular admin";
}
</script>

<template>
  <div>
    <h1 style="font-size:22px; font-weight:800; margin:0;">User accounts</h1>
    <p style="font-size:13.5px; color:#8a909b; margin:6px 0 24px;">
      Manage staff login accounts. All roles have access to every feature except Audit trail and Login logs, which are Super admin only.
    </p>

    <div style="display:flex; justify-content:flex-end; margin-bottom:14px;">
      <button class="rs-btn-primary" @click="showAdd=true">Add user</button>
    </div>

    <div class="rs-card" style="padding:0;">
      <div v-if="!users?.length" style="padding:24px; text-align:center; color:#5d6470; font-size:13px;">No users yet.</div>
      <div v-for="u in users" :key="u.id" style="display:flex; align-items:center; gap:14px; padding:14px 18px; border-bottom:1px solid #1c2026;">
        <div style="width:38px; height:38px; border-radius:50%; background:#1c2128; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; color:#5bb8f5;">
          {{ u.name.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase() }}
        </div>
        <div style="flex:1;">
          <div style="font-weight:700; font-size:13.5px;">{{ u.name }}</div>
          <div style="font-size:11.5px; color:#7a8190;">@{{ u.username }} · {{ u.email || "no email" }}</div>
        </div>
        <span style="font-size:11.5px; padding:3px 8px; border-radius:6px; background:#1c2128;" :style="{ color: u.role==='superadmin' ? '#f3c44b' : '#5bb8f5' }">
          {{ roleLabel(u.role) }}
        </span>
        <button class="rs-btn-secondary" @click="editing={...u, newPassword:''}">Edit</button>
        <button v-if="u.id !== self?.id" class="rs-btn-secondary" style="color:#e88;" @click="confirmDelete=u">Delete</button>
        <span v-else style="font-size:11px; color:#5d6470;">(you)</span>
      </div>
    </div>

    <!-- Add user modal -->
    <div v-if="showAdd" style="position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:50;">
      <div style="width:400px; background:#13161b; border:1px solid #232730; border-radius:14px; padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <div style="font-weight:800; font-size:16px;">Add user</div>
          <button @click="showAdd=false; error=''" style="background:transparent; border:none; color:#8a909b; cursor:pointer;">✕</button>
        </div>
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Full name</label>
        <input v-model="newUser.name" class="rs-input" placeholder="Front Desk - Maria" style="margin-bottom:14px;" />
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Username</label>
        <input v-model="newUser.username" class="rs-input" placeholder="maria" style="margin-bottom:14px;" />
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Email (optional)</label>
        <input v-model="newUser.email" class="rs-input" placeholder="maria@example.com" style="margin-bottom:14px;" />
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Role</label>
        <select v-model="newUser.role" class="rs-input" style="margin-bottom:14px;">
          <option value="admin">Regular admin</option>
          <option value="superadmin">Super admin</option>
        </select>
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Password</label>
        <input v-model="newUser.password" type="password" class="rs-input" placeholder="Min. 6 characters" style="margin-bottom:10px;" />
        <div v-if="error" style="color:#e36b6b; font-size:12.5px; margin-bottom:10px;">{{ error }}</div>
        <button class="rs-btn-primary" style="width:100%; justify-content:center;" @click="addUser">Create user</button>
      </div>
    </div>

    <!-- Edit user modal -->
    <div v-if="editing" style="position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:50;">
      <div style="width:400px; background:#13161b; border:1px solid #232730; border-radius:14px; padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <div style="font-weight:800; font-size:16px;">Edit user — @{{ editing.username }}</div>
          <button @click="editing=null; error=''" style="background:transparent; border:none; color:#8a909b; cursor:pointer;">✕</button>
        </div>
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Full name</label>
        <input v-model="editing.name" class="rs-input" style="margin-bottom:14px;" />
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Email</label>
        <input v-model="editing.email" class="rs-input" style="margin-bottom:14px;" />
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">Role</label>
        <select v-model="editing.role" class="rs-input" style="margin-bottom:14px;">
          <option value="admin">Regular admin</option>
          <option value="superadmin">Super admin</option>
        </select>
        <label style="font-size:12px; color:#9aa1ab; display:block; margin-bottom:6px;">New password <span style="color:#5d6470;">(leave blank to keep current)</span></label>
        <input v-model="editing.newPassword" type="password" class="rs-input" placeholder="Min. 6 characters" style="margin-bottom:10px;" />
        <div v-if="error" style="color:#e36b6b; font-size:12.5px; margin-bottom:10px;">{{ error }}</div>
        <button class="rs-btn-primary" style="width:100%; justify-content:center;" @click="saveEdit">Save changes</button>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="confirmDelete" style="position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:50;">
      <div style="width:340px; background:#13161b; border:1px solid #232730; border-radius:14px; padding:24px;">
        <div style="font-weight:800; font-size:16px; margin-bottom:10px;">Delete "{{ confirmDelete.name }}"?</div>
        <p style="font-size:13px; color:#aab0bb; margin-bottom:18px;">This account will be removed permanently and they won't be able to log in.</p>
        <div style="display:flex; gap:8px;">
          <button class="rs-btn-secondary" style="flex:1; justify-content:center;" @click="confirmDelete=null">Cancel</button>
          <button class="rs-btn-secondary" style="flex:1; justify-content:center; color:#e88; border-color:#5a2424;" @click="deleteUser(confirmDelete.id)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>
