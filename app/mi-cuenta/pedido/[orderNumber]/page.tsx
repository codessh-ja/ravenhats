'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Package, Clock, CheckCircle, Truck, XCircle,
  MapPin, Phone, Mail, ExternalLink, CreditCard, AlertCircle,
  Copy, Check, MessageCircle,
} from 'lucide-react'
import { formatPrice } from '@/lib/data'
import { BUSINESS } from '@/lib/constants'
import { toast } from 'sonner'

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
  customer_phone: string
  shipping_address_line1: string
  shipping_city: string
  shipping_department: string
  subtotal: number
  shipping_cost: number
  total: number
  status: string
  payment_status: string
  payment_method: string
  tracking_number?: string
  tracking_url?: string
  created_at: string
  items: OrderItem[]
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string; step: number; description: string }> = {
  pending:    { label: 'Esperando pago',  icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20',   step: 0, description: 'Completa el pago para procesar tu pedido' },
  confirmed:  { label: 'Confirmado',      icon: CheckCircle, color: 'text-blue-400',    bg: 'bg-blue-400/10 border-blue-400/20',     step: 1, description: 'Recibimos tu pago, pronto empezamos a prepararlo' },
  processing: { label: 'Preparando',      icon: Package,     color: 'text-purple-400',  bg: 'bg-purple-400/10 border-purple-400/20', step: 2, description: 'Estamos empacando tu pedido con cuidado' },
  shipped:    { label: 'En camino',       icon: Truck,       color: 'text-indigo-400',  bg: 'bg-indigo-400/10 border-indigo-400/20', step: 3, description: 'Tu pedido está viajando hacia ti' },
  delivered:  { label: 'Entregado',       icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', step: 4, description: '¡Tu pedido llegó! Disfrútalo' },
  cancelled:  { label: 'Cancelado',       icon: XCircle,     color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20',       step: -1, description: 'Este pedido fue cancelado' },
}

const STEPS = [
  { key: 'confirmed',  label: 'Confirmado', icon: CheckCircle },
  { key: 'processing', label: 'Preparando', icon: Package },
  { key: 'shipped',    label: 'En camino',  icon: Truck },
  { key: 'delivered',  label: 'Entregado',  icon: CheckCircle },
]

export default function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => { fetchOrder() }, [orderNumber])

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/mi-cuenta/pedidos/${orderNumber}`)
      if (res.status === 401) { router.push('/login'); return }
      const data = await res.json()
      if (data.error) { router.push('/mi-cuenta'); return }
      setOrder(data.order)
    } catch {
      router.push('/mi-cuenta')
    } finally {
      setLoading(false)
    }
  }

  const copyTracking = () => {
    if (order?.tracking_number) {
      navigator.clipboard.writeText(order.tracking_number)
      setCopied(true)
      toast.success('Número de guía copiado')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) return null

  const status = statusConfig[order.status] ?? statusConfig.pending
  const StatusIcon = status.icon

  return (
    <main className="min-h-screen bg-[#0a0a0a]">

      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-[#161616] bg-[#0a0a0a]/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-5 flex items-center justify-between h-14">
          <Link href="/mi-cuenta" className="flex items-center gap-2 text-[12px] text-neutral-500 hover:text-white tracking-widest transition-colors">
            <ArrowLeft className="h-4 w-4" />
            MIS PEDIDOS
          </Link>
          <a
            href={`https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(`Hola, tengo una consulta sobre mi pedido ${order.order_number}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-[#25d366] transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Necesito ayuda
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-10">

        {/* Order header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <p className="text-neutral-600 text-[11px] tracking-[0.2em] uppercase mb-1">Pedido</p>
              <h1 className="text-2xl font-black tracking-tight text-white">{order.order_number}</h1>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-semibold ${status.bg} ${status.color}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {status.label}
            </div>
          </div>
          <p className="text-neutral-600 text-[12px]">
            {new Date(order.created_at).toLocaleDateString('es-CO', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        {/* Alerts */}
        {order.payment_status === 'pending' && order.status !== 'cancelled' && order.payment_method !== 'COD' && (
          <div className="mb-6 flex items-center justify-between gap-4 p-4 bg-amber-400/5 border border-amber-400/20 rounded-2xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-amber-300">Pago pendiente</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Tu pedido está reservado. Completa el pago para procesarlo.</p>
              </div>
            </div>
            <Link
              href={`/checkout/pagar/${order.order_number}`}
              className="flex items-center gap-1.5 bg-amber-400 text-black text-[12px] font-bold px-4 h-9 rounded-xl hover:bg-amber-300 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Pagar ahora
            </Link>
          </div>
        )}

        {order.payment_method === 'COD' && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl">
            <Truck className="h-4 w-4 text-neutral-500 flex-shrink-0" />
            <p className="text-[13px] text-neutral-400">
              Pagarás <span className="text-white font-bold">{formatPrice(order.total)}</span> en efectivo al mensajero cuando recibas tu pedido.
            </p>
          </div>
        )}

        {/* Progress tracker */}
        {order.status !== 'cancelled' && (
          <div className="mb-6 bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-6">
            <div className="flex items-center justify-between relative">
              {/* Track line */}
              <div className="absolute top-5 left-0 right-0 h-px bg-[#222] mx-6" />
              <div
                className="absolute top-5 left-6 h-px bg-white transition-all duration-500"
                style={{ width: `calc(${Math.max(0, (status.step - 1) / (STEPS.length - 1)) * 100}% - 48px + ${Math.max(0, (status.step - 1) / (STEPS.length - 1)) * 24}px)` }}
              />
              {STEPS.map((step, i) => {
                const isComplete = status.step >= i + 1
                const isCurrent = status.step === i + 1
                const StepIcon = step.icon
                return (
                  <div key={step.key} className="flex flex-col items-center gap-2 relative z-10 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isComplete ? 'bg-white' : isCurrent ? 'bg-white/10 border border-white/30' : 'bg-[#161616] border border-[#2a2a2a]'
                    }`}>
                      <StepIcon className={`h-4 w-4 ${isComplete ? 'text-black' : isCurrent ? 'text-white' : 'text-neutral-700'}`} />
                    </div>
                    <p className={`text-[10px] text-center ${isComplete || isCurrent ? 'text-white' : 'text-neutral-700'}`}>
                      {step.label}
                    </p>
                  </div>
                )
              })}
            </div>

            <p className={`text-center text-[12px] mt-5 ${status.color}`}>{status.description}</p>

            {order.tracking_number && (
              <div className="mt-5 pt-5 border-t border-[#1a1a1a] flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] text-neutral-600 mb-1">Número de guía</p>
                  <div className="flex items-center gap-2">
                    <code className="text-[15px] font-mono font-bold text-white">{order.tracking_number}</code>
                    <button onClick={copyTracking} className="text-neutral-600 hover:text-white transition-colors p-1">
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                {order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 border border-[#2a2a2a] text-neutral-400 hover:text-white hover:border-[#444] text-[12px] px-3 h-8 rounded-lg transition-all"
                  >
                    Rastrear
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {order.status === 'cancelled' && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-red-400/5 border border-red-400/20 rounded-2xl">
            <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <p className="text-[13px] text-neutral-400">
              Este pedido fue cancelado. Si tienes preguntas, <a href={`https://wa.me/${BUSINESS.whatsapp}`} className="text-white underline underline-offset-2">escríbenos por WhatsApp</a>.
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4">

          {/* Products */}
          <div className="lg:col-span-2">
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1a1a1a]">
                <h2 className="text-[12px] font-bold text-white tracking-[0.15em] uppercase">
                  Productos ({order.items?.length ?? 0})
                </h2>
              </div>
              <div className="divide-y divide-[#1a1a1a]">
                {order.items?.map(item => (
                  <div key={item.id} className="flex gap-4 p-5">
                    <div className="relative w-16 h-16 rounded-xl bg-[#161616] border border-[#222] overflow-hidden flex-shrink-0">
                      {item.productImage ? (
                        <Image src={item.productImage} alt={item.productName} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-neutral-700" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{item.productName}</p>
                      <p className="text-[11px] text-neutral-600 mt-0.5">
                        {item.quantity} × {formatPrice(item.unitPrice)}
                      </p>
                    </div>
                    <p className="text-[14px] font-black text-white flex-shrink-0">{formatPrice(item.subtotal)}</p>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-[#1a1a1a] bg-[#0a0a0a] space-y-2">
                <div className="flex justify-between text-[12px] text-neutral-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[12px] text-neutral-500">
                  <span>Envío</span>
                  <span>{order.shipping_cost === 0 ? 'GRATIS' : formatPrice(order.shipping_cost)}</span>
                </div>
                <div className="flex justify-between text-[15px] font-black text-white pt-2 border-t border-[#1a1a1a]">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Shipping */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1a1a1a]">
                <MapPin className="h-3.5 w-3.5 text-neutral-600" />
                <h3 className="text-[12px] font-bold text-white tracking-[0.15em] uppercase">Dirección</h3>
              </div>
              <div className="p-5 space-y-2">
                <p className="text-[13px] font-semibold text-white">
                  {order.customer_first_name} {order.customer_last_name}
                </p>
                <p className="text-[12px] text-neutral-500">{order.shipping_address_line1}</p>
                <p className="text-[12px] text-neutral-500">{order.shipping_city}, {order.shipping_department}</p>
                {order.customer_phone && (
                  <a href={`tel:${order.customer_phone}`} className="flex items-center gap-2 text-[12px] text-neutral-600 hover:text-white transition-colors pt-1">
                    <Phone className="h-3 w-3" />{order.customer_phone}
                  </a>
                )}
                <a href={`mailto:${order.customer_email}`} className="flex items-center gap-2 text-[12px] text-neutral-600 hover:text-white transition-colors">
                  <Mail className="h-3 w-3" />{order.customer_email}
                </a>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1a1a1a]">
                <CreditCard className="h-3.5 w-3.5 text-neutral-600" />
                <h3 className="text-[12px] font-bold text-white tracking-[0.15em] uppercase">Pago</h3>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-neutral-600">Método</span>
                  <span className="text-[12px] font-semibold text-white">
                    {order.payment_method === 'COD' ? 'Contra entrega' :
                     order.payment_method === 'WOMPI' ? 'Wompi' : order.payment_method}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-neutral-600">Estado</span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    order.payment_status === 'approved' ? 'bg-emerald-400/10 text-emerald-400' :
                    order.payment_status === 'rejected' ? 'bg-red-400/10 text-red-400' :
                    'bg-amber-400/10 text-amber-400'
                  }`}>
                    {order.payment_status === 'approved' ? 'Pagado' :
                     order.payment_status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#1a1a1a]">
                  <span className="text-[12px] text-neutral-600">Total</span>
                  <span className="text-[15px] font-black text-white">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}
