/**
 * PASO 18 - Product Event Tracking API
 * 
 * Tracks product events for the learning system:
 * - view_product (when shown in chat)
 * - click_product (when clicked)
 * - add_to_cart (when added to cart)
 * - purchase (when purchased)
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  trackProductEvent, 
  trackProductEvents,
  getEventStats,
  type ProductEventType 
} from '@/lib/product-learning'

// POST - Track event(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Single event
    if (body.productId && body.eventType) {
      const { productId, eventType, sessionId } = body
      
      // Validate event type
      const validTypes: ProductEventType[] = ['view', 'click', 'add_to_cart', 'purchase']
      if (!validTypes.includes(eventType)) {
        return NextResponse.json(
          { error: 'Invalid event type' },
          { status: 400 }
        )
      }
      
      trackProductEvent(productId, eventType, sessionId)
      
      return NextResponse.json({ success: true })
    }
    
    // Multiple events
    if (Array.isArray(body.events)) {
      const events = body.events.map((e: { productId: string; eventType: ProductEventType; sessionId?: string }) => ({
        productId: e.productId,
        eventType: e.eventType,
        sessionId: e.sessionId,
      }))
      
      trackProductEvents(events)
      
      return NextResponse.json({ success: true, count: events.length })
    }
    
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error tracking event:', error)
    return NextResponse.json(
      { error: 'Error tracking event' },
      { status: 500 }
    )
  }
}

// GET - Get event statistics (for admin/debugging)
export async function GET() {
  try {
    const stats = getEventStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error getting stats:', error)
    return NextResponse.json(
      { error: 'Error getting stats' },
      { status: 500 }
    )
  }
}
