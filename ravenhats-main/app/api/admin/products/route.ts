import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query, transaction } from '@/lib/db'

async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  return session?.value === 'authenticated'
}

// Helper: generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// GET - Listar productos
export async function GET(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const status = searchParams.get('status') || ''

    let sql = `
      SELECT p.*, 
             c.name as category_name,
             (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1) as image,
             (SELECT GROUP_CONCAT(url ORDER BY position) FROM product_images WHERE product_id = p.id) as images,
             COALESCE(p.show_in_descuentos, FALSE) as show_in_descuentos
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `
    const params: (string | number)[] = []

    if (search) {
      sql += ' AND (p.name LIKE ? OR p.sku LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    if (category && category !== 'all') {
      sql += ' AND c.slug = ?'
      params.push(category)
    }

    if (status === 'active') {
      sql += ' AND p.is_active = TRUE'
    } else if (status === 'inactive') {
      sql += ' AND p.is_active = FALSE'
    }

    sql += ' ORDER BY p.created_at DESC'

    const products = await query<any[]>(sql, params)
    const categories = await query<any[]>('SELECT id, name, slug FROM categories WHERE is_active = TRUE')

    return NextResponse.json({ success: true, products, categories })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 })
  }
}

// POST - Crear producto
export async function POST(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    
    const slug = generateSlug(data.name)

    const existing = await query<any[]>('SELECT id FROM products WHERE slug = ?', [slug])
    const finalSlug = existing.length > 0 ? `${slug}-${Date.now()}` : slug

    const result = await transaction(async (connection) => {
      const [productResult] = await connection.execute(
        `INSERT INTO products (
          name, slug, description, price, compare_at_price, sku, stock,
          category_id, is_featured, is_active, show_in_descuentos
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name,
          finalSlug,
          data.description || null,
          data.price,
          data.compareAtPrice || null,
          data.sku || null,
          data.stock || 0,
          data.categoryId || null,
          data.isFeatured || false,
          data.isActive !== false,
          data.showInDescuentos || false
        ]
      ) as any

      const productId = productResult.insertId

      if (data.images && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          await connection.execute(
            'INSERT INTO product_images (product_id, url, position) VALUES (?, ?, ?)',
            [productId, data.images[i], i]
          )
        }
      }

      return { id: productId, slug: finalSlug }
    })

    return NextResponse.json({ success: true, message: 'Producto creado correctamente', product: result })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 })
  }
}

// PUT - Actualizar producto
export async function PUT(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    
    if (!data.id) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 })
    }

    await transaction(async (connection) => {
      // Regenerate slug from the new name
      const newSlug = generateSlug(data.name)
      const [existingSlugs] = await connection.execute(
        'SELECT id FROM products WHERE slug = ? AND id != ?',
        [newSlug, data.id]
      ) as any
      const finalSlug = existingSlugs.length > 0 ? `${newSlug}-${data.id}` : newSlug

      await connection.execute(
        `UPDATE products SET
          name = ?,
          slug = ?,
          description = ?,
          price = ?,
          compare_at_price = ?,
          sku = ?,
          stock = ?,
          low_stock_threshold = ?,
          category_id = ?,
          is_featured = ?,
          is_active = ?,
          show_in_descuentos = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          data.name,
          finalSlug,
          data.description || null,
          data.price,
          data.compareAtPrice || null,
          data.sku || null,
          data.stock || 0,
          data.lowStockThreshold || 5,
          data.categoryId || null,
          data.isFeatured || false,
          data.isActive !== false,
          data.showInDescuentos || false,
          data.id
        ]
      )

      if (data.images) {
        await connection.execute('DELETE FROM product_images WHERE product_id = ?', [data.id])
        
        for (let i = 0; i < data.images.length; i++) {
          await connection.execute(
            'INSERT INTO product_images (product_id, url, position) VALUES (?, ?, ?)',
            [data.id, data.images[i], i]
          )
        }
      }
    })

    return NextResponse.json({ success: true, message: 'Producto actualizado correctamente' })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 })
  }
}

