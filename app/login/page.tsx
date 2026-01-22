'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'signup') {
      setIsSignUp(true)
    }
  }, [searchParams])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Redirection intelligente après login
      const cycle = searchParams.get('cycle')
      const redirectTo = searchParams.get('redirect')
      
      if (redirectTo) {
        router.push(redirectTo)
      } else if (cycle) {
        router.push(`/pricing?cycle=${cycle}`)
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue lors de la connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    setLoading(true)
    setError(null)

    if (!email || !password) {
      setError('Veuillez remplir tous les champs')
      setLoading(false)
      return
    }

    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        // Désactive tout email automatique Supabase : on ne veut que l'email après paiement
        options: {
          // Pas d'email de confirmation Supabase (on gère l'email après paiement)
          // null est casté pour éviter l'envoi d'un mail de confirmation
          emailRedirectTo: null as any,
        },
      })

      if (error) throw error

      console.log("✅ Inscription réussie");
      
      // Force la récupération de la session pour s'assurer qu'elle est active localement
      const { data: { session } } = await supabase.auth.getSession();

      // ✅ Email transactionnel "Compte créé" (Brevo) - ne doit pas bloquer le flow
      try {
        const token = session?.access_token;
        if (token) {
          fetch('/api/emails/account-created', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
      } catch {
        // ignore
      }
      
      // Forcer le rafraîchissement des composants
      router.refresh()

      // Redirection directe vers les tarifs
      const cycle = searchParams.get('cycle') || 'monthly'
      router.push(`/pricing?mode=signup&status=welcome&cycle=${cycle}`)
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card-clean rounded-3xl p-8 w-full max-w-md bg-white shadow-xl border border-slate-100">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">ArtisScan</h1>
        </Link>
        <p className="text-slate-500 font-medium">
          {isSignUp ? 'Créez votre compte artisan' : 'Connectez-vous à votre espace'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl animate-shake">
          <p className="text-red-600 text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={!isSignUp ? handleSignIn : (e) => { e.preventDefault(); handleSignUp(); }} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
            Email Professionnel
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-slate-50 text-slate-900"
            placeholder="votre@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-slate-50 text-slate-900"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-wider py-4 rounded-xl shadow-lg shadow-orange-200 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Chargement...' : isSignUp ? 'Créer mon compte' : 'Se connecter'}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-100 text-center">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm font-bold text-slate-500 hover:text-orange-600 transition-colors"
        >
          {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? S\'inscrire'}
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-orange-500 font-black animate-pulse">Chargement...</div>}>
        <LoginForm />
      </Suspense>
      <footer className="mt-8 text-xs text-slate-500 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link href="/legal/mentions-legales" className="hover:text-orange-500 transition-colors">Mentions légales</Link>
        <Link href="/legal/confidentialite" className="hover:text-orange-500 transition-colors">Confidentialité</Link>
        <Link href="/legal/cgu" className="hover:text-orange-500 transition-colors">CGU</Link>
        <Link href="/legal/cookies" className="hover:text-orange-500 transition-colors">Cookies</Link>
        <Link href="/legal/remboursement" className="hover:text-orange-500 transition-colors">Remboursement</Link>
        <Link href="/legal/facturation" className="hover:text-orange-500 transition-colors">Facturation</Link>
      </footer>
    </div>
  )
}

