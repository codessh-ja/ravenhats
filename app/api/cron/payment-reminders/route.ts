import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { sendPaymentReminderEmail } from '@/lib/email'

// Este endpoint puede ser llamado por un cron job de Vercel
// Configura en vercel.json: { "crons": [{ "path": "/api/cron/payment-reminders", "schedule": "0 10 * * *" }] }

export async function GET(request: NextRequest) {
  try {
    // Verificar clave secreta para cron jobs
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Buscar pedidos pendientes de pago que tengan mas de 12 horas pero menos de 48
    const pendingOrders = await query<any[]>(`
      SELECT 
        o.id,
        o.order_number,
        o.customer_email,
        o.customer_first_name,
        o.customer_last_name,
        o.total,
        o.created_at,
        o.payment_reminder_sent
      FROM orders o
      WHERE o.payment_status = 'pending'
        AND o.status != 'cancelled'
        AND o.payment_method = 'WOMPI'
        AND o.created_at < DATE_SUB(NOW(), INTERVAL 12 HOUR)
        AND o.created_at > DATE_SUB(NOW(), INTERVAL 48 HOUR)
        AND (o.payment_reminder_sent IS NULL OR o.payment_reminder_sent = FALSE)
      ORDER BY o.created_at ASC
      LIMIT 50
    `)

    const results = []

    for (const order of pendingOrders) {
      try {
        // Enviar email de recordatorio
        const emailResult = await sendPaymentReminderEmail({
          orderNumber: order.order_number,
          customerEmail: order.customer_email,
          customerName: order.customer_first_name,
          total: parseFloat(order.total),
          createdAt: new Date(order.created_at),
        })

        if (emailResult.success) {
          // Marcar que se envio el recordatorio
          await query(
            'UPDATE orders SET payment_reminder_sent = TRUE WHERE id = ?',
            [order.id]
          )
          results.push({ orderNumber: order.order_number, status: 'sent' })
        } else {
          results.push({ orderNumber: order.order_number, status: 'failed', error: emailResult.error })
        }
      } catch (error: any) {
        results.push({ orderNumber: order.order_number, status: 'error', error: error.message })
      }
    }

    // Cancelar pedidos sin pago despues de 48 horas
    const expiredOrders = await query<any[]>(`
      SELECT id, order_number
      FROM orders
      WHERE payment_status = 'pending'
        AND status != 'cancelled'
        AND payment_method = 'WOMPI'
        AND created_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)
    `)

    for (const order of expiredOrders) {
      await query(
        "UPDATE orders SET status = 'cancelled', admin_notes = CONCAT(IFNULL(admin_notes, ''), ' | Cancelado automaticamente por falta de pago') WHERE id = ?",
        [order.id]
      )
      results.push({ orderNumber: order.order_number, status: 'cancelled' })
    }

    return NextResponse.json({
      success: true,
      processed: pendingOrders.length,
      cancelled: expiredOrders.length,
      results
    })
  } catch (error: any) {
    console.error('Error en cron de recordatorios:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
