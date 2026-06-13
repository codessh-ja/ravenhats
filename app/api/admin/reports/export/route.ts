import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'

async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  return session?.value === 'authenticated'
}

export async function GET(request: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'sales'

  try {
    let csvContent = ''
    
    if (type === 'sales') {
      const orders = await query<any[]>(`
        SELECT 
          order_number, 
          CONCAT(customer_first_name, ' ', customer_last_name) as customer,
          customer_email,
          subtotal, shipping_cost, total,
          status, payment_status,
          DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as fecha
        FROM orders
        ORDER BY created_at DESC
      `)
      
      csvContent = 'Numero Orden,Cliente,Email,Subtotal,Envio,Total,Estado,Pago,Fecha\n'
      orders.forEach(o => {
        csvContent += `${o.order_number},"${o.customer}",${o.customer_email},${o.subtotal},${o.shipping_cost},${o.total},${o.status},${o.payment_status},${o.fecha}\n`
      })
    } else if (type === 'orders') {
      const orders = await query<any[]>(`
        SELECT 
          o.order_number,
          o.customer_first_name, o.customer_last_name,
          o.customer_email, o.customer_phone,
          o.shipping_address, o.shipping_city, o.shipping_department,
          oi.product_name, oi.quantity, oi.unit_price, oi.subtotal,
          o.total, o.status,
          DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i') as fecha
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        ORDER BY o.created_at DESC, o.id
      `)
      
      csvContent = 'Orden,Nombre,Apellido,Email,Telefono,Direccion,Ciudad,Departamento,Producto,Cantidad,Precio Unit,Subtotal,Total Orden,Estado,Fecha\n'
      orders.forEach(o => {
        csvContent += `${o.order_number},"${o.customer_first_name}","${o.customer_last_name}",${o.customer_email},${o.customer_phone || ''},"${o.shipping_address}","${o.shipping_city}","${o.shipping_department}","${o.product_name || ''}",${o.quantity || 0},${o.unit_price || 0},${o.subtotal || 0},${o.total},${o.status},${o.fecha}\n`
      })
    } else if (type === 'accounting') {
      let accountingSql = `
        SELECT 
          t.type,
          t.payment_method,
          t.payment_status,
          t.order_number,
          t.customer_name,
          t.customer_phone,
          t.subtotal,
          t.shipping_cost,
          t.discount,
          t.total,
          t.description,
          t.payment_reference,
          t.created_by,
          DATE_FORMAT(t.transaction_date, '%Y-%m-%d %H:%i') as fecha
        FROM accounting_transactions t
        WHERE 1=1
      `
      const accountingParams: string[] = []
      const dateFromParam = searchParams.get('dateFrom')
      const dateToParam = searchParams.get('dateTo')
      if (dateFromParam) {
        accountingSql += ' AND t.transaction_date >= ?'
        accountingParams.push(dateFromParam)
      }
      if (dateToParam) {
        accountingSql += ' AND t.transaction_date <= ?'
        accountingParams.push(dateToParam + ' 23:59:59')
      }
      accountingSql += ' ORDER BY t.transaction_date DESC'

      const txs = await query<any[]>(accountingSql, accountingParams)
      
      csvContent = 'Tipo,Metodo Pago,Estado Pago,Pedido,Cliente,Telefono,Subtotal,Envio,Descuento,Total,Descripcion,Referencia,Creado Por,Fecha\n'
      txs.forEach(t => {
        csvContent += `${t.type},${t.payment_method},${t.payment_status},${t.order_number || ''},"${t.customer_name || ''}",${t.customer_phone || ''},${t.subtotal},${t.shipping_cost},${t.discount},${t.total},"${(t.description || '').replace(/"/g, '""')}",${t.payment_reference || ''},${t.created_by},${t.fecha}\n`
      })
    } else if (type === 'inventory') {
      const products = await query<any[]>(`
        SELECT 
          p.sku, p.name, c.name as category,
          p.price, p.stock, 
          p.is_active,
          DATE_FORMAT(p.created_at, '%Y-%m-%d') as creado
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.name
      `)
      
      csvContent = 'SKU,Nombre,Categoria,Precio,Stock,Activo,Creado\n'
      products.forEach(p => {
        csvContent += `${p.sku || ''},"${p.name}","${p.category || ''}",${p.price},${p.stock},${p.is_active ? 'Si' : 'No'},${p.creado}\n`
      })
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${type}-report.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting:', error)
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 })
  }
}
