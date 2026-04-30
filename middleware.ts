import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas que nunca são bloqueadas (billing, auth, assets)
const PUBLIC_PATHS = ['/billing', '/login', '/signup', '/api/stripe-webhook', '/_next', '/favicon']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Deixa passar rotas públicas
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Verifica sessão E refresca o token automaticamente
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    // Se não estiver logado e tentar acessar rota privada, manda pro login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Busca status de billing (só o campo necessário)
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at')
    .eq('id', session.user.id)
    .single()

  const status = profile?.subscription_status ?? 'active'
  const trialExpired = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at) < new Date()
    : false

  // Inadimplente ou trial expirado: só bloqueia rotas de escrita, não de leitura
  const isWriteRoute = pathname.startsWith('/api/') &&
    ['POST','PUT','PATCH','DELETE'].includes(request.method)

  if ((status === 'past_due' || status === 'canceled' || trialExpired) && isWriteRoute) {
    return NextResponse.json(
      { error: 'Assinatura necessária', redirect: '/billing' },
      { status: 402 }
    )
  }

  // Para rotas de UI (não API): injeta header para o layout exibir o banner de aviso
  if ((status === 'past_due' || trialExpired) && !pathname.startsWith('/api/')) {
    response.headers.set('x-billing-status', status === 'past_due' ? 'past_due' : 'trial_expired')
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.png$).*)'],
}
