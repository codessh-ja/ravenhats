import { NextResponse } from 'next/server'
import { subscribeToDrops } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, collectionId } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email invalido' },
        { status: 400 }
      )
    }

    await subscribeToDrops(email, collectionId)

    return NextResponse.json({ 
      success: true,
      message: 'Suscripcion exitosa'
    })
  } catch (error) {
    console.error('Error subscribing to drops:', error)
    return NextResponse.json(
      { error: 'Error al procesar la suscripcion' },
      { status: 500 }
    )
  }
}
