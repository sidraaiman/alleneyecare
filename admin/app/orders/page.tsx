'use client';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabase';
import { IS_DEMO } from '@/lib/config';
import { DEMO_ORDERS } from '@/lib/demoData';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
}
interface Order {
  id: string;
  status: string;
  total: number;
  payment_method: string | null;
  payment_status: string;
  created_at: string;
  order_items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (IS_DEMO) {
      setOrders(DEMO_ORDERS as Order[]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('orders')
      .select('id, status, total, payment_method, payment_status, created_at, order_items(id, product_name, quantity)')
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, status: string) {
    setSavingId(id);
    if (IS_DEMO) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      setSavingId(null);
      return;
    }
    await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setSavingId(null);
    load();
  }

  return (
    <Shell>
      <h1>Orders</h1>
      {loading ? (
        <p>Loading…</p>
      ) : orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  #{o.id.slice(0, 8).toUpperCase()}
                  <br />
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {new Date(o.created_at).toLocaleDateString()}
                  </span>
                </td>
                <td>
                  {o.order_items?.map((i) => `${i.product_name} ×${i.quantity}`).join(', ') || '—'}
                </td>
                <td>₹{o.total?.toLocaleString()}</td>
                <td>
                  <span className="pill">{o.payment_status}</span>
                  <br />
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{o.payment_method ?? ''}</span>
                </td>
                <td>
                  <select
                    value={o.status}
                    disabled={savingId === o.id}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
