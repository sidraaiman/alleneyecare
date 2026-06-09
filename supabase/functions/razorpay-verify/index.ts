// Supabase Edge Function: razorpay-verify
// ---------------------------------------------------------------------------
// Verifies the Razorpay payment signature server-side, then commits the order
// via the place_order RPC (which re-validates stock and decrements it
// atomically). The order is created ONLY after a valid, paid signature.
// JWT-gated.
//
// Deploy:  supabase functions deploy razorpay-verify
// Secrets: shares RAZORPAY_KEY_SECRET with razorpay-create-order.
// ---------------------------------------------------------------------------
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) return json({ error: 'Razorpay secret not configured.' }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Not authenticated' }, 401);

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      address,
      payment_method,
      coupon,
      redeem_points,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: 'Missing payment fields' }, 400);
    }
    if (!Array.isArray(items) || items.length === 0) return json({ error: 'items[] is required' }, 400);

    // Verify the signature: HMAC_SHA256(order_id|payment_id, key_secret).
    const expected = await hmacSha256Hex(keySecret, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (expected !== razorpay_signature) {
      return json({ error: 'Payment signature verification failed' }, 400);
    }

    // Signature valid → commit the order atomically (re-validates stock).
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: orderId, error } = await supabase.rpc('place_order', {
      p_items: items,
      p_payment_method: payment_method ?? 'online',
      p_address: address ?? null,
      p_payment_id: razorpay_payment_id,
      p_payment_status: 'paid',
      p_coupon: coupon ?? null,
      p_redeem_points: Number(redeem_points) || 0,
    });
    if (error) return json({ error: error.message }, 400);

    return json({ orderId });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'Unexpected error' }, 500);
  }
});
