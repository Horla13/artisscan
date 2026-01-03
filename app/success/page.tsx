'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, LayoutDashboard, Mail, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SuccessPage() {
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

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-slate-100 text-center animate-fade-in">
        <div className="w-20 h-24 mx-auto mb-8 relative">
          <div className="absolute inset-0 bg-green-100 rounded-2xl rotate-6 animate-pulse"></div>
          <div className="absolute inset-0 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Paiement validé !</h1>
        
        <p className="text-slate-600 font-medium mb-8 leading-relaxed">
          Merci pour votre confiance. Votre compte <span className="text-orange-600 font-bold">ArtisScan PRO</span> est désormais actif.
        </p>

        <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100 text-left">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <Mail className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Email de confirmation</p>
              <p className="text-xs text-slate-500 font-medium">Vous allez recevoir un mail avec votre lien d'accès permanent.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <LayoutDashboard className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Accès immédiat</p>
              <p className="text-xs text-slate-500 font-medium">Vous pouvez accéder à vos outils dès maintenant.</p>
            </div>
          </div>
        </div>

        <Link 
          href="/dashboard"
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-wider py-4 rounded-xl shadow-lg shadow-orange-200 transition-all duration-200 active:scale-95 flex items-center justify-center gap-3 group"
        >
          Accéder au Dashboard
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>

        <p className="mt-6 text-xs text-slate-400 font-bold uppercase tracking-widest">
          ArtisScan • Gestion Intelligente
        </p>
      </div>
    </div>
  );
}

