// Supabase Edge Function: send-push
// ---------------------------------------------------------------------------
// Sends an Expo push notification to a user's stored token (profiles.push_token).
// Intended to be invoked by a Database Webhook on `orders` UPDATE (status change)
// so customers get a remote push even when the app is closed — today the app only
// raises a LOCAL notification while it's open + subscribed.
//
// Protect it with a shared secret (so it can't be abused as an open push relay):
//   supabase secrets set PUSH_WEBHOOK_SECRET=<random-string>
// and have the webhook send header  x-webhook-secret: <same>
//
// Deploy: supabase functions deploy send-push --no-verify-jwt
// ---------------------------------------------------------------------------
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const secret = Deno.env.get('PUSH_WEBHOOK_SECRET');
    if (secret && req.headers.get('x-webhook-secret') !== secret) {
      return json({ error: 'Forbidden' }, 403);
    }

    const payload = await req.json();
    // Accept either a direct call { user_id, title, body } or a DB-webhook record.
    const rec = payload.record ?? payload;
    const userId: string | undefined = payload.user_id ?? rec?.user_id;
    const title: string = payload.title ?? 'AllenEyeCare';
    const body: string = payload.body ?? (rec?.status ? `Your order is now ${rec.status}.` : 'You have an update.');
    if (!userId) return json({ error: 'user_id required' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: profile } = await admin.from('profiles').select('push_token').eq('id', userId).single();
    const token = (profile as { push_token?: string } | null)?.push_token;
    if (!token) return json({ skipped: 'no push token for user' });

    const resp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title, body, data: { orderId: rec?.id } }),
    });
    return json(await resp.json());
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'Unexpected error' }, 500);
  }
});
