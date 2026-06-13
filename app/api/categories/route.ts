import { NextResponse } from 'next/server'
import { getCategories } from '@/lib/db'

export async function GET() {
  try {
    const categories = await getCategories()
    
    // Transform to frontend format
    const transformedCategories = categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      imageUrl: cat.image_url,
    }))

    return NextResponse.json(transformedCategories)
  } catch (error: any) {
    console.error('Error fetching categories:', error?.message || error)
    return NextResponse.json(
      { error: 'Error al obtener categorias' },
      { status: 500 }
    )
  }
}
