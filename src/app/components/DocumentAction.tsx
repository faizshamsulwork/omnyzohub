"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { getDocumentTypeMeta } from "../lib/documents/types";
import type { AgencyDocument } from "../lib/types";
import { getErrorMessage } from "../lib/utils";

export default function DocumentAction({
  document: doc,
  onChanged,
}: {
  document: AgencyDocument;
  onChanged?: () => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const meta = getDocumentTypeMeta(doc.document_type);

  const deleteDocument = async () => {
    if (!window.confirm(`Delete ${doc.doc_no}? This cannot be undone.`)) return;

    setIsProcessing(true);
    const loadingToast = toast.loading("Deleting document...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;

      await supabase.from("audit_logs").insert([{
        action: "DELETE_DOCUMENT",
        details: `Deleted ${doc.doc_no} (${meta?.label || doc.document_type}, Counterparty: ${doc.counterparty_name})`,
        performed_by: userEmail || "unknown",
      }]);

      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;

      toast.success("Document deleted.", { id: loadingToast });
      onChanged?.();
    } catch (error: unknown) {
      toast.error(`Error: ${getErrorMessage(error)}`, { id: loadingToast });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/documents/${doc.id}`}
        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all active:scale-90"
        title="View"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      </Link>

      {meta?.built && (
        <>
          <Link
            href={`/documents/${doc.id}/edit`}
            className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all active:scale-90"
            title="Edit"
            aria-label="Edit document"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 14v4.75A2.25 2.25 0 0115.75 21h-10.5A2.25 2.25 0 013 18.75v-10.5A2.25 2.25 0 015.25 6H10" /></svg>
          </Link>

          <Link
            href={`/documents/new/${doc.document_type}?duplicate=${doc.id}`}
            className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all active:scale-90"
            title="Duplicate"
            aria-label="Duplicate document"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M8 8h10a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z" /></svg>
          </Link>
        </>
      )}

      <button
        onClick={deleteDocument}
        disabled={isProcessing}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-90 disabled:opacity-50"
        title="Delete"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  );
}
