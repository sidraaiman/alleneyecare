import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { dbProductToApp } from '@/lib/database.types';
import { IS_DEMO } from '@/lib/config';
import type { Product } from '@/data/products';

export interface SearchInput {
  products: Product[]; // fallback catalog (from ProductsContext)
  search: string;
  category: string; // 'all' | category
  shape: string; // 'All' | shape label
  gender: string; // 'All' | gender label
  price: string; // price range label
  sort: string; // sort option label
}

function priceBounds(label: string): { min: number | null; max: number | null } {
  switch (label) {
    case 'Under ₹1,000': return { min: null, max: 999 };
    case '₹1,000–₹2,000': return { min: 1000, max: 2000 };
    case '₹2,000–₹3,500': return { min: 2001, max: 3500 };
    case 'Above ₹3,500': return { min: 3501, max: null };
    default: return { min: null, max: null };
  }
}

function sortKey(label: string): string {
  switch (label) {
    case 'Price: Low to High': return 'price_asc';
    case 'Price: High to Low': return 'price_desc';
    case 'Top Rated': return 'rating';
    case 'Newest First': return 'newest';
    default: return 'relevance';
  }
}

/** Pure in-memory filter — used directly in demo/offline mode and as a fallback. */
export function localFilter(input: SearchInput): Product[] {
  const { products, search, category, shape, gender, price, sort } = input;
  let list = [...products];
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
  }
  if (category !== 'all') list = list.filter(p => p.category === category);
  if (shape !== 'All') list = list.filter(p => p.frameShape === shape.toLowerCase());
  if (gender !== 'All') list = list.filter(p => p.gender === gender.toLowerCase());
  const { min, max } = priceBounds(price);
  if (min != null) list = list.filter(p => p.price >= min);
  if (max != null) list = list.filter(p => p.price <= max);
  switch (sort) {
    case 'Price: Low to High': list.sort((a, b) => a.price - b.price); break;
    case 'Price: High to Low': list.sort((a, b) => b.price - a.price); break;
    case 'Top Rated': list.sort((a, b) => b.rating - a.rating); break;
    case 'Newest First': list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
  }
  return list;
}

/**
 * Server-side product search. In demo mode (or on RPC error) it transparently
 * falls back to the in-memory filter, so the screen always works.
 */
export function useProductSearch(input: SearchInput): { results: Product[]; loading: boolean } {
  const [results, setResults] = useState<Product[]>(() => localFilter(input));
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timer = useRef<any>(undefined);

  const key = JSON.stringify({
    s: input.search, c: input.category, sh: input.shape,
    g: input.gender, p: input.price, so: input.sort, n: input.products.length,
  });

  useEffect(() => {
    if (IS_DEMO) {
      setResults(localFilter(input));
      return;
    }
    setLoading(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { min, max } = priceBounds(input.price);
      const { data, error } = await (supabase.rpc as any)('search_products', {
        q: input.search || null,
        p_category: input.category,
        p_shape: input.shape === 'All' ? 'all' : input.shape.toLowerCase(),
        p_gender: input.gender === 'All' ? 'all' : input.gender.toLowerCase(),
        p_min: min,
        p_max: max,
        p_sort: sortKey(input.sort),
        p_limit: 60,
        p_offset: 0,
      });
      setResults(error || !data ? localFilter(input) : (data as unknown[]).map((r) => dbProductToApp(r as never)));
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { results, loading };
}

/** Autocomplete suggestions (server RPC online, local names/brands in demo). */
export async function fetchSuggestions(localProducts: Product[], q: string): Promise<string[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  if (IS_DEMO) {
    const ql = query.toLowerCase();
    const set = new Set<string>();
    for (const p of localProducts) {
      if (p.name.toLowerCase().includes(ql)) set.add(p.name);
      if (p.brand.toLowerCase().includes(ql)) set.add(p.brand);
      if (set.size >= 6) break;
    }
    return [...set].slice(0, 6);
  }
  const { data, error } = await (supabase.rpc as any)('product_suggestions', { q: query, p_limit: 6 });
  if (error || !data) return [];
  return (data as { label: string }[]).map((r) => r.label);
}
