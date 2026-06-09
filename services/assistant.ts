// Local, on-device assistant — no API, no key, no network, no rate limits.
// Answers the eyewear domain (face shapes, lenses, prescriptions, eye-care tips,
// store policies) and recommends from the live product catalog. Used as the
// default brain for the AI tab, and as the fallback when the optional cloud LLM
// is unavailable or rate-limited.
import type { Product } from '@/data/products';
import type { CartItem } from '@/context/CartContext';
import type { ChatMessage } from '@/services/ai';

export interface AssistantContext {
  products: Product[];
  cartItems: CartItem[];
  cartTotal: number;
  userName?: string;
}

const fmt = (n: number) => `₹${n.toLocaleString()}`;

function bullets(items: Product[], max = 4): string {
  if (items.length === 0) return '(nothing in the catalog matches that just yet)';
  return items
    .slice(0, max)
    .map(p => `• ${p.name} — ${p.brand} · ${fmt(p.price)}${p.hasTryOn ? ' · Try-On' : ''}`)
    .join('\n');
}

const FACE_SHAPES: Record<string, { advice: string; frames: string[] }> = {
  oval: {
    advice: 'Lucky you — an oval face suits almost anything. Aviators, wayfarers and cat-eyes all look great.',
    frames: ['aviator', 'wayfarer', 'cat-eye', 'round'],
  },
  round: {
    advice: 'Angular frames add definition to a round face — go for rectangle, square or wayfarer shapes.',
    frames: ['rectangle', 'square', 'wayfarer'],
  },
  square: {
    advice: 'Soften a strong jaw with curves — round, oval or cat-eye frames balance a square face beautifully.',
    frames: ['round', 'oval', 'cat-eye'],
  },
  heart: {
    advice: 'Balance a wider forehead with bottom-heavy or rounded frames — round and aviator styles work well.',
    frames: ['round', 'aviator'],
  },
  diamond: {
    advice: 'Highlight your cheekbones with cat-eye or oval frames for a diamond face.',
    frames: ['cat-eye', 'oval'],
  },
};

