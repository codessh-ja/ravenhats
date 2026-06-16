import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query, transaction } from '@/lib/db'

async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  return session?.value === 'authenticated'
}

// GET - Listar transacciones con filtros
export async function GET(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const type          = searchParams.get('type') || ''
    const typeGroup     = searchParams.get('typeGroup') || ''
    const paymentMethod = searchParams.get('paymentMethod') || ''
    const paymentStatus = searchParams.get('paymentStatus') || ''
    const dateFrom      = searchParams.get('dateFrom') || ''
    const dateTo        = searchParams.get('dateTo') || ''
    const search        = searchParams.get('search') || ''
    const includeChart  = searchParams.get('chartData') === 'true'
    const page  = parseInt(searchParams.get('page')  || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let sql = `
      SELECT t.*,
             (SELECT COUNT(*) FROM accounting_transaction_items WHERE transaction_id = t.id) as item_count,
             (t.total - t.amount_paid) as balance
      FROM accounting_transactions t
      WHERE 1=1
    `
    let countSql = `SELECT COUNT(*) as total FROM accounting_transactions t WHERE 1=1`
    const params: (string | number)[] = []
    const countParams: (string | number)[] = []

    if (type && type !== 'all') {
      sql += ' AND t.type = ?'
      countSql += ' AND t.type = ?'
      params.push(type)
      countParams.push(type)
    }

    if (typeGroup === 'income') {
      sql += ` AND t.type IN ('online_sale', 'physical_sale')`
      countSql += ` AND t.type IN ('online_sale', 'physical_sale')`
    } else if (typeGroup === 'expense') {
      sql += ` AND t.type IN ('expense', 'refund')`
      countSql += ` AND t.type IN ('expense', 'refund')`
    }

    if (paymentMethod && paymentMethod !== 'all') {
      sql += ' AND t.payment_method = ?'
      countSql += ' AND t.payment_method = ?'
      params.push(paymentMethod)
      countParams.push(paymentMethod)
    }

    if (paymentStatus) {
      sql += ' AND t.payment_status = ?'
      countSql += ' AND t.payment_status = ?'
      params.push(paymentStatus)
      countParams.push(paymentStatus)
    }

    if (dateFrom) {
      sql += ' AND t.transaction_date >= ?'
      countSql += ' AND t.transaction_date >= ?'
      params.push(dateFrom)
      countParams.push(dateFrom)
    }

    if (dateTo) {
      sql += ' AND t.transaction_date <= ?'
      countSql += ' AND t.transaction_date <= ?'
      params.push(dateTo + ' 23:59:59')
      countParams.push(dateTo + ' 23:59:59')
    }

    if (search) {
      sql += ' AND (t.customer_name LIKE ? OR t.order_number LIKE ? OR t.description LIKE ? OR t.payment_reference LIKE ?)'
      countSql += ' AND (t.customer_name LIKE ? OR t.order_number LIKE ? OR t.description LIKE ? OR t.payment_reference LIKE ?)'
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm, searchTerm)
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm)
    }

    sql += ` ORDER BY t.transaction_date DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`

    const [transactions, countResult] = await Promise.all([
      query<any[]>(sql, params),
      query<any[]>(countSql, countParams)
    ])

    // Resumen financiero del periodo filtrado
    // amount_paid refleja el dinero REAL recibido (incluye abonos parciales)
    let summarySql = `
      SELECT 
        COALESCE(SUM(CASE WHEN t.type IN ('online_sale', 'physical_sale') THEN t.amount_paid ELSE 0 END), 0) as totalIncome,
        COALESCE(SUM(CASE WHEN t.type = 'refund' AND t.payment_status = 'approved' THEN t.total ELSE 0 END), 0) as totalRefunds,
        COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.payment_status = 'approved' THEN t.total ELSE 0 END), 0) as totalExpenses,
        COUNT(CASE WHEN t.type = 'online_sale' AND t.payment_status = 'approved' THEN 1 END) as onlineSales,
        COUNT(CASE WHEN t.type = 'physical_sale' AND t.payment_status = 'approved' THEN 1 END) as physicalSales,
        COALESCE(SUM(CASE WHEN t.type = 'online_sale' THEN t.amount_paid ELSE 0 END), 0) as onlineTotal,
        COALESCE(SUM(CASE WHEN t.type = 'physical_sale' THEN t.amount_paid ELSE 0 END), 0) as physicalTotal,
        COALESCE(SUM(CASE WHEN t.type IN ('online_sale', 'physical_sale') AND t.payment_status = 'pending' AND t.amount_paid > 0 THEN t.amount_paid ELSE 0 END), 0) as partiallyPaid,
        COALESCE(SUM(CASE WHEN t.type IN ('online_sale', 'physical_sale') AND t.payment_status = 'pending' THEN (t.total - t.amount_paid) ELSE 0 END), 0) as pendingBalance,
        COUNT(CASE WHEN t.type IN ('online_sale', 'physical_sale') AND t.payment_status = 'pending' AND t.amount_paid > 0 THEN 1 END) as partialCount
      FROM accounting_transactions t
      WHERE 1=1
    `
    const summaryParams: (string | number)[] = []

    if (dateFrom) {
      summarySql += ' AND t.transaction_date >= ?'
      summaryParams.push(dateFrom)
    }
    if (dateTo) {
      summarySql += ' AND t.transaction_date <= ?'
      summaryParams.push(dateTo + ' 23:59:59')
    }

    const summary = await query<any[]>(summarySql, summaryParams)

    let chartData: any[] = []
    if (includeChart) {
      chartData = await query<any[]>(`
        SELECT
          DATE_FORMAT(t.transaction_date, '%Y-%m') as month,
          DATE_FORMAT(t.transaction_date, '%b %Y') as label,
          COALESCE(SUM(CASE WHEN t.type IN ('online_sale','physical_sale') THEN t.amount_paid ELSE 0 END), 0) as ingresos,
          COALESCE(SUM(CASE WHEN t.type IN ('expense','refund') AND t.payment_status = 'approved' THEN t.total ELSE 0 END), 0) as egresos
        FROM accounting_transactions t
        GROUP BY DATE_FORMAT(t.transaction_date, '%Y-%m'), DATE_FORMAT(t.transaction_date, '%b %Y')
        ORDER BY month ASC
        LIMIT 24
      `)
    }

    return NextResponse.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total: countResult[0]?.total || 0,
        totalPages: Math.ceil((countResult[0]?.total || 0) / limit)
      },
      summary: summary[0] || {},
      ...(includeChart ? { chartData } : {})
    })
  } catch (error: any) {
    console.error('[v0] Error fetching accounting:', error?.message, error?.code, error?.sqlMessage)
    
    // Si la tabla no existe, retornar datos vacios en vez de error
    if (error?.code === 'ER_NO_SUCH_TABLE' || error?.message?.includes('doesn\'t exist')) {
      return NextResponse.json({
        success: true,
        transactions: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
        summary: {
          totalIncome: 0, totalRefunds: 0, totalExpenses: 0,
          onlineSales: 0, physicalSales: 0, onlineTotal: 0, physicalTotal: 0
        }
      })
    }
    
    return NextResponse.json({ error: 'Error al obtener transacciones: ' + (error?.sqlMessage || error?.message || 'desconocido') }, { status: 500 })
  }
}

