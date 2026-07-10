import type { Contact, MoneyValue } from "./types";

export const MALAYSIA_TIME_ZONE = "Asia/Kuala_Lumpur";
export const SUPERADMIN_EMAILS = new Set([
  "faiz@omnyzo.com",
  "faiz.shamsul@omnyzo.com",
]);

export function createStorageFileName(originalName: string) {
  const rawExt = originalName.split(".").pop() || "upload";
  const fileExt = rawExt.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 12) || "upload";
  const uniqueId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${uniqueId}.${fileExt}`;
}

export function isSuperadminEmail(email?: string | null) {
  return SUPERADMIN_EMAILS.has((email || "").trim().toLowerCase());
}

export function parseStoredJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toNumber(value: MoneyValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toMoney(value: MoneyValue) {
  return toNumber(value).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function normalizeStatus(status?: string | null) {
  return (status || "").trim().toLowerCase();
}

export function isPaidStatus(status?: string | null) {
  return normalizeStatus(status) === "paid";
}

export function isPartialStatus(status?: string | null) {
  return normalizeStatus(status) === "partial";
}

export function getInvoiceOutstandingBalance({
  amount,
  amountPaid,
  status,
}: {
  amount: MoneyValue;
  amountPaid?: MoneyValue;
  status?: string | null;
}) {
  if (isPaidStatus(status)) return 0;

  return Math.max(0, toNumber(amount) - toNumber(amountPaid));
}

export const CONTACT_SELECT_COLUMNS = "*";

export function buildContactAddress(contact: Contact) {
  return [contact.address, contact.postcode, contact.city, contact.state, contact.country]
    .filter(Boolean)
    .join(", ");
}

export function formatContactOptionLabel(contact: Contact) {
  const detail = contact.pic_name || contact.email || contact.phone;
  const secondary = contact.pic_name && contact.email ? `${contact.pic_name} (${contact.email})` : detail;
  return secondary ? `${contact.name} - ${secondary}` : contact.name;
}

export function formatDateInputInMalaysia(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MALAYSIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) return date.toISOString().split("T")[0];
  return `${year}-${month}-${day}`;
}

export function getMonthKey(dateInput?: string | null) {
  if (!dateInput) return "unknown";

  const directMonth = dateInput.match(/^(\d{4})-(\d{2})/);
  if (directMonth) return `${directMonth[1]}-${directMonth[2]}`;

  const parsedDate = new Date(dateInput);
  if (Number.isNaN(parsedDate.getTime())) return "unknown";

  return formatDateInputInMalaysia(parsedDate).slice(0, 7);
}

export function getCurrentMonthKeyInMalaysia() {
  return formatDateInputInMalaysia().slice(0, 7);
}

export function getPreviousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return getCurrentMonthKeyInMalaysia();

  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return "Undated";

  return new Intl.DateTimeFormat("en-MY", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function sortMonthKeysDescending(a: string, b: string) {
  if (a === "unknown") return 1;
  if (b === "unknown") return -1;
  return b.localeCompare(a);
}

export function addDaysToDateInput(dateInput: string, days: number) {
  const [year, month, day] = dateInput.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

export interface ExpenseDescriptionParts {
  voucherNo: string | null;
  payeeName: string | null;
  originalVendorName: string | null;
  reimbursementTo: string | null;
  paidPersonally: boolean;
  itemDesc: string;
}

export function parseExpenseDescription(description?: string | null): ExpenseDescriptionParts {
  const raw = (description || "").trim();
  const voucherMatch = raw.match(/^\[([^\]]+)\]\s*(.*)$/);
  const voucherNo = voucherMatch?.[1]?.trim() || null;
  const body = (voucherMatch?.[2] || raw).trim();
  const reimbursementMatch = body.match(/^Reimbursement to\s+(.+?)\s+\|\s+Vendor:\s+(.+?)\s+\|\s+(.+)$/i);

  if (reimbursementMatch) {
    const reimbursementTo = reimbursementMatch[1].trim();

    return {
      voucherNo,
      payeeName: reimbursementTo,
      originalVendorName: reimbursementMatch[2].trim(),
      reimbursementTo,
      paidPersonally: true,
      itemDesc: reimbursementMatch[3].trim() || "Business expense paid personally",
    };
  }

  const paymentMatch = body.match(/^Payment to\s+(.+?)(?:\s+-\s+(.+))?$/i);

  if (paymentMatch) {
    return {
      voucherNo,
      payeeName: paymentMatch[1].trim(),
      originalVendorName: null,
      reimbursementTo: null,
      paidPersonally: false,
      itemDesc: paymentMatch[2]?.trim() || "Professional Services Rendered",
    };
  }

  return {
    voucherNo,
    payeeName: null,
    originalVendorName: null,
    reimbursementTo: null,
    paidPersonally: false,
    itemDesc: body,
  };
}

export function buildExpenseDescription({
  voucherNo,
  payeeName,
  originalVendorName,
  paidPersonally = false,
  itemDesc,
}: {
  voucherNo?: string | null;
  payeeName?: string | null;
  originalVendorName?: string | null;
  paidPersonally?: boolean;
  itemDesc: string;
}) {
  const cleanVoucherNo = voucherNo?.trim();
  const cleanPayeeName = payeeName?.trim().replace(/\|/g, "-");
  const cleanVendorName = originalVendorName?.trim().replace(/\|/g, "-");
  const cleanItemDesc = (itemDesc.trim() || "Professional Services").replace(/\|/g, "-");
  const body = paidPersonally
    ? `Reimbursement to ${cleanPayeeName || "Faiz Shamsul"} | Vendor: ${cleanVendorName || "Original Vendor"} | ${cleanItemDesc}`
    : cleanPayeeName ? `Payment to ${cleanPayeeName} - ${cleanItemDesc}` : cleanItemDesc;

  return cleanVoucherNo ? `[${cleanVoucherNo}] ${body}` : body;
}

export function getPaymentVoucherPrefix(dateInput: string) {
  const dateParts = dateInput.split("-");
  if (dateParts.length !== 3) throw new Error("Invalid date format");
  return `${dateParts[0]}${dateParts[1]}${dateParts[2]}-PV`;
}
