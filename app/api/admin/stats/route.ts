import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'

async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  return session?.value === 'authenticated'
}

function getPeriodSQL(period: string): { dateFilter: string; prevDateFilter: string; groupBy: string; label: string } {
  switch (period) {
    case 'week':
      return {
        dateFilter: 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
        prevDateFilter: 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND o.created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)',
        groupBy: "DATE_FORMAT(o.created_at, '%a %d')",
        label: 'dia',
      }
    case 'month':
      return {
        dateFilter: 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
        prevDateFilter: 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND o.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)',
        groupBy: "DATE_FORMAT(o.created_at, '%d %b')",
        label: 'dia',
      }
    case 'quarter':
      return {
        dateFilter: 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)',
        prevDateFilter: 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 180 DAY) AND o.created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)',
        groupBy: "DATE_FORMAT(o.created_at, '%b %Y')",
        label: 'mes',
      }
    case 'year':
      return {
        dateFilter: 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)',
        prevDateFilter: 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 730 DAY) AND o.created_at < DATE_SUB(NOW(), INTERVAL 365 DAY)',
        groupBy: "DATE_FORMAT(o.created_at, '%b %Y')",
        label: 'mes',
      }
    default: // all time / dashboard default
      return {
        dateFilter: '',
        prevDateFilter: 'AND o.created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)',
        groupBy: "DATE_FORMAT(o.created_at, '%a')",
        label: 'dia',
      }
  }
}

