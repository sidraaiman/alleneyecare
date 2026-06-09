'use client';
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabase';
import { IS_DEMO } from '@/lib/config';
import { DEMO_PRODUCTS } from '@/lib/demoData';

const CATEGORIES = ['eyeglasses', 'sunglasses', 'contacts', 'kids'];

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  original_price: number | null;
  stock_count: number;
  image: string;
}

const BLANK = { name: '', brand: '', category: 'eyeglasses', price: 0, stock_count: 100 };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ ...BLANK });

  const load = useCallback(async () => {
    if (IS_DEMO) {
      setProducts(DEMO_PRODUCTS as Product[]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('products')
      .select('id, name, brand, category, price, original_price, stock_count, image')
      .order('created_at', { ascending: true });
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function patch(id: string, field: keyof Product, value: string | number) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  async function saveRow(p: Product) {
    setSavingId(p.id);
    setError('');
    if (IS_DEMO) {
      // Edits are already applied to local state via patch(); nothing to persist.
      setSavingId(null);
      return;
    }
    const { error } = await supabase
      .from('products')
      .update({ price: Number(p.price), stock_count: Number(p.stock_count), image: p.image })
      .eq('id', p.id);
    if (error) setError(error.message);
    setSavingId(null);
  }

  async function uploadFor(productId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${productId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  }

  async function onUpload(p: Product, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingId(p.id);
    setError('');
    try {
      if (IS_DEMO) {
        patch(p.id, 'image', URL.createObjectURL(file)); // local preview only
      } else {
        const url = await uploadFor(p.id, file);
        await supabase.from('products').update({ image: url }).eq('id', p.id);
        patch(p.id, 'image', url);
      }
    } catch (err) {
      setError((err as Error).message);
    }
    setSavingId(null);
  }

  async function fetchPexels(p: Product) {
    setSavingId(p.id);
    setError('');
    if (IS_DEMO) { setError('Pexels requires the live backend (demo mode).'); setSavingId(null); return; }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: e } = await supabase.functions.invoke('pexels-search', { body: { query: `${p.name} ${p.category} eyewear`, per_page: 1 } });
      const url = (data as any)?.photos?.[0]?.src;
      if (e || !url) { setError('No Pexels image found'); setSavingId(null); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('products').update({ image: url } as any).eq('id', p.id);
      patch(p.id, 'image', url);
    } catch (err) {
      setError((err as Error).message);
    }
    setSavingId(null);
  }

  async function addProduct() {
    if (!form.name || !form.brand) {
      setError('Name and brand are required');
      return;
    }
    setBusy(true);
    setError('');
    const id = (globalThis.crypto?.randomUUID?.() ?? `p_${Date.now()}`).slice(0, 36);
    if (IS_DEMO) {
      setProducts((prev) => [
        { id, name: form.name, brand: form.brand, category: form.category, price: Number(form.price), original_price: null, stock_count: Number(form.stock_count), image: '' },
        ...prev,
      ]);
      setBusy(false);
      setForm({ ...BLANK });
      return;
    }
    const { error } = await supabase.from('products').insert({
      id,
      name: form.name,
      brand: form.brand,
      category: form.category,
      price: Number(form.price),
      stock_count: Number(form.stock_count),
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForm({ ...BLANK });
    load();
  }

  return (
    <Shell>
      <h1>Products</h1>
      {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="card" style={{ width: '100%', marginBottom: 24 }}>
        <h2>Add product</h2>
        <div className="grid2">
          <div>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label>Brand</label>
            <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>
          <div>
            <label>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>Price (₹)</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </div>
          <div>
            <label>Stock</label>
            <input type="number" value={form.stock_count} onChange={(e) => setForm({ ...form, stock_count: Number(e.target.value) })} />
          </div>
        </div>
        <button disabled={busy} onClick={addProduct} style={{ alignSelf: 'flex-start' }}>
          {busy ? 'Adding…' : 'Add product'}
        </button>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Upload an image from the table after creating.</p>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Price (₹)</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image ? <img className="thumb" src={p.image} alt={p.name} /> : <div className="thumb" />}
                  <input type="file" accept="image/*" onChange={(e) => onUpload(p, e)} style={{ fontSize: 11, marginTop: 4 }} />
                  <button className="secondary" style={{ fontSize: 11, marginTop: 4 }} onClick={() => fetchPexels(p)}>Pexels</button>
                </td>
                <td>
                  {p.name}
                  <br />
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{p.brand} · {p.category}</span>
                </td>
                <td style={{ width: 110 }}>
                  <input type="number" value={p.price} onChange={(e) => patch(p.id, 'price', Number(e.target.value))} />
                </td>
                <td style={{ width: 90 }}>
                  <input type="number" value={p.stock_count} onChange={(e) => patch(p.id, 'stock_count', Number(e.target.value))} />
                </td>
                <td>
                  <button disabled={savingId === p.id} onClick={() => saveRow(p)}>
                    {savingId === p.id ? 'Saving…' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
