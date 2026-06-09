// Supabase Edge Function: razorpay-create-order
// ---------------------------------------------------------------------------
// Computes the authoritative order amount server-side (compute_order_amount RPC)
// and creates a Razorpay order. The app NEVER sends prices — only product ids,
// lens types and quantities. JWT-gated (only signed-in users).
//
// Deploy:  supabase functions deploy razorpay-create-order
// Secrets: supabase secrets set RAZORPAY_KEY_ID=rzp_test_... RAZORPAY_KEY_SECRET=...
// (RAZORPAY_KEY_ID is publishable and returned to the client.)
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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) return json({ error: 'Razorpay keys not configured on the server.' }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Not authenticated' }, 401);

    const { items, coupon, redeem_points } = await req.json();
    if (!Array.isArray(items) || items.length === 0) return json({ error: 'items[] is required' }, 400);

    // Authoritative amount from the DB (validates stock + prices under the user's JWT).
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: amount, error } = await supabase.rpc('compute_order_amount', { p_items: items, p_coupon: coupon ?? null, p_redeem_points: Number(redeem_points) || 0 });
    if (error) return json({ error: error.message }, 400);
    const total = Number((amount as { total: number }).total);
    if (!Number.isFinite(total) || total <= 0) return json({ error: 'Invalid order amount' }, 400);

    // Create the Razorpay order (amount in paise).
    const rzpResp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      },
      body: JSON.stringify({
        amount: total * 100,
        currency: 'INR',
        receipt: `aec_${crypto.randomUUID()}`,
      }),
    });
    if (!rzpResp.ok) {
      const errText = await rzpResp.text();
      return json({ error: `Razorpay error ${rzpResp.status}: ${errText}` }, 502);
    }
    const rzp = await rzpResp.json();
    return json({ razorpayOrderId: rzp.id, amount: rzp.amount, currency: 'INR', keyId });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'Unexpected error' }, 500);
  }
});
