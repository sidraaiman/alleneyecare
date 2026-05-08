import type { Product } from '../data/products';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; phone: string | null; full_name: string | null; points: number; push_token: string | null; created_at: string };
        Insert: { id: string; phone?: string | null; full_name?: string | null; points?: number; push_token?: string | null };
        Update: { phone?: string | null; full_name?: string | null; points?: number; push_token?: string | null };
      };
      products: {
        Row: {
          id: string; name: string; brand: string; category: string; price: number;
          original_price: number | null; rating: number; reviews: number; image: string;
          images: string[]; frame_shape: string; material: string; color: string;
          colors: string[]; gender: string; is_new: boolean; is_best_seller: boolean;
          is_premium: boolean; has_try_on: boolean; specs: Record<string, string>;
          description: string; tags: string[]; stock_count: number; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      cart_items: {
        Row: { id: string; user_id: string; product_id: string; quantity: number; lens_type: string; has_power: boolean; prescription: string | null; created_at: string };
        Insert: Omit<Database['public']['Tables']['cart_items']['Row'], 'id' | 'created_at'>;
        Update: { quantity?: number; lens_type?: string; has_power?: boolean; prescription?: string | null };
      };
      wishlists: {
        Row: { user_id: string; product_id: string; created_at: string };
        Insert: { user_id: string; product_id: string };
        Update: never;
      };
      orders: {
        Row: { id: string; user_id: string; status: OrderStatus; total: number; address: Record<string, string> | null; payment_method: string | null; created_at: string; updated_at: string };
        Insert: { user_id: string; status: OrderStatus; total: number; address?: Record<string, string>; payment_method?: string };
        Update: { status?: OrderStatus; updated_at?: string };
      };
      order_items: {
        Row: { id: string; order_id: string; product_id: string | null; product_name: string; product_image: string | null; quantity: number; lens_type: string | null; price: number };
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id'>;
        Update: never;
      };
    };
  };
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export function dbProductToApp(row: Database['public']['Tables']['products']['Row']): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category as Product['category'],
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    rating: row.rating,
    reviews: row.reviews,
    image: row.image,
    images: row.images,
    frameShape: row.frame_shape as Product['frameShape'],
    material: row.material as Product['material'],
    color: row.color,
    colors: row.colors,
    gender: row.gender as Product['gender'],
    isNew: row.is_new,
    isBestSeller: row.is_best_seller,
    isPremium: row.is_premium,
    hasTryOn: row.has_try_on,
    specs: row.specs as unknown as Product['specs'],
    description: row.description,
    tags: row.tags,
  };
}
