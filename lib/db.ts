import mysql from 'mysql2/promise'

// Configuracion de conexion a MySQL
const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'ravenhats_user',
  password: process.env.MYSQL_PASSWORD || 'RavenHats2025Seguro',
  database: process.env.MYSQL_DATABASE || 'ravenhats_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
}

// Pool de conexiones (singleton)
let pool: mysql.Pool | null = null

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig)
  }
  return pool
}

// Helper para ejecutar queries
export async function query<T>(
  sql: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<T> {
  const pool = getPool()
  // Use query() instead of execute() when there are no params
  // execute() uses prepared statements which can cause issues with
  // GROUP_CONCAT subqueries and certain MySQL configurations
  if (!params || params.length === 0) {
    const [results] = await pool.query(sql)
    return results as T
  }
  const [results] = await pool.execute(sql, params)
  return results as T
}

// Helper para transacciones
export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getPool().getConnection()
  
  try {
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// =====================================================
// TIPOS
// =====================================================

export interface DBProduct {
  id: number
  name: string
  slug: string
  description: string | null
  price: number
  compare_at_price: number | null
  sku: string | null
  barcode: string | null
  stock: number
  low_stock_threshold: number
  category_id: number | null
  collection_id: number | null
  is_featured: boolean
  is_active: boolean
  show_in_descuentos: boolean
  weight_grams: number | null
  meta_title: string | null
  meta_description: string | null
  created_at: Date
  updated_at: Date
  images?: string
  category_name?: string
  collection_name?: string
}

export interface DBCategory {
  id: number
  name: string
  slug: string
  description: string | null
  image_url: string | null
  is_active: boolean
}

export interface DBCollection {
  id: number
  name: string
  slug: string
  description: string | null
  image_url: string | null
  banner_url: string | null
  video_url: string | null
  is_drop: boolean
  drop_date: Date | null
  drop_end_date: Date | null
  sort_order: number
  is_active: boolean
  product_count?: number
}

export interface DBOrder {
  id: number
  order_number: string
  customer_email: string
  customer_first_name: string
  customer_last_name: string
  customer_phone: string | null
  shipping_address_line1: string
  shipping_city: string
  shipping_department: string
  subtotal: number
  shipping_cost: number
  total: number
  status: string
  payment_status: string
  payment_method: string | null
  created_at: Date
  updated_at: Date
}

// =====================================================
// FUNCIONES PARA PRODUCTOS (ADMIN)
// =====================================================

export async function getAllProductsAdmin() {
  const sql = `
    SELECT p.*, 
           c.name as category_name,
           col.name as collection_name,
           (SELECT GROUP_CONCAT(url ORDER BY position) FROM product_images WHERE product_id = p.id) as images
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN collections col ON p.collection_id = col.id
    ORDER BY p.created_at DESC
  `
  return query<DBProduct[]>(sql)
}

export async function getProductById(id: number) {
  const sql = `
    SELECT p.*, 
           (SELECT GROUP_CONCAT(url ORDER BY position) FROM product_images WHERE product_id = p.id) as images
    FROM products p
    WHERE p.id = ?
  `
  const results = await query<DBProduct[]>(sql, [id])
  return results[0] || null
}

export async function createProduct(data: {
  name: string
  slug: string
  description?: string
  price: number
  compareAtPrice?: number
  sku?: string
  stock: number
  categoryId?: number
  collectionId?: number
  isFeatured?: boolean
  isActive?: boolean
  images?: string[]
}) {
  return transaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO products (
        name, slug, description, price, compare_at_price, sku, stock,
        category_id, collection_id, is_featured, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.slug,
        data.description || null,
        data.price,
        data.compareAtPrice || null,
        data.sku || null,
        data.stock,
        data.categoryId || null,
        data.collectionId || null,
        data.isFeatured || false,
        data.isActive !== false
      ]
    ) as any

    const productId = result.insertId

    // Insertar imagenes
    if (data.images && data.images.length > 0) {
      for (let i = 0; i < data.images.length; i++) {
        await connection.execute(
          'INSERT INTO product_images (product_id, url, position) VALUES (?, ?, ?)',
          [productId, data.images[i], i]
        )
      }
    }

    return { id: productId }
  })
}

