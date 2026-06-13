import { NextRequest, NextResponse } from 'next/server'
import { loginCustomer } from '@/lib/customer-auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contrasena son requeridos' },
        { status: 400 }
      )
    }

    const result = await loginCustomer(email, password)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }

    // Guardar sesion en cookie
    const cookieStore = await cookies()
    cookieStore.set('customer_session', result.sessionToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 dias
      path: '/'
    })

    return NextResponse.json({
      success: true,
      customer: result.customer
    })
  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json(
      { error: 'Error al iniciar sesion. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
