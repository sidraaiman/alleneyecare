'use client';
import { useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabase';
import { IS_DEMO } from '@/lib/config';

type Row = Record<string, unknown>;

const NUMERIC = new Set(['price', 'original_price', 'rating', 'reviews', 'stock_count']);
const ARRAYS = new Set(['images', 'colors', 'tags', 'face_shapes']);

function parseInput(text: string, format: 'json' | 'csv'): Row[] {
  if (format === 'json') {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('JSON must be an array of product objects.');
    return data as Row[];
  }
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV needs a header row plus at least one data row.');
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row: Row = {};
    headers.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
    return row;
  });
}

// Coerce string cells (from CSV) into numbers / arrays. Array fields use "|".
function coerce(row: Row): Row {
  const out: Row = { ...row };
  for (const k of Object.keys(out)) {
    if (NUMERIC.has(k) && typeof out[k] === 'string' && out[k] !== '') out[k] = Number(out[k]);
    if (ARRAYS.has(k) && typeof out[k] === 'string') {
      const s = (out[k] as string).trim();
      out[k] = s ? s.split('|').map((x) => x.trim()).filter(Boolean) : [];
    }
  }
  return out;
}

const SAMPLE = `[
  {
    "id": "100",
    "name": "Aviator Gold",
    "brand": "AllenEyeCare",
    "category": "sunglasses",
    "price": 2999,
    "original_price": 3999,
    "image": "https://...",
    "images": ["https://..."],
    "frame_shape": "aviator",
    "gender": "unisex",
    "stock_count": 50,
    "face_shapes": ["oval", "square"],
    "frame_size": "M"
  }
]`;

export default function ImportPage() {
  const [text, setText] = useState('');
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(preview: boolean) {
    setError('');
    setStatus('');
    let rows: Row[];
    try {
      rows = parseInput(text, format).map(coerce);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    if (rows.length === 0) {
      setError('No rows parsed.');
      return;
    }
    const bad = rows.find((r) => !r.id || !r.name || !r.brand || !r.category || r.price === undefined || r.price === '');
    if (bad) {
      setError('Each row needs at least: id, name, brand, category, price.');
      return;
    }
    if (preview || IS_DEMO) {
      setStatus(`${rows.length} product(s) parsed${IS_DEMO ? ' — demo mode, not saved.' : ' — click Import to save.'}`);
      return;
    }
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upErr } = await supabase.from('products').upsert(rows as any[], { onConflict: 'id' });
    setBusy(false);
    if (upErr) setError(upErr.message);
    else setStatus(`Imported ${rows.length} product(s).`);
  }

  return (
    <Shell>
      <h1>Import catalog</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: -8 }}>
        Bulk add/update products. Upsert is keyed by <code>id</code>. Required per row:
        <code> id, name, brand, category, price</code>. In CSV, array fields
        (<code>images, colors, tags, face_shapes</code>) use <code>|</code> as the separator.
      </p>

      <div className="row-actions" style={{ marginBottom: 12 }}>
        <label style={{ margin: 0 }}>
          Format:{' '}
          <select value={format} onChange={(e) => setFormat(e.target.value as 'json' | 'csv')} style={{ width: 120, display: 'inline-block' }}>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
        </label>
        <button className="secondary" onClick={() => setText(SAMPLE)}>Insert JSON sample</button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={format === 'json' ? 'Paste a JSON array of products…' : 'id,name,brand,category,price,stock_count\n100,Aviator Gold,AllenEyeCare,sunglasses,2999,50'}
        spellCheck={false}
        style={{ width: '100%', minHeight: 260, fontFamily: 'monospace', fontSize: 13, padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}
      />

      <div className="row-actions" style={{ marginTop: 12 }}>
        <button className="secondary" onClick={() => run(true)}>Preview</button>
        <button disabled={busy} onClick={() => run(false)}>{busy ? 'Importing…' : 'Import'}</button>
      </div>

      {error && <p className="err">{error}</p>}
      {status && <p style={{ color: 'var(--navy)', fontWeight: 600 }}>{status}</p>}
    </Shell>
  );
}
