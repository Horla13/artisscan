import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { pathname } = req.nextUrl

  // Protection du Dashboard
  if (pathname.startsWith('/dashboard')) {
    try {
      // 1. Vérifier l'utilisateur (plus robuste que getSession)
      console.log('🔍 Middleware: Vérification session...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        console.log('🚫 Middleware: Pas d\'utilisateur détecté, redirection /login')
        const redirectUrl = new URL('/login', req.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
      }

      console.log('✅ Middleware: Utilisateur connecté:', user.email)

      // 2. Vérifier le plan dans la table profiles (mode PRO-only)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan, subscription_tier, subscription_status')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.log('⚠️ Middleware: Erreur récupération profil, accès autorisé par défaut')
        // En cas d'erreur de récupération, on laisse passer (mode graceful)
        return res
      }

      console.log('📊 Middleware: Profil récupéré:', profile)

      // 3. Vérifier si l'utilisateur est PRO (mode PRO-only simplifié)
      const isPro = profile?.plan === 'pro' || 
                    profile?.subscription_tier === 'pro' || 
                    profile?.subscription_status === 'active'

      if (isPro) {
        console.log('✅ Middleware: Utilisateur PRO détecté, accès Dashboard autorisé')
        return res
      }

      // 4. Si pas encore PRO, on laisse quand même passer
      // Le composant Dashboard gère l'écran d'activation
      console.log('⏳ Middleware: Utilisateur en attente PRO, accès Dashboard autorisé (écran activation)')
      return res

    } catch (err) {
      console.error('❌ Middleware: Erreur:', err)
      // En cas d'erreur, on laisse passer pour ne pas bloquer
      return res
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*']
}

