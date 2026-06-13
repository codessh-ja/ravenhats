import { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { CartContent } from '@/components/cart/cart-content'

export const metadata: Metadata = {
  title: 'Carrito de Compras',
  description: 'Revisa los productos en tu carrito y procede al pago.',
}

export default function CartPage() {
  return (
    <>
      <Header />
      <main className="pt-[73px] bg-[#0a0a0a] min-h-screen">
        <section className="py-10 lg:py-14">
          <div className="mx-auto max-w-5xl px-4 lg:px-8">
            <div className="mb-8">
              <p className="text-neutral-600 text-[11px] tracking-[0.3em] uppercase mb-2">Checkout</p>
              <h1 className="text-2xl font-black tracking-tighter text-white">CARRITO DE COMPRAS</h1>
            </div>
            <CartContent />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
