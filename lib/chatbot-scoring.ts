/**
 * CHATBOT V2 - Intent Scoring Engine
 * Numeric scoring system (0-100) for precise intent detection
 */

// =====================================================
// SCORING WEIGHTS - Per Spec (exact values from doc)
// precio/cuanto → +3, envio/llega → +2, quiero/comprar → +4
// click producto → +2, add to cart → +4
// =====================================================

export const INTENT_WEIGHTS = {
  // Per spec scoring
  addedToCart: 4,       // add to cart → +4
  askedPrice: 3,        // precio/cuanto → +3
  askedShipping: 2,     // envio/llega → +2
  clickedProduct: 2,    // click producto → +2
  wantsToBuy: 4,        // quiero/comprar → +4
  
  // Additional signals
  selectedVibe: 1,
  selectedUseCase: 1,
  viewedProducts: 1,    // per product
  sentMessage: 0,       // no points for just messaging
  
  // Negative signals
  hesitationDetected: -2,
  askedForHelp: -1,
  longInactivity: -1,   // >60s without action
  
  // Context multipliers
  cartHasItems: 1.2,    // small boost if cart has items
  returningUser: 1.1,
} as const

// =====================================================
// INTENT LEVELS - Per Spec Thresholds
// if score >= 5 → HIGH, if score >= 2 → MEDIUM, else LOW
// =====================================================

export const INTENT_THRESHOLDS = {
  high: 5,     // Score >= 5 → HIGH intent → push checkout
  medium: 2,   // Score 2-4 → MEDIUM intent → show products
  low: 0,      // Score < 2 → LOW intent → gather info
} as const

export type IntentLevel = 'high' | 'medium' | 'low'

// =====================================================
// SESSION STATE
// =====================================================

export interface ChatSessionState {
  sessionId: string
  intentScore: number
  
  // Profile
  vibe?: 'clean' | 'street' | 'bold'
  useCase?: 'diario' | 'salida' | 'regalo'
  
  // Flags
  productsShown: boolean
  userActed: boolean
  hesitationDetected: boolean
  
  // Counters
  messagesCount: number
  productsViewed: number
  productsAddedToCart: number
  
  // Questions asked
  askedPrice: boolean
  askedShipping: boolean
  askedReturns: boolean
  
  // Cart
  cartValue: number
  cartItemsCount: number
  
  // Timing
  lastActivityAt: number
  sessionStartAt: number
  
  // Viewed products (to avoid repetition)
  viewedProductIds: number[]
}

// =====================================================
// SCORING FUNCTIONS
// =====================================================

/**
 * Calculate intent score based on current session state
 */
export function calculateIntentScore(state: ChatSessionState): number {
  let score = 0
  
  // High intent signals
  if (state.productsAddedToCart > 0) {
    score += INTENT_WEIGHTS.addedToCart * Math.min(state.productsAddedToCart, 3)
  }
  if (state.askedPrice) score += INTENT_WEIGHTS.askedPrice
  if (state.askedShipping) score += INTENT_WEIGHTS.askedShipping
  
  // Medium intent signals
  if (state.vibe) score += INTENT_WEIGHTS.selectedVibe
  if (state.useCase) score += INTENT_WEIGHTS.selectedUseCase
  score += INTENT_WEIGHTS.viewedProducts * Math.min(state.productsViewed, 3)
  score += INTENT_WEIGHTS.sentMessage * Math.min(state.messagesCount, 5)
  
  // Negative signals
  if (state.hesitationDetected) score += INTENT_WEIGHTS.hesitationDetected
  
  // Check for inactivity
  const inactivitySeconds = (Date.now() - state.lastActivityAt) / 1000
  if (inactivitySeconds > 60) {
    score += INTENT_WEIGHTS.longInactivity
  }
  
  // Apply multipliers
  if (state.cartItemsCount > 0) {
    score = Math.round(score * INTENT_WEIGHTS.cartHasItems)
  }
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, score))
}

/**
 * Get intent level from score
 */
export function getIntentLevel(score: number): IntentLevel {
  if (score >= INTENT_THRESHOLDS.high) return 'high'
  if (score >= INTENT_THRESHOLDS.medium) return 'medium'
  return 'low'
}