// DELETE - Eliminar producto permanentemente (siempre hard delete)
export async function DELETE(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 })
    }

    await transaction(async (connection) => {
      // Desvincular order_items del producto (SET NULL) para no perder historial de pedidos
      await connection.execute('UPDATE order_items SET product_id = NULL WHERE product_id = ?', [id])
      // Desvincular accounting_transaction_items
      await connection.execute('UPDATE accounting_transaction_items SET product_id = NULL WHERE product_id = ?', [id])
      // Eliminar imagenes del producto
      await connection.execute('DELETE FROM product_images WHERE product_id = ?', [id])
      // Eliminar tags del producto
      await connection.execute('DELETE FROM product_tags WHERE product_id = ?', [id])
      // Eliminar el producto
      await connection.execute('DELETE FROM products WHERE id = ?', [id])
    })

    return NextResponse.json({ success: true, message: 'Producto eliminado permanentemente' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 })
  }
}

// PATCH - Duplicate or Bulk actions
export async function PATCH(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    
    // Bulk actions
    if (data.ids && Array.isArray(data.ids) && data.ids.length > 0) {
      const ids = data.ids.map(Number).filter((n: number) => !isNaN(n))
      if (ids.length === 0) {
        return NextResponse.json({ error: 'IDs invalidos' }, { status: 400 })
      }
      const placeholders = ids.map(() => '?').join(',')
      
      switch (data.action) {
        case 'activate':
          await query(`UPDATE products SET is_active = TRUE, updated_at = NOW() WHERE id IN (${placeholders})`, ids)
          return NextResponse.json({ success: true, message: `${ids.length} productos activados` })
        case 'deactivate':
          await query(`UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id IN (${placeholders})`, ids)
          return NextResponse.json({ success: true, message: `${ids.length} productos desactivados` })
        case 'feature':
          await query(`UPDATE products SET is_featured = TRUE, updated_at = NOW() WHERE id IN (${placeholders})`, ids)
          return NextResponse.json({ success: true, message: `${ids.length} productos marcados como destacados` })
        case 'unfeature':
          await query(`UPDATE products SET is_featured = FALSE, updated_at = NOW() WHERE id IN (${placeholders})`, ids)
          return NextResponse.json({ success: true, message: `${ids.length} productos desmarcados` })
        case 'add_to_descuentos':
          await query(`UPDATE products SET show_in_descuentos = TRUE, updated_at = NOW() WHERE id IN (${placeholders})`, ids)
          return NextResponse.json({ success: true, message: `${ids.length} productos agregados a Descuentos` })
        case 'remove_from_descuentos':
          await query(`UPDATE products SET show_in_descuentos = FALSE, updated_at = NOW() WHERE id IN (${placeholders})`, ids)
          return NextResponse.json({ success: true, message: `${ids.length} productos removidos de Descuentos` })
        default:
          return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
      }
    }

    if (data.action !== 'duplicate' || !data.id) {
      return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
    }

    // Obtener producto original
    const products = await query<any[]>('SELECT * FROM products WHERE id = ?', [data.id])
    if (products.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const original = products[0]
    const copyName = `${original.name} (Copia)`
    
    // Generate slug from the copy name (not from old slug)
    const baseSlug = generateSlug(copyName)
    const existing = await query<any[]>('SELECT id FROM products WHERE slug LIKE ?', [`${baseSlug}%`])
    const finalSlug = existing.length > 0 ? `${baseSlug}-${Date.now()}` : baseSlug

    // Obtener imagenes originales
    const images = await query<any[]>(
      'SELECT url, position FROM product_images WHERE product_id = ? ORDER BY position',
      [data.id]
    )

    const result = await transaction(async (connection) => {
      // Crear copia del producto
      const [productResult] = await connection.execute(
        `INSERT INTO products (
          name, slug, description, price, compare_at_price, sku, stock,
          category_id, collection_id, is_featured, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          copyName,
          finalSlug,
          original.description,
          original.price,
          original.compare_at_price,
          original.sku ? `${original.sku}-COPY` : null,
          original.stock,
          original.category_id,
          original.collection_id,
          original.is_featured,
          true
        ]
      ) as any

      const newId = productResult.insertId

      // Copiar imagenes
      for (const img of images) {
        await connection.execute(
          'INSERT INTO product_images (product_id, url, position) VALUES (?, ?, ?)',
          [newId, img.url, img.position]
        )
      }

      return { id: newId, slug: finalSlug }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Producto duplicado correctamente', 
      product: result 
    })
  } catch (error) {
    console.error('Error duplicating product:', error)
    return NextResponse.json({ error: 'Error al duplicar producto' }, { status: 500 })
  }
}
