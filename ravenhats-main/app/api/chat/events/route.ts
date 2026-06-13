import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * POST /api/chat/events
 * Track chat events for learning system
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      eventType,
      eventData,
      intentScoreAtEvent,
      cartValueAtEvent
    } = body

    if (!sessionId || !eventType) {
      return NextResponse.json(
        { error: 'sessionId and eventType are required' },
        { status: 400 }
      )
    }

    // Insert event
    await query(
      `INSERT INTO chat_events 
       (session_id, event_type, event_data, intent_score_at_event, cart_value_at_event)
       VALUES (?, ?, ?, ?, ?)`,
      [
        sessionId,
        eventType,
        eventData ? JSON.stringify(eventData) : null,
        intentScoreAtEvent || 0,
        cartValueAtEvent || 0
      ]
    )

    // If it's a product event, update product stats
    if (eventData?.productId) {
      const productId = eventData.productId

      if (eventType === 'product_viewed') {
        await query(
          `INSERT INTO chat_product_stats (product_id, times_shown, last_shown_at)
           VALUES (?, 1, NOW())
           ON DUPLICATE KEY UPDATE 
             times_shown = times_shown + 1,
             last_shown_at = NOW()`,
          [productId]
        )
      } else if (eventType === 'product_added_to_cart') {
        await query(
          `INSERT INTO chat_product_stats (product_id, times_clicked, times_added_to_cart)
           VALUES (?, 1, 1)
           ON DUPLICATE KEY UPDATE 
             times_clicked = times_clicked + 1,
             times_added_to_cart = times_added_to_cart + 1`,
          [productId]
        )
        // Update show_to_cart_rate
        await query(
          `UPDATE chat_product_stats 
           SET show_to_cart_rate = times_added_to_cart / NULLIF(times_shown, 0)
           WHERE product_id = ?`,
          [productId]
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking chat event:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}
