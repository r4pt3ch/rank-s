// Philippine Peso denominations used for cash remittance counts.
// Shared by the remittance page (auto-imported) and the server (imported directly).

export type DenominationType = "bill" | "coin";
export interface Denomination {
  key: string;
  value: number;
  type: DenominationType;
  label: string;
}

export const PESO_DENOMINATIONS: Denomination[] = [
  { key: "b1000", value: 1000, type: "bill", label: "₱1,000" },
  { key: "b500",  value: 500,  type: "bill", label: "₱500" },
  { key: "b200",  value: 200,  type: "bill", label: "₱200" },
  { key: "b100",  value: 100,  type: "bill", label: "₱100" },
  { key: "b50",   value: 50,   type: "bill", label: "₱50" },
  { key: "b20",   value: 20,   type: "bill", label: "₱20" },
  { key: "c20",   value: 20,   type: "coin", label: "₱20" },
  { key: "c10",   value: 10,   type: "coin", label: "₱10" },
  { key: "c5",    value: 5,    type: "coin", label: "₱5" },
  { key: "c1",    value: 1,    type: "coin", label: "₱1" },
  { key: "c025",  value: 0.25, type: "coin", label: "25¢" },
];

// Work in centavos so 25-centavo coins never cause floating-point drift.
export function pesoTotal(counts: Record<string, number>) {
  let centavos = 0;
  for (const d of PESO_DENOMINATIONS) {
    const n = Math.max(0, Math.floor(Number(counts[d.key]) || 0));
    centavos += Math.round(d.value * 100) * n;
  }
  return centavos / 100;
}

export function formatPeso(n: number) {
  return "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
