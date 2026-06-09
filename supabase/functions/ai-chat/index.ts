// Supabase Edge Function: ai-chat
// ---------------------------------------------------------------------------
// Proxies chat requests to the Google Gemini API so the API key NEVER ships
// inside the mobile app bundle. Supabase verifies the caller's JWT by default,
// so only signed-in users can reach this function.
//
// Gemini has a free tier that is usable in production. Get a key at
// https://aistudio.google.com/app/apikey
//
// Deploy:
//   supabase functions deploy ai-chat
// Set the server-side secret (NOT an EXPO_PUBLIC_ var):
//   supabase secrets set GEMINI_API_KEY=AIza...
// ---------------------------------------------------------------------------
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_OUTPUT_TOKENS = 1024;

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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'Server is missing GEMINI_API_KEY.' }, 500);

    const { system, messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'messages[] is required' }, 400);
    }

    // Map our {role: user|assistant} history to Gemini's {role: user|model} contents.
    const contents = (messages as ChatMessage[]).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.7 },
    };
    if (typeof system === 'string' && system.length > 0) {
      body.system_instruction = { parts: [{ text: system }] };
    }

    const resp = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return json({ error: `Gemini error ${resp.status}: ${errText}` }, 502);
    }

    const data = await resp.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
    return json({ reply });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'Unexpected error' }, 500);
  }
});
