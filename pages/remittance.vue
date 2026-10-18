<script setup>
const { user } = useAuth();
const { gymDateTime } = useGymTime();
const isSuper = computed(() => user.value?.role === "superadmin");

const { data, refresh } = await useFetch("/api/remittances");
const { data: pendingVoids, refresh: refreshPending } = await useFetch("/api/remittance-void-requests");

const bills = PESO_DENOMINATIONS.filter((d) => d.type === "bill");
const coins = PESO_DENOMINATIONS.filter((d) => d.type === "coin");

// ---- Entry form (editable until saved) ----
function emptyCounts() {
  return Object.fromEntries(PESO_DENOMINATIONS.map((d) => [d.key, ""]));
}
const counts = ref(emptyCounts());
const remarks = ref("");

function count(key) {
  const n = parseInt(counts.value[key], 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function bump(key, delta) {
  counts.value[key] = String(Math.max(0, count(key) + delta) || "");
}
function sanitize(key) {
  const digits = String(counts.value[key] ?? "").replace(/\D/g, "").slice(0, 6);
  counts.value[key] = digits.replace(/^0+(?=\d)/, "");
}
function lineAmount(d) {
  return (Math.round(d.value * 100) * count(d.key)) / 100;
}
const numericCounts = computed(() => Object.fromEntries(PESO_DENOMINATIONS.map((d) => [d.key, count(d.key)])));
const billsTotal = computed(() => pesoTotal(Object.fromEntries(bills.map((d) => [d.key, count(d.key)]))));
const coinsTotal = computed(() => pesoTotal(Object.fromEntries(coins.map((d) => [d.key, count(d.key)]))));
const grandTotal = computed(() => pesoTotal(numericCounts.value));
const hasEntries = computed(() => grandTotal.value > 0);

function clearForm() {
  counts.value = emptyCounts();
  remarks.value = "";
}

// ---- Confirm + save ----
const confirming = ref(false);
const saving = ref(false);
const saveError = ref("");
const savedNotice = ref("");

const confirmLines = computed(() =>
  PESO_DENOMINATIONS.filter((d) => count(d.key) > 0).map((d) => ({ ...d, count: count(d.key), amount: lineAmount(d) }))
);
const projectedRemitted = computed(() => (data.value?.todayRemitted || 0) + grandTotal.value);

async function save() {
  if (saving.value) return;
  saving.value = true;
  saveError.value = "";
  try {
    const saved = await $fetch("/api/remittances", {
      method: "POST",
      body: { counts: numericCounts.value, remarks: remarks.value },
    });
    confirming.value = false;
    clearForm();
    savedNotice.value = `Remittance of ${formatPeso(saved.totalCash)} saved.`;
    setTimeout(() => (savedNotice.value = ""), 5000);
    await refresh();
  } catch (e) {
    saveError.value = e.data?.statusMessage || "Could not save the remittance. Please try again.";
  } finally {
    saving.value = false;
  }
}

// ---- Today summary ----
const difference = computed(() => Math.round(((data.value?.todayRemitted || 0) - (data.value?.todaySales || 0)) * 100) / 100);
function diffLabel(n) {
  if (n === 0) return "Balanced";
  return n > 0 ? "Over" : "Short";
}
function diffColor(n) {
  return n === 0 ? "#8ee0ab" : n > 0 ? "#f3c44b" : "#e88";
}

// ---- Recent list ----
const expanded = ref(null);
const records = computed(() => data.value?.records || []);

function statusBadge(r) {
  if (r.voided) return { text: "Voided", color: "#e88", bg: "#2a1414" };
  if (r.voidStatus === "pending") return { text: "Void pending", color: "#f3c44b", bg: "#2a2414" };
  if (r.voidStatus === "rejected") return { text: "Void rejected", color: "#aab0bb", bg: "#1c2128" };
  return { text: "Saved", color: "#8ee0ab", bg: "#14261b" };
}

// ---- Void request (any staff) ----
const voidFor = ref(null);
const voidReason = ref("");
const voidError = ref("");
const voidBusy = ref(false);

async function submitVoid() {
  if (voidBusy.value) return;
  voidBusy.value = true;
  voidError.value = "";
  try {
    await $fetch(`/api/remittances/${voidFor.value.id}/void-request`, { method: "POST", body: { reason: voidReason.value } });
    voidFor.value = null;
    voidReason.value = "";
    await Promise.all([refresh(), refreshPending()]);
  } catch (e) {
    voidError.value = e.data?.statusMessage || "Could not submit the void request.";
  } finally {
    voidBusy.value = false;
  }
}

// ---- Void review (super admin only) ----
const reviewFor = ref(null);
const rejectionReason = ref("");
const reviewBusy = ref(false);
const reviewError = ref("");

async function review(action) {
  if (reviewBusy.value) return;
  reviewBusy.value = true;
  reviewError.value = "";
  try {
    await $fetch(`/api/remittances/${reviewFor.value.id}/void-review`, {
      method: "POST",
      body: { action, rejectionReason: rejectionReason.value },
    });
    reviewFor.value = null;
    rejectionReason.value = "";
    await Promise.all([refresh(), refreshPending()]);
  } catch (e) {
    reviewError.value = e.data?.statusMessage || "Could not update the request.";
  } finally {
    reviewBusy.value = false;
  }
}

function prettyDate(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-PH", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
</script>

<template>
  <div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0;">Sales remittance</h1>
    <p style="font-size: 13.5px; color: #8a909b; margin: 6px 0 22px;">
      Count the cash on hand for today and record it by bill and coin. You can edit the counts freely until you save —
      after that, a remittance can only be voided with super admin approval.
    </p>

    <div v-if="savedNotice" style="background:#14261b;border:1px solid #24502f;color:#8ee0ab;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;">
      {{ savedNotice }}
    </div>

    <div class="rs-mobile-stack" style="display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 18px; align-items: start;">
      <!-- ============ Entry form ============ -->
      <div class="rs-card">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom: 4px;">
          <div style="font-weight: 700; font-size: 15px;">Cash count</div>
          <div style="font-size: 12px; color: #5bb8f5; font-weight: 600;">{{ prettyDate(data?.today) }}</div>
        </div>
        <div style="font-size: 12px; color: #7a8190; margin-bottom: 16px;">Enter how many of each you have. Totals update as you type.</div>

        <template v-for="group in [{ title: 'Bills', list: bills, subtotal: billsTotal }, { title: 'Coins', list: coins, subtotal: coinsTotal }]" :key="group.title">
          <div style="display:grid; grid-template-columns: 80px 1fr 110px; gap: 10px; padding: 0 2px 6px; font-size: 11px; color: #5d6470; text-transform: uppercase; letter-spacing: 0.5px;">
            <span>{{ group.title }}</span><span style="text-align:center;">Pieces</span><span style="text-align:right;">Amount</span>
          </div>
          <div
            v-for="d in group.list" :key="d.key"
            style="display:grid; grid-template-columns: 80px 1fr 110px; gap: 10px; align-items:center; padding: 6px 2px; border-bottom: 1px solid #1c2026;"
          >
            <span style="font-weight: 700; font-size: 14px;" :style="{ color: count(d.key) ? '#e6e8eb' : '#8a909b' }">{{ d.label }}</span>
            <div style="display:flex; align-items:center; gap:6px; justify-content:center;">
              <button type="button" class="rs-btn-secondary rem-step" :disabled="!count(d.key)" @click="bump(d.key, -1)" :aria-label="`One less ${d.label} ${d.type}`">−</button>
              <input
                v-model="counts[d.key]"
                @input="sanitize(d.key)"
                inputmode="numeric"
                class="rs-input"
                placeholder="0"
                :aria-label="`${d.label} ${d.type} count`"
                style="width: 84px; text-align:center; font-weight: 600; padding: 8px 6px;"
              />
              <button type="button" class="rs-btn-secondary rem-step" @click="bump(d.key, 1)" :aria-label="`One more ${d.label} ${d.type}`">+</button>
            </div>
            <span style="text-align:right; font-size: 13px; font-variant-numeric: tabular-nums;" :style="{ color: count(d.key) ? '#e6e8eb' : '#5d6470' }">
              {{ formatPeso(lineAmount(d)) }}
            </span>
          </div>
          <div style="display:flex; justify-content:space-between; padding: 8px 2px 18px; font-size: 12.5px; color: #aab0bb;">
            <span>{{ group.title }} subtotal</span>
            <span style="font-weight:600; font-variant-numeric: tabular-nums;">{{ formatPeso(group.subtotal) }}</span>
          </div>
        </template>

        <div style="background:#0f1216; border:1px solid #2f8fd6; border-radius: 10px; padding: 14px 16px; display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
          <span style="font-size: 12px; color: #5bb8f5; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total cash on hand</span>
          <span style="font-size: 24px; font-weight: 800; color: #5bb8f5; font-variant-numeric: tabular-nums;">{{ formatPeso(grandTotal) }}</span>
        </div>

        <label style="font-size: 12px; color: #9aa1ab; display:block; margin-bottom: 6px;">Remarks (optional)</label>
        <input v-model="remarks" class="rs-input" maxlength="500" placeholder="e.g. Morning shift, includes ₱1,000 starting float" style="margin-bottom: 16px;" />

        <div style="display:flex; gap: 8px;">
          <button type="button" class="rs-btn-secondary" style="flex: 0 0 auto;" :disabled="!hasEntries && !remarks" @click="clearForm">Clear</button>
          <button type="button" class="rs-btn-primary" style="flex: 1; justify-content:center;" :disabled="!hasEntries" @click="saveError = ''; confirming = true">
            Review &amp; save
          </button>
        </div>
      </div>

      <!-- ============ Right column ============ -->
      <div style="display:flex; flex-direction:column; gap: 18px;">
        <!-- Today -->
        <div class="rs-card">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 14px;">Today at a glance</div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div style="background:#0f1216; border:1px solid #1f242c; border-radius:10px; padding: 12px;">
              <div style="font-size: 11px; color: #8a909b; margin-bottom: 6px;">Sales recorded in system</div>
              <div style="font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums;">{{ formatPeso(data?.todaySales) }}</div>
              <div style="font-size: 11px; color: #5d6470; margin-top: 3px;">{{ data?.todaySalesCount || 0 }} transactions</div>
            </div>
            <div style="background:#0f1216; border:1px solid #1f242c; border-radius:10px; padding: 12px;">
              <div style="font-size: 11px; color: #8a909b; margin-bottom: 6px;">Cash remitted today</div>
              <div style="font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums;">{{ formatPeso(data?.todayRemitted) }}</div>
              <div style="font-size: 11px; color: #5d6470; margin-top: 3px;">excludes voided</div>
            </div>
          </div>
          <div v-if="data?.todayRemitted" style="display:flex; justify-content:space-between; align-items:center; margin-top: 12px; padding: 10px 12px; border-radius: 10px; background:#0f1216; border:1px solid #1f242c;">
            <span style="font-size: 12.5px; color: #aab0bb;">Difference <span style="color:#5d6470;">(cash − recorded sales)</span></span>
            <span style="font-weight: 800; font-size: 14px; font-variant-numeric: tabular-nums;" :style="{ color: diffColor(difference) }">
              {{ diffLabel(difference) }} {{ difference !== 0 ? formatPeso(Math.abs(difference)) : "" }}
            </span>
          </div>
        </div>

        <!-- Pending voids -->
        <div v-if="pendingVoids?.length" class="rs-card" style="border-color:#5a4f24;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color:#f3c44b;">Void requests pending</div>
          <div style="font-size: 12px; color: #7a8190; margin-bottom: 10px;">
            {{ isSuper ? "Review each request below." : "Waiting for super admin approval." }}
          </div>
          <div v-for="p in pendingVoids" :key="p.id" style="padding: 10px 0; border-top: 1px solid #1c2026; display:flex; gap: 10px; align-items:center;">
            <div style="flex:1; min-width:0;">
              <div style="font-size: 13px; font-weight: 600;">{{ prettyDate(p.businessDate) }} · {{ formatPeso(p.totalCash) }}</div>
              <div style="font-size: 11.5px; color: #aab0bb;">Reason: {{ p.voidReason }}</div>
              <div style="font-size: 11px; color: #5d6470;">Requested by {{ p.voidRequestedBy || "Unknown" }} · {{ gymDateTime(p.voidRequestedAt) }}</div>
            </div>
            <button v-if="isSuper" class="rs-btn-secondary" style="font-size: 12px; padding: 6px 12px;" @click="reviewError = ''; reviewFor = p">Review</button>
          </div>
        </div>

        <!-- Recent remittances -->
        <div class="rs-card" style="padding: 0;">
          <div style="padding: 14px 18px; font-weight: 700; font-size: 14px; border-bottom: 1px solid #1c2026; display:flex; justify-content:space-between; align-items:center;">
            <span>Recent remittances</span>
            <NuxtLink to="/reports?view=remittance" style="font-size: 12px; color: #5bb8f5; text-decoration:none; font-weight:500;">Full report →</NuxtLink>
          </div>
          <div v-if="!records.length" style="padding: 24px; text-align:center; color:#5d6470; font-size:13px;">No remittances saved yet.</div>
          <div v-for="r in records" :key="r.id" style="border-bottom: 1px solid #1c2026;">
            <button
              type="button"
              @click="expanded = expanded === r.id ? null : r.id"
              style="all: unset; box-sizing: border-box; width: 100%; cursor: pointer; display:flex; align-items:center; gap: 10px; padding: 12px 18px;"
              :aria-expanded="expanded === r.id"
            >
              <div style="flex:1; min-width:0;">
                <div style="font-size: 13px; font-weight: 600;">{{ prettyDate(r.businessDate) }}</div>
                <div style="font-size: 11px; color: #7a8190;">{{ r.submittedBy }} · {{ gymDateTime(r.createdAt) }}</div>
              </div>
              <span style="font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 999px;" :style="{ color: statusBadge(r).color, background: statusBadge(r).bg }">{{ statusBadge(r).text }}</span>
              <span style="font-weight: 800; font-size: 14px; font-variant-numeric: tabular-nums; min-width: 100px; text-align:right;" :style="{ textDecoration: r.voided ? 'line-through' : 'none', color: r.voided ? '#7a8190' : '#e6e8eb' }">{{ formatPeso(r.totalCash) }}</span>
              <span style="color:#5d6470; font-size: 10px;">{{ expanded === r.id ? "▾" : "▸" }}</span>
            </button>
            <div v-if="expanded === r.id" style="padding: 0 18px 14px;">
              <div style="background:#0f1216; border:1px solid #1f242c; border-radius: 10px; padding: 10px 12px;">
                <div v-for="d in r.denominations" :key="d.key" style="display:flex; justify-content:space-between; font-size: 12px; color:#aab0bb; padding: 3px 0; font-variant-numeric: tabular-nums;">
                  <span>{{ formatPeso(d.value) }} {{ d.type }} × {{ d.count }}</span>
                  <span>{{ formatPeso(Math.round(d.value * 100) * d.count / 100) }}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size: 12px; color:#7a8190; border-top:1px solid #1f242c; margin-top: 6px; padding-top: 6px;">
                  <span>Bills {{ formatPeso(r.billsTotal) }} · Coins {{ formatPeso(r.coinsTotal) }}</span>
                  <span style="font-weight:700; color:#e6e8eb;">{{ formatPeso(r.totalCash) }}</span>
                </div>
              </div>
              <div v-if="r.remarks" style="font-size: 12px; color:#aab0bb; margin-top: 8px;">Remarks: {{ r.remarks }}</div>
              <div v-if="r.voidReason" style="font-size: 12px; color:#aab0bb; margin-top: 6px;">Void reason: {{ r.voidReason }}</div>
              <div v-if="r.voidStatus === 'rejected'" style="font-size: 12px; color:#aab0bb; margin-top: 4px;">
                Rejected by {{ r.voidReviewedBy || "super admin" }}<span v-if="r.voidRejectionReason"> — {{ r.voidRejectionReason }}</span>
              </div>
              <div v-if="r.voided" style="font-size: 12px; color:#e88; margin-top: 4px;">Voided by {{ r.voidReviewedBy || "super admin" }} · {{ gymDateTime(r.voidReviewedAt) }}</div>
              <button
                v-if="!r.voided && r.voidStatus !== 'pending'"
                class="rs-btn-secondary"
                style="margin-top: 10px; font-size: 12px; padding: 6px 12px; color:#e88; border-color:#5a2424;"
                @click="voidError = ''; voidReason = ''; voidFor = r"
              >Request void</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ Confirm save modal ============ -->
    <div v-if="confirming" class="rem-overlay" @click.self="!saving && (confirming = false)">
      <div class="rem-modal" role="dialog" aria-modal="true" aria-labelledby="rem-confirm-title">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
          <div id="rem-confirm-title" style="font-weight: 800; font-size: 16px;">Confirm remittance</div>
          <button @click="confirming = false" :disabled="saving" style="background:transparent; border:none; color:#8a909b; cursor:pointer;">✕</button>
        </div>
        <div style="font-size: 12.5px; color: #7a8190; margin-bottom: 14px;">{{ prettyDate(data?.today) }} · by {{ user?.name }}</div>

        <div style="background:#0f1216; border:1px solid #1f242c; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; max-height: 260px; overflow:auto;">
          <div v-for="l in confirmLines" :key="l.key" style="display:flex; justify-content:space-between; font-size: 13px; padding: 4px 0; font-variant-numeric: tabular-nums;">
            <span style="color:#aab0bb;">{{ l.label }} {{ l.type }} × {{ l.count }}</span>
            <span>{{ formatPeso(l.amount) }}</span>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size: 12.5px; color:#aab0bb; padding: 2px 2px;">
          <span>Bills</span><span style="font-variant-numeric: tabular-nums;">{{ formatPeso(billsTotal) }}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size: 12.5px; color:#aab0bb; padding: 2px 2px 10px;">
          <span>Coins</span><span style="font-variant-numeric: tabular-nums;">{{ formatPeso(coinsTotal) }}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid #232730; padding-top: 10px; margin-bottom: 12px;">
          <span style="font-weight: 700;">Total cash on hand</span>
          <span style="font-weight: 800; font-size: 20px; color:#5bb8f5; font-variant-numeric: tabular-nums;">{{ formatPeso(grandTotal) }}</span>
        </div>
        <div v-if="remarks" style="font-size: 12.5px; color:#aab0bb; margin-bottom: 12px;">Remarks: {{ remarks }}</div>

        <div style="font-size: 12px; color:#7a8190; margin-bottom: 12px;">
          Today's remitted total will be {{ formatPeso(projectedRemitted) }} against {{ formatPeso(data?.todaySales) }} recorded sales.
        </div>
        <div style="background:#2a2414; border:1px solid #5a4f24; color:#f3d8a8; border-radius: 8px; padding: 10px 12px; font-size: 12.5px; margin-bottom: 14px;">
          Once saved, this can't be edited. Mistakes need a void request approved by the super admin.
        </div>

        <div v-if="saveError" style="color:#e36b6b; font-size: 12.5px; margin-bottom: 10px;">{{ saveError }}</div>
        <div style="display:flex; gap: 8px;">
          <button class="rs-btn-secondary" style="flex:1; justify-content:center;" :disabled="saving" @click="confirming = false">Back to edit</button>
          <button class="rs-btn-primary" style="flex:1; justify-content:center;" :disabled="saving" :aria-busy="saving" @click="save">
            <span v-if="saving" class="rs-spinner" aria-hidden="true"></span>
            {{ saving ? "Saving..." : "Save remittance" }}
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Request void modal ============ -->
    <div v-if="voidFor" class="rem-overlay" @click.self="!voidBusy && (voidFor = null)">
      <div class="rem-modal" role="dialog" aria-modal="true">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px;">
          <div style="font-weight: 800; font-size: 16px;">Request void</div>
          <button @click="voidFor = null" style="background:transparent; border:none; color:#8a909b; cursor:pointer;">✕</button>
        </div>
        <div style="background:#1c2128; border-radius: 8px; padding: 12px; margin-bottom: 14px; font-size: 13px;">
          <div style="font-weight: 600; margin-bottom: 4px;">Remittance · {{ prettyDate(voidFor.businessDate) }}</div>
          <div style="color:#aab0bb; font-size: 12px;">{{ formatPeso(voidFor.totalCash) }} · saved by {{ voidFor.submittedBy }}</div>
        </div>
        <p style="font-size: 12.5px; color: #aab0bb; margin: 0 0 14px;">The super admin must approve this before the remittance is removed from reports. You can then save a corrected count.</p>
        <label style="font-size: 12px; color: #9aa1ab; display:block; margin-bottom: 6px;">Reason for void</label>
        <input v-model="voidReason" class="rs-input" placeholder="e.g. Miscounted ₱100 bills" style="margin-bottom: 10px;" />
        <div v-if="voidError" style="color:#e36b6b; font-size: 12.5px; margin-bottom: 10px;">{{ voidError }}</div>
        <div style="display:flex; gap: 8px;">
          <button class="rs-btn-secondary" style="flex:1; justify-content:center;" @click="voidFor = null">Cancel</button>
          <button class="rs-btn-secondary" style="flex:1; justify-content:center; color:#e88; border-color:#5a2424;" :disabled="!voidReason.trim() || voidBusy" @click="submitVoid">
            <span v-if="voidBusy" class="rs-spinner" aria-hidden="true"></span>
            Submit request
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Review void modal (super admin) ============ -->
    <div v-if="reviewFor" class="rem-overlay" @click.self="!reviewBusy && (reviewFor = null)">
      <div class="rem-modal" role="dialog" aria-modal="true">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px;">
          <div style="font-weight: 800; font-size: 16px;">Review void request</div>
          <button @click="reviewFor = null" style="background:transparent; border:none; color:#8a909b; cursor:pointer;">✕</button>
        </div>
        <div style="background:#1c2128; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px;">
          <div style="font-weight: 600; margin-bottom: 4px;">Remittance · {{ prettyDate(reviewFor.businessDate) }} · {{ formatPeso(reviewFor.totalCash) }}</div>
          <div style="color:#aab0bb; font-size: 12px;">Saved by {{ reviewFor.submittedBy }} · {{ gymDateTime(reviewFor.createdAt) }}</div>
          <div style="color:#aab0bb; font-size: 12px; margin-top: 6px;">Reason: {{ reviewFor.voidReason }}</div>
          <div style="color:#7a8190; font-size: 11.5px;">Requested by {{ reviewFor.voidRequestedBy }}</div>
        </div>
        <div style="background:#0f1216; border:1px solid #1f242c; border-radius: 10px; padding: 8px 12px; margin-bottom: 12px;">
          <div v-for="d in reviewFor.denominations" :key="d.key" style="display:flex; justify-content:space-between; font-size: 12px; color:#aab0bb; padding: 2px 0; font-variant-numeric: tabular-nums;">
            <span>{{ formatPeso(d.value) }} {{ d.type }} × {{ d.count }}</span>
            <span>{{ formatPeso(Math.round(d.value * 100) * d.count / 100) }}</span>
          </div>
        </div>
        <label style="font-size: 12px; color: #9aa1ab; display:block; margin-bottom: 6px;">Rejection note (optional)</label>
        <input v-model="rejectionReason" class="rs-input" placeholder="Only used if you reject" style="margin-bottom: 10px;" />
        <div v-if="reviewError" style="color:#e36b6b; font-size: 12.5px; margin-bottom: 10px;">{{ reviewError }}</div>
        <div style="display:flex; gap: 8px;">
          <button class="rs-btn-secondary" style="flex:1; justify-content:center;" :disabled="reviewBusy" @click="review('reject')">Reject</button>
          <button class="rs-btn-secondary" style="flex:1; justify-content:center; color:#e88; border-color:#5a2424;" :disabled="reviewBusy" @click="review('approve')">
            <span v-if="reviewBusy" class="rs-spinner" aria-hidden="true"></span>
            Approve void
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rem-step {
  width: 34px;
  height: 34px;
  padding: 0 !important;
  justify-content: center;
  font-size: 16px !important;
  font-weight: 700;
  flex-shrink: 0;
}
.rem-step:disabled { opacity: 0.35; cursor: default; }
.rem-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
  padding: 16px;
}
.rem-modal {
  width: 440px;
  max-width: 100%;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  background: #13161b;
  border: 1px solid #232730;
  border-radius: 14px;
  padding: 24px;
}
</style>
