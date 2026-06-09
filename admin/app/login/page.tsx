'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { IS_DEMO, DEMO_EMAIL, DEMO_PASSWORD } from '@/lib/config';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (IS_DEMO) {
      if (email.trim() === DEMO_EMAIL && password === DEMO_PASSWORD) {
        window.localStorage.setItem('demo-admin', '1');
        router.replace('/orders');
      } else {
        setError(`Demo mode — sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
      }
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else router.replace('/orders');
  }

  return (
    <div className="center">
      <form className="card" onSubmit={onSubmit}>
        <h1>Staff sign in</h1>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="err">{error}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        {IS_DEMO ? (
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
            Demo mode — sign in with <code>{DEMO_EMAIL}</code> / <code>{DEMO_PASSWORD}</code>. Data is mock and edits are not saved.
          </p>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
            Create the user in Supabase → Authentication, then set <code>profiles.is_admin = true</code>.
          </p>
        )}
      </form>
    </div>
  );
}
