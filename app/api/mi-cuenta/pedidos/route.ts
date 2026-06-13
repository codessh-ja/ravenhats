import { NextResponse } from 'next/server'
import { getCurrentCustomer, getCustomerOrders, getOrdersByEmail } from '@/lib/customer-auth'

export async function GET() {
  try {
    const customer = await getCurrentCustomer()

    if (!customer) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Buscar ordenes por customer_id primero
    let orders = await getCustomerOrders(customer.customerId)
    
    // Si no hay ordenes por customer_id, buscar por email (para ordenes anteriores no vinculadas)
    if (orders.length === 0) {
      orders = await getOrdersByEmail(customer.email)
    }

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Error obteniendo pedidos:', error)
    return NextResponse.json(
      { error: 'Error al obtener pedidos' },
      { status: 500 }
    )
  }
}
