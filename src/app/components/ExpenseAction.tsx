"use client";

import { supabase } from "../lib/supabase";
import { useState } from "react";
import { toast } from "sonner";
import type { Expense } from "../lib/types";
import { isPaidStatus, parseExpenseDescription } from "../lib/utils";

export default function ExpenseAction({ expense, onUpdate }: { expense: Expense, onUpdate: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const isPaid = isPaidStatus(expense.status);
  const isReimbursement = parseExpenseDescription(expense.description).paidPersonally;

  const toggleStatus = async () => {
    setIsProcessing(true);
    const newStatus = isPaid ? 'Outstanding' : 'Paid';
    const toastId = toast.loading(`Marking as ${newStatus}...`);

    const { error } = await supabase
      .from("expenses")
      .update({ status: newStatus })
      .eq("id", expense.id);

    if (!error) {
      toast.success(`Expense marked as ${newStatus}!`, { id: toastId });
      onUpdate();
    } else {
      toast.error(`Error: ${error.message}`, { id: toastId });
    }
    setIsProcessing(false);
  };

  const deleteExpense = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this expense record?");
    if (!confirmDelete) return;

    setIsProcessing(true);
    const toastId = toast.loading("Deleting record...");
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expense.id);

    if (!error) {
      toast.success("Record deleted.", { id: toastId });
      onUpdate();
    } else {
      toast.error(`Error: ${error.message}`, { id: toastId });
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={toggleStatus}
        disabled={isProcessing}
        className={`h-9 whitespace-nowrap rounded-full px-4 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${isPaid ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'}`}
        title={isPaid ? (isReimbursement ? "Mark reimbursement as pending" : "Mark as Outstanding") : (isReimbursement ? "Mark as reimbursed" : "Mark as Paid")}
      >
        {isProcessing ? "..." : isPaid ? (isReimbursement ? "Mark Pending" : "Mark Unpaid") : (isReimbursement ? "Mark Reimbursed" : "Mark Paid")}
      </button>

      <button
        onClick={deleteExpense}
        disabled={isProcessing}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-90 disabled:opacity-50 dark:hover:bg-red-900/20"
        title="Delete Expense"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
