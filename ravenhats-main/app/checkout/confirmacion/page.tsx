'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, Package, MessageCircle, CreditCard, XCircle, Loader2, Clock, Mail, ArrowRight, ShoppingBag, Truck } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { BUSINESS } from '@/lib/constants'
import { useCart } from '@/lib/cart-context'
import { formatPrice } from '@/lib/data'
import { useSearchParams } from 'next/navigation'

interface OrderItem {
  id?: number
  productName: string
  productImage?: string
  quantity: number
  unitPrice: number
  subtotal?: number
}

interface OrderData {
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string
  total: number
  subtotal?: number
  shippingCost?: number
  customer: {
    firstName: string
    lastName: string
    email: string
  }
  items: OrderItem[]
}

// Extrae el numero de orden original de una referencia unica de pago
// La referencia tiene formato: RH-XXXXXX-{timestamp}-{random}
// El order_number es: RH-XXXXXX
function extractOrderNumber(reference: string): string {
  const parts = reference.split('-')
  if (parts.length >= 2 && parts[0] === 'RH') {
    return `${parts[0]}-${parts[1]}`
  }
  return reference
}

function ConfirmationLoading() {
  return (
    <>
      <Header />
      <main className="pt-[73px] min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-2xl px-4 lg:px-8 text-center">
            <div className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 animate-pulse">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-balance">Verificando tu pedido...</h1>
            <p className="text-muted-foreground text-lg">Por favor espera mientras confirmamos el estado de tu pago</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

function ConfirmationContent() {
  const searchParams = useSearchParams()
  // Wompi regresa con ?ref={uniquePaymentReference}&order={orderNumber}&id=WOMPI_TRANSACTION_ID
  // ref: referencia unica de pago (RH-XXXXXX-timestamp-random)
  // order: numero de orden real (RH-XXXXXX)
  // Prioridad: order > extraer de ref > usar localStorage
  const refParam = searchParams.get('ref')
  const orderParam = searchParams.get('order')
  // Si tenemos order directamente, usarlo. Si no, extraer de ref
  const orderNumber = orderParam || (refParam ? extractOrderNumber(refParam) : null)
  const paymentMethodParam = searchParams.get('method')
  
  const { clearCartAfterPayment, getPendingOrder, clearPendingOrder } = useCart()
  
  const [loading, setLoading] = useState(true)
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Prevent duplicate fetches and cart clearing
  const hasProcessed = useRef(false)
  const hasClearedCart = useRef(false)

  useEffect(() => {
    let retryCount = 0
    const maxRetries = 5
    let pollInterval: NodeJS.Timeout | null = null
    let isMounted = true
    
    async function verifyPaymentWithWompi(orderNum: string): Promise<any> {
      // Verificar directamente con Wompi a traves de nuestro endpoint
      // Este endpoint SOLO verifica estado, NO envia emails (eso es del webhook)
      try {
        const verifyResponse = await fetch('/api/orders/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderNumber: orderNum })
        })
        
        if (verifyResponse.ok) {
          return verifyResponse.json()
        }
      } catch (e) {
        console.error('[Confirmation] Error verificando pago:', e)
      }
      return null
    }

    async function fetchOrderStatus() {
      if (!isMounted) return
      
      // Buscar orden pendiente en localStorage o usar el parametro
      const pendingOrder = getPendingOrder()
      const orderToCheck = orderNumber || pendingOrder?.orderNumber

      // Si es COD, obtener datos completos de la orden
      if (paymentMethodParam === 'cod' && orderToCheck) {
        try {
          const response = await fetch(`/api/orders?orderNumber=${orderToCheck}`)
          if (response.ok) {
            const data = await response.json()
            if (isMounted) {
              setOrderData({
                orderNumber: data.orderNumber,
                status: 'confirmed',
                paymentStatus: 'pending',
                paymentMethod: 'COD',
                total: data.total,
                subtotal: data.subtotal,
                shippingCost: data.shippingCost,
                customer: data.customer,
                items: data.items || []
              })
            }
          } else {
            // Fallback si no podemos obtener datos
            setOrderData({
              orderNumber: orderToCheck,
              status: 'confirmed',
              paymentStatus: 'pending',
              paymentMethod: 'COD',
              total: 0,
              customer: { firstName: '', lastName: '', email: '' },
              items: []
            })
          }
        } catch {
          setOrderData({
            orderNumber: orderToCheck,
            status: 'confirmed',
            paymentStatus: 'pending',
            paymentMethod: 'COD',
            total: 0,
            customer: { firstName: '', lastName: '', email: '' },
            items: []
          })
        }
        
        setLoading(false)
        
        // Limpiar carrito solo una vez
        if (!hasClearedCart.current) {
          hasClearedCart.current = true
          clearCartAfterPayment()
          clearPendingOrder()
        }
        return
      }

      if (!orderToCheck) {
        setError('No se encontro informacion del pedido. Por favor contactanos por WhatsApp.')
        setLoading(false)
        return
      }

      try {
        // Verificar el pago directamente con Wompi a traves de nuestro endpoint
        // NOTA: El endpoint verify-payment ya NO envia emails, solo verifica estado
        const wompiVerification = await verifyPaymentWithWompi(orderToCheck)
        
        if (wompiVerification && wompiVerification.status === 'approved') {
          // Pago confirmado por Wompi - obtener datos de la orden
          const response = await fetch(`/api/orders?orderNumber=${orderToCheck}`)
          if (response.ok) {
            const data = await response.json()
            
            // VALIDACION: El monto NUNCA debe ser 0 para pagos aprobados
            const displayTotal = data.paidAmount || data.total || 0
            if (displayTotal === 0) {
              console.error('[Confirmation] ERROR: Monto $0 detectado para orden aprobada:', {
                orderNumber: data.orderNumber,
                total: data.total,
                paidAmount: data.paidAmount
              })
            }
            
            if (isMounted) {
              setOrderData({
                orderNumber: data.orderNumber,
                status: data.status,
                paymentStatus: 'approved',
                paymentMethod: data.paymentMethod || 'WOMPI',
                total: displayTotal, // Usar paidAmount como prioridad
                subtotal: data.subtotal,
                shippingCost: data.shippingCost,
                customer: data.customer,
                items: data.items || []
              })
              
              // Limpiar carrito solo una vez
              if (!hasClearedCart.current) {
                hasClearedCart.current = true
                clearCartAfterPayment()
                clearPendingOrder()
              }
              setLoading(false)
            }
            return
          }
        }

        // Si Wompi dice rechazado
        if (wompiVerification && wompiVerification.status === 'rejected') {
          if (isMounted) {
            setOrderData({
              orderNumber: orderToCheck,
              status: 'cancelled',
              paymentStatus: 'rejected',
              paymentMethod: 'WOMPI',
              total: 0,
              customer: { firstName: '', lastName: '', email: '' },
              items: []
            })
            setLoading(false)
          }
          return
        }

        // Si el pago esta pendiente o no se encontro en Wompi, obtener datos de la orden desde nuestra BD
        const response = await fetch(`/api/orders?orderNumber=${orderToCheck}`)
        
        if (!response.ok) {
          if (response.status >= 500 && retryCount < maxRetries) {
            retryCount++
            setTimeout(fetchOrderStatus, 2000)
            return
          }
          throw new Error('Error al verificar el pedido')
        }

        const data = await response.json()
        
        if (isMounted) {
          setOrderData({
            orderNumber: data.orderNumber,
            status: data.status,
            paymentStatus: data.paymentStatus,
            paymentMethod: data.paymentMethod,
            total: data.total,
            subtotal: data.subtotal,
            shippingCost: data.shippingCost,
            customer: data.customer,
            items: data.items || []
          })

          // Si el pago ya fue aprobado (por webhook), limpiar carrito
          if (data.paymentStatus === 'approved') {
            if (!hasClearedCart.current) {
              hasClearedCart.current = true
              clearCartAfterPayment()
              clearPendingOrder()
            }
          }
        }
      } catch (err: any) {
        if (orderToCheck && retryCount >= maxRetries) {
          setError('connection_issue')
        } else if (!orderToCheck) {
          setError(err.message || 'Error al verificar el estado del pedido')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // Ejecutar verificacion inicial solo una vez
    if (!hasProcessed.current) {
      hasProcessed.current = true
      fetchOrderStatus()
    }
    
    // Polling para pagos pendientes - verificar cada 4 segundos (reducido para menor carga)
    pollInterval = setInterval(() => {
      if (orderData?.paymentStatus === 'pending' && orderData?.paymentMethod !== 'COD') {
        fetchOrderStatus()
      }
    }, 4000)

    // Dejar de verificar despues de 2 minutos
    const timeout = setTimeout(() => {
      if (pollInterval) clearInterval(pollInterval)
    }, 120000)

    return () => {
      isMounted = false
      if (pollInterval) clearInterval(pollInterval)
      clearTimeout(timeout)
    }
  }, [orderNumber, paymentMethodParam, getPendingOrder, clearCartAfterPayment, clearPendingOrder, orderData?.paymentStatus, orderData?.paymentMethod])

  const isCOD = paymentMethodParam === 'cod' || orderData?.paymentMethod === 'COD'
  const isPending = orderData?.paymentStatus === 'pending'
  const isApproved = orderData?.paymentStatus === 'approved'
  const isRejected = orderData?.paymentStatus === 'rejected'
  const hasItems = orderData?.items && orderData.items.length > 0

  // Loading state
  if (loading) {
    return (
      <>
        <Header />
        <main className="pt-[73px] min-h-screen bg-gradient-to-b from-background to-secondary/20">
          <section className="py-16 lg:py-24">
            <div className="mx-auto max-w-2xl px-4 lg:px-8 text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 animate-pulse">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-4 text-balance">Verificando tu pedido...</h1>
              <p className="text-muted-foreground text-lg">Por favor espera mientras confirmamos el estado de tu pago</p>
            </div>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  // Error state
  if (error) {
    const hasOrderNumber = orderNumber || getPendingOrder()?.orderNumber
    const isConnectionIssue = error === 'connection_issue' || hasOrderNumber
    
    return (
      <>
        <Header />
        <main className="pt-[73px] min-h-screen bg-gradient-to-b from-background to-secondary/20">
          <section className="py-16 lg:py-24">
            <div className="mx-auto max-w-2xl px-4 lg:px-8 text-center">
              {isConnectionIssue && hasOrderNumber ? (
                <>
                  <div className="mx-auto h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center mb-8">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                  <h1 className="text-3xl font-bold mb-4">Pedido Registrado</h1>
                  
                  <div className="bg-card border rounded-2xl p-6 mb-8 shadow-sm">
                    <p className="text-sm text-muted-foreground mb-2">Numero de pedido</p>
                    <p className="text-2xl font-bold font-mono tracking-wider">{hasOrderNumber}</p>
                  </div>
                  
                  <p className="text-muted-foreground mb-6">
                    Si tu pago fue exitoso en Wompi, tu pedido sera procesado automaticamente.
                  </p>
                  
                  <div className="bg-secondary/50 rounded-xl p-6 mb-8 text-left">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Proximos pasos
                    </h2>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                        <span>Recibiras un correo de confirmacion cuando el pago sea verificado</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">2</span>
                        <span>Prepararemos tu pedido en 1-2 dias habiles</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">3</span>
                        <span>Te enviaremos el numero de guia cuando despachemos</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                      href={`https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(`Hola! Acabo de realizar un pago para el pedido ${hasOrderNumber} y quiero confirmar que se proceso correctamente.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="lg" className="w-full sm:w-auto">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Confirmar por WhatsApp
                      </Button>
                    </a>
                    <Link href="/tienda">
                      <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                        Seguir comprando
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center mb-8">
                    <XCircle className="h-12 w-12 text-destructive" />
                  </div>
                  <h1 className="text-3xl font-bold mb-4">Error</h1>
                  <p className="text-muted-foreground mb-8">{error}</p>
                  <Link href="/tienda">
                    <Button size="lg">Volver a la tienda</Button>
                  </Link>
                </>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  // Main confirmation view
  return (
    <>
      <Header />
      <main className="pt-[73px] min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <section className="py-12 lg:py-20">
          <div className="mx-auto max-w-3xl px-4 lg:px-8">
            
            {/* Status Banner */}
            <div className={`rounded-3xl p-8 mb-8 text-center ${
              isRejected 
                ? 'bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/20' 
                : isPending && !isCOD
                  ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/20'
                  : 'bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20'
            }`}>
              {/* Icon */}
              <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center mb-6 ${
                isRejected 
                  ? 'bg-destructive/20' 
                  : isPending && !isCOD 
                    ? 'bg-yellow-500/20' 
                    : 'bg-green-500/20'
              }`}>
                {isRejected ? (
                  <XCircle className="h-10 w-10 text-destructive" />
                ) : isPending && !isCOD ? (
                  <Clock className="h-10 w-10 text-yellow-600" />
                ) : (
                  <CheckCircle className="h-10 w-10 text-green-600" />
                )}
              </div>
              
              {/* Title */}
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3 text-balance">
                {isRejected 
                  ? 'Pago Rechazado' 
                  : isCOD 
                    ? 'Pedido Confirmado' 
                    : isPending 
                      ? 'Verificando Pago...' 
                      : 'Pago Confirmado'}
              </h1>
              
              {/* Subtitle */}
              <p className="text-muted-foreground text-lg mb-4">
                {isRejected 
                  ? 'Tu pago no pudo ser procesado'
                  : isCOD 
                    ? 'Tu pedido ha sido registrado exitosamente' 
                    : isPending 
                      ? 'Estamos verificando tu pago con el banco' 
                      : 'Gracias por tu compra'}
              </p>
              
              {/* Order number badge */}
              <div className="inline-flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-6 py-3 border shadow-sm">
                <span className="text-sm text-muted-foreground">Pedido</span>
                <span className="font-bold font-mono text-lg">{orderData?.orderNumber || orderNumber}</span>
              </div>
            </div>

            {/* Payment Status Card - Only for online payments */}
            {!isCOD && !isRejected && (
              <div className="bg-card border rounded-2xl p-6 mb-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                    isPending ? 'bg-yellow-500/10' : 'bg-green-500/10'
                  }`}>
                    {isPending ? (
                      <Loader2 className="h-6 w-6 animate-spin text-yellow-600" />
                    ) : (
                      <CreditCard className="h-6 w-6 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {isPending ? 'Verificando pago...' : 'Pago confirmado'}
                    </h3>
                    {isPending ? (
                      <p className="text-sm text-muted-foreground">
                        Esta pagina se actualizara automaticamente
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {orderData?.total && orderData.total > 0 
                          ? `${formatPrice(orderData.total)} via Wompi`
                          : 'Monto verificado via Wompi'}
                      </p>
                    )}
                  </div>
                  {!isPending && (
                    <div className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-500/10 rounded-full px-3 py-1">
                      <Mail className="h-3 w-3" />
                      <span>Email enviado</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* COD Info Card */}
            {isCOD && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Pago contra entrega</h3>
                    <p className="text-sm text-muted-foreground">
                      Paga {formatPrice(orderData?.total || 0)} al recibir tu pedido
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Rejected state - retry button */}
            {isRejected && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 mb-6 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Esto puede deberse a fondos insuficientes, datos incorrectos o un problema temporal con tu banco.
                </p>
                <Link href="/checkout">
                  <Button size="lg">
                    Intentar de nuevo
                  </Button>
                </Link>
              </div>
            )}

            {/* Order Items - Premium Display */}
            {hasItems && !isRejected && (
              <div className="bg-card border rounded-2xl p-6 mb-6 shadow-sm">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Tu pedido
                </h3>
                <div className="space-y-4">
                  {orderData?.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      {/* Product Image */}
                      <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                        {item.productImage ? (
                          <Image
                            src={item.productImage}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          Cantidad: {item.quantity}
                        </p>
                      </div>
                      
                      {/* Price */}
                      <p className="font-semibold">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
                
                {/* Order Totals */}
                <div className="border-t mt-4 pt-4 space-y-2">
                  {orderData?.subtotal && orderData.subtotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(orderData.subtotal)}</span>
                    </div>
                  )}
                  {orderData?.shippingCost !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Envio</span>
                      <span>{orderData.shippingCost === 0 ? 'Gratis' : formatPrice(orderData.shippingCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>
                      {orderData?.total && orderData.total > 0 
                        ? formatPrice(orderData.total)
                        : 'Verificando...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Next Steps */}
            {!isRejected && (
              <div className="bg-card border rounded-2xl p-6 mb-6 shadow-sm">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Proximos pasos
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium">
                        {isCOD 
                          ? 'Confirmacion' 
                          : isPending 
                            ? 'Verificacion de pago' 
                            : 'Email de confirmacion'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isCOD 
                          ? 'Te contactaremos por WhatsApp para confirmar tu pedido'
                          : isPending
                            ? 'Una vez confirmado el pago, recibiras un correo'
                            : 'Revisa tu bandeja de entrada para ver los detalles'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Preparacion</p>
                      <p className="text-sm text-muted-foreground">
                        Tu pedido sera preparado en 1-2 dias habiles
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Envio</p>
                      <p className="text-sm text-muted-foreground">
                        Recibiras un numero de seguimiento cuando despachemos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
                      4
                    </div>
                    <div>
                      <p className="font-medium">Entrega</p>
                      <p className="text-sm text-muted-foreground">
                        {isCOD 
                          ? 'Paga al recibir - Tiempo estimado: 3-5 dias habiles'
                          : 'Tiempo estimado: 3-5 dias habiles segun ubicacion'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isRejected && (
                <Link href="/mi-cuenta">
                  <Button size="lg" className="w-full sm:w-auto">
                    Ver estado de mi pedido
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Link href="/tienda">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                  Seguir comprando
                </Button>
              </Link>
            </div>

            {/* Contact Footer */}
            {!isRejected && (
              <div className="mt-10 pt-8 border-t text-center">
                <p className="text-sm text-muted-foreground mb-4">Te mantendremos informado por:</p>
                <div className="flex justify-center gap-6 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>Correo electronico</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>WhatsApp</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tienes preguntas?{' '}
                  <a 
                    href={BUSINESS.whatsappLink}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-foreground underline hover:text-primary transition-colors font-medium"
                  >
                    Escribenos por WhatsApp
                  </a>
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

// CRITICAL: Wrap in Suspense to fix Next.js useSearchParams() error
export default function ConfirmationPage() {
  return (
    <Suspense fallback={<ConfirmationLoading />}>
      <ConfirmationContent />
    </Suspense>
  )
}

