export type Category = 'eyeglasses' | 'sunglasses' | 'contacts' | 'kids';
export type Gender = 'men' | 'women' | 'unisex' | 'kids';
export type FrameShape = 'round' | 'rectangle' | 'square' | 'cat-eye' | 'aviator' | 'oval' | 'wayfarer';
export type Material = 'acetate' | 'titanium' | 'stainless-steel' | 'tr90' | 'silicon';

export interface ProductSpecs {
  size: string;
  weight: string;
  lensWidth: string;
  bridgeWidth: string;
  templeLength: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  images: string[];
  frameShape: FrameShape;
  material: Material;
  color: string;
  colors: string[];
  gender: Gender;
  isNew?: boolean;
  isBestSeller?: boolean;
  isPremium?: boolean;
  hasTryOn?: boolean;
  specs: ProductSpecs;
  description: string;
  tags: string[];
  stockCount?: number;
}

const BASE = 'https://placehold.co';

// Curated, human-verified eyewear photos on the Unsplash CDN (stable static files,
// fast, always 200). Each id below was visually confirmed to be eyewear.
const eye = (id: string, n = 700) => `https://images.unsplash.com/photo-${id}?w=${n}&h=${n}&fit=crop&q=80`;
const EYE = {
  glassesBrowline: '1574258495973-f010dfbb5371', // tortoise browline on book
  glassesWood:     '1591076482161-42ce6da69f67', // browline on wood
  glassesWorn:     '1633332755192-727a05c4013d', // round eyeglasses, worn
  sunBlack:        '1572635196237-14b3f281503f', // black wayfarer
  sunGold:         '1511499767150-a48a237f0083', // gold round
  sunClear:        '1577803645773-f96470509666', // clear frame, beach
  sunSand:         '1473496169904-658ba7c44d8a', // round on sand
  sunCat:          '1508296695146-257a814070b4', // rose cat-eye
  sunTortoise:     '1577744486770-020ab432da65', // tortoise by pool
  sunWoman:        '1556015048-4d3aa10df74c',     // oversized, worn
};

