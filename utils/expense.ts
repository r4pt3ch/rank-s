// Expense categories for money paid out during the day.
// Shared by the remittance page / reports (auto-imported) and the server (imported directly).

export interface ExpenseCategory {
  key: string;
  label: string;
  color: string;
  hint: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { key: "supplies",  label: "Supplies",             color: "#5bb8f5", hint: "Office, front desk, gym supplies" },
  { key: "cleaning",  label: "Cleaning & toiletries", color: "#16c1c9", hint: "Detergent, tissue, soap, trash bags" },
  { key: "stock",     label: "Stock / restock",      color: "#9b8afb", hint: "Items bought for resale at the POS" },
  { key: "utilities", label: "Utilities",            color: "#f3c44b", hint: "Electricity, water, internet, load" },
  { key: "repairs",   label: "Repairs & maintenance", color: "#f26d3d", hint: "Equipment, plumbing, electrical" },
  { key: "food",      label: "Food & drinks",        color: "#2fbf71", hint: "Staff meals, drinking water" },
  { key: "transport", label: "Transport & delivery", color: "#d9a43c", hint: "Fare, gas, delivery fees" },
  { key: "wages",     label: "Salary / cash advance", color: "#e88",    hint: "Wages or advances paid in cash" },
  { key: "other",     label: "Other",                color: "#8a909b", hint: "Anything else" },
];

export function expenseCategory(key: string) {
  return EXPENSE_CATEGORIES.find((c) => c.key === key) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

// Where the money came from. Only "cash" (paid out of the drawer) reduces the cash on hand
// that staff are expected to remit; "other" (owner's pocket, bank, e-wallet) is tracked as an
// expense but doesn't affect the cash balance.
export const EXPENSE_SOURCES = [
  { key: "cash",  label: "Cash on hand",     hint: "Taken from the drawer — reduces expected cash" },
  { key: "other", label: "Not from drawer",  hint: "Owner, bank or e-wallet — doesn't affect cash" },
];

const r2 = (n: number) => Math.round(n * 100) / 100;

// Cash on hand balance for one day or a whole period.
//   expected cash = recorded sales − e-payments received − expenses paid from the drawer
//   difference    = cash counted − expected cash   (0 balanced, + over, − short)
export function cashBalance(sales: number, epayments: number, cashExpenses: number, counted: number) {
  const cashSales = r2(sales - epayments);
  const expectedCash = r2(cashSales - cashExpenses);
  return { cashSales, expectedCash, difference: r2(counted - expectedCash) };
}
