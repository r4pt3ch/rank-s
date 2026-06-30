<script setup>
const view = ref("goers"); // 'goers' | 'inventory' | 'membership'
const period = ref("daily");
const { data, pending } = await useFetch("/api/reports", { query: { period } });

const views = [
  { id: "goers", label: "Gym goers" },
  { id: "inventory", label: "Inventory sales" },
  { id: "membership", label: "Membership sales" },
];
const periods = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "alltime", label: "All time" },
];

const rangeLabel = computed(() => {
  if (!data.value) return "";
  if (period.value === "alltime") return "All time";
  const start = new Date(data.value.range.start);
  const end = new Date(data.value.range.end);
  if (period.value === "daily") return start.toLocaleDateString();
  return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
});

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
    ["Rank S — gym goers report", period.value, rangeLabel.value],
    [],
    ["Summary"],
    ["Total check-ins", g.totalCheckins],
    ["Member visits", g.memberVisits],
    ["Walk-ins", g.walkinVisits],
    ["Unique members", g.uniqueMembers],
    [],
    ["Date", "Member visits", "Walk-ins", "Total"],
    ...g.byDay.map((d) => [d.date, d.member, d.walkin, d.total]),
  ];
  downloadCSV(`rank-s-gym-goers-${period.value}.csv`, rows);
}

function exportInventory() {
  if (!data.value) return;
  const inv = data.value.inventorySales;
  const rows = [
    ["Rank S — inventory sales report", period.value, rangeLabel.value],
    [],
    ["Summary"],
    ["Transactions", inv.totalTransactions],
    ["Items sold", inv.totalItemsSold],
    ["Total revenue", inv.totalRevenue],
    [],
    ["Date", "Transactions", "Items sold", "Revenue"],
    ...inv.byDay.map((d) => [d.date, d.transactions, d.itemsSold, d.revenue]),
    [],
    ["Product", "Qty sold", "Revenue"],
    ...inv.byProduct.map((p) => [p.name, p.qty, p.revenue]),
  ];
  downloadCSV(`rank-s-inventory-sales-${period.value}.csv`, rows);
}

function exportMembership() {
  if (!data.value) return;
  const m = data.value.membershipSales;
  const rows = [
    ["Rank S — membership plan sales report", period.value, rangeLabel.value],
    [],
    ["Summary"],
    ["Memberships sold", m.totalSales],
    ["Total revenue", m.totalRevenue],
    [],
    ["Date", "Memberships sold", "Revenue"],
    ...m.byDay.map((d) => [d.date, d.count, d.revenue]),
    [],
    ["Plan", "Count", "Revenue"],
    ...m.byPlan.map((p) => [p.name, p.count, p.revenue]),
  ];
  downloadCSV(`rank-s-membership-sales-${period.value}.csv`, rows);
}

