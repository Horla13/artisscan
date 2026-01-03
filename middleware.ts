import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Ne protéger que /dashboard
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  console.log('🔍 Middleware: Vérification accès /dashboard')

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

    // Vérification utilisateur avec getUser() (méthode serveur)
    console.log('🔐 Middleware: Appel getUser()...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('❌ Middleware: Erreur getUser():', authError.message)
    }

    if (!user) {
      console.log('🚫 Middleware: AUCUN utilisateur détecté → Redirection /login')
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Utilisateur détecté
    console.log('✅ Middleware: Utilisateur DÉTECTÉ')
    console.log('   - Email:', user.email)
    console.log('   - ID:', user.id)

    // Autorisation spéciale pour l'utilisateur PRO
    if (user.email === 'armagio13@gmail.com') {
      console.log('🎉 Middleware: Utilisateur autorisé (armagio13@gmail.com) → Accès autorisé')
      return res
    }

    // Pour les autres utilisateurs connectés, on laisse aussi passer (mode PRO-only)
    console.log('✅ Middleware: Utilisateur connecté → Accès autorisé')
    return res

  } catch (err: any) {
    console.error('💥 Middleware: Exception:', err.message)
    console.log('⚠️ Middleware: Accès autorisé par défaut (erreur)')
    return res
  }
}

export const config = {
  matcher: ['/dashboard/:path*']
}

