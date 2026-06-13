import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query, transaction } from '@/lib/db'

async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  return session?.value === 'authenticated'
}

// GET - Listar abonos de una transaccion
export async function GET(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId es requerido' }, { status: 400 })
    }

    const payments = await query<any[]>(
      `SELECT * FROM accounting_payments 
       WHERE transaction_id = ? 
       ORDER BY payment_date DESC`,
      [transactionId]
    )

    // Obtener tambien el total y amount_paid de la transaccion
    const txResult = await query<any[]>(
      'SELECT total, amount_paid FROM accounting_transactions WHERE id = ?',
      [transactionId]
    )

    const tx = txResult[0] || { total: 0, amount_paid: 0 }

    return NextResponse.json({
      success: true,
      payments,
      summary: {
        total: Number(tx.total),
        amountPaid: Number(tx.amount_paid),
        balance: Number(tx.total) - Number(tx.amount_paid)
      }
    })
  } catch (error: any) {
    if (error?.code === 'ER_NO_SUCH_TABLE' || error?.message?.includes("doesn't exist")) {
      return NextResponse.json({
        success: true,
        payments: [],
        summary: { total: 0, amountPaid: 0, balance: 0 }
      })
    }
    return NextResponse.json({ error: 'Error al obtener abonos: ' + (error?.sqlMessage || error?.message || 'desconocido') }, { status: 500 })
  }
}

