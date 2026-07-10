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
