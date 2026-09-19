<script setup>
const { data: loginLogs } = await useFetch("/api/loginlogs");
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Login logs</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 24px;">Record of every staff login to the system.</p>

    <div class="rs-card" style="padding: 0;">
      <div v-if="!loginLogs?.length" style="padding: 24px; text-align: center; color: #5d6470; font-size: 13px;">No logins recorded yet.</div>
      <div v-for="l in loginLogs" :key="l.id" class="rs-row" style="padding: 12px 18px;">
        <span style="font-size: 13.5px; font-weight: 600;">{{ l.name }}</span>
        <span style="font-size: 12px; color: #7a8190;">{{ new Date(l.time).toLocaleString() }}</span>
        <span style="font-size: 11px; color: #5bb8f5;">{{ l.role }}</span>
      </div>
    </div>
  </div>
</template>
