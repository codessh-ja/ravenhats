'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import {
  MessageCircle, X, Send, Package, ShoppingBag, Sparkles,
  HelpCircle, Loader2, CreditCard, Truck, ChevronRight
} from 'lucide-react'
import { useChatbot, ChatMessage, QuickReply } from '@/lib/chatbot-context'
import { useCart } from '@/lib/cart-context'
import { Product } from '@/lib/types'
import { getSalePush, getFaqResponse } from '@/lib/chatbot-human-copy'
import { matchFAQ, generateLocalResponse } from '@/lib/chatbot-knowledge'
import Image from 'next/image'

// ─── Typing dots ────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-start">
      <div className="flex items-center gap-1.5 px-4 py-3 bg-[#161616] rounded-2xl rounded-bl-sm border border-[#242424]">
        <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-[bounce_1.2s_ease-in-out_infinite]" />
        <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-[bounce_1.2s_ease-in-out_0.2s_infinite]" />
        <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-[bounce_1.2s_ease-in-out_0.4s_infinite]" />
      </div>
    </div>
  )
}

// ─── Welcome card — se muestra cuando no hay mensajes ───────────────────────
function WelcomeCard({ onAction }: { onAction: (action: string) => void }) {
  return (
    <div className="animate-[fadeSlideUp_0.35s_ease-out]">
      {/* Greeting */}
      <div className="bg-[#161616] rounded-2xl rounded-bl-sm px-4 py-3 border border-[#242424] mb-3">
        <p className="text-white text-[14px] leading-relaxed">
          ¿Buscas gorra nueva o tienes una duda? 🧢
        </p>
        <p className="text-neutral-500 text-[11px] mt-1.5 leading-relaxed">
          Goorin Bros original · Envíos a todo Colombia
        </p>
      </div>
      {/* 2×2 action grid */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onAction('browse')}
          className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-[13px] font-semibold hover:bg-neutral-100 transition-all active:scale-[0.97]"
        >
          <ShoppingBag className="w-4 h-4" />
          Ver las gorras
        </button>
        <button
          onClick={() => onAction('recommend')}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#161616] border border-[#242424] text-white text-[13px] font-medium hover:bg-[#1e1e1e] transition-all active:scale-[0.97]"
        >
          <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
          Recomiéndame
        </button>
        <button
          onClick={() => onAction('track_order')}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#161616] border border-[#242424] text-white text-[13px] font-medium hover:bg-[#1e1e1e] transition-all active:scale-[0.97]"
        >
          <Package className="w-3.5 h-3.5 text-neutral-400" />
          Mi pedido
        </button>
        <button
          onClick={() => onAction('support')}
          className="col-span-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#161616] border border-[#242424] text-neutral-400 text-[12px] font-medium hover:bg-[#1e1e1e] transition-all active:scale-[0.97]"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Preguntas frecuentes
        </button>
      </div>
    </div>
  )
}

