<script setup>
const { user } = useAuth();
const { gymDateTime } = useGymTime();
const isSuper = computed(() => user.value?.role === "superadmin");

const { data, refresh } = await useFetch("/api/remittances");
const { data: pendingVoids, refresh: refreshPending } = await useFetch("/api/remittance-void-requests");
const { data: epay, refresh: refreshEpay } = await useFetch("/api/epayments");
const route = useRoute();
const entryTab = ref(route.query.tab === "epay" ? "epay" : "cash"); // 'cash' | 'epay'

function refreshAll() {
  return Promise.all([refresh(), refreshPending(), refreshEpay()]);
}

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
const projectedCollected = computed(() => (data.value?.todayRemitted || 0) + (data.value?.todayEpayments || 0) + grandTotal.value);

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
    flash(`Remittance of ${formatPeso(saved.totalCash)} saved.`);
    await refreshAll();
  } catch (e) {
    saveError.value = e.data?.statusMessage || "Could not save the remittance. Please try again.";
  } finally {
    saving.value = false;
  }
}

let flashTimer = null;
function flash(msg) {
  savedNotice.value = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => (savedNotice.value = ""), 5000);
}

// ---- Electronic payments (each one logged and saved as it comes in) ----
function emptyEpay() {
  return { provider: "", providerName: "", amount: "", referenceNo: "", payerName: "", senderAccount: "", notes: "" };
}
const ep = ref(emptyEpay());
const epConfirming = ref(false);
const epSaving = ref(false);
const epError = ref("");

const epProvider = computed(() => EPAY_PROVIDERS.find((p) => p.key === ep.value.provider) || null);
const epAmount = computed(() => {
  const n = Number(ep.value.amount);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
});
const epLabel = computed(() => {
  if (!epProvider.value) return "";
  const custom = ep.value.providerName.trim();
  if (epProvider.value.key === "other") return custom || "Other";
  if (epProvider.value.key === "bank" && custom) return `Bank transfer (${custom})`;
  return epProvider.value.label;
});
const epReady = computed(() =>
  !!epProvider.value && epAmount.value > 0 && (epProvider.value.key !== "other" || !!ep.value.providerName.trim())
);

function sanitizeAmount() {
  let v = String(ep.value.amount ?? "").replace(/[^\d.]/g, "");
  const dot = v.indexOf(".");
  if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  ep.value.amount = v.replace(/^0+(?=\d)/, "").slice(0, 10);
}
function pickProvider(key) {
  if (epConfirming.value) return;
  if (ep.value.provider !== key) ep.value.providerName = "";
  ep.value.provider = key;
}
function clearEpay() {
  ep.value = emptyEpay();
  epConfirming.value = false;
  epError.value = "";
}

async function saveEpay() {
  if (epSaving.value) return;
  epSaving.value = true;
  epError.value = "";
  try {
    const saved = await $fetch("/api/epayments", { method: "POST", body: { ...ep.value, amount: epAmount.value } });
    clearEpay();
    flash(`E-payment of ${formatPeso(saved.amount)} via ${saved.providerLabel} saved.`);
    await refreshAll();
  } catch (e) {
    epError.value = e.data?.statusMessage || "Could not save the e-payment. Please try again.";
    epConfirming.value = false; // back to the editable form so they can fix it
  } finally {
    epSaving.value = false;
  }
}

const epayments = computed(() => epay.value?.payments || []);
const epayByProvider = computed(() => {
  const totals = {};
  for (const p of epayments.value) {
    if (p.voided) continue;
    if (!totals[p.provider]) totals[p.provider] = { key: p.provider, label: epayProvider(p.provider).label, count: 0, amount: 0 };
    totals[p.provider].count += 1;
    totals[p.provider].amount = Math.round((totals[p.provider].amount + p.amount) * 100) / 100;
  }
  return Object.values(totals).sort((a, b) => b.amount - a.amount);
});
function providerColor(key) {
  return epayProvider(key).color;
}

