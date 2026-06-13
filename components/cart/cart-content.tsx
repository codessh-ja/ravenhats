'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Lock, Truck, Shield } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { formatPrice } from '@/lib/data'
import { SHIPPING } from '@/lib/constants'

export function CartContent() {
  const { items, removeItem, updateQuantity, subtotal } = useCart()

  const shippingEstimate = subtotal > 0 ? SHIPPING.zones.zone2.price : 0
  const total = subtotal + shippingEstimate

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#1a1a1a] flex items-center justify-center mb-6">
          <ShoppingBag className="h-7 w-7 text-neutral-600" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white mb-2">Tu carrito está vacío</h2>
        <p className="text-neutral-600 text-sm mb-8">Agrega algunos productos para continuar</p>
        <Link
          href="/tienda"
          className="inline-flex items-center gap-2 bg-white text-black text-[13px] font-bold tracking-widest px-6 h-11 rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all"
        >
          IR A LA TIENDA
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">

      {/* Items */}
      <div className="lg:col-span-2 space-y-3">
        <p className="text-neutral-600 text-[11px] tracking-[0.2em] uppercase mb-4">
          {items.length} producto{items.length > 1 ? 's' : ''} en tu carrito
        </p>

        {items.map((item) => (
          <div
            key={item.product.id}
            className="flex gap-4 bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-4 hover:border-[#222] transition-colors"
          >
            {/* Image */}
            <Link
              href={`/producto/${item.product.slug}`}
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#161616] shrink-0"
            >
              <Image
                src={item.product.images[0] || '/placeholder.svg'}
                alt={item.product.name}
                fill
                className="object-cover"
                loading="lazy"
              />
            </Link>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  {item.product.collection && (
                    <p className="text-neutral-700 text-[10px] tracking-[0.2em] uppercase mb-0.5">
                      {item.product.collection}
                    </p>
                  )}
                  <Link
                    href={`/producto/${item.product.slug}`}
                    className="text-white text-[13px] font-bold tracking-wide hover:text-neutral-300 transition-colors line-clamp-1"
                  >
                    {item.product.name}
                  </Link>
                  {item.product.stock <= 5 && item.product.stock > 0 && (
                    <p className={`text-[10px] font-semibold mt-0.5 ${item.product.stock <= 2 ? 'text-red-400' : 'text-amber-500'}`}>
                      {item.product.stock <= 2 ? `¡Solo ${item.product.stock} disponibles!` : `Quedan ${item.product.stock} unidades`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeItem(item.product.id)}
                  className="text-neutral-700 hover:text-red-500 transition-colors p-1 shrink-0"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                {/* Quantity */}
                <div className="flex items-center gap-1 bg-[#161616] border border-[#222] rounded-xl p-1">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#222] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-[13px] font-bold text-white tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#222] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Price */}
                <div className="text-right">
                  {item.product.compareAtPrice && item.product.compareAtPrice > item.product.price && (
                    <p className="text-neutral-600 text-[11px] line-through">
                      {formatPrice(item.product.compareAtPrice * item.quantity)}
                    </p>
                  )}
                  <p className="text-white text-[15px] font-black tracking-tight">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="lg:col-span-1">
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-5 lg:sticky lg:top-28">

          <h2 className="text-white text-[13px] font-bold tracking-wider uppercase mb-5">
            Resumen del pedido
          </h2>

          <div className="space-y-3 pb-4 border-b border-[#1a1a1a]">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 text-[13px]">Subtotal</span>
              <span className="text-white text-[13px] font-semibold">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 text-[13px]">Envío estimado</span>
              <span className="text-white text-[13px] font-semibold">
                {subtotal > 0 ? formatPrice(shippingEstimate) : formatPrice(0)}
              </span>
            </div>
          </div>

          {/* Shipping rates */}
          {subtotal > 0 && (
            <div className="py-4 border-b border-[#1a1a1a]">
              <div className="flex items-start gap-2">
                <Truck className="h-3.5 w-3.5 text-neutral-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-neutral-500 text-[11px] font-semibold tracking-wide uppercase">Tarifas de envío</p>
                  <p className="text-neutral-600 text-[11px]">Ciudades principales: {formatPrice(SHIPPING.zones.zone1.price)}</p>
                  <p className="text-neutral-600 text-[11px]">Ciudades intermedias: {formatPrice(SHIPPING.zones.zone2.price)}</p>
                  <p className="text-neutral-600 text-[11px]">Resto del país: {formatPrice(SHIPPING.zones.zone3.price)}</p>
                  <p className="text-green-500 text-[11px] font-semibold">Acacias, Meta: GRATIS</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 pb-5">
            <span className="text-white text-[15px] font-black tracking-tight">Total</span>
            <span className="text-white text-[18px] font-black tracking-tight">{formatPrice(total)}</span>
          </div>

          <Link
            href="/checkout"
            className="flex items-center justify-center gap-2 w-full h-12 bg-white text-black text-[13px] font-bold tracking-widest rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all mb-3"
          >
            PROCEDER AL PAGO
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/tienda"
            className="flex items-center justify-center w-full h-11 border border-[#222] text-neutral-400 text-[12px] font-semibold tracking-widest rounded-xl hover:border-[#333] hover:text-white transition-all"
          >
            SEGUIR COMPRANDO
          </Link>

          {/* Trust badges */}
          <div className="mt-5 pt-4 border-t border-[#1a1a1a] grid grid-cols-3 gap-2">
            {[
              { icon: Lock, label: 'Pago seguro' },
              { icon: Truck, label: 'Envío Colombia' },
              { icon: Shield, label: '100% Original' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                <Icon className="h-3.5 w-3.5 text-neutral-600" />
                <span className="text-neutral-700 text-[10px] leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
