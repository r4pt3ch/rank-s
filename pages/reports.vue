<script setup>
const view = ref("goers"); // 'goers' | 'checkin' | 'inventory' | 'membership' | 'registered'
const period = ref("daily");
const customStart = ref("");
const customEnd = ref("");
const { data, pending, error: fetchError } = await useFetch("/api/reports", {
  query: { period, start: customStart, end: customEnd },
});

// Member analytics — own filter separate from the revenue period selector
const analyticsYear  = ref(new Date().getFullYear());
const analyticsMonth = ref("");
const analyticsSearch = ref("");
const expandedMember = ref(null);
const { data: analytics, pending: analyticsPending } = await useFetch("/api/member-analytics", {
  query: { year: analyticsYear, month: analyticsMonth },
  watch: [analyticsYear, analyticsMonth],
});
const filteredAnalytics = computed(() => {
  const q = analyticsSearch.value.toLowerCase();
  return (analytics.value?.members || []).filter((m) => !q || m.name.toLowerCase().includes(q));
});
const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function statusColor(s) { return s === "active" ? "#8ee0ab" : s === "expired" ? "#e88" : s === "paused" ? "#f3c44b" : "#7a8190"; }
function years() { const y = new Date().getFullYear(); return Array.from({ length: 6 }, (_, i) => y - i); }

const views = [
  { id: "goers",      label: "Gym goers" },
  { id: "checkin",    label: "Check-in sales" },
  { id: "inventory",  label: "Inventory & services" },
  { id: "membership", label: "Membership sales" },
  { id: "registered", label: "Registered members" },
];
const periods = [
  { id: "daily",   label: "Daily" },
  { id: "weekly",  label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "alltime", label: "All time" },
  { id: "custom",  label: "Custom range" },
];

function selectPeriod(id) {
  period.value = id;
  if (id === "custom" && !customStart.value) {
    const today = new Date().toISOString().slice(0, 10);
    customStart.value = today;
    customEnd.value = today;
  }
}

const rangeLabel = computed(() => {
  if (!data.value) return "";
  if (period.value === "alltime") return "All time";
  if (period.value === "custom") return `${customStart.value || "?"} – ${customEnd.value || "?"}`;
  const start = new Date(data.value.range.start);
  const end = new Date(data.value.range.end);
  if (period.value === "daily") return start.toLocaleDateString();
  return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
});

function periodSlug() {
  if (period.value === "custom") return `${customStart.value || "start"}_to_${customEnd.value || "end"}`;
  return period.value;
}

