"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { COMPANY_PROFILE } from "../lib/company";
import {
  addDaysToDateInput,
  buildContactAddress,
  buildExpenseDescription,
  CONTACT_SELECT_COLUMNS,
  formatContactOptionLabel,
  formatDateInputInMalaysia,
  formatCurrency,
  getDateOnlyFromStorage,
  getErrorMessage,
  isValidDateOnly,
  isPaidStatus,
} from "../lib/utils";
import type { Contact, Invoice, LineItem } from "../lib/types";

const invoiceTemplates = {
  standard: `1. Unless specified, Agency Fee is payable within 30 days from invoice date.\n2. The Agency reserves the right to suspend any Services in the event of delay in payment.\n3. Please indicate the invoice number as reference when transferring the funds.\n4. Payment advice should be sent to ${COMPANY_PROFILE.billingEmail}.`,
  immediate: `1. Payment is due immediately upon receipt of this invoice.\n2. Please indicate the invoice number as reference when transferring the funds.\n3. Payment advice should be sent to ${COMPANY_PROFILE.billingEmail}.`,
  milestone: "1. This invoice represents a milestone payment (e.g. 50% Deposit) as agreed in the Quotation.\n2. Work will commence upon clearance of this payment.\n3. Please indicate the invoice number as reference when transferring the funds.",
  voucher: "1. Payment to be transferred to the provided bank account.\n2. Please verify work completion before release of payment.",
};

type InvoiceFormMode = "create" | "edit";

type InvoiceFormProps = {
  mode: InvoiceFormMode;
  invoiceId?: string;
};

type InvoiceFormData = {
  client_name: string;
  client_pic: string;
  client_phone: string;
  client_email: string;
  client_address: string;
  invoice_no: string;
  invoice_date: string;
  due_date: string;
  status: string;
  credit_term: string;
  description: string;
  notes: string;
  terms: string;
};

type FieldErrors = Partial<Record<keyof InvoiceFormData | "items" | "discount", string>>;

type EditableLineItem = Omit<LineItem, "qty" | "price" | "taxRate" | "total"> & {
  qty: string;
  price: string;
  taxRate: string;
  total: number;
};

const UNSAVED_MESSAGE = "You have unsaved changes. Leave without saving?";

const defaultFormData = (): InvoiceFormData => {
  const todayStr = formatDateInputInMalaysia();

  return {
    client_name: "",
    client_pic: "",
    client_phone: "",
    client_email: "",
    client_address: "",
    invoice_no: "Generating...",
    invoice_date: todayStr,
    due_date: addDaysToDateInput(todayStr, 14),
    status: "outstanding",
    credit_term: "14",
    description: "Creative Services",
    notes: "",
    terms: invoiceTemplates.standard,
  };
};

const defaultItems = (): EditableLineItem[] => [
  { id: Date.now(), type: "item", description: "", qty: "1", price: "0", taxRate: "0", total: 0 },
];

const toDateInput = (value?: string | null) => {
  return getDateOnlyFromStorage(value);
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isCompleteNumberInput = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed === "." || trimmed === "-.") return false;

  return Number.isFinite(Number(trimmed));
};

const recalculateItem = (item: EditableLineItem): EditableLineItem => {
  if (item.type === "title") {
    return { ...item, qty: "0", price: "0", taxRate: "0", total: 0 };
  }

  const qty = isCompleteNumberInput(item.qty) ? toNumber(item.qty) : 0;
  const price = isCompleteNumberInput(item.price) ? toNumber(item.price) : 0;

  return {
    ...item,
    total: qty * price,
  };
};

const toEditableItem = (item: LineItem): EditableLineItem => ({
  id: item.id,
  type: item.type,
  description: item.description,
  qty: String(item.qty),
  price: String(item.price),
  taxRate: String(item.taxRate),
  total: item.total,
});

const serialiseItem = (item: EditableLineItem): LineItem => {
  const subtotal = item.type === "item" ? toNumber(item.qty) * toNumber(item.price) : 0;

  return {
    id: item.id,
    type: item.type,
    description: item.description,
    qty: item.type === "item" ? toNumber(item.qty) : 0,
    price: item.type === "item" ? toNumber(item.price) : 0,
    taxRate: item.type === "item" ? toNumber(item.taxRate) : 0,
    total: subtotal,
  };
};

const serialiseItems = (items: EditableLineItem[]) => items.map((item) => serialiseItem(recalculateItem(item)));

const getLineAmountWithTax = (item: EditableLineItem | LineItem) => {
  const subtotal = toNumber(item.total);
  return subtotal + (subtotal * (toNumber(item.taxRate) / 100));
};