export async function updateProduct(id: number, data: {
  name?: string
  slug?: string
  description?: string
  price?: number
  compareAtPrice?: number | null
  sku?: string
  stock?: number
  categoryId?: number | null
  collectionId?: number | null
  isFeatured?: boolean
  isActive?: boolean
  images?: string[]
}) {
  return transaction(async (connection) => {
    const updates: string[] = []
    const params: (string | number | boolean | null)[] = []

    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name) }
    if (data.slug !== undefined) { updates.push('slug = ?'); params.push(data.slug) }
    if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description || null) }
    if (data.price !== undefined) { updates.push('price = ?'); params.push(data.price) }
    if (data.compareAtPrice !== undefined) { updates.push('compare_at_price = ?'); params.push(data.compareAtPrice) }
    if (data.sku !== undefined) { updates.push('sku = ?'); params.push(data.sku || null) }
    if (data.stock !== undefined) { updates.push('stock = ?'); params.push(data.stock) }
    if (data.categoryId !== undefined) { updates.push('category_id = ?'); params.push(data.categoryId) }
    if (data.collectionId !== undefined) { updates.push('collection_id = ?'); params.push(data.collectionId) }
    if (data.isFeatured !== undefined) { updates.push('is_featured = ?'); params.push(data.isFeatured) }
    if (data.isActive !== undefined) { updates.push('is_active = ?'); params.push(data.isActive) }

    if (updates.length > 0) {
      params.push(id)
      await connection.execute(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
        params
      )
    }

    // Actualizar imagenes si se proporcionan
    if (data.images !== undefined) {
      await connection.execute('DELETE FROM product_images WHERE product_id = ?', [id])
      for (let i = 0; i < data.images.length; i++) {
        await connection.execute(
          'INSERT INTO product_images (product_id, url, position) VALUES (?, ?, ?)',
          [id, data.images[i], i]
        )
      }
    }

    return { success: true }
  })
}

export async function deleteProduct(id: number) {
  await query('DELETE FROM products WHERE id = ?', [id])
  return { success: true }
}

// =====================================================
// FUNCIONES PARA CATEGORIAS Y COLECCIONES
// =====================================================

export async function getCategories() {
  return query<DBCategory[]>('SELECT * FROM categories WHERE is_active = TRUE ORDER BY name')
}

export async function getCollections() {
  return query<DBCollection[]>('SELECT * FROM collections WHERE is_active = TRUE ORDER BY sort_order, name')
}

// Obtener solo los drops (colecciones marcadas como drop)
export async function getDrops() {
  const sql = `
    SELECT c.*, 
           (SELECT COUNT(*) FROM products p WHERE p.collection_id = c.id AND p.is_active = TRUE) as product_count
    FROM collections c
    WHERE c.is_drop = TRUE AND c.is_active = TRUE
    ORDER BY c.sort_order, c.drop_date DESC
  `
  return query<DBCollection[]>(sql)
}

// Obtener un drop especifico por slug
export async function getDropBySlug(slug: string) {
  const sql = `
    SELECT c.*, 
           (SELECT COUNT(*) FROM products p WHERE p.collection_id = c.id AND p.is_active = TRUE) as product_count
    FROM collections c
    WHERE c.slug = ? AND c.is_drop = TRUE AND c.is_active = TRUE
  `
  const results = await query<DBCollection[]>(sql, [slug])
  return results[0] || null
}

// Obtener productos de un drop
export async function getDropProducts(collectionId: number) {
  const sql = `
    SELECT p.*, 
           c.name as category_name, c.slug as category_slug,
           col.name as collection_name, col.slug as collection_slug,
           (SELECT GROUP_CONCAT(url ORDER BY position) FROM product_images WHERE product_id = p.id) as images
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN collections col ON p.collection_id = col.id
    WHERE p.collection_id = ? AND p.is_active = TRUE
    ORDER BY p.is_featured DESC, p.created_at DESC
  `
  return query<DBProduct[]>(sql, [collectionId])
}