// ---- Today summary ----
const todayCollected = computed(() => Math.round(((data.value?.todayRemitted || 0) + (data.value?.todayEpayments || 0)) * 100) / 100);
const difference = computed(() => Math.round((todayCollected.value - (data.value?.todaySales || 0)) * 100) / 100);
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
    const base = voidFor.value.kind === "epayment" ? "/api/epayments" : "/api/remittances";
    await $fetch(`${base}/${voidFor.value.id}/void-request`, { method: "POST", body: { reason: voidReason.value } });
    voidFor.value = null;
    voidReason.value = "";
    await refreshAll();
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
    const base = reviewFor.value.kind === "epayment" ? "/api/epayments" : "/api/remittances";
    await $fetch(`${base}/${reviewFor.value.id}/void-review`, {
      method: "POST",
      body: { action, rejectionReason: rejectionReason.value },
    });
    reviewFor.value = null;
    rejectionReason.value = "";
    await refreshAll();
  } catch (e) {
    reviewError.value = e.data?.statusMessage || "Could not update the request.";
  } finally {
    reviewBusy.value = false;
  }
}

function openVoid(item, kind) {
  voidError.value = "";
  voidReason.value = "";
  voidFor.value = { ...item, kind };
}
function voidTitle(v) {
  if (!v) return "";
  return v.kind === "epayment"
    ? `E-payment · ${formatPeso(v.amount)} via ${v.providerLabel}`
    : `Cash remittance · ${prettyDate(v.businessDate)} · ${formatPeso(v.totalCash)}`;
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
      Count today's cash on hand by bill and coin, and log every GCash, Maya, GoTyme or other e-payment as it comes in.
      Entries can be edited freely until saved — after that, they can only be voided with super admin approval.
    </p>

    <div v-if="savedNotice" style="background:#14261b;border:1px solid #24502f;color:#8ee0ab;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;">
      {{ savedNotice }}
    </div>

    <div class="rs-mobile-stack" style="display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 18px; align-items: start;">
      <!-- ============ Entry forms ============ -->
      <div>
      <div class="rem-tabs" role="tablist">
        <button type="button" role="tab" :aria-selected="entryTab === 'cash'" :class="{ active: entryTab === 'cash' }" @click="entryTab = 'cash'">
          Cash count <span v-if="hasEntries" class="rem-tab-pill">{{ formatPeso(grandTotal) }}</span>
        </button>
        <button type="button" role="tab" :aria-selected="entryTab === 'epay'" :class="{ active: entryTab === 'epay' }" @click="entryTab = 'epay'">
          E-payments <span v-if="data?.todayEpaymentsCount" class="rem-tab-pill">{{ data.todayEpaymentsCount }} today</span>
        </button>
      </div>
      <div class="rs-card" v-show="entryTab === 'cash'" style="border-top-left-radius: 0;">
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

      <!-- E-payments -->
      <div v-show="entryTab === 'epay'" style="display:flex; flex-direction:column; gap: 18px;">
        <div class="rs-card" style="border-top-left-radius: 0;">
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom: 4px;">
            <div style="font-weight: 700; font-size: 15px;">Log an e-payment</div>
            <div style="font-size: 12px; color: #5bb8f5; font-weight: 600;">{{ prettyDate(data?.today) }}</div>
          </div>
          <div style="font-size: 12px; color: #7a8190; margin-bottom: 14px;">Record each payment as soon as it's received, using the details on the customer's payment screen.</div>

          <fieldset :disabled="epConfirming || epSaving" style="border: none; padding: 0; margin: 0;">
            <legend style="font-size: 12px; color: #9aa1ab; margin-bottom: 8px; padding: 0;">Paid via</legend>
            <div style="display:flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px;">
              <button
                v-for="p in EPAY_PROVIDERS" :key="p.key" type="button"
                class="rem-chip" :class="{ active: ep.provider === p.key }"
                :style="ep.provider === p.key ? { borderColor: p.color, color: '#e6e8eb', background: p.color + '22' } : {}"
                :aria-pressed="ep.provider === p.key"
                @click="pickProvider(p.key)"
              >
                <span class="rem-dot" :style="{ background: p.color }"></span>{{ p.label }}
              </button>
            </div>

            <div v-if="ep.provider === 'other' || ep.provider === 'bank'" style="margin-bottom: 12px;">
              <label style="font-size: 12px; color: #9aa1ab; display:block; margin-bottom: 6px;">
                {{ ep.provider === "other" ? "App / channel name" : "Bank name (optional)" }}
              </label>
              <input v-model="ep.providerName" class="rs-input" maxlength="60" :placeholder="ep.provider === 'other' ? 'e.g. PalawanPay, Coins.ph' : 'e.g. BPI, BDO, UnionBank'" />
            </div>

            <label style="font-size: 12px; color: #9aa1ab; display:block; margin-bottom: 6px;">Amount received</label>
            <div style="position: relative; margin-bottom: 12px;">
              <span style="position:absolute; left: 14px; top: 50%; transform: translateY(-50%); color:#8a909b; font-weight: 700; font-size: 18px;">₱</span>
              <input v-model="ep.amount" @input="sanitizeAmount" inputmode="decimal" class="rs-input" placeholder="0.00"
                style="padding-left: 34px; font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums;" aria-label="Amount received in pesos" />
            </div>

            <div class="rem-grid-2" style="margin-bottom: 12px;">
              <div>
                <label style="font-size: 12px; color: #9aa1ab; display:block; margin-bottom: 6px;">Reference no.</label>
                <input v-model="ep.referenceNo" class="rs-input" maxlength="60" placeholder="From the payment receipt" />
              </div>
              <div>
                <label style="font-size: 12px; color: #9aa1ab; display:block; margin-bottom: 6px;">Payer name</label>
                <input v-model="ep.payerName" class="rs-input" maxlength="80" placeholder="Who paid" />
              </div>
              <div>
                <label style="font-size: 12px; color: #9aa1ab; display:block; margin-bottom: 6px;">Sender number / account</label>
                <input v-model="ep.senderAccount" class="rs-input" maxlength="40" placeholder="e.g. 0917•••4521" />
              </div>
              <div>
                <label style="font-size: 12px; color: #9aa1ab; display:block; margin-bottom: 6px;">Notes</label>
                <input v-model="ep.notes" class="rs-input" maxlength="300" placeholder="e.g. Monthly membership" />
              </div>
            </div>
          </fieldset>

          <div v-if="epError" style="color:#e36b6b; font-size: 12.5px; margin-bottom: 10px;">{{ epError }}</div>

          <!-- Inline confirm: quick at a busy front desk, but still a deliberate second step -->
          <div v-if="epConfirming" style="background:#0f1216; border: 1px solid #2f8fd6; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px;">
              <div style="display:flex; align-items:center; gap: 8px; min-width: 0;">
                <span class="rem-dot" :style="{ background: epProvider?.color }"></span>
                <span style="font-weight: 700;">{{ epLabel }}</span>
              </div>
              <span style="font-weight: 800; font-size: 20px; color:#5bb8f5; font-variant-numeric: tabular-nums;">{{ formatPeso(epAmount) }}</span>
            </div>
            <div style="font-size: 12px; color:#aab0bb; margin-top: 6px; line-height: 1.6;">
              <span v-if="ep.referenceNo">Ref {{ ep.referenceNo }}</span>
              <span v-if="ep.payerName"> · from {{ ep.payerName }}</span>
              <span v-if="ep.senderAccount"> · {{ ep.senderAccount }}</span>
              <span v-if="ep.notes"> · {{ ep.notes }}</span>
              <span v-if="!ep.referenceNo" style="color:#f3c44b;">No reference number — double-check before saving.</span>
            </div>
            <div style="font-size: 11.5px; color:#f3d8a8; margin-top: 8px;">Once saved, it can't be edited — only voided with super admin approval.</div>
          </div>

          <div style="display:flex; gap: 8px;">
            <template v-if="!epConfirming">
              <button type="button" class="rs-btn-secondary" :disabled="!ep.provider && !ep.amount" @click="clearEpay">Clear</button>
              <button type="button" class="rs-btn-primary" style="flex: 1; justify-content:center;" :disabled="!epReady" @click="epError = ''; epConfirming = true">Review &amp; save</button>
            </template>
            <template v-else>
              <button type="button" class="rs-btn-secondary" style="flex: 1; justify-content:center;" :disabled="epSaving" @click="epConfirming = false">Edit</button>
              <button type="button" class="rs-btn-primary" style="flex: 1; justify-content:center;" :disabled="epSaving" :aria-busy="epSaving" @click="saveEpay">
                <span v-if="epSaving" class="rs-spinner" aria-hidden="true"></span>
                {{ epSaving ? "Saving..." : "Save payment" }}
              </button>
            </template>
          </div>
        </div>

        <!-- Today's e-payments -->
        <div class="rs-card" style="padding: 0;">
          <div style="padding: 14px 18px; border-bottom: 1px solid #1c2026;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight: 700; font-size: 14px;">Today's e-payments</span>
              <span style="font-weight: 800; font-variant-numeric: tabular-nums;">{{ formatPeso(data?.todayEpayments) }}</span>
            </div>
            <div v-if="epayByProvider.length" style="display:flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;">
              <span v-for="t in epayByProvider" :key="t.key" style="display:inline-flex; align-items:center; gap: 6px; font-size: 11.5px; background:#0f1216; border:1px solid #1f242c; border-radius: 999px; padding: 4px 10px;">
                <span class="rem-dot" :style="{ background: providerColor(t.key) }"></span>
                {{ t.label }} · {{ t.count }} · <b style="font-variant-numeric: tabular-nums;">{{ formatPeso(t.amount) }}</b>
              </span>
            </div>
          </div>
          <div v-if="!epayments.length" style="padding: 24px; text-align:center; color:#5d6470; font-size:13px;">No e-payments logged today.</div>
          <div v-for="p in epayments" :key="p.id" style="display:flex; gap: 10px; align-items:flex-start; padding: 11px 18px; border-bottom: 1px solid #1c2026;">
            <span class="rem-dot" :style="{ background: providerColor(p.provider), marginTop: '6px' }"></span>
            <div style="flex:1; min-width:0;">
              <div style="font-size: 13px; font-weight: 600;">
                {{ p.providerLabel }}
                <span v-if="p.payerName" style="font-weight: 400; color:#aab0bb;">· {{ p.payerName }}</span>
              </div>
              <div style="font-size: 11.5px; color:#7a8190; word-break: break-word;">
                <span v-if="p.referenceNo">Ref {{ p.referenceNo }} · </span>
                <span v-if="p.senderAccount">{{ p.senderAccount }} · </span>
                {{ gymDateTime(p.createdAt) }} · {{ p.recordedBy }}
              </div>
              <div v-if="p.notes" style="font-size: 11.5px; color:#aab0bb;">{{ p.notes }}</div>
              <div v-if="p.voidReason" style="font-size: 11.5px; color:#aab0bb;">Void reason: {{ p.voidReason }}</div>
              <div v-if="p.voidStatus === 'rejected'" style="font-size: 11.5px; color:#7a8190;">Void rejected<span v-if="p.voidRejectionReason"> — {{ p.voidRejectionReason }}</span></div>
            </div>
            <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap: 4px;">
              <span style="font-weight: 800; font-size: 14px; font-variant-numeric: tabular-nums;" :style="{ textDecoration: p.voided ? 'line-through' : 'none', color: p.voided ? '#7a8190' : '#e6e8eb' }">{{ formatPeso(p.amount) }}</span>
              <span v-if="p.voided || p.voidStatus === 'pending'" style="font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px;" :style="{ color: statusBadge(p).color, background: statusBadge(p).bg }">{{ statusBadge(p).text }}</span>
              <button v-else type="button" class="rem-link-danger" @click="openVoid(p, 'epayment')">Request void</button>
            </div>
          </div>
        </div>
      </div>
      </div>

      <!-- ============ Right column ============ -->
      <div style="display:flex; flex-direction:column; gap: 18px;">
        <!-- Today -->
        <div class="rs-card">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 14px;">Today at a glance</div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="rem-stat">
              <div class="rem-stat-label">Cash remitted</div>
              <div class="rem-stat-value">{{ formatPeso(data?.todayRemitted) }}</div>
            </div>
            <div class="rem-stat">
              <div class="rem-stat-label">E-payments</div>
              <div class="rem-stat-value">{{ formatPeso(data?.todayEpayments) }}</div>
              <div class="rem-stat-sub">{{ data?.todayEpaymentsCount || 0 }} payment{{ data?.todayEpaymentsCount === 1 ? "" : "s" }}</div>
            </div>
            <div class="rem-stat" style="border-color:#2f8fd6;">
              <div class="rem-stat-label" style="color:#5bb8f5;">Total collected</div>
              <div class="rem-stat-value" style="color:#5bb8f5;">{{ formatPeso(todayCollected) }}</div>
              <div class="rem-stat-sub">cash + e-payments</div>
            </div>
            <div class="rem-stat">
              <div class="rem-stat-label">Sales recorded in system</div>
              <div class="rem-stat-value">{{ formatPeso(data?.todaySales) }}</div>
              <div class="rem-stat-sub">{{ data?.todaySalesCount || 0 }} transactions</div>
            </div>
          </div>
          <div v-if="todayCollected" style="display:flex; justify-content:space-between; align-items:center; margin-top: 12px; padding: 10px 12px; border-radius: 10px; background:#0f1216; border:1px solid #1f242c;">
            <span style="font-size: 12.5px; color: #aab0bb;">Difference <span style="color:#5d6470;">(collected − recorded sales)</span></span>
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
              <div style="font-size: 13px; font-weight: 600;">{{ voidTitle(p) }}</div>
              <div v-if="p.kind === 'epayment'" style="font-size: 11.5px; color: #7a8190;">{{ prettyDate(p.businessDate) }}<span v-if="p.referenceNo"> · Ref {{ p.referenceNo }}</span><span v-if="p.payerName"> · {{ p.payerName }}</span></div>
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
                @click="openVoid(r, 'remittance')"
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
          Today's total collected (cash + e-payments) will be {{ formatPeso(projectedCollected) }} against {{ formatPeso(data?.todaySales) }} recorded sales.
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
          <div style="font-weight: 600; margin-bottom: 4px;">{{ voidTitle(voidFor) }}</div>
          <div v-if="voidFor.kind === 'epayment'" style="color:#aab0bb; font-size: 12px;">
            <span v-if="voidFor.referenceNo">Ref {{ voidFor.referenceNo }} · </span><span v-if="voidFor.payerName">{{ voidFor.payerName }} · </span>logged by {{ voidFor.recordedBy }}
          </div>
          <div v-else style="color:#aab0bb; font-size: 12px;">Saved by {{ voidFor.submittedBy }}</div>
        </div>
        <p style="font-size: 12.5px; color: #aab0bb; margin: 0 0 14px;">The super admin must approve this before it's removed from reports. You can then save a corrected entry.</p>
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
          <div style="font-weight: 600; margin-bottom: 4px;">{{ voidTitle(reviewFor) }}</div>
          <div v-if="reviewFor.kind === 'epayment'" style="color:#aab0bb; font-size: 12px; line-height: 1.6;">
            <div v-if="reviewFor.referenceNo">Ref {{ reviewFor.referenceNo }}</div>
            <div v-if="reviewFor.payerName || reviewFor.senderAccount">From {{ reviewFor.payerName }} {{ reviewFor.senderAccount }}</div>
            <div v-if="reviewFor.notes">{{ reviewFor.notes }}</div>
            <div>Logged by {{ reviewFor.recordedBy }} · {{ gymDateTime(reviewFor.createdAt) }}</div>
          </div>
          <div v-else style="color:#aab0bb; font-size: 12px;">Saved by {{ reviewFor.submittedBy }} · {{ gymDateTime(reviewFor.createdAt) }}</div>
          <div style="color:#aab0bb; font-size: 12px; margin-top: 6px;">Reason: {{ reviewFor.voidReason }}</div>
          <div style="color:#7a8190; font-size: 11.5px;">Requested by {{ reviewFor.voidRequestedBy }}</div>
        </div>
        <div v-if="reviewFor.kind !== 'epayment'" style="background:#0f1216; border:1px solid #1f242c; border-radius: 10px; padding: 8px 12px; margin-bottom: 12px;">
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
.rem-tabs { display: flex; gap: 4px; }
.rem-tabs button {
  background: #111419;
  color: #8a909b;
  border: 1px solid #1f242c;
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: -1px;
  position: relative;
}
.rem-tabs button.active { background: #13161b; color: #5bb8f5; border-color: #232730; z-index: 1; }
.rem-tab-pill { font-size: 10.5px; background: #1c2128; color: #aab0bb; padding: 2px 7px; border-radius: 999px; font-weight: 600; }
.rem-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #0f1216;
  color: #aab0bb;
  border: 1px solid #2a2f38;
  border-radius: 999px;
  padding: 8px 13px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.rem-chip:disabled { cursor: default; opacity: 0.7; }
.rem-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.rem-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.rem-stat { background: #0f1216; border: 1px solid #1f242c; border-radius: 10px; padding: 12px; }
.rem-stat-label { font-size: 11px; color: #8a909b; margin-bottom: 6px; }
.rem-stat-value { font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; }
.rem-stat-sub { font-size: 11px; color: #5d6470; margin-top: 3px; }
.rem-link-danger { background: transparent; border: none; color: #e88; font-size: 11.5px; cursor: pointer; padding: 0; }
.rem-link-danger:hover { text-decoration: underline; }
@media (max-width: 768px) {
  .rem-grid-2 { grid-template-columns: 1fr; }
}
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
