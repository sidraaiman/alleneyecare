import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { showOrderNotification } from '../services/notifications';
import type { OrderStatus } from '../lib/database.types';
import { IS_DEMO } from '../lib/config';

const DEMO_ORDERS: Order[] = [
  {
    id: 'demo-order-1',
    status: 'delivered',
    total: 2898,
    payment_method: 'upi',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    order_items: [{ id: '1', product_name: 'Allen Classic Round', product_image: 'https://placehold.co/400x300/0D1B2A/C9A84C.png?text=Allen+Classic', quantity: 1, lens_type: 'single-vision', price: 2898 }],
  },
  {
    id: 'demo-order-2',
    status: 'shipped',
    total: 3799,
    payment_method: 'card',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    order_items: [{ id: '2', product_name: 'Soleil Aviator Pro', product_image: 'https://placehold.co/400x300/1A1A2E/F59E0B.png?text=Soleil+Aviator', quantity: 1, lens_type: 'non-powered', price: 3799 }],
  },
];

export type { OrderStatus };

export interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  lens_type: string | null;
  price: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  payment_method: string | null;
  created_at: string;
  order_items: OrderItem[];
}

export interface PlaceOrderParams {
  items: { product_id: string; product_name: string; product_image: string; quantity: number; lens_type: string; price: number }[];
  total: number;
  paymentMethod: string;
  address: Record<string, string>;
  coupon?: string;
  redeemPoints?: number;
}

export function useOrders(userId: string | undefined) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (IS_DEMO) { setOrders(DEMO_ORDERS); setLoading(false); return; }
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) setOrders(data as Order[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (IS_DEMO) { fetchOrders(); return; }
    if (!userId) { setLoading(false); return; }

    fetchOrders();

    // Realtime: live order status updates.
    // Unique topic per hook instance — useOrders mounts on several screens, and a
    // shared topic makes the 2nd subscriber reuse an already-subscribed channel
    // (".on() after subscribe()" crash).
    const channel = supabase
      .channel(`orders-${userId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as { id: string; status: OrderStatus };
          setOrders(prev =>
            prev.map(o => (o.id === updated.id ? { ...o, status: updated.status } : o))
          );
          showOrderNotification(updated.status, updated.id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchOrders]);

  const placeOrder = useCallback(async (params: PlaceOrderParams): Promise<Order> => {
    if (IS_DEMO) {
      const demoOrder: Order = {
        id: `demo-${Date.now()}`,
        status: 'confirmed',
        total: params.total,
        payment_method: params.paymentMethod,
        created_at: new Date().toISOString(),
        order_items: params.items.map((item, i) => ({
          id: `di-${i}`,
          product_name: item.product_name,
          product_image: item.product_image,
          quantity: item.quantity,
          lens_type: item.lens_type,
          price: item.price,
        })),
      };
      setOrders(prev => [demoOrder, ...prev]);
      return demoOrder;
    }
    if (!userId) throw new Error('Not authenticated');

    // Server-authoritative: the DB recomputes prices/total from products +
    // lens_options, validates stock, and decrements it atomically. The client
    // only supplies product_id / lens_type / quantity — never prices.
    // Used for COD (and demo). Online (Razorpay) orders are created server-side
    // by the razorpay-verify edge function after the payment signature is checked.
    const isCod = params.paymentMethod === 'cod';
    const rpcParams: Record<string, unknown> = {
      p_items: params.items.map(i => ({
        product_id: i.product_id,
        lens_type: i.lens_type,
        quantity: i.quantity,
      })),
      p_payment_method: params.paymentMethod,
      p_address: params.address,
      p_payment_id: null,
      p_payment_status: isCod ? 'cod' : 'pending',
      p_coupon: params.coupon ?? null,
    };
    // Only send p_redeem_points when actually redeeming. Omitting it lets the call
    // match the pre-points place_order signature too, so checkout keeps working on
    // databases that haven't run the loyalty-points migration yet.
    if ((params.redeemPoints ?? 0) > 0) rpcParams.p_redeem_points = params.redeemPoints;
    const { data: orderId, error } = await (supabase.rpc as any)('place_order', rpcParams);
    if (error) throw error;

    await fetchOrders();
    return {
      id: orderId as string,
      status: 'confirmed',
      total: params.total,
      payment_method: params.paymentMethod,
      created_at: new Date().toISOString(),
      order_items: [],
    };
  }, [userId, fetchOrders]);

  return { orders, loading, placeOrder, refresh: fetchOrders };
}
