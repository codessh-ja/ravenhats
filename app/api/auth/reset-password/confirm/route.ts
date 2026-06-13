import { NextRequest, NextResponse } from 'next/server'
import { resetPasswordWithCode } from '@/lib/customer-auth'
import { sendPasswordChangedEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json()

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La contrasena debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    const result = await resetPasswordWithCode(email, code, newPassword)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Enviar email de confirmacion
    if (result.firstName) {
      await sendPasswordChangedEmail({
        email,
        firstName: result.firstName
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Contrasena actualizada exitosamente'
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Error al cambiar la contrasena' },
      { status: 500 }
    )
  }
}