// Suscribirse a notificaciones de drops
export async function subscribeToDrops(email: string, collectionId?: number) {
  const sql = `
    INSERT INTO drops_newsletter (email, collection_id) 
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE is_active = TRUE, unsubscribed_at = NULL
  `
  await query(sql, [email.toLowerCase(), collectionId || null])
  return { success: true }
}

// =====================================================
// FUNCIONES PARA ORDENES (ADMIN)
// =====================================================

export async function getAllOrdersAdmin(filters?: {
  status?: string
  paymentStatus?: string
  search?: string
  limit?: number
  offset?: number
}) {
  let sql = `
    SELECT o.*,
           (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    WHERE 1=1
  `
  const params: (string | number)[] = []

  if (filters?.status) {
    sql += ' AND o.status = ?'
    params.push(filters.status)
  }
  if (filters?.paymentStatus) {
    sql += ' AND o.payment_status = ?'
    params.push(filters.paymentStatus)
  }
  if (filters?.search) {
    sql += ' AND (o.order_number LIKE ? OR o.customer_email LIKE ? OR o.customer_first_name LIKE ? OR o.customer_last_name LIKE ?)'
    const searchTerm = `%${filters.search}%`
    params.push(searchTerm, searchTerm, searchTerm, searchTerm)
  }

  sql += ' ORDER BY o.created_at DESC'

  if (filters?.limit) {
    sql += ' LIMIT ?'
    params.push(filters.limit)
    if (filters?.offset) {
      sql += ' OFFSET ?'
      params.push(filters.offset)
    }
  }

  return query<DBOrder[]>(sql, params)
}

export async function getOrderById(id: number) {
  const sql = 'SELECT * FROM orders WHERE id = ?'
  const results = await query<DBOrder[]>(sql, [id])
  return results[0] || null
}

export async function getOrderItems(orderId: number) {
  return query<any[]>('SELECT * FROM order_items WHERE order_id = ?', [orderId])
}

export async function updateOrderStatus(id: number, status: string, adminNotes?: string) {
  const updates = ['status = ?', 'updated_at = NOW()']
  const params: (string | number)[] = [status]

  if (status === 'shipped') {
    updates.push('shipped_at = NOW()')
  }
  if (status === 'delivered') {
    updates.push('delivered_at = NOW()')
  }
  if (adminNotes) {
    updates.push('admin_notes = ?')
    params.push(adminNotes)
  }

  params.push(id)
  await query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params)
  return { success: true }
}

export async function updateOrderTracking(id: number, trackingNumber: string, trackingUrl?: string) {
  await query(
    'UPDATE orders SET tracking_number = ?, tracking_url = ?, updated_at = NOW() WHERE id = ?',
    [trackingNumber, trackingUrl || null, id]
  )
  return { success: true }
}

// =====================================================
// FUNCIONES PARA CLIENTES (ADMIN)
// =====================================================

export async function getCustomersFromOrders() {
  const sql = `
    SELECT 
      customer_email as email,
      customer_first_name as first_name,
      customer_last_name as last_name,
      customer_phone as phone,
      COUNT(*) as order_count,
      SUM(total) as total_spent,
      MAX(created_at) as last_order_at,
      MIN(created_at) as first_order_at
    FROM orders
    GROUP BY customer_email, customer_first_name, customer_last_name, customer_phone
    ORDER BY total_spent DESC
  `
  return query<any[]>(sql)
}

// =====================================================
// FUNCIONES PARA ESTADISTICAS (ADMIN)
// =====================================================

