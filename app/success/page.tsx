'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle, LayoutDashboard, Mail } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';
import { getUserProfile } from '@/lib/subscription';

export default function SuccessPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState('Vérification du compte...');
  const [subtitle, setSubtitle] = useState('Nous finalisons votre accès, un instant.');
  const [statusLabel, setStatusLabel] = useState('Vérification en cours…');
  const [isPro, setIsPro] = useState<boolean | null>(null);

  const legalLinks = useMemo(
    () => ([
      { href: '/legal/mentions-legales', label: 'Mentions légales' },
      { href: '/legal/confidentialite', label: 'Confidentialité' },
      { href: '/legal/cgu', label: 'CGU' },
    ]),
    []
  );

  useEffect(() => {
    // Petit effet de fête !
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Barre de progression: 0 -> 100% en 2 secondes
      const start = performance.now();
      const totalMs = 2000;

      const tick = (now: number) => {
        if (cancelled) return;
        const p = Math.min(1, (now - start) / totalMs);
        setProgress(Math.round(p * 100));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      // Vérifier session + statut PRO en parallèle de l'animation
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsPro(false);
          setTitle('Connexion requise');
          setSubtitle('Votre session a expiré. Veuillez vous reconnecter.');
          setStatusLabel('Redirection vers la connexion…');
          setTimeout(() => router.push('/login?redirect=/pricing'), 700);
          return;
        }

        setTitle('Vérification de l’abonnement…');
        setSubtitle('Configuration de votre espace professionnel en cours…');

        // ✅ Polling (max 30s, objectif < 5s) : attendre que le webhook ait upgradé is_pro
        const startedAt = Date.now();
        const softTargetMs = 5000; // objectif produit
        const hardTimeoutMs = 30000; // évite de renvoyer un client payé vers /pricing trop tôt

        while (!cancelled) {
          const profile = await getUserProfile();
          const planLower = profile?.plan?.toLowerCase();
          const statusLower = profile?.subscription_status?.toLowerCase();
          const pro = planLower === 'pro' || profile?.is_pro === true || statusLower === 'active' || statusLower === 'trialing';
          setIsPro(pro);

          if (pro) {
            setStatusLabel('OK');
            setTitle('Bienvenue sur ArtisScan Pro');
            setSubtitle('Votre espace est prêt. Redirection…');
            setTimeout(() => router.push('/dashboard'), 400);
            return;
          }

          const elapsed = Date.now() - startedAt;
          if (elapsed > softTargetMs) {
            setStatusLabel('Activation en cours…');
            setSubtitle('Nous finalisons votre accès (cela peut prendre quelques secondes).');
          }

          if (elapsed > hardTimeoutMs) {
            setIsPro(false);
            setStatusLabel('Toujours en cours');
            setTitle('Activation en cours');
            setSubtitle('Votre paiement est reçu, mais l’accès n’est pas encore confirmé. Veuillez patienter quelques instants.');
            return; // on reste sur la page, sans rediriger
          }

          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch (e) {
        console.error('Erreur vérification abonnement:', e);
        setIsPro(false);
        setTitle('Vérification impossible');
        setSubtitle('Une erreur est survenue. Redirection vers les tarifs…');
        setStatusLabel('Erreur');
        setTimeout(() => router.push('/pricing'), 900);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-slate-100 text-center animate-fade-in">
        <div className="w-20 h-24 mx-auto mb-8 relative">
          <div className={`absolute inset-0 ${isPro === false ? 'bg-orange-100' : 'bg-green-100'} rounded-2xl rotate-6 animate-pulse`}></div>
          <div className={`absolute inset-0 ${isPro === false ? 'bg-orange-500' : 'bg-green-500'} rounded-2xl flex items-center justify-center shadow-lg ${isPro === false ? 'shadow-orange-200' : 'shadow-green-200'}`}>
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">{title}</h1>
        <p className="text-slate-600 font-medium mb-6 leading-relaxed">{subtitle}</p>

        {/* Progress */}
        <div className="mb-8">
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-orange-500 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>{statusLabel}</span>
            <span>{progress}%</span>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100 text-left">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <Mail className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Confirmation</p>
              <p className="text-xs text-slate-500 font-medium">Si votre abonnement vient d’être activé, cela peut prendre quelques secondes.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <LayoutDashboard className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Redirection automatique</p>
              <p className="text-xs text-slate-500 font-medium">Aucun clic nécessaire.</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">
          ArtisScan • Gestion Intelligente
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500">
          {legalLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-orange-500 transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}


