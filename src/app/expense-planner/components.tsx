"use client";

import Link from "next/link";
import type { ChangeEvent, ReactNode } from "react";
import type { Invoice } from "../lib/types";
import { formatMonthLabel, toMoney } from "../lib/utils";
import {
  DEFAULT_REIMBURSE_TO,
  plannerCategories,
  shiftMonth,
} from "./planner-utils";
import type {
  AddExpenseForm,
  PaymentForm,
  PlannedExpense,
  PlannerExpenseItem,
  ReimbursementForm,
  ReimbursementMeta,
} from "./types";

const statusClass = {
  neutral: "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300",
  amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300",
  purple: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-900/20 dark:text-purple-300",
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300",
};

export function ExpensePlannerHeader({ onAddExpense }: { onAddExpense: () => void }) {
  return (
    <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Money Planner</p>
        <h1 className="text-4xl font-semibold tracking-tight text-gray-950 dark:text-white">Expense Planner</h1>
        <p className="mt-2 max-w-2xl text-base font-medium text-gray-500 dark:text-gray-400">
          Plan upcoming expenses, track payments and reimburse personal spending.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/expenses"
          className="inline-flex h-12 items-center justify-center rounded-full border border-gray-200 bg-white/70 px-5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-white active:scale-95 dark:border-gray-800 dark:bg-[#111111]/70 dark:text-gray-200 dark:hover:bg-[#181818]"
        >
          View Expense History
        </Link>
        <button
          type="button"
          onClick={onAddExpense}
          className="inline-flex h-12 items-center justify-center rounded-full bg-gray-950 px-6 text-sm font-bold text-white shadow-lg shadow-black/10 transition-all hover:bg-black active:scale-95 dark:bg-white dark:text-black"
        >
          Add Expense
        </button>
      </div>
    </header>
  );
}