// ─── Product card ─────────────────────────────────────────────────────────
function ChatProductCard({ product, onAddToCart }: { product: Product; onAddToCart: (product: Product) => void }) {
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
    : 0

  const handleClick = () => {
    fetch('/api/chatbot/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, eventType: 'click' }),
    }).catch(() => {})
  }

  return (
    <div
      className="bg-[#161616] rounded-xl w-[135px] flex-shrink-0 overflow-hidden border border-[#242424] cursor-pointer hover:border-[#383838] transition-colors"
      onClick={handleClick}
    >
      <div className="relative w-full h-[105px] bg-[#0d0d0d]">
        {product.images[0] ? (
          <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="135px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-700">
            <ShoppingBag className="w-5 h-5" />
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-1.5 left-1.5 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            -{discountPercent}%
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h4 className="text-[12px] font-medium text-white leading-tight line-clamp-2 mb-1.5">{product.name}</h4>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[13px] font-semibold text-white">${product.price.toLocaleString('es-CO')}</span>
            {hasDiscount && (
              <span className="text-[10px] text-neutral-600 line-through ml-1">
                ${product.compareAtPrice!.toLocaleString('es-CO')}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onAddToCart(product) }}
          disabled={product.stock === 0}
          className="w-full mt-2 bg-white text-black text-[11px] font-semibold py-1.5 rounded-lg hover:bg-neutral-100 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors"
        >
          {product.stock === 0 ? 'Agotado' : 'Agregar'}
        </button>
      </div>
    </div>
  )
}

// ─── Cart item compact ─────────────────────────────────────────────────────
function CartItemCard({ item }: { item: { product: Product; quantity: number } }) {
  return (
    <div className="flex items-center gap-2.5 bg-[#161616] rounded-lg p-2 border border-[#242424]">
      <div className="relative w-9 h-9 rounded-md overflow-hidden bg-[#0d0d0d] flex-shrink-0">
        {item.product.images[0] ? (
          <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" sizes="36px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-700">
            <ShoppingBag className="w-3 h-3" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-white truncate">{item.product.name}</p>
        <p className="text-[10px] text-neutral-500">
          {item.quantity} × ${item.product.price.toLocaleString('es-CO')}
        </p>
      </div>
    </div>
  )
}

// ─── Order status card ─────────────────────────────────────────────────────
function OrderStatusCard({ orderNumber, status, statusLabel }: { orderNumber: string; status: string; statusLabel: string }) {
  const dotColor: Record<string, string> = {
    PENDING_PAYMENT: 'bg-neutral-500',
    CONFIRMED: 'bg-emerald-400',
    PREPARING: 'bg-yellow-400',
    SHIPPED: 'bg-blue-400',
    DELIVERED: 'bg-emerald-400',
    CANCELLED: 'bg-red-500',
  }
  return (
    <div className="bg-[#161616] rounded-xl p-3 border border-[#242424]">
      <div className="flex items-center gap-1.5 mb-2">
        <Package className="w-3.5 h-3.5 text-neutral-500" />
        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Pedido</span>
      </div>
      <p className="font-mono font-bold text-[13px] text-white mb-2">{orderNumber}</p>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor[status] || 'bg-neutral-500'}`} />
        <span className="text-[11px] text-white font-medium">{statusLabel}</span>
      </div>
    </div>
  )
}

// ─── Quick reply pill ──────────────────────────────────────────────────────
function QuickReplyButton({ reply, onClick }: { reply: QuickReply; onClick: () => void }) {
  const isPrimary = reply.isPrimary || ['go_checkout', 'pagar_ahora', 'finalizar', 'checkout'].includes(reply.action)

  const iconMap: Record<string, React.ReactNode> = {
    browse: <ShoppingBag className="w-3 h-3" />,
    recommend: <Sparkles className="w-3 h-3" />,
    track_order: <Package className="w-3 h-3" />,
    support: <HelpCircle className="w-3 h-3" />,
    pagar_ahora: <CreditCard className="w-3 h-3" />,
    go_checkout: <ChevronRight className="w-3 h-3" />,
    contraentrega: <Truck className="w-3 h-3" />,
    support_whatsapp: <span className="text-[11px]">📱</span>,
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all active:scale-[0.96] ${
        isPrimary
          ? 'bg-white text-black hover:bg-neutral-100'
          : 'bg-transparent border border-[#333] text-neutral-200 hover:bg-white/8 hover:border-[#444]'
      }`}
    >
      {iconMap[reply.action]}
      {reply.label}
    </button>
  )
}

// ─── Message bubble ────────────────────────────────────────────────────────
function MessageBubble({
  message,
  onQuickReply,
  onAddToCart,
  showActions = true,
}: {
  message: ChatMessage
  onQuickReply: (action: string, payload?: Record<string, unknown>) => void
  onAddToCart: (product: Product) => void
  showActions?: boolean
}) {
  const isBot = message.type === 'bot'

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} animate-[fadeSlideUp_0.3s_ease-out]`}>
      <div className="max-w-[82%]">
        {/* Bubble */}
        <div
          className={`px-4 py-3 ${
            isBot
              ? `bg-[#161616] text-white rounded-2xl rounded-bl-sm border border-[#242424] ${message.isUrgent ? 'border-white/20' : ''}`
              : 'bg-white text-[#111] rounded-2xl rounded-br-sm'
          }`}
        >
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Cart items */}
        {message.cartItems && message.cartItems.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.cartItems.slice(0, 3).map((item, idx) => (
              <CartItemCard key={idx} item={item} />
            ))}
          </div>
        )}

        {/* Order status */}
        {message.orderStatus && (
          <div className="mt-2">
            <OrderStatusCard {...message.orderStatus} />
          </div>
        )}

        {/* Products carousel */}
        {message.products && message.products.length > 0 && (
          <div className="mt-3 overflow-x-auto scrollbar-hide -mr-4 pr-4">
            <div className="flex gap-2.5 pb-1">
              {message.products.slice(0, 3).map((product) => (
                <ChatProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
              ))}
            </div>
          </div>
        )}

        {/* Quick replies — solo en el último bot message */}
        {showActions && message.quickReplies && message.quickReplies.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {message.quickReplies.map((reply, idx) => (
              <QuickReplyButton
                key={idx}
                reply={reply}
                onClick={() => onQuickReply(reply.action, reply.payload)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main widget ───────────────────────────────────────────────────────────
export function ChatbotWidget() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null

  const {
    isOpen, setIsOpen,
    messages, addMessage, clearMessages,
    isTyping, setIsTyping,
    state, setState, setStep,
    userProfile, updateUserProfile,
    detectIntent, trackEvent,
  } = useChatbot()
  const { items, addItem, itemCount, subtotal } = useCart()
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const openedRef = useRef(false)

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Focus input on open + reset on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    } else {
      openedRef.current = false
    }
  }, [isOpen])

  // Clear messages each time the chat opens fresh (so WelcomeCard shows)
  useEffect(() => {
    if (isOpen && !openedRef.current) {
      openedRef.current = true
      clearMessages()
    }
  }, [isOpen, clearMessages])

  const simulateTyping = useCallback(
    (callback: () => void, delay = 700) => {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        callback()
      }, delay + Math.random() * 300)
    },
    [setIsTyping]
  )

  const fetchProducts = useCallback(async (options?: { featured?: boolean; limit?: number }): Promise<Product[]> => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (options?.featured) params.set('featured', 'true')
      params.set('limit', String(options?.limit || 3))
      const res = await fetch(`/api/chatbot/products?${params}`)
      const data = await res.json()
      return Array.isArray(data) ? data : (data.products || [])
    } catch {
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchOrderStatus = useCallback(async (orderNumber: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/orders?orderNumber=${orderNumber}`)
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const pushToCheckout = useCallback(() => {
    setStep('checkout')
    addMessage({
      type: 'bot',
      content: 'Te la dejo lista.\nPagas ahora o cuando te llegue',
      isUrgent: true,
      quickReplies: [
        { label: 'Pagar ahora', action: 'pagar_ahora', isPrimary: true },
        { label: 'Contraentrega', action: 'contraentrega' },
      ],
    })
    setState('checkout_push')
  }, [addMessage, setState, setStep])

  const handleQuickReply = useCallback(
    async (action: string, payload?: Record<string, unknown>) => {
      switch (action) {
        case 'browse': {
          addMessage({ type: 'user', content: 'Ver productos' })
          setState('browsing')
          simulateTyping(async () => {
            try {
              setIsLoading(true)
              const res = await fetch('/api/chatbot/products?featured=true&limit=3')
              const data = await res.json()
              setIsLoading(false)
              const products: Product[] = Array.isArray(data) ? data : (data.products || [])
              if (products.length > 0) {
                addMessage({
                  type: 'bot',
                  content: data.hook || 'Las más buscadas ahora 🧢',
                  products: products.slice(0, 3),
                  quickReplies: [
                    { label: 'Ir al checkout', action: 'pagar_ahora', isPrimary: true },
                    { label: 'Ver tienda', action: 'go_store' },
                  ],
                })
              } else {
                addMessage({
                  type: 'bot',
                  content: 'Ve al catálogo completo en la tienda 🧢',
                  quickReplies: [{ label: 'Ver tienda', action: 'go_store', isPrimary: true }],
                })
              }
            } catch {
              setIsLoading(false)
              addMessage({
                type: 'bot',
                content: 'Mira las gorras en la tienda 🧢',
                quickReplies: [{ label: 'Ver tienda', action: 'go_store', isPrimary: true }],
              })
            }
          }, 800)
          break
        }

        case 'recommend': {
          addMessage({ type: 'user', content: 'Recomiéndame una' })
          setState('recommending')
          simulateTyping(() => {
            addMessage({
              type: 'bot',
              content: '¿La prefieres más tranquila o que destaque?',
              quickReplies: [
                { label: 'Más tranquila', action: 'vibe_clean', isPrimary: true },
                { label: 'Que destaque', action: 'vibe_bold' },
                { label: 'Sorpréndeme', action: 'rec_any' },
              ],
            })
          })
          break
        }

        case 'vibe_clean': {
          addMessage({ type: 'user', content: 'Más tranquila' })
          updateUserProfile({ vibe: 'clean', hasClickedProduct: true })
          simulateTyping(async () => {
            const products = await fetchProducts({ featured: true, limit: 3 })
            addMessage({
              type: 'bot',
              content: 'Van con todo, muy versátiles 🧢',
              products: products.length > 0 ? products : undefined,
              quickReplies: [
                { label: 'Ir al checkout', action: 'pagar_ahora', isPrimary: true },
                { label: 'Ver tienda', action: 'go_store' },
              ],
            })
          }, 1000)
          break
        }

        case 'vibe_bold': {
          addMessage({ type: 'user', content: 'Que destaque' })
          updateUserProfile({ vibe: 'bold', hasClickedProduct: true })
          simulateTyping(async () => {
            const products = await fetchProducts({ featured: true, limit: 3 })
            addMessage({
              type: 'bot',
              content: 'Estas sí se notan 🔥',
              products: products.length > 0 ? products : undefined,
              quickReplies: [
                { label: 'Ir al checkout', action: 'pagar_ahora', isPrimary: true },
                { label: 'Ver tienda', action: 'go_store' },
              ],
            })
          }, 1000)
          break
        }

        case 'rec_any': {
          addMessage({ type: 'user', content: 'Sorpréndeme' })
          simulateTyping(async () => {
            const products = await fetchProducts({ featured: true, limit: 3 })
            addMessage({
              type: 'bot',
              content: 'Las más buscadas esta semana 🔥',
              products: products.length > 0 ? products : undefined,
              quickReplies: [
                { label: 'Ir al checkout', action: 'pagar_ahora', isPrimary: true },
                { label: 'Ver tienda', action: 'go_store' },
              ],
            })
          }, 1000)
          break
        }

        case 'rec_daily':
        case 'rec_special': {
          const label = action === 'rec_daily' ? 'Uso diario' : 'Para salir'
          addMessage({ type: 'user', content: label })
          updateUserProfile({ useCase: action === 'rec_daily' ? 'diario' : 'salida', hasClickedProduct: true })
          simulateTyping(async () => {
            const products = await fetchProducts({ featured: true, limit: 3 })
            addMessage({
              type: 'bot',
              content: action === 'rec_daily' ? 'Perfectas para llevar todos los días 🧢' : 'Para destacar 🔥',
              products: products.length > 0 ? products : undefined,
              quickReplies: [
                { label: 'Ir al checkout', action: 'pagar_ahora', isPrimary: true },
                { label: 'Ver tienda', action: 'go_store' },
              ],
            })
          }, 1000)
          break
        }

        case 'track_order': {
          addMessage({ type: 'user', content: 'Rastrear mi pedido' })
          setState('tracking')
          simulateTyping(() => {
            addMessage({
              type: 'bot',
              content: '¿Cuál es tu número de pedido?\n(Formato: RH-000001)',
            })
          })
          break
        }

        case 'view_cart': {
          addMessage({ type: 'user', content: 'Ver mi carrito' })
          setState('cart')
          simulateTyping(() => {
            if (items.length > 0) {
              addMessage({
                type: 'bot',
                content: getSalePush('cartReminder'),
                cartItems: items,
                quickReplies: [
                  { label: 'Pagar ahora', action: 'pagar_ahora', isPrimary: true },
                  { label: 'Contraentrega', action: 'contraentrega' },
                ],
              })
            } else {
              addMessage({
                type: 'bot',
                content: 'El carrito está vacío. ¿Vemos las gorras?',
                quickReplies: [
                  { label: 'Ver gorras', action: 'browse', isPrimary: true },
                  { label: 'Recomiéndame', action: 'recommend' },
                ],
              })
            }
          })
          break
        }

        case 'support': {
          addMessage({ type: 'user', content: 'Preguntas frecuentes' })
          setState('support')
          simulateTyping(() => {
            addMessage({
              type: 'bot',
              content: '¿Sobre qué tienes duda?',
              quickReplies: [
                { label: 'Métodos de pago', action: 'support_payment' },
                { label: 'Envíos', action: 'support_shipping' },
                { label: 'Cambios', action: 'support_returns' },
                { label: 'WhatsApp', action: 'support_whatsapp' },
              ],
            })
          })
          break
        }

        case 'support_payment': {
          addMessage({ type: 'user', content: 'Métodos de pago' })
          updateUserProfile({ hasAskedPrice: true })
          simulateTyping(() => {
            addMessage({
              type: 'bot',
              content: getFaqResponse('payment'),
              quickReplies: itemCount > 0
                ? [{ label: 'Ir al checkout', action: 'pagar_ahora', isPrimary: true }, { label: 'Contraentrega', action: 'contraentrega' }]
                : [{ label: 'Ver gorras', action: 'browse', isPrimary: true }, { label: 'WhatsApp', action: 'support_whatsapp' }],
            })
          })
          break
        }

        case 'support_shipping': {
          addMessage({ type: 'user', content: 'Envíos' })
          updateUserProfile({ hasAskedShipping: true })
          simulateTyping(() => {
            addMessage({
              type: 'bot',
              content: getFaqResponse('shipping'),
              quickReplies: itemCount > 0
                ? [{ label: 'Ir al checkout', action: 'pagar_ahora', isPrimary: true }, { label: 'Contraentrega', action: 'contraentrega' }]
                : [{ label: 'Ver gorras', action: 'browse', isPrimary: true }, { label: 'WhatsApp', action: 'support_whatsapp' }],
            })
          })
          break
        }

        case 'support_returns': {
          addMessage({ type: 'user', content: 'Cambios' })
          simulateTyping(() => {
            addMessage({
              type: 'bot',
              content: getFaqResponse('returns'),
              quickReplies: itemCount > 0
                ? [{ label: 'Ir al checkout', action: 'pagar_ahora', isPrimary: true }, { label: 'Contraentrega', action: 'contraentrega' }]
                : [{ label: 'Ver gorras', action: 'browse', isPrimary: true }, { label: 'WhatsApp', action: 'support_whatsapp' }],
            })
          })
          break
        }

        case 'support_whatsapp': {
          addMessage({ type: 'user', content: 'Hablar por WhatsApp' })
          window.open('https://wa.me/13412133624?text=Hola! Tengo una consulta sobre RavenHats', '_blank')
          simulateTyping(() => {
            addMessage({
              type: 'bot',
              content: 'Te abrí WhatsApp 📱 ¿Mientras quieres ver las gorras?',
              quickReplies: [{ label: 'Ver gorras', action: 'browse', isPrimary: true }],
            })
          })
          break
        }

        case 'go_checkout':
        case 'pagar_ahora': {
          addMessage({ type: 'user', content: 'Pagar ahora' })
          setState('checkout_push')
          updateUserProfile({ hasAddedToCart: true })
          trackEvent('checkout_started', { method: 'online', cartValue: subtotal })
          if (itemCount > 0) {
            window.location.href = '/checkout'
          } else {
            simulateTyping(() => {
              addMessage({
                type: 'bot',
                content: 'El carrito está vacío. ¿Vemos algo primero?',
                quickReplies: [{ label: 'Ver gorras', action: 'browse', isPrimary: true }],
              })
            })
          }
          break
        }

        case 'contraentrega': {
          addMessage({ type: 'user', content: 'Contraentrega' })
          setState('checkout_push')
          updateUserProfile({ hasAddedToCart: true })
          trackEvent('checkout_started', { method: 'cod', cartValue: subtotal })
          if (itemCount > 0) {
            window.location.href = '/checkout?method=cod'
          } else {
            simulateTyping(() => {
              addMessage({
                type: 'bot',
                content: 'El carrito está vacío. ¿Vemos algo primero?',
                quickReplies: [{ label: 'Ver gorras', action: 'browse', isPrimary: true }],
              })
            })
          }
          break
        }

        case 'go_store':
          window.location.href = '/tienda'
          break
        case 'go_cart':
          window.location.href = '/carrito'
          break
        case 'browse_more':
          window.location.href = payload?.categoryId ? `/tienda?categoria=${payload.categoryId}` : '/tienda'
          break

        default:
          break
      }
    },
    [
      addMessage, simulateTyping, setState, fetchProducts, itemCount, items,
      detectIntent, pushToCheckout, updateUserProfile, trackEvent, subtotal, setIsLoading,
    ]
  )

  const handleAddToCart = useCallback(
    (product: Product) => {
      addItem(product, 1)
      updateUserProfile({ hasAddedToCart: true, hasClickedProduct: true, userActed: true })
      trackEvent('product_added_to_cart', { productId: product.id, price: product.price })
      fetch('/api/chatbot/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, eventType: 'add_to_cart' }),
      }).catch(() => {})
      setStep('cart')
      simulateTyping(() => {
        addMessage({
          type: 'bot',
          content: 'Lista 🧢 ¿La pedimos?',
          isUrgent: true,
          quickReplies: [
            { label: 'Pagar ahora', action: 'pagar_ahora', isPrimary: true },
            { label: 'Contraentrega', action: 'contraentrega' },
          ],
        })
      })
    },
    [addItem, addMessage, simulateTyping, updateUserProfile, trackEvent, setStep]
  )

  const handleSendMessage = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || isLoading) return

    setInputValue('')
    addMessage({ type: 'user', content: text })
    trackEvent('message_sent', { text })

    // Rastreo de pedido
    const isOrderNumber = /^RH-?\d{5,}$/i.test(text) || /^\d{6,}$/.test(text)
    if (state === 'tracking' || isOrderNumber) {
      setIsTyping(true)
      const order = await fetchOrderStatus(text.toUpperCase())
      setIsTyping(false)
      const statusLabels: Record<string, string> = {
        pending: 'Pendiente de pago', confirmed: 'Confirmado',
        preparing: 'En preparación', shipped: 'Enviado',
        delivered: 'Entregado', cancelled: 'Cancelado',
      }
      if (order) {
        addMessage({
          type: 'bot',
          content: 'Aquí está tu pedido:',
          orderStatus: {
            orderNumber: order.orderNumber,
            status: order.status?.toUpperCase() || 'PENDING',
            statusLabel: statusLabels[order.status] || order.status,
          },
          quickReplies: [
            { label: 'Ver gorras', action: 'browse' },
            { label: 'WhatsApp', action: 'support_whatsapp' },
          ],
        })
      } else {
        addMessage({
          type: 'bot',
          content: 'No encontré ese pedido. Verifica el número (ej: RH-000001).',
          quickReplies: [
            { label: 'Intentar de nuevo', action: 'track_order' },
            { label: 'WhatsApp', action: 'support_whatsapp' },
          ],
        })
      }
      return
    }

    // FAQ local — respuesta instantánea sin API
    const faqAnswer = matchFAQ(text)
    if (faqAnswer) {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        addMessage({
          type: 'bot',
          content: faqAnswer,
          quickReplies: itemCount > 0
            ? [
                { label: 'Ir al checkout', action: 'pagar_ahora', isPrimary: true },
                { label: 'Ver gorras', action: 'browse' },
              ]
            : [
                { label: 'Ver gorras', action: 'browse', isPrimary: true },
                { label: 'WhatsApp', action: 'support_whatsapp' },
              ],
        })
      }, 350 + Math.random() * 250)
      return
    }

    // Pregunta compleja → Gemini AI
    setIsLoading(true)
    setIsTyping(true)

    const recentHistory = messages.slice(-10).map((m) => ({
      role: m.type === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }))

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: recentHistory,
          userContext: {
            vibe: userProfile.vibe,
            useCase: userProfile.useCase,
            hasCart: itemCount > 0,
            cartTotal: subtotal,
          },
        }),
      })

      const data = await res.json()
      setIsTyping(false)
      setIsLoading(false)

      let products: Product[] = []
      if (data.suggestedProductIds?.length > 0) {
        try {
          const pRes = await fetch(`/api/products?ids=${data.suggestedProductIds.join(',')}`)
          if (pRes.ok) {
            const pData = await pRes.json()
            products = Array.isArray(pData) ? pData.slice(0, 3) : []
          }
        } catch { /* skip */ }
      }

      addMessage({
        type: 'bot',
        content: data.message,
        products: products.length > 0 ? products : undefined,
        quickReplies: itemCount > 0
          ? [
              { label: 'Ir al checkout', action: 'pagar_ahora', isPrimary: true },
              { label: 'Ver más gorras', action: 'browse' },
            ]
          : [
              { label: 'Ver gorras', action: 'browse', isPrimary: true },
              { label: 'WhatsApp', action: 'support_whatsapp' },
            ],
      })
    } catch {
      setIsTyping(false)
      setIsLoading(false)
      addMessage({
        type: 'bot',
        content: generateLocalResponse(text),
        quickReplies: itemCount > 0
          ? [
              { label: 'Ir al checkout', action: 'pagar_ahora', isPrimary: true },
              { label: 'Ver gorras', action: 'browse' },
            ]
          : [
              { label: 'Ver gorras', action: 'browse', isPrimary: true },
              { label: 'WhatsApp', action: 'support_whatsapp' },
            ],
      })
    }
  }, [
    inputValue, isLoading, addMessage, state, fetchOrderStatus, messages,
    userProfile.vibe, userProfile.useCase, itemCount, subtotal, trackEvent, setIsTyping,
  ])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style jsx global>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-5 right-5 z-50 w-14 h-14 bg-[#111] text-white rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 border border-[#2a2a2a] ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        }`}
        aria-label="Abrir chat"
      >
        <MessageCircle className="w-6 h-6" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-black text-[10px] font-bold rounded-full flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </button>

      {/* Chat window */}
      <div
        className={`fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-24px)] h-[580px] max-h-[calc(100vh-80px)] bg-[#0d0d0d] rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden border border-[#1e1e1e] transition-all duration-300 ease-out ${
          isOpen
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-95 opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-[#111] border-b border-[#1e1e1e] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center">
                <span className="text-black font-black text-[15px]">R</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#111]" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-[14px] leading-tight">Asesor RavenHats</h3>
              <p className="text-neutral-500 text-[11px]">Goorin Bros · Responde al instante</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/8 transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Mini cart bar */}
        {itemCount > 0 && (
          <div className="px-4 py-2.5 bg-[#111] border-b border-[#1e1e1e] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[12px] text-neutral-300">
                {itemCount} {itemCount === 1 ? 'gorra' : 'gorras'} · ${subtotal.toLocaleString('es-CO')}
              </span>
            </div>
            <button
              onClick={() => (window.location.href = '/checkout')}
              className="text-[11px] font-semibold bg-white text-black px-3 py-1.5 rounded-full hover:bg-neutral-100 transition-colors"
            >
              Finalizar
            </button>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
          {messages.length === 0 && !isTyping ? (
            <WelcomeCard onAction={handleQuickReply} />
          ) : (
            (() => {
              const lastBotIdx = messages.reduce((acc, m, i) => (m.type === 'bot' ? i : acc), -1)
              return messages.map((message, idx) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onQuickReply={handleQuickReply}
                  onAddToCart={handleAddToCart}
                  showActions={idx === lastBotIdx}
                />
              ))
            })()
          )}
          {isTyping && <TypingIndicator />}
          {isLoading && !isTyping && (
            <div className="flex justify-center py-1">
              <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-[#1e1e1e] bg-[#0d0d0d] flex-shrink-0">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendMessage() }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 px-4 py-2.5 bg-[#161616] rounded-full text-[13px] text-white placeholder:text-neutral-600 border border-[#242424] focus:outline-none focus:border-neutral-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:bg-neutral-100 active:scale-95 disabled:bg-[#1e1e1e] disabled:text-neutral-600 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
