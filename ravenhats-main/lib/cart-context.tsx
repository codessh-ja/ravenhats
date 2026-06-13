'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { Product, CartItem } from './types'

const CART_STORAGE_KEY = 'raven_hats_cart'
const PENDING_ORDER_KEY = 'raven_hats_pending_order'
const CART_VERSION = '1.0'

interface PendingOrder {
  orderNumber: string
  timestamp: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  clearCartAfterPayment: () => void
  setPendingOrder: (orderNumber: string) => void
  getPendingOrder: () => PendingOrder | null
  clearPendingOrder: () => void
  itemCount: number
  subtotal: number
  isHydrated: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// Funcion segura para leer del localStorage (persistente)
function getStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    // Verificar version y estructura
    if (parsed.version !== CART_VERSION || !Array.isArray(parsed.items)) {
      localStorage.removeItem(CART_STORAGE_KEY)
      return []
    }
    // Validar cada item tiene la estructura esperada
    return parsed.items.filter((item: CartItem) => 
      item?.product?.id && 
      typeof item.quantity === 'number' && 
      item.quantity > 0
    )
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY)
    return []
  }
}

// Funcion segura para guardar en localStorage
function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      version: CART_VERSION,
      items,
      timestamp: Date.now()
    }))
  } catch {
    // Si falla (quota exceeded, etc), no hacer nada
  }
}

// Funciones para manejar ordenes pendientes de pago
function getStoredPendingOrder(): PendingOrder | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(PENDING_ORDER_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    // Expirar ordenes pendientes despues de 2 horas
    if (Date.now() - parsed.timestamp > 2 * 60 * 60 * 1000) {
      localStorage.removeItem(PENDING_ORDER_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function savePendingOrder(orderNumber: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify({
      orderNumber,
      timestamp: Date.now()
    }))
  } catch {
    // Ignorar errores
  }
}

function removePendingOrder(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PENDING_ORDER_KEY)
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Hidratar carrito desde localStorage al montar
  useEffect(() => {
    const storedItems = getStoredCart()
    setItems(storedItems)
    setIsHydrated(true)
  }, [])

  // Guardar carrito cuando cambie (despues de hidratar)
  useEffect(() => {
    if (isHydrated) {
      saveCart(items)
    }
  }, [items, isHydrated])

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.product.id === product.id)
      if (existingItem) {
        return prevItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
            : item
        )
      }
      return [...prevItems, { product, quantity: Math.min(quantity, product.stock) }]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.product.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, item.product.stock) }
          : item
      )
    )
  }, [removeItem])

  // clearCart normal - NO borra el carrito, solo lo vacia temporalmente
  // Usado cuando el usuario va a Wompi pero puede volver
  const clearCart = useCallback(() => {
    // No hacemos nada aqui - el carrito se mantiene hasta confirmar pago
  }, [])

  // clearCartAfterPayment - Limpia el carrito definitivamente despues de un pago exitoso
  const clearCartAfterPayment = useCallback(() => {
    setItems([])
    removePendingOrder()
  }, [])

  // Manejar orden pendiente de pago
  const setPendingOrder = useCallback((orderNumber: string) => {
    savePendingOrder(orderNumber)
  }, [])

  const getPendingOrder = useCallback(() => {
    return getStoredPendingOrder()
  }, [])

  const clearPendingOrder = useCallback(() => {
    removePendingOrder()
  }, [])

  const itemCount = items.reduce((total, item) => total + item.quantity, 0)
  const subtotal = items.reduce((total, item) => total + item.product.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        clearCartAfterPayment,
        setPendingOrder,
        getPendingOrder,
        clearPendingOrder,
        itemCount,
        subtotal,
        isHydrated,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