export function MonthSelector({
  selectedMonth,
  statusLine,
  onChange,
}: {
  selectedMonth: string;
  statusLine: string;
  onChange: (monthKey: string) => void;
}) {
  return (
    <section className="mb-6 flex flex-col gap-3 rounded-[24px] border border-gray-200 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-xl dark:border-gray-800 dark:bg-[#111111]/70 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(shiftMonth(selectedMonth, -1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all hover:text-gray-900 active:scale-95 dark:border-gray-800 dark:bg-black dark:hover:text-white"
          aria-label="Previous month"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <p className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">{formatMonthLabel(selectedMonth)}</p>
          <p className="mt-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">{statusLine}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(shiftMonth(selectedMonth, 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all hover:text-gray-900 active:scale-95 dark:border-gray-800 dark:bg-black dark:hover:text-white"
          aria-label="Next month"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <input
        type="month"
        value={selectedMonth}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-full border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 outline-none transition-all focus:ring-2 focus:ring-gray-900 dark:border-gray-800 dark:bg-black dark:text-gray-200 dark:[color-scheme:dark]"
      />
    </section>
  );
}

export function MonthlyExpenseSummary({
  available,
  upcoming,
  reimbursement,
}: {
  available: number;
  upcoming: number;
  reimbursement: number;
}) {
  const cards = [
    ["Available for Expenses", available, "Collected from paid invoices"],
    ["Upcoming Expenses", upcoming, "Due this month"],
    ["Personal Reimbursement", reimbursement, "Waiting to be reimbursed"],
  ];

  return (
    <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
      {cards.map(([title, amount, subtitle]) => (
        <div key={title} className="rounded-[24px] border border-gray-200 bg-white/75 p-6 shadow-sm backdrop-blur-xl dark:border-gray-800 dark:bg-[#111111]/75">
          <h2 className="mb-3 text-[11px] font-black uppercase tracking-widest text-gray-400">{title}</h2>
          <p className="text-3xl font-black tracking-tight text-gray-950 dark:text-white">RM {toMoney(amount as number)}</p>
          <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      ))}
    </section>
  );
}

export function MediaBuyWarning({
  planned,
  collected,
}: {
  planned: number;
  collected: number;
}) {
  if (planned <= collected) return null;

  return (
    <div className="mb-6 rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 shadow-sm dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
      <p className="font-black">RM{toMoney(planned)} planned, but only RM{toMoney(collected)} has been collected from the client.</p>
      <p className="mt-1 text-sm font-medium opacity-80">You may need to use Omnyzo&apos;s available cash temporarily.</p>
    </div>
  );
}

export function ExpenseList({
  items,
  onAddExpense,
  onOpenDetails,
  onMainAction,
  onManageRecurring,
}: {
  items: PlannerExpenseItem[];
  onAddExpense: () => void;
  onOpenDetails: (item: PlannerExpenseItem) => void;
  onMainAction: (item: PlannerExpenseItem) => void;
  onManageRecurring: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-gray-200 bg-white/80 shadow-xl backdrop-blur-2xl dark:border-gray-800 dark:bg-[#111111]/80">
      <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-gray-950 dark:text-white">This Month&apos;s Expenses</h2>
          <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Media buy, subscriptions and other business costs in one place.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <ExpenseEmptyState onAddExpense={onAddExpense} />
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-900">
          {items.map((item) => (
            <ExpenseListItem
              key={item.key}
              item={item}
              onOpenDetails={onOpenDetails}
              onMainAction={onMainAction}
            />
          ))}
        </div>
      )}

      <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
        <button
          type="button"
          onClick={onManageRecurring}
          className="text-sm font-bold text-gray-500 transition-colors hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
        >
          Manage recurring expenses
        </button>
      </div>
    </section>
  );
}

function ExpenseEmptyState({ onAddExpense }: { onAddExpense: () => void }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-900">
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v-1M5 12a7 7 0 1114 0 7 7 0 01-14 0z" /></svg>
      </div>
      <h3 className="text-xl font-black text-gray-950 dark:text-white">No expenses planned for this month</h3>
      <p className="mt-2 max-w-sm text-sm font-medium text-gray-500 dark:text-gray-400">Add upcoming media buy, subscriptions or other business expenses.</p>
      <button
        type="button"
        onClick={onAddExpense}
        className="mt-6 rounded-full bg-gray-950 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-black/10 transition-all hover:bg-black active:scale-95 dark:bg-white dark:text-black"
      >
        Add Expense
      </button>
    </div>
  );
}

