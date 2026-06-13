import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { updateOrderPayment, query } from '@/lib/db'
import { sendOrderEmail, sendAdminDispatchEmail } from '@/lib/email'
import { extractOrderNumberFromReference } from '@/lib/wompi'

/**
 * WOMPI WEBHOOK - FUENTE UNICA DE VERDAD PARA PAGOS
 * 
 * Este endpoint es el UNICO autorizado para:
 * 1. Confirmar pagos (payment_status = 'approved')
 * 2. Enviar emails de confirmacion
 * 3. Descontar stock (via updateOrderPayment)
 * 4. Registrar en contabilidad
 * 
 * El frontend NUNCA debe confirmar pagos - solo puede verificar estado.
 */

// Obtener secret de eventos de Wompi desde la BD o env
async function getEventsSecret(): Promise<string> {
  try {
    const results = await query<any[]>(
      "SELECT config_value FROM store_config WHERE config_key = 'wompi'"
    )
    
    if (results.length > 0 && results[0].config_value) {
      const config = typeof results[0].config_value === 'string'
        ? JSON.parse(results[0].config_value)
        : results[0].config_value
      if (config.eventsSecret) {
        return config.eventsSecret
      }
    }
  } catch (e) {
    console.error('[Wompi Webhook] Error obteniendo config:', e)
  }
  
  return process.env.WOMPI_EVENTS_SECRET || ''
}

