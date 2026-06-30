<script setup>
const { data: auditTrail } = await useFetch("/api/audit");
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Audit trail</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">Every action taken across the system, attributed to the staff member who performed it.</p>

    <div class="rs-card" style="padding: 0;">
      <div v-if="!auditTrail?.length" style="padding: 24px; text-align: center; color: #5d6470; font-size: 13px;">No actions recorded yet.</div>
      <div v-for="a in auditTrail" :key="a.id" style="padding: 12px 18px; border-bottom: 1px solid #1c2026;">
        <div style="font-size: 13px;">{{ a.action }}</div>
        <div style="font-size: 11px; color: #7a8190; margin-top: 3px;">{{ new Date(a.time).toLocaleString() }} · {{ a.user }}</div>
      </div>
    </div>
  </div>
</template>
