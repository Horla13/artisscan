import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Ne protéger que /dashboard
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  console.log('🔍 Middleware: Protection Dashboard activée pour', pathname)
  console.log('🍪 Cookies disponibles:', req.cookies.getAll().map(c => c.name))

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
            const value = req.cookies.get(name)?.value
            console.log(`📖 Cookie READ: ${name} = ${value ? 'PRESENT' : 'ABSENT'}`)
            return value
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
            console.log(`✍️ Cookie SET: ${name}`)
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
            console.log(`🗑️ Cookie REMOVE: ${name}`)
          },
        },
      }
    )

    // Vérification utilisateur avec getUser (méthode serveur sécurisée)
    console.log('🔐 Tentative getUser()...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('❌ Erreur getUser():', authError.message, authError.status)
    }

    if (!user) {
      console.log('🚫 Aucun utilisateur trouvé → Redirection /login')
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    console.log('✅ Utilisateur trouvé:', user.id, user.email)

    // Vérifier le plan dans profiles
    console.log('📊 Vérification du plan dans profiles...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, subscription_tier, subscription_status, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.log('⚠️ Erreur récupération profil:', profileError.message)
      console.log('⚠️ Accès autorisé par défaut (mode graceful)')
      return res
    }

    console.log('📋 Profil récupéré:', JSON.stringify(profile))

    const isPro = profile?.plan === 'pro' || 
                  profile?.subscription_tier === 'pro' || 
                  profile?.subscription_status === 'active'

    if (isPro) {
      console.log('🎉 Utilisateur PRO confirmé → Accès Dashboard autorisé')
      return res
    }

    // Pas encore PRO mais connecté = on laisse passer (écran d'activation)
    console.log('⏳ Utilisateur non-PRO mais connecté → Accès autorisé (écran activation)')
    return res

  } catch (err: any) {
    console.error('💥 Exception middleware:', err.message)
    console.log('⚠️ Accès autorisé par défaut (erreur)')
    return res
  }
}

export const config = {
  matcher: ['/dashboard/:path*']
}

