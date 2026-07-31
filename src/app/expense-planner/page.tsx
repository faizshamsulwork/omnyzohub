"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import type { Expense, Invoice } from "../lib/types";
import {
  buildExpenseDescription,
  createStorageFileName,
  formatDateInputInMalaysia,
  formatMonthLabel,
  getCurrentMonthKeyInMalaysia,
  getErrorMessage,
  getMonthKey,
  getPaymentVoucherPrefix,
  isSuperadminEmail,
  parseExpenseDescription,
  parseStoredJson,
  toNumber,
} from "../lib/utils";
import {
  AddExpenseDrawer,
  ExpenseDetailsDrawer,
  ExpenseList,
  ExpensePlannerHeader,
  MediaBuyWarning,
  MonthSelector,
  MonthlyExpenseSummary,
  PaymentModal,
  RecurringExpenseManager,
  ReimbursementModal,
} from "./components";
import {
  DEFAULT_REIMBURSE_TO,
  LEGACY_RECURRING_STORAGE_KEY,
  PLANNED_EXPENSES_STORAGE_KEY,
  REIMBURSEMENT_META_STORAGE_KEY,
  createPlannedExpenseFromForm,
  dbExpenseToItem,
  defaultAddExpenseForm,
  defaultRecurringPlans,
  getDateForMonthDay,
  getInvoiceCashReceived,
  getMediaBuyCollected,
  getOccurrenceKey,
  isMediaBuyText,
  mapPlannerCategoryToDbCategory,
  migrateLegacyRecurringPlans,
  plannedExpenseToItem,
  sortPlannerItems,
} from "./planner-utils";
import type {
  AddExpenseForm,
  PaymentForm,
  PlannedExpense,
  PlannerExpenseItem,
  ReimbursementForm,
  ReimbursementMeta,
} from "./types";

const defaultPaymentForm = (amount = 0): PaymentForm => ({
  actualDate: formatDateInputInMalaysia(),
  actualAmount: amount ? String(amount) : "",
  notes: "",
  receiptFile: null,
  proofFile: null,
});

const defaultReimbursementForm = (): ReimbursementForm => ({
  reimbursementDate: formatDateInputInMalaysia(),
  bankReference: "",
  notes: "",
});