export async function getDashboardStats() {
  const [
    totalRevenue,
    totalOrders,
    pendingOrders,
    totalProducts,
    totalCustomers,
    recentOrders,
    topProducts,
    salesByMonth
  ] = await Promise.all([
    // Total revenue - SOLO ordenes con pago aprobado
    query<any[]>(`SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE payment_status = 'approved'`),
    // Total orders - SOLO ordenes con pago aprobado (ventas reales)
    query<any[]>(`SELECT COUNT(*) as total FROM orders WHERE payment_status = 'approved'`),
    // Ordenes pendientes de pago
    query<any[]>(`SELECT COUNT(*) as total FROM orders WHERE payment_status = 'pending'`),
    // Total products
    query<any[]>('SELECT COUNT(*) as total FROM products WHERE is_active = TRUE'),
    // Total unique customers - SOLO de ordenes pagadas
    query<any[]>(`SELECT COUNT(DISTINCT customer_email) as total FROM orders WHERE payment_status = 'approved'`),
    // Recent orders - mostrar todas pero indicar estado
    query<any[]>(`
      SELECT id, order_number, customer_first_name, customer_last_name, total, status, payment_status, created_at
      FROM orders ORDER BY created_at DESC LIMIT 5
    `),
    // Top selling products - SOLO de ordenes pagadas
    query<any[]>(`
      SELECT p.name, p.price, SUM(oi.quantity) as sold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.payment_status = 'approved'
      GROUP BY p.id, p.name, p.price
      ORDER BY sold DESC
      LIMIT 5
    `),
    // Sales by month (last 6 months) - SOLO ordenes pagadas
    query<any[]>(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        DATE_FORMAT(created_at, '%b') as month_name,
        SUM(total) as revenue,
        COUNT(*) as orders
      FROM orders
      WHERE payment_status = 'approved' AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
      ORDER BY month ASC
    `)
  ])

  return {
    totalRevenue: totalRevenue[0]?.total || 0,
    totalOrders: totalOrders[0]?.total || 0,
    pendingOrders: pendingOrders[0]?.total || 0,
    totalProducts: totalProducts[0]?.total || 0,
    totalCustomers: totalCustomers[0]?.total || 0,
    recentOrders,
    topProducts,
    salesByMonth
  }
}

// =====================================================
// FUNCIONES PARA TIENDA (FRONTEND)
// =====================================================

export async function getProducts(options?: {
  featured?: boolean
  categoryId?: number
  collectionId?: number
  showInDescuentos?: boolean
  limit?: number
  offset?: number
}) {
  let sql = `
    SELECT p.*, 
           c.name as category_name, c.slug as category_slug,
           col.name as collection_name, col.slug as collection_slug,
           (SELECT GROUP_CONCAT(url ORDER BY position) FROM product_images WHERE product_id = p.id) as images
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN collections col ON p.collection_id = col.id
    WHERE p.is_active = TRUE
  `
  const params: (string | number | boolean)[] = []

  if (options?.featured) {
    sql += ' AND p.is_featured = TRUE'
  }
  if (options?.categoryId) {
    sql += ' AND p.category_id = ?'
    params.push(options.categoryId)
  }
  if (options?.collectionId) {
    sql += ' AND p.collection_id = ?'
    params.push(options.collectionId)
  }
  if (options?.showInDescuentos) {
    sql += ' AND p.show_in_descuentos = TRUE'
  }

  sql += ' ORDER BY p.created_at DESC'

  if (options?.limit && options.limit > 0) {
    sql += ` LIMIT ${Number(options.limit)}`
    if (options?.offset && options.offset > 0) {
      sql += ` OFFSET ${Number(options.offset)}`
    }
  }

  return query<DBProduct[]>(sql, params)
}

export async function getProductBySlug(slug: string) {
  const sql = `
    SELECT p.*, 
           c.name as category_name, c.slug as category_slug,
           col.name as collection_name, col.slug as collection_slug,
           (SELECT GROUP_CONCAT(url ORDER BY position) FROM product_images WHERE product_id = p.id) as images
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN collections col ON p.collection_id = col.id
    WHERE p.slug = ? AND p.is_active = TRUE
  `
  const results = await query<DBProduct[]>(sql, [slug])
  return results[0] || null
}

// =====================================================
// FUNCIONES PARA ORDENES (FRONTEND)
// =====================================================

export async function createOrder(orderData: {
  customer: {
    email: string
    firstName: string
    lastName: string
    phone?: string
    documentType?: string
    documentNumber?: string
  }
  shipping: {
    addressLine1: string
    addressLine2?: string
    city: string
    department: string
    postalCode?: string
  }
  items: {
    productId: number
    productName: string
    productSku?: string
    productImage?: string
    unitPrice: number
    quantity: number
  }[]
  subtotal: number
  shippingCost: number
  total: number
  paymentMethod?: string
  notes?: string
  customerId?: number // ID del cliente si esta logueado
}) {
  return transaction(async (connection) => {
    const [orderCountResult] = await connection.execute('SELECT COUNT(*) + 1 as count FROM orders') as any
    const orderNumber = `RH-${String(orderCountResult[0].count).padStart(6, '0')}`

    const isCOD = orderData.paymentMethod === 'COD'
    const paymentStatus = 'pending'
    const orderStatus = isCOD ? 'confirmed' : 'pending'

    // Buscar si el cliente existe en la tabla customers por email
    let customerId = orderData.customerId || null
    if (!customerId) {
      const [existingCustomer] = await connection.execute(
        'SELECT id FROM customers WHERE email = ?',
        [orderData.customer.email.toLowerCase()]
      ) as any
      if (existingCustomer.length > 0) {
        customerId = existingCustomer[0].id
      }
    }

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (
        order_number, customer_id, customer_email, customer_first_name, customer_last_name, 
        customer_phone, customer_document_type, customer_document_number,
        shipping_address_line1, shipping_address_line2, shipping_city, 
        shipping_department, shipping_postal_code,
        subtotal, shipping_cost, total, payment_method, status, payment_status, customer_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        customerId,
        orderData.customer.email.toLowerCase(),
        orderData.customer.firstName,
        orderData.customer.lastName,
        orderData.customer.phone || null,
        orderData.customer.documentType || null,
        orderData.customer.documentNumber || null,
        orderData.shipping.addressLine1,
        orderData.shipping.addressLine2 || null,
        orderData.shipping.city,
        orderData.shipping.department,
        orderData.shipping.postalCode || null,
        orderData.subtotal,
        orderData.shippingCost,
        orderData.total,
        orderData.paymentMethod || null,
        orderStatus,
        paymentStatus,
        orderData.notes || null
      ]
    ) as any

    const orderId = orderResult.insertId

    for (const item of orderData.items) {
      await connection.execute(
        `INSERT INTO order_items (
          order_id, product_id, product_name, product_sku, product_image,
          unit_price, quantity, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.productId,
          item.productName,
          item.productSku || null,
          item.productImage || null,
          item.unitPrice,
          item.quantity,
          item.unitPrice * item.quantity
        ]
      )

      // NO descontar stock aqui - se descuenta cuando el pago se aprueba
      // El stock se reserva pero no se descuenta hasta confirmar el pago
    }

    return { orderId, orderNumber }
  })
}

