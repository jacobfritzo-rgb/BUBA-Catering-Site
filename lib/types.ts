export type OrderStatus = "pending" | "approved" | "rejected" | "paid" | "completed";

export type ItemType = "party_box" | "big_box";

export interface FlavorItem {
  name: string;
  quantity: number;
}

export interface OrderItem {
  type: ItemType;
  quantity: number;
  price_cents: number;
  flavors: FlavorItem[];
}

export interface Addon {
  name: string;
  quantity: number;
  price_cents: number;
}

export interface OrderData {
  items: OrderItem[];
  addons: Addon[];
}

export interface Order {
  id: number;
  status: OrderStatus;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  fulfillment_type: "pickup" | "delivery";
  pickup_date?: string;
  pickup_time?: string;
  delivery_date?: string;
  delivery_window_start?: string;
  delivery_window_end?: string;
  delivery_address?: string;
  delivery_notes: string | null;
  delivery_fee: number;
  sms_opt_in: number;
  email_opt_in: number;
  order_data: OrderData;
  production_deadline: string;
  bake_deadline: string;
  total_price: number;
  kitchen_notified: number;
  rejection_reason?: string | null;
  metrospeedy_status?: string;
  metrospeedy_notes?: string | null;
}

export interface OrderNote {
  id: number;
  order_id: number;
  created_at: string;
  note_type: string;
  content: string;
}

export interface Flavor {
  id: number;
  name: string;
  description: string | null;
  available: number;
  sort_order: number;
}

export interface CreateOrderRequest {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  fulfillment_type: "pickup" | "delivery";
  pickup_date?: string;
  pickup_time?: string;
  delivery_date?: string;
  delivery_window_start?: string;
  delivery_window_end?: string;
  delivery_address?: string;
  delivery_notes?: string;
  delivery_fee?: number;
  sms_opt_in?: boolean;
  email_opt_in?: boolean;
  order_data: OrderData;
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  kitchen_notified?: number;
  rejection_reason?: string;
  metrospeedy_status?: string;
  metrospeedy_notes?: string;
}

export interface CreateFlavorRequest {
  name: string;
  description?: string;
}

export interface DeleteFlavorRequest {
  name: string;
}
