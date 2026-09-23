import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isValidDateOnly } from "../../lib/utils";
import { assertSupabaseUrlMatchesEnv } from "../../lib/env";

const INVOICE_NUMBER_PATTERN = /^[A-Za-z0-9/_-]+$/;
const MAX_INVOICE_NUMBER_LENGTH = 64;

type InvoiceLineItem = {
  id: number;
  type: "item" | "title";
  description: string;
  qty: number;
  price: number;
  taxRate: number;
  total: number;
};

type InvoicePostBody = {
  invoiceNumber?: unknown;
  invoiceDate?: unknown;
  dueDate?: unknown;
  clientName?: unknown;
  clientPic?: unknown;
  clientPhone?: unknown;
  clientEmail?: unknown;
  clientAddress?: unknown;
  description?: unknown;
  items?: unknown;
  discount?: unknown;
  status?: unknown;
  notes?: unknown;
  terms?: unknown;
};

const getServerSupabase = (accessToken: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  assertSupabaseUrlMatchesEnv(supabaseUrl);

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};

const getBearerToken = (request: Request) => {
  const authorization = request.headers.get("authorization");
  return authorization?.replace(/^Bearer\s+/i, "") || "";
};

const toCleanString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const roundMoney = (value: number) => Math.round((value + (value >= 0 ? Number.EPSILON : -Number.EPSILON)) * 100) / 100;

const validateInvoiceNumber = (invoiceNumber: string) => {
  if (!invoiceNumber) return "Invoice number is required.";
  if (invoiceNumber.length > MAX_INVOICE_NUMBER_LENGTH) {
    return `Invoice number must be ${MAX_INVOICE_NUMBER_LENGTH} characters or fewer.`;
  }
  if (!INVOICE_NUMBER_PATTERN.test(invoiceNumber)) {
    return "Invoice number can only contain letters, numbers, hyphens, underscores, and forward slashes.";
  }
  return "";
};

const validateDateInput = (value: string, label: string) => {
  if (!value) return `${label} is required.`;
  if (!isValidDateOnly(value)) return `${label} must be a valid date in YYYY-MM-DD format.`;
  return "";
};

const parseInvoiceItems = (items: unknown) => {
  const errors: string[] = [];
  if (!Array.isArray(items) || items.length === 0) {
    return { items: [] as InvoiceLineItem[], error: "At least one line item is required." };
  }

  const seenIds = new Set<number>();
  const parsedItems = items.map((item, index) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const type = row.type === "title" ? "title" : "item";
    const description = toCleanString(row.description);
    const idValue = Number(row.id);
    const id = Number.isFinite(idValue) && idValue > 0 && !seenIds.has(idValue) ? idValue : Date.now() + index;
    seenIds.add(id);

    if (!description) {
      errors.push(`Line item ${index + 1} needs a description.`);
    }

    if (type === "title") {
      return { id, type, description, qty: 0, price: 0, taxRate: 0, total: 0 } satisfies InvoiceLineItem;
    }

    const qty = toNumber(row.qty);
    const price = toNumber(row.price);
    const taxRate = toNumber(row.taxRate ?? 0);

    if (!Number.isFinite(qty) || qty <= 0) {
      errors.push(`Line item ${index + 1} needs a valid quantity.`);
    }
    if (!Number.isFinite(price)) {
      errors.push(`Line item ${index + 1} needs a valid unit price.`);
    }
    if (!Number.isFinite(taxRate) || taxRate < 0) {
      errors.push(`Line item ${index + 1} needs a valid tax rate.`);
    }

    const safeQty = Number.isFinite(qty) ? qty : 0;
    const safePrice = Number.isFinite(price) ? price : 0;
    const safeTaxRate = Number.isFinite(taxRate) ? taxRate : 0;

    return {
      id,
      type,
      description,
      qty: safeQty,
      price: safePrice,
      taxRate: safeTaxRate,
      total: roundMoney(safeQty * safePrice),
    } satisfies InvoiceLineItem;
  });

  if (!parsedItems.some((item) => item.type === "item")) {
    errors.push("At least one chargeable item is required.");
  }

  return {
    items: parsedItems,
    error: errors[0] || "",
  };
};

