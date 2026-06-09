import type { Product } from '../data/products';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; phone: string | null; full_name: string | null; points: number; push_token: string | null; is_admin: boolean; created_at: string };
        Insert: { id: string; phone?: string | null; full_name?: string | null; points?: number; push_token?: string | null; is_admin?: boolean };
        Update: { phone?: string | null; full_name?: string | null; points?: number; push_token?: string | null; is_admin?: boolean };
      };
      lens_options: {
        Row: { type: string; label: string; price: number; vision_type: string; tier: string; description: string };
        Insert: { type: string; label: string; price?: number; vision_type?: string; tier?: string; description?: string };
        Update: { label?: string; price?: number; vision_type?: string; tier?: string; description?: string };
      };
      prescriptions: {
        Row: { id: string; user_id: string; name: string; r_sph: number | null; r_cyl: number | null; r_axis: number | null; r_add: number | null; l_sph: number | null; l_cyl: number | null; l_axis: number | null; l_add: number | null; pd: number | null; image_url: string | null; created_at: string };
        Insert: { user_id: string; name: string; r_sph?: number | null; r_cyl?: number | null; r_axis?: number | null; r_add?: number | null; l_sph?: number | null; l_cyl?: number | null; l_axis?: number | null; l_add?: number | null; pd?: number | null; image_url?: string | null };
        Update: { name?: string; r_sph?: number | null; r_cyl?: number | null; r_axis?: number | null; r_add?: number | null; l_sph?: number | null; l_cyl?: number | null; l_axis?: number | null; l_add?: number | null; pd?: number | null; image_url?: string | null };
      };
      products: {
        Row: {
          id: string; name: string; brand: string; category: string; price: number;
          original_price: number | null; rating: number; reviews: number; image: string;
          images: string[]; frame_shape: string; material: string; color: string;
          colors: string[]; gender: string; is_new: boolean; is_best_seller: boolean;
          is_premium: boolean; has_try_on: boolean; specs: Record<string, string>;
          description: string; tags: string[]; stock_count: number;
          frame_size: string | null; face_shapes: string[]; created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'created_at' | 'frame_size' | 'face_shapes'>
          & { frame_size?: string | null; face_shapes?: string[] };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      events: {
        Row: { id: string; user_id: string | null; type: string; product_id: string | null; created_at: string };
        Insert: { user_id?: string | null; type: string; product_id?: string | null };
        Update: never;
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
        Row: { id: string; user_id: string; status: OrderStatus; total: number; discount: number; coupon: string | null; points_earned: number; points_redeemed: number; address: Record<string, string> | null; payment_method: string | null; payment_id: string | null; payment_status: string; created_at: string; updated_at: string };
        Insert: { user_id: string; status: OrderStatus; total: number; discount?: number; coupon?: string | null; address?: Record<string, string>; payment_method?: string; payment_id?: string; payment_status?: string };
        Update: { status?: OrderStatus; payment_id?: string; payment_status?: string; updated_at?: string };
      };
      memberships: {
        Row: { user_id: string; tier: string; active: boolean; started_at: string; expires_at: string | null };
        Insert: { user_id: string; tier?: string; active?: boolean; expires_at?: string | null };
        Update: { tier?: string; active?: boolean; expires_at?: string | null };
      };
      coupons: {
        Row: { code: string; type: string; value: number; min_subtotal: number; active: boolean; expires_at: string | null };
        Insert: { code: string; type?: string; value: number; min_subtotal?: number; active?: boolean; expires_at?: string | null };
        Update: { type?: string; value?: number; min_subtotal?: number; active?: boolean; expires_at?: string | null };
      };
      reviews: {
        Row: { id: string; product_id: string; user_id: string; rating: number; title: string | null; body: string | null; verified_purchase: boolean; created_at: string };
        Insert: { product_id: string; user_id: string; rating: number; title?: string | null; body?: string | null };
        Update: { rating?: number; title?: string | null; body?: string | null };
      };
      return_requests: {
        Row: { id: string; order_id: string; user_id: string; reason: string | null; status: string; created_at: string };
        Insert: { order_id: string; user_id: string; reason?: string | null; status?: string };
        Update: { status?: string };
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
    stockCount: row.stock_count,
  };
}