function ExpenseListItem({
  item,
  onOpenDetails,
  onMainAction,
}: {
  item: PlannerExpenseItem;
  onOpenDetails: (item: PlannerExpenseItem) => void;
  onMainAction: (item: PlannerExpenseItem) => void;
}) {
  const actionLabel = {
    "record-payment": "Record Payment",
    "mark-paid": "Mark Paid",
    reimburse: "Reimburse",
    view: "View",
  }[item.mainAction];

  return (
    <div className="grid gap-4 px-6 py-5 transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-900/30 md:grid-cols-[minmax(0,1fr)_160px_170px_130px] md:items-center">
      <button
        type="button"
        onClick={() => onOpenDetails(item)}
        className="min-w-0 text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-black text-gray-950 dark:text-white">{item.name}</p>
          {item.isRecurring && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              Monthly
            </span>
          )}
        </div>
        <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
          {item.category} · RM {toMoney(item.amount)} · Due {new Date(item.dueDate).toLocaleDateString("en-MY", { day: "2-digit", month: "short" })}
        </p>
        {item.relatedProject && (
          <p className="mt-1 truncate text-xs font-medium text-gray-400">{item.relatedProject}</p>
        )}
      </button>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment</p>
        <p className="mt-1 text-sm font-bold text-gray-800 dark:text-gray-200">
          {item.paymentMethod === "personal" ? "Paid Personally" : "Pay from Omnyzo"}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Status</p>
        <span className={`mt-1 inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${statusClass[item.statusTone]}`}>
          {item.status}
        </span>
      </div>

      <div className="flex items-center gap-2 md:justify-end">
        <button
          type="button"
          onClick={() => onMainAction(item)}
          className="inline-flex h-10 min-w-[112px] items-center justify-center rounded-full bg-gray-950 px-4 text-xs font-black text-white transition-all hover:bg-black active:scale-95 dark:bg-white dark:text-black"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export function AddExpenseDrawer({
  isOpen,
  form,
  invoices,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  form: AddExpenseForm;
  invoices: Invoice[];
  isSaving: boolean;
  onChange: (form: AddExpenseForm) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm">
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-[#101010] md:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Plan Expenses</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950 dark:text-white">Add Expense</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:text-gray-950 dark:bg-gray-900 dark:hover:text-white"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-8">
          <section>
            <h3 className="mb-4 text-sm font-black text-gray-950 dark:text-white">1. What is this expense?</h3>
            <div className="grid grid-cols-1 gap-4">
              <TextField label="Expense name" value={form.name} onChange={(value) => onChange({ ...form, name: value })} placeholder="e.g. Meta Ads - July Campaign" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField label="Category" value={form.category} onChange={(value) => onChange({ ...form, category: value as AddExpenseForm["category"] })} options={plannerCategories} />
                <TextField label="Amount" type="number" value={form.amount} onChange={(value) => onChange({ ...form, amount: value })} placeholder="0.00" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="Due date" type="date" value={form.dueDate} onChange={(value) => onChange({ ...form, dueDate: value, repeatDay: form.recurring ? value.slice(8, 10) : form.repeatDay })} />
                <TextField label="Vendor" value={form.vendor} onChange={(value) => onChange({ ...form, vendor: value })} placeholder="e.g. Meta, Canva, Amirun" />
              </div>
              <TextField label="Related project or client" value={form.relatedProject} onChange={(value) => onChange({ ...form, relatedProject: value })} placeholder="Optional" />
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-500">Related invoice</label>
                <select
                  value={form.relatedInvoiceId}
                  onChange={(event) => onChange({ ...form, relatedInvoiceId: event.target.value })}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none transition-all focus:ring-2 focus:ring-gray-950 dark:border-gray-800 dark:bg-black dark:text-white"
                >
                  <option value="">Optional</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_no} · {invoice.client_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-sm font-black text-gray-950 dark:text-white">2. How will it be paid?</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PaymentOption
                title="Pay from Omnyzo"
                description="Omnyzo pays the vendor directly."
                active={form.paymentMethod === "omnyzo"}
                onClick={() => onChange({ ...form, paymentMethod: "omnyzo" })}
              />
              <PaymentOption
                title="Pay Personally"
                description="I will pay first and claim it from Omnyzo."
                active={form.paymentMethod === "personal"}
                onClick={() => onChange({ ...form, paymentMethod: "personal" })}
              />
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-gray-950 dark:text-white">3. Is this recurring?</h3>
                <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">Repeat this expense every month.</p>
              </div>
              <button
                type="button"
                onClick={() => onChange({ ...form, recurring: !form.recurring })}
                className={`relative h-8 w-14 rounded-full transition-colors ${form.recurring ? "bg-gray-950 dark:bg-white" : "bg-gray-200 dark:bg-gray-800"}`}
                aria-label="Repeat every month"
              >
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform dark:bg-black ${form.recurring ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>

            {form.recurring && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="Repeat date" type="number" value={form.repeatDay} onChange={(value) => onChange({ ...form, repeatDay: value })} />
                <TextField label="End date" type="date" value={form.endDate} onChange={(value) => onChange({ ...form, endDate: value })} />
              </div>
            )}
          </section>
        </div>

        <div className="sticky bottom-0 mt-10 flex justify-end gap-3 border-t border-gray-200 bg-white/95 py-5 backdrop-blur dark:border-gray-800 dark:bg-[#101010]/95">
          <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-bold text-gray-500 transition-colors hover:text-gray-950 dark:hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSaving}
            className="rounded-full bg-gray-950 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-black/10 transition-all hover:bg-black active:scale-95 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {isSaving ? "Saving..." : "Save Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none transition-all focus:ring-2 focus:ring-gray-950 dark:border-gray-800 dark:bg-black dark:text-white dark:[color-scheme:dark]"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none transition-all focus:ring-2 focus:ring-gray-950 dark:border-gray-800 dark:bg-black dark:text-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function PaymentOption({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[22px] border p-5 text-left transition-all active:scale-[0.99] ${
        active
          ? "border-gray-950 bg-gray-950 text-white shadow-lg shadow-black/10 dark:border-white dark:bg-white dark:text-black"
          : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 dark:border-gray-800 dark:bg-black dark:text-gray-300"
      }`}
    >
      <span className="block text-base font-black">{title}</span>
      <span className="mt-1 block text-sm font-medium opacity-75">{description}</span>
    </button>
  );
}

export function PaymentModal({
  item,
  form,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}: {
  item: PlannerExpenseItem | null;
  form: PaymentForm;
  isSaving: boolean;
  onChange: (form: PaymentForm) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!item) return null;

  return (
    <ModalShell title="Record Payment" onClose={onClose}>
      <div className="rounded-2xl bg-gray-50 p-4 dark:bg-black/40">
        <p className="font-black text-gray-950 dark:text-white">{item.name}</p>
        <p className="mt-1 text-sm font-bold text-gray-500">RM {toMoney(item.amount)} · {item.paymentMethod === "personal" ? "Pay Personally" : "Pay from Omnyzo"}</p>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Actual payment date" type="date" value={form.actualDate} onChange={(value) => onChange({ ...form, actualDate: value })} />
        <TextField label="Actual amount" type="number" value={form.actualAmount} onChange={(value) => onChange({ ...form, actualAmount: value })} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FileField label="Receipt attachment" onChange={(file) => onChange({ ...form, receiptFile: file })} />
        <FileField label="Payment proof" onChange={(file) => onChange({ ...form, proofFile: file })} />
      </div>
      <div className="mt-4">
        <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-500">Notes</label>
        <textarea
          value={form.notes}
          onChange={(event) => onChange({ ...form, notes: event.target.value })}
          className="min-h-24 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none transition-all focus:ring-2 focus:ring-gray-950 dark:border-gray-800 dark:bg-black dark:text-white"
        />
      </div>
      <ModalActions onClose={onClose} onSubmit={onSubmit} submitLabel={isSaving ? "Saving..." : "Save Payment"} disabled={isSaving} />
    </ModalShell>
  );
}

function FileField({ label, onChange }: { label: string; onChange: (file: File | null) => void }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-500">{label}</label>
      <input
        type="file"
        accept="image/*, application/pdf"
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.files?.[0] || null)}
        className="block w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm font-bold text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-gray-950 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:file:bg-white dark:file:text-black"
      />
    </div>
  );
}

export function ReimbursementModal({
  item,
  form,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}: {
  item: PlannerExpenseItem | null;
  form: ReimbursementForm;
  isSaving: boolean;
  onChange: (form: ReimbursementForm) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!item) return null;

  return (
    <ModalShell title="Confirm Reimbursement" onClose={onClose}>
      <p className="text-sm font-bold leading-relaxed text-gray-600 dark:text-gray-300">
        Transfer RM{toMoney(item.amount)} from Omnyzo to your personal account.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Reimbursement date" type="date" value={form.reimbursementDate} onChange={(value) => onChange({ ...form, reimbursementDate: value })} />
        <TextField label="Bank reference" value={form.bankReference} onChange={(value) => onChange({ ...form, bankReference: value })} placeholder="Optional" />
      </div>
      <div className="mt-4">
        <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-500">Notes</label>
        <textarea
          value={form.notes}
          onChange={(event) => onChange({ ...form, notes: event.target.value })}
          className="min-h-24 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none transition-all focus:ring-2 focus:ring-gray-950 dark:border-gray-800 dark:bg-black dark:text-white"
        />
      </div>
      <ModalActions onClose={onClose} onSubmit={onSubmit} submitLabel={isSaving ? "Saving..." : "Mark as Reimbursed"} disabled={isSaving} />
    </ModalShell>
  );
}

export function ExpenseDetailsDrawer({
  item,
  reimbursementMeta,
  onClose,
  onRecordPayment,
  onMarkPaid,
  onReimburse,
  onDelete,
  onManageRecurring,
}: {
  item: PlannerExpenseItem | null;
  reimbursementMeta?: ReimbursementMeta;
  onClose: () => void;
  onRecordPayment: (item: PlannerExpenseItem) => void;
  onMarkPaid: (item: PlannerExpenseItem) => void;
  onReimburse: (item: PlannerExpenseItem) => void;
  onDelete: (item: PlannerExpenseItem) => void;
  onManageRecurring: () => void;
}) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm">
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-[#101010] md:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className={`mb-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${statusClass[item.statusTone]}`}>{item.status}</p>
            <h2 className="text-3xl font-black tracking-tight text-gray-950 dark:text-white">{item.name}</h2>
            <p className="mt-2 text-sm font-bold text-gray-500">{item.category} · RM {toMoney(item.amount)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:text-gray-950 dark:bg-gray-900 dark:hover:text-white"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-5">
          <DetailSection title="Expense information">
            <DetailRow label="Vendor" value={item.vendor} />
            <DetailRow label="Due date" value={new Date(item.dueDate).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" })} />
            <DetailRow label="Related project" value={item.relatedProject || "Not linked"} />
            <DetailRow label="Related invoice" value={item.relatedInvoice ? `${item.relatedInvoice.invoice_no} · ${item.relatedInvoice.client_name}` : "Not linked"} />
          </DetailSection>

          <DetailSection title="Payment information">
            <DetailRow label="Payment method" value={item.paymentMethod === "personal" ? "Paid Personally" : "Pay from Omnyzo"} />
            <DetailRow label="Status" value={item.status} />
            <DetailRow label="Payment Voucher number" value={item.voucherNo || "Created after payment"} />
          </DetailSection>

          <DetailSection title="Reimbursement information">
            <DetailRow label="Reimburse to" value={item.paymentMethod === "personal" ? DEFAULT_REIMBURSE_TO : "Not needed"} />
            <DetailRow label="Reimbursement date" value={reimbursementMeta?.reimbursementDate || "Not reimbursed yet"} />
            <DetailRow label="Bank reference" value={reimbursementMeta?.bankReference || "Not recorded"} />
            <DetailRow label="Notes" value={reimbursementMeta?.notes || "No notes"} />
          </DetailSection>

          <DetailSection title="Documents">
            <DocumentLink label="Receipt or supporting document" url={item.receiptUrl} />
            <DocumentLink label="Payment proof" url={item.paymentProofUrl} />
          </DetailSection>

          <DetailSection title="Activity history">
            <ul className="space-y-2 text-sm font-bold text-gray-600 dark:text-gray-300">
              <li>Expense planned for {new Date(item.dueDate).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" })}</li>
              {item.voucherNo && <li>Payment Voucher created in the background.</li>}
              {item.status === "Reimbursement Needed" && <li>Waiting for Omnyzo to reimburse personal spending.</li>}
              {item.status === "Reimbursed" && <li>Reimbursement completed.</li>}
            </ul>
          </DetailSection>
        </div>

        <div className="sticky bottom-0 mt-8 flex flex-col gap-3 border-t border-gray-200 bg-white/95 py-5 backdrop-blur dark:border-gray-800 dark:bg-[#101010]/95 sm:flex-row sm:justify-end">
          {item.source === "planned" && item.isRecurring && (
            <button type="button" onClick={onManageRecurring} className="rounded-full border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900">
              Edit recurring
            </button>
          )}
          <button type="button" onClick={() => onDelete(item)} className="rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20">
            Delete
          </button>
          {item.mainAction === "record-payment" && (
            <button type="button" onClick={() => onRecordPayment(item)} className="rounded-full bg-gray-950 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-black dark:bg-white dark:text-black">
              Record Payment
            </button>
          )}
          {item.mainAction === "mark-paid" && (
            <button type="button" onClick={() => onMarkPaid(item)} className="rounded-full bg-gray-950 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-black dark:bg-white dark:text-black">
              Mark Paid
            </button>
          )}
          {item.mainAction === "reimburse" && (
            <button type="button" onClick={() => onReimburse(item)} className="rounded-full bg-gray-950 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-black dark:bg-white dark:text-black">
              Reimburse
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[22px] border border-gray-200 bg-gray-50/70 p-5 dark:border-gray-800 dark:bg-black/30">
      <h3 className="mb-4 text-[11px] font-black uppercase tracking-widest text-gray-400">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="font-bold text-gray-500">{label}</span>
      <span className="max-w-[60%] text-right font-black text-gray-950 dark:text-white">{value}</span>
    </div>
  );
}

function DocumentLink({ label, url }: { label: string; url?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="font-bold text-gray-500">{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-black text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-300">
          Open
        </a>
      ) : (
        <span className="font-black text-gray-400">Not attached</span>
      )}
    </div>
  );
}

export function RecurringExpenseManager({
  isOpen,
  recurringPlans,
  onClose,
  onUpdate,
  onDelete,
}: {
  isOpen: boolean;
  recurringPlans: PlannedExpense[];
  onClose: () => void;
  onUpdate: (plan: PlannedExpense) => void;
  onDelete: (plan: PlannedExpense) => void;
}) {
  if (!isOpen) return null;

  return (
    <ModalShell title="Manage recurring expenses" onClose={onClose} maxWidth="max-w-3xl">
      {recurringPlans.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-5 text-sm font-bold text-gray-500 dark:bg-black/40">No recurring expenses yet.</p>
      ) : (
        <div className="space-y-3">
          {recurringPlans.map((plan) => (
            <div key={plan.id} className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-black/30 md:grid-cols-[1fr_130px_110px_auto] md:items-center">
              <div>
                <input
                  type="text"
                  value={plan.name}
                  onChange={(event) => onUpdate({ ...plan, name: event.target.value })}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-black text-gray-950 outline-none focus:ring-2 focus:ring-gray-950 dark:border-gray-800 dark:bg-black dark:text-white"
                />
                <p className="mt-1 text-xs font-bold text-gray-500">{plan.vendor || "Vendor not set"}</p>
              </div>
              <input
                type="number"
                value={plan.amount}
                onChange={(event) => onUpdate({ ...plan, amount: Number(event.target.value) || 0 })}
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-black text-gray-950 outline-none focus:ring-2 focus:ring-gray-950 dark:border-gray-800 dark:bg-black dark:text-white"
              />
              <input
                type="number"
                min="1"
                max="31"
                value={plan.repeatDay || 1}
                onChange={(event) => onUpdate({ ...plan, repeatDay: Number(event.target.value) || 1 })}
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-black text-gray-950 outline-none focus:ring-2 focus:ring-gray-950 dark:border-gray-800 dark:bg-black dark:text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onUpdate({ ...plan, active: !plan.active })}
                  className={`h-10 rounded-xl px-3 text-[10px] font-black uppercase tracking-widest ${plan.active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}
                >
                  {plan.active ? "Active" : "Off"}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(plan)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                  aria-label="Delete recurring expense"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m3 0V5a2 2 0 012-2h0a2 2 0 012 2v2" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
  maxWidth = "max-w-lg",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-[28px] border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-[#101010]`}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:text-gray-950 dark:bg-gray-900 dark:hover:text-white"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onClose,
  onSubmit,
  submitLabel,
  disabled,
}: {
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
      <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-bold text-gray-500 transition-colors hover:text-gray-950 dark:hover:text-white">
        Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="rounded-full bg-gray-950 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-black/10 transition-all hover:bg-black active:scale-95 disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {submitLabel}
      </button>
    </div>
  );
}