export const products: Product[] = [
  {
    id: '1',
    name: 'Allen Classic Round',
    brand: 'AllenEyeCare',
    category: 'eyeglasses',
    price: 2499,
    originalPrice: 3999,
    rating: 4.8,
    reviews: 342,
    image: eye(EYE.glassesBrowline),
    images: [eye(EYE.glassesBrowline), eye(EYE.glassesWood), eye(EYE.glassesWorn)],
    frameShape: 'round',
    material: 'acetate',
    color: 'Midnight Black',
    colors: ['#1C1C1E', '#8B4513', '#2F4F4F'],
    gender: 'unisex',
    isNew: false,
    isBestSeller: true,
    hasTryOn: true,
    specs: { size: 'Medium', weight: '18g', lensWidth: '50mm', bridgeWidth: '20mm', templeLength: '145mm' },
    description: 'Timeless round frames crafted from premium Italian acetate. Perfect for everyday sophistication.',
    tags: ['bestseller', 'round', 'unisex'],
  },
  {
    id: '2',
    name: 'Soleil Aviator Pro',
    brand: 'AllenEyeCare',
    category: 'sunglasses',
    price: 3799,
    originalPrice: 5499,
    rating: 4.9,
    reviews: 521,
    image: eye(EYE.sunSand),
    images: [eye(EYE.sunSand), eye(EYE.sunGold), eye(EYE.sunBlack)],
    frameShape: 'aviator',
    material: 'titanium',
    color: 'Gold',
    colors: ['#C9A84C', '#1C1C1E', '#C0C0C0'],
    gender: 'unisex',
    isNew: true,
    isPremium: true,
    hasTryOn: true,
    specs: { size: 'Large', weight: '22g', lensWidth: '58mm', bridgeWidth: '14mm', templeLength: '140mm' },
    description: 'Premium titanium aviators with UV400 polarized lenses. Your summer essential.',
    tags: ['premium', 'aviator', 'polarized'],
  },
  {
    id: '3',
    name: 'Lumière Cat-Eye',
    brand: 'Lumière',
    category: 'eyeglasses',
    price: 1899,
    originalPrice: 2799,
    rating: 4.7,
    reviews: 218,
    image: eye(EYE.sunCat),
    images: [eye(EYE.sunCat), eye(EYE.glassesBrowline), eye(EYE.glassesWood)],
    frameShape: 'cat-eye',
    material: 'acetate',
    color: 'Violet Blush',
    colors: ['#7C3AED', '#EC4899', '#1C1C1E'],
    gender: 'women',
    isNew: true,
    hasTryOn: true,
    specs: { size: 'Small', weight: '15g', lensWidth: '48mm', bridgeWidth: '18mm', templeLength: '140mm' },
    description: 'Bold cat-eye frames that frame your face with elegance. Inspired by Parisian fashion.',
    tags: ['cat-eye', 'women', 'bold'],
  },
  {
    id: '4',
    name: 'Executive Rectangle',
    brand: 'AllenEyeCare',
    category: 'eyeglasses',
    price: 2199,
    originalPrice: 3299,
    rating: 4.6,
    reviews: 189,
    image: eye(EYE.glassesWood),
    images: [eye(EYE.glassesWood), eye(EYE.glassesWorn), eye(EYE.glassesBrowline)],
    frameShape: 'rectangle',
    material: 'titanium',
    color: 'Silver Chrome',
    colors: ['#C0C0C0', '#1C1C1E', '#C9A84C'],
    gender: 'men',
    isBestSeller: true,
    specs: { size: 'Large', weight: '16g', lensWidth: '54mm', bridgeWidth: '18mm', templeLength: '145mm' },
    description: 'Precision-engineered titanium frames for the modern professional. Ultra-lightweight.',
    tags: ['office', 'men', 'titanium'],
  },
  {
    id: '5',
    name: 'Breeze Daily Contacts',
    brand: 'ClearView',
    category: 'contacts',
    price: 899,
    originalPrice: 1199,
    rating: 4.5,
    reviews: 876,
    image: eye(EYE.sunGold),
    images: [eye(EYE.sunGold), eye(EYE.glassesWorn), eye(EYE.glassesBrowline)],
    frameShape: 'round',
    material: 'silicon',
    color: 'Clear',
    colors: ['#E0F2FE'],
    gender: 'unisex',
    isBestSeller: true,
    specs: { size: '14.0mm', weight: '0g', lensWidth: '14mm', bridgeWidth: '0mm', templeLength: '0mm' },
    description: 'Ultra-comfortable daily disposable lenses with 55% water content. 30 lens pack.',
    tags: ['daily', 'contacts', 'comfortable'],
  },
  {
    id: '6',
    name: 'Junior Flex Kids',
    brand: 'KidVision',
    category: 'kids',
    price: 1299,
    originalPrice: 1799,
    rating: 4.8,
    reviews: 134,
    image: eye(EYE.glassesWorn),
    images: [eye(EYE.glassesWorn), eye(EYE.sunCat), eye(EYE.glassesBrowline)],
    frameShape: 'oval',
    material: 'tr90',
    color: 'Sunny Yellow',
    colors: ['#F59E0B', '#EF4444', '#3B82F6', '#10B981'],
    gender: 'kids',
    isNew: true,
    specs: { size: 'Kids S', weight: '12g', lensWidth: '44mm', bridgeWidth: '16mm', templeLength: '125mm' },
    description: 'Flexible, unbreakable TR90 frames designed for active kids. Spring hinges for durability.',
    tags: ['kids', 'flexible', 'unbreakable'],
  },
  {
    id: '7',
    name: 'Havana Wayfarer Classic',
    brand: 'RayStyle',
    category: 'sunglasses',
    price: 2899,
    originalPrice: 4199,
    rating: 4.7,
    reviews: 445,
    image: eye(EYE.sunTortoise),
    images: [eye(EYE.sunTortoise), eye(EYE.sunBlack), eye(EYE.sunClear)],
    frameShape: 'wayfarer',
    material: 'acetate',
    color: 'Havana Tortoise',
    colors: ['#78350F', '#1C1C1E', '#7C3AED'],
    gender: 'unisex',
    isBestSeller: true,
    hasTryOn: true,
    specs: { size: 'Medium', weight: '24g', lensWidth: '52mm', bridgeWidth: '18mm', templeLength: '145mm' },
    description: 'Iconic wayfarer silhouette in premium havana acetate. A timeless wardrobe staple.',
    tags: ['wayfarer', 'classic', 'sunglasses'],
  },
  {
    id: '8',
    name: 'Zen Oval Rimless',
    brand: 'AllenEyeCare',
    category: 'eyeglasses',
    price: 3299,
    rating: 4.9,
    reviews: 92,
    image: eye(EYE.glassesWorn),
    images: [eye(EYE.glassesWorn), eye(EYE.glassesWood), eye(EYE.glassesBrowline)],
    frameShape: 'oval',
    material: 'titanium',
    color: 'Crystal Clear',
    colors: ['#C0C0C0', '#C9A84C'],
    gender: 'unisex',
    isPremium: true,
    hasTryOn: true,
    specs: { size: 'Medium', weight: '10g', lensWidth: '51mm', bridgeWidth: '17mm', templeLength: '140mm' },
    description: 'Ultra-lightweight rimless design. Barely-there frames that let your face shine.',
    tags: ['rimless', 'premium', 'lightweight'],
  },
  {
    id: '9',
    name: 'Night Shield Blue Light',
    brand: 'ScreenGuard',
    category: 'eyeglasses',
    price: 1599,
    originalPrice: 2299,
    rating: 4.4,
    reviews: 567,
    image: eye(EYE.glassesWood),
    images: [eye(EYE.glassesWood), eye(EYE.glassesBrowline), eye(EYE.glassesWorn)],
    frameShape: 'rectangle',
    material: 'tr90',
    color: 'Navy Blue',
    colors: ['#1E3A5F', '#1C1C1E', '#374151'],
    gender: 'unisex',
    isNew: false,
    isBestSeller: true,
    specs: { size: 'Medium', weight: '14g', lensWidth: '52mm', bridgeWidth: '17mm', templeLength: '140mm' },
    description: 'Advanced blue-light filtering lenses for screen protection. Reduce eye strain by 60%.',
    tags: ['blue-light', 'screen', 'work-from-home'],
  },
  {
    id: '10',
    name: 'Monarch Hexagonal',
    brand: 'AllenEyeCare',
    category: 'sunglasses',
    price: 4599,
    rating: 5.0,
    reviews: 47,
    image: eye(EYE.sunBlack),
    images: [eye(EYE.sunBlack), eye(EYE.sunGold), eye(EYE.sunSand)],
    frameShape: 'round',
    material: 'titanium',
    color: 'Gold Black',
    colors: ['#C9A84C', '#1C1C1E'],
    gender: 'men',
    isPremium: true,
    isNew: true,
    hasTryOn: true,
    specs: { size: 'Large', weight: '19g', lensWidth: '55mm', bridgeWidth: '15mm', templeLength: '145mm' },
    description: 'Hexagonal titanium masterpiece. Hand-crafted for those who define elegance.',
    tags: ['premium', 'luxury', 'exclusive'],
  },
  {
    id: '11',
    name: 'Flora Round Women',
    brand: 'Lumière',
    category: 'eyeglasses',
    price: 1699,
    originalPrice: 2499,
    rating: 4.6,
    reviews: 203,
    image: eye(EYE.sunWoman),
    images: [eye(EYE.sunWoman), eye(EYE.glassesBrowline), eye(EYE.sunCat)],
    frameShape: 'round',
    material: 'acetate',
    color: 'Rose Blush',
    colors: ['#EC4899', '#9CA3AF', '#C9A84C'],
    gender: 'women',
    isNew: true,
    hasTryOn: true,
    specs: { size: 'Small', weight: '14g', lensWidth: '47mm', bridgeWidth: '17mm', templeLength: '135mm' },
    description: 'Delicately crafted round frames with floral-inspired acetate patterns.',
    tags: ['women', 'round', 'floral'],
  },
  {
    id: '12',
    name: 'Sport Wrap Active',
    brand: 'AthleteVision',
    category: 'sunglasses',
    price: 2199,
    originalPrice: 3199,
    rating: 4.5,
    reviews: 312,
    image: eye(EYE.sunClear),
    images: [eye(EYE.sunClear), eye(EYE.sunSand), eye(EYE.sunTortoise)],
    frameShape: 'oval',
    material: 'tr90',
    color: 'Racing Green',
    colors: ['#052E16', '#1C1C1E', '#DC2626'],
    gender: 'unisex',
    isBestSeller: true,
    specs: { size: 'Large', weight: '28g', lensWidth: '62mm', bridgeWidth: '12mm', templeLength: '130mm' },
    description: 'Aerodynamic wrap-around frames with polarized sport lenses. Built for performance.',
    tags: ['sport', 'polarized', 'active'],
  },
];

