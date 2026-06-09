'use client';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabase';
import { IS_DEMO } from '@/lib/config';

interface Coupon { code: string; type: string; value: number; min_subtotal: number; active: boolean }

const DEMO: Coupon[] = [
  { code: 'WELCOME10', type: 'percent', value: 10, min_subtotal: 999, active: true },
  { code: 'FLAT200', type: 'flat', value: 200, min_subtotal: 1999, active: true },
];

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState({ code: '', type: 'percent', value: 10, min_subtotal: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (IS_DEMO) { setCoupons(DEMO); return; }
    const { data } = await supabase.from('coupons').select('code, type, value, min_subtotal, active').order('code');
    setCoupons((data as Coupon[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.code.trim()) { setError('Code is required'); return; }
    setBusy(true);
    setError('');
    const row = { code: form.code.trim().toUpperCase(), type: form.type, value: Number(form.value), min_subtotal: Number(form.min_subtotal), active: true };
    if (IS_DEMO) {
      setCoupons((prev) => [row, ...prev.filter((c) => c.code !== row.code)]);
      setBusy(false);
      setForm({ code: '', type: 'percent', value: 10, min_subtotal: 0 });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: e } = await supabase.from('coupons').upsert(row as any);
    setBusy(false);
    if (e) setError(e.message);
    else { setForm({ code: '', type: 'percent', value: 10, min_subtotal: 0 }); load(); }
  }

  async function toggle(c: Coupon) {
    if (IS_DEMO) { setCoupons((prev) => prev.map((x) => (x.code === c.code ? { ...x, active: !x.active } : x))); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('coupons').update({ active: !c.active } as any).eq('code', c.code);
    load();
  }

  return (
    <Shell>
      <h1>Coupons</h1>
      {error && <p className="err">{error}</p>}
      <div className="card" style={{ width: '100%', marginBottom: 24 }}>
        <h2>Add / update coupon</h2>
        <div className="grid2">
          <div><label>Code</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SUMMER15" /></div>
          <div><label>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="percent">percent (%)</option>
              <option value="flat">flat (₹)</option>
            </select>
          </div>
          <div><label>Value</label><input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
          <div><label>Min subtotal (₹)</label><input type="number" value={form.min_subtotal} onChange={(e) => setForm({ ...form, min_subtotal: Number(e.target.value) })} /></div>
        </div>
        <button disabled={busy} onClick={add} style={{ alignSelf: 'flex-start' }}>{busy ? 'Saving…' : 'Save coupon'}</button>
      </div>

      <table>
        <thead><tr><th>Code</th><th>Discount</th><th>Min</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c.code}>
              <td><b>{c.code}</b></td>
              <td>{c.type === 'percent' ? `${c.value}%` : `₹${c.value}`}</td>
              <td>₹{c.min_subtotal}</td>
              <td><span className="pill">{c.active ? 'active' : 'inactive'}</span></td>
              <td><button className="secondary" onClick={() => toggle(c)}>{c.active ? 'Disable' : 'Enable'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}
