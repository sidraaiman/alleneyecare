import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { type Product, products as localProducts } from '../data/products';
import { dbProductToApp } from '../lib/database.types';
import { IS_DEMO } from '../lib/config';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(localProducts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_DEMO) { setLoading(false); return; }

    fetchProducts();

    // Realtime: update stock count when products change
    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          setProducts(prev =>
            prev.map(p => (p.id === (payload.new as any).id ? dbProductToApp(payload.new as any) : p))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      setProducts(data.map(dbProductToApp));
    }
    setLoading(false);
  }

  const featured = products.filter(p => p.isBestSeller || p.isPremium).slice(0, 6);
  const newArrivals = products.filter(p => p.isNew).slice(0, 6);

  return { products, loading, featured, newArrivals };
}
