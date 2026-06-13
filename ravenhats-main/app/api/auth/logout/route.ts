import { NextResponse } from 'next/server'
import { logoutCustomer } from '@/lib/customer-auth'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('customer_session')?.value

    if (sessionToken) {
      await logoutCustomer(sessionToken)
    }

    cookieStore.delete('customer_session')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en logout:', error)
    return NextResponse.json(
      { error: 'Error al cerrar sesion' },
      { status: 500 }
    )
  }
}