// POST - Registrar un nuevo abono
export async function POST(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()

    if (!data.transactionId || !data.amount || data.amount <= 0) {
      return NextResponse.json({ error: 'transactionId y amount son requeridos' }, { status: 400 })
    }

    const result = await transaction(async (connection) => {
      // Verificar que la transaccion existe y obtener datos
      const [txRows] = await connection.execute(
        'SELECT id, total, amount_paid, payment_status FROM accounting_transactions WHERE id = ?',
        [data.transactionId]
      ) as any

      if (txRows.length === 0) {
        throw new Error('Transaccion no encontrada')
      }

      const tx = txRows[0]
      const currentPaid = Number(tx.amount_paid)
      const total = Number(tx.total)
      const newAmount = Number(data.amount)

      // Verificar que no se pague mas del total
      if (currentPaid + newAmount > total + 0.01) {
        throw new Error(`El abono excede el saldo pendiente. Pendiente: $${(total - currentPaid).toLocaleString()}`)
      }

      // Insertar el abono
      const [paymentResult] = await connection.execute(
        `INSERT INTO accounting_payments 
         (transaction_id, amount, payment_method, payment_reference, notes, payment_date) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.transactionId,
          newAmount,
          data.paymentMethod || 'cash',
          data.paymentReference || null,
          data.notes || null,
          data.paymentDate || new Date().toISOString().slice(0, 19).replace('T', ' ')
        ]
      ) as any

      // Recalcular amount_paid con SUM para evitar inconsistencias
      const [sumResult] = await connection.execute(
        'SELECT COALESCE(SUM(amount), 0) as total_paid FROM accounting_payments WHERE transaction_id = ?',
        [data.transactionId]
      ) as any

      const totalPaid = Number(sumResult[0].total_paid)

      // Actualizar amount_paid y cambiar estado si se completo el pago
      const newStatus = totalPaid >= total ? 'approved' : tx.payment_status === 'rejected' ? 'pending' : tx.payment_status
      
      await connection.execute(
        'UPDATE accounting_transactions SET amount_paid = ?, payment_status = ? WHERE id = ?',
        [totalPaid, newStatus, data.transactionId]
      )

      return {
        paymentId: paymentResult.insertId,
        totalPaid,
        balance: total - totalPaid,
        newStatus
      }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error?.message || 'Error al registrar abono' 
    }, { status: 500 })
  }
}

// PUT - Editar un abono (metodo, referencia, fecha, notas, Y MONTO)
export async function PUT(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { id, paymentMethod, paymentReference, paymentDate, notes, amount } = data

    if (!id) {
      return NextResponse.json({ error: 'ID del abono requerido' }, { status: 400 })
    }

    // Si se esta cambiando el monto, necesitamos recalcular totales
    if (amount !== undefined && amount !== null) {
      const result = await transaction(async (connection) => {
        // Obtener datos del abono actual
        const [paymentRows] = await connection.execute(
          'SELECT id, transaction_id, amount FROM accounting_payments WHERE id = ?',
          [id]
        ) as any

        if (paymentRows.length === 0) {
          throw new Error('Abono no encontrado')
        }

        const payment = paymentRows[0]
        const transactionId = payment.transaction_id
        const newAmount = Number(amount)

        if (newAmount <= 0) {
          throw new Error('El monto debe ser mayor a 0')
        }

        // Obtener total de la transaccion
        const [txRows] = await connection.execute(
          'SELECT total, amount_paid FROM accounting_transactions WHERE id = ?',
          [transactionId]
        ) as any
        const txTotal = Number(txRows[0]?.total || 0)

        // Calcular suma de otros abonos (excluyendo este)
        const [otherSum] = await connection.execute(
          'SELECT COALESCE(SUM(amount), 0) as sum_other FROM accounting_payments WHERE transaction_id = ? AND id != ?',
          [transactionId, id]
        ) as any
        const otherPaid = Number(otherSum[0]?.sum_other || 0)

        if (otherPaid + newAmount > txTotal + 0.01) {
          throw new Error(`El monto excede el total. Maximo permitido: $${(txTotal - otherPaid).toLocaleString()}`)
        }

        // Actualizar monto del abono + otros campos
        const fields: string[] = ['amount = ?']
        const params: any[] = [newAmount]

        if (paymentMethod !== undefined) { fields.push('payment_method = ?'); params.push(paymentMethod) }
        if (paymentReference !== undefined) { fields.push('payment_reference = ?'); params.push(paymentReference || null) }
        if (paymentDate !== undefined) { fields.push('payment_date = ?'); params.push(paymentDate) }
        if (notes !== undefined) { fields.push('notes = ?'); params.push(notes || null) }

        params.push(id)
        await connection.execute(`UPDATE accounting_payments SET ${fields.join(', ')} WHERE id = ?`, params)

        // Recalcular totales
        const totalPaid = otherPaid + newAmount
        const newStatus = totalPaid >= txTotal ? 'approved' : totalPaid > 0 ? 'pending' : 'pending'

        await connection.execute(
          'UPDATE accounting_transactions SET amount_paid = ?, payment_status = ? WHERE id = ?',
          [totalPaid, newStatus, transactionId]
        )

        return { totalPaid, balance: txTotal - totalPaid, newStatus }
      })

      return NextResponse.json({ success: true, ...result })
    }

    // Edicion sin cambio de monto (solo metadatos)
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
    if (paymentDate !== undefined) {
      fields.push('payment_date = ?')
      params.push(paymentDate)
    }
    if (notes !== undefined) {
      fields.push('notes = ?')
      params.push(notes || null)
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    params.push(id)
    await query(`UPDATE accounting_payments SET ${fields.join(', ')} WHERE id = ?`, params)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error?.message || 'Error al actualizar abono' 
    }, { status: 500 })
  }
}

// DELETE - Eliminar un abono
export async function DELETE(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('id')

    if (!paymentId) {
      return NextResponse.json({ error: 'ID del abono requerido' }, { status: 400 })
    }

    const result = await transaction(async (connection) => {
      // Obtener info del abono antes de eliminarlo
      const [paymentRows] = await connection.execute(
        'SELECT transaction_id FROM accounting_payments WHERE id = ?',
        [paymentId]
      ) as any

      if (paymentRows.length === 0) {
        throw new Error('Abono no encontrado')
      }

      const transactionId = paymentRows[0].transaction_id

      // Eliminar el abono
      await connection.execute('DELETE FROM accounting_payments WHERE id = ?', [paymentId])

      // Recalcular amount_paid
      const [sumResult] = await connection.execute(
        'SELECT COALESCE(SUM(amount), 0) as total_paid FROM accounting_payments WHERE transaction_id = ?',
        [transactionId]
      ) as any

      const totalPaid = Number(sumResult[0].total_paid)

      // Obtener total de la transaccion
      const [txRows] = await connection.execute(
        'SELECT total FROM accounting_transactions WHERE id = ?',
        [transactionId]
      ) as any

      const total = Number(txRows[0]?.total || 0)
      const newStatus = totalPaid >= total ? 'approved' : totalPaid > 0 ? 'pending' : 'pending'

      await connection.execute(
        'UPDATE accounting_transactions SET amount_paid = ?, payment_status = ? WHERE id = ?',
        [totalPaid, newStatus, transactionId]
      )

      return { totalPaid, balance: total - totalPaid, newStatus }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error?.message || 'Error al eliminar abono' 
    }, { status: 500 })
  }
}
