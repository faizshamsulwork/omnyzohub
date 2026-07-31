import type { Expense, Invoice } from "../lib/types";

export type PlannerCategory =
  | "Media Buy"
  | "Software & Subscription"
  | "Freelancer"
  | "Production"
  | "Travel"
  | "Office"
  | "Other";

export type PaymentMethod = "omnyzo" | "personal";

export type ExpenseStatus =
  | "Upcoming"
  | "Paid"
  | "Reimbursement Needed"
  | "Reimbursed"
  | "Overdue";

export type StatusTone = "neutral" | "green" | "amber" | "purple" | "red";

export interface PlannedExpense {
  id: string;
  name: string;
  category: PlannerCategory;
  amount: number;
  dueDate: string;
  vendor: string;
  relatedProject?: string;
  relatedInvoiceId?: string;
  paymentMethod: PaymentMethod;
  recurring: boolean;
  repeatDay?: number;
  endDate?: string;
  active: boolean;
  completedOccurrences: string[];
  createdAt: string;
}

export interface AddExpenseForm {
  name: string;
  category: PlannerCategory;
  amount: string;
  dueDate: string;
  vendor: string;
  relatedProject: string;
  relatedInvoiceId: string;
  paymentMethod: PaymentMethod;
  recurring: boolean;
  repeatDay: string;
  endDate: string;
}

export interface PaymentForm {
  actualDate: string;
  actualAmount: string;
  notes: string;
  receiptFile: File | null;
  proofFile: File | null;
}

export interface ReimbursementForm {
  reimbursementDate: string;
  bankReference: string;
  notes: string;
}

export interface ReimbursementMeta {
  reimbursementDate: string;
  bankReference?: string;
  notes?: string;
}

export interface PlannerExpenseItem {
  key: string;
  source: "planned" | "expense";
  plannedExpense?: PlannedExpense;
  expense?: Expense;
  occurrenceKey?: string;
  name: string;
  category: PlannerCategory;
  amount: number;
  dueDate: string;
  vendor: string;
  relatedProject?: string;
  relatedInvoice?: Invoice | null;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  statusTone: StatusTone;
  mainAction: "record-payment" | "mark-paid" | "reimburse" | "view";
  isRecurring: boolean;
  voucherNo?: string | null;
  receiptUrl?: string | null;
  paymentProofUrl?: string | null;
}
