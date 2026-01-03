import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Ne protéger que /dashboard
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  console.log('🔍 Middleware: Protection /dashboard')

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // Mettre à jour les cookies de la requête
            req.cookies.set({
              name,
              value,
              ...options,
            })
            // Mettre à jour les cookies de la réponse
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
            // Supprimer des cookies de la requête
            req.cookies.set({
              name,
              value: '',
              ...options,
            })
            // Supprimer des cookies de la réponse
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

    // 1. Essayer de récupérer la session (plus permissif que getUser)
    console.log('🔐 Tentative getSession()...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.log('⚠️ Erreur getSession():', sessionError.message)
    }

    // 2. Si pas de session, essayer getUser (plus strict)
    if (!session) {
      console.log('📡 Pas de session, tentative getUser()...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) {
        console.log('❌ Erreur getUser():', userError.message, userError.status)
      }

      if (!user) {
        console.log('🚫 Aucun utilisateur trouvé → Redirection /login')
        const redirectUrl = new URL('/login', req.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
      }

      console.log('✅ Utilisateur trouvé via getUser():', user.email)
      return res
    }

    console.log('✅ Session active:', session.user.email)
    return res

  } catch (err: any) {
    console.error('💥 Exception middleware:', err.message)
    // En cas d'erreur, laisser passer (mode graceful)
    console.log('⚠️ Erreur, accès autorisé par défaut')
    return res
  }
}

export const config = {
  matcher: ['/dashboard/:path*']
}

