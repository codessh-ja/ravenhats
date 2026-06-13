/**
 * Constantes de la aplicación Raven Hats
 * E-commerce de gorras Goorin Bros en Colombia
 */

// Configuración del negocio
export const BUSINESS = {
  name: 'Raven Hats',
  domain: 'ravenhats.store',
  tagline: 'Gorras Goorin Bros 100% Originales en Colombia',
  email: 'contacto@ravenhats.store',
  phone: '+1 341 213 3624',
  whatsapp: '13412133624',
  whatsappLink: 'https://wa.me/13412133624',
  address: 'Colombia',
  instagram: 'https://instagram.com/ravenhats.store',
  tiktok: 'https://tiktok.com/@ravenhats.co',
  facebook: 'https://facebook.com/ravenhats.co',
} as const

// Configuracion de envio (precios en COP)
// Basado en tarifas de Interrapidisimo por zonas
export const SHIPPING = {
  /** Ciudades/destinos con envio GRATIS */
  freeShippingDestinations: [
    { city: 'Acacias', department: 'Meta' },
    { city: 'Acacías', department: 'Meta' },
  ],
  /** Tarifas por zona (basadas en Interrapidisimo) */
  zones: {
    // Zona 1: Principales ciudades
    zone1: {
      price: 12000,
      cities: ['Bogotá', 'Bogota', 'Medellín', 'Medellin', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga'],
    },
    // Zona 2: Ciudades intermedias
    zone2: {
      price: 15000,
      cities: ['Pereira', 'Manizales', 'Armenia', 'Ibagué', 'Ibague', 'Neiva', 'Villavicencio', 'Santa Marta', 'Cúcuta', 'Cucuta', 'Pasto', 'Popayán', 'Popoyan', 'Tunja', 'Montería', 'Monteria', 'Valledupar', 'Sincelejo'],
    },
    // Zona 3: Resto del pais
    zone3: {
      price: 18000,
      cities: [], // Cualquier otra ciudad
    },
  },
  /** Tiempo estimado de entrega en dias */
  estimatedDays: {
    min: 3,
    max: 7,
  },
} as const

// Helper para calcular costo de envio
export function calculateShippingCost(city: string, department: string): { cost: number; isFree: boolean; zone: string } {
  const cityNormalized = city.trim().toLowerCase()
  const deptNormalized = department.trim().toLowerCase()
  
  // Verificar si es destino con envio gratis
  const isFreeDestination = SHIPPING.freeShippingDestinations.some(
    dest => dest.city.toLowerCase() === cityNormalized && dest.department.toLowerCase() === deptNormalized
  )
  
  if (isFreeDestination) {
    return { cost: 0, isFree: true, zone: 'free' }
  }
  
  // Verificar zona 1
  const isZone1 = SHIPPING.zones.zone1.cities.some(
    c => c.toLowerCase() === cityNormalized
  )
  if (isZone1) {
    return { cost: SHIPPING.zones.zone1.price, isFree: false, zone: 'zone1' }
  }
  
  // Verificar zona 2
  const isZone2 = SHIPPING.zones.zone2.cities.some(
    c => c.toLowerCase() === cityNormalized
  )
  if (isZone2) {
    return { cost: SHIPPING.zones.zone2.price, isFree: false, zone: 'zone2' }
  }
  
  // Zona 3 por defecto
  return { cost: SHIPPING.zones.zone3.price, isFree: false, zone: 'zone3' }
}

// Configuración de pagos
export const PAYMENT = {
  /** Moneda (COP = Peso Colombiano) */
  currency: 'COP',
  /** Métodos de pago disponibles */
  methods: [
    { id: 'card', name: 'Tarjeta de credito o debito', description: 'Visa, Mastercard, Amex' },
    { id: 'pse', name: 'PSE', description: 'Debito desde tu cuenta bancaria' },
    { id: 'nequi', name: 'Nequi', description: 'Paga con tu billetera digital' },
    { id: 'cod', name: 'Pago contra entrega', description: 'Paga cuando recibas tu pedido' },
  ],
} as const

// Mensajes de estado de pedidos (claros y orientados al usuario)
export const ORDER_STATUS = {
  pending: 'Esperando pago',
  confirmed: 'Pago confirmado',
  processing: 'En preparacion',
  shipped: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
} as const

// Descripciones de estado (microcopy para el usuario)
export const ORDER_STATUS_DESCRIPTION = {
  pending: 'Tu pedido esta reservado. Completa el pago para procesarlo.',
  confirmed: 'Recibimos tu pago. Pronto comenzaremos a preparar tu pedido.',
  processing: 'Estamos empacando tu pedido con mucho cuidado.',
  shipped: 'Tu pedido esta viajando hacia ti. Usa el numero de guia para rastrearlo.',
  delivered: 'Tu pedido fue entregado. Disfruta tus nuevas gorras!',
  cancelled: 'Este pedido fue cancelado.',
} as const

// Mensajes de estado de pago
export const PAYMENT_STATUS = {
  pending: 'Pago pendiente',
  approved: 'Pago confirmado',
  rejected: 'Pago rechazado',
} as const

// Mensajes de validación en español
export const VALIDATION_MESSAGES = {
  required: 'Este campo es requerido',
  invalidEmail: 'Correo electrónico inválido',
  invalidPhone: 'Teléfono inválido (formato colombiano)',
  invalidName: 'Nombre inválido (solo letras, 2-50 caracteres)',
  invalidAddress: 'Dirección inválida (10-200 caracteres)',
  invalidCity: 'Ciudad inválida',
  invalidDepartment: 'Selecciona un departamento válido',
  rateLimitExceeded: 'Demasiados intentos. Por favor espera un momento.',
  cartEmpty: 'Tu carrito está vacío',
  processingError: 'Error al procesar. Por favor intenta de nuevo.',
} as const

// Textos de UI comunes
export const UI_TEXT = {
  // Acciones
  addToCart: 'Agregar al carrito',
  buyNow: 'Comprar ahora',
  continueShopping: 'Seguir comprando',
  proceedToCheckout: 'Proceder al pago',
  subscribe: 'Suscribirse',
  
  // Estados
  outOfStock: 'Agotado',
  lowStock: 'Pocas unidades',
  inStock: 'En stock',
  shipping: 'Envio nacional',
  
  // Secciones
  orderSummary: 'Resumen del pedido',
  contactInfo: 'Información de contacto',
  shippingAddress: 'Dirección de envío',
  paymentMethod: 'Método de pago',
  
  // Otros
  loading: 'Cargando...',
  processing: 'Procesando...',
} as const

// SEO meta tags por defecto
export const SEO = {
  title: 'Raven Hats | Gorras Goorin Bros Originales en Colombia',
  description: 'Tienda oficial de gorras Goorin Bros 100% originales en Colombia. Envío a todo el país. Pago seguro con Wompi.',
  keywords: ['gorras', 'goorin bros', 'colombia', 'gorras originales', 'raven hats', 'caps', 'trucker'],
  locale: 'es_CO',
  type: 'website',
} as const
