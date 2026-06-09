// Mock data shown in demo mode (no Supabase). Edits are in-memory only.
export interface DemoOrderItem {
  id: string;
  product_name: string;
  quantity: number;
}
export interface DemoOrder {
  id: string;
  status: string;
  total: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  order_items: DemoOrderItem[];
}
export interface DemoProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  original_price: number | null;
  stock_count: number;
  image: string;
}

const B = 'https://placehold.co';

export const DEMO_ORDERS: DemoOrder[] = [
  {
    id: 'demo-1001ab',
    status: 'confirmed',
    total: 2898,
    payment_method: 'upi',
    payment_status: 'paid',
    created_at: '2026-06-01T10:00:00Z',
    order_items: [{ id: 'i1', product_name: 'Allen Classic Round', quantity: 1 }],
  },
  {
    id: 'demo-1002cd',
    status: 'shipped',
    total: 3799,
    payment_method: 'card',
    payment_status: 'paid',
    created_at: '2026-05-30T10:00:00Z',
    order_items: [{ id: 'i2', product_name: 'Soleil Aviator Pro', quantity: 1 }],
  },
  {
    id: 'demo-1003ef',
    status: 'delivered',
    total: 899,
    payment_method: 'cod',
    payment_status: 'cod',
    created_at: '2026-05-28T10:00:00Z',
    order_items: [{ id: 'i3', product_name: 'Breeze Daily Contacts', quantity: 2 }],
  },
];

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: '1', name: 'Allen Classic Round', brand: 'AllenEyeCare', category: 'eyeglasses', price: 2499, original_price: 3999, stock_count: 100, image: `${B}/400x300/0D1B2A/C9A84C.png?text=Allen+Classic` },
  { id: '2', name: 'Soleil Aviator Pro', brand: 'AllenEyeCare', category: 'sunglasses', price: 3799, original_price: 5499, stock_count: 100, image: `${B}/400x300/1A1A2E/F59E0B.png?text=Soleil+Aviator` },
  { id: '5', name: 'Breeze Daily Contacts', brand: 'ClearView', category: 'contacts', price: 899, original_price: 1199, stock_count: 100, image: `${B}/400x300/E0F2FE/0284C7.png?text=Daily+Contacts` },
  { id: '6', name: 'Junior Flex Kids', brand: 'KidVision', category: 'kids', price: 1299, original_price: 1799, stock_count: 100, image: `${B}/400x300/FEF3C7/F59E0B.png?text=Kids+Flex` },
];