export default function ExpensePlannerPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [reimbursementMeta, setReimbursementMeta] = useState<Record<string, ReimbursementMeta>>({});
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKeyInMalaysia());

  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddExpenseForm>(defaultAddExpenseForm());
  const [selectedDetailsItem, setSelectedDetailsItem] = useState<PlannerExpenseItem | null>(null);
  const [selectedPaymentItem, setSelectedPaymentItem] = useState<PlannerExpenseItem | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(defaultPaymentForm());
  const [selectedReimbursementItem, setSelectedReimbursementItem] = useState<PlannerExpenseItem | null>(null);
  const [reimbursementForm, setReimbursementForm] = useState<ReimbursementForm>(defaultReimbursementForm());
  const [isRecurringManagerOpen, setIsRecurringManagerOpen] = useState(false);

  const loadPlannerData = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!isSuperadminEmail(session?.user?.email)) {
      setIsLoading(false);
      router.replace("/");
      return;
    }

    const savedPlans = localStorage.getItem(PLANNED_EXPENSES_STORAGE_KEY);
    const savedLegacyPlans = localStorage.getItem(LEGACY_RECURRING_STORAGE_KEY);
    const savedReimbursementMeta = localStorage.getItem(REIMBURSEMENT_META_STORAGE_KEY);

    if (savedPlans) {
      setPlannedExpenses(parseStoredJson<PlannedExpense[]>(savedPlans, []));
    } else if (savedLegacyPlans) {
      setPlannedExpenses(migrateLegacyRecurringPlans(parseStoredJson(savedLegacyPlans, [])));
    } else {
      setPlannedExpenses(defaultRecurringPlans());
    }

    setReimbursementMeta(parseStoredJson<Record<string, ReimbursementMeta>>(savedReimbursementMeta, {}));

    const [expenseResult, invoiceResult] = await Promise.all([
      supabase.from("expenses").select("*").order("date", { ascending: false }),
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
    ]);

    if (expenseResult.error) console.error("Error fetching expenses:", expenseResult.error);
    if (invoiceResult.error) console.error("Error fetching invoices:", invoiceResult.error);
    if (expenseResult.data) setExpenses(expenseResult.data as Expense[]);
    if (invoiceResult.data) setInvoices(invoiceResult.data as Invoice[]);
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    void loadPlannerData();
  }, [loadPlannerData]);

  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem(PLANNED_EXPENSES_STORAGE_KEY, JSON.stringify(plannedExpenses));
  }, [isLoading, plannedExpenses]);

  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem(REIMBURSEMENT_META_STORAGE_KEY, JSON.stringify(reimbursementMeta));
  }, [isLoading, reimbursementMeta]);

  const invoicesById = useMemo(() => new Map(invoices.map((invoice) => [invoice.id, invoice])), [invoices]);

  const actualExpenseItems = useMemo(() => {
    return expenses
      .filter((expense) => getMonthKey(expense.date) === selectedMonth)
      .map((expense) => dbExpenseToItem({ expense, invoicesById, reimbursementMeta }));
  }, [expenses, invoicesById, reimbursementMeta, selectedMonth]);

  const actualPlanMatchers = useMemo(() => {
    return new Set(actualExpenseItems.map((item) => `${item.name.toLowerCase()}|${item.vendor.toLowerCase()}|${item.dueDate.slice(0, 7)}`));
  }, [actualExpenseItems]);

  const plannedItems = useMemo(() => {
    return plannedExpenses
      .map((plannedExpense) => plannedExpenseToItem({ plannedExpense, monthKey: selectedMonth, invoicesById }))
      .filter((item): item is PlannerExpenseItem => Boolean(item))
      .filter((item) => !actualPlanMatchers.has(`${item.name.toLowerCase()}|${item.vendor.toLowerCase()}|${selectedMonth}`));
  }, [actualPlanMatchers, invoicesById, plannedExpenses, selectedMonth]);

  const plannerItems = useMemo(() => {
    return [...plannedItems, ...actualExpenseItems].sort(sortPlannerItems);
  }, [actualExpenseItems, plannedItems]);

  const availableForExpenses = useMemo(() => {
    return invoices
      .filter((invoice) => getMonthKey(invoice.created_at) === selectedMonth)
      .reduce((sum, invoice) => sum + getInvoiceCashReceived(invoice), 0);
  }, [invoices, selectedMonth]);

  const upcomingExpenses = plannerItems
    .filter((item) => item.status === "Upcoming" || item.status === "Overdue")
    .reduce((sum, item) => sum + item.amount, 0);
  const personalReimbursement = plannerItems
    .filter((item) => item.status === "Reimbursement Needed")
    .reduce((sum, item) => sum + item.amount, 0);
  const paidCount = plannerItems.filter((item) => item.status === "Paid" || item.status === "Reimbursed").length;
  const pendingCount = plannerItems.length - paidCount;
  const statusLine = `${plannerItems.length} expenses planned · ${paidCount} paid · ${pendingCount} pending`;

  const mediaBuyCollected = getMediaBuyCollected(invoices, selectedMonth);
  const mediaBuyPlanned = plannerItems
    .filter((item) => item.category === "Media Buy" || isMediaBuyText([item.name, item.vendor, item.relatedProject || ""].join(" ")))
    .reduce((sum, item) => sum + item.amount, 0);

  const recurringPlans = plannedExpenses.filter((plannedExpense) => plannedExpense.recurring);

  const openAddExpense = () => {
    setAddForm(defaultAddExpenseForm(getDateForMonthDay(selectedMonth, Number(formatDateInputInMalaysia().slice(8, 10)) || 1)));
    setIsAddDrawerOpen(true);
  };

  const getNextPaymentVoucherNo = async (dateInput: string) => {
    const prefix = getPaymentVoucherPrefix(dateInput);
    const { data: existingVouchers } = await supabase
      .from("expenses")
      .select("description")
      .like("description", `[%${prefix}%] %`)
      .order("created_at", { ascending: false });

    const maxVoucherNo = (existingVouchers || []).reduce((max: number, curr: Pick<Expense, "description">) => {
      const voucherNo = parseExpenseDescription(curr.description).voucherNo;
      const match = voucherNo?.match(/-PV(\d+)$/);
      if (!match) return max;
      const num = parseInt(match[1]);
      return num > max ? num : max;
    }, 0);

    return `${prefix}${String(maxVoucherNo + 1).padStart(2, "0")}`;
  };

  const uploadOptionalFile = async (file: File | null) => {
    if (!file) return null;

    const fileName = createStorageFileName(file.name);
    const { error } = await supabase.storage.from("receipts").upload(fileName, file);
    if (error) throw error;

    const { data } = supabase.storage.from("receipts").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleAddExpense = () => {
    if (!addForm.name.trim()) {
      toast.error("Please enter an expense name.");
      return;
    }

    if (!addForm.vendor.trim()) {
      toast.error("Please enter the vendor.");
      return;
    }

    const amount = toNumber(addForm.amount);
    if (amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    if (!addForm.dueDate) {
      toast.error("Please select a due date.");
      return;
    }

    const plannedExpense = createPlannedExpenseFromForm(addForm);
    setPlannedExpenses((current) => [...current, plannedExpense]);
    setIsAddDrawerOpen(false);
    setAddForm(defaultAddExpenseForm());
    toast.success("Expense added to planner.");
  };

  const markPlannedOccurrenceComplete = (item: PlannerExpenseItem) => {
    if (!item.plannedExpense || !item.occurrenceKey) return;
    setPlannedExpenses((current) => current.map((plannedExpense) => (
      plannedExpense.id === item.plannedExpense?.id
        ? {
            ...plannedExpense,
            completedOccurrences: Array.from(new Set([...plannedExpense.completedOccurrences, item.occurrenceKey || ""])).filter(Boolean),
          }
        : plannedExpense
    )));
  };

  const handleMainAction = (item: PlannerExpenseItem) => {
    if (item.mainAction === "record-payment") {
      setSelectedPaymentItem(item);
      setPaymentForm(defaultPaymentForm(item.amount));
      setSelectedDetailsItem(null);
      return;
    }

    if (item.mainAction === "mark-paid") {
      void handleMarkPaid(item);
      return;
    }

    if (item.mainAction === "reimburse") {
      setSelectedReimbursementItem(item);
      setReimbursementForm(defaultReimbursementForm());
      setSelectedDetailsItem(null);
      return;
    }

    setSelectedDetailsItem(item);
  };

  const handleMarkPaid = async (item: PlannerExpenseItem) => {
    if (item.source === "planned") {
      setSelectedPaymentItem(item);
      setPaymentForm(defaultPaymentForm(item.amount));
      setSelectedDetailsItem(null);
      return;
    }

    if (!item.expense) return;

    const toastId = toast.loading("Updating payment...");
    const { error } = await supabase
      .from("expenses")
      .update({ status: "Paid" })
      .eq("id", item.expense.id);

    if (error) {
      toast.error(`Failed to update: ${error.message}`, { id: toastId });
      return;
    }

    setExpenses((current) => current.map((expense) => (
      expense.id === item.expense?.id ? { ...expense, status: "Paid" } : expense
    )));
    setSelectedDetailsItem(null);
    toast.success("Expense marked as paid.", { id: toastId });
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPaymentItem) return;

    const actualAmount = toNumber(paymentForm.actualAmount);
    if (actualAmount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Saving payment...");

    try {
      const [receiptUrl, paymentProofUrl] = await Promise.all([
        uploadOptionalFile(paymentForm.receiptFile),
        uploadOptionalFile(paymentForm.proofFile),
      ]);

      const vendorName = selectedPaymentItem.vendor || "Vendor";
      const itemDescription = [
        selectedPaymentItem.name,
        selectedPaymentItem.relatedProject ? `- ${selectedPaymentItem.relatedProject}` : "",
        selectedPaymentItem.relatedInvoice ? `(${selectedPaymentItem.relatedInvoice.invoice_no})` : "",
      ].filter(Boolean).join(" ");
      const voucherNo = selectedPaymentItem.paymentMethod === "personal"
        ? await getNextPaymentVoucherNo(paymentForm.actualDate)
        : null;
      const storedDescription = selectedPaymentItem.paymentMethod === "personal"
        ? buildExpenseDescription({
            voucherNo,
            payeeName: DEFAULT_REIMBURSE_TO,
            originalVendorName: vendorName,
            itemDesc: itemDescription,
            paidPersonally: true,
          })
        : buildExpenseDescription({
            payeeName: vendorName,
            itemDesc: itemDescription,
          });

      const { data, error } = await supabase
        .from("expenses")
        .insert([{
          description: storedDescription,
          amount: actualAmount,
          category: mapPlannerCategoryToDbCategory(selectedPaymentItem.category),
          date: paymentForm.actualDate,
          receipt_url: receiptUrl,
          payment_proof_url: paymentProofUrl,
          status: selectedPaymentItem.paymentMethod === "personal" ? "Outstanding" : "Paid",
        }])
        .select("*")
        .single();

      if (error) throw error;

      if (data) setExpenses((current) => [data as Expense, ...current]);
      markPlannedOccurrenceComplete(selectedPaymentItem);
      setSelectedPaymentItem(null);
      setPaymentForm(defaultPaymentForm());
      toast.success(
        selectedPaymentItem.paymentMethod === "personal" ? "Payment saved. Reimbursement needed." : "Payment saved.",
        { id: toastId }
      );
    } catch (error) {
      toast.error(`Failed to save payment: ${getErrorMessage(error)}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReimbursementSubmit = async () => {
    if (!selectedReimbursementItem?.expense) return;

    setIsSaving(true);
    const toastId = toast.loading("Saving reimbursement...");

    const { error } = await supabase
      .from("expenses")
      .update({ status: "Paid" })
      .eq("id", selectedReimbursementItem.expense.id);

    if (error) {
      setIsSaving(false);
      toast.error(`Failed to reimburse: ${error.message}`, { id: toastId });
      return;
    }

    setExpenses((current) => current.map((expense) => (
      expense.id === selectedReimbursementItem.expense?.id ? { ...expense, status: "Paid" } : expense
    )));
    setReimbursementMeta((current) => ({
      ...current,
      [selectedReimbursementItem.expense!.id]: {
        reimbursementDate: reimbursementForm.reimbursementDate,
        bankReference: reimbursementForm.bankReference.trim(),
        notes: reimbursementForm.notes.trim(),
      },
    }));
    setSelectedReimbursementItem(null);
    setReimbursementForm(defaultReimbursementForm());
    setIsSaving(false);
    toast.success("Marked as reimbursed.", { id: toastId });
  };

  const handleDeleteItem = async (item: PlannerExpenseItem) => {
    const confirmed = window.confirm(`Delete ${item.name}?`);
    if (!confirmed) return;

    if (item.source === "planned" && item.plannedExpense) {
      if (item.plannedExpense.recurring && item.occurrenceKey) {
        markPlannedOccurrenceComplete(item);
      } else {
        setPlannedExpenses((current) => current.filter((plannedExpense) => plannedExpense.id !== item.plannedExpense?.id));
      }
      setSelectedDetailsItem(null);
      toast.success("Expense removed from this month.");
      return;
    }

    if (!item.expense) return;

    const toastId = toast.loading("Deleting expense...");
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", item.expense.id);

    if (error) {
      toast.error(`Delete failed: ${error.message}`, { id: toastId });
      return;
    }

    setExpenses((current) => current.filter((expense) => expense.id !== item.expense?.id));
    setSelectedDetailsItem(null);
    toast.success("Expense deleted.", { id: toastId });
  };

  const updateRecurringPlan = (updatedPlan: PlannedExpense) => {
    setPlannedExpenses((current) => current.map((plannedExpense) => (
      plannedExpense.id === updatedPlan.id ? updatedPlan : plannedExpense
    )));
  };

  const deleteRecurringPlan = (plan: PlannedExpense) => {
    const confirmed = window.confirm(`Remove ${plan.name} from recurring expenses?`);
    if (!confirmed) return;
    setPlannedExpenses((current) => current.filter((plannedExpense) => plannedExpense.id !== plan.id));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">
        Loading Expense Planner...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-32 transition-colors duration-500 md:p-10 lg:p-12">
      <div className="relative z-10 mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <ExpensePlannerHeader onAddExpense={openAddExpense} />
        <MonthSelector selectedMonth={selectedMonth} statusLine={statusLine} onChange={setSelectedMonth} />
        <MonthlyExpenseSummary
          available={availableForExpenses}
          upcoming={upcomingExpenses}
          reimbursement={personalReimbursement}
        />
        <MediaBuyWarning planned={mediaBuyPlanned} collected={mediaBuyCollected} />
        <ExpenseList
          items={plannerItems}
          onAddExpense={openAddExpense}
          onOpenDetails={setSelectedDetailsItem}
          onMainAction={handleMainAction}
          onManageRecurring={() => setIsRecurringManagerOpen(true)}
        />
      </div>

      <AddExpenseDrawer
        isOpen={isAddDrawerOpen}
        form={addForm}
        invoices={invoices}
        isSaving={isSaving}
        onChange={setAddForm}
        onClose={() => setIsAddDrawerOpen(false)}
        onSubmit={handleAddExpense}
      />
      <ExpenseDetailsDrawer
        item={selectedDetailsItem}
        reimbursementMeta={selectedDetailsItem?.expense ? reimbursementMeta[selectedDetailsItem.expense.id] : undefined}
        onClose={() => setSelectedDetailsItem(null)}
        onRecordPayment={handleMainAction}
        onMarkPaid={(item) => void handleMarkPaid(item)}
        onReimburse={handleMainAction}
        onDelete={(item) => void handleDeleteItem(item)}
        onManageRecurring={() => setIsRecurringManagerOpen(true)}
      />
      <PaymentModal
        item={selectedPaymentItem}
        form={paymentForm}
        isSaving={isSaving}
        onChange={setPaymentForm}
        onClose={() => setSelectedPaymentItem(null)}
        onSubmit={() => void handlePaymentSubmit()}
      />
      <ReimbursementModal
        item={selectedReimbursementItem}
        form={reimbursementForm}
        isSaving={isSaving}
        onChange={setReimbursementForm}
        onClose={() => setSelectedReimbursementItem(null)}
        onSubmit={() => void handleReimbursementSubmit()}
      />
      <RecurringExpenseManager
        isOpen={isRecurringManagerOpen}
        recurringPlans={recurringPlans}
        onClose={() => setIsRecurringManagerOpen(false)}
        onUpdate={updateRecurringPlan}
        onDelete={deleteRecurringPlan}
      />
    </div>
  );
}
