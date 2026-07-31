import type { Expense, Invoice, LineItem } from "../lib/types";
import {
  formatDateInputInMalaysia,
  getCurrentMonthKeyInMalaysia,
  getMonthKey,
  isPaidStatus,
  isPartialStatus,
  parseExpenseDescription,
  toNumber,
} from "../lib/utils";
import type {
  AddExpenseForm,
  PaymentMethod,
  PlannedExpense,
  PlannerCategory,
  PlannerExpenseItem,
  ReimbursementMeta,
  StatusTone,
} from "./types";

export const PLANNED_EXPENSES_STORAGE_KEY = "omnyzo_planned_expenses_v2";
export const LEGACY_RECURRING_STORAGE_KEY = "omnyzo_recurring_expense_templates_v1";
export const REIMBURSEMENT_META_STORAGE_KEY = "omnyzo_reimbursement_meta_v1";
export const DEFAULT_REIMBURSE_TO = "Faiz Shamsul";

export const plannerCategories: PlannerCategory[] = [
  "Media Buy",
  "Software & Subscription",
  "Freelancer",
  "Production",
  "Travel",
  "Office",
  "Other",
];

export const defaultAddExpenseForm = (date = formatDateInputInMalaysia()): AddExpenseForm => ({
  name: "",
  category: "Software & Subscription",
  amount: "",
  dueDate: date,
  vendor: "",
  relatedProject: "",
  relatedInvoiceId: "",
  paymentMethod: "omnyzo",
  recurring: false,
  repeatDay: String(Number(date.slice(8, 10)) || 1),
  endDate: "",
});

type LegacyRecurringExpenseTemplate = {
  id: string;
  title: string;
  vendor: string;
  amount: number;
  category: string;
  reimbursementTo: string;
  dayOfMonth: number;
  active: boolean;
  lastGeneratedMonth?: string | null;
};

