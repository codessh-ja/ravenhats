import { NextRequest, NextResponse } from 'next/server'
import { query, DBProduct } from '@/lib/db'
import { scoreProductsForSession, ChatSessionState } from '@/lib/chatbot-scoring'

/**
 * POST /api/chat/products
 * Get smart product recommendations based on session state
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionState, limit = 3, categoryId } = body as {
      sessionState: ChatSessionState
      limit?: number
      categoryId?: number
    }

    // Build query based on filters
    let sql = `
      SELECT p.*, 
             c.name as category_name, c.slug as category_slug,
             (SELECT GROUP_CONCAT(url ORDER BY position) FROM product_images WHERE product_id = p.id) as images,
             COALESCE(cps.show_to_cart_rate, 0) as show_to_cart_rate,
             COALESCE(cps.cart_to_purchase_rate, 0) as cart_to_purchase_rate,
             COALESCE(cps.times_purchased, 0) as times_purchased
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN chat_product_stats cps ON p.id = cps.product_id
      WHERE p.is_active = TRUE AND p.stock > 0
    `
    const params: (string | number)[] = []

    if (categoryId) {
      sql += ' AND p.category_id = ?'
      params.push(categoryId)
    }

    // Exclude already viewed products if we have some
    if (sessionState?.viewedProductIds?.length > 0) {
      sql += ` AND p.id NOT IN (${sessionState.viewedProductIds.map(() => '?').join(',')})`
      params.push(...sessionState.viewedProductIds)
    }

    // Order by conversion rate and featured status
    sql += ' ORDER BY cps.show_to_cart_rate DESC, p.is_featured DESC, p.created_at DESC'
    sql += ` LIMIT ${Number(limit) + 5}` // Fetch more for scoring

    const products = await query<DBProduct[]>(sql, params)

    // Transform to Product format
    const transformedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      price: p.price,
      compareAtPrice: p.compare_at_price,
      stock: p.stock,
      images: p.images ? p.images.split(',') : [],
      categoryName: p.category_name,
      showToCartRate: (p as any).show_to_cart_rate || 0,
      cartToPurchaseRate: (p as any).cart_to_purchase_rate || 0
    }))

    // Score and sort products
    let finalProducts = transformedProducts

    if (sessionState) {
      const scored = scoreProductsForSession(
        transformedProducts.map(p => ({
          id: p.id,
          price: p.price,
          stock: p.stock,
          name: p.name,
          description: p.description,
          showToCartRate: p.showToCartRate,
          cartToPurchaseRate: p.cartToPurchaseRate
        })),
        sessionState
      )

      // Reorder products by score
      const scoreMap = new Map(scored.map(s => [s.productId, s.score]))
      finalProducts = [...transformedProducts].sort((a, b) => 
        (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0)
      )
    }

    // Apply vibe filter if set
    if (sessionState?.vibe) {
      finalProducts = filterByVibe(finalProducts, sessionState.vibe)
    }

    return NextResponse.json(finalProducts.slice(0, limit))
  } catch (error) {
    console.error('Error getting smart products:', error)
    return NextResponse.json(
      { error: 'Failed to get products' },
      { status: 500 }
    )
  }
}

// Vibe filter function
function filterByVibe<T extends { name: string; description: string }>(
  products: T[],
  vibe: 'clean' | 'street' | 'bold'
): T[] {
  return products.filter(p => {
    const combined = `${p.name} ${p.description || ''}`.toLowerCase()

    if (vibe === 'clean') {
      const cleanKeywords = ['minimal', 'clean', 'basica', 'lisa', 'negra', 'blanca', 'clasica', 'simple']
      const boldKeywords = ['animal', 'print', 'estampado', 'colores', 'grafiti', 'camuflaje']
      const hasClean = cleanKeywords.some(k => combined.includes(k))
      const hasBold = boldKeywords.some(k => combined.includes(k))
      return hasClean || !hasBold
    }

    if (vibe === 'bold') {
      const boldKeywords = ['animal', 'print', 'estampado', 'colores', 'grafiti', 'leopardo', 'tiger', 'statement', 'llamativa', 'camuflaje']
      return boldKeywords.some(k => combined.includes(k)) || !combined.includes('basica')
    }

    return true
  })
}
