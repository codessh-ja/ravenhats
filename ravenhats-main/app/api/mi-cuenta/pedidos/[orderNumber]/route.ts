import { NextRequest, NextResponse } from 'next/server'
import { getCurrentCustomer, getOrderDetail } from '@/lib/customer-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params
    const customer = await getCurrentCustomer()

    if (!customer) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Buscar primero por customer_id, si no encuentra, buscar por email
    let order = await getOrderDetail(orderNumber, customer.customerId)
    
    if (!order) {
      // Intentar buscar por email (para ordenes anteriores no vinculadas)
      order = await getOrderDetail(orderNumber, undefined, customer.email)
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error obteniendo pedido:', error)
    return NextResponse.json(
      { error: 'Error al obtener pedido' },
      { status: 500 }
    )
  }
}
