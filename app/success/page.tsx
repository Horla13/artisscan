'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function SuccessContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<'checking' | 'ok' | 'failed'>('checking');
  const [message, setMessage] = useState('Finalisation de votre abonnement…');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const sessionId = params.get('session_id');
      console.log('✅ /success', { session_id: sessionId });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login?redirect=/dashboard');
        return;
      }

      // Polling léger : attendre que le webhook synchronise la subscription Stripe (source de vérité)
      const startedAt = Date.now();
      const timeoutMs = 30000;
      while (!cancelled) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_pro, plan')
          .eq('id', session.user.id)
          .single();

        const ok = (profile as any)?.is_pro === true;

        if (ok) {
          setStatus('ok');
          setMessage('Abonnement activé. Redirection vers le dashboard…');
          setTimeout(() => router.push('/dashboard'), 900);
          return;
        }

        if (Date.now() - startedAt > timeoutMs) {
          setStatus('failed');
          setMessage('Activation en cours. Vous pouvez accéder au dashboard et réessayer dans quelques instants.');
          return;
        }

        await new Promise((r) => setTimeout(r, 1200));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-slate-100 text-center">
        <div className="w-20 h-24 mx-auto mb-8 relative">
          <div className="absolute inset-0 bg-green-100 rounded-2xl rotate-6 animate-pulse"></div>
          <div className="absolute inset-0 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Merci !</h1>
        <p className="text-slate-600 font-medium mb-6 leading-relaxed">{message}</p>

        {status !== 'checking' && (
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-wider py-4 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <LayoutDashboard className="w-5 h-5" />
              Accéder au dashboard
            </button>
            <Link href="/pricing" className="text-sm font-bold text-slate-500 hover:text-orange-500 transition-colors">
              Revenir aux tarifs
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-orange-500 font-black animate-pulse text-2xl">ArtisScan...</div>}>
      <SuccessContent />
    </Suspense>
  );
}