function exportCurrent() {
  if (view.value === "goers") exportGoers();
  else if (view.value === "inventory") exportInventory();
  else exportMembership();
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Reports</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 18px;">Gym attendance, inventory sales, and membership plan sales, viewed separately, broken down by day, week, month, or all time.</p>

    <div style="display: flex; gap: 6px; margin-bottom: 14px;">
      <button
        v-for="v in views"
        :key="v.id"
        class="rs-btn-secondary"
        :style="{ background: view === v.id ? '#1c2128' : 'transparent', color: view === v.id ? '#5bb8f5' : '#aab0bb', borderColor: view === v.id ? '#2f8fd6' : '#2a2f38' }"
        @click="view = v.id"
      >
        {{ v.label }}
      </button>
    </div>

    <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 22px; flex-wrap: wrap;">
      <button
        v-for="p in periods"
        :key="p.id"
        class="rs-btn-secondary"
        style="padding: 7px 13px; font-size: 12px;"
        :style="{ background: period === p.id ? '#1c2128' : 'transparent', color: period === p.id ? '#5bb8f5' : '#aab0bb', borderColor: period === p.id ? '#2f8fd6' : '#2a2f38' }"
        @click="period = p.id"
      >
        {{ p.label }}
      </button>
      <span style="font-size: 12px; color: #7a8190; margin-left: 8px;">{{ rangeLabel }}</span>
      <div style="flex: 1;"></div>
      <button class="rs-btn-secondary" @click="exportCurrent">Export CSV</button>
    </div>

    <div v-if="pending" style="font-size: 13px; color: #5d6470; padding: 24px 0; text-align: center;">Loading report...</div>

    <!-- Gym goers view -->
    <template v-else-if="data && view === 'goers'">
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px;">
        <div class="rs-card" style="padding: 16px;">
          <div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Total check-ins</div>
          <div style="font-size: 24px; font-weight: 800;">{{ data.gymGoers.totalCheckins }}</div>
        </div>
        <div class="rs-card" style="padding: 16px;">
          <div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Member visits</div>
          <div style="font-size: 24px; font-weight: 800;">{{ data.gymGoers.memberVisits }}</div>
        </div>
        <div class="rs-card" style="padding: 16px;">
          <div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Walk-ins</div>
          <div style="font-size: 24px; font-weight: 800;">{{ data.gymGoers.walkinVisits }}</div>
        </div>
        <div class="rs-card" style="padding: 16px;">
          <div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Unique members</div>
          <div style="font-size: 24px; font-weight: 800;">{{ data.gymGoers.uniqueMembers }}</div>
        </div>
      </div>

      <div class="rs-card" style="padding: 0;">
        <div style="padding: 14px 18px; font-weight: 700; font-size: 13.5px; border-bottom: 1px solid #1c2026;">
          {{ period === "daily" ? "Today's attendance" : "Daily attendance" }}
        </div>
        <div v-if="!data.gymGoers.byDay.length" style="padding: 24px; text-align: center; color: #5d6470; font-size: 13px;">No check-ins in this period.</div>
        <div v-for="d in data.gymGoers.byDay" :key="d.date" style="display: flex; align-items: center; gap: 14px; padding: 10px 18px; border-bottom: 1px solid #1c2026;">
          <span style="font-size: 12.5px; min-width: 100px; color: #aab0bb;">{{ d.date }}</span>
          <div style="flex: 1; height: 8px; background: #1c2128; border-radius: 6px; overflow: hidden; display: flex;">
            <div style="height: 100%; background: #2f8fd6;" :style="{ width: (d.total ? (d.member / d.total) * 100 : 0) + '%' }"></div>
            <div style="height: 100%; background: #5d6470;" :style="{ width: (d.total ? (d.walkin / d.total) * 100 : 0) + '%' }"></div>
          </div>
          <span style="font-size: 12px; color: #5bb8f5; min-width: 70px; text-align: right;">{{ d.member }} members</span>
          <span style="font-size: 12px; color: #aab0bb; min-width: 60px; text-align: right;">{{ d.walkin }} walk-in</span>
        </div>
      </div>
    </template>

    <!-- Inventory sales view -->
    <template v-else-if="data && view === 'inventory'">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px;">
        <div class="rs-card" style="padding: 16px;">
          <div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Transactions</div>
          <div style="font-size: 24px; font-weight: 800;">{{ data.inventorySales.totalTransactions }}</div>
        </div>
        <div class="rs-card" style="padding: 16px;">
          <div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Items sold</div>
          <div style="font-size: 24px; font-weight: 800;">{{ data.inventorySales.totalItemsSold }}</div>
        </div>
        <div class="rs-card" style="padding: 16px;">
          <div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Total revenue</div>
          <div style="font-size: 24px; font-weight: 800;">₱{{ data.inventorySales.totalRevenue.toLocaleString() }}</div>
        </div>
      </div>

      <div class="rs-card" style="padding: 0; margin-bottom: 18px;">
        <div style="padding: 14px 18px; font-weight: 700; font-size: 13.5px; border-bottom: 1px solid #1c2026;">
          {{ period === "daily" ? "Today's sales" : "Daily sales" }}
        </div>
        <div v-if="!data.inventorySales.byDay.length" style="padding: 24px; text-align: center; color: #5d6470; font-size: 13px;">No sales in this period.</div>
        <div v-for="d in data.inventorySales.byDay" :key="d.date" style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; padding: 10px 18px; border-bottom: 1px solid #1c2026;">
          <span style="font-size: 12.5px; color: #aab0bb;">{{ d.date }}</span>
          <span style="font-size: 12.5px;">{{ d.transactions }} txns</span>
          <span style="font-size: 12.5px;">{{ d.itemsSold }} items</span>
          <span style="font-size: 12.5px; color: #5bb8f5; text-align: right;">₱{{ d.revenue.toLocaleString() }}</span>
        </div>
      </div>

      <div class="rs-card" style="padding: 0;">
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; padding: 12px 18px; font-size: 11.5px; color: #7a8190; border-bottom: 1px solid #1c2026;">
          <span>Product</span><span>Qty sold</span><span>Revenue</span>
        </div>
        <div v-if="!data.inventorySales.byProduct.length" style="padding: 24px; text-align: center; color: #5d6470; font-size: 13px;">No sales in this period.</div>
        <div v-for="p in data.inventorySales.byProduct" :key="p.name" style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; align-items: center; padding: 10px 18px; border-bottom: 1px solid #1c2026;">
          <span style="font-weight: 600; font-size: 13px;">{{ p.name }}</span>
          <span style="font-size: 12.5px;">{{ p.qty }}</span>
          <span style="font-size: 12.5px;">₱{{ p.revenue.toLocaleString() }}</span>
        </div>
      </div>
    </template>

    <!-- Membership sales view -->
    <template v-else-if="data && view === 'membership'">
      <p style="font-size: 12.5px; color: #5d6470; margin: -8px 0 16px;">
        Revenue from membership plans sold or renewed via the "Membership" action on the Gym members page. Separate from per-visit fees, which show under Inventory sales.
      </p>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 18px;">
        <div class="rs-card" style="padding: 16px;">
          <div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Memberships sold</div>
          <div style="font-size: 24px; font-weight: 800;">{{ data.membershipSales.totalSales }}</div>
        </div>
        <div class="rs-card" style="padding: 16px;">
          <div style="font-size: 12px; color: #8a909b; margin-bottom: 10px;">Total revenue</div>
          <div style="font-size: 24px; font-weight: 800;">₱{{ data.membershipSales.totalRevenue.toLocaleString() }}</div>
        </div>
      </div>

      <div class="rs-card" style="padding: 0; margin-bottom: 18px;">
        <div style="padding: 14px 18px; font-weight: 700; font-size: 13.5px; border-bottom: 1px solid #1c2026;">
          {{ period === "daily" ? "Today's membership sales" : "Daily membership sales" }}
        </div>
        <div v-if="!data.membershipSales.byDay.length" style="padding: 24px; text-align: center; color: #5d6470; font-size: 13px;">No membership sales in this period.</div>
        <div v-for="d in data.membershipSales.byDay" :key="d.date" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding: 10px 18px; border-bottom: 1px solid #1c2026;">
          <span style="font-size: 12.5px; color: #aab0bb;">{{ d.date }}</span>
          <span style="font-size: 12.5px;">{{ d.count }} sold</span>
          <span style="font-size: 12.5px; color: #5bb8f5; text-align: right;">₱{{ d.revenue.toLocaleString() }}</span>
        </div>
      </div>

      <div class="rs-card" style="padding: 0;">
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; padding: 12px 18px; font-size: 11.5px; color: #7a8190; border-bottom: 1px solid #1c2026;">
          <span>Plan</span><span>Count</span><span>Revenue</span>
        </div>
        <div v-if="!data.membershipSales.byPlan.length" style="padding: 24px; text-align: center; color: #5d6470; font-size: 13px;">No membership sales in this period.</div>
        <div v-for="p in data.membershipSales.byPlan" :key="p.name" style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; align-items: center; padding: 10px 18px; border-bottom: 1px solid #1c2026;">
          <span style="font-weight: 600; font-size: 13px;">{{ p.name }}</span>
          <span style="font-size: 12.5px;">{{ p.count }}</span>
          <span style="font-size: 12.5px;">₱{{ p.revenue.toLocaleString() }}</span>
        </div>
      </div>
    </template>
  </div>
</template>
