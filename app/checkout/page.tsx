import { Suspense } from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { CheckoutForm } from '@/components/checkout/checkout-form'
import { Loader2, ShoppingBag, ChevronRight, CreditCard, CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Finalizar Pedido — RavenHats',
  description: 'Completa tu compra de forma segura. Pago online o contraentrega.',
}

function CheckoutProgress() {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-8 text-[11px] tracking-wide">
      <Link href="/carrito" className="flex items-center gap-1 text-neutral-600 hover:text-neutral-400 transition-colors">
        <ShoppingBag className="h-3 w-3" /> Carrito
      </Link>
      <ChevronRight className="h-3 w-3 text-neutral-800" />
      <span className="flex items-center gap-1 text-white font-semibold">
        <CreditCard className="h-3 w-3" /> Datos y pago
      </span>
      <ChevronRight className="h-3 w-3 text-neutral-800" />
      <span className="flex items-center gap-1 text-neutral-700">
        <CheckCircle2 className="h-3 w-3" /> Confirmación
      </span>
    </div>
  )
}

function CheckoutLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-600 mx-auto mb-4" />
        <p className="text-neutral-600 text-sm">Cargando...</p>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <>
      <Header />
      <main className="pt-[73px] bg-[#0a0a0a] min-h-screen">
        <section className="py-10 lg:py-14">
          <div className="mx-auto max-w-6xl px-4 lg:px-8">
            <CheckoutProgress />
            <Suspense fallback={<CheckoutLoading />}>
              <CheckoutForm />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
