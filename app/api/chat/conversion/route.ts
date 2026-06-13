import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * POST /api/chat/conversion
 * Track conversion from chat session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, conversionType, orderId, orderTotal, productIds } = body

    if (!sessionId || !conversionType) {
      return NextResponse.json(
        { error: 'sessionId and conversionType are required' },
        { status: 400 }
      )
    }

    // Update session as converted
    await query(
      `UPDATE chat_sessions 
       SET converted = TRUE, 
           conversion_type = ?, 
           order_id = ?,
           converted_at = NOW()
       WHERE session_id = ?`,
      [conversionType, orderId || null, sessionId]
    )

    // Track conversion event
    await query(
      `INSERT INTO chat_events 
       (session_id, event_type, event_data)
       VALUES (?, 'checkout_completed', ?)`,
      [
        sessionId,
        JSON.stringify({ conversionType, orderId, orderTotal, productIds })
      ]
    )

    // Update product stats for purchased products
    if (productIds && productIds.length > 0) {
      for (const productId of productIds) {
        await query(
          `UPDATE chat_product_stats 
           SET times_purchased = times_purchased + 1,
               total_revenue = total_revenue + ?,
               cart_to_purchase_rate = times_purchased / NULLIF(times_added_to_cart, 0)
           WHERE product_id = ?`,
          [orderTotal / productIds.length, productId]
        )
      }
    }

    // Update daily stats
    await query(
      `INSERT INTO chat_daily_stats (stat_date, total_conversions, ${conversionType === 'online' ? 'conversions_online' : 'conversions_cod'}, total_revenue)
       VALUES (CURDATE(), 1, 1, ?)
       ON DUPLICATE KEY UPDATE
         total_conversions = total_conversions + 1,
         ${conversionType === 'online' ? 'conversions_online = conversions_online + 1' : 'conversions_cod = conversions_cod + 1'},
         total_revenue = total_revenue + ?`,
      [orderTotal || 0, orderTotal || 0]
    )

    // Update message pattern effectiveness
    // Get the last few events for this session to see what led to conversion
    const recentEvents = await query<any[]>(
      `SELECT event_type, event_data FROM chat_events 
       WHERE session_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [sessionId]
    )

    // Mark patterns that led to this conversion as effective
    for (const event of recentEvents) {
      if (event.event_type === 'quick_reply_clicked' && event.event_data) {
        try {
          const data = typeof event.event_data === 'string' 
            ? JSON.parse(event.event_data) 
            : event.event_data
          if (data.action) {
            await query(
              `UPDATE chat_message_patterns 
               SET times_led_to_conversion = times_led_to_conversion + 1,
                   conversion_rate = times_led_to_conversion / NULLIF(times_triggered, 0)
               WHERE pattern_value = ?`,
              [data.action]
            )
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking conversion:', error)
    return NextResponse.json(
      { error: 'Failed to track conversion' },
      { status: 500 }
    )
  }
}