function downloadCSV(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportGoers() {
  if (!data.value) return;
  const g = data.value.gymGoers;
  const rows = [
    ["Rank S — Gym Goers", period.value, rangeLabel.value],
    [],
    ["Total check-ins", g.totalCheckins],
    ["Member visits", g.memberVisits],
    ["Walk-ins", g.walkinVisits],
    ["Unique members", g.uniqueMembers],
    [],
    ["Date", "Member visits", "Walk-ins", "Total"],
    ...g.byDay.map((d) => [d.date, d.member, d.walkin, d.total]),
  ];
  downloadCSV(`rank-s-gym-goers-${periodSlug()}.csv`, rows);
}

function exportCheckin() {
  if (!data.value) return;
  const c = data.value.checkinSales;
  const rows = [
    ["Rank S — Check-in Sales", period.value, rangeLabel.value],
    [],
    ["Transactions", c.totalTransactions],
    ["Total revenue", c.totalRevenue],
    [],
    ["Member / Guest", "Fee Type", "Amount", "Date", "Time"],
    ...(c.transactions || []).map((t) => {
      const d = new Date(t.datetime);
      return [t.name, t.feeType, t.amount, d.toLocaleDateString("en-PH"), d.toLocaleTimeString("en-PH")];
    }),
  ];
  downloadCSV(`rank-s-checkin-sales-${periodSlug()}.csv`, rows);
}

function exportInventory() {
  if (!data.value) return;
  const inv = data.value.inventorySales;
  const rows = [
    ["Rank S — Inventory & Services", period.value, rangeLabel.value],
    [],
    ["Transactions", inv.totalTransactions],
    ["Items sold", inv.totalItemsSold],
    ["Total revenue", inv.totalRevenue],
    [],
    ["Client", "Items", "Amount", "Date", "Time"],
    ...(inv.transactions || []).map((t) => {
      const d = new Date(t.datetime);
      return [t.name, t.items.map((i) => `${i.name} x${i.qty}`).join("; "), t.total, d.toLocaleDateString("en-PH"), d.toLocaleTimeString("en-PH")];
    }),
  ];
  downloadCSV(`rank-s-inventory-services-${periodSlug()}.csv`, rows);
}

function exportMembership() {
  if (!data.value) return;
  const m = data.value.membershipSales;
  const rows = [
    ["Rank S — Membership Sales", period.value, rangeLabel.value],
    [],
    ["Memberships sold", m.totalSales],
    ["Total revenue", m.totalRevenue],
    [],
    ["Member", "Plan", "Amount", "Date", "Time"],
    ...(m.transactions || []).map((t) => {
      const d = new Date(t.datetime);
      return [t.name, t.plan, t.amount, d.toLocaleDateString("en-PH"), d.toLocaleTimeString("en-PH")];
    }),
  ];
  downloadCSV(`rank-s-membership-sales-${periodSlug()}.csv`, rows);
}

function exportSummary() {
  if (!data.value) return;
  const g = data.value.gymGoers;
  const c = data.value.checkinSales;
  const inv = data.value.inventorySales;
  const mem = data.value.membershipSales;
  const grandTotal = c.totalRevenue + inv.totalRevenue + mem.totalRevenue;
  const rows = [
    ["Rank S — Total Sales Summary", period.value, rangeLabel.value],
    [],
    ["Category", "Revenue"],
    ["Check-in fees", c.totalRevenue],
    ["Inventory & services", inv.totalRevenue],
    ["Membership sales", mem.totalRevenue],
    ["TOTAL", grandTotal],
    [],
    ["Gym goers", g.totalCheckins],
    ["Unique members", g.uniqueMembers],
  ];
  downloadCSV(`rank-s-summary-${periodSlug()}.csv`, rows);
}

function exportRegistered() {
  const list = filteredAnalytics.value;
  if (!list.length) return;
  const rows = [
    [`Rank S — Registered Members Analytics`, `${analyticsYear.value}${analyticsMonth.value ? `-${String(analyticsMonth.value).padStart(2,"0")}` : ""}`],
    [],
    ["Name", "Join Date", "Days Registered", "Total Plans Purchased", "Longest Streak", "Current Streak", "Status"],
    ...list.map((m) => [m.name, m.joinDate, m.daysRegistered, m.totalPurchases, m.longestStreak, m.currentStreak, m.membershipStatus]),
    [],
    ["--- Purchase detail ---"],
    ["Member", "Date", "Plan", "Amount"],
    ...list.flatMap((m) => m.purchases.map((p) => [m.name, p.date, p.plan, p.amount])),
  ];
  downloadCSV(`rank-s-member-analytics-${analyticsYear.value}.csv`, rows);
}

function exportCurrent() {
  if (view.value === "goers") exportGoers();
  else if (view.value === "checkin") exportCheckin();
  else if (view.value === "inventory") exportInventory();
  else if (view.value === "registered") exportRegistered();
  else exportMembership();
}

const grandTotal = computed(() => {
  if (!data.value) return 0;
  return (data.value.checkinSales?.totalRevenue || 0) +
         (data.value.inventorySales?.totalRevenue || 0) +
         (data.value.membershipSales?.totalRevenue || 0);
});
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Reports</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 18px;">Gym attendance, check-in fees, inventory & services, and membership sales — with daily, weekly, monthly, or custom date ranges.</p>

    <!-- View tabs -->
    <div style="display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap;">
      <button
        v-for="v in views" :key="v.id"
        class="rs-btn-secondary"
        :style="{ background: view === v.id ? '#1c2128' : 'transparent', color: view === v.id ? '#5bb8f5' : '#aab0bb', borderColor: view === v.id ? '#2f8fd6' : '#2a2f38' }"
        @click="view = v.id">{{ v.label }}</button>
    </div>

    <!-- Period + export -->
    <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 14px; flex-wrap: wrap;">
      <button
        v-for="p in periods" :key="p.id"
        class="rs-btn-secondary"
        style="padding: 7px 13px; font-size: 12px;"
        :style="{ background: period === p.id ? '#1c2128' : 'transparent', color: period === p.id ? '#5bb8f5' : '#aab0bb', borderColor: period === p.id ? '#2f8fd6' : '#2a2f38' }"
        @click="selectPeriod(p.id)">{{ p.label }}</button>
      <span v-if="period !== 'custom'" style="font-size: 12px; color: #7a8190; margin-left: 8px;">{{ rangeLabel }}</span>
      <div style="flex: 1;"></div>
      <button class="rs-btn-secondary" style="font-size:12px;" @click="exportSummary">Export summary</button>
      <button class="rs-btn-secondary" @click="exportCurrent">Export CSV</button>
    </div>

    <div v-if="period === 'custom'" style="display: flex; gap: 10px; align-items: center; margin-bottom: 22px;">
      <label style="font-size: 12px; color: #9aa1ab;">From</label>
      <input v-model="customStart" type="date" class="rs-input" style="width: 160px;" />
      <label style="font-size: 12px; color: #9aa1ab;">To</label>
      <input v-model="customEnd" type="date" class="rs-input" style="width: 160px;" />
      <span v-if="fetchError" style="font-size: 12px; color: #e88;">Invalid date range.</span>
    </div>

    <div v-if="pending" style="font-size: 13px; color: #5d6470; padding: 24px 0; text-align: center;">Loading report...</div>

    <!-- Total sales summary bar -->
    <template v-if="data && !pending">
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 22px;">
        <div class="rs-card" style="padding: 14px; border-color: #2f8fd6;">
          <div style="font-size: 11px; color: #5bb8f5; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Total sales</div>
          <div style="font-size: 22px; font-weight: 800; color: #5bb8f5;">₱{{ grandTotal.toLocaleString() }}</div>
        </div>
        <div class="rs-card" style="padding: 14px; cursor:pointer;" :style="{ borderColor: view==='checkin' ? '#2f8fd6' : '' }" @click="view='checkin'">
          <div style="font-size: 11px; color: #8a909b; margin-bottom: 6px;">Check-in fees</div>
          <div style="font-size: 20px; font-weight: 800;">₱{{ (data.checkinSales?.totalRevenue || 0).toLocaleString() }}</div>
          <div style="font-size: 11px; color: #5d6470; margin-top: 4px;">{{ data.checkinSales?.totalTransactions || 0 }} transactions</div>
        </div>
        <div class="rs-card" style="padding: 14px; cursor:pointer;" :style="{ borderColor: view==='inventory' ? '#2f8fd6' : '' }" @click="view='inventory'">
          <div style="font-size: 11px; color: #8a909b; margin-bottom: 6px;">Inventory & services</div>
          <div style="font-size: 20px; font-weight: 800;">₱{{ (data.inventorySales?.totalRevenue || 0).toLocaleString() }}</div>
          <div style="font-size: 11px; color: #5d6470; margin-top: 4px;">{{ data.inventorySales?.totalTransactions || 0 }} transactions</div>
        </div>
        <div class="rs-card" style="padding: 14px; cursor:pointer;" :style="{ borderColor: view==='membership' ? '#2f8fd6' : '' }" @click="view='membership'">
          <div style="font-size: 11px; color: #8a909b; margin-bottom: 6px;">Membership sales</div>
          <div style="font-size: 20px; font-weight: 800;">₱{{ (data.membershipSales?.totalRevenue || 0).toLocaleString() }}</div>
          <div style="font-size: 11px; color: #5d6470; margin-top: 4px;">{{ data.membershipSales?.totalSales || 0 }} sold</div>
        </div>
        <div class="rs-card" style="padding: 14px; cursor:pointer;" :style="{ borderColor: view==='goers' ? '#2f8fd6' : '' }" @click="view='goers'">
          <div style="font-size: 11px; color: #8a909b; margin-bottom: 6px;">Gym goers</div>
          <div style="font-size: 20px; font-weight: 800;">{{ data.gymGoers?.totalCheckins || 0 }}</div>
          <div style="font-size: 11px; color: #5d6470; margin-top: 4px;">{{ data.gymGoers?.uniqueMembers || 0 }} unique</div>
        </div>
      </div>
    </template>

    <!-- Gym goers view -->
    <template v-if="data && !pending && view === 'goers'">
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px;">
        <div class="rs-card" style="padding: 16px;"><div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Total check-ins</div><div style="font-size: 24px; font-weight: 800;">{{ data.gymGoers.totalCheckins }}</div></div>
        <div class="rs-card" style="padding: 16px;"><div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Member visits</div><div style="font-size: 24px; font-weight: 800;">{{ data.gymGoers.memberVisits }}</div></div>
        <div class="rs-card" style="padding: 16px;"><div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Walk-ins</div><div style="font-size: 24px; font-weight: 800;">{{ data.gymGoers.walkinVisits }}</div></div>
        <div class="rs-card" style="padding: 16px;"><div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Unique members</div><div style="font-size: 24px; font-weight: 800;">{{ data.gymGoers.uniqueMembers }}</div></div>
      </div>
      <div class="rs-card" style="padding: 0;">
        <div style="padding: 14px 18px; font-weight: 700; font-size: 13.5px; border-bottom: 1px solid #1c2026;">Daily attendance</div>
        <div v-if="!data.gymGoers.byDay.length" style="padding: 24px; text-align: center; color: #5d6470; font-size: 13px;">No check-ins in this period.</div>
        <div v-for="d in data.gymGoers.byDay" :key="d.date" style="display: flex; align-items: center; gap: 14px; padding: 10px 18px; border-bottom: 1px solid #1c2026;">
          <span style="font-size: 12.5px; min-width: 100px; color: #aab0bb;">{{ d.date }}</span>
          <div style="flex: 1; height: 8px; background: #1c2128; border-radius: 6px; overflow: hidden; display: flex;">
            <div style="height: 100%; background: #2f8fd6;" :style="{ width: (d.total ? (d.member / d.total) * 100 : 0) + '%' }"></div>
            <div style="height: 100%; background: #5d6470;" :style="{ width: (d.total ? (d.walkin / d.total) * 100 : 0) + '%' }"></div>
          </div>
          <span style="font-size: 12px; color: #5bb8f5; min-width: 80px; text-align: right;">{{ d.member }} members</span>
          <span style="font-size: 12px; color: #aab0bb; min-width: 60px; text-align: right;">{{ d.walkin }} walk-in</span>
        </div>
      </div>
    </template>

    <!-- Check-in sales view -->
    <template v-else-if="data && !pending && view === 'checkin'">
      <p style="font-size: 12.5px; color: #5d6470; margin: -8px 0 16px;">Visit fees collected at check-in — member per-visit fees (daily/weekly) and walk-in entrance fees.</p>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 18px;">
        <div class="rs-card" style="padding: 16px;"><div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Transactions</div><div style="font-size: 24px; font-weight: 800;">{{ data.checkinSales.totalTransactions }}</div></div>
        <div class="rs-card" style="padding: 16px;"><div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Total revenue</div><div style="font-size: 24px; font-weight: 800;">₱{{ data.checkinSales.totalRevenue.toLocaleString() }}</div></div>
      </div>
      <div class="rs-card" style="padding: 0; margin-bottom: 18px;">
        <div style="padding: 14px 18px; font-weight: 700; font-size: 13.5px; border-bottom: 1px solid #1c2026;">Daily check-in revenue</div>
        <div v-if="!data.checkinSales.byDay.length" style="padding: 24px; text-align: center; color: #5d6470; font-size: 13px;">No check-in fees in this period.</div>
        <div v-for="d in data.checkinSales.byDay" :key="d.date" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding: 10px 18px; border-bottom: 1px solid #1c2026;">
          <span style="font-size: 12.5px; color: #aab0bb;">{{ d.date }}</span>
          <span style="font-size: 12.5px;">{{ d.transactions }} check-ins</span>
          <span style="font-size: 12.5px; color: #5bb8f5; text-align: right;">₱{{ d.revenue.toLocaleString() }}</span>
        </div>
      </div>
      <div class="rs-card" style="padding: 0;">
        <div style="display: grid; grid-template-columns: 1fr 1.5fr 90px 80px; gap: 8px; padding: 12px 18px; font-size: 11.5px; color: #7a8190; border-bottom: 1px solid #1c2026;">
          <span>Member / Guest</span><span>Fee type</span><span>Amount</span><span>Date & time</span>
        </div>
        <div v-if="!data.checkinSales.transactions?.length" style="padding: 24px; text-align: center; color: #5d6470; font-size: 13px;">No check-in fees in this period.</div>
        <div v-for="(t, i) in data.checkinSales.transactions" :key="i" style="display: grid; grid-template-columns: 1fr 1.5fr 90px 80px; gap: 8px; align-items: center; padding: 10px 18px; border-bottom: 1px solid #1c2026;">
          <span style="font-weight: 600; font-size: 13px;">{{ t.name }}</span>
          <span style="font-size: 12px; color: #aab0bb;">{{ t.feeType }}</span>
          <span style="font-size: 12.5px; color: #5bb8f5;">₱{{ t.amount.toLocaleString() }}</span>
          <span style="font-size: 11.5px; color: #7a8190;">{{ new Date(t.datetime).toLocaleString("en-PH", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) }}</span>
        </div>
      </div>
    </template>

    <!-- Inventory & services view -->
    <template v-else-if="data && !pending && view === 'inventory'">
      <p style="font-size: 12.5px; color: #5d6470; margin: -8px 0 16px;">POS product sales and services added during or after check-in.</p>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px;">
        <div class="rs-card" style="padding: 16px;"><div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Transactions</div><div style="font-size: 24px; font-weight: 800;">{{ data.inventorySales.totalTransactions }}</div></div>
        <div class="rs-card" style="padding: 16px;"><div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Items sold</div><div style="font-size: 24px; font-weight: 800;">{{ data.inventorySales.totalItemsSold }}</div></div>
        <div class="rs-card" style="padding: 16px;"><div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Total revenue</div><div style="font-size: 24px; font-weight: 800;">₱{{ data.inventorySales.totalRevenue.toLocaleString() }}</div></div>
      </div>
      <div class="rs-card" style="padding: 0;">
        <div style="display: grid; grid-template-columns: 1fr 2fr 80px 100px; gap: 8px; padding: 12px 18px; font-size: 11.5px; color: #7a8190; border-bottom: 1px solid #1c2026;">
          <span>Client</span><span>Items</span><span>Amount</span><span>Date & time</span>
        </div>
        <div v-if="!data.inventorySales.transactions?.length" style="padding: 24px; text-align: center; color: #5d6470; font-size: 13px;">No sales in this period.</div>
        <div v-for="(t, i) in data.inventorySales.transactions" :key="i" style="display: grid; grid-template-columns: 1fr 2fr 80px 100px; gap: 8px; align-items: start; padding: 10px 18px; border-bottom: 1px solid #1c2026;">
          <span style="font-weight: 600; font-size: 13px;">{{ t.name }}</span>
          <div>
            <div v-for="item in t.items" :key="item.name" style="font-size: 12px; color: #aab0bb;">{{ item.name }} × {{ item.qty }}</div>
          </div>
          <span style="font-size: 12.5px; color: #5bb8f5;">₱{{ t.total.toLocaleString() }}</span>
          <span style="font-size: 11.5px; color: #7a8190;">{{ new Date(t.datetime).toLocaleString("en-PH", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) }}</span>
        </div>
      </div>
    </template>

    <!-- Membership sales view -->
    <template v-else-if="data && !pending && view === 'membership'">
      <p style="font-size: 12.5px; color: #5d6470; margin: -8px 0 16px;">Revenue from membership plans sold or renewed on the Gym Members page.</p>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 18px;">
        <div class="rs-card" style="padding: 16px;"><div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Memberships sold</div><div style="font-size: 24px; font-weight: 800;">{{ data.membershipSales.totalSales }}</div></div>
        <div class="rs-card" style="padding: 16px;"><div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Total revenue</div><div style="font-size: 24px; font-weight: 800;">₱{{ data.membershipSales.totalRevenue.toLocaleString() }}</div></div>
      </div>
      <div class="rs-card" style="padding: 0;">
        <div style="display: grid; grid-template-columns: 1fr 2fr 80px 100px; gap: 8px; padding: 12px 18px; font-size: 11.5px; color: #7a8190; border-bottom: 1px solid #1c2026;">
          <span>Member</span><span>Plan</span><span>Amount</span><span>Date & time</span>
        </div>
        <div v-if="!data.membershipSales.transactions?.length" style="padding: 24px; text-align: center; color: #5d6470; font-size: 13px;">No membership sales in this period.</div>
        <div v-for="(t, i) in data.membershipSales.transactions" :key="i" style="display: grid; grid-template-columns: 1fr 2fr 80px 100px; gap: 8px; align-items: center; padding: 10px 18px; border-bottom: 1px solid #1c2026;">
          <span style="font-weight: 600; font-size: 13px;">{{ t.name }}</span>
          <span style="font-size: 12px; color: #aab0bb;">{{ t.plan }}</span>
          <span style="font-size: 12.5px; color: #5bb8f5;">₱{{ t.amount.toLocaleString() }}</span>
          <span style="font-size: 11.5px; color: #7a8190;">{{ new Date(t.datetime).toLocaleString("en-PH", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) }}</span>
        </div>
      </div>
    </template>
    <!-- Registered members / member analytics view -->
    <template v-else-if="view === 'registered'">
      <!-- Own filter bar — independent from the revenue period selector -->
      <div style="display:flex; gap:10px; align-items:center; margin-bottom:18px; flex-wrap:wrap;">
        <select v-model.number="analyticsYear" class="rs-input" style="width:100px;">
          <option v-for="y in years()" :key="y" :value="y">{{ y }}</option>
        </select>
        <select v-model="analyticsMonth" class="rs-input" style="width:100px;">
          <option value="">All months</option>
          <option v-for="(m, i) in MONTHS.slice(1)" :key="i+1" :value="i+1">{{ m }}</option>
        </select>
        <input v-model="analyticsSearch" class="rs-input" style="width:200px;" placeholder="Search by name..." />
        <span style="font-size:12px; color:#5d6470;">{{ filteredAnalytics.length }} member{{ filteredAnalytics.length === 1 ? '' : 's' }}</span>
      </div>

      <div v-if="analyticsPending" style="font-size:13px; color:#5d6470; padding:24px 0; text-align:center;">Loading...</div>
      <template v-else>
        <div class="rs-card" style="padding:0;">
          <!-- Header -->
          <div style="display:grid; grid-template-columns:1.5fr 90px 80px 60px 60px 60px 70px; gap:8px; padding:10px 18px; font-size:11px; color:#5d6470; border-bottom:1px solid #1c2026;">
            <span>Member</span>
            <span>Joined</span>
            <span>Days reg.</span>
            <span>Plans</span>
            <span>Streak</span>
            <span>Current</span>
            <span>Status</span>
          </div>
          <div v-if="!filteredAnalytics.length" style="padding:24px; text-align:center; color:#5d6470; font-size:13px;">No members found.</div>
          <template v-for="m in filteredAnalytics" :key="m.id">
            <div style="display:grid; grid-template-columns:1.5fr 90px 80px 60px 60px 60px 70px; gap:8px; align-items:center; padding:10px 18px; border-bottom:1px solid #1c2026; cursor:pointer;"
              :style="{ background: expandedMember === m.id ? '#0d0f12' : '' }"
              @click="expandedMember = expandedMember === m.id ? null : m.id">
              <span style="font-size:13px; font-weight:600;">{{ m.name }}</span>
              <span style="font-size:12px; color:#aab0bb;">{{ m.joinDate }}</span>
              <span style="font-size:12px;">{{ m.daysRegistered }}d</span>
              <span style="font-size:12px; text-align:center;">{{ m.totalPurchases }}</span>
              <span style="font-size:12px; text-align:center;" :style="{ color: m.longestStreak >= 3 ? '#8ee0ab' : '' }">{{ m.longestStreak }}x</span>
              <span style="font-size:12px; text-align:center;" :style="{ color: m.currentStreak > 0 ? '#5bb8f5' : '#5d6470' }">{{ m.currentStreak }}x</span>
              <span style="font-size:11px; font-weight:600;" :style="{ color: statusColor(m.membershipStatus) }">{{ m.membershipStatus }}</span>
            </div>
            <!-- Expanded: full purchase history -->
            <div v-if="expandedMember === m.id" style="padding:12px 18px 16px; background:#0d0f12; border-bottom:1px solid #1c2026;">
              <div style="font-size:12px; color:#5d6470; margin-bottom:8px;">
                Registered {{ m.daysRegistered }} days ago · {{ m.totalPurchases }} subscription purchase{{ m.totalPurchases === 1 ? '' : 's' }} · Longest streak: {{ m.longestStreak }}x · Current streak: {{ m.currentStreak }}x
              </div>
              <div v-if="!m.purchases.length" style="font-size:12.5px; color:#5d6470;">No subscription purchases recorded.</div>
              <div v-else style="display:grid; grid-template-columns:90px 1fr 80px; gap:6px; font-size:11px; color:#5d6470; margin-bottom:6px;">
                <span>Date</span><span>Plan</span><span>Amount</span>
              </div>
              <div v-for="(p, i) in m.purchases" :key="i" style="display:grid; grid-template-columns:90px 1fr 80px; gap:6px; padding:5px 0; border-bottom:1px solid #1a1e24;">
                <span style="font-size:12px; color:#aab0bb;">{{ p.date }}</span>
                <span style="font-size:12px;">{{ p.plan }}</span>
                <span style="font-size:12px; color:#5bb8f5;">₱{{ p.amount.toLocaleString() }}</span>
              </div>
            </div>
          </template>
        </div>
      </template>
    </template>
  </div>
</template>
