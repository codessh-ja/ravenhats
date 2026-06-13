import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const featured = searchParams.get('featured') === 'true'
    const categoryId = searchParams.get('categoryId')
    const collectionId = searchParams.get('collectionId')
    const showInDescuentos = searchParams.get('showInDescuentos') === 'true'
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const products = await getProducts({
      featured: featured || undefined,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      collectionId: collectionId ? parseInt(collectionId) : undefined,
      showInDescuentos: showInDescuentos || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    })

    // Transformar los productos para el frontend
    const transformedProducts = products.map((product: any) => ({
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
      tags: [],
    }))

    return NextResponse.json(transformedProducts)
  } catch (error: any) {
    console.error('Error fetching products:', error?.message || error)
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    )
  }
}
