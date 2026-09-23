export type MoneyValue = number | string | null | undefined;

export interface Contact {
  id: string;
  name: string;
  contact_type?: string | null;
  customer_type?: string | null;
  pic_name?: string | null;
  phone?: string | null;
  email?: string | null;
  ic_no?: string | null;
  tin_no?: string | null;
  ssm_no?: string | null;
  sst_no?: string | null;
  address?: string | null;
  postcode?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  service_role?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  created_at?: string | null;
}

export interface LineItem {
  id: number;
  type: "item" | "title";
  description: string;
  qty: number;
  price: number;
  taxRate: number;
  total: number;
}

export interface Invoice {
  id: string;
  created_at: string;
  invoice_no: string;
  client_name: string;
  client_pic?: string | null;
  client_address?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  description?: string | null;
  amount: MoneyValue;
  amount_paid?: MoneyValue;
  items?: LineItem[] | null;
  subtotal?: MoneyValue;
  discount?: MoneyValue;
  tax_amount?: MoneyValue;
  due_date?: string | null;
  status: string;
  notes?: string | null;
  terms?: string | null;
}

export interface Expense {
  id: string;
  created_at?: string | null;
  date: string;
  description: string;
  category: string;
  amount: number;
  status?: string | null;
  receipt_url?: string | null;
  payment_proof_url?: string | null;
}

export interface Asset {
  id: string;
  item_name: string;
  category: string;
  purchase_date: string;
  amount: MoneyValue;
  notes?: string | null;
  receipt_url?: string | null;
  // Capital allowance / tax fields -- all nullable, all backward-compatible
  // with rows created before this module existed. See src/app/lib/tax/.
  supplier_name?: string | null;
  placed_in_use_date?: string | null;
  business_use_percentage?: number | null;
  source_type?: "purchased_by_business" | "owner_contribution" | "personal_to_business_transfer" | "other" | null;
  tax_rule_code?: string | null;
  tax_rule_confirmed?: boolean | null;
  tax_basis_status?: "needs_review" | "confirmed" | null;
}

export type DocumentType =
  | "service_agreement"
  | "sow"
  | "subcontractor_disclosure"
  | "creator_brief"
  | "creator_agreement"
  | "performance_report"
  | "nda";

export interface AgencyDocument {
  id: string;
  document_type: DocumentType;
  doc_no: string;
  title?: string | null;
  status: string;
  counterparty_contact_id?: string | null;
  counterparty_name: string;
  counterparty_pic?: string | null;
  counterparty_email?: string | null;
  counterparty_phone?: string | null;
  counterparty_address?: string | null;
  issue_date: string;
  valid_until?: string | null;
  payload: Record<string, unknown>;
  line_items?: LineItem[] | null;
  notes?: string | null;
  terms?: string | null;
  created_at?: string | null;
  created_by?: string | null;
}

export interface Quotation {
  id: string;
  created_at?: string | null;
  quote_no: string;
  client_name: string;
  client_pic?: string | null;
  client_address?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  date: string;
  valid_until: string;
  items?: LineItem[] | null;
  subtotal: MoneyValue;
  discount?: MoneyValue;
  tax_amount?: MoneyValue;
  total: MoneyValue;
  notes?: string | null;
  terms?: string | null;
  status: string;
}