// Descontar stock cuando el pago se aprueba
export async function deductStockForOrder(orderId: number) {
  return transaction(async (connection) => {
    // Obtener items de la orden
    const [items] = await connection.execute(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
      [orderId]
    ) as any

    for (const item of items) {
      await connection.execute(
        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
        [item.quantity, item.product_id, item.quantity]
      )
    }

    return { success: true }
  })
}

// Restaurar stock cuando el pago falla o se cancela
export async function restoreStockForOrder(orderId: number) {
  return transaction(async (connection) => {
    // Verificar si ya se habia descontado el stock
    const [order] = await connection.execute(
      'SELECT stock_deducted FROM orders WHERE id = ?',
      [orderId]
    ) as any

    if (!order[0]?.stock_deducted) {
      return { success: true, message: 'Stock no habia sido descontado' }
    }

    // Obtener items de la orden
    const [items] = await connection.execute(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
      [orderId]
    ) as any

    for (const item of items) {
      await connection.execute(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.quantity, item.product_id]
      )
    }

    // Marcar que el stock fue restaurado
    await connection.execute(
      'UPDATE orders SET stock_deducted = FALSE WHERE id = ?',
      [orderId]
    )

    return { success: true }
  })
}

/**
 * Actualizar pago de una orden - FUNCION CRITICA
 * 
 * Esta funcion es llamada por:
 * 1. Webhook de Wompi (fuente de verdad)
 * 2. verify-payment endpoint (sincronizacion)
 * 
 * Maneja:
 * - Registro de pago en tabla payments
 * - Actualizacion de payment_status en orders
 * - Descuento de stock (solo si APPROVED)
 * - Registro en contabilidad (solo si APPROVED)
 * 
 * NO maneja emails - eso es responsabilidad del webhook
 */
