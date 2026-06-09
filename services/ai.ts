import type { Product } from '@/data/products';
import type { CartItem } from '@/context/CartContext';

// The assistant talks to a Supabase Edge Function (supabase/functions/ai-chat),
// which holds the LLM key (Google Gemini) server-side. The key is NEVER in the app bundle.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const AI_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-chat`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIContextData {
  products: Product[];
  cartItems: CartItem[];
  cartTotal: number;
  userName?: string;
}

function buildSystemPrompt(ctx: AIContextData): string {
  const catalog = ctx.products
    .slice(0, 40)
    .map(p =>
      `- ${p.name} | ${p.brand} | ${p.category} | ₹${p.price}${p.isBestSeller ? ' ⭐BESTSELLER' : ''}${p.isNew ? ' 🆕NEW' : ''}${p.hasTryOn ? ' | Virtual Try-On' : ''}`
    )
    .join('\n');

  const cartSummary =
    ctx.cartItems.length > 0
      ? ctx.cartItems
          .map(i => `${i.product.name} ×${i.quantity} (${i.lensType})`)
          .join(', ') + ` — Total: ₹${ctx.cartTotal}`
      : 'Empty cart';

  return `You are the AI assistant for Allen Eye Care, a premium Indian optical shop. Help customers find the right eyewear, understand lenses, and get the most from their purchase.

${ctx.userName ? `Customer phone: ${ctx.userName}` : ''}
Customer's cart: ${cartSummary}

---
PRODUCT CATALOG (sample — always recommend from this list):
${catalog}
---

YOUR EXPERTISE:

**Frame Selection by Face Shape**
- Oval: almost any frame works — try aviators, wayfarers, or cat-eyes
- Round: angular/rectangular frames add definition (wayfarers, square frames)
- Square: round or oval frames soften strong jaw lines
- Heart: bottom-heavy frames (clubmaster, round) balance a wider forehead
- Diamond: cat-eye or oval frames highlight cheekbones

**Lens Types**
- Single-vision: one prescription throughout — everyday glasses
- Bifocal: two zones (distance top, reading bottom) — visible line
- Progressive: seamless multi-focal, no visible line — most natural
- Non-powered: plano/zero power — sunglasses or fashion frames
- Coatings: anti-reflective (AR), blue-light filter, UV400, polarized, photochromic (auto-tint)

**Reading a Prescription**
- SPH (Sphere): main power — positive = farsighted, negative = nearsighted
- CYL (Cylinder): astigmatism power
- AXIS: astigmatism direction, 0–180°
- ADD: reading addition for bifocal/progressive
- PD: pupillary distance, important for lens centration

**Eye Care Tips**
- Follow the 20-20-20 rule: every 20 min, look 20 ft away for 20 sec
- Keep screen 50–60 cm from eyes
- Clean lenses with a microfiber cloth and lens spray — avoid tissues
- Store glasses in a hard case when not in use

**Store Policies**
- ISI certified products, premium brands (Ray-Ban, Oakley, Titan, Fastrack, Lenskart)
- Free shipping on orders ₹999+
- 14-day hassle-free returns
- EMI available on all orders
- Virtual try-on available for select frames
- For order tracking, direct the customer to the Account tab in the app

TONE: Warm, professional, concise. Respond in the same language the customer writes in (Hindi or English). Never invent products — only recommend from the catalog above. If asked about something outside your scope, politely redirect.`;
}

export async function sendToAI(
  messages: ChatMessage[],
  context: AIContextData,
  accessToken: string | undefined
): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('The assistant is unavailable: Supabase is not configured.');
  }
  if (!accessToken) {
    throw new Error('Please sign in to use the assistant.');
  }

  const response = await fetch(AI_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ system: buildSystemPrompt(context), messages }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as any)?.error ?? `Request failed (HTTP ${response.status})`);
  }
  return (data as { reply?: string }).reply ?? '';
}