// Verificar firma del webhook de Wompi
async function verifyWompiSignature(
  payload: any,
  receivedChecksum: string
): Promise<boolean> {
  const eventsSecret = await getEventsSecret()
  
  if (!eventsSecret) {
    console.warn('[Wompi Webhook] No hay events secret configurado')
    return false
  }
  
  // Extraer propiedades para el checksum segun documentacion de Wompi
  const properties = payload.signature?.properties || []
  let concatenatedValues = ''
  
  for (const prop of properties) {
    const value = prop.split('.').reduce((obj: any, key: string) => obj?.[key], payload)
    concatenatedValues += value
  }
  
  concatenatedValues += payload.timestamp + eventsSecret
  
  const calculatedChecksum = crypto
    .createHash('sha256')
    .update(concatenatedValues)
    .digest('hex')
  
  return calculatedChecksum === receivedChecksum
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    // Log del evento recibido con timestamp para trazabilidad
    const timestamp = new Date().toISOString()
    console.log(`[Wompi Webhook] ${timestamp} - Evento recibido:`, {
      event: payload.event,
      reference: payload.data?.transaction?.reference,
      transactionId: payload.data?.transaction?.id,
      status: payload.data?.transaction?.status
    })

    // Verificar firma - OBLIGATORIO en produccion
    const receivedChecksum = payload.signature?.checksum
    const isValidSignature = await verifyWompiSignature(payload, receivedChecksum)
    
    if (!receivedChecksum || !isValidSignature) {
      console.error(`[Wompi Webhook] ${timestamp} - FIRMA INVALIDA - Checksum recibido: ${receivedChecksum}`)
      // En produccion, SIEMPRE rechazar firmas invalidas
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Firma invalida' }, { status: 401 })
      }
      // En sandbox, solo advertir pero continuar (Wompi sandbox puede enviar sin firma)
      console.warn(`[Wompi Webhook] ${timestamp} - ADVERTENCIA: Continuando sin verificacion de firma (modo sandbox)`)
    }

    // Procesar evento
    const event = payload.event
    const transaction = payload.data?.transaction

    if (!transaction) {
      console.error(`[Wompi Webhook] ${timestamp} - Datos de transaccion faltantes en payload`)
      return NextResponse.json({ error: 'Datos de transaccion faltantes' }, { status: 400 })
    }

    // Solo procesar eventos de transaccion actualizada
    if (event !== 'transaction.updated') {
      console.log(`[Wompi Webhook] ${timestamp} - Evento ignorado: ${event}`)
      return NextResponse.json({ received: true, message: 'Evento ignorado' })
    }

    const paymentReference = transaction.reference
    const status = transaction.status?.toUpperCase()
    const transactionId = transaction.id
    // CRITICO: Extraer el monto pagado desde Wompi (en centavos -> pesos)
    const amountInCents = transaction.amount_in_cents
    const paidAmount = amountInCents ? Math.round(amountInCents / 100) : null
    
    console.log(`[Wompi Webhook] ${timestamp} - Monto recibido de Wompi:`, {
      amountInCents,
      paidAmount,
      currency: transaction.currency
    })

    // CRITICO: Extraer el numero de orden real de la referencia unica de pago
    // La referencia ahora tiene formato: RH-XXXXXX-{timestamp}-{random}
    // El order_number real es: RH-XXXXXX
    const orderNumber = extractOrderNumberFromReference(paymentReference)

    console.log(`[Wompi Webhook] ${timestamp} - Procesando transaccion:`, {
      paymentReference,
      orderNumber,
      status,
      transactionId,
      paymentMethod: transaction.payment_method_type
    })

    // Validar que tenemos los datos necesarios
    if (!paymentReference || !transactionId) {
      console.error(`[Wompi Webhook] ${timestamp} - Datos incompletos: reference=${paymentReference}, transactionId=${transactionId}`)
      return NextResponse.json({ error: 'Referencia o ID de transaccion faltante' }, { status: 400 })
    }

    // Buscar orden por el numero de orden extraido (no la referencia completa)
    const orders = await query<any[]>(
      'SELECT id, order_number, payment_status, status, stock_deducted, confirmation_email_sent, payment_method FROM orders WHERE order_number = ?',
      [orderNumber]
    )

    if (!orders || orders.length === 0) {
      console.error(`[Wompi Webhook] ${timestamp} - Orden no encontrada: ${orderNumber} (referencia: ${paymentReference})`)
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    const order = orders[0]

    // SAFEGUARD: Rechazar webhooks para ordenes COD
    // COD nunca debe procesarse via Wompi - tiene su propio flujo
    if (order.payment_method === 'COD') {
      console.warn(`[Wompi Webhook] ${timestamp} - RECHAZADO: Intento de procesar orden COD via Wompi:`, {
        orderNumber,
        paymentReference,
        transactionId,
        paymentMethod: order.payment_method
      })
      return NextResponse.json({ 
        received: true, 
        rejected: true,
        message: 'Orden COD no puede procesarse via Wompi webhook' 
      })
    }

    // =================================================================
    // IDEMPOTENCIA CRITICA - Prevenir procesamiento duplicado
    // =================================================================
    
    // 1. Verificar si esta transaccion ya fue procesada con el mismo estado
    const existingPayments = await query<any[]>(
      'SELECT id, wompi_status, created_at FROM payments WHERE order_id = ? AND wompi_transaction_id = ?',
      [order.id, transactionId]
    )

    if (existingPayments.length > 0 && existingPayments[0].wompi_status === status) {
      console.log(`[Wompi Webhook] ${timestamp} - IDEMPOTENCIA: Transaccion duplicada ignorada:`, {
        orderNumber,
        paymentReference,
        transactionId,
        status,
        originalProcessedAt: existingPayments[0].created_at
      })
      return NextResponse.json({ 
        received: true, 
        duplicate: true,
        message: 'Transaccion ya procesada - ignorando duplicado' 
      })
    }

    // 2. Verificar si el pago ya fue aprobado previamente (doble verificacion)
    if (order.payment_status === 'approved' && status === 'APPROVED') {
      console.log(`[Wompi Webhook] ${timestamp} - IDEMPOTENCIA: Orden ya aprobada, ignorando:`, {
        orderNumber,
        currentStatus: order.payment_status,
        emailSent: order.confirmation_email_sent
      })
      return NextResponse.json({ 
        received: true, 
        alreadyApproved: true,
        message: 'Pago ya confirmado previamente' 
      })
    }

    // Actualizar pago en la base de datos (esto tambien maneja el stock)
    // Guardar la referencia unica de pago para rastreo
    const result = await updateOrderPayment(order.id, {
      wompiTransactionId: transactionId,
      wompiReference: paymentReference, // Referencia unica del pago
      status: status,
      paidAmount: paidAmount, // Monto REAL pagado desde Wompi
      paymentMethod: transaction.payment_method_type,
      paymentMethodType: transaction.payment_method?.type,
      cardLastFour: transaction.payment_method?.extra?.last_four,
      cardBrand: transaction.payment_method?.extra?.brand,
      pseBank: transaction.payment_method?.extra?.name,
      rawResponse: transaction,
    })

    console.log(`[Wompi Webhook] ${timestamp} - Pago actualizado:`, {
      orderNumber,
      paymentReference,
      previousStatus: order.payment_status,
      newStatus: status,
      result
    })

    // =================================================================
    // PROCESAR SEGUN ESTADO DEL PAGO
    // =================================================================
    
    if (status === 'APPROVED') {
      console.log(`[Wompi Webhook] ${timestamp} - PAGO APROBADO - Iniciando proceso de confirmacion:`, {
        orderNumber,
        paymentReference,
        transactionId
      })
      
      // IDEMPOTENCIA para emails: Re-verificar flag ANTES de enviar
      // (podria haber cambiado por otro proceso concurrente)
      const [currentOrder] = await query<any[]>(
        'SELECT confirmation_email_sent, customer_email FROM orders WHERE id = ?',
        [order.id]
      )
      
      if (currentOrder && !currentOrder.confirmation_email_sent) {
        let customerEmailSent = false
        let adminEmailSent = false
        
        try {
          // Obtener detalles completos de la orden para el email
          // INCLUIR IMAGENES DE PRODUCTOS para emails premium
          const orderDetails = await query<any[]>(`
            SELECT o.*, 
                   JSON_ARRAYAGG(JSON_OBJECT(
                     'name', oi.product_name,
                     'quantity', oi.quantity,
                     'price', oi.unit_price,
                     'image', oi.product_image
                   )) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = ?
            GROUP BY o.id
          `, [order.id])

          if (orderDetails.length > 0) {
            const orderData = orderDetails[0]
            const items = typeof orderData.items === 'string' 
              ? JSON.parse(orderData.items) 
              : orderData.items

            // Filtrar items validos
            const validItems = (items || []).filter((item: any) => item && item.name)

            // 1. Email al cliente confirmando su compra (via sistema centralizado)
            // CRITICO: Usar paidAmount (monto real de Wompi), no el total de la orden
            const emailTotal = paidAmount && paidAmount > 0 ? paidAmount : Number(orderData.total)
            
            // VALIDACION: Advertir si monto es 0 (error critico de datos)
            if (emailTotal <= 0) {
              console.error(`[Wompi Webhook] ${timestamp} - ADVERTENCIA CRITICA: Monto $0 para orden aprobada:`, {
                orderNumber,
                paidAmount,
                orderTotal: orderData.total
              })
            }
            
            try {
              const emailResult = await sendOrderEmail('order_confirmed', {
                orderNumber: orderNumber,
                customerEmail: orderData.customer_email,
                customerName: `${orderData.customer_first_name} ${orderData.customer_last_name}`,
                total: emailTotal,
                items: validItems.map((item: any) => ({
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
                  image: item.image || null
                })),
                paymentMethod: 'WOMPI'
              })
              
              customerEmailSent = emailResult.success
              if (emailResult.success) {
                console.log(`[Wompi Webhook] ${timestamp} - EMAIL CLIENTE: Enviado exitosamente a ${orderData.customer_email}`)
              } else {
                console.error(`[Wompi Webhook] ${timestamp} - EMAIL CLIENTE FALLIDO: ${emailResult.error}`)
              }
            } catch (customerEmailError) {
              console.error(`[Wompi Webhook] ${timestamp} - EMAIL CLIENTE FALLIDO (${paymentReference}):`, customerEmailError)
            }

            // 2. Email al admin para que despache
            try {
              await sendAdminDispatchEmail({
                orderNumber: orderNumber,
                customerName: `${orderData.customer_first_name} ${orderData.customer_last_name}`,
                customerPhone: orderData.customer_phone || '',
                customerEmail: orderData.customer_email,
                shippingAddress: orderData.shipping_address_line1 || '',
                shippingCity: orderData.shipping_city || '',
                shippingDepartment: orderData.shipping_department || '',
                total: emailTotal, // Usar monto real de Wompi
                paymentMethod: 'Wompi (Online)',
                productNames: validItems.map((i: any) => `${i.name} x${i.quantity}`).join(', '),
              })
              adminEmailSent = true
              console.log(`[Wompi Webhook] ${timestamp} - EMAIL ADMIN: Enviado exitosamente`)
            } catch (adminEmailError) {
              console.error(`[Wompi Webhook] ${timestamp} - EMAIL ADMIN FALLIDO (${paymentReference}):`, adminEmailError)
            }
          }
        } catch (emailError) {
          console.error(`[Wompi Webhook] ${timestamp} - ERROR GENERAL enviando emails (${paymentReference}):`, emailError)
        }
        
        // Marcar como enviado SOLO si el email al cliente se envio
        // (el admin puede ser notificado manualmente, pero el cliente es critico)
        // Actualizamos AMBOS flags para compatibilidad (viejo y nuevo sistema)
        if (customerEmailSent) {
          await query(
            'UPDATE orders SET confirmation_email_sent = TRUE, email_confirmed_sent = TRUE WHERE id = ?',
            [order.id]
          )
          console.log(`[Wompi Webhook] ${timestamp} - FLAGS ACTUALIZADOS: confirmation_email_sent = TRUE, email_confirmed_sent = TRUE`)
        }
        
        // Log resumen de emails
        console.log(`[Wompi Webhook] ${timestamp} - RESUMEN EMAILS para ${orderNumber}:`, {
          customerEmail: customerEmailSent ? 'ENVIADO' : 'FALLIDO',
          adminEmail: adminEmailSent ? 'ENVIADO' : 'FALLIDO',
          flagUpdated: customerEmailSent
        })
        
        // Si algun email fallo, loguear para accion manual
        if (!customerEmailSent || !adminEmailSent) {
          console.warn(`[Wompi Webhook] ${timestamp} - ACCION REQUERIDA: Revisar emails para orden ${orderNumber}`)
        }
      } else {
        console.log(`[Wompi Webhook] ${timestamp} - EMAILS OMITIDOS: Ya enviados previamente para ${orderNumber}`)
      }
      
    } else if (status === 'DECLINED' || status === 'ERROR' || status === 'VOIDED') {
      // Pago rechazado/fallido
      console.log(`[Wompi Webhook] ${timestamp} - PAGO RECHAZADO (${status}) para ${orderNumber}:`, {
        statusMessage: transaction.status_message,
        paymentMethod: transaction.payment_method_type,
        errorCode: transaction.error_code
      })
      
    } else if (status === 'PENDING') {
      console.log(`[Wompi Webhook] ${timestamp} - PAGO PENDIENTE para ${orderNumber}`)
      
    } else {
      console.warn(`[Wompi Webhook] ${timestamp} - ESTADO DESCONOCIDO: ${status} para ${orderNumber}`)
    }

    return NextResponse.json({ received: true, processed: true })
  } catch (error) {
    const timestamp = new Date().toISOString()
    console.error(`[Wompi Webhook] ${timestamp} - Error procesando webhook:`, error)
    return NextResponse.json(
      { error: 'Error procesando webhook' },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificacion de Wompi
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Wompi webhook endpoint active' })
}
