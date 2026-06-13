import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { ChatSessionState } from '@/lib/chatbot-scoring'

/**
 * POST /api/chat/session
 * Create or update chat session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, state } = body as { sessionId: string; state: ChatSessionState }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // Upsert session
    await query(
      `INSERT INTO chat_sessions (
        session_id, intent_score, vibe, use_case, products_shown, user_acted,
        messages_count, products_viewed, products_added_to_cart,
        asked_price, asked_shipping, asked_returns, hesitation_detected,
        cart_value, cart_items_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        intent_score = VALUES(intent_score),
        vibe = VALUES(vibe),
        use_case = VALUES(use_case),
        products_shown = VALUES(products_shown),
        user_acted = VALUES(user_acted),
        messages_count = VALUES(messages_count),
        products_viewed = VALUES(products_viewed),
        products_added_to_cart = VALUES(products_added_to_cart),
        asked_price = VALUES(asked_price),
        asked_shipping = VALUES(asked_shipping),
        asked_returns = VALUES(asked_returns),
        hesitation_detected = VALUES(hesitation_detected),
        cart_value = VALUES(cart_value),
        cart_items_count = VALUES(cart_items_count)`,
      [
        sessionId,
        state.intentScore,
        state.vibe || null,
        state.useCase || null,
        state.productsShown,
        state.userActed,
        state.messagesCount,
        state.productsViewed,
        state.productsAddedToCart,
        state.askedPrice,
        state.askedShipping,
        state.askedReturns,
        state.hesitationDetected,
        state.cartValue,
        state.cartItemsCount
      ]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving chat session:', error)
    return NextResponse.json(
      { error: 'Failed to save session' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/chat/session?sessionId=xxx
 * Get chat session data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const sessions = await query<any[]>(
      'SELECT * FROM chat_sessions WHERE session_id = ?',
      [sessionId]
    )

    if (sessions.length === 0) {
      return NextResponse.json({ session: null })
    }

    const session = sessions[0]
    return NextResponse.json({
      session: {
        sessionId: session.session_id,
        intentScore: session.intent_score,
        vibe: session.vibe,
        useCase: session.use_case,
        productsShown: session.products_shown,
        userActed: session.user_acted,
        messagesCount: session.messages_count,
        productsViewed: session.products_viewed,
        productsAddedToCart: session.products_added_to_cart,
        askedPrice: session.asked_price,
        askedShipping: session.asked_shipping,
        askedReturns: session.asked_returns,
        hesitationDetected: session.hesitation_detected,
        cartValue: parseFloat(session.cart_value),
        cartItemsCount: session.cart_items_count,
        converted: session.converted,
        conversionType: session.conversion_type
      }
    })
  } catch (error) {
    console.error('Error getting chat session:', error)
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    )
  }
}
