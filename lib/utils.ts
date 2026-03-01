import { Order } from "./types";

/**
 * Format cents to dollar string
 * @example formatPrice(12500) => "125.00"
 */
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Parse date string as local date to avoid timezone issues
 * @example parseLocalDate("2026-02-14") => Date object
 */
export function parseLocalDate(dateString: string | undefined | null): Date {
  if (!dateString) {
    return new Date(); // Return current date as fallback
  }
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get fulfillment date from order based on type
 */
export function getFulfillmentDate(order: Order): string {
  const date = order.fulfillment_type === 'delivery'
    ? order.delivery_date
    : order.pickup_date;
  return date || '';
}

/**
 * Get fulfillment time from order based on type
 */
export function getFulfillmentTime(order: Order): string {
  const time = order.fulfillment_type === 'delivery'
    ? order.delivery_window_start
    : order.pickup_time;
  return time || '';
}

/**
 * Get fulfillment time range (for delivery, returns window; for pickup, returns single time)
 */
export function getFulfillmentTimeDisplay(order: Order): string {
  if (order.fulfillment_type === 'delivery') {
    return `${order.delivery_window_start || ''}-${order.delivery_window_end || ''}`;
  }
  return order.pickup_time || '';
}

/**
 * Check if a date string is Monday or Tuesday
 */
export function isMonOrTue(dateString: string): boolean {
  const date = parseLocalDate(dateString);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 1 || dayOfWeek === 2;
}

/**
 * Get minimum order date (72 hours from now, expressed as a local date string).
 * Uses local date parts to avoid UTC off-by-one when client is behind UTC.
 */
export function getMinOrderDate(): string {
  const min = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const y = min.getFullYear();
  const m = String(min.getMonth() + 1).padStart(2, '0');
  const d = String(min.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