function bogotaTimestamp(): string {
  const now   = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const g = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}:${g('second')}`
}

// POST - Crear transaccion manual (venta fisica, gasto, ajuste)
export async function POST(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()

    if (!data.type || !data.paymentMethod || data.total === undefined) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Determinar el estado real del pago
    const isPartial = data.paymentStatus === 'partial'
    const actualPaymentStatus = isPartial ? 'pending' : (data.paymentStatus || 'approved')
    const initialAmountPaid = actualPaymentStatus === 'approved' ? data.total : (isPartial ? Number(data.firstPaymentAmount || 0) : 0)

    const result = await transaction(async (connection) => {
      const [txResult] = await connection.execute(
        `INSERT INTO accounting_transactions (
          type, payment_method, payment_status, 
          customer_name, customer_phone, customer_email,
          subtotal, shipping_cost, discount, total, amount_paid,
          description, notes, payment_reference, created_by,
          transaction_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.type,
          data.paymentMethod,
          actualPaymentStatus,
          data.customerName || null,
          data.customerPhone || null,
          data.customerEmail || null,
          data.subtotal || data.total,
          data.shippingCost || 0,
          data.discount || 0,
          data.total,
          initialAmountPaid,
          data.description || null,
          data.notes || null,
          data.paymentReference || null,
          'admin',
          data.transactionDate || bogotaTimestamp()
        ]
      ) as any

      const txId = txResult.insertId

      // Insertar items si los hay
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          await connection.execute(
            `INSERT INTO accounting_transaction_items 
             (transaction_id, product_id, product_name, quantity, unit_price, subtotal)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              txId,
              item.productId || null,
              item.productName,
              item.quantity,
              item.unitPrice,
              item.quantity * item.unitPrice
            ]
          )

          // Descontar stock si es venta fisica (siempre, ya que el producto se entrega sin importar si el pago es parcial/pendiente)
          if (data.type === 'physical_sale' && item.productId) {
            await connection.execute(
              'UPDATE products SET stock = GREATEST(stock - ?, 0), updated_at = NOW() WHERE id = ? AND stock > 0',
              [item.quantity, item.productId]
            )
          }
        }
      }

      // Si es pago parcial, registrar el primer abono en accounting_payments
      if (isPartial && Number(data.firstPaymentAmount) > 0) {
        await connection.execute(
          `INSERT INTO accounting_payments 
           (transaction_id, amount, payment_method, payment_reference, notes, payment_date) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            txId,
            Number(data.firstPaymentAmount),
            data.paymentMethod,
            data.paymentReference || null,
            'Primer abono al registrar venta',
            data.transactionDate || bogotaTimestamp()
          ]
        )
      }

      return { id: txId }
    })

    return NextResponse.json({ success: true, transaction: result })
  } catch (error: any) {
    console.error('[v0] Error creating transaction:', error?.message, error?.code, error?.sqlMessage)
    return NextResponse.json({ error: 'Error al crear transaccion: ' + (error?.sqlMessage || error?.message || 'desconocido') }, { status: 500 })
  }
}

