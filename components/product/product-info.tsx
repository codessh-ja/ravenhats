'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, ShoppingBag, Truck, Shield, RotateCcw, CreditCard, MessageCircle, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/data'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'
import { BUSINESS, SHIPPING } from '@/lib/constants'

interface ProductInfoProps {
  product: Product
}

export function ProductInfo({ product }: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1)
  const { addItem } = useCart()

  const isOutOfStock = product.stock === 0
  const isLowStock = product.stock > 0 && product.stock <= 3
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price
  const discountPercent = hasDiscount ? Math.round((1 - product.price / product.compareAtPrice!) * 100) : 0

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta
    if (newQuantity >= 1 && newQuantity <= product.stock) {
      setQuantity(newQuantity)
    }
  }

  const handleAddToCart = () => {
    addItem(product, quantity)
    toast.success('Agregado al carrito')
  }

  const handleBuyNow = () => {
    addItem(product, quantity)
    window.location.href = '/checkout'
  }

  return (
    <div className="flex flex-col">
      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {hasDiscount && (
          <Badge className="bg-red-500 text-white">-{discountPercent}% OFF</Badge>
        )}
        {isLowStock && (
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Ultimas {product.stock} unidades
          </Badge>
        )}
        {product.featured && (
          <Badge variant="outline">Bestseller</Badge>
        )}
      </div>

      {/* Collection */}
      {product.collection && (
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
          {product.collection}
        </p>
      )}

      {/* Name */}
      <h1 className="text-2xl lg:text-4xl font-black tracking-tight text-balance">
        {product.name}
      </h1>

      {/* Price */}
      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
        {hasDiscount && (
          <>
            <span className="text-xl text-muted-foreground line-through">
              {formatPrice(product.compareAtPrice!)}
            </span>
            <span className="text-sm font-medium text-red-500">
              Ahorras {formatPrice(product.compareAtPrice! - product.price)}
            </span>
          </>
        )}
      </div>

      {/* Stock indicator */}
      <div className="mt-3 flex items-center gap-2">
        {isOutOfStock ? (
          <Badge variant="destructive">Agotado</Badge>
        ) : isLowStock ? (
          <span className="text-sm text-amber-600 font-medium flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            Solo quedan {product.stock} disponibles
          </span>
        ) : (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1">
            <Check className="h-4 w-4" />
            En stock
          </span>
        )}
      </div>

      {/* Description */}
      <p className="mt-6 text-muted-foreground leading-relaxed">
        {product.description}
      </p>

      {/* Quick features */}
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-green-600" />
          100% Original
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Truck className="h-4 w-4 text-blue-600" />
          Envío desde {formatPrice(SHIPPING.zones.zone1.price)}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CreditCard className="h-4 w-4 text-purple-600" />
          Pago contraentrega
        </div>
      </div>

      {/* Quantity */}
      <div className="mt-8">
        <p className="text-sm font-medium mb-3">Cantidad</p>
        <div className="flex items-center">
          <button
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1 || isOutOfStock}
            className="w-12 h-12 flex items-center justify-center border border-border rounded-l-lg hover:bg-secondary transition-colors disabled:opacity-30"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-16 h-12 flex items-center justify-center border-y border-border font-bold">
            {quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(1)}
            disabled={quantity >= product.stock || isOutOfStock}
            className="w-12 h-12 flex items-center justify-center border border-border rounded-r-lg hover:bg-secondary transition-colors disabled:opacity-30"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3">
        <Button
          size="lg"
          onClick={handleBuyNow}
          disabled={isOutOfStock}
          className="w-full h-14 text-sm font-bold tracking-wider"
        >
          COMPRAR AHORA
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="w-full h-14 text-sm font-bold tracking-wider bg-transparent"
        >
          <ShoppingBag className="mr-2 h-5 w-5" />
          AGREGAR AL CARRITO
        </Button>
      </div>

      {/* WhatsApp link */}
      <a
        href={`https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(`Hola! Me interesa la gorra: ${product.name}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        Tienes dudas? Escribenos por WhatsApp
      </a>

      {/* Accordion info */}
      <Accordion type="single" collapsible className="mt-8 border-t border-border">
        <AccordionItem value="details">
          <AccordionTrigger className="text-sm font-medium">
            Detalles del producto
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-2">
            <p>Marca: Goorin Bros</p>
            <p>Material: Algodon / Poliester / Malla</p>
            <p>Talla: Unica ajustable (Snapback)</p>
            <p>Parche: Bordado de alta calidad</p>
            <p>Incluye: Etiquetas y empaque original</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Trust badges */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium">100% Original</p>
              <p className="text-[10px] text-muted-foreground">Goorin Bros</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium">Envio nacional</p>
              <p className="text-[10px] text-muted-foreground">Todo Colombia</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium">10 dias</p>
              <p className="text-[10px] text-muted-foreground">Para cambios</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
