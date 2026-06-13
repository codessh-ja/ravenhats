import { NextRequest, NextResponse } from 'next/server'
import { verifyResetCode } from '@/lib/customer-auth'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email y codigo requeridos' },
        { status: 400 }
      )
    }

    const result = await verifyResetCode(email, code)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error verifying reset code:', error)
    return NextResponse.json(
      { error: 'Error al verificar el codigo' },
      { status: 500 }
    )
  }
}