/**
 * Get recommended action based on intent and state
 */
export function getRecommendedAction(state: ChatSessionState): {
  action: string
  urgency: boolean
  message?: string
} {
  const score = calculateIntentScore(state)
  const level = getIntentLevel(score)
  
  // HIGH INTENT - Push to checkout
  if (level === 'high') {
    if (state.cartItemsCount > 0) {
      return {
        action: 'push_checkout',
        urgency: true,
        message: 'Se estan moviendo bastante ahora mismo.\nPagas cuando te llegue.'
      }
    }
    // High intent but no cart - they want to buy, show products
    return {
      action: 'show_best_products',
      urgency: true,
      message: 'Las mas buscadas:'
    }
  }
  
  // MEDIUM INTENT - Keep engaged with products
  if (level === 'medium') {
    if (state.hesitationDetected) {
      return {
        action: 'handle_hesitation',
        urgency: true,
        message: 'Pidela contraentrega.\nPagas cuando llegue.'
      }
    }
    if (!state.productsShown) {
      return {
        action: 'show_products',
        urgency: false,
        message: state.vibe 
          ? (state.vibe === 'clean' ? 'Estas son clean:' : 'Estas destacan:')
          : 'Las mas buscadas:'
      }
    }
    return {
      action: 'ask_preference',
      urgency: false,
      message: 'Cual te gusto?'
    }
  }
  
  // LOW INTENT - Gather information
  if (!state.vibe) {
    return {
      action: 'ask_vibe',
      urgency: false,
      message: 'Algo clean o que destaque?'
    }
  }
  if (!state.useCase) {
    return {
      action: 'ask_use_case',
      urgency: false,
      message: 'Para diario o salida?'
    }
  }
  return {
    action: 'show_products',
    urgency: false,
    message: 'Te muestro opciones?'
  }
}

// =====================================================
// HESITATION DETECTION
// =====================================================

const HESITATION_KEYWORDS = [
  'no se', 'no sé', 'despues', 'después', 'luego', 'pensarlo',
  'pensando', 'veo', 'revisar', 'caro', 'mucho', 'demasiado',
  'cara', 'costoso', 'costosa', 'mejor no', 'quizas', 'quizás',
  'tal vez', 'talvez', 'otro dia', 'otro día', 'duda', 'seguro',
  'checar', 'consultar', 'preguntar', 'primero'
]

export function detectHesitation(message: string): boolean {
  const lower = message.toLowerCase()
  return HESITATION_KEYWORDS.some(keyword => lower.includes(keyword))
}

export function getHesitationKeywords(message: string): string[] {
  const lower = message.toLowerCase()
  return HESITATION_KEYWORDS.filter(keyword => lower.includes(keyword))
}

// =====================================================
// MESSAGE INTENT DETECTION
// =====================================================

const PRICE_KEYWORDS = ['precio', 'cuanto', 'cuánto', 'cuesta', 'vale', 'cost']
const SHIPPING_KEYWORDS = ['envio', 'envío', 'domicilio', 'llega', 'demora', 'tarda', 'despacho']
const RETURNS_KEYWORDS = ['devolucion', 'devolución', 'cambio', 'garantia', 'garantía', 'devolver']
const SUPPORT_KEYWORDS = ['ayuda', 'problema', 'error', 'reclamo', 'queja', 'hablar', 'humano', 'agente']

export function analyzeMessage(message: string): {
  isPrice: boolean
  isShipping: boolean
  isReturns: boolean
  isSupport: boolean
  isHesitation: boolean
  hesitationKeywords: string[]
} {
  const lower = message.toLowerCase()
  
  return {
    isPrice: PRICE_KEYWORDS.some(k => lower.includes(k)),
    isShipping: SHIPPING_KEYWORDS.some(k => lower.includes(k)),
    isReturns: RETURNS_KEYWORDS.some(k => lower.includes(k)),
    isSupport: SUPPORT_KEYWORDS.some(k => lower.includes(k)),
    isHesitation: detectHesitation(message),
    hesitationKeywords: getHesitationKeywords(message)
  }
}

// =====================================================
// PRODUCT SCORING - Best products to show
// =====================================================

export interface ProductScore {
  productId: number
  score: number
  reasons: string[]
}