const normaliseItems = (items?: LineItem[] | null, fallbackDescription = "Creative Services", fallbackAmount: unknown = 0) => {
  if (Array.isArray(items) && items.length > 0) {
    return items.map((item, index) => recalculateItem(toEditableItem({
      id: typeof item.id === "number" ? item.id : Date.now() + index,
      type: item.type === "title" ? "title" : "item",
      description: item.description || "",
      qty: item.type === "title" ? 0 : toNumber(item.qty || 1),
      price: item.type === "title" ? 0 : toNumber(item.price),
      taxRate: item.type === "title" ? 0 : toNumber(item.taxRate),
      total: toNumber(item.total),
    })));
  }

  return [{
    id: Date.now(),
    type: "item" as const,
    description: fallbackDescription || "Creative Services",
    qty: "1",
    price: String(toNumber(fallbackAmount)),
    taxRate: "0",
    total: toNumber(fallbackAmount),
  }];
};

const createSnapshot = ({
  formData,
  items,
  discount,
  contactTypeFilter,
}: {
  formData: InvoiceFormData;
  items: EditableLineItem[];
  discount: number;
  contactTypeFilter: string;
}) => JSON.stringify({
  formData,
  items: serialiseItems(items),
  discount,
  contactTypeFilter,
});

function GripIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <circle cx="7" cy="5" r="1.4" />
      <circle cx="13" cy="5" r="1.4" />
      <circle cx="7" cy="10" r="1.4" />
      <circle cx="13" cy="10" r="1.4" />
      <circle cx="7" cy="15" r="1.4" />
      <circle cx="13" cy="15" r="1.4" />
    </svg>
  );
}

