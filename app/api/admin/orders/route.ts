import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query, transaction } from '@/lib/db'
import { getWompiTransactionByReference } from '@/lib/wompi'
import {
  sendOrderEmail,
  sendOrderConfirmationEmail,
  sendCODOrderConfirmationEmail,
  sendShippingEmail,
  sendDeliveredEmail,
  sendOrderPreparingEmail,
  sendAdminNewOrderEmail,
  sendAdminDispatchEmail,
} from '@/lib/email'

async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  return session?.value === 'authenticated'
}

// GET - Listar pedidos
export async function GET(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''
    const paymentStatusFilter = searchParams.get('paymentStatus') || ''

    // Si se pide un pedido especifico, devolver sus items
    if (id) {
      const items = await query<any[]>(
        'SELECT * FROM order_items WHERE order_id = ?',
        [id]
      )
      // También devolver historial de cambios de estado si existe
      let statusHistory: any[] = []
      try {
        statusHistory = await query<any[]>(
          `SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC`,
          [id]
        )
      } catch { /* table may not exist yet */ }

      return NextResponse.json({ success: true, items, statusHistory })
    }

    let sql = 'SELECT * FROM orders WHERE 1=1'
    const params: (string | number)[] = []

    if (status && status !== 'all') {
      sql += ' AND status = ?'
      params.push(status)
    }

    if (paymentStatusFilter && paymentStatusFilter !== 'all') {
      sql += ' AND payment_status = ?'
      params.push(paymentStatusFilter)
    }

    if (search) {
      sql += ' AND (order_number LIKE ? OR customer_email LIKE ? OR customer_first_name LIKE ? OR customer_last_name LIKE ? OR customer_phone LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    }

    sql += ' ORDER BY created_at DESC'

    const orders = await query<any[]>(sql, params)

    // Obtener item count por cada orden
    for (const order of orders) {
      const countResult = await query<any[]>(
        'SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?',
        [order.id]
      )
      order.item_count = countResult[0]?.cnt || 0
    }

    // Contar por estado
    const counts = await query<any[]>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as payment_pending,
        SUM(CASE WHEN payment_status = 'approved' THEN 1 ELSE 0 END) as payment_approved,
        SUM(CASE WHEN payment_method = 'COD' AND payment_status = 'pending' THEN 1 ELSE 0 END) as cod_pending
      FROM orders
    `)

    return NextResponse.json({ 
      success: true,
      orders, 
      counts: counts[0] || {} 
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 })
  }
}

// DELETE - Eliminar pedido
export async function DELETE(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de pedido requerido' }, { status: 400 })
    }

    await transaction(async (connection) => {
      // Eliminar historial de estados
      try {
        await connection.execute('DELETE FROM order_status_history WHERE order_id = ?', [id])
      } catch { /* table may not exist */ }
      // Eliminar pagos asociados
      try {
        await connection.execute('DELETE FROM payments WHERE order_id = ?', [id])
      } catch { /* table may not exist */ }
      // Eliminar transaccion contable asociada
      try {
        const [txRows] = await connection.execute(
          'SELECT id FROM accounting_transactions WHERE order_id = ?', [id]
        ) as any
        for (const tx of txRows) {
          await connection.execute('DELETE FROM accounting_payments WHERE transaction_id = ?', [tx.id])
          await connection.execute('DELETE FROM accounting_transaction_items WHERE transaction_id = ?', [tx.id])
        }
        await connection.execute('DELETE FROM accounting_transactions WHERE order_id = ?', [id])
      } catch { /* tables may not exist */ }
      // Eliminar los items del pedido
      await connection.execute('DELETE FROM order_items WHERE order_id = ?', [id])
      // Eliminar el pedido
      await connection.execute('DELETE FROM orders WHERE id = ?', [id])
    })

    return NextResponse.json({ success: true, message: 'Pedido eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json({ error: 'Error al eliminar pedido' }, { status: 500 })
  }
}

// PUT - Actualizar pedido con logica real
export async function PUT(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    
    if (!data.id) {
      return NextResponse.json({ error: 'ID de pedido requerido' }, { status: 400 })
    }

    // Obtener datos actuales del pedido (incluir payment_reference para verificacion Wompi)
    const currentOrders = await query<any[]>(
      `SELECT o.*, o.payment_reference,
              (SELECT GROUP_CONCAT(oi.product_name SEPARATOR ', ') FROM order_items oi WHERE oi.order_id = o.id) as product_names
       FROM orders o WHERE o.id = ?`,
      [data.id]
    )

    if (currentOrders.length === 0) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const currentOrder = currentOrders[0]

    // ============================================================
    // ACTION: verifyWompi - Verificar pago con Wompi API
    // ============================================================
    // REGLAS CRITICAS:
    // - Este boton SOLO consulta el estado real en Wompi
    // - NUNCA envia emails directamente (eso es responsabilidad del webhook)
    // - NUNCA marca pagos como aprobados sin confirmacion real de Wompi
    // - Solo sincroniza el estado de la BD con lo que Wompi reporta
    // ============================================================
    if (data.action === 'verifyWompi') {
      if (currentOrder.payment_method === 'COD') {
        return NextResponse.json({ error: 'Este pedido es contra entrega, no usa Wompi' }, { status: 400 })
      }

      try {
        // Buscar transacciones usando la referencia de pago guardada o el order_number
        // Las referencias de pago tienen formato: RH-XXXXXX-{timestamp}-{random}
        const searchReference = currentOrder.payment_reference || currentOrder.order_number
        let wompiTx = await getWompiTransactionByReference(searchReference)
        
        // Si no encontramos con la referencia guardada, intentar con el order_number
        if (!wompiTx && searchReference !== currentOrder.order_number) {
          wompiTx = await getWompiTransactionByReference(currentOrder.order_number)
        }
        
        if (!wompiTx) {
          return NextResponse.json({ 
            success: true,
            verified: false,
            wompiStatus: null,
            message: 'No se encontro transaccion en Wompi para este pedido. El cliente puede no haber iniciado el pago aun.'
          })
        }

        const wompiStatus = wompiTx.status
        let newPaymentStatus = currentOrder.payment_status
        let newOrderStatus = currentOrder.status
        let statusChanged = false

        if (wompiStatus === 'APPROVED') {
          newPaymentStatus = 'approved'
          if (currentOrder.status === 'pending') newOrderStatus = 'confirmed'
        } else if (['DECLINED', 'ERROR', 'VOIDED'].includes(wompiStatus)) {
          newPaymentStatus = 'rejected'
        }

        // Actualizar en BD SOLO si el estado cambio
        if (newPaymentStatus !== currentOrder.payment_status) {
          statusChanged = true
          await query(
            `UPDATE orders SET payment_status = ?, status = ?, updated_at = NOW() WHERE id = ?`,
            [newPaymentStatus, newOrderStatus, data.id]
          )

          // Registrar en historial
          try {
            await query(
              `INSERT INTO order_status_history (order_id, previous_status, new_status, previous_payment_status, new_payment_status, changed_by, notes) 
               VALUES (?, ?, ?, ?, ?, 'admin', ?)`,
              [data.id, currentOrder.status, newOrderStatus, currentOrder.payment_status, newPaymentStatus,
               `Verificacion manual Wompi: ${wompiStatus}`]
            )
          } catch { /* table may not exist */ }

          // =================================================================
          // IMPORTANTE: NO enviar emails desde aqui
          // Los emails se envian SOLO desde el webhook de Wompi
          // Esto previene duplicados y asegura que solo se envien
          // cuando hay una confirmacion real de pago
          // =================================================================
        }

        return NextResponse.json({
          success: true,
          verified: true,
          wompiStatus,
          newPaymentStatus,
          newOrderStatus,
          statusChanged,
          wompiTransactionId: wompiTx.id,
          emailSent: currentOrder.confirmation_email_sent,
          message: wompiStatus === 'APPROVED' 
            ? (statusChanged 
                ? `Pago verificado y estado actualizado.${currentOrder.confirmation_email_sent ? ' Email ya enviado via webhook.' : ' Email pendiente - el webhook lo enviara.'}`
                : `Pago ya estaba confirmado.${currentOrder.confirmation_email_sent ? ' Email ya enviado.' : ''}`)
            : wompiStatus === 'PENDING'
              ? 'Pago aun pendiente en Wompi. El cliente debe completar el pago.'
              : `Pago ${wompiStatus} en Wompi`
        })
      } catch (err: any) {
        return NextResponse.json({ 
          error: `Error consultando Wompi: ${err?.message || 'desconocido'}` 
        }, { status: 500 })
      }
    }

    // ============================================================
    // ACTION: confirmCOD - Confirmar pedido contra entrega
    // ============================================================
    if (data.action === 'confirmCOD') {
      if (currentOrder.payment_method !== 'COD') {
        return NextResponse.json({ error: 'Este pedido no es contra entrega' }, { status: 400 })
      }

      const newStatus = data.codAction // 'confirm' | 'contactClient' | 'markPaid' | 'cancel'

      if (newStatus === 'confirm') {
        // Confirmar pedido COD - cambiar a confirmed, enviar email al cliente
        await query(
          `UPDATE orders SET status = 'confirmed', updated_at = NOW() WHERE id = ?`,
          [data.id]
        )
        try {
          await query(
            `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes) 
             VALUES (?, ?, 'confirmed', 'admin', ?)`,
            [data.id, currentOrder.status, data.notes || 'Pedido COD confirmado para despacho']
          )
        } catch { /* */ }

        // Enviar email de confirmacion COD al cliente con imagenes
        try {
          const items = await query<any[]>(
            'SELECT product_name as name, quantity, unit_price as price, product_image as image FROM order_items WHERE order_id = ?',
            [data.id]
          )
          await sendCODOrderConfirmationEmail({
            orderNumber: currentOrder.order_number,
            customerEmail: currentOrder.customer_email,
            customerName: `${currentOrder.customer_first_name} ${currentOrder.customer_last_name}`,
            total: Number(currentOrder.total),
            items,
            shippingAddress: currentOrder.shipping_address_line1 || '',
            shippingCity: currentOrder.shipping_city || '',
            shippingDepartment: currentOrder.shipping_department || '',
          })
        } catch (e) { console.error('Error email COD:', e) }

        // Notificar admin para despachar
        try {
          await sendAdminDispatchEmail({
            orderNumber: currentOrder.order_number,
            customerName: `${currentOrder.customer_first_name} ${currentOrder.customer_last_name}`,
            customerPhone: currentOrder.customer_phone || 'N/A',
            customerEmail: currentOrder.customer_email,
            shippingAddress: currentOrder.shipping_address_line1 || '',
            shippingCity: currentOrder.shipping_city || '',
            shippingDepartment: currentOrder.shipping_department || '',
            total: Number(currentOrder.total),
            paymentMethod: 'Contra Entrega',
            productNames: currentOrder.product_names || 'N/A',
          })
        } catch (e) { console.error('Error admin email:', e) }

        return NextResponse.json({ success: true, message: 'Pedido COD confirmado. Se notifico al cliente y al admin para despacho.' })
      }

      if (newStatus === 'markPaid') {
        // COD entregado y pagado
        await query(
          `UPDATE orders SET payment_status = 'approved', status = 'delivered', delivered_at = NOW(), updated_at = NOW() WHERE id = ?`,
          [data.id]
        )
        try {
          await query(
            `INSERT INTO order_status_history (order_id, previous_status, new_status, previous_payment_status, new_payment_status, changed_by, notes) 
             VALUES (?, ?, 'delivered', ?, 'approved', 'admin', ?)`,
            [data.id, currentOrder.status, currentOrder.payment_status, data.notes || 'COD entregado y cobrado']
          )
        } catch { /* */ }

        // Registrar en contabilidad
        await registerOrderInAccounting(data.id, currentOrder)

        // Enviar email de entrega
        try {
          await sendDeliveredEmail({
            orderNumber: currentOrder.order_number,
            customerEmail: currentOrder.customer_email,
            customerName: `${currentOrder.customer_first_name} ${currentOrder.customer_last_name}`,
          })
        } catch (e) { console.error('Error email delivered:', e) }

        return NextResponse.json({ success: true, message: 'Pedido COD marcado como entregado y pagado.' })
      }

      if (newStatus === 'cancel') {
        await query(
          `UPDATE orders SET status = 'cancelled', payment_status = 'rejected', updated_at = NOW() WHERE id = ?`,
          [data.id]
        )
        try {
          await query(
            `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes) 
             VALUES (?, ?, 'cancelled', 'admin', ?)`,
            [data.id, currentOrder.status, data.notes || 'Pedido COD cancelado']
          )
        } catch { /* */ }

        // Enviar email de cancelacion al cliente (con idempotencia)
        let emailSent = false
        try {
          const result = await sendOrderEmail('order_cancelled', {
            orderNumber: currentOrder.order_number,
            customerEmail: currentOrder.customer_email,
            customerName: `${currentOrder.customer_first_name} ${currentOrder.customer_last_name}`,
            total: Number(currentOrder.total),
            cancellationReason: data.notes || 'Pedido cancelado por el administrador'
          })
          
          if (result.success) {
            emailSent = true
            try {
              await query('UPDATE orders SET email_cancelled_sent = TRUE WHERE id = ?', [data.id])
            } catch { /* columna puede no existir */ }
            console.log(`[Admin Orders] Email de cancelacion enviado para ${currentOrder.order_number}`)
          }
        } catch (e) { 
          console.error('[Admin Orders] Error enviando email de cancelacion:', e) 
        }

        return NextResponse.json({ 
          success: true, 
          message: emailSent ? 'Pedido COD cancelado. Cliente notificado.' : 'Pedido COD cancelado.' 
        })
      }

      return NextResponse.json({ error: 'Accion COD no valida' }, { status: 400 })
    }

    // ============================================================
    // ACTION: updateStatus - Cambiar estado del pedido (con validaciones)
    // ============================================================
    if (data.action === 'updateStatus') {
      const newStatus = data.status
      const oldStatus = currentOrder.status

      // Validaciones de flujo de estados
      const validTransitions: Record<string, string[]> = {
        pending: ['confirmed', 'processing', 'cancelled'],
        confirmed: ['processing', 'shipped', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['delivered', 'cancelled'],
        delivered: [], // Estado final
        cancelled: ['pending'], // Puede reactivarse
      }

      if (!validTransitions[oldStatus]?.includes(newStatus)) {
        return NextResponse.json({ 
          error: `No se puede cambiar de "${oldStatus}" a "${newStatus}". Transiciones validas: ${validTransitions[oldStatus]?.join(', ') || 'ninguna'}` 
        }, { status: 400 })
      }

      // Si intenta confirmar un pedido con pago pendiente (no COD), advertir
      if (newStatus === 'confirmed' && currentOrder.payment_status !== 'approved' && currentOrder.payment_method !== 'COD') {
        return NextResponse.json({ 
          error: 'No se puede confirmar un pedido con pago pendiente. Verifica primero el pago con Wompi o usa la accion "Verificar Pago".' 
        }, { status: 400 })
      }

      const updates: string[] = ['status = ?', 'updated_at = NOW()']
      const params: (string | number | null)[] = [newStatus]

      if (newStatus === 'shipped') {
        updates.push('shipped_at = NOW()')
      } else if (newStatus === 'delivered') {
        updates.push('delivered_at = NOW()')
      }

      params.push(data.id)
      await query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params)

      // Registrar historial
      try {
        await query(
          `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes) 
           VALUES (?, ?, ?, 'admin', ?)`,
          [data.id, oldStatus, newStatus, data.adminNotes || null]
        )
      } catch { /* */ }

      // ============================================================
      // ENVIAR EMAILS SEGUN NUEVO ESTADO (CON CONTROL DE DUPLICADOS)
      // ============================================================
      let emailSent = false
      let emailType = ''

      // Email de preparacion cuando cambia a "processing"
      if (newStatus === 'processing') {
        // Verificar si ya se envio email de preparacion
        const [emailCheck] = await query<any[]>(
          'SELECT email_preparing_sent FROM orders WHERE id = ?',
          [data.id]
        )
        
        if (!emailCheck?.email_preparing_sent) {
          try {
            const result = await sendOrderEmail('order_preparing', {
              orderNumber: currentOrder.order_number,
              customerEmail: currentOrder.customer_email,
              customerName: `${currentOrder.customer_first_name} ${currentOrder.customer_last_name}`,
              total: Number(currentOrder.total)
            })
            
            if (result.success) {
              await query('UPDATE orders SET email_preparing_sent = TRUE WHERE id = ?', [data.id])
              emailSent = true
              emailType = 'preparacion'
            }
          } catch (e) { 
            console.error('[Admin Orders] Error email preparing:', e) 
          }
        }
      }

      // Notificar admin para despachar cuando se confirma
      if (newStatus === 'confirmed' && currentOrder.payment_method !== 'COD') {
        try {
          await sendAdminDispatchEmail({
            orderNumber: currentOrder.order_number,
            customerName: `${currentOrder.customer_first_name} ${currentOrder.customer_last_name}`,
            customerPhone: currentOrder.customer_phone || 'N/A',
            customerEmail: currentOrder.customer_email,
            shippingAddress: currentOrder.shipping_address_line1 || '',
            shippingCity: currentOrder.shipping_city || '',
            shippingDepartment: currentOrder.shipping_department || '',
            total: Number(currentOrder.total),
            paymentMethod: currentOrder.payment_method || 'Wompi',
            productNames: currentOrder.product_names || 'N/A',
          })
        } catch (e) { console.error('[Admin Orders] Error admin dispatch email:', e) }
      }

      // Email de entrega cuando cambia a "delivered"
      if (newStatus === 'delivered') {
        // Verificar si ya se envio email de entrega
        const [emailCheck] = await query<any[]>(
          'SELECT email_delivered_sent FROM orders WHERE id = ?',
          [data.id]
        )
        
        if (!emailCheck?.email_delivered_sent) {
          try {
            const result = await sendOrderEmail('order_delivered', {
              orderNumber: currentOrder.order_number,
              customerEmail: currentOrder.customer_email,
              customerName: `${currentOrder.customer_first_name} ${currentOrder.customer_last_name}`,
              total: Number(currentOrder.total)
            })
            
            if (result.success) {
              await query('UPDATE orders SET email_delivered_sent = TRUE WHERE id = ?', [data.id])
              emailSent = true
              emailType = 'entrega'
            }
          } catch (e) { 
            console.error('[Admin Orders] Error email delivered:', e) 
          }
        }
      }

      // Email de cancelacion cuando cambia a "cancelled"
      if (newStatus === 'cancelled') {
        // Verificar si ya se envio email de cancelacion (si existe la columna)
        let alreadySent = false
        try {
          const [emailCheck] = await query<any[]>(
            'SELECT email_cancelled_sent FROM orders WHERE id = ?',
            [data.id]
          )
          alreadySent = emailCheck?.email_cancelled_sent === true || emailCheck?.email_cancelled_sent === 1
        } catch { /* columna puede no existir aun */ }
        
        if (!alreadySent) {
          try {
            const result = await sendOrderEmail('order_cancelled', {
              orderNumber: currentOrder.order_number,
              customerEmail: currentOrder.customer_email,
              customerName: `${currentOrder.customer_first_name} ${currentOrder.customer_last_name}`,
              total: Number(currentOrder.total),
              cancellationReason: data.adminNotes || 'Pedido cancelado'
            })
            
            if (result.success) {
              // Marcar como enviado (si la columna existe)
              try {
                await query('UPDATE orders SET email_cancelled_sent = TRUE WHERE id = ?', [data.id])
              } catch { /* columna puede no existir aun */ }
              emailSent = true
              emailType = 'cancelacion'
              console.log(`[Admin Orders] Email de cancelacion enviado para ${currentOrder.order_number}`)
            }
          } catch (e) { 
            console.error('[Admin Orders] Error email cancelled:', e) 
          }
        } else {
          console.log(`[Admin Orders] Email de cancelacion ya enviado para ${currentOrder.order_number}, omitiendo`)
        }
      }

      const message = emailSent 
        ? `Estado actualizado a ${newStatus}. Email de ${emailType} enviado al cliente.`
        : `Estado actualizado a ${newStatus}`

      return NextResponse.json({ success: true, message })
    }

    // ============================================================
    // ACTION: updateTracking - Agregar/actualizar tracking + enviar email
    // ============================================================
    if (data.action === 'updateTracking') {
      if (!data.trackingNumber) {
        return NextResponse.json({ error: 'Numero de tracking requerido' }, { status: 400 })
      }

      // Actualizar tracking y cambiar estado a shipped si no lo esta
      const newStatus = ['pending', 'confirmed', 'processing'].includes(currentOrder.status) 
        ? 'shipped' : currentOrder.status

      await query(
        `UPDATE orders SET tracking_number = ?, tracking_url = ?, status = ?, shipped_at = COALESCE(shipped_at, NOW()), updated_at = NOW() WHERE id = ?`,
        [data.trackingNumber, data.trackingUrl || null, newStatus, data.id]
      )

      // Registrar historial
      try {
        await query(
          `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes) 
           VALUES (?, ?, ?, 'admin', ?)`,
          [data.id, currentOrder.status, newStatus, `Tracking: ${data.trackingNumber}`]
        )
      } catch { /* */ }

      // Enviar email de envio al cliente (con control de duplicados)
      let emailSent = false
      const [emailCheck] = await query<any[]>(
        'SELECT email_shipped_sent FROM orders WHERE id = ?',
        [data.id]
      )
      
      if (!emailCheck?.email_shipped_sent) {
        try {
          const result = await sendOrderEmail('order_shipped', {
            orderNumber: currentOrder.order_number,
            customerEmail: currentOrder.customer_email,
            customerName: `${currentOrder.customer_first_name} ${currentOrder.customer_last_name}`,
            total: Number(currentOrder.total),
            trackingNumber: data.trackingNumber,
            trackingUrl: data.trackingUrl,
          })
          
          if (result.success) {
            await query('UPDATE orders SET email_shipped_sent = TRUE WHERE id = ?', [data.id])
            emailSent = true
          }
        } catch (e) { 
          console.error('[Admin Orders] Error email shipping:', e) 
        }
      } else {
        console.log(`[Admin Orders] Email de envio ya enviado para orden ${currentOrder.order_number}, omitiendo`)
      }

      const message = emailSent 
        ? 'Tracking actualizado y cliente notificado por email'
        : emailCheck?.email_shipped_sent 
          ? 'Tracking actualizado (email ya habia sido enviado previamente)'
          : 'Tracking actualizado (email no pudo enviarse)'

      return NextResponse.json({ success: true, message })
    }

    // ============================================================
    // ACTION: updateNotes - Solo actualizar notas admin
    // ============================================================
    if (data.action === 'updateNotes') {
      await query(
        `UPDATE orders SET admin_notes = ?, updated_at = NOW() WHERE id = ?`,
        [data.adminNotes || null, data.id]
      )
      return NextResponse.json({ success: true })
    }

    // ============================================================
    // ACTION: resendEmail - Re-enviar email especifico
    // ============================================================
    // Permite reenviar emails que fallaron o que el cliente no recibio
    // emailType: 'confirmed' | 'preparing' | 'shipped' | 'delivered'
    if (data.action === 'resendEmail') {
      const emailType = data.emailType || 'confirmed'
      
      // Validaciones segun tipo de email
      if (emailType === 'confirmed' && currentOrder.payment_status !== 'approved' && currentOrder.payment_method !== 'COD') {
        return NextResponse.json({ 
          error: 'Solo se puede reenviar email de confirmacion para ordenes con pago aprobado' 
        }, { status: 400 })
      }
      
      if (emailType === 'shipped' && !currentOrder.tracking_number) {
        return NextResponse.json({ 
          error: 'No hay numero de tracking para enviar email de envio' 
        }, { status: 400 })
      }

      try {
        // Obtener items con imagenes para email premium
        const items = await query<any[]>(
          'SELECT product_name as name, quantity, unit_price as price, product_image as image FROM order_items WHERE order_id = ?',
          [data.id]
        )

        let result: { success: boolean; error?: string }
        let flagColumn = ''

        switch (emailType) {
          case 'confirmed':
            const isCOD = currentOrder.payment_method === 'COD'
            result = await sendOrderEmail(
              isCOD ? 'order_cod_confirmed' : 'order_confirmed', 
              {
                orderNumber: currentOrder.order_number,
                customerEmail: currentOrder.customer_email,
                customerName: `${currentOrder.customer_first_name} ${currentOrder.customer_last_name}`,
                total: Number(currentOrder.total),
                items,
                paymentMethod: currentOrder.payment_method || 'WOMPI',
                shippingAddress: currentOrder.shipping_address_line1 || '',
                shippingCity: currentOrder.shipping_city || '',
                shippingDepartment: currentOrder.shipping_department || '',
              }
            )
            flagColumn = 'email_confirmed_sent'
            break

          case 'preparing':
            result = await sendOrderEmail('order_preparing', {
              orderNumber: currentOrder.order_number,
              customerEmail: currentOrder.customer_email,
              customerName: `${currentOrder.customer_first_name} ${currentOrder.customer_last_name}`,
              total: Number(currentOrder.total)
            })
            flagColumn = 'email_preparing_sent'
            break

          case 'shipped':
            result = await sendOrderEmail('order_shipped', {
              orderNumber: currentOrder.order_number,
              customerEmail: currentOrder.customer_email,
              customerName: `${currentOrder.customer_first_name} ${currentOrder.customer_last_name}`,
              total: Number(currentOrder.total),
              trackingNumber: currentOrder.tracking_number,
              trackingUrl: currentOrder.tracking_url,
            })
            flagColumn = 'email_shipped_sent'
            break

          case 'delivered':
            result = await sendOrderEmail('order_delivered', {
              orderNumber: currentOrder.order_number,
              customerEmail: currentOrder.customer_email,
              customerName: `${currentOrder.customer_first_name} ${currentOrder.customer_last_name}`,
              total: Number(currentOrder.total)
            })
            flagColumn = 'email_delivered_sent'
            break

          default:
            return NextResponse.json({ 
              error: `Tipo de email no reconocido: ${emailType}. Usa: confirmed, preparing, shipped, delivered` 
            }, { status: 400 })
        }

        if (result.success && flagColumn) {
          // Actualizar flag y confirmation_email_sent para compatibilidad
          if (emailType === 'confirmed') {
            await query(
              `UPDATE orders SET confirmation_email_sent = TRUE, ${flagColumn} = TRUE WHERE id = ?`,
              [data.id]
            )
          } else {
            await query(`UPDATE orders SET ${flagColumn} = TRUE WHERE id = ?`, [data.id])
          }
        }

        if (result.success) {
          return NextResponse.json({ 
            success: true, 
            message: `Email de ${emailType === 'confirmed' ? 'confirmacion' : emailType === 'preparing' ? 'preparacion' : emailType === 'shipped' ? 'envio' : 'entrega'} reenviado exitosamente` 
          })
        } else {
          return NextResponse.json({ 
            error: `Error enviando email: ${result.error}` 
          }, { status: 500 })
        }
      } catch (e: any) {
        console.error('[Admin Orders] Error resending email:', e)
        return NextResponse.json({ 
          error: `Error enviando email: ${e?.message || 'desconocido'}` 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Accion no reconocida. Usa: verifyWompi, confirmCOD, updateStatus, updateTracking, updateNotes, resendEmail' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Error al actualizar pedido: ' + (error?.message || 'desconocido') }, { status: 500 })
  }
}

// ============================================================
// HELPERS
// ============================================================

async function sendPaymentConfirmedNotifications(order: any) {
  try {
    // IDEMPOTENCIA: Verificar si ya se envio email previamente (por webhook o admin anterior)
    const [currentOrder] = await query<any[]>(
      'SELECT confirmation_email_sent FROM orders WHERE id = ?',
      [order.id]
    )
    
    if (currentOrder?.confirmation_email_sent) {
      console.log(`[Admin Orders] Email ya enviado previamente para orden ${order.order_number}, omitiendo`)
      return
    }

    // Obtener items CON IMAGENES para email premium
    const items = await query<any[]>(
      'SELECT product_name as name, quantity, unit_price as price, product_image as image FROM order_items WHERE order_id = ?',
      [order.id]
    )

    // Email al cliente
    await sendOrderConfirmationEmail({
      orderNumber: order.order_number,
      customerEmail: order.customer_email,
      customerName: `${order.customer_first_name} ${order.customer_last_name}`,
      total: Number(order.total),
      items,
      paymentMethod: order.payment_method || 'WOMPI',
    })

    // Email al admin para despachar
    await sendAdminDispatchEmail({
      orderNumber: order.order_number,
      customerName: `${order.customer_first_name} ${order.customer_last_name}`,
      customerPhone: order.customer_phone || 'N/A',
      customerEmail: order.customer_email,
      shippingAddress: order.shipping_address_line1 || '',
      shippingCity: order.shipping_city || '',
      shippingDepartment: order.shipping_department || '',
      total: Number(order.total),
      paymentMethod: order.payment_method || 'Wompi',
      productNames: items.map((i: any) => `${i.name} x${i.quantity}`).join(', '),
    })
    
    // Marcar email como enviado SOLO si ambos emails se enviaron exitosamente
    await query(
      'UPDATE orders SET confirmation_email_sent = TRUE WHERE id = ?',
      [order.id]
    )
    console.log(`[Admin Orders] Emails enviados y flag actualizado para orden ${order.order_number}`)
  } catch (e) {
    console.error('[Admin Orders] Error sending payment notifications:', e)
    // No marcar como enviado si fallo
  }
}

async function registerOrderInAccounting(orderId: number, order: any) {
  try {
    // Verificar si ya existe
    const existing = await query<any[]>(
      'SELECT id FROM accounting_transactions WHERE order_id = ?',
      [orderId]
    )
    if (existing.length > 0) return

    const pmMethod = (order.payment_method || 'cod').toLowerCase()
    const accountingPm = ['wompi', 'cod', 'transfer', 'cash', 'nequi', 'daviplata'].includes(pmMethod) ? pmMethod : 'other'

    await query(
      `INSERT INTO accounting_transactions (
        type, payment_method, payment_status, order_id, order_number,
        customer_name, customer_phone, customer_email,
        subtotal, shipping_cost, total, amount_paid,
        description, created_by, transaction_date
      ) VALUES ('online_sale', ?, 'approved', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system', NOW())`,
      [
        accountingPm,
        orderId,
        order.order_number,
        `${order.customer_first_name} ${order.customer_last_name}`,
        order.customer_phone,
        order.customer_email,
        Number(order.subtotal),
        Number(order.shipping_cost),
        Number(order.total),
        Number(order.total), // COD paid on delivery
        `Venta online - Pedido ${order.order_number}`
      ]
    )
  } catch (e) {
    console.error('Error registering in accounting:', e)
  }
}
