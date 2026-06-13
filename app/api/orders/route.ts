import { NextRequest, NextResponse } from 'next/server'
import { createOrder, query } from '@/lib/db'
import { sendOrderEmail, sendAdminNewOrderEmail } from '@/lib/email'
import { trackProductEvent } from '@/lib/product-learning'
import { z } from 'zod'

// Esquema de validacion
const orderSchema = z.object({
  customer: z.object({
    email: z.string().email('Email invalido'),
    firstName: z.string().min(2, 'Nombre requerido'),
    lastName: z.string().min(2, 'Apellido requerido'),
    phone: z.string().min(10, 'Telefono invalido').optional(),
    documentType: z.enum(['CC', 'CE', 'NIT', 'PASSPORT']).optional(),
    documentNumber: z.string().optional(),
  }),
  shipping: z.object({
    addressLine1: z.string().min(5, 'Direccion requerida'),
    addressLine2: z.string().optional(),
    city: z.string().min(2, 'Ciudad requerida'),
    department: z.string().min(2, 'Departamento requerido'),
    postalCode: z.string().optional(),
  }),
  items: z.array(z.object({
    productId: z.number(),
    productName: z.string(),
    productSku: z.string().optional(),
    productImage: z.string().optional(),
    unitPrice: z.number(),
    quantity: z.number().min(1),
  })).min(1, 'Carrito vacio'),
  subtotal: z.number(),
  shippingCost: z.number(),
  total: z.number(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  customerId: z.number().nullable().optional(), // ID del cliente si esta logueado
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar datos
    const validatedData = orderSchema.parse(body)

    // CRITICO: Prevenir ordenes duplicadas
    // Verificar si existe orden pendiente con mismo email que:
    // 1. Tenga status = pending (no cancelada)
    // 2. Tenga payment_status = pending
    // 3. Tenga items (via join con order_items)
    // SIN filtro de tiempo - una orden pendiente es pendiente hasta que se pague o cancele
    const existingPendingOrders = await query<any[]>(
      `SELECT o.id, o.order_number, COUNT(oi.id) as item_count
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.customer_email = ? 
       AND o.payment_status = 'pending' 
       AND o.status = 'pending'
       GROUP BY o.id, o.order_number
       HAVING item_count > 0
       ORDER BY o.created_at DESC
       LIMIT 1`,
      [validatedData.customer.email]
    )

    if (existingPendingOrders.length > 0) {
      // Reusar orden existente en lugar de crear duplicada
      // Se generara nueva payment_reference al ir a Wompi
      console.log(`[Orders API] Reusando orden pendiente existente: ${existingPendingOrders[0].order_number} (${existingPendingOrders[0].item_count} items)`)
      return NextResponse.json({
        success: true,
        orderId: existingPendingOrders[0].id,
        orderNumber: existingPendingOrders[0].order_number,
        message: 'Orden pendiente encontrada - reutilizando',
        reused: true
      })
    }

    // Verificar stock de productos
    for (const item of validatedData.items) {
      const [product] = await query<any[]>(
        'SELECT stock FROM products WHERE id = ? AND is_active = TRUE',
        [item.productId]
      )
      
      if (!product) {
        return NextResponse.json(
          { error: `Producto ${item.productName} no encontrado` },
          { status: 400 }
        )
      }
      
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente para ${item.productName}. Disponible: ${product.stock}` },
          { status: 400 }
        )
      }
    }

    // Crear orden con metodo de pago
    const { orderId, orderNumber } = await createOrder({
      ...validatedData,
      paymentMethod: validatedData.paymentMethod || 'PENDING',
      customerId: validatedData.customerId ?? undefined,
    })
    
    // PASO 18: Track purchase events for learning system (+10 points per product)
    for (const item of validatedData.items) {
      trackProductEvent(String(item.productId), 'purchase')
    }

    // Si es pago contra entrega, enviar email de confirmacion con imagenes
    // Usar sistema centralizado sendOrderEmail para consistencia
    if (validatedData.paymentMethod === 'COD') {
      try {
        const emailResult = await sendOrderEmail('order_cod_confirmed', {
          orderNumber,
          customerEmail: validatedData.customer.email,
          customerName: `${validatedData.customer.firstName} ${validatedData.customer.lastName}`,
          total: validatedData.total,
          items: validatedData.items.map(item => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.unitPrice,
            image: item.productImage || null,
          })),
          shippingAddress: validatedData.shipping.addressLine1,
          shippingCity: validatedData.shipping.city,
          shippingDepartment: validatedData.shipping.department,
        })
        
        // Marcar email como enviado si fue exitoso
        if (emailResult.success) {
          await query(
            'UPDATE orders SET confirmation_email_sent = TRUE, email_confirmed_sent = TRUE WHERE order_number = ?',
            [orderNumber]
          )
          console.log(`[Orders API] COD email enviado y flags actualizados para ${orderNumber}`)
        }
      } catch (emailError) {
        console.error('[Orders API] Error sending COD confirmation email:', emailError)
      }
    }

    // Notificar al admin sobre nuevo pedido (COD y online)
    try {
      await sendAdminNewOrderEmail({
        orderNumber,
        customerName: `${validatedData.customer.firstName} ${validatedData.customer.lastName}`,
        customerPhone: validatedData.customer.phone || '',
        customerEmail: validatedData.customer.email,
        total: validatedData.total,
        paymentMethod: validatedData.paymentMethod || 'PENDING',
        productNames: validatedData.items.map(i => `${i.productName} x${i.quantity}`).join(', '),
        shippingCity: validatedData.shipping.city,
        shippingDepartment: validatedData.shipping.department,
      })
    } catch (emailError) {
      console.error('Error sending admin notification email:', emailError)
    }

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber,
      message: 'Orden creada exitosamente',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Error al crear la orden' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orderNumber = searchParams.get('orderNumber')

    if (orderNumber) {
      // Obtener orden especifica con monto pagado de Wompi
      const [order] = await query<any[]>(
        `SELECT o.*, 
                (SELECT p.amount FROM payments p WHERE p.order_id = o.id AND p.wompi_status = 'APPROVED' ORDER BY p.created_at DESC LIMIT 1) as paid_amount,
                JSON_ARRAYAGG(JSON_OBJECT(
                  'id', oi.id,
                  'productName', oi.product_name,
                  'productImage', oi.product_image,
                  'unitPrice', oi.unit_price,
                  'quantity', oi.quantity,
                  'subtotal', oi.subtotal
                )) as items
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         WHERE o.order_number = ?
         GROUP BY o.id`,
        [orderNumber]
      )

      if (!order) {
        return NextResponse.json(
          { error: 'Orden no encontrada' },
          { status: 404 }
        )
      }

      // Usar paid_amount de Wompi si existe, sino usar total de la orden
      // CRITICO: Nunca mostrar $0 - paid_amount es el monto REAL de Wompi
      const paidAmount = order.paid_amount ? Number(order.paid_amount) : null
      const orderTotal = Number(order.total) || 0
      const displayTotal = paidAmount && paidAmount > 0 ? paidAmount : orderTotal
      
      // Log si hay discrepancia entre paid_amount y total
      if (paidAmount && paidAmount > 0 && Math.abs(paidAmount - orderTotal) > 1) {
        console.warn(`[Orders API] Discrepancia de montos para ${order.order_number}:`, {
          paidAmount,
          orderTotal,
          difference: paidAmount - orderTotal
        })
      }

      return NextResponse.json({
        id: order.id,
        orderNumber: order.order_number,
        customer: {
          email: order.customer_email,
          firstName: order.customer_first_name,
          lastName: order.customer_last_name,
          phone: order.customer_phone,
        },
        shipping: {
          addressLine1: order.shipping_address_line1,
          addressLine2: order.shipping_address_line2,
          city: order.shipping_city,
          department: order.shipping_department,
          postalCode: order.shipping_postal_code,
        },
        items: JSON.parse(order.items || '[]'),
        subtotal: Number(order.subtotal),
        shippingCost: Number(order.shipping_cost),
        total: displayTotal, // Usar paid_amount si disponible
        paidAmount: paidAmount, // Monto REAL de Wompi
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        createdAt: order.created_at,
      })
    }

    // Listar ordenes (para admin)
    const orders = await query<any[]>(
      `SELECT id, order_number, customer_email, customer_first_name, customer_last_name,
              customer_phone, total, status, payment_status, payment_method, created_at
       FROM orders
       ORDER BY created_at DESC
       LIMIT 50`
    )

    return NextResponse.json(orders.map(o => ({
      id: o.id,
      orderNumber: o.order_number,
      customerEmail: o.customer_email,
      customerName: `${o.customer_first_name} ${o.customer_last_name}`,
      customerPhone: o.customer_phone,
      total: Number(o.total),
      status: o.status,
      paymentStatus: o.payment_status,
      paymentMethod: o.payment_method,
      createdAt: o.created_at,
    })))
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Error al obtener ordenes' },
      { status: 500 }
    )
  }
}
