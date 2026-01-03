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

  // Protection du Dashboard (connexion uniquement)
  if (pathname.startsWith('/dashboard')) {
    try {
      console.log('🔍 Middleware: Vérification utilisateur pour', pathname)
      
      // Vérifier l'utilisateur avec getUser (plus robuste que getSession)
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.log('❌ Middleware: Erreur auth:', authError.message)
      }

      if (!user) {
        console.log('🚫 Middleware: Pas d\'utilisateur, redirection /login')
        const redirectUrl = new URL('/login', req.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // ✅ Utilisateur connecté = accès autorisé (mode PRO-only)
      // Le composant Dashboard gère lui-même l'écran d'activation si besoin
      console.log('✅ Middleware: Utilisateur connecté:', user.email, '→ Accès autorisé')
      return res

    } catch (err: any) {
      console.error('❌ Middleware: Erreur exception:', err.message)
      // En cas d'erreur, on laisse passer pour ne pas bloquer
      console.log('⚠️ Middleware: Erreur, accès autorisé par défaut')
      return res
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*']
}