export function generateReply(userText: string, ctx: AssistantContext, _history?: ChatMessage[]): string {
  const t = userText.toLowerCase().trim();
  const tokens = new Set(t.split(/[^a-z0-9]+/).filter(Boolean));
  const word = (w: string) => tokens.has(w);
  const { products } = ctx;

  // Greeting
  if (t.length < 24 && (word('hi') || word('hello') || word('hey') || word('namaste') || t.includes('good morning') || t.includes('good evening'))) {
    return "Hello! 👋 I can help you find frames for your face shape, explain lens types, decode your prescription, share eye-care tips, or show our best sellers. What would you like?";
  }

  // Order tracking
  if (t.includes('track') || t.includes('my order') || t.includes('order status') || t.includes('where is my')) {
    return "You can track every order in the **Account** tab → tap any order to see a live status timeline (Placed → Confirmed → Being Prepared → Shipped → Delivered). You'll also get a push notification whenever the status changes.";
  }

  // Face shape
  if (t.includes('face') || t.includes('suit') || t.includes('which frame') || t.includes('which glass') || t.includes('shape')) {
    const detected = Object.keys(FACE_SHAPES).find(s => t.includes(s));
    if (detected) {
      const { advice, frames } = FACE_SHAPES[detected];
      const recs = products.filter(p => frames.includes(p.frameShape));
      return `For a ${detected} face: ${advice}\n\nA few from our collection:\n${bullets(recs)}`;
    }
    return [
      'Frame choice comes down to your face shape:',
      '• Oval — almost anything (aviator, wayfarer, cat-eye)',
      '• Round — angular frames: rectangle, square, wayfarer',
      '• Square — soft curves: round, oval, cat-eye',
      '• Heart — bottom-heavy/rounded: round, aviator',
      '• Diamond — cat-eye or oval to show cheekbones',
      '',
      "Which shape is closest to yours? Tell me and I'll suggest specific frames.",
    ].join('\n');
  }

  // Lens types
  if (word('lens') || word('lenses') || t.includes('single vision') || t.includes('bifocal') || t.includes('progressive') || t.includes('blue light') || t.includes('anti glare') || t.includes('anti-glare') || word('coating') || word('coatings')) {
    return [
      'Here are the lens options we offer:',
      '• **Single-vision** — one power throughout; everyday distance or reading (+₹399)',
      '• **Bifocal** — distance on top, reading below, with a visible line (+₹699)',
      '• **Progressive** — seamless multi-focal, no line, most natural (+₹999)',
      '• **Non-powered** — plano/zero power for sunglasses or fashion (free)',
      '',
      'Coatings you can add: anti-reflective, blue-light filter, UV400, polarized, and photochromic (auto-tint).',
    ].join('\n');
  }

  // Prescription
  if (word('prescription') || word('rx') || word('sph') || word('cyl') || word('axis') || word('pd') || t.includes('read my') || t.includes('my power')) {
    return [
      "Here's how to read your prescription:",
      '• **SPH** (Sphere) — main power. Minus = nearsighted, plus = farsighted',
      '• **CYL** (Cylinder) — astigmatism power',
      '• **AXIS** — astigmatism direction, 0–180°',
      '• **ADD** — reading addition (for bifocal/progressive)',
      '• **PD** — pupillary distance, used to centre the lenses',
      '',
      'When you pick a powered lens at checkout, you can upload a photo of your prescription or enter it manually.',
    ].join('\n');
  }

  // Eye-care tips
  if (t.includes('tip') || t.includes('eye care') || t.includes('strain') || t.includes('dry eye') || t.includes('screen time')) {
    return [
      'A few eye-care tips:',
      '• 20-20-20 rule — every 20 min, look 20 ft away for 20 sec',
      '• Keep screens about 50–60 cm from your eyes',
      '• Clean lenses with a microfiber cloth + lens spray (never tissues)',
      '• Store glasses in a hard case when not in use',
      '• Get an eye test at least once a year',
    ].join('\n');
  }

  // Best sellers / recommendations
  if (t.includes('best seller') || t.includes('bestseller') || word('popular') || word('recommend') || word('suggest') || word('trending') || t.includes('show me')) {
    const sellers = products.filter(p => p.isBestSeller);
    const list = sellers.length > 0 ? sellers : products.filter(p => p.isPremium);
    return `Our most-loved frames right now:\n${bullets(list, 5)}\n\nTap any in the Shop tab to see details or try them on.`;
  }

  // Price / budget
  const priceMatch = t.match(/(\d[\d,]{2,6})/);
  if (priceMatch || t.includes('budget') || word('cheap') || word('affordable') || t.includes('under') || t.includes('below')) {
    const max = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 1500;
    const within = products.filter(p => p.price <= max).sort((a, b) => a.price - b.price);
    return within.length > 0
      ? `Frames under ${fmt(max)}:\n${bullets(within, 5)}`
      : `I couldn't find frames under ${fmt(max)} — our most affordable options start a little higher:\n${bullets([...products].sort((a, b) => a.price - b.price), 3)}`;
  }

  // Category
  if (t.includes('sunglass')) {
    return `Our sunglasses:\n${bullets(products.filter(p => p.category === 'sunglasses'), 5)}`;
  }
  if (t.includes('eyeglass') || t.includes('spectacle') || word('specs')) {
    return `Our eyeglasses:\n${bullets(products.filter(p => p.category === 'eyeglasses'), 5)}`;
  }
  if (word('contact') || word('contacts')) {
    return `Our contact lenses:\n${bullets(products.filter(p => p.category === 'contacts'), 5)}`;
  }
  if (word('kid') || word('kids') || word('child') || word('children')) {
    return `Frames for kids:\n${bullets(products.filter(p => p.category === 'kids'), 5)}`;
  }

  // Virtual try-on
  if (t.includes('try on') || t.includes('try-on') || word('virtual')) {
    return "Many frames support Virtual Try-On — look for the 'Try On' badge on a product. Open a frame and tap **Virtual Try-On** to preview it (full AR camera is rolling out soon).";
  }

  // Store policies
  if (word('return') || word('returns') || word('exchange') || word('warranty')) {
    return 'We offer 14-day hassle-free returns and exchanges on all orders. All products are ISI certified.';
  }
  if (word('shipping') || word('delivery') || t.includes('how long')) {
    return 'Shipping is **free on orders above ₹999** (₹99 otherwise). Delivery usually takes 3–5 business days, with live tracking in the Account tab.';
  }
  if (word('emi') || t.includes('installment') || t.includes('instalment')) {
    return 'EMI is available on all orders, with 0% interest on major cards — starting around ₹83/month.';
  }

  // Fallback
  return [
    "I can help with eyewear specifically. Try asking me to:",
    '• Find frames for your face shape',
    '• Explain lens types or coatings',
    '• Help read your prescription',
    '• Show best sellers or frames in your budget',
    '• Share eye-care tips, or how returns & shipping work',
  ].join('\n');
}