/**
 * Score products for a given session state
 * Higher score = more likely to convert
 */
export function scoreProductsForSession(
  products: Array<{
    id: number
    price: number
    stock: number
    name: string
    description?: string
    showToCartRate?: number
    cartToPurchaseRate?: number
  }>,
  state: ChatSessionState
): ProductScore[] {
  return products.map(product => {
    let score = 50 // Base score
    const reasons: string[] = []
    
    // Avoid already viewed products
    if (state.viewedProductIds.includes(product.id)) {
      score -= 30
      reasons.push('already_viewed')
    }
    
    // Boost products with good conversion rates
    if (product.showToCartRate && product.showToCartRate > 0.1) {
      score += 20
      reasons.push('high_conversion')
    }
    
    // Boost low stock (urgency)
    if (product.stock <= 5 && product.stock > 0) {
      score += 15
      reasons.push('low_stock')
    }
    
    // Vibe matching
    const productText = `${product.name} ${product.description || ''}`.toLowerCase()
    if (state.vibe === 'clean') {
      const cleanWords = ['minimal', 'clean', 'basica', 'lisa', 'negra', 'blanca', 'clasica']
      if (cleanWords.some(w => productText.includes(w))) {
        score += 10
        reasons.push('matches_vibe_clean')
      }
    } else if (state.vibe === 'bold') {
      const boldWords = ['animal', 'print', 'estampado', 'colores', 'leopardo', 'statement']
      if (boldWords.some(w => productText.includes(w))) {
        score += 10
        reasons.push('matches_vibe_bold')
      }
    }
    
    // Price matching for cart value
    if (state.cartValue > 0 && Math.abs(product.price - state.cartValue / state.cartItemsCount) < 20000) {
      score += 5
      reasons.push('price_range_match')
    }
    
    return {
      productId: product.id,
      score,
      reasons
    }
  }).sort((a, b) => b.score - a.score)
}

// =====================================================
// SESSION STATE MANAGEMENT
// =====================================================

/**
 * Create initial session state
 */
export function createInitialSessionState(sessionId: string): ChatSessionState {
  const now = Date.now()
  return {
    sessionId,
    intentScore: 0,
    productsShown: false,
    userActed: false,
    hesitationDetected: false,
    messagesCount: 0,
    productsViewed: 0,
    productsAddedToCart: 0,
    askedPrice: false,
    askedShipping: false,
    askedReturns: false,
    cartValue: 0,
    cartItemsCount: 0,
    lastActivityAt: now,
    sessionStartAt: now,
    viewedProductIds: []
  }
}

/**
 * Update session state with new event
 */
export function updateSessionState(
  state: ChatSessionState,
  event: {
    type: 'message' | 'view_product' | 'add_to_cart' | 'vibe_selected' | 'use_case_selected' | 'quick_reply'
    data?: Record<string, unknown>
  }
): ChatSessionState {
  const newState = { ...state, lastActivityAt: Date.now() }
  
  switch (event.type) {
    case 'message':
      const analysis = analyzeMessage(event.data?.text as string || '')
      newState.messagesCount++
      if (analysis.isPrice) newState.askedPrice = true
      if (analysis.isShipping) newState.askedShipping = true
      if (analysis.isReturns) newState.askedReturns = true
      if (analysis.isHesitation) newState.hesitationDetected = true
      break
      
    case 'view_product':
      newState.productsViewed++
      newState.productsShown = true
      if (event.data?.productId) {
        newState.viewedProductIds = [...newState.viewedProductIds, event.data.productId as number]
      }
      break
      
    case 'add_to_cart':
      newState.productsAddedToCart++
      newState.userActed = true
      if (event.data?.price) {
        newState.cartValue += event.data.price as number
        newState.cartItemsCount++
      }
      break
      
    case 'vibe_selected':
      newState.vibe = event.data?.vibe as 'clean' | 'street' | 'bold'
      newState.userActed = true
      break
      
    case 'use_case_selected':
      newState.useCase = event.data?.useCase as 'diario' | 'salida' | 'regalo'
      newState.userActed = true
      break
      
    case 'quick_reply':
      newState.userActed = true
      break
  }
  
  // Recalculate intent score
  newState.intentScore = calculateIntentScore(newState)
  
  return newState
}
