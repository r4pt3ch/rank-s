<script setup>
const sidebarOpen = ref(false);
const route = useRoute();
watch(route, () => { sidebarOpen.value = false; });
</script>

<template>
  <div style="display: flex; min-height: 100vh; position: relative;">
    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen"
      style="position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:40;"
      @click="sidebarOpen=false"
    />

    <!-- Sidebar -->
    <div
      :style="{
        transform: sidebarOpen ? 'translateX(0)' : '',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 50,
        transition: 'transform 0.22s ease',
      }"
      class="rs-sidebar-wrapper"
    >
      <Sidebar />
    </div>

    <!-- Main content -->
    <div class="rs-main-content">
      <!-- Mobile topbar -->
      <div class="rs-mobile-topbar">
        <button @click="sidebarOpen=!sidebarOpen" style="background:transparent; border:none; color:#aab0bb; cursor:pointer; padding:4px; font-size:22px; line-height:1;">☰</button>
        <span style="font-weight:800; font-size:16px; letter-spacing:0.5px;">RANK S</span>
        <div style="width:30px;"></div>
      </div>
      <slot />
    </div>
  </div>
</template>

<style>
/* Desktop: sidebar always visible */
.rs-sidebar-wrapper {
  position: relative !important;
  transform: none !important;
  z-index: auto !important;
}
.rs-mobile-topbar {
  display: none;
}
.rs-main-content {
  flex: 1;
  padding: 32px 36px;
}

/* Mobile: sidebar slides in/out */
@media (max-width: 768px) {
  .rs-sidebar-wrapper {
    position: fixed !important;
    transform: translateX(-100%);
    z-index: 50 !important;
  }
  .rs-sidebar-wrapper[style*="translateX(0)"] {
    transform: translateX(0) !important;
  }
  .rs-mobile-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: #111419;
    border-bottom: 1px solid #1f242c;
    margin: -32px -16px 20px;
    position: sticky;
    top: 0;
    z-index: 30;
  }
  .rs-main-content {
    padding: 32px 16px;
    min-width: 0;
    width: 100%;
  }
}
</style>