function LineItemEditorRow({
  item,
  index,
  itemsCount,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
  onEnterKey,
}: {
  item: EditableLineItem;
  index: number;
  itemsCount: number;
  onChange: (index: number, field: keyof Pick<EditableLineItem, "description" | "qty" | "price" | "taxRate">, value: string) => void;
  onRemove: (id: number) => void;
  onDuplicate: (id: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onEnterKey: (event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
}) {
  const dragControls = useDragControls();
  const isTitle = item.type === "title";

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      layout
      className={`list-none rounded-2xl border transition-shadow ${
        isTitle
          ? "border-blue-100 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-900/10"
          : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-[#0A0A0A]"
      }`}
    >
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
        <div className="flex items-center justify-between gap-3 md:w-24 md:flex-col md:items-start">
          <button
            type="button"
            onPointerDown={(event) => dragControls.start(event)}
            className="flex h-10 w-10 touch-none items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-all hover:border-blue-300 hover:text-blue-500 active:scale-95 dark:border-gray-700 dark:bg-black"
            aria-label={`Drag line item ${index + 1}`}
            title="Drag to reorder"
          >
            <GripIcon />
          </button>
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:bg-black">
            #{index + 1}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onMove(index, -1)}
              disabled={index === 0}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-900 disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Move item up"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
            </button>
            <button
              type="button"
              onClick={() => onMove(index, 1)}
              disabled={index === itemsCount - 1}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-900 disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Move item down"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
        </div>

        {isTitle ? (
          <div className="min-w-0 flex-1">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">Section title</label>
            <textarea
              placeholder="Section Title"
              required
              rows={1}
              ref={(el) => {
                if (!el) return;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              className="w-full resize-none overflow-hidden rounded-xl border border-blue-100 bg-white/70 p-3 text-sm font-bold text-blue-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-900/50 dark:bg-black/30 dark:text-blue-300"
              value={item.description}
              onChange={(event) => {
                onChange(index, "description", event.target.value);
                event.target.style.height = "auto";
                event.target.style.height = `${event.target.scrollHeight}px`;
              }}
              onKeyDown={onEnterKey}
            />
          </div>
        ) : (
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_70px_110px_80px_120px] md:items-start">
            <div className="min-w-0">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Description</label>
              <textarea
                placeholder="- Item description&#10;- Support bullet points"
                required
                rows={2}
                ref={(el) => {
                  if (!el) return;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
                className="w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-black dark:text-white"
                value={item.description}
                onChange={(event) => {
                  onChange(index, "description", event.target.value);
                  event.target.style.height = "auto";
                  event.target.style.height = `${event.target.scrollHeight}px`;
                }}
                onKeyDown={onEnterKey}
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Qty</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-black dark:text-white md:text-center"
                value={item.qty}
                onChange={(event) => onChange(index, "qty", event.target.value)}
                onKeyDown={onEnterKey}
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Price</label>
              <input
                type="text"
                required
                inputMode="decimal"
                step="0.01"
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-black dark:text-white md:text-right"
                value={item.price}
                onChange={(event) => onChange(index, "price", event.target.value)}
                onKeyDown={onEnterKey}
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Tax</label>
              <select
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white p-3 text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-black dark:text-white"
                value={item.taxRate}
                onChange={(event) => onChange(index, "taxRate", event.target.value)}
              >
                <option value="0">0%</option>
                <option value="6">6%</option>
                <option value="8">8%</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</label>
              <div className="rounded-xl border border-transparent p-3 text-left text-sm font-black text-gray-900 dark:text-white md:text-right">
                {formatCurrency(getLineAmountWithTax(item))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 md:w-20 md:flex-col">
          {!isTitle && (
            <button
              type="button"
              onClick={() => onDuplicate(item.id)}
              className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white hover:text-blue-500 dark:hover:bg-gray-800"
              title="Duplicate item"
              aria-label="Duplicate item"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M8 8h10a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z" /></svg>
            </button>
          )}
          {itemsCount > 1 && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              title="Remove item"
              aria-label="Remove item"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
}

export default function InvoiceForm({ mode, invoiceId }: InvoiceFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = mode === "edit";
  const duplicateId = searchParams.get("duplicate");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(isEditMode);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactTypeFilter, setContactTypeFilter] = useState("Customer");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [formData, setFormData] = useState<InvoiceFormData>(() => defaultFormData());
  const [items, setItems] = useState<EditableLineItem[]>(() => defaultItems());
  const [discount, setDiscount] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [existingInvoice, setExistingInvoice] = useState<Invoice | null>(null);
  const [duplicateSourceNo, setDuplicateSourceNo] = useState<string | null>(null);
  const [saveComplete, setSaveComplete] = useState(false);
  const beforeUnloadArmedRef = useRef(false);

  const handleClientSelect = useCallback((contactId: string, contactList: Contact[]) => {
    setSelectedContactId(contactId);

    const client = contactList.find((contact) => contact.id === contactId);
    if (client) {
      setFormData((prev) => ({
        ...prev,
        client_name: client.name,
        client_pic: client.pic_name || "",
        client_phone: client.phone || "",
        client_email: client.email || "",
        client_address: buildContactAddress(client),
      }));
    } else if (!isEditMode) {
      setFormData((prev) => ({ ...prev, client_name: "", client_pic: "", client_phone: "", client_email: "", client_address: "" }));
    }
  }, [isEditMode]);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsInitialLoading(true);

      const { data: contactData, error: contactError } = await supabase
        .from("contacts")
        .select(CONTACT_SELECT_COLUMNS)
        .order("name", { ascending: true })
        .order("pic_name", { ascending: true });

      if (contactError) {
        toast.error(`Unable to load contacts: ${getErrorMessage(contactError)}`);
        setIsInitialLoading(false);
        return;
      }

      const typedContacts = (contactData || []) as Contact[];
      setContacts(typedContacts);

      if (isEditMode) {
        if (!invoiceId) {
          setGeneralError("Missing invoice ID.");
          setIsInitialLoading(false);
          return;
        }

        const { data: invoiceData, error: invoiceError } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", invoiceId)
          .single();

        if (invoiceError || !invoiceData) {
          setGeneralError(invoiceError?.message || "Invoice not found.");
          setIsInitialLoading(false);
          return;
        }

        const invoice = invoiceData as Invoice;
        const loadedItems = normaliseItems(invoice.items, invoice.description || "Creative Services", invoice.amount);
        const loadedFormData: InvoiceFormData = {
          client_name: invoice.client_name || "",
          client_pic: invoice.client_pic || "",
          client_phone: invoice.client_phone || "",
          client_email: invoice.client_email || "",
          client_address: invoice.client_address || "",
          invoice_no: invoice.invoice_no || "",
          invoice_date: toDateInput(invoice.created_at) || formatDateInputInMalaysia(),
          due_date: toDateInput(invoice.due_date) || "",
          status: invoice.status || "outstanding",
          credit_term: "14",
          description: invoice.description || "Creative Services",
          notes: invoice.notes || "",
          terms: invoice.terms || invoiceTemplates.standard,
        };
        const matchedContact = typedContacts.find((contact) => (
          contact.name === loadedFormData.client_name
          && (!loadedFormData.client_email || contact.email === loadedFormData.client_email)
          && (!loadedFormData.client_pic || contact.pic_name === loadedFormData.client_pic)
        ));

        setExistingInvoice(invoice);
        setContactTypeFilter("Customer");
        setSelectedContactId(matchedContact?.id || "");
        setFormData(loadedFormData);
        setItems(loadedItems);
        setDiscount(toNumber(invoice.discount));
        setInitialSnapshot(createSnapshot({
          formData: loadedFormData,
          items: loadedItems,
          discount: toNumber(invoice.discount),
          contactTypeFilter: "Customer",
        }));
      } else if (duplicateId) {
        const { data: sourceData, error: sourceError } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", duplicateId)
          .single();

        if (sourceError || !sourceData) {
          toast.error("Could not load the invoice to duplicate. Starting a blank invoice instead.");
          const defaultContact = typedContacts.find((contact) => contact.contact_type === "Customer");
          if (defaultContact) handleClientSelect(defaultContact.id, typedContacts);
        } else {
          const source = sourceData as Invoice;
          const loadedItems = normaliseItems(source.items, source.description || "Creative Services", source.amount);
          const sourceIssueDate = toDateInput(source.created_at);
          const sourceDueDate = toDateInput(source.due_date);
          const creditTermDays = sourceIssueDate && sourceDueDate
            ? Math.round((new Date(sourceDueDate).getTime() - new Date(sourceIssueDate).getTime()) / (24 * 60 * 60 * 1000))
            : NaN;
          const matchedContact = typedContacts.find((contact) => (
            contact.name === source.client_name
            && (!source.client_email || contact.email === source.client_email)
            && (!source.client_pic || contact.pic_name === source.client_pic)
          ));

          setFormData((prev) => ({
            ...prev,
            client_name: source.client_name || "",
            client_pic: source.client_pic || "",
            client_phone: source.client_phone || "",
            client_email: source.client_email || "",
            client_address: source.client_address || "",
            credit_term: Number.isFinite(creditTermDays) && creditTermDays > 0 ? String(creditTermDays) : prev.credit_term,
            description: source.description || "Creative Services",
            notes: source.notes || "",
            terms: source.terms || prev.terms,
          }));
          setContactTypeFilter("Customer");
          setSelectedContactId(matchedContact?.id || "");
          setItems(loadedItems);
          setDiscount(toNumber(source.discount));
          setDuplicateSourceNo(source.invoice_no || null);
        }
      } else {
        const defaultContact = typedContacts.find((contact) => contact.contact_type === "Customer");
        if (defaultContact) handleClientSelect(defaultContact.id, typedContacts);
      }

      setIsInitialLoading(false);
    };

    void loadInitialData();
  }, [handleClientSelect, invoiceId, isEditMode, duplicateId]);

  useEffect(() => {
    if (isEditMode) return;

    const generateSequenceNumber = async () => {
      if (!formData.invoice_date) return;

      setFormData((prev) => ({ ...prev, invoice_no: "Generating..." }));
      const dateParts = formData.invoice_date.split("-");
      if (dateParts.length !== 3) return;
      const dateStr = `${dateParts[0]}${dateParts[1]}${dateParts[2]}`;

      if (contactTypeFilter === "Customer") {
        const prefix = `${dateStr}-SV`;
        const { data: lastInvoice } = await supabase
          .from("invoices")
          .select("invoice_no")
          .like("invoice_no", `${prefix}%`)
          .order("created_at", { ascending: false })
          .limit(1);

        if (lastInvoice && lastInvoice.length > 0 && lastInvoice[0].invoice_no) {
          const lastNum = parseInt(lastInvoice[0].invoice_no.split("-SV")[1]);
          setFormData((prev) => ({ ...prev, invoice_no: `${prefix}${String(isNaN(lastNum) ? 1 : lastNum + 1).padStart(2, "0")}`, terms: invoiceTemplates.standard }));
        } else {
          setFormData((prev) => ({ ...prev, invoice_no: `${prefix}01`, terms: invoiceTemplates.standard }));
        }
      } else {
        const prefix = `${dateStr}-PV`;
        const { data: lastPV } = await supabase
          .from("expenses")
          .select("description")
          .like("description", `[${prefix}%`)
          .order("created_at", { ascending: false });

        let nextNum = 1;
        if (lastPV && lastPV.length > 0) {
          const maxPV = lastPV.reduce((max, curr) => {
            const match = curr.description.match(/-PV(\d+)]/);
            if (!match) return max;
            const num = parseInt(match[1]);
            return num > max ? num : max;
          }, 0);
          nextNum = maxPV + 1;
        }
        setFormData((prev) => ({ ...prev, invoice_no: `${prefix}${String(nextNum).padStart(2, "0")}`, terms: invoiceTemplates.voucher }));
      }
    };

    void generateSequenceNumber();
  }, [contactTypeFilter, formData.invoice_date, isEditMode]);

  const subtotal = useMemo(() => items.filter((item) => item.type === "item").reduce((sum, item) => sum + toNumber(item.total), 0), [items]);
  const totalTaxAmount = useMemo(() => items.filter((item) => item.type === "item").reduce((sum, item) => sum + (toNumber(item.total) * (toNumber(item.taxRate) / 100)), 0), [items]);
  const grandTotal = useMemo(() => (subtotal - toNumber(discount)) + totalTaxAmount, [discount, subtotal, totalTaxAmount]);
  const recordedPaidAmount = useMemo(() => {
    if (!existingInvoice) return 0;
    const paidAmount = toNumber(existingInvoice.amount_paid);
    if (paidAmount > 0) return paidAmount;
    return isPaidStatus(existingInvoice.status) ? toNumber(existingInvoice.amount) : 0;
  }, [existingInvoice]);
  const hasRecordedPayments = isEditMode && recordedPaidAmount > 0;
  const currentSnapshot = useMemo(() => createSnapshot({ formData, items, discount, contactTypeFilter }), [contactTypeFilter, discount, formData, items]);
  const hasUnsavedChanges = isEditMode && Boolean(initialSnapshot) && currentSnapshot !== initialSnapshot && !saveComplete;
  const filteredContacts = contacts.filter((contact) => contact.contact_type === contactTypeFilter);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      beforeUnloadArmedRef.current = false;
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = UNSAVED_MESSAGE;
    };

    const handlePopState = () => {
      if (!window.confirm(UNSAVED_MESSAGE)) {
        window.history.pushState(null, "", window.location.href);
      }
    };

    if (!beforeUnloadArmedRef.current) {
      window.history.pushState(null, "", window.location.href);
      beforeUnloadArmedRef.current = true;
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasUnsavedChanges]);

  const handleContactTypeChange = (nextType: string) => {
    if (isEditMode) return;
    setContactTypeFilter(nextType);
    const nextContacts = contacts.filter((contact) => contact.contact_type === nextType);
    handleClientSelect(nextContacts[0]?.id || "", contacts);
  };

  const setField = (field: keyof InvoiceFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setGeneralError("");
  };

  const handleItemChange = (index: number, field: keyof Pick<EditableLineItem, "description" | "qty" | "price" | "taxRate">, value: string) => {
    setItems((currentItems) => {
      const nextItems = [...currentItems];
      nextItems[index] = recalculateItem({ ...nextItems[index], [field]: value });
      return nextItems;
    });
    setFieldErrors((prev) => ({ ...prev, items: undefined }));
  };

  const addItem = () => setItems((currentItems) => [...currentItems, { id: Date.now(), type: "item", description: "", qty: "1", price: "0", taxRate: "0", total: 0 }]);
  const addTitle = () => setItems((currentItems) => [...currentItems, { id: Date.now(), type: "title", description: "", qty: "0", price: "0", taxRate: "0", total: 0 }]);
  const removeItem = (id: number) => setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  const duplicateItem = (id: number) => setItems((currentItems) => {
    const index = currentItems.findIndex((item) => item.id === id);
    if (index === -1) return currentItems;
    const duplicate = { ...currentItems[index], id: Date.now() };
    const nextItems = [...currentItems];
    nextItems.splice(index + 1, 0, duplicate);
    return nextItems;
  });
  const moveItem = (index: number, direction: -1 | 1) => setItems((currentItems) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= currentItems.length) return currentItems;
    const nextItems = [...currentItems];
    const [movedItem] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, movedItem);
    return nextItems;
  });

  const handleEnterKey = (event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      addItem();
    }
  };

  const validateStep = (targetStep = step) => {
    const nextErrors: FieldErrors = {};

    if (targetStep >= 1) {
      if (!formData.client_name.trim()) nextErrors.client_name = "Client name is required.";
      if (!formData.invoice_no.trim()) nextErrors.invoice_no = "Invoice number is required.";
      if (!isValidDateOnly(formData.invoice_date)) nextErrors.invoice_date = "Issue date must be a valid date in YYYY-MM-DD format.";
      if (isEditMode && !isValidDateOnly(formData.due_date)) nextErrors.due_date = "Due date must be a valid date in YYYY-MM-DD format.";
    }

    if (targetStep >= 2) {
      if (toNumber(discount) < 0) nextErrors.discount = "Discount cannot be negative.";
      if (!items.some((item) => item.type === "item")) nextErrors.items = "At least one chargeable item is required.";
      const invalidItem = items.find((item) => (
        !item.description.trim()
        || (item.type === "item" && (
          !isCompleteNumberInput(item.qty)
          || toNumber(item.qty) <= 0
          || !isCompleteNumberInput(item.price)
          || !isCompleteNumberInput(item.taxRate)
          || toNumber(item.taxRate) < 0
        ))
      ));
      if (invalidItem) nextErrors.items = "Every item needs a description, valid quantity, numeric price, and valid tax rate.";
      if (grandTotal < 0) nextErrors.items = "Invoice total cannot be negative. Use a credit note workflow for a net credit.";
    }

    if (targetStep >= 3) {
      if (!formData.terms.trim()) nextErrors.terms = "Terms are required.";
      if (isEditMode && hasRecordedPayments && grandTotal < recordedPaidAmount) {
        nextErrors.items = "The revised invoice total cannot be lower than the amount already paid.";
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    setStep((currentStep) => currentStep + 1);
  };
  const prevStep = () => setStep((currentStep) => currentStep - 1);

  const handleCancel = () => {
    if (hasUnsavedChanges && !window.confirm(UNSAVED_MESSAGE)) return;
    router.push(isEditMode && invoiceId ? `/invoice/${invoiceId}` : "/invoices");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step !== 3) return;
    if (!validateStep(3)) return;

    setLoading(true);
    setGeneralError("");
    const docName = contactTypeFilter === "Customer" ? "invoice" : "payment voucher";
    const loadingToast = toast.loading(isEditMode ? "Saving invoice changes..." : `Saving ${docName}...`);
    const itemsForSave = serialiseItems(items);

    if (isEditMode) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("No active session.");

        const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceId || "")}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            invoiceNumber: formData.invoice_no,
            invoiceDate: formData.invoice_date,
            dueDate: formData.due_date,
            clientName: formData.client_name,
            clientPic: formData.client_pic,
            clientPhone: formData.client_phone,
            clientEmail: formData.client_email,
            clientAddress: formData.client_address,
            description: formData.description,
            items: itemsForSave,
            discount,
            notes: formData.notes,
            terms: formData.terms,
          }),
        });

        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as { error?: string; fieldErrors?: FieldErrors } | null;
          const message = result?.error || "Unable to update invoice.";
          if (result?.fieldErrors) setFieldErrors(result.fieldErrors);
          setGeneralError(message);
          toast.error(message, { id: loadingToast });
          setLoading(false);
          return;
        }

        toast.success("Invoice updated successfully.", { id: loadingToast });
        setSaveComplete(true);
        router.push(`/invoice/${invoiceId}`);
        router.refresh();
      } catch (error) {
        const message = getErrorMessage(error);
        setGeneralError(message);
        toast.error(`System Error: ${message}`, { id: loadingToast });
        setLoading(false);
      }
      return;
    }

    if (contactTypeFilter === "Customer") {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("No active session.");

        const response = await fetch("/api/invoices", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            invoiceNumber: formData.invoice_no,
            invoiceDate: formData.invoice_date,
            dueDate: addDaysToDateInput(formData.invoice_date, Number(formData.credit_term)),
            clientName: formData.client_name,
            clientPic: formData.client_pic,
            clientPhone: formData.client_phone,
            clientEmail: formData.client_email,
            clientAddress: formData.client_address,
            description: formData.description,
            items: itemsForSave,
            discount,
            status: formData.status,
            notes: formData.notes,
            terms: formData.terms,
          }),
        });

        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as { error?: string; fieldErrors?: FieldErrors } | null;
          const message = result?.error || "Unable to create invoice.";
          if (result?.fieldErrors) setFieldErrors(result.fieldErrors);
          setGeneralError(message);
          toast.error(message, { id: loadingToast });
          setLoading(false);
          return;
        }

        toast.success(`Invoice ${formData.invoice_no} saved successfully.`, { id: loadingToast });
        router.push("/invoices");
        router.refresh();
      } catch (error) {
        const message = getErrorMessage(error);
        setGeneralError(message);
        toast.error(`System Error: ${message}`, { id: loadingToast });
        setLoading(false);
      }
      return;
    } else {
      const descText = buildExpenseDescription({
        voucherNo: formData.invoice_no,
        payeeName: formData.client_name,
        itemDesc: itemsForSave.find((item) => item.type === "item")?.description || "Freelance Services",
      });
      const { error } = await supabase.from("expenses").insert([{
        description: descText,
        amount: grandTotal,
        category: "Professional Fees (Vendors) *",
        date: formData.invoice_date,
        status: formData.status === "paid" ? "Paid" : "Outstanding",
      }]);

      if (!error) {
        toast.success(`Payment Voucher ${formData.invoice_no} recorded as Expense!`, { id: loadingToast });
        router.push("/expenses");
        router.refresh();
      } else {
        toast.error(`Error saving expense: ${error.message}`, { id: loadingToast });
        setLoading(false);
      }
    }
  };

  if (isInitialLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading invoice editor...</div>;
  }

  const accentClass = contactTypeFilter === "Customer" ? "blue" : "purple";

  return (
    <div className="min-h-screen p-8 md:p-12 selection:bg-blue-200 relative z-10 transition-colors duration-500 pb-32 md:pb-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              type="button"
              onClick={handleCancel}
              className="mb-2 inline-flex text-sm font-medium text-gray-500 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
            >
              &larr; {isEditMode ? "Back to Invoice" : "Back to Invoices"}
            </button>
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white">
              {isEditMode ? "Edit Invoice" : contactTypeFilter === "Customer" ? "New Invoice" : "Payment Voucher"}
            </h1>
            {isEditMode && existingInvoice && (
              <p className="mt-2 text-sm font-bold text-gray-500">
                Editing {existingInvoice.invoice_no}
              </p>
            )}
            {!isEditMode && duplicateSourceNo && (
              <p className="mt-2 text-sm font-bold text-gray-500">
                Duplicated from {duplicateSourceNo}. Review the details and amounts before saving.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${step === num ? (contactTypeFilter === "Customer" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-purple-600 text-white shadow-lg shadow-purple-500/30") : step > num ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-black" : "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600"}`}>{step > num ? "✓" : num}</div>
                {num < 3 && <div className={`h-1 w-10 rounded-full ${step > num ? "bg-gray-800 dark:bg-gray-200" : "bg-gray-200 dark:bg-gray-800"}`} />}
              </div>
            ))}
          </div>
        </header>

        {generalError && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {generalError}
          </div>
        )}

        {hasRecordedPayments && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
            This invoice has recorded payments. Changing its amount may affect the outstanding balance and payment status.
            <span className="mt-1 block text-xs font-medium">Recorded paid amount: {formatCurrency(recordedPaidAmount)}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-[32px] border border-gray-200 bg-white/90 p-8 shadow-2xl backdrop-blur-xl transition-colors duration-500 dark:border-gray-800 dark:bg-[#111111]/90 dark:shadow-gray-950/50 md:p-10">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="border-b border-gray-100 pb-4 text-xl font-bold text-gray-900 dark:border-gray-800 dark:text-white">
                {isEditMode ? "Invoice Details" : contactTypeFilter === "Customer" ? "Invoice Details" : "Payment Details"}
              </h2>

              {!isEditMode && (
                <div className="inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-[#0A0A0A] md:w-auto">
                  <button type="button" onClick={() => handleContactTypeChange("Customer")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-all md:w-40 ${contactTypeFilter === "Customer" ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>Billed to Customer</button>
                  <button type="button" onClick={() => handleContactTypeChange("Freelancer")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-all md:w-40 ${contactTypeFilter === "Freelancer" ? "bg-white text-purple-600 shadow-sm dark:bg-gray-800 dark:text-purple-400" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>Pay to Freelancer</button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-500">Select {contactTypeFilter}</label>
                  <select
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white"
                    value={selectedContactId}
                    onChange={(event) => handleClientSelect(event.target.value, contacts)}
                  >
                    <option value="">Manual / current invoice details</option>
                    {filteredContacts.length === 0 && <option value="">No {contactTypeFilter.toLowerCase()}s found.</option>}
                    {filteredContacts.map((contact) => <option key={contact.id} value={contact.id}>{formatContactOptionLabel(contact)}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-500">Client Name *</label>
                  <input className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white" value={formData.client_name} onChange={(event) => setField("client_name", event.target.value)} />
                  {fieldErrors.client_name && <p className="mt-2 text-xs font-bold text-red-500">{fieldErrors.client_name}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-500">Attention / PIC</label>
                  <input className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white" value={formData.client_pic} onChange={(event) => setField("client_pic", event.target.value)} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-500">Client Email</label>
                  <input type="email" className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white" value={formData.client_email} onChange={(event) => setField("client_email", event.target.value)} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-500">Client Phone</label>
                  <input className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white" value={formData.client_phone} onChange={(event) => setField("client_phone", event.target.value)} />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-500">Billing Address</label>
                  <textarea rows={3} className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white" value={formData.client_address} onChange={(event) => setField("client_address", event.target.value)} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-500">{contactTypeFilter === "Customer" ? "Invoice Date *" : "Voucher Date *"}</label>
                  <input type="date" required className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white dark:[color-scheme:dark]" value={formData.invoice_date} onChange={(event) => setField("invoice_date", event.target.value)} />
                  {fieldErrors.invoice_date && <p className="mt-2 text-xs font-bold text-red-500">{fieldErrors.invoice_date}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-500">{contactTypeFilter === "Customer" ? "Invoice No. *" : "Payment Voucher No."}</label>
                  <input
                    type="text"
                    className={`w-full rounded-xl border p-4 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white ${isEditMode ? "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-[#0A0A0A]" : "cursor-not-allowed border-transparent bg-gray-100 dark:bg-[#151515]"} ${formData.invoice_no === "Generating..." ? "animate-pulse" : ""}`}
                    value={formData.invoice_no}
                    readOnly={!isEditMode}
                    onChange={(event) => setField("invoice_no", event.target.value)}
                  />
                  {fieldErrors.invoice_no && <p className="mt-2 text-xs font-bold text-red-500">{fieldErrors.invoice_no}</p>}
                </div>

                {isEditMode ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-500">Due Date *</label>
                    <input type="date" className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white dark:[color-scheme:dark]" value={formData.due_date} onChange={(event) => setField("due_date", event.target.value)} />
                    {fieldErrors.due_date && <p className="mt-2 text-xs font-bold text-red-500">{fieldErrors.due_date}</p>}
                  </div>
                ) : (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-500">{contactTypeFilter === "Customer" ? "Credit Terms (Due Date) *" : "Payment Method *"}</label>
                    <select className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white" value={formData.credit_term} onChange={(event) => setField("credit_term", event.target.value)}>
                      {contactTypeFilter === "Customer" ? (
                        <><option value="0">Due on Receipt (Immediate)</option><option value="7">7 Days</option><option value="14">14 Days</option><option value="30">30 Days</option><option value="60">60 Days</option></>
                      ) : (
                        <><option value="0">Online Transfer / DuitNow</option><option value="1">Cash</option><option value="2">Cheque</option></>
                      )}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-500">Payment Status</label>
                  {isEditMode ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm font-black uppercase tracking-widest text-gray-500 dark:border-gray-800 dark:bg-[#151515]">
                      {formData.status}
                    </div>
                  ) : (
                    <select className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white" value={formData.status} onChange={(event) => setField("status", event.target.value)}>
                      <option value="outstanding">Outstanding (Pending)</option><option value="paid">Paid (Completed)</option>
                    </select>
                  )}
                </div>

                {contactTypeFilter === "Customer" && (
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-500">Invoice Title / Reference</label>
                    <input className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white" value={formData.description} onChange={(event) => setField("description", event.target.value)} placeholder="Creative Services" />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Line Items</h2>
                  <p className="mt-1 text-xs font-medium text-gray-500">Drag with the grip, or use the arrow buttons for keyboard-friendly ordering. A description with several lines becomes a heading with bullets on the PDF — try **bold** and *italic* too.</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={addTitle} className="rounded-full bg-blue-100 px-4 py-2 text-xs font-bold text-blue-700 transition-transform hover:scale-105 dark:bg-blue-900/30 dark:text-blue-400">+ ADD TITLE</button>
                  <button type="button" onClick={addItem} className="rounded-full bg-gray-200 px-4 py-2 text-xs font-bold text-gray-700 transition-transform hover:scale-105 dark:bg-gray-800 dark:text-gray-300">+ ADD ITEM</button>
                </div>
              </div>

              {fieldErrors.items && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600 dark:border-red-900/40 dark:bg-red-900/20">
                  {fieldErrors.items}
                </div>
              )}

              <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-4">
                {items.map((item, index) => (
                  <LineItemEditorRow
                    key={item.id}
                    item={item}
                    index={index}
                    itemsCount={items.length}
                    onChange={handleItemChange}
                    onRemove={removeItem}
                    onDuplicate={duplicateItem}
                    onMove={moveItem}
                    onEnterKey={handleEnterKey}
                  />
                ))}
              </Reorder.Group>

              <div className="flex justify-end pt-6">
                <div className="w-full space-y-4 rounded-3xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-[#0A0A0A] md:w-80">
                  <div className="flex items-center justify-between text-sm"><span className="font-medium text-gray-500">Subtotal</span><span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span></div>
                  <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-gray-500">Discount (RM)</span><input type="number" min="0" step="0.01" className="w-28 rounded-lg border border-gray-200 bg-white px-2 py-1 text-right text-gray-900 focus:outline-none dark:border-gray-700 dark:bg-[#111111] dark:text-white" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /></div>
                  {fieldErrors.discount && <p className="text-xs font-bold text-red-500">{fieldErrors.discount}</p>}
                  <div className="flex items-center justify-between text-sm"><span className="font-medium text-gray-500">Total Tax</span><span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totalTaxAmount)}</span></div>
                  <div className="my-2 flex items-end justify-between border-t border-gray-200 pt-4 dark:border-gray-700"><span className="font-bold uppercase tracking-wider text-gray-500">Total</span><span className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white">{formatCurrency(grandTotal)}</span></div>
                  {hasRecordedPayments && (
                    <div className="rounded-2xl bg-white p-3 text-xs font-bold text-gray-500 dark:bg-black">
                      Paid so far: {formatCurrency(recordedPaidAmount)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="border-b border-gray-100 pb-4 dark:border-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notes & Terms</h2>
                <p className="mt-1 text-xs font-medium text-gray-500">Formatting works here too: **bold**, *italic*, and a line starting with &quot;- &quot; for a bullet.</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-500">Client References / Notes</label>
                <textarea rows={3} className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white" value={formData.notes} onChange={(event) => setField("notes", event.target.value)} placeholder={"PO No: \nProject Ref: \nPayment Ref: "} />
              </div>
              <div className="pt-4">
                <div className="mb-2 flex items-end justify-between">
                  <label className="block text-sm font-medium text-gray-500">Terms & Conditions</label>
                  <select
                    className="cursor-pointer rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none dark:border-gray-800 dark:bg-[#151515] dark:text-gray-300"
                    onChange={(event) => {
                      if (event.target.value !== "custom") setField("terms", invoiceTemplates[event.target.value as keyof typeof invoiceTemplates]);
                    }}
                  >
                    <option value="custom">Load Template...</option>
                    <option value="standard">Standard (30 Days)</option>
                    <option value="immediate">Due on Receipt (Immediate)</option>
                    <option value="milestone">Milestone Deposit (50%)</option>
                    {contactTypeFilter === "Freelancer" && <option value="voucher">Voucher T&C</option>}
                  </select>
                </div>
                <textarea rows={5} required className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 leading-relaxed text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white" value={formData.terms} onChange={(event) => setField("terms", event.target.value)} />
                {fieldErrors.terms && <p className="mt-2 text-xs font-bold text-red-500">{fieldErrors.terms}</p>}
              </div>
            </div>
          )}

          <div className="mt-12 flex justify-between border-t border-gray-100 pt-6 dark:border-gray-800">
            {step > 1 ? (
              <button type="button" onClick={prevStep} className="rounded-full bg-gray-100 px-8 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700">&larr; Back</button>
            ) : (
              <button type="button" onClick={handleCancel} className="rounded-full bg-gray-100 px-8 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700">Cancel</button>
            )}
            {step < 3 ? (
              <button type="button" onClick={(event) => { event.preventDefault(); nextStep(); }} className={`rounded-full px-8 py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-95 ${accentClass === "blue" ? "bg-blue-600 shadow-blue-500/30 hover:bg-blue-700" : "bg-purple-600 shadow-purple-500/30 hover:bg-purple-700"}`}>Continue &rarr;</button>
            ) : (
              <button type="submit" disabled={loading || formData.invoice_no === "Generating..."} className={`rounded-full px-10 py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${isEditMode ? "bg-blue-600 shadow-blue-500/30 hover:bg-blue-700" : contactTypeFilter === "Customer" ? "bg-green-600 shadow-green-500/30 hover:bg-green-500" : "bg-purple-600 shadow-purple-500/30 hover:bg-purple-500"}`}>
                {loading ? "Saving..." : isEditMode ? "Save Changes" : `Generate ${contactTypeFilter === "Customer" ? "Invoice" : "Voucher"}`}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
