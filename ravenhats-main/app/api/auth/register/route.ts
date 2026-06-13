import { NextRequest, NextResponse } from 'next/server'
import { registerCustomer, loginCustomer, linkOrdersToCustomer } from '@/lib/customer-auth'
import { sendWelcomeEmail } from '@/lib/email'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, phone } = await request.json()

    // Validaciones basicas
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contrasena debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Registrar cliente
    const result = await registerCustomer({
      email,
      password,
      firstName,
      lastName,
      phone
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Vincular pedidos existentes al nuevo cliente
    if (result.customer) {
      await linkOrdersToCustomer(result.customer.id, email)
      
      // Enviar email de bienvenida
      sendWelcomeEmail({
        email: result.customer.email,
        firstName: result.customer.firstName
      }).catch(err => console.error('Error enviando email de bienvenida:', err))
    }

    // Iniciar sesion automaticamente
    const loginResult = await loginCustomer(email, password)
    
    if (loginResult.success && loginResult.sessionToken) {
      const cookieStore = await cookies()
      cookieStore.set('customer_session', loginResult.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 dias
        path: '/'
      })
    }

    return NextResponse.json({
      success: true,
      customer: result.customer
    })
  } catch (error) {
    console.error('Error en registro:', error)
    return NextResponse.json(
      { error: 'Error al registrar. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
