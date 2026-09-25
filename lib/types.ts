export type InvoiceStatus = "draft" | "dp_paid" | "paid" | "cancelled";

export interface MuaProfile {
  id: string;
  user_id: string;
  business_name: string;
  owner_name: string;
  phone: string;
  instagram: string;
  address: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  default_terms: string;
  default_notes: string;
  updated_at: number;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  item_order: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  client_name: string;
  client_phone: string;
  event_type: string;
  event_date: string;
  event_time: string;
  event_venue: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  discount: number;
  dp_amount: number;
  balance_due: number;
  status: InvoiceStatus;
  notes: string;
  terms: string;
  created_at: number;
  updated_at: number;
  items?: InvoiceItem[];
}
