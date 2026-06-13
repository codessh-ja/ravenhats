/**
 * Tipos principales para Raven Hats - E-commerce Colombia
 * Todos los precios están en pesos colombianos (COP)
 */

/** Producto de la tienda */
export interface Product {
  id: string
  name: string
  slug: string
  /** Precio en COP */
  price: number
  /** Precio anterior para mostrar descuento (COP) */
  compareAtPrice?: number
  description: string
  images: string[]
  category: string
  collection: string
  /** Cantidad disponible en inventario */
  stock: number
  featured: boolean
  tags: string[]
  /** Whether product appears in manual Descuentos category */
  showInDescuentos?: boolean
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Customer {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  address: string
  city: string
  department: string
  postalCode?: string
}

export interface Order {
  id: string
  orderNumber: string
  customer: Customer
  items: CartItem[]
  subtotal: number
  shipping: number
  total: number
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  paymentStatus: 'pending' | 'approved' | 'rejected'
  paymentMethod?: string
  createdAt: Date
  updatedAt: Date
}

export interface PaymentTransaction {
  id: string
  orderId: string
  reference: string
  amount: number
  currency: string
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR'
  paymentMethod: string
  createdAt: Date
}
