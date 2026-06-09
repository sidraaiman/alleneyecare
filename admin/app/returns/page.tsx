'use client';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabase';
import { IS_DEMO } from '@/lib/config';

const STATUSES = ['requested', 'approved', 'rejected', 'completed'];

interface ReturnRow { id: string; order_id: string; reason: string | null; status: string; created_at: string }

const DEMO: ReturnRow[] = [
  { id: 'd1', order_id: 'demo-1001ab', reason: 'Wrong size', status: 'requested', created_at: '2026-06-02T00:00:00Z' },
];

export default function ReturnsPage() {
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (IS_DEMO) { setRows(DEMO); return; }
    const { data } = await supabase
      .from('return_requests')
      .select('id, order_id, reason, status, created_at')
      .order('created_at', { ascending: false });
    setRows((data as ReturnRow[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    setSavingId(id);
    if (IS_DEMO) { setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r))); setSavingId(null); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('return_requests').update({ status } as any).eq('id', id);
    setSavingId(null);
    load();
  }

  return (
    <Shell>
      <h1>Return requests</h1>
      {rows.length === 0 ? (
        <p>No return requests.</p>
      ) : (
        <table>
          <thead><tr><th>Order</th><th>Reason</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>#{r.order_id.slice(0, 8).toUpperCase()}</td>
                <td>{r.reason ?? '—'}</td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                <td>
                  <select value={r.status} disabled={savingId === r.id} onChange={(e) => setStatus(r.id, e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