export async function POST(request: Request) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json({ error: "No active session found." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as InvoicePostBody | null;
  const invoiceNumber = toCleanString(body?.invoiceNumber);
  const invoiceNumberError = validateInvoiceNumber(invoiceNumber);
  const invoiceDate = toCleanString(body?.invoiceDate);
  const dueDate = toCleanString(body?.dueDate);
  const invoiceDateError = validateDateInput(invoiceDate, "Invoice date");
  const dueDateError = validateDateInput(dueDate, "Due date");
  const clientName = toCleanString(body?.clientName);
  const clientPic = toCleanString(body?.clientPic);
  const clientPhone = toCleanString(body?.clientPhone);
  const clientEmail = toCleanString(body?.clientEmail);
  const clientAddress = toCleanString(body?.clientAddress);
  const description = toCleanString(body?.description) || "Creative Services";
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  const terms = typeof body?.terms === "string" ? body.terms.trim() : "";
  const discount = toNumber(body?.discount ?? 0);
  const parsedItems = parseInvoiceItems(body?.items);
  const requestedStatus = toCleanString(body?.status).toLowerCase() === "paid" ? "paid" : "outstanding";

  if (invoiceNumberError) {
    return NextResponse.json({ error: invoiceNumberError, fieldErrors: { invoice_no: invoiceNumberError } }, { status: 400 });
  }
  if (invoiceDateError) {
    return NextResponse.json({ error: invoiceDateError, fieldErrors: { invoice_date: invoiceDateError } }, { status: 400 });
  }
  if (dueDateError) {
    return NextResponse.json({ error: dueDateError, fieldErrors: { due_date: dueDateError } }, { status: 400 });
  }
  if (!clientName) {
    return NextResponse.json({ error: "Client name is required.", fieldErrors: { client_name: "Client name is required." } }, { status: 400 });
  }
  if (!Number.isFinite(discount) || discount < 0) {
    return NextResponse.json({ error: "Discount must be a non-negative number.", fieldErrors: { discount: "Discount must be a non-negative number." } }, { status: 400 });
  }
  if (parsedItems.error) {
    return NextResponse.json({ error: parsedItems.error, fieldErrors: { items: parsedItems.error } }, { status: 400 });
  }
  if (!terms) {
    return NextResponse.json({ error: "Terms are required.", fieldErrors: { terms: "Terms are required." } }, { status: 400 });
  }

  const subtotal = roundMoney(parsedItems.items
    .filter((item) => item.type === "item")
    .reduce((sum, item) => sum + item.total, 0));
  const taxAmount = roundMoney(parsedItems.items
    .filter((item) => item.type === "item")
    .reduce((sum, item) => sum + (item.total * (item.taxRate / 100)), 0));
  const totalAmount = roundMoney(subtotal - discount + taxAmount);

  if (totalAmount < 0) {
    return NextResponse.json({
      error: "Invoice total cannot be negative. Use a credit note workflow for a net credit.",
      fieldErrors: { items: "Invoice total cannot be negative. Use a credit note workflow for a net credit." },
    }, { status: 400 });
  }

  try {
    const supabase = getServerSupabase(accessToken);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user?.email) {
      return NextResponse.json({ error: "Unable to verify your session." }, { status: 401 });
    }

    const { data: invoiceNumbers, error: duplicateError } = await supabase
      .from("invoices")
      .select("id, invoice_no");

    if (duplicateError) {
      return NextResponse.json({ error: duplicateError.message }, { status: 500 });
    }

    const duplicateInvoice = invoiceNumbers?.find((item) => (
      typeof item.invoice_no === "string"
      && item.invoice_no.toLowerCase() === invoiceNumber.toLowerCase()
    ));

    if (duplicateInvoice) {
      return NextResponse.json({ error: "Another invoice already uses this invoice number.", fieldErrors: { invoice_no: "Another invoice already uses this invoice number." } }, { status: 409 });
    }

    const { data: invoice, error: insertError } = await supabase
      .from("invoices")
      .insert([{
        created_at: invoiceDate,
        invoice_no: invoiceNumber,
        client_name: clientName,
        client_pic: clientPic,
        client_address: clientAddress,
        client_phone: clientPhone,
        client_email: clientEmail,
        description,
        amount: totalAmount,
        amount_paid: requestedStatus === "paid" ? totalAmount : 0,
        items: parsedItems.items,
        subtotal,
        discount: roundMoney(discount),
        tax_amount: taxAmount,
        status: requestedStatus,
        due_date: dueDate,
        notes,
        terms,
      }])
      .select("*")
      .single();

    if (insertError || !invoice) {
      return NextResponse.json({ error: insertError?.message || "Unable to create invoice." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, invoice }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create invoice.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
