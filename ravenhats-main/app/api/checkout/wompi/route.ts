import { NextRequest, NextResponse } from 'next/server'
import { getWompiCheckoutConfig, getWompiTransactionByReference, isWompiConfigured } from '@/lib/wompi'

// Obtener configuracion para iniciar checkout con Wompi
export async function POST(request: NextRequest) {
  try {
    const { orderNumber, amountInCents, customerEmail } = await request.json()

    if (!orderNumber || !amountInCents) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      )
    }

    // Verificar si Wompi esta configurado
    const configured = isWompiConfigured()
    if (!configured) {
      return NextResponse.json(
        { error: 'Wompi no esta configurado. Por favor contacta al administrador.' },
        { status: 503 }
      )
    }

    // Generar configuracion del checkout
    const checkoutConfig = getWompiCheckoutConfig(
      orderNumber,
      amountInCents,
      'COP',
      customerEmail
    )

    return NextResponse.json(checkoutConfig)
  } catch (error) {
    console.error('Error generando configuracion de Wompi:', error)
    return NextResponse.json(
      { error: 'Error al iniciar checkout' },
      { status: 500 }
    )
  }
}

// Verificar estado de pago por referencia
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.json(
        { error: 'Referencia requerida' },
        { status: 400 }
      )
    }

    const transaction = await getWompiTransactionByReference(reference)

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaccion no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: transaction.id,
      reference: transaction.reference,
      status: transaction.status,
      statusMessage: transaction.status_message,
      amountInCents: transaction.amount_in_cents,
      currency: transaction.currency,
      paymentMethod: transaction.payment_method_type,
      createdAt: transaction.created_at,
      finalizedAt: transaction.finalized_at,
    })
  } catch (error) {
    console.error('Error verificando pago:', error)
    return NextResponse.json(
      { error: 'Error al verificar pago' },
      { status: 500 }
    )
  }
}