export async function GET(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || ''

  try {
    const { dateFilter, prevDateFilter } = getPeriodSQL(period)
    const acctDateFilter = dateFilter.replace(/o\.created_at/g, 't.transaction_date')
    const prevAcctDateFilter = prevDateFilter.replace(/o\.created_at/g, 't.transaction_date')

    // Read notification config to check if stock alerts are enabled and threshold
    let stockAlertsEnabled = true
    let globalLowStockThreshold = 5
    try {
      const configResult = await query<any[]>(
        "SELECT config_value FROM store_config WHERE config_key = 'notifications'"
      )
      if (configResult.length > 0) {
        const cfg = typeof configResult[0].config_value === 'string'
          ? JSON.parse(configResult[0].config_value)
          : configResult[0].config_value
        stockAlertsEnabled = cfg.lowStock !== false
        globalLowStockThreshold = Number(cfg.lowStockThreshold) || 5
      }
    } catch {
      // Config table may not exist or no row
    }

    // Current period sales (approved only)
    const salesResult = await query<any[]>(`
      SELECT 
        COALESCE(SUM(o.total), 0) as totalSales,
        COUNT(*) as totalOrders
      FROM orders o
      WHERE o.payment_status = 'approved' ${dateFilter}
    `)

    // Previous period sales for growth calc
    const prevSalesResult = await query<any[]>(`
      SELECT 
        COALESCE(SUM(o.total), 0) as totalSales,
        COUNT(*) as totalOrders
      FROM orders o
      WHERE o.payment_status = 'approved' ${prevDateFilter}
    `)

    // Physical sales from accounting
    let physicalSalesResult: any[] = [{ physicalTotal: 0, physicalCount: 0 }]
    try {
      physicalSalesResult = await query<any[]>(`
        SELECT 
          COALESCE(SUM(total), 0) as physicalTotal,
          COUNT(*) as physicalCount
        FROM accounting_transactions 
        WHERE type = 'physical_sale' AND payment_status = 'approved'
          ${dateFilter.replace(/o\./g, '')}
      `)
    } catch {
      // Table may not exist
    }

    let prevPhysicalSalesResult: any[] = [{ physicalTotal: 0 }]
    try {
      prevPhysicalSalesResult = await query<any[]>(`
        SELECT COALESCE(SUM(total), 0) as physicalTotal
        FROM accounting_transactions
        WHERE type = 'physical_sale' AND payment_status = 'approved'
          ${prevAcctDateFilter}
      `)
    } catch { /* table may not exist */ }

    // Pending orders
    const pendingResult = await query<any[]>(`
      SELECT COUNT(*) as pendingOrders FROM orders WHERE payment_status = 'pending'
    `)

    // Active products + low stock alert (use global threshold from config)
    const productsResult = await query<any[]>(`
      SELECT 
        COUNT(*) as totalProducts,
        SUM(CASE WHEN stock <= ? AND stock > 0 THEN 1 ELSE 0 END) as lowStockCount,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as outOfStockCount
      FROM products WHERE is_active = TRUE
    `, [globalLowStockThreshold])

    // Unique customers (paid only) in period
    const customersResult = await query<any[]>(`
      SELECT COUNT(DISTINCT o.customer_email) as totalCustomers
      FROM orders o
      WHERE o.payment_status = 'approved' ${dateFilter}
    `)

    // Sales by day/period for chart (online + physical)
    const periodSQL = period === 'quarter' || period === 'year'
      ? `SELECT day, SUM(sales) as sales, SUM(orders) as orders FROM (
          SELECT DATE_FORMAT(o.created_at,'%Y-%m') as raw_date, DATE_FORMAT(o.created_at,'%b %Y') as day, COALESCE(SUM(o.total),0) as sales, COUNT(*) as orders
          FROM orders o WHERE o.payment_status='approved' ${dateFilter}
          GROUP BY DATE_FORMAT(o.created_at,'%Y-%m'), DATE_FORMAT(o.created_at,'%b %Y')
          UNION ALL
          SELECT DATE_FORMAT(t.transaction_date,'%Y-%m') as raw_date, DATE_FORMAT(t.transaction_date,'%b %Y') as day, COALESCE(SUM(t.total),0) as sales, COUNT(*) as orders
          FROM accounting_transactions t WHERE t.type='physical_sale' AND t.payment_status='approved' ${acctDateFilter}
          GROUP BY DATE_FORMAT(t.transaction_date,'%Y-%m'), DATE_FORMAT(t.transaction_date,'%b %Y')
        ) combined GROUP BY raw_date, day ORDER BY raw_date ASC`
      : period === 'month'
      ? `SELECT day, SUM(sales) as sales, SUM(orders) as orders FROM (
          SELECT DATE(o.created_at) as raw_date, DATE_FORMAT(o.created_at,'%d %b') as day, COALESCE(SUM(o.total),0) as sales, COUNT(*) as orders
          FROM orders o WHERE o.payment_status='approved' ${dateFilter}
          GROUP BY DATE(o.created_at), DATE_FORMAT(o.created_at,'%d %b')
          UNION ALL
          SELECT DATE(t.transaction_date) as raw_date, DATE_FORMAT(t.transaction_date,'%d %b') as day, COALESCE(SUM(t.total),0) as sales, COUNT(*) as orders
          FROM accounting_transactions t WHERE t.type='physical_sale' AND t.payment_status='approved' ${acctDateFilter}
          GROUP BY DATE(t.transaction_date), DATE_FORMAT(t.transaction_date,'%d %b')
        ) combined GROUP BY raw_date, day ORDER BY raw_date ASC`
      : `SELECT day, SUM(sales) as sales, SUM(orders) as orders FROM (
          SELECT DATE(o.created_at) as raw_date, DATE_FORMAT(o.created_at,'%a') as day, COALESCE(SUM(o.total),0) as sales, COUNT(*) as orders
          FROM orders o WHERE o.payment_status='approved' AND o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          GROUP BY DATE(o.created_at), DATE_FORMAT(o.created_at,'%a')
          UNION ALL
          SELECT DATE(t.transaction_date) as raw_date, DATE_FORMAT(t.transaction_date,'%a') as day, COALESCE(SUM(t.total),0) as sales, COUNT(*) as orders
          FROM accounting_transactions t WHERE t.type='physical_sale' AND t.payment_status='approved' AND t.transaction_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          GROUP BY DATE(t.transaction_date), DATE_FORMAT(t.transaction_date,'%a')
        ) combined GROUP BY raw_date, day ORDER BY raw_date ASC`

    const weeklySales = await query<any[]>(periodSQL)

    // Top products in period (online + physical)
    const topProductsResult = await query<any[]>(`
      SELECT name, SUM(sold) as sold, CAST(SUM(revenue) AS DECIMAL(12,2)) as revenue FROM (
        SELECT oi.product_name as name, SUM(oi.quantity) as sold, SUM(oi.subtotal) as revenue
        FROM order_items oi JOIN orders o ON oi.order_id = o.id
        WHERE o.payment_status = 'approved' ${dateFilter}
        GROUP BY oi.product_name
        UNION ALL
        SELECT ti.product_name as name, SUM(ti.quantity) as sold, SUM(ti.subtotal) as revenue
        FROM accounting_transaction_items ti JOIN accounting_transactions t ON ti.transaction_id = t.id
        WHERE t.type = 'physical_sale' AND t.payment_status = 'approved' ${acctDateFilter}
        GROUP BY ti.product_name
      ) combined
      GROUP BY name ORDER BY sold DESC LIMIT 5
    `)

    // Recent orders
    const recentOrdersResult = await query<any[]>(`
      SELECT 
        id, order_number, 
        CONCAT(customer_first_name, ' ', customer_last_name) as customer_name,
        total, status, payment_status, payment_method, created_at
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 10
    `)

    // Sales by payment method (online + physical)
    const paymentMethodStats = await query<any[]>(`
      SELECT method, SUM(orders) as orders, SUM(revenue) as revenue FROM (
        SELECT COALESCE(o.payment_method, 'N/A') as method, COUNT(*) as orders, COALESCE(SUM(o.total),0) as revenue
        FROM orders o WHERE o.payment_status = 'approved' ${dateFilter}
        GROUP BY o.payment_method
        UNION ALL
        SELECT COALESCE(t.payment_method, 'N/A') as method, COUNT(*) as orders, COALESCE(SUM(t.total),0) as revenue
        FROM accounting_transactions t WHERE t.type = 'physical_sale' AND t.payment_status = 'approved' ${acctDateFilter}
        GROUP BY t.payment_method
      ) combined GROUP BY method ORDER BY revenue DESC
    `)

    // Sales by city
    const cityStats = await query<any[]>(`
      SELECT 
        o.shipping_city as city,
        COUNT(*) as orders,
        COALESCE(SUM(o.total), 0) as revenue
      FROM orders o
      WHERE o.payment_status = 'approved' ${dateFilter}
      GROUP BY o.shipping_city
      ORDER BY revenue DESC
      LIMIT 10
    `)

    // Low stock products (use global threshold, only if alerts enabled)
    const lowStockProducts = stockAlertsEnabled ? await query<any[]>(`
      SELECT id, name, sku, stock, ? as low_stock_threshold
      FROM products 
      WHERE is_active = TRUE AND stock <= ?
      ORDER BY stock ASC
      LIMIT 10
    `, [globalLowStockThreshold, globalLowStockThreshold]) : []

    // Conversion rate: total orders vs paid orders
    const conversionResult = await query<any[]>(`
      SELECT
        COUNT(*) as totalOrders,
        SUM(CASE WHEN payment_status = 'approved' THEN 1 ELSE 0 END) as paidOrders,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pendingOrders,
        SUM(CASE WHEN payment_status = 'rejected' THEN 1 ELSE 0 END) as rejectedOrders
      FROM orders ${dateFilter ? 'WHERE 1=1 ' + dateFilter.replace(/o\./g, '') : ''}
    `)

    // Order status breakdown for funnel
    const statusBreakdown = await query<any[]>(`
      SELECT status, COUNT(*) as count
      FROM orders
      ${dateFilter ? 'WHERE 1=1 ' + dateFilter.replace(/o\./g, '') : ''}
      GROUP BY status
    `)

    // Category breakdown
    const categoryStats = await query<any[]>(`
      SELECT 
        COALESCE(c.name, 'Sin categoria') as category,
        COUNT(DISTINCT oi.order_id) as orders,
        CAST(SUM(oi.quantity) AS UNSIGNED) as units,
        CAST(SUM(oi.subtotal) AS DECIMAL(12,2)) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.payment_status = 'approved' ${dateFilter}
      GROUP BY c.name
      ORDER BY revenue DESC
    `)

    // Calculate growth (online + physical)
    const onlineSales = Number(salesResult[0]?.totalSales || 0)
    const physicalSales = Number(physicalSalesResult[0]?.physicalTotal || 0)
    const physicalSalesCount = Number(physicalSalesResult[0]?.physicalCount || 0)

    const prevOnline = Number(prevSalesResult[0]?.totalSales || 0)
    const prevPhysical = Number(prevPhysicalSalesResult[0]?.physicalTotal || 0)
    const currentTotal = onlineSales + physicalSales
    const prevTotal = prevOnline + prevPhysical
    const salesGrowth = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0

    const currentOrders = Number(salesResult[0]?.totalOrders || 0)
    const prevOrders = Number(prevSalesResult[0]?.totalOrders || 0)
    const ordersGrowth = prevOrders > 0 ? ((currentOrders - prevOrders) / prevOrders) * 100 : 0
    const totalOrdersAll = currentOrders + physicalSalesCount

    const conv = conversionResult[0] || {}
    const totalAllOrders = Number(conv.totalOrders || 0)
    const paidOrders = Number(conv.paidOrders || 0)
    const conversionRate = totalAllOrders > 0 ? (paidOrders / totalAllOrders) * 100 : 0

    return NextResponse.json({
      success: true,
      stats: {
        totalSales: onlineSales + physicalSales,
        onlineSales,
        physicalSales,
        physicalSalesCount,
        totalOrders: totalOrdersAll,
        pendingOrders: Number(pendingResult[0]?.pendingOrders || 0),
        totalProducts: Number(productsResult[0]?.totalProducts || 0),
        lowStockCount: stockAlertsEnabled ? Number(productsResult[0]?.lowStockCount || 0) : 0,
        outOfStockCount: stockAlertsEnabled ? Number(productsResult[0]?.outOfStockCount || 0) : 0,
        totalCustomers: Number(customersResult[0]?.totalCustomers || 0),
        salesGrowth,
        ordersGrowth,
        conversionRate,
        weeklySales: weeklySales || [],
        topProducts: topProductsResult || [],
        recentOrders: recentOrdersResult || [],
        paymentMethodStats: paymentMethodStats || [],
        cityStats: cityStats || [],
        lowStockProducts: lowStockProducts || [],
        categoryStats: categoryStats || [],
        stockAlertsEnabled,
        globalLowStockThreshold,
        orderStatusBreakdown: statusBreakdown || [],
        avgOrderValue: totalOrdersAll > 0 ? (onlineSales + physicalSales) / totalOrdersAll : 0,
        totalAllOrders: Number(conversionResult[0]?.totalOrders || 0),
        rejectedOrders: Number(conversionResult[0]?.rejectedOrders || 0),
      }
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Error al obtener estadisticas' }, { status: 500 })
  }
}
