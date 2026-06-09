// Supabase Edge Function: pexels-search
// ---------------------------------------------------------------------------
// Searches Pexels for free, commercial-use eyewear photos so the admin can
// populate the catalog with real images. The Pexels key stays server-side.
// JWT-gated (only signed-in staff can call it from the dashboard).
//
// Deploy:  supabase functions deploy pexels-search
// Secret:  supabase secrets set PEXELS_API_KEY=...   (free key: pexels.com/api)
// ---------------------------------------------------------------------------
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const key = Deno.env.get('PEXELS_API_KEY');
    if (!key) return json({ error: 'PEXELS_API_KEY is not configured on the server.' }, 500);

    const { query, per_page = 6 } = await req.json();
    if (!query || typeof query !== 'string') return json({ error: 'query is required' }, 400);

    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.min(Number(per_page) || 6, 15)}&orientation=square`;
    const resp = await fetch(url, { headers: { Authorization: key } });
    if (!resp.ok) return json({ error: `Pexels error ${resp.status}` }, 502);

    const data = await resp.json();
    const photos = (data.photos ?? []).map((p: any) => ({
      id: p.id,
      src: p.src?.large ?? p.src?.medium ?? p.src?.original,
      thumb: p.src?.tiny,
      alt: p.alt ?? '',
      credit: p.photographer,
    }));
    return json({ photos });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'Unexpected error' }, 500);
  }
});
