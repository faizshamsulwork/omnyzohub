"use client";

import { supabase } from "../lib/supabase";
import { useState } from "react";
import { toast } from "sonner";

export default function ExpenseAction({ expense, onUpdate }: { expense: any, onUpdate: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const isPaid = expense.status === 'Paid';

  // FUNGSI TOGGLE STATUS
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
      onUpdate(); // Refresh jadual
    } else {
      toast.error(`Error: ${error.message}`, { id: toastId });
    }
    setIsProcessing(false);
  };

  // FUNGSI DELETE
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
      onUpdate(); // Refresh jadual
    } else {
      toast.error(`Error: ${error.message}`, { id: toastId });
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      
      {/* BUTANG TOGGLE STATUS */}
      <button
        onClick={toggleStatus}
        disabled={isProcessing}
        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${isPaid ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'}`}
        title={isPaid ? "Mark as Outstanding" : "Mark as Paid"}
      >
        {isProcessing ? "..." : isPaid ? "Mark Unpaid" : "Mark Paid"}
      </button>

      {/* BUTANG DELETE */}
      <button
        onClick={deleteExpense}
        disabled={isProcessing}
        className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-90 disabled:opacity-50"
        title="Delete Expense"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
      
    </div>
  );
}