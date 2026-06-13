/**
 * PASO 18 - Sistema de Aprendizaje (Auto-Optimizacion)
 * 
 * El chatbot aprende que gorras convierten mas y las prioriza automaticamente.
 * 
 * Event weights per spec:
 * - view: +1
 * - click: +3  
 * - add_to_cart: +5
 * - purchase: +10
 */

// =====================================================
// EVENT WEIGHTS - Per Spec
// =====================================================

export const PRODUCT_EVENT_WEIGHTS = {
  view: 1,
  click: 3,
  add_to_cart: 5,
  purchase: 10,
} as const

export type ProductEventType = keyof typeof PRODUCT_EVENT_WEIGHTS

// =====================================================
// EVENT STRUCTURE
// =====================================================

export interface ProductEvent {
  productId: string
  eventType: ProductEventType
  timestamp: number
  sessionId?: string
}

// =====================================================
// IN-MEMORY STORAGE (will persist across requests in serverless)
// For production, this should be moved to Redis/Upstash or DB
// =====================================================

// Product events storage
const productEvents: ProductEvent[] = []

// Cached scores (recalculated periodically)
const productScores: Map<string, number> = new Map()

// Last score calculation time
let lastScoreCalculation = 0
const SCORE_CACHE_TTL = 60000 // 1 minute

// =====================================================
// EVENT TRACKING
// =====================================================

/**
 * Track a product event
 */
export function trackProductEvent(
  productId: string,
  eventType: ProductEventType,
  sessionId?: string
): void {
  const event: ProductEvent = {
    productId,
    eventType,
    timestamp: Date.now(),
    sessionId,
  }
  
  productEvents.push(event)
  
  // Keep only last 10000 events to prevent memory bloat
  if (productEvents.length > 10000) {
    productEvents.splice(0, productEvents.length - 10000)
  }
  
  // Invalidate cache
  lastScoreCalculation = 0
}

/**
 * Track multiple events at once
 */
export function trackProductEvents(events: Array<{
  productId: string
  eventType: ProductEventType
  sessionId?: string
}>): void {
  events.forEach(e => trackProductEvent(e.productId, e.eventType, e.sessionId))
}

// =====================================================
// SCORE CALCULATION - Per Spec
// =====================================================

/**
 * Calculate score for a single product
 * score = sum of (eventWeight * eventCount)
 */
export function calculateProductScore(productId: string): number {
  let score = 0
  
  // Count events for this product
  const relevantEvents = productEvents.filter(e => e.productId === productId)
  
  for (const event of relevantEvents) {
    score += PRODUCT_EVENT_WEIGHTS[event.eventType]
  }
  
  return score
}

/**
 * Recalculate all product scores
 */
export function recalculateAllScores(): Map<string, number> {
  productScores.clear()
  
  // Get unique product IDs
  const productIds = new Set(productEvents.map(e => e.productId))
  
  for (const productId of productIds) {
    const score = calculateProductScore(productId)
    productScores.set(productId, score)
  }
  
  lastScoreCalculation = Date.now()
  return productScores
}

/**
 * Get cached scores (recalculates if stale)
 */
export function getProductScores(): Map<string, number> {
  if (Date.now() - lastScoreCalculation > SCORE_CACHE_TTL) {
    recalculateAllScores()
  }
  return productScores
}

/**
 * Get score for a specific product
 */
export function getProductScore(productId: string): number {
  const scores = getProductScores()
  return scores.get(productId) || 0
}

// =====================================================
// SMART PRODUCT SORTING - Per Spec
// =====================================================

export interface ProductWithScore {
  id: string
  name: string
  price: number
  compareAtPrice?: number
  images: string[]
  stock: number
  score: number
  isNew?: boolean
  // ... other product fields
  [key: string]: unknown
}

/**
 * Sort products by learning score with:
 * - New product boost (+5)
 * - Random factor for rotation (0-5)
 * 
 * Per spec: products.sort((a,b) => score[b] - score[a])
 */
