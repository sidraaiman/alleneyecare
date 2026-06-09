// Client helpers for the Razorpay payment flow. These call the JWT-gated
// Supabase Edge Functions (same shape as services/ai.ts) — the Razorpay secret
// and all pricing stay on the server.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export interface PaymentLineItem {
  product_id: string;
  lens_type: string;
  quantity: number;
}

export interface CreatedPaymentOrder {
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
}

async function callFunction<T>(name: string, body: unknown, accessToken: string): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Payments are unavailable: Supabase is not configured.');
  }
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error((data as { error?: string })?.error ?? `Request failed (HTTP ${resp.status})`);
  }
  return data as T;
}

export function createPaymentOrder(
  items: PaymentLineItem[],
  address: Record<string, string>,
  accessToken: string,
  coupon?: string,
  redeemPoints?: number
): Promise<CreatedPaymentOrder> {
  return callFunction<CreatedPaymentOrder>('razorpay-create-order', { items, address, coupon: coupon ?? null, redeem_points: redeemPoints ?? 0 }, accessToken);
}

export function verifyPayment(
  payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    items: PaymentLineItem[];
    address: Record<string, string>;
    payment_method: string;
    coupon?: string | null;
    redeem_points?: number;
  },
  accessToken: string
): Promise<{ orderId: string }> {
  return callFunction<{ orderId: string }>('razorpay-verify', payload, accessToken);
}
