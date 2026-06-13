'use client'

import React from "react"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, ShoppingBag, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/data'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'
import { QuickViewModal } from '@/components/product/quick-view-modal'

interface ProductGridProps {
  products: Product[]
}

export function ProductGrid({ products }: ProductGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
  const { addItem } = useCart()

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault()
    e.stopPropagation()
    if (product.stock === 0) return
    addItem(product, 1)
    toast.success(`${product.name} agregado al carrito`)
  }

  const handleQuickView = (e: React.MouseEvent, product: Product) => {
    e.preventDefault()
    e.stopPropagation()
    setQuickViewProduct(product)
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 border border-border flex items-center justify-center mb-4">
          <ShoppingBag className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No hay productos</h3>
        <p className="text-sm text-muted-foreground">Intenta ajustar los filtros de busqueda</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {products.map((product) => {
          const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price
          const discountPercent = hasDiscount 
            ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
            : 0
          const isHovered = hoveredId === product.id
          const rating = (4 + Math.random()).toFixed(1)
          const reviews = Math.floor(Math.random() * 50) + 5
          const isOutOfStock = product.stock === 0

          return (
            <Link
              key={product.id}
              href={`/producto/${product.slug}`}
              className="product-card group"
              onMouseEnter={() => setHoveredId(product.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="relative aspect-square bg-card overflow-hidden card-shine">
                <Image
                  src={isHovered && product.images[1] ? product.images[1] : product.images[0] || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  className="object-cover img-zoom"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                  {hasDiscount && (
                    <span className="sale-badge px-2 py-1 bg-accent text-accent-foreground text-[10px] font-bold tracking-wider">
                      -{discountPercent}%
                    </span>
                  )}
                  {isOutOfStock && (
                    <span className="px-2 py-1 bg-muted text-muted-foreground text-[10px] font-bold tracking-wider">
                      AGOTADO
                    </span>
                  )}
                </div>

                {/* Hover actions */}
                <div className={`absolute inset-0 bg-background/10 flex items-end justify-center pb-4 transition-all duration-300 z-10 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                  <div className={`flex gap-2 transition-transform duration-300 ${
                    isHovered ? 'translate-y-0' : 'translate-y-4'
                  }`}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => handleQuickView(e, product)}
                      className="bg-background/95 hover:bg-background text-foreground rounded-none h-10 px-4 text-xs"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => handleAddToCart(e, product)}
                      disabled={isOutOfStock}
                      className="bg-foreground hover:bg-foreground/90 text-background rounded-none h-10 w-10 p-0"
                    >
                      <ShoppingBag className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <h3 className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-muted-foreground transition-colors">
                  {product.name}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < Math.floor(Number(rating)) ? 'fill-amber-400 text-amber-400' : 'text-muted'}`}
                      />
                    ))}
                  </div>
                  <span>{rating}</span>
                  <span className="text-muted-foreground/50">({reviews})</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="font-bold text-base">
                    {formatPrice(product.price)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(product.compareAtPrice!)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal 
          product={quickViewProduct}
          open={!!quickViewProduct}
          onOpenChange={(open) => !open && setQuickViewProduct(null)}
        />
      )}
    </>
  )
}
