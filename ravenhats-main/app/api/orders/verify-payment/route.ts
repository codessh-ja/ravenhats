import { NextRequest, NextResponse } from 'next/server'
import { updateOrderPayment, query } from '@/lib/db'
import { getWompiTransactionByReference, extractOrderNumberFromReference } from '@/lib/wompi'

/**
 * VERIFICACION DE PAGO - SOLO LECTURA
 * 
 * =================================================================
 * REGLAS CRITICAS - NO MODIFICAR SIN AUTORIZACION
 * =================================================================
 * 
 * Este endpoint es SOLO para verificacion de estado desde el frontend.
 * 
 * PERMITIDO:
 * - Consultar estado del pago en Wompi
 * - Actualizar payment_status en la BD (para sincronizar estado)
 * - Devolver estado al frontend para mostrar al usuario
 * 
 * PROHIBIDO (NUNCA HACER):
 * - Enviar emails de confirmacion
 * - Enviar notificaciones al admin
 * - Modificar confirmation_email_sent flag
 * - Cualquier logica que deba ser exclusiva del webhook
 * 
 * RAZON:
 * El webhook es la UNICA FUENTE DE VERDAD para confirmar pagos.
 * Este endpoint existe solo para que el frontend pueda mostrar
 * el estado al usuario sin esperar el webhook.
 * =================================================================
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  try {
    const { orderNumber } = await request.json()

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'Numero de orden requerido' },
        { status: 400 }
      )
    }

    console.log(`[Verify Payment] ${timestamp} - Verificando orden: ${orderNumber}`)

    // Buscar la orden en nuestra BD (incluir payment_reference para buscar en Wompi)
    const orders = await query<any[]>(
      `SELECT o.id, o.order_number, o.payment_status, o.status, o.payment_method, o.total,
              o.customer_email, o.customer_first_name, o.customer_last_name,
              o.stock_deducted, o.confirmation_email_sent, o.payment_reference
       FROM orders o 
       WHERE o.order_number = ?`,
      [orderNumber]
    )

    if (orders.length === 0) {
      console.log(`[Verify Payment] ${timestamp} - Orden no encontrada: ${orderNumber}`)
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    const order = orders[0]

    // SAFEGUARD: No procesar ordenes COD via este endpoint
    // COD tiene su propio flujo y nunca debe consultar Wompi
    if (order.payment_method === 'COD') {
      console.log(`[Verify Payment] ${timestamp} - Orden COD detectada: ${orderNumber}`)
      return NextResponse.json({
        status: 'pending', // COD siempre pending hasta entrega
        orderNumber: order.order_number,
        message: 'Pago contra entrega - se cobra al momento de la entrega',
        paymentMethod: 'COD',
        isCOD: true
      })
    }

    // Si ya esta aprobado en nuestra BD, devolver el estado actual
    // No consultar Wompi para evitar llamadas innecesarias
    if (order.payment_status === 'approved') {
      console.log(`[Verify Payment] ${timestamp} - Orden ${orderNumber} ya aprobada en BD`)
      return NextResponse.json({
        status: 'approved',
        orderNumber: order.order_number,
        message: 'Pago ya confirmado',
        alreadyProcessed: true,
        emailSent: order.confirmation_email_sent
      })
    }

    // Si esta rechazado, tambien devolver sin consultar Wompi
    if (order.payment_status === 'rejected') {
      console.log(`[Verify Payment] ${timestamp} - Orden ${orderNumber} rechazada en BD`)
      return NextResponse.json({
        status: 'rejected',
        orderNumber: order.order_number,
        message: 'Pago rechazado',
        alreadyProcessed: true
      })
    }

    // Para pagos pendientes, consultar estado actual en Wompi
    // Primero intentar con la referencia de pago guardada en la BD (si existe)
    // Luego intentar con el numero de orden directamente
    let wompiTransaction = null
    const paymentReference = order.payment_reference || orderNumber
    
    try {
      wompiTransaction = await getWompiTransactionByReference(paymentReference)
      
      // Si no encontramos con la referencia guardada, intentar con el order_number
      if (!wompiTransaction && paymentReference !== orderNumber) {
        wompiTransaction = await getWompiTransactionByReference(orderNumber)
      }
    } catch (wompiError) {
      console.error(`[Verify Payment] ${timestamp} - Error consultando Wompi:`, wompiError)
      // Si falla la consulta a Wompi, devolver estado actual de la BD
      return NextResponse.json({
        status: order.payment_status,
        orderNumber: order.order_number,
        message: 'Error al consultar Wompi. Intenta de nuevo.',
        paymentPending: true
      })
    }

    if (!wompiTransaction) {
      console.log(`[Verify Payment] ${timestamp} - Transaccion no encontrada en Wompi para ${orderNumber} (ref: ${paymentReference})`)
      return NextResponse.json({
        status: order.payment_status,
        orderNumber: order.order_number,
        message: 'Transaccion no encontrada en Wompi. El pago puede estar pendiente.',
        paymentPending: true
      })
    }

    const wompiStatus = wompiTransaction.status?.toUpperCase()
    let newPaymentStatus = order.payment_status

    // Mapear estado de Wompi a nuestro estado interno
    if (wompiStatus === 'APPROVED') {
      newPaymentStatus = 'approved'
    } else if (wompiStatus === 'DECLINED' || wompiStatus === 'ERROR' || wompiStatus === 'VOIDED') {
      newPaymentStatus = 'rejected'
    } else if (wompiStatus === 'PENDING') {
      newPaymentStatus = 'pending'
    }

    console.log(`[Verify Payment] ${timestamp} - Estado Wompi: ${wompiStatus}, Estado BD: ${order.payment_status}, Nuevo: ${newPaymentStatus}`)

    // Si el estado cambio, actualizar en nuestra BD
    // NOTA: updateOrderPayment maneja stock y contabilidad, pero NO envia emails
    if (newPaymentStatus !== order.payment_status && wompiTransaction.id) {
      console.log(`[Verify Payment] ${timestamp} - Actualizando estado en BD para ${orderNumber}`)
      
      // Extraer monto REAL de Wompi
      const amountInCents = wompiTransaction.amount_in_cents
      const paidAmount = amountInCents ? Math.round(amountInCents / 100) : null
      
      await updateOrderPayment(order.id, {
        wompiTransactionId: wompiTransaction.id,
        wompiReference: orderNumber,
        status: wompiStatus,
        paidAmount: paidAmount, // Monto REAL de Wompi
        paymentMethod: wompiTransaction.payment_method_type,
        paymentMethodType: wompiTransaction.payment_method?.type,
        cardLastFour: wompiTransaction.payment_method?.extra?.last_four,
        cardBrand: wompiTransaction.payment_method?.extra?.brand,
        pseBank: wompiTransaction.payment_method?.extra?.name,
        rawResponse: wompiTransaction,
      })

      // =================================================================
      // RECORDATORIO: NO enviar emails desde aqui - NUNCA
      // El webhook es la UNICA fuente de verdad para emails
      // =================================================================
      console.log(`[Verify Payment] ${timestamp} - Estado sincronizado. Emails se manejan SOLO via webhook.`)
    }

    return NextResponse.json({
      status: newPaymentStatus,
      orderNumber: order.order_number,
      wompiStatus: wompiStatus,
      transactionId: wompiTransaction.id,
      message: newPaymentStatus === 'approved' 
        ? 'Pago confirmado' 
        : newPaymentStatus === 'rejected'
          ? 'Pago rechazado'
          : 'Pago pendiente',
      updated: newPaymentStatus !== order.payment_status
    })

  } catch (error) {
    console.error(`[Verify Payment] ${timestamp} - Error:`, error)
    return NextResponse.json(
      { error: 'Error al verificar el pago' },
      { status: 500 }
    )
  }
}
