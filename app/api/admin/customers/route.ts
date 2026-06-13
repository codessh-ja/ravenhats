import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'

async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  return session?.value === 'authenticated'
}

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS manual_customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name  VARCHAR(100) DEFAULT '',
      phone      VARCHAR(50),
      email      VARCHAR(255),
      city       VARCHAR(100),
      notes      TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
}

export async function GET(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const email  = searchParams.get('email')
    const search = searchParams.get('search')

    // ── Autocomplete para el modal de contabilidad ──────────────────────────
    if (search) {
      await ensureTable()
      const term = `%${search}%`

      const [manualHits, txHits, orderHits] = await Promise.all([
        query<any[]>(`
          SELECT CONCAT(first_name,' ',last_name) as name, phone, email, 'manual' as source
          FROM manual_customers
          WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?
          LIMIT 6
        `, [term, term, term]),
        query<any[]>(`
          SELECT DISTINCT customer_name as name, customer_phone as phone, customer_email as email, 'transaction' as source
          FROM accounting_transactions
          WHERE customer_name IS NOT NULL AND (customer_name LIKE ? OR customer_phone LIKE ?)
          LIMIT 6
        `, [term, term]),
        query<any[]>(`
          SELECT DISTINCT CONCAT(customer_first_name,' ',customer_last_name) as name,
            customer_phone as phone, customer_email as email, 'order' as source
          FROM orders
          WHERE customer_first_name LIKE ? OR customer_last_name LIKE ? OR customer_phone LIKE ?
          LIMIT 6
        `, [term, term, term]),
      ])

      const seen = new Set<string>()
      const results: any[] = []
      for (const r of [...manualHits, ...txHits, ...orderHits]) {
        const key = `${(r.name || '').trim().toLowerCase()}-${(r.phone || '').replace(/\D/g, '')}`
        if (r.name?.trim() && !seen.has(key)) {
          seen.add(key)
          results.push(r)
          if (results.length >= 8) break
        }
      }
      return NextResponse.json({ success: true, customers: results })
    }

    // ── Pedidos de un cliente específico ────────────────────────────────────
    if (email) {
      const orders = await query<any[]>(`
        SELECT o.id, o.order_number, o.total, o.status, o.payment_status,
               o.payment_method, o.created_at, o.shipping_city, o.shipping_department,
               (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
        FROM orders o
        WHERE o.customer_email = ?
        ORDER BY o.created_at DESC
      `, [email])
      return NextResponse.json({ success: true, orders })
    }

    // ── Lista completa (pedidos + manuales) ─────────────────────────────────
    await ensureTable()

    const [orderCustomers, manualCustomers, statsRows, pendingRows, topRows] = await Promise.all([
      query<any[]>(`
        SELECT
          MIN(o.id) as id,
          o.customer_email as email,
          MAX(o.customer_first_name) as first_name,
          MAX(o.customer_last_name)  as last_name,
          MAX(o.customer_phone)      as phone,
          MAX(o.shipping_city)       as city,
          MAX(o.shipping_department) as department,
          COUNT(*) as total_orders,
          SUM(CASE WHEN o.payment_status='approved' THEN 1 ELSE 0 END) as paid_orders,
          SUM(CASE WHEN o.payment_status='pending'  THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN o.payment_status='rejected' THEN 1 ELSE 0 END) as rejected_orders,
          SUM(CASE WHEN o.status='cancelled'        THEN 1 ELSE 0 END) as cancelled_orders,
          COALESCE(SUM(CASE WHEN o.payment_status='approved' THEN o.total ELSE 0 END),0) as total_spent,
          COALESCE(SUM(CASE WHEN o.payment_status='pending'  THEN o.total ELSE 0 END),0) as pending_amount,
          MAX(o.created_at) as last_order_date,
          MIN(o.created_at) as first_order_date,
          MAX(o.shipping_address_line1) as last_address,
          FALSE as is_manual
        FROM orders o
        GROUP BY o.customer_email
        ORDER BY last_order_date DESC
      `),
      query<any[]>(`
        SELECT id, email, first_name, last_name, phone, city,
               NULL as department,
               0 as total_orders, 0 as paid_orders, 0 as pending_orders,
               0 as rejected_orders, 0 as cancelled_orders,
               0 as total_spent, 0 as pending_amount,
               created_at as last_order_date, created_at as first_order_date,
               NULL as last_address, TRUE as is_manual, notes
        FROM manual_customers
        ORDER BY created_at DESC
      `),
      query<any[]>(`
        SELECT
          COUNT(DISTINCT customer_email) as total_customers,
          SUM(CASE WHEN payment_status='approved' THEN total ELSE 0 END) as total_revenue,
          COUNT(*) as total_orders,
          SUM(CASE WHEN payment_status='pending' THEN 1 ELSE 0 END) as pending_payments,
          SUM(CASE WHEN payment_status='pending' THEN total ELSE 0 END) as pending_revenue,
          AVG(CASE WHEN payment_status='approved' THEN total END) as avg_order_value
        FROM orders
      `),
      query<any[]>(`
        SELECT o.customer_email as email, o.customer_first_name as first_name,
               o.customer_last_name as last_name, o.customer_phone as phone,
               o.order_number, o.total, o.created_at,
               TIMESTAMPDIFF(HOUR, o.created_at, NOW()) as hours_since_order
        FROM orders o
        WHERE o.payment_status='pending' AND o.payment_method='WOMPI' AND o.status!='cancelled'
        ORDER BY o.created_at DESC
      `),
      query<any[]>(`
        SELECT customer_email as email, MAX(customer_first_name) as first_name,
               MAX(customer_last_name) as last_name, COUNT(*) as order_count,
               SUM(CASE WHEN payment_status='approved' THEN total ELSE 0 END) as total_spent
        FROM orders WHERE payment_status='approved'
        GROUP BY customer_email ORDER BY total_spent DESC LIMIT 5
      `),
    ])

    // Excluir clientes manuales que ya tienen pedidos (dedup por email o teléfono)
    const orderEmails  = new Set(orderCustomers.map((c: any) => c.email?.toLowerCase()).filter(Boolean))
    const orderPhones  = new Set(orderCustomers.map((c: any) => c.phone?.replace(/\D/g, '')).filter(Boolean))

    const manualOnly = (manualCustomers as any[]).filter((mc: any) => {
      const emailMatch = mc.email && orderEmails.has(mc.email.toLowerCase())
      const phoneClean = mc.phone?.replace(/\D/g, '')
      const phoneMatch = phoneClean && orderPhones.has(phoneClean)
      return !emailMatch && !phoneMatch
    })

    return NextResponse.json({
      success: true,
      customers: [...orderCustomers, ...manualOnly],
      stats: statsRows[0] || {},
      pendingPaymentCustomers: pendingRows,
      topCustomers: topRows,
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    await ensureTable()
    const data = await request.json()

    if (!data.first_name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const result = await query<any>(`
      INSERT INTO manual_customers (first_name, last_name, phone, email, city, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.first_name.trim(),
      data.last_name?.trim()  || '',
      data.phone?.trim()      || null,
      data.email?.trim()      || null,
      data.city?.trim()       || null,
      data.notes?.trim()      || null,
    ])

    return NextResponse.json({ success: true, id: result.insertId })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    if (!data.id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    await query(`
      UPDATE manual_customers
      SET first_name=?, last_name=?, phone=?, email=?, city=?, notes=?
      WHERE id=?
    `, [
      data.first_name?.trim() || '',
      data.last_name?.trim()  || '',
      data.phone?.trim()      || null,
      data.email?.trim()      || null,
      data.city?.trim()       || null,
      data.notes?.trim()      || null,
      data.id,
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    await query('DELETE FROM manual_customers WHERE id = ?', [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 })
  }
}
