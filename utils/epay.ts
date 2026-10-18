// Electronic payment channels accepted at the front desk.
// Shared by the remittance page (auto-imported) and the server (imported directly).

export interface EPayProvider {
  key: string;
  label: string;
  color: string;
}

export const EPAY_PROVIDERS: EPayProvider[] = [
  { key: "gcash",     label: "GCash",          color: "#3d8bfd" },
  { key: "maya",      label: "Maya",           color: "#2fbf71" },
  { key: "gotyme",    label: "GoTyme",         color: "#16c1c9" },
  { key: "shopeepay", label: "ShopeePay",      color: "#f26d3d" },
  { key: "grabpay",   label: "GrabPay",        color: "#3fb24b" },
  { key: "bank",      label: "Bank transfer",  color: "#9b8afb" },
  { key: "card",      label: "Card",           color: "#d9a43c" },
  { key: "other",     label: "Other",          color: "#8a909b" },
];

export function epayProvider(key: string) {
  return EPAY_PROVIDERS.find((p) => p.key === key) || EPAY_PROVIDERS[EPAY_PROVIDERS.length - 1];
}