// PUT - Editar transaccion manual (metodo de pago, fecha, referencia, notas, cliente)
export async function PUT(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { id, paymentMethod, paymentReference, transactionDate, notes, customerName, customerPhone, customerEmail, description, paymentStatus, forceAmountPaid } = data

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Verificar que existe
    const existing = await query<any[]>(
      'SELECT id, order_id, total, amount_paid, payment_status FROM accounting_transactions WHERE id = ?',
      [id]
    )

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Transaccion no encontrada' }, { status: 404 })
    }

    const fields: string[] = []
    const params: any[] = []

    if (paymentMethod !== undefined) {
      fields.push('payment_method = ?')
      params.push(paymentMethod)
    }
    if (paymentReference !== undefined) {
      fields.push('payment_reference = ?')
      params.push(paymentReference || null)
    }
    if (transactionDate !== undefined) {
      fields.push('transaction_date = ?')
      params.push(transactionDate)
    }
    if (notes !== undefined) {
      fields.push('notes = ?')
      params.push(notes || null)
    }
    if (description !== undefined) {
      fields.push('description = ?')
      params.push(description || null)
    }
    if (customerName !== undefined) {
      fields.push('customer_name = ?')
      params.push(customerName || null)
    }
    if (customerPhone !== undefined) {
      fields.push('customer_phone = ?')
      params.push(customerPhone || null)
    }
    if (customerEmail !== undefined) {
      fields.push('customer_email = ?')
      params.push(customerEmail || null)
    }

    // Permitir cambiar el estado de pago manualmente
    if (paymentStatus !== undefined) {
      fields.push('payment_status = ?')
      params.push(paymentStatus)

      // Si se marca como "approved", actualizar amount_paid al total
      if (paymentStatus === 'approved') {
        fields.push('amount_paid = total')
      }
    }

    // Permitir forzar el monto pagado manualmente
    if (forceAmountPaid !== undefined && forceAmountPaid !== null) {
      const total = Number(existing[0].total)
      const newAmountPaid = Number(forceAmountPaid)
      fields.push('amount_paid = ?')
      params.push(newAmountPaid)
      
      // Auto-actualizar status basado en monto
      if (paymentStatus === undefined) {
        if (newAmountPaid >= total) {
          fields.push('payment_status = ?')
          params.push('approved')
        } else if (newAmountPaid > 0) {
          fields.push('payment_status = ?')
          params.push('pending')
        }
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    params.push(id)
    await query(`UPDATE accounting_transactions SET ${fields.join(', ')} WHERE id = ?`, params)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[v0] Error updating transaction:', error?.message, error?.code, error?.sqlMessage)
    return NextResponse.json({ error: 'Error al actualizar transaccion: ' + (error?.sqlMessage || error?.message || 'desconocido') }, { status: 500 })
  }
}

// DELETE - Eliminar transaccion manual
export async function DELETE(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Solo permitir eliminar transacciones manuales
    const existing = await query<any[]>(
      'SELECT type, order_id FROM accounting_transactions WHERE id = ?',
      [id]
    )

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Transaccion no encontrada' }, { status: 404 })
    }

    if (existing[0].order_id) {
      return NextResponse.json({ 
        error: 'No se puede eliminar una transaccion vinculada a un pedido online' 
      }, { status: 400 })
    }

    await transaction(async (connection) => {
      await connection.execute('DELETE FROM accounting_payments WHERE transaction_id = ?', [id])
      await connection.execute('DELETE FROM accounting_transaction_items WHERE transaction_id = ?', [id])
      await connection.execute('DELETE FROM accounting_transactions WHERE id = ?', [id])
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[v0] Error deleting transaction:', error?.message, error?.code, error?.sqlMessage)
    return NextResponse.json({ error: 'Error al eliminar transaccion: ' + (error?.sqlMessage || error?.message || 'desconocido') }, { status: 500 })
  }
}
