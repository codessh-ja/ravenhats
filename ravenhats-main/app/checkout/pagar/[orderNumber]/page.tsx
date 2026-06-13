'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Package, CreditCard, ShieldCheck, Clock, AlertCircle, Loader2, Home, Lock, Smartphone, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatPrice } from '@/lib/data'
import { toast } from 'sonner'
import { BUSINESS } from '@/lib/constants'
import { getWompiCheckoutConfig } from '@/lib/wompi'

interface OrderItem {
  id: number
  productName: string
  productImage: string
  unitPrice: number
  quantity: number
  subtotal: number
}

interface Order {
  id: number
  order_number: string
  customer_email: string
  customer_first_name: string
  customer_last_name: string
  total: number
  subtotal: number
  shipping_cost: number
  payment_status: string
  payment_method: string
  status: string
  items: OrderItem[]
}

export default function CompletarPagoPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [orderNumber])

  const fetchOrder = async () => {
    try {
      // Primero verificar si el usuario esta logueado
      const sessionRes = await fetch('/api/auth/session')
      const sessionData = await sessionRes.json()

      if (!sessionData.authenticated) {
        router.push(`/login?redirect=/checkout/pagar/${orderNumber}`)
        return
      }

      // Obtener la orden
      const res = await fetch(`/api/mi-cuenta/pedidos/${orderNumber}`)
      
      if (res.status === 401) {
        router.push(`/login?redirect=/checkout/pagar/${orderNumber}`)
        return
      }

      if (res.status === 404) {
        toast.error('Pedido no encontrado')
        router.push('/mi-cuenta')
        return
      }

      const data = await res.json()
      
      if (data.error) {
        toast.error(data.error)
        router.push('/mi-cuenta')
        return
      }

      // Verificar que el pedido este pendiente de pago
      if (data.order.payment_status === 'approved') {
        toast.success('Este pedido ya fue pagado')
        router.push(`/mi-cuenta/pedido/${orderNumber}`)
        return
      }

      if (data.order.status === 'cancelled') {
        toast.error('Este pedido fue cancelado')
        router.push('/mi-cuenta')
        return
      }

      setOrder(data.order)
    } catch (error) {
      console.error('Error fetching order:', error)
      toast.error('Error al cargar el pedido')
      router.push('/mi-cuenta')
    } finally {
      setLoading(false)
    }
  }

  const handlePayWithWompi = async () => {
    if (!order) return
    
    setProcessing(true)
    
    try {
      // Generar configuracion de pago Wompi
      const wompiConfig = getWompiCheckoutConfig(
        order.order_number,
        Math.round(order.total * 100), // Convertir a centavos
        'COP',
        order.customer_email
      )

      // Construir URL de checkout Wompi
      const wompiBaseUrl = 'https://checkout.wompi.co/l/'
      
      // Crear URL con todos los parametros
      const params = new URLSearchParams({
        'public-key': wompiConfig.publicKey,
        'currency': wompiConfig.currency,
        'amount-in-cents': wompiConfig.amountInCents.toString(),
        'reference': wompiConfig.reference,
        'signature:integrity': wompiConfig.signature,
        'redirect-url': wompiConfig.redirectUrl,
      })
      
      // Agregar datos del cliente si estan disponibles
      if (wompiConfig.customerEmail) {
        params.append('customer-data:email', wompiConfig.customerEmail)
      }
      if (order.customer_first_name) {
        params.append('customer-data:full-name', `${order.customer_first_name} ${order.customer_last_name}`)
      }

      // Redirigir a Wompi
      window.location.href = `${wompiBaseUrl}?${params.toString()}`
    } catch (error) {
      console.error('Error al procesar pago:', error)
      toast.error('Error al procesar el pago. Intenta de nuevo.')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-secondary/20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Cargando pedido...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return null
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10">
      {/* Top Navigation */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/mi-cuenta" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Volver a mi cuenta</span>
            </Link>
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-5 w-5" />
              <span className="font-medium hidden sm:inline">Tienda</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500/10 mb-4">
            <CreditCard className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Completar Pago</h1>
          <p className="text-muted-foreground">Pedido <span className="font-mono font-semibold text-foreground">{order.order_number}</span></p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Main content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Payment pending notice */}
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-amber-400 mb-1">Pago Pendiente</h3>
                    <p className="text-muted-foreground">
                      Tu pedido esta reservado y esperando el pago. Completa el pago para que podamos prepararlo y enviarlo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order items */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" />
                  Resumen del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex gap-4 p-5">
                      <div className="relative w-16 h-16 bg-secondary rounded-xl overflow-hidden flex-shrink-0">
                        {item.productImage ? (
                          <Image
                            src={item.productImage || "/placeholder.svg"}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{item.productName}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.quantity} x {formatPrice(item.unitPrice)}
                        </p>
                      </div>
                      <div className="text-right font-bold text-lg">
                        {formatPrice(item.subtotal)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-5 bg-secondary/30 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envio</span>
                    <span>{formatPrice(order.shipping_cost)}</span>
                  </div>
                  <Separator className="bg-border/50" />
                  <div className="flex justify-between font-bold text-xl pt-1">
                    <span>Total a pagar</span>
                    <span className="text-primary">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Payment */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gradient-to-b from-card to-card/50 border-primary/20 sticky top-24">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="h-5 w-5 text-emerald-400" />
                  Pago Seguro
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Payment methods */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Metodos de pago disponibles:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-secondary/50 rounded-lg flex flex-col items-center gap-1">
                      <CreditCard className="h-5 w-5 text-blue-400" />
                      <span className="text-xs text-muted-foreground">Tarjetas</span>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg flex flex-col items-center gap-1">
                      <Building2 className="h-5 w-5 text-green-400" />
                      <span className="text-xs text-muted-foreground">PSE</span>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg flex flex-col items-center gap-1">
                      <Smartphone className="h-5 w-5 text-purple-400" />
                      <span className="text-xs text-muted-foreground">Nequi</span>
                    </div>
                  </div>
                </div>

                {/* Total and pay button */}
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Total a pagar</p>
                    <p className="text-3xl font-bold text-primary">{formatPrice(order.total)}</p>
                  </div>

                  <Button 
                    className="w-full h-14 text-lg font-semibold" 
                    size="lg"
                    onClick={handlePayWithWompi}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Lock className="h-5 w-5 mr-2" />
                        Pagar ahora
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Transaccion segura procesada por Wompi</span>
                </div>

                <Separator className="bg-border/50" />

                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Si tienes problemas con el pago, contactanos por WhatsApp.
                  </p>

                  <a
                    href={`https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(`Hola, necesito ayuda para pagar mi pedido ${order.order_number}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" className="w-full bg-transparent">
                      Contactar soporte
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
