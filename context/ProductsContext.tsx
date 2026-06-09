import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { type Product, products as localProducts } from '@/data/products';
import { dbProductToApp } from '@/lib/database.types';
import { IS_DEMO } from '@/lib/config';

interface ProductsContextValue {
  products: Product[];
  loading: boolean;
  featured: Product[];
  newArrivals: Product[];
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

/**
 * Single source of truth for products: one fetch + one realtime subscription for
 * the whole app. Previously each `useProducts()` call set up its own fetch and a
 * channel that all shared the name `products-realtime`, which collided.
 */
export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(localProducts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_DEMO) { setLoading(false); return; }
    let active = true;

    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: true });
      if (active && !error && data && data.length > 0) {
        setProducts(data.map(dbProductToApp));
      }
      if (active) setLoading(false);
    })();

    // Realtime: keep the catalog (stock, new products, removals) in sync.
    const channel = supabase
      .channel(`products-${Date.now()}-${Math.floor(Math.random() * 1e6)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          setProducts(prev => {
            if (payload.eventType === 'DELETE') {
              return prev.filter(p => p.id !== (payload.old as any).id);
            }
            const next = dbProductToApp(payload.new as any);
            const idx = prev.findIndex(p => p.id === next.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = next;
              return copy;
            }
            return [...prev, next];
          });
        }
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  const featured = products.filter(p => p.isBestSeller || p.isPremium).slice(0, 6);
  const newArrivals = products.filter(p => p.isNew).slice(0, 6);

  return (
    <ProductsContext.Provider value={{ products, loading, featured, newArrivals }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider');
  return ctx;
}
