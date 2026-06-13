import { NextRequest, NextResponse } from 'next/server'
import { getCurrentCustomer, changePassword } from '@/lib/customer-auth'
import { sendPasswordChangedEmail } from '@/lib/email'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Verificar sesion
    const customer = await getCurrentCustomer()
    
    if (!customer) {
      return NextResponse.json(
        { error: 'Debes iniciar sesion' },
        { status: 401 }
      )
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La nueva contrasena debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    const result = await changePassword(customer.customerId, currentPassword, newPassword)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Enviar email de confirmacion
    sendPasswordChangedEmail({
      email: customer.email,
      firstName: customer.firstName
    }).catch(err => console.error('Error enviando email:', err))

    return NextResponse.json({
      success: true,
      message: 'Contrasena actualizada exitosamente'
    })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { error: 'Error al cambiar la contrasena' },
      { status: 500 }
    )
  }
}
