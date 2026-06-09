// Client-side lens catalog for display. The server (lens_options table +
// compute_order_amount) remains authoritative for the charged price; these rows
// mirror the seeds in supabase/schema.sql so demo mode and labels stay correct.
export type VisionType = 'non-powered' | 'single-vision' | 'bifocal' | 'progressive';

export interface LensPackage {
  type: string; // unique key — also stored as the cart line's lensType
  visionType: VisionType;
  label: string; // tier label
  tier: string;
  price: number;
  description: string;
  requiresPower: boolean;
}

export const VISION_TYPES: { key: VisionType; label: string; desc: string; icon: string }[] = [
  { key: 'non-powered', label: 'Non-Powered', desc: 'Plano / zero power — sunglasses or fashion', icon: 'sunny-outline' },
  { key: 'single-vision', label: 'Single Vision', desc: 'One power throughout — distance or reading', icon: 'eye-outline' },
  { key: 'bifocal', label: 'Bifocal', desc: 'Distance + reading, with a visible line', icon: 'contrast-outline' },
  { key: 'progressive', label: 'Progressive', desc: 'Seamless multi-focal, no line', icon: 'layers-outline' },
];

const VISION_LABEL: Record<VisionType, string> = {
  'non-powered': 'Non-Powered',
  'single-vision': 'Single Vision',
  bifocal: 'Bifocal',
  progressive: 'Progressive',
};

export const LENS_PACKAGES: LensPackage[] = [
  { type: 'non-powered', visionType: 'non-powered', label: 'Plano (No Power)', tier: 'Standard', price: 0, description: 'Zero-power lenses for sunglasses or fashion frames.', requiresPower: false },
  { type: 'non-powered-blu', visionType: 'non-powered', label: 'Blue-Cut Plano', tier: 'Blue-cut', price: 299, description: 'Zero power with a blue-light filter.', requiresPower: false },

  { type: 'single-vision', visionType: 'single-vision', label: 'Standard', tier: 'Standard', price: 399, description: 'Anti-reflective single-vision lenses.', requiresPower: true },
  { type: 'single-vision-blu', visionType: 'single-vision', label: 'Blue-Cut', tier: 'Blue-cut', price: 799, description: 'AR + blue-light filter for screen use.', requiresPower: true },
  { type: 'single-vision-thin', visionType: 'single-vision', label: 'Thin (High-Index)', tier: 'Thin', price: 1299, description: 'Lightweight high-index, AR + blue-light.', requiresPower: true },

  { type: 'bifocal', visionType: 'bifocal', label: 'Standard', tier: 'Standard', price: 699, description: 'Bifocal lenses with anti-reflective coating.', requiresPower: true },
  { type: 'bifocal-blu', visionType: 'bifocal', label: 'Blue-Cut', tier: 'Blue-cut', price: 1099, description: 'Bifocal with AR + blue-light filter.', requiresPower: true },

  { type: 'progressive', visionType: 'progressive', label: 'Standard', tier: 'Standard', price: 999, description: 'No-line progressive with AR coating.', requiresPower: true },
  { type: 'progressive-premium', visionType: 'progressive', label: 'Premium', tier: 'Premium', price: 1999, description: 'Wide-field premium progressive, AR + blue-light.', requiresPower: true },
];

export const LENS_BY_TYPE: Record<string, LensPackage> = Object.fromEntries(
  LENS_PACKAGES.map((l) => [l.type, l])
);

export function packagesForVision(v: VisionType): LensPackage[] {
  return LENS_PACKAGES.filter((l) => l.visionType === v);
}

export function lensLabel(type: string): string {
  const l = LENS_BY_TYPE[type];
  if (!l) return type;
  return l.tier === 'Standard' ? VISION_LABEL[l.visionType] : `${VISION_LABEL[l.visionType]} · ${l.tier}`;
}

export function lensPrice(type: string): number {
  return LENS_BY_TYPE[type]?.price ?? 0;
}

export function lensRequiresPower(type: string): boolean {
  return LENS_BY_TYPE[type]?.requiresPower ?? false;
}
