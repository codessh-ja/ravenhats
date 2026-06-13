'use client'

import React, { useState } from "react"
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/data'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'
import { QuickViewModal } from '@/components/product/quick-view-modal'

interface ProductCardProps {
  product: Product
  showRating?: boolean
  showCollection?: boolean
  showDiscount?: boolean
  size?: 'default' | 'large'
}

export function ProductCard({ 
  product, 
  showCollection = true, 
  showDiscount = false,
  size = 'default'
}: ProductCardProps) {
  const { addItem } = useCart()
  const [imageIndex, setImageIndex] = useState(0)
  const [showQuickView, setShowQuickView] = useState(false)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (product.stock === 0) return
    addItem(product, 1)
    toast.success(`${product.name} agregado al carrito`)
  }

  const isOutOfStock = product.stock === 0
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price
  const discountPercent = hasDiscount 
    ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
    : 0

  return (
    <>
      <Link 
        href={`/producto/${product.slug}`} 
        className="group block product-card"
        onMouseEnter={() => product.images.length > 1 && setImageIndex(1)}
        onMouseLeave={() => setImageIndex(0)}
      >
        {/* Image container - Clean with subtle shadow on hover */}
        <div className={`relative overflow-hidden bg-card card-shine ${size === 'large' ? 'aspect-[4/5]' : 'aspect-square'}`}>
          {/* Product image - centered and clean */}
          <Image
            src={product.images[imageIndex] || product.images[0] || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover img-zoom"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkMjU1LS0yMi4qODc6OjYuNUE3MjY1T1c/Slo9YmRYXmRXYVZpX1v/wAALCAAIAAoBAREA/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgIBAwUBAAAAAAAAAAAAAQIDEQAEEiEFBjFBUWH/2gAIAQEAAD8Aw4gv/9k="
          />
          
          {/* Minimal badge - only discount or sold out */}
          {(hasDiscount || isOutOfStock) && (
            <div className="absolute top-3 left-3 z-10">
              {hasDiscount && !isOutOfStock && (
                <span className="sale-badge px-3 py-1.5 bg-white text-black text-[10px] font-bold tracking-wider">
                  -{discountPercent}%
                </span>
              )}
              {isOutOfStock && (
                <span className="px-3 py-1.5 bg-black/80 text-white text-[10px] font-bold tracking-wider">
                  AGOTADO
                </span>
              )}
            </div>
          )}

          {/* Hover overlay - minimal with just add to cart */}
          {!isOutOfStock && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-400 flex items-end justify-center z-10">
              <Button
                size="sm"
                onClick={handleAddToCart}
                className="bg-white text-black hover:bg-white/90 rounded-none h-12 w-full opacity-0 group-hover:opacity-100 translate-y-full group-hover:translate-y-0 transition-all duration-400 text-xs font-bold tracking-wider"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                AGREGAR
              </Button>
            </div>
          )}
        </div>

        {/* Product info - Clean and minimal */}
        <div className="mt-5 space-y-2">
          {/* Collection - subtle */}
          {showCollection && product.collection && (
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-[0.2em]">
              {product.collection}
            </p>
          )}
          
          {/* Product name - clean */}
          <h3 className="font-medium text-sm text-foreground line-clamp-1">
            {product.name}
          </h3>

          {/* Price - Clear hierarchy */}
          <div className="flex items-center gap-3">
            <span className={`font-bold ${size === 'large' ? 'text-lg' : 'text-base'} ${hasDiscount ? 'text-red-500' : 'text-foreground'}`}>
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground/60 line-through">
                {formatPrice(product.compareAtPrice!)}
              </span>
            )}
          </div>
          
          {/* Savings indicator for discount view */}
          {hasDiscount && showDiscount && (
            <p className="text-[10px] text-red-500 font-medium tracking-wide">
              Ahorras {formatPrice(product.compareAtPrice! - product.price)}
            </p>
          )}
        </div>
      </Link>

      {/* Quick View Modal */}
      <QuickViewModal 
        product={product}
        open={showQuickView}
        onOpenChange={setShowQuickView}
      />
    </>
  )
}