export async function updateOrderPayment(
  orderId: number,
  paymentData: {
    wompiTransactionId: string
    wompiReference: string
    status: string
    paidAmount?: number | null  // Monto REAL pagado desde Wompi (en pesos)
    paymentMethod?: string
    paymentMethodType?: string
    cardLastFour?: string
    cardBrand?: string
    pseBank?: string
    rawResponse?: object
  }
) {
  const timestamp = new Date().toISOString()
  console.log(`[DB updateOrderPayment] ${timestamp} - Inicio:`, {
    orderId,
    transactionId: paymentData.wompiTransactionId,
    status: paymentData.status
  })
  
  return transaction(async (connection) => {
    // Verificar si ya existe un pago para esta orden
    const [existingPayment] = await connection.execute(
      'SELECT id, wompi_status FROM payments WHERE order_id = ? AND wompi_transaction_id = ?',
      [orderId, paymentData.wompiTransactionId]
    ) as any

    if (existingPayment.length === 0) {
      console.log(`[DB updateOrderPayment] ${timestamp} - Insertando nuevo registro de pago`)
      
      // CRITICO: Usar el monto REAL de Wompi, no el total de la orden
      // Si Wompi no envia monto (raro), fallback al total de la orden
      const [orderForAmount] = await connection.execute(
        'SELECT total FROM orders WHERE id = ?',
        [orderId]
      ) as any
      const actualAmount = paymentData.paidAmount ?? (orderForAmount[0]?.total || 0)
      
      console.log(`[DB updateOrderPayment] ${timestamp} - Monto a registrar:`, {
        wompiPaidAmount: paymentData.paidAmount,
        orderTotal: orderForAmount[0]?.total,
        actualAmount
      })
      
      await connection.execute(
        `INSERT INTO payments (
          order_id, wompi_transaction_id, wompi_reference, wompi_status,
          amount, payment_method, payment_method_type, card_last_four,
          card_brand, pse_bank, raw_response
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          paymentData.wompiTransactionId,
          paymentData.wompiReference,
          paymentData.status,
          actualAmount, // Monto REAL de Wompi
          paymentData.paymentMethod || null,
          paymentData.paymentMethodType || null,
          paymentData.cardLastFour || null,
          paymentData.cardBrand || null,
          paymentData.pseBank || null,
          paymentData.rawResponse ? JSON.stringify(paymentData.rawResponse) : null
        ]
      )
    } else {
      // IDEMPOTENCIA: Si el estado es el mismo, no actualizar
      if (existingPayment[0].wompi_status === paymentData.status) {
        console.log(`[DB updateOrderPayment] ${timestamp} - Estado sin cambios, omitiendo actualizacion`)
      } else {
        console.log(`[DB updateOrderPayment] ${timestamp} - Actualizando pago existente: ${existingPayment[0].wompi_status} -> ${paymentData.status}`)
        await connection.execute(
          `UPDATE payments SET 
            wompi_status = ?,
            payment_method = ?,
            payment_method_type = ?,
            card_last_four = ?,
            card_brand = ?,
            pse_bank = ?,
            raw_response = ?,
            updated_at = NOW()
          WHERE order_id = ? AND wompi_transaction_id = ?`,
          [
            paymentData.status,
            paymentData.paymentMethod || null,
            paymentData.paymentMethodType || null,
            paymentData.cardLastFour || null,
            paymentData.cardBrand || null,
            paymentData.pseBank || null,
            paymentData.rawResponse ? JSON.stringify(paymentData.rawResponse) : null,
            orderId,
            paymentData.wompiTransactionId
          ]
        )
      }
    }

    // Mapear estados de Wompi a nuestro sistema
    const wompiStatus = paymentData.status?.toUpperCase() || ''
    const paymentStatus = 
      wompiStatus === 'APPROVED' ? 'approved' : 
      wompiStatus === 'DECLINED' || wompiStatus === 'ERROR' || wompiStatus === 'VOIDED' ? 'rejected' : 
      'pending'
    
    const orderStatus = 
      paymentStatus === 'approved' ? 'confirmed' : 
      paymentStatus === 'rejected' ? 'cancelled' : 
      'pending'

    await connection.execute(
      `UPDATE orders SET 
        payment_status = ?, 
        status = ?,
        payment_method = ?,
        payment_reference = ?
      WHERE id = ?`,
      [paymentStatus, orderStatus, paymentData.paymentMethod, paymentData.wompiReference, orderId]
    )

    // Si el pago fue aprobado, descontar stock y registrar en contabilidad
    if (wompiStatus === 'APPROVED') {
      console.log(`[DB updateOrderPayment] ${timestamp} - Pago APPROVED, verificando stock y contabilidad`)
      
      // Verificar si ya se desconto el stock
      const [orderCheck] = await connection.execute(
        'SELECT stock_deducted, order_number, customer_first_name, customer_last_name, customer_phone, customer_email, subtotal, shipping_cost, total, payment_method FROM orders WHERE id = ?',
        [orderId]
      ) as any

      const orderData = orderCheck[0]

      if (!orderData?.stock_deducted) {
        console.log(`[DB updateOrderPayment] ${timestamp} - Descontando stock para orden ${orderData?.order_number}`)
        // Obtener items y descontar stock
        const [items] = await connection.execute(
          'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
          [orderId]
        ) as any

        for (const item of items) {
          await connection.execute(
            'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
            [item.quantity, item.product_id, item.quantity]
          )
        }

        // Marcar que el stock fue descontado
        await connection.execute(
          'UPDATE orders SET stock_deducted = TRUE WHERE id = ?',
          [orderId]
        )

        // Registrar automaticamente en contabilidad
        const [existingTx] = await connection.execute(
          'SELECT id FROM accounting_transactions WHERE order_id = ?',
          [orderId]
        ) as any

        if (existingTx.length === 0) {
          const pmMethod = (orderData.payment_method || 'wompi').toLowerCase()
          const accountingPm = ['wompi', 'cod', 'transfer', 'cash', 'nequi', 'daviplata'].includes(pmMethod) ? pmMethod : 'other'

          await connection.execute(
            `INSERT INTO accounting_transactions (
              type, payment_method, payment_status, order_id, order_number,
              customer_name, customer_phone, customer_email,
              subtotal, shipping_cost, total,
              description, created_by, transaction_date
            ) VALUES (?, ?, 'approved', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system', NOW())`,
            [
              'online_sale',
              accountingPm,
              orderId,
              orderData.order_number,
              `${orderData.customer_first_name} ${orderData.customer_last_name}`,
              orderData.customer_phone,
              orderData.customer_email,
              Number(orderData.subtotal),
              Number(orderData.shipping_cost),
              Number(orderData.total),
              `Venta online - Pedido ${orderData.order_number}`
            ]
          )
        }
      }
    }

    console.log(`[DB updateOrderPayment] ${timestamp} - Completado:`, {
      orderId,
      paymentStatus,
      orderStatus,
      wompiStatus
    })
    
    return { success: true, paymentStatus, orderStatus }
  })
}

// =====================================================
// FUNCIONES PARA IMAGENES
// =====================================================

export async function addProductImage(productId: number, url: string, position?: number) {
  const pos = position ?? 0
  await query(
    'INSERT INTO product_images (product_id, url, position) VALUES (?, ?, ?)',
    [productId, url, pos]
  )
  return { success: true }
}

export async function deleteProductImage(imageId: number) {
  await query('DELETE FROM product_images WHERE id = ?', [imageId])
  return { success: true }
}