export function sortProductsByScore<T extends { id: string; isNew?: boolean; createdAt?: string }>(
  products: T[]
): (T & { learningScore: number })[] {
  const scores = getProductScores()
  
  return products
    .map(product => {
      let score = scores.get(product.id) || 0
      
      // PASO 18.8: New product boost (+5)
      const isNew = product.isNew || 
        (product.createdAt && Date.now() - new Date(product.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000)
      if (isNew) {
        score += 5
      }
      
      // PASO 18.9: Random factor for rotation (0-5)
      const randomFactor = Math.random() * 5
      const finalScore = score + randomFactor
      
      return {
        ...product,
        learningScore: finalScore,
      }
    })
    .sort((a, b) => b.learningScore - a.learningScore)
}

/**
 * Get smart product recommendations
 * Per spec PASO 18.5:
 * - Filter by vibe
 * - Sort by score
 * - No duplicates
 * - Top 3
 */
export function getSmartRecommendations<T extends { id: string; name?: string; description?: string; isNew?: boolean; createdAt?: string }>(
  products: T[],
  options: {
    vibe?: 'clean' | 'bold' | 'street'
    excludeIds?: string[]
    limit?: number
  } = {}
): (T & { learningScore: number; hasHighScore: boolean })[] {
  const { vibe, excludeIds = [], limit = 3 } = options
  
  // Filter out excluded products (no duplicates)
  let filtered = products.filter(p => !excludeIds.includes(p.id))
  
  // Filter by vibe if specified
  if (vibe) {
    const vibeKeywords: Record<string, string[]> = {
      clean: ['minimal', 'clean', 'basica', 'lisa', 'negra', 'blanca', 'clasica', 'simple', 'unicolor'],
      bold: ['animal', 'print', 'estampado', 'colores', 'leopardo', 'statement', 'llamativa', 'destacar'],
      street: ['street', 'urban', 'skate', 'hip', 'hop', 'graffiti', 'snapback'],
    }
    
    const keywords = vibeKeywords[vibe] || []
    if (keywords.length > 0) {
      const vibeFiltered = filtered.filter(p => {
        const text = `${p.name || ''} ${p.description || ''}`.toLowerCase()
        return keywords.some(k => text.includes(k))
      })
      // Only apply filter if we have enough matches
      if (vibeFiltered.length >= limit) {
        filtered = vibeFiltered
      }
    }
  }
  
  // Sort by score
  const sorted = sortProductsByScore(filtered)
  
  // Check if we have high-scoring products (for hook selection)
  const scores = getProductScores()
  const hasHighScoreProducts = sorted.some(p => (scores.get(p.id) || 0) >= 10)
  
  // Take top N
  return sorted.slice(0, limit).map(p => ({
    ...p,
    hasHighScore: hasHighScoreProducts,
  }))
}

// =====================================================
// HOOK SELECTION - Per Spec PASO 18.6
// =====================================================

/**
 * Get the right hook based on whether products have high scores
 */
export function getProductHook(hasHighScoreProducts: boolean): string {
  if (hasHighScoreProducts) {
    // Per spec: "Estas se estan moviendo bastante"
    return 'Estas se estan moviendo bastante 🧢'
  }
  // Per spec: "Mira estas"
  return 'Mira estas'
}

// =====================================================
// ANALYTICS / DEBUG
// =====================================================

/**
 * Get event statistics (for debugging/admin)
 */
export function getEventStats(): {
  totalEvents: number
  eventsByType: Record<ProductEventType, number>
  topProducts: Array<{ productId: string; score: number }>
} {
  const eventsByType: Record<ProductEventType, number> = {
    view: 0,
    click: 0,
    add_to_cart: 0,
    purchase: 0,
  }
  
  for (const event of productEvents) {
    eventsByType[event.eventType]++
  }
  
  const scores = getProductScores()
  const topProducts = Array.from(scores.entries())
    .map(([productId, score]) => ({ productId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
  
  return {
    totalEvents: productEvents.length,
    eventsByType,
    topProducts,
  }
}

/**
 * Clear all events (for testing)
 */
export function clearEvents(): void {
  productEvents.length = 0
  productScores.clear()
  lastScoreCalculation = 0
}
