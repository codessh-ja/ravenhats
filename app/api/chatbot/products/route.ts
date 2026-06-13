/**
 * PASO 18 - Smart Product Recommendations API
 * 
 * Returns products sorted by learning score:
 * - Filters by vibe
 * - Sorts by conversion score
 * - Excludes already-shown products
 * - Returns top 3
 */

import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/lib/db'
import { 
  getSmartRecommendations, 
  getProductHook,
  trackProductEvent 
} from '@/lib/product-learning'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const vibe = searchParams.get('vibe') as 'clean' | 'bold' | 'street' | null
    const excludeIds = searchParams.get('excludeIds')?.split(',').filter(Boolean) || []
    const limit = parseInt(searchParams.get('limit') || '3')
    const sessionId = searchParams.get('sessionId') || undefined
    const featured = searchParams.get('featured') === 'true'

    // Get products from DB
    const rawProducts = await getProducts({
      featured: featured || undefined,
      limit: 50, // Get more to allow filtering
    })

    // Transform products — DBProduct is the inferred type from getProducts()
    const products = rawProducts.map((product) => ({
      id: String(product.id),
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      compareAtPrice: product.compare_at_price ? Number(product.compare_at_price) : undefined,
      description: product.description || '',
      images: product.images ? product.images.split(',') : [],
      category: product.category_name || '',
      collection: product.collection_name || '',
      stock: product.stock,
      featured: Boolean(product.is_featured),
      showInDescuentos: Boolean(product.show_in_descuentos),
      // Convert Date → ISO string so the learning system can calculate newness
      createdAt: product.created_at instanceof Date
        ? product.created_at.toISOString()
        : String(product.created_at ?? ''),
      tags: [] as never[],
    }))

    // Get smart recommendations using learning system
    const recommendations = getSmartRecommendations(products, {
      vibe: vibe || undefined,
      excludeIds,
      limit,
    })

    // Track view events for returned products
    if (sessionId) {
      for (const product of recommendations) {
        trackProductEvent(product.id, 'view', sessionId)
      }
    }

    // Get appropriate hook based on scores
    const hasHighScore = recommendations.some(r => r.hasHighScore)
    const hook = getProductHook(hasHighScore)

    return NextResponse.json({
      products: recommendations,
      hook,
      hasHighScore,
    })
  } catch (error) {
    console.error('Error fetching smart products:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    )
  }
}
