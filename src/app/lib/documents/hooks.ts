import { supabase } from "../supabase";
import { CONTACT_SELECT_COLUMNS } from "../utils";
import type { Contact, DocumentType } from "../types";

/** Loads every contact, ordered the same way every existing form does. */
export async function fetchContacts(): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select(CONTACT_SELECT_COLUMNS)
    .order("name", { ascending: true })
    .order("pic_name", { ascending: true });

  if (error) throw error;
  return (data || []) as Contact[];
}

/**
 * Generates the next doc_no for a document type on a given issue date:
 * `{YYYYMMDD}-{PREFIX}{NN}`. Mirrors the invoice_no/quote_no auto-increment
 * pattern already used by InvoiceForm.tsx and new-quotation/page.tsx, scoped
 * to the shared `documents` table via `document_type` + a LIKE on the prefix.
 */
export async function generateNextDocNo(documentType: DocumentType, prefixCode: string, issueDateInput: string) {
  const dateParts = issueDateInput.split("-");
  if (dateParts.length !== 3) return `${prefixCode}01`;
  const dateStr = `${dateParts[0]}${dateParts[1]}${dateParts[2]}`;
  const prefix = `${dateStr}-${prefixCode}`;

  const { data } = await supabase
    .from("documents")
    .select("doc_no")
    .eq("document_type", documentType)
    .like("doc_no", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastDocNo = data && data.length > 0 ? data[0].doc_no : null;
  if (lastDocNo) {
    const lastNum = parseInt(lastDocNo.slice(prefix.length), 10);
    return `${prefix}${String(Number.isNaN(lastNum) ? 1 : lastNum + 1).padStart(2, "0")}`;
  }
  return `${prefix}01`;
}