export const defaultRecurringPlans = (): PlannedExpense[] => {
  const today = formatDateInputInMalaysia();
  const monthKey = getCurrentMonthKeyInMalaysia();

  return [
    ["ChatGPT", "OpenAI / ChatGPT"],
    ["Canva Pro", "Canva"],
    ["CapCut", "CapCut"],
    ["Google Workspace", "Google Workspace"],
  ].map(([name, vendor], index) => ({
    id: `preset-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    name,
    category: "Software & Subscription" as PlannerCategory,
    amount: 0,
    dueDate: getDateForMonthDay(monthKey, index + 1),
    vendor,
    relatedProject: "",
    relatedInvoiceId: "",
    paymentMethod: "personal" as PaymentMethod,
    recurring: true,
    repeatDay: index + 1,
    endDate: "",
    active: true,
    completedOccurrences: [],
    createdAt: today,
  }));
};

export const migrateLegacyRecurringPlans = (legacyTemplates: LegacyRecurringExpenseTemplate[]) => {
  const monthKey = getCurrentMonthKeyInMalaysia();

  return legacyTemplates.map((template) => ({
    id: `legacy-${template.id}`,
    name: template.title,
    category: mapDbCategoryToPlannerCategory(template.category),
    amount: toNumber(template.amount),
    dueDate: getDateForMonthDay(monthKey, template.dayOfMonth || 1),
    vendor: template.vendor,
    relatedProject: "",
    relatedInvoiceId: "",
    paymentMethod: "personal" as PaymentMethod,
    recurring: true,
    repeatDay: clampDay(template.dayOfMonth),
    endDate: "",
    active: template.active,
    completedOccurrences: template.lastGeneratedMonth ? [`${template.id}:${template.lastGeneratedMonth}`] : [],
    createdAt: formatDateInputInMalaysia(),
  }));
};

export const createLocalId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const clampDay = (value: number) => Math.min(31, Math.max(1, Math.round(value || 1)));

export const shiftMonth = (monthKey: string, direction: -1 | 1) => {
  const [year, month] = monthKey.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1 + direction, 1));
  return `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}`;
};

export const getDateForMonthDay = (monthKey: string, dayOfMonth: number) => {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(clampDay(dayOfMonth), lastDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const getOccurrenceKey = (plannedExpense: PlannedExpense, monthKey: string) => `${plannedExpense.id}:${monthKey}`;

export const isBeforeToday = (dateInput: string) => dateInput < formatDateInputInMalaysia();

export const isRecurringVisibleInMonth = (plannedExpense: PlannedExpense, monthKey: string) => {
  if (!plannedExpense.active || !plannedExpense.recurring) return false;
  const startMonth = getMonthKey(plannedExpense.dueDate);
  const endMonth = plannedExpense.endDate ? getMonthKey(plannedExpense.endDate) : "";

  if (monthKey < startMonth) return false;
  if (endMonth && monthKey > endMonth) return false;
  return true;
};

export const mapPlannerCategoryToDbCategory = (category: PlannerCategory) => {
  switch (category) {
    case "Media Buy":
      return "Advertising & Marketing *";
    case "Software & Subscription":
      return "Software & Tools *";
    case "Freelancer":
      return "Professional Fees (Vendors) *";
    case "Production":
      return "Other";
    case "Travel":
      return "Travel & Transportation *";
    case "Office":
      return "Office Supplies & Equipment *";
    default:
      return "Other";
  }
};

export const mapDbCategoryToPlannerCategory = (category?: string | null): PlannerCategory => {
  const text = (category || "").toLowerCase();
  if (text.includes("advertising") || text.includes("marketing")) return "Media Buy";
  if (text.includes("software") || text.includes("tools") || text.includes("telecommunication")) return "Software & Subscription";
  if (text.includes("professional") || text.includes("vendor")) return "Freelancer";
  if (text.includes("travel") || text.includes("transport")) return "Travel";
  if (text.includes("office")) return "Office";
  return "Other";
};

export const getSimpleStatus = ({
  paymentMethod,
  isPaid,
  dueDate,
}: {
  paymentMethod: PaymentMethod;
  isPaid: boolean;
  dueDate: string;
}): { status: PlannerExpenseItem["status"]; tone: StatusTone; mainAction: PlannerExpenseItem["mainAction"] } => {
  if (paymentMethod === "personal") {
    if (isPaid) return { status: "Reimbursed", tone: "green", mainAction: "view" };
    return { status: "Reimbursement Needed", tone: "purple", mainAction: "reimburse" };
  }

  if (isPaid) return { status: "Paid", tone: "green", mainAction: "view" };
  if (isBeforeToday(dueDate)) return { status: "Overdue", tone: "red", mainAction: "mark-paid" };
  return { status: "Upcoming", tone: "amber", mainAction: "mark-paid" };
};

export const getPlannedStatus = (plannedExpense: PlannedExpense, dueDate: string) => {
  if (isBeforeToday(dueDate)) {
    return {
      status: "Overdue" as const,
      tone: "red" as const,
      mainAction: "record-payment" as const,
    };
  }

  return {
    status: "Upcoming" as const,
    tone: "amber" as const,
    mainAction: "record-payment" as const,
  };
};

export const plannedExpenseToItem = ({
  plannedExpense,
  monthKey,
  invoicesById,
}: {
  plannedExpense: PlannedExpense;
  monthKey: string;
  invoicesById: Map<string, Invoice>;
}): PlannerExpenseItem | null => {
  if (plannedExpense.amount <= 0) return null;

  const dueDate = plannedExpense.recurring
    ? getDateForMonthDay(monthKey, plannedExpense.repeatDay || Number(plannedExpense.dueDate.slice(8, 10)) || 1)
    : plannedExpense.dueDate;
  const occurrenceKey = plannedExpense.recurring ? getOccurrenceKey(plannedExpense, monthKey) : plannedExpense.id;

  if (plannedExpense.completedOccurrences.includes(occurrenceKey)) return null;
  if (plannedExpense.recurring && !isRecurringVisibleInMonth(plannedExpense, monthKey)) return null;
  if (!plannedExpense.recurring && getMonthKey(plannedExpense.dueDate) !== monthKey) return null;

  const status = getPlannedStatus(plannedExpense, dueDate);

  return {
    key: `planned-${occurrenceKey}`,
    source: "planned",
    plannedExpense,
    occurrenceKey,
    name: plannedExpense.name,
    category: plannedExpense.category,
    amount: plannedExpense.amount,
    dueDate,
    vendor: plannedExpense.vendor,
    relatedProject: plannedExpense.relatedProject,
    relatedInvoice: plannedExpense.relatedInvoiceId ? invoicesById.get(plannedExpense.relatedInvoiceId) || null : null,
    paymentMethod: plannedExpense.paymentMethod,
    status: status.status,
    statusTone: status.tone,
    mainAction: status.mainAction,
    isRecurring: plannedExpense.recurring,
  };
};

export const dbExpenseToItem = ({
  expense,
  invoicesById,
  reimbursementMeta,
}: {
  expense: Expense;
  invoicesById: Map<string, Invoice>;
  reimbursementMeta: Record<string, ReimbursementMeta>;
}): PlannerExpenseItem => {
  const parsed = parseExpenseDescription(expense.description);
  const paymentMethod: PaymentMethod = parsed.paidPersonally ? "personal" : "omnyzo";
  const isPaid = expense.status === "Paid";
  const status = getSimpleStatus({ paymentMethod, isPaid, dueDate: expense.date });
  const relatedInvoice = findRelatedInvoice(expense.description, invoicesById);

  return {
    key: `expense-${expense.id}`,
    source: "expense",
    expense,
    name: parsed.itemDesc || expense.description,
    category: mapDbCategoryToPlannerCategory(expense.category),
    amount: toNumber(expense.amount),
    dueDate: expense.date,
    vendor: parsed.originalVendorName || parsed.payeeName || "Vendor",
    relatedProject: "",
    relatedInvoice,
    paymentMethod,
    status: status.status,
    statusTone: reimbursementMeta[expense.id] ? "green" : status.tone,
    mainAction: status.mainAction,
    isRecurring: false,
    voucherNo: parsed.voucherNo,
    receiptUrl: expense.receipt_url,
    paymentProofUrl: expense.payment_proof_url,
  };
};

const findRelatedInvoice = (description: string, invoicesById: Map<string, Invoice>) => {
  const lowerDescription = description.toLowerCase();
  for (const invoice of invoicesById.values()) {
    if (invoice.invoice_no && lowerDescription.includes(invoice.invoice_no.toLowerCase())) return invoice;
    if (invoice.client_name && lowerDescription.includes(invoice.client_name.toLowerCase())) return invoice;
  }
  return null;
};

export const createPlannedExpenseFromForm = (form: AddExpenseForm): PlannedExpense => ({
  id: createLocalId(),
  name: form.name.trim(),
  category: form.category,
  amount: toNumber(form.amount),
  dueDate: form.dueDate,
  vendor: form.vendor.trim(),
  relatedProject: form.relatedProject.trim(),
  relatedInvoiceId: form.relatedInvoiceId,
  paymentMethod: form.paymentMethod,
  recurring: form.recurring,
  repeatDay: form.recurring ? clampDay(toNumber(form.repeatDay)) : undefined,
  endDate: form.endDate,
  active: true,
  completedOccurrences: [],
  createdAt: formatDateInputInMalaysia(),
});

export const mediaBuyKeywords = [
  "media buy",
  "media spend",
  "ad spend",
  "ads",
  "advertising",
  "meta",
  "facebook",
  "instagram",
  "google ads",
  "tiktok",
  "linkedin ads",
];

export const isMediaBuyText = (value: string) => {
  const text = value.toLowerCase();
  return mediaBuyKeywords.some((keyword) => text.includes(keyword));
};

export const getLineTotal = (item: LineItem) => {
  const storedTotal = toNumber(item.total);
  if (storedTotal > 0) return storedTotal;
  return toNumber(item.qty) * toNumber(item.price);
};

export const getInvoiceCashReceived = (invoice: Invoice) => {
  const invoiceTotal = toNumber(invoice.amount);
  if (invoiceTotal <= 0) return 0;
  if (isPaidStatus(invoice.status)) return invoiceTotal;
  if (isPartialStatus(invoice.status)) return Math.min(invoiceTotal, toNumber(invoice.amount_paid));
  return 0;
};

export const getMediaBuyCollected = (invoices: Invoice[], selectedMonth: string) => {
  return invoices.reduce((sum, invoice) => {
    if (getMonthKey(invoice.created_at) !== selectedMonth) return sum;

    const invoiceTotal = toNumber(invoice.amount);
    const cashReceived = getInvoiceCashReceived(invoice);
    if (invoiceTotal <= 0 || cashReceived <= 0) return sum;

    const cashRatio = Math.min(1, cashReceived / invoiceTotal);
    const mediaLineTotal = (invoice.items || []).reduce((lineSum, item) => {
      return isMediaBuyText(item.description) ? lineSum + getLineTotal(item) : lineSum;
    }, 0);

    return sum + mediaLineTotal * cashRatio;
  }, 0);
};

export const sortPlannerItems = (a: PlannerExpenseItem, b: PlannerExpenseItem) => {
  if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  return a.name.localeCompare(b.name);
};
