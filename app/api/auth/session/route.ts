import { NextResponse } from 'next/server'
import { getCurrentCustomer } from '@/lib/customer-auth'

export async function GET() {
  try {
    const customer = await getCurrentCustomer()

    if (!customer) {
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({
      authenticated: true,
      customer
    })
  } catch (error) {
    console.error('Error obteniendo sesion:', error)
    return NextResponse.json({ authenticated: false })
  }
}
