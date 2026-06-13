import { NextRequest, NextResponse } from 'next/server'
import { requestPasswordReset } from '@/lib/customer-auth'
import { sendPasswordResetCodeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email requerido' },
        { status: 400 }
      )
    }

    // Solicitar codigo
    const result = await requestPasswordReset(email)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Si hay codigo, enviar email
    if (result.code && result.firstName) {
      await sendPasswordResetCodeEmail({
        email,
        firstName: result.firstName,
        code: result.code
      })
    }

    // Siempre respondemos exitosamente (no revelamos si el email existe)
    return NextResponse.json({
      success: true,
      message: 'Si el correo esta registrado, recibiras un codigo de verificacion'
    })
  } catch (error) {
    console.error('Error requesting password reset:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}
