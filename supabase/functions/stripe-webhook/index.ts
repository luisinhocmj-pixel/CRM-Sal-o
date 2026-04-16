import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // OK aqui: só roda server-side
)

// Mapeamento de eventos Stripe → status interno
const STATUS_MAP: Record<string, string> = {
  'customer.subscription.active':   'active',
  'customer.subscription.updated':  'active',
  'invoice.payment_failed':         'past_due',
  'invoice.payment_succeeded':      'active',
  'customer.subscription.deleted':  'canceled',
  'customer.subscription.trial_will_end': 'trialing',
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature')!
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body, sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch {
    return new Response('Assinatura inválida', { status: 400 })
  }

  const newStatus = STATUS_MAP[event.type]
  if (!newStatus) {
    return new Response('Evento ignorado', { status: 200 })
  }

  // Obtém o customer_id do evento
  const obj = event.data.object as Stripe.Subscription | Stripe.Invoice
  const customerId = 'customer' in obj
    ? (typeof obj.customer === 'string' ? obj.customer : obj.customer.id)
    : null

  if (!customerId) return new Response('Sem customer', { status: 200 })

  const eventTimestamp = new Date(event.created * 1000).toISOString()

  // Atualiza apenas se o evento for mais recente que o último processado
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: newStatus,
      last_stripe_event_at: eventTimestamp,
      current_period_end: 'current_period_end' in obj
        ? new Date((obj as Stripe.Subscription).current_period_end * 1000).toISOString()
        : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)
    .or(`last_stripe_event_at.lt.${eventTimestamp},last_stripe_event_at.is.null`)

  if (error) {
    // Se não atualizou por causa do filtro de timestamp, retornamos 200 (idempotência)
    if (error.code === 'PGRST116') return new Response('Evento antigo ignorado', { status: 200 })
    
    console.error('Erro ao atualizar profile:', error)
    return new Response('Erro interno', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