export const categories = [
  { id: 'eyeglasses', label: 'Eyeglasses', emoji: '🕶️', color: '#0D1B2A', textColor: '#C9A84C', image: `${BASE}/200x200/0D1B2A/C9A84C.png?text=👓` },
  { id: 'sunglasses', label: 'Sunglasses', emoji: '😎', color: '#78350F', textColor: '#FEF3C7', image: `${BASE}/200x200/78350F/FEF3C7.png?text=😎` },
  { id: 'contacts', label: 'Contacts', emoji: '👁️', color: '#0369A1', textColor: '#E0F2FE', image: `${BASE}/200x200/0369A1/E0F2FE.png?text=👁️` },
  { id: 'kids', label: 'Kids', emoji: '🌟', color: '#D97706', textColor: '#FEF3C7', image: `${BASE}/200x200/D97706/FEF3C7.png?text=🌟` },
];

export const brands = ['AllenEyeCare', 'Lumière', 'RayStyle', 'ClearView', 'KidVision', 'ScreenGuard', 'AthleteVision'];

export const getProductById = (id: string) => products.find(p => p.id === id);
export const getProductsByCategory = (cat: Category) => products.filter(p => p.category === cat);
export const getFeatured = () => products.filter(p => p.isBestSeller || p.isPremium).slice(0, 6);
export const getNewArrivals = () => products.filter(p => p.isNew).slice(0, 6);
