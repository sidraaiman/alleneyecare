'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { IS_DEMO } from '@/lib/config';

export default function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (IS_DEMO) {
      if (typeof window !== 'undefined' && window.localStorage.getItem('demo-admin') === '1') setReady(true);
      else router.replace('/login');
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login');
      else setReady(true);
    });
  }, [router]);

  if (!ready) return <div className="center">Loading…</div>;

  return (
    <div>
      <nav className="nav">
        <span className="brand">AllenEyeCare Admin</span>
        <Link href="/orders">Orders</Link>
        <Link href="/products">Products</Link>
        <Link href="/import">Import</Link>
        <Link href="/coupons">Coupons</Link>
        <Link href="/returns">Returns</Link>
        <button
          className="secondary"
          onClick={async () => {
            if (IS_DEMO) window.localStorage.removeItem('demo-admin');
            else await supabase.auth.signOut();
            router.replace('/login');
          }}
        >
          Sign out
        </button>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
