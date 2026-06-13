import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * GET /api/admin/chat-analytics
 * Get chat performance analytics for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    // Get daily stats
    const dailyStats = await query<any[]>(
      `SELECT * FROM chat_daily_stats 
       WHERE stat_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY stat_date DESC`,
      [days]
    )

    // Get overall totals
    const totals = await query<any[]>(
      `SELECT 
         COUNT(*) as total_sessions,
         SUM(CASE WHEN converted = TRUE THEN 1 ELSE 0 END) as total_conversions,
         SUM(CASE WHEN conversion_type = 'online' THEN 1 ELSE 0 END) as online_conversions,
         SUM(CASE WHEN conversion_type = 'cod' THEN 1 ELSE 0 END) as cod_conversions,
         AVG(intent_score) as avg_intent_score,
         AVG(messages_count) as avg_messages,
         SUM(CASE WHEN hesitation_detected = TRUE THEN 1 ELSE 0 END) as total_hesitations,
         SUM(CASE WHEN hesitation_detected = TRUE AND converted = TRUE THEN 1 ELSE 0 END) as hesitations_converted
       FROM chat_sessions
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    )

    // Get top converting products
    const topProducts = await query<any[]>(
      `SELECT 
         p.id, p.name, p.price,
         cps.times_shown, cps.times_added_to_cart, cps.times_purchased,
         cps.show_to_cart_rate, cps.cart_to_purchase_rate, cps.total_revenue
       FROM chat_product_stats cps
       JOIN products p ON cps.product_id = p.id
       ORDER BY cps.show_to_cart_rate DESC
       LIMIT 10`
    )

    // Get conversion funnel
    const funnel = await query<any[]>(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN messages_count > 0 THEN 1 ELSE 0 END) as engaged,
         SUM(CASE WHEN products_shown = TRUE THEN 1 ELSE 0 END) as shown_products,
         SUM(CASE WHEN products_added_to_cart > 0 THEN 1 ELSE 0 END) as added_to_cart,
         SUM(CASE WHEN converted = TRUE THEN 1 ELSE 0 END) as converted
       FROM chat_sessions
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    )

    // Get effective message patterns
    const patterns = await query<any[]>(
      `SELECT pattern_type, pattern_value, times_triggered, times_led_to_conversion, conversion_rate
       FROM chat_message_patterns
       WHERE times_triggered > 0
       ORDER BY conversion_rate DESC
       LIMIT 10`
    )

    // Get intent score distribution
    const intentDistribution = await query<any[]>(
      `SELECT 
         CASE 
           WHEN intent_score >= 70 THEN 'high'
           WHEN intent_score >= 40 THEN 'medium'
           ELSE 'low'
         END as intent_level,
         COUNT(*) as count,
         SUM(CASE WHEN converted = TRUE THEN 1 ELSE 0 END) as converted
       FROM chat_sessions
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY intent_level`,
      [days]
    )

    const total = totals[0] || {}
    const funnelData = funnel[0] || {}

    return NextResponse.json({
      period: `${days} days`,
      summary: {
        totalSessions: total.total_sessions || 0,
        totalConversions: total.total_conversions || 0,
        conversionRate: total.total_sessions > 0 
          ? ((total.total_conversions / total.total_sessions) * 100).toFixed(1) + '%'
          : '0%',
        onlineConversions: total.online_conversions || 0,
        codConversions: total.cod_conversions || 0,
        avgIntentScore: Math.round(total.avg_intent_score || 0),
        avgMessages: (total.avg_messages || 0).toFixed(1),
        hesitationRate: total.total_sessions > 0
          ? ((total.total_hesitations / total.total_sessions) * 100).toFixed(1) + '%'
          : '0%',
        hesitationConversionRate: total.total_hesitations > 0
          ? ((total.hesitations_converted / total.total_hesitations) * 100).toFixed(1) + '%'
          : '0%'
      },
      funnel: {
        total: funnelData.total || 0,
        engaged: funnelData.engaged || 0,
        shownProducts: funnelData.shown_products || 0,
        addedToCart: funnelData.added_to_cart || 0,
        converted: funnelData.converted || 0
      },
      dailyStats,
      topProducts,
      patterns,
      intentDistribution
    })
  } catch (error) {
    console.error('Error getting chat analytics:', error)
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    )
  }
}
