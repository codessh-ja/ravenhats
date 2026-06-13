/**
 * CHATBOT HUMAN COPY - Variantes naturales para sonar como humano real
 * 
 * Regla: NUNCA repetir la misma frase 2 veces seguidas
 * Estilo: vendedor con buen gusto, no un bot
 */

// Track last used variants to avoid repetition
let lastUsedVariants: Record<string, number> = {}

function getRandomVariant(key: string, variants: string[]): string {
  if (variants.length === 1) return variants[0]
  
  const lastIndex = lastUsedVariants[key] ?? -1
  let newIndex: number
  
  // Avoid same variant twice
  do {
    newIndex = Math.floor(Math.random() * variants.length)
  } while (newIndex === lastIndex && variants.length > 1)
  
  lastUsedVariants[key] = newIndex
  return variants[newIndex]
}

// ============================================
// ENTRADA / OPENING - Preguntas de estilo (per spec: max 2 lines)
// ============================================
export const OPENING_QUESTIONS = {
  vibe: [
    '¿La quieres más sencilla o algo que destaque? 🧢',
    '¿Algo tranquilo o que llame la atención?',
    '¿La prefieres clean o con más onda? 🧢'
  ],
  general: [
    '¿Tienes algo en mente? 🧢',
    '¿Qué estilo buscas?',
    '¿Buscas algo específico?'
  ]
}

export function getOpeningQuestion(type: 'vibe' | 'general' = 'vibe'): string {
  return getRandomVariant(`opening_${type}`, OPENING_QUESTIONS[type])
}

// ============================================
// PRODUCTOS - Cuando muestras gorras (per spec: hook before products)
// ============================================
export const PRODUCT_INTROS = {
  clean: [
    'Estas están muy limpias 🧢',
    'Van con todo, mira estas',
    'Clean pero con estilo 🧢'
  ],
  bold: [
    'Estas destacan más 🔥',
    'Mira estas, sí llaman la atención',
    'Estas levantan el outfit 🔥'
  ],
  featured: [
    'Las más buscadas 🔥',
    'Estas están saliendo bastante 🧢',
    'Mira estas'
  ],
  daily: [
    'Perfectas para diario 🧢',
    'Van con todo'
  ],
  special: [
    'Para destacar 🔥',
    'Estas quedan brutales'
  ],
  gift: [
    'Nunca fallan como regalo 🧢',
    'De las favoritas'
  ]
}

export function getProductIntro(type: 'clean' | 'bold' | 'featured' | 'daily' | 'special' | 'gift' = 'featured'): string {
  return getRandomVariant(`product_${type}`, PRODUCT_INTROS[type])
}

// ============================================
// VENTA - Push to checkout (per spec: short, human)
// ============================================
export const SALE_PUSH = {
  addToCart: [
    'Lista 🧢\n¿La quieres pedir ya?',
    'Ya la tienes 🧢\n¿Te la mando?'
  ],
  urgency: [
    'Se están moviendo bastante 🔥',
    'Quedan pocas'
  ],
  checkout: [
    'Te la dejo lista 🧢\nPagas ahora o cuando te llegue',
    '¿Te la mando? 💳'
  ],
  cartReminder: [
    'Ya la tienes lista 🧢\nSe están moviendo',
    'Esa está saliendo mucho 🔥'
  ]
}

export function getSalePush(type: 'addToCart' | 'urgency' | 'checkout' | 'cartReminder' = 'checkout'): string {
  return getRandomVariant(`sale_${type}`, SALE_PUSH[type])
}

// ============================================
// HESITACIÓN - Cuando dudan (per spec: push COD)
// ============================================
export const HESITATION_RESPONSES = [
  'Pídela contraentrega 🧢\nLa ves primero y decides',
  'Pagas cuando te llegue 💳'
]

export function getHesitationResponse(): string {
  return getRandomVariant('hesitation', HESITATION_RESPONSES)
}

// ============================================
// FAQ - Respuestas orgánicas (per spec PASO 12: ALWAYS end with action)
// ============================================
export const FAQ_RESPONSES = {
  shipping: [
    'Te llega en 2–4 días 🚚\n¿Quieres que te muestre algunas?'
  ],
  payment: [
    'Pagas cuando te llegue 💳\n¿Quieres ver modelos?'
  ],
  returns: [
    'Lo cambiamos sin problema 👍\n¿Quieres ver opciones?'
  ],
  price: [
    'Esa va en {price} 🧢\n¿Te la dejo lista?'
  ]
}

export function getFaqResponse(type: 'shipping' | 'payment' | 'returns' | 'price', price?: string): string {
  let response = getRandomVariant(`faq_${type}`, FAQ_RESPONSES[type])
  if (price) {
    response = response.replace('{price}', price)
  }
  return response
}

// ============================================
// MICRO COPY - Descripciones naturales
// ============================================
export const MICRO_COPY = {
  quality: [
    'Esa combina con todo',
    'Esta levanta el outfit',
    'Está bien equilibrada',
    'No es exagerada pero sí se nota',
    'Es de las que más salen'
  ],
  trending: [
    'Esta está saliendo mucho 🔥',
    'De las más buscadas',
    'Se están moviendo bastante'
  ]
}

export function getMicroCopy(type: 'quality' | 'trending' = 'quality'): string {
  return getRandomVariant(`micro_${type}`, MICRO_COPY[type])
}

// ============================================
// CIERRE - Final push (per spec: "Te la dejo lista / Pagas ahora o cuando te llegue")
// ============================================
export const CLOSING = {
  soft: [
    '¿Te la dejo lista? 🧢',
    '¿Te la mando?'
  ],
  cod: [
    'Pagas ahora o cuando te llegue',
    'Pagas cuando te llegue 💳'
  ]
}

export function getClosing(type: 'soft' | 'cod' = 'soft'): string {
  return getRandomVariant(`closing_${type}`, CLOSING[type])
}

// Reset variant tracking (useful for new sessions)
export function resetVariantTracking() {
  lastUsedVariants = {}
}
