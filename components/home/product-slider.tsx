'use client'

import React, { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/data'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'

interface ProductSliderProps {
  title: string
  subtitle?: string
  products: Product[]
  viewAllLink?: string
  accentColor?: string
}

export function ProductSlider({
  title,
  subtitle,
  products,
  viewAllLink,
  accentColor,
}: ProductSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const { addItem } = useCart()

  const scroll = useCallback((dir: 'left' | 'right') => {
    if (!sliderRef.current) return
    const cardW = sliderRef.current.querySelector('a')?.offsetWidth || 260
    sliderRef.current.scrollBy({ left: dir === 'left' ? -(cardW + 16) : cardW + 16, behavior: 'smooth' })
  }, [])

  const handleAdd = useCallback((e: React.MouseEvent, product: Product) => {
    e.preventDefault()
    e.stopPropagation()
    if (product.stock === 0) return
    addItem(product, 1)
    toast.success(`${product.name} agregado`)
  }, [addItem])

  if (!products.length) return null

  return (
    <section className="py-16 lg:py-20">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-5 lg:px-10 mb-7">
        <div className="flex items-end justify-between">
          <div>
            {subtitle && (
              <p
                className="text-[11px] tracking-[0.3em] uppercase mb-2 font-medium"
                style={{ color: accentColor || 'rgb(115 115 115)' }}
              >
                {subtitle}
              </p>
            )}
            <h2 className="text-2xl lg:text-3xl font-black tracking-tighter text-white leading-none">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {viewAllLink && (
              <Link
                href={viewAllLink}
                className="hidden sm:block text-[11px] tracking-[0.2em] uppercase text-neutral-500 hover:text-white transition-colors"
              >
                Ver todo
              </Link>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => scroll('left')}
                className="w-9 h-9 rounded-full border border-[#2a2a2a] flex items-center justify-center text-neutral-400 hover:border-neutral-500 hover:text-white transition-all active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-9 h-9 rounded-full border border-[#2a2a2a] flex items-center justify-center text-neutral-400 hover:border-neutral-500 hover:text-white transition-all active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid centrado si ≤4 productos, slider si hay más */}
      {products.length <= 4 ? (
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="flex justify-center gap-4 flex-wrap">
            {products.map(product => (
              <div key={product.id} className="w-[200px] lg:w-[240px]">
                <ProductSlideCard product={product} onAdd={handleAdd} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          ref={sliderRef}
          className="flex gap-4 overflow-x-auto px-5 lg:px-10 pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map(product => (
            <ProductSlideCard
              key={product.id}
              product={product}
              onAdd={handleAdd}
            />
          ))}
          <div className="flex-shrink-0 w-5 lg:w-10" />
        </div>
      )}

      {/* Mobile ver todo */}
      {viewAllLink && (
        <div className="px-5 mt-6 sm:hidden">
          <Link
            href={viewAllLink}
            className="block text-center text-[12px] font-bold tracking-widest py-3.5 border border-[#222] text-neutral-300 hover:border-neutral-500 hover:text-white transition-all rounded-xl"
          >
            VER TODO
          </Link>
        </div>
      )}
    </section>
  )
}

function ProductSlideCard({
  product,
  onAdd,
}: {
  product: Product
  onAdd: (e: React.MouseEvent, p: Product) => void
}) {
  const hasDiscount = !!(product.compareAtPrice && product.compareAtPrice > product.price)
  const pct = hasDiscount ? Math.round((1 - product.price / product.compareAtPrice!) * 100) : 0
  const isOut = product.stock === 0
  const isLow = product.stock > 0 && product.stock <= 3
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="flex-shrink-0 w-[200px] lg:w-[240px] group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] rounded-2xl bg-[#0f0f0f] overflow-hidden">
        {product.images[0] && (
          <Image
            src={hovered && product.images[1] ? product.images[1] : product.images[0]}
            alt={product.name}
            fill
            className={`object-cover transition-all duration-500 group-hover:scale-[1.04] ${isOut ? 'opacity-40 grayscale' : ''}`}
            sizes="240px"
            loading="lazy"
          />
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {hasDiscount && (
            <span className="bg-white text-black text-[10px] font-black px-2 py-0.5 rounded-full leading-5">
              -{pct}%
            </span>
          )}
          {isLow && (
            <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full border border-white/10 leading-5">
              Solo {product.stock}
            </span>
          )}
        </div>

        {isOut && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="bg-black/80 text-white text-[10px] font-bold tracking-[0.15em] px-3 py-1 rounded-full border border-white/10">
              AGOTADO
            </span>
          </div>
        )}

        {/* Hover add */}
        {!isOut && (
          <div className="absolute inset-x-2.5 bottom-2.5 translate-y-[110%] group-hover:translate-y-0 transition-transform duration-300 ease-out z-10">
            <button
              onClick={e => onAdd(e, product)}
              className="w-full bg-white text-black text-[11px] font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-neutral-100 active:scale-[0.98] transition-all"
            >
              <ShoppingBag className="w-3 h-3" />
              Agregar
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-3 px-0.5">
        {product.collection && (
          <p className="text-[10px] text-neutral-600 uppercase tracking-[0.15em] mb-1 truncate">
            {product.collection}
          </p>
        )}
        <h3 className="text-[13px] font-medium text-neutral-300 line-clamp-1 group-hover:text-white transition-colors">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={`text-[14px] font-bold ${hasDiscount ? 'text-white' : 'text-white'}`}>
            {formatPrice(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-[11px] text-neutral-600 line-through">
              {formatPrice(product.compareAtPrice!)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
