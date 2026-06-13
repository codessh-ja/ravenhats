'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { formatPrice } from '@/lib/data'
import type { Product } from '@/lib/types'
import { Loader2, ShoppingBag, Tag } from 'lucide-react'
import { useCart } from '@/lib/cart-context'

export default function DescuentosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { addItem } = useCart()

  useEffect(() => {
    fetch('/api/products?showInDescuentos=true')
      .then(r => r.json())
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const maxDiscount = products.reduce((max, p) => {
    if (p.compareAtPrice && p.compareAtPrice > p.price)
      return Math.max(max, Math.round((1 - p.price / p.compareAtPrice) * 100))
    return max
  }, 0)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0a0a0a] pt-[100px]">

        {/* ── Strip header ── */}
        <div className="px-5 lg:px-10 py-10 border-b border-[#161616]">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <p className="text-red-500 text-[11px] tracking-[0.3em] uppercase mb-2 font-medium">
                Ofertas especiales
              </p>
              <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white leading-none">
                DESCUENTOS
              </h1>
            </div>
            {maxDiscount > 0 && !loading && (
              <div className="flex items-center gap-3">
                <span className="text-neutral-600 text-[13px]">
                  {products.length} {products.length === 1 ? 'gorra' : 'gorras'}
                </span>
                <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-bold px-4 py-1.5 rounded-full">
                  Hasta -{maxDiscount}% OFF
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="max-w-7xl mx-auto px-5 lg:px-10 py-10">
          {loading ? (
            <div className="flex items-center justify-center py-40">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-700" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Tag className="h-10 w-10 text-neutral-800" />
              <p className="text-white font-medium text-sm">Sin descuentos activos</p>
              <p className="text-neutral-600 text-[13px]">Vuelve pronto para ver las próximas ofertas</p>
              <Link
                href="/tienda"
                className="mt-2 px-6 py-2.5 bg-white text-black text-[12px] font-bold rounded-full hover:bg-neutral-100 transition-colors"
              >
                Ver catálogo completo
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
              {products.map(p => (
                <DiscountCard key={p.id} product={p} onAdd={() => addItem(p, 1)} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

function DiscountCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const hasDiscount = !!(product.compareAtPrice && product.compareAtPrice > product.price)
  const pct = hasDiscount ? Math.round((1 - product.price / product.compareAtPrice!) * 100) : 0
  const savings = hasDiscount ? product.compareAtPrice! - product.price : 0
  const isOut = product.stock === 0
  const isLow = product.stock > 0 && product.stock <= 3

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] bg-[#0f0f0f] overflow-hidden rounded-2xl">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className={`object-cover transition-all duration-500 group-hover:scale-[1.04] ${isOut ? 'opacity-40 grayscale' : ''}`}
            sizes="(max-width: 640px) 50vw, 25vw"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-neutral-800" />
          </div>
        )}

        {/* Discount badge — prominent */}
        {hasDiscount && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="bg-red-500 text-white text-[11px] font-black px-2.5 py-1 rounded-full leading-none">
              -{pct}%
            </span>
          </div>
        )}

        {isLow && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full border border-white/10">
              Solo {product.stock}
            </span>
          </div>
        )}

        {isOut && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="bg-black/80 text-white text-[11px] font-bold tracking-[0.15em] px-3 py-1 rounded-full border border-white/10">
              AGOTADO
            </span>
          </div>
        )}

        {!isOut && (
          <div className="absolute inset-x-3 bottom-3 translate-y-[110%] group-hover:translate-y-0 transition-transform duration-300 ease-out z-10">
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onAdd() }}
              className="w-full bg-white text-black text-[12px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-100 active:scale-[0.98] transition-all shadow-lg"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Agregar
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 px-0.5">
        {product.collection && (
          <p className="text-[10px] text-neutral-600 uppercase tracking-[0.15em] mb-1 truncate">
            {product.collection}
          </p>
        )}
        <h3 className="text-[13px] font-medium text-neutral-200 line-clamp-1 group-hover:text-white transition-colors">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
          <span className="text-[14px] font-bold text-white">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-[11px] text-neutral-600 line-through">{formatPrice(product.compareAtPrice!)}</span>
          )}
        </div>
        {savings > 0 && (
          <p className="text-[11px] text-red-400 font-medium mt-0.5">
            Ahorras {formatPrice(savings)}
          </p>
        )}
      </div>
    </Link>
  )
}
