'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Minus, Plus, ShoppingBag, Truck, Shield, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/data'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'

interface QuickViewModalProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickViewModal({ product, open, onOpenChange }: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const { addItem } = useCart()

  const handleAddToCart = () => {
    if (product.stock === 0) return
    addItem(product, quantity)
    toast.success(`${product.name} agregado al carrito`)
    onOpenChange(false)
  }

  const isOutOfStock = product.stock === 0
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <div className="grid md:grid-cols-2">
          {/* Image section */}
          <div className="relative bg-card">
            <div className="aspect-square relative">
              <Image
                src={product.images[selectedImage] || product.images[0] || "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
            
            {/* Thumbnail strip */}
            {product.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {product.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-12 h-12 rounded border-2 overflow-hidden ${
                      selectedImage === index ? 'border-foreground' : 'border-transparent'
                    }`}
                  >
                    <Image
                      src={img || "/placeholder.svg"}
                      alt={`${product.name} ${index + 1}`}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </button>
                ))}
              </div>
            )}
            
            {/* Discount badge */}
            {hasDiscount && (
              <div className="absolute top-4 left-4 px-3 py-1 bg-accent text-accent-foreground text-sm font-medium rounded">
                Oferta
              </div>
            )}
          </div>

          {/* Info section */}
          <div className="p-6 lg:p-8 flex flex-col">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">
                {product.collection}
              </p>
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">{product.name}</h2>
              
              {/* Price */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold">{formatPrice(product.price)}</span>
                {hasDiscount && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.compareAtPrice!)}
                  </span>
                )}
              </div>

              <p className="text-muted-foreground mb-6 line-clamp-3">
                {product.description}
              </p>

              {/* Quantity selector */}
              <div className="mb-6">
                <p className="text-sm font-medium mb-2">Cantidad</p>
                <div className="flex items-center border border-border rounded w-fit">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-secondary transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="p-3 hover:bg-secondary transition-colors"
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {product.stock <= 5 && product.stock > 0 && (
                  <p className="text-sm text-accent mt-2">Solo quedan {product.stock} unidades</p>
                )}
              </div>

              {/* Add to cart button */}
              <Button 
                size="lg" 
                className="w-full mb-4"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                {isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
              </Button>

              {/* View full details link */}
              <Link
                href={`/producto/${product.slug}`}
                onClick={() => onOpenChange(false)}
                className="block text-center text-sm text-muted-foreground hover:text-foreground underline"
              >
                Ver todos los detalles
              </Link>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
              <div className="flex flex-col items-center text-center">
                <Truck className="h-5 w-5 mb-1 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Envio nacional</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <Shield className="h-5 w-5 mb-1 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">100% Original</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <RotateCcw className="h-5 w-5 mb-1 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Garantia</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
