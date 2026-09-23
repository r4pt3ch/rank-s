<script setup>
const sidebarOpen = ref(false);
const route = useRoute();
watch(() => route.path, () => { sidebarOpen.value = false; });
</script>

<template>
  <div style="display: flex; min-height: 100vh;">

    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen"
      @click="sidebarOpen = false"
      style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;"
    />

    <!-- Sidebar -->
    <div :class="sidebarOpen ? 'rs-sidebar rs-sidebar--open' : 'rs-sidebar'">
      <Sidebar />
    </div>

    <!-- Main content -->
    <div class="rs-content">
      <div class="rs-topbar">
        <button
          @click="sidebarOpen = !sidebarOpen"
          style="background:transparent;border:none;color:#aab0bb;cursor:pointer;font-size:22px;line-height:1;padding:0;"
        >☰</button>
        <span style="font-weight:800;font-size:16px;letter-spacing:0.5px;">RANK S</span>
        <div style="width:28px;" />
      </div>
      <slot />
    </div>

  </div>
</template>

<style>
.rs-sidebar { flex-shrink: 0; }
.rs-topbar  { display: none; }
.rs-content { flex: 1; padding: 32px 36px; min-width: 0; }

@media (max-width: 768px) {
  .rs-sidebar {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
    z-index: 50;
  }
  .rs-sidebar--open { transform: translateX(0); }
  .rs-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #111419;
    border-bottom: 1px solid #1f242c;
    margin: -32px -16px 20px;
    position: sticky;
    top: 0;
    z-index: 30;
  }
  .rs-content { padding: 32px 16px; width: 100%; }
}
</style>
