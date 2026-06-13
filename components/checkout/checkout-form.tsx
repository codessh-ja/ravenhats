'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CreditCard, Lock, ShoppingBag, Truck, MessageCircle, ChevronLeft, Check } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { formatPrice } from '@/lib/data'
import { toast } from 'sonner'
import { BUSINESS, calculateShippingCost } from '@/lib/constants'
import { validateCheckoutForm, sanitizeInput, checkRateLimit, validDepartments } from '@/lib/validations'

const departments = validDepartments

interface CustomerSession {
  customerId: number
  email: string
  firstName: string
  lastName: string
}

function generateWhatsAppMessage(orderData: {
  orderNumber: string
  customer: { firstName: string; lastName: string; phone: string; email: string }
  shipping: { address: string; city: string; department: string }
  items: { name: string; quantity: number; price: number }[]
  subtotal: number
  shippingCost: number
  total: number
  notes?: string
}): string {
  const itemsList = orderData.items
    .map(item => `- ${item.name} x${item.quantity} = ${formatPrice(item.price * item.quantity)}`)
    .join('\n')

  const message = `*NUEVO PEDIDO - PAGO CONTRA ENTREGA*

*Numero de Pedido:* ${orderData.orderNumber}

*DATOS DEL CLIENTE:*
Nombre: ${orderData.customer.firstName} ${orderData.customer.lastName}
Telefono: ${orderData.customer.phone}
Email: ${orderData.customer.email}

*DIRECCION DE ENVIO:*
${orderData.shipping.address}
${orderData.shipping.city}, ${orderData.shipping.department}

*PRODUCTOS:*
${itemsList}

*RESUMEN:*
Subtotal: ${formatPrice(orderData.subtotal)}
Envio: ${formatPrice(orderData.shippingCost)}
*TOTAL A COBRAR: ${formatPrice(orderData.total)}*

${orderData.notes ? `*Notas:* ${orderData.notes}` : ''}

_Pedido realizado desde ravenhats.store_`

  return encodeURIComponent(message)
}

function DarkInput({ id, label, type = 'text', placeholder, value, onChange, error, required = true }: {
  id: string; label: string; type?: string; placeholder?: string
  value: string; onChange: (v: string) => void; error?: string; required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] text-neutral-500 uppercase tracking-[0.12em] mb-2">{label}</label>
      <input
        id={id} type={type} placeholder={placeholder} value={value} required={required}
        onChange={e => onChange(e.target.value)}
        className={`w-full bg-[#111] border text-white text-[13px] rounded-xl px-4 h-11 placeholder:text-neutral-700 focus:outline-none transition-colors ${error ? 'border-red-500/60' : 'border-[#222] focus:border-[#444]'}`}
      />
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  )
}

export function CheckoutForm() {
  const { items, subtotal, clearCartAfterPayment, setPendingOrder } = useCart()
  const searchParams = useSearchParams()
  const methodParam = searchParams.get('method')
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState(methodParam === 'cod' ? 'cod' : 'wompi')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [customerSession, setCustomerSession] = useState<CustomerSession | null>(null)
  const [formData, setFormData] = useState({
    email: '', firstName: '', lastName: '', phone: '',
    address: '', city: '', department: '', postalCode: '', notes: '',
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('raven_checkout_data')
      if (saved) {
        const p = JSON.parse(saved)
        setFormData(prev => ({
          ...prev,
          firstName: p.firstName || prev.firstName, lastName: p.lastName || prev.lastName,
          phone: p.phone || prev.phone, address: p.address || prev.address,
          city: p.city || prev.city, department: p.department || prev.department,
        }))
      }
    } catch {}

    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          if (data.customer) {
            setCustomerSession(data.customer)
            setFormData(prev => ({
              ...prev,
              email: data.customer.email || prev.email,
              firstName: data.customer.firstName || prev.firstName,
              lastName: data.customer.lastName || prev.lastName,
            }))
          }
        }
      } catch {}
    }
    checkSession()
  }, [])

  const shippingInfo = calculateShippingCost(formData.city, formData.department)
  const shipping = shippingInfo.cost
  const total = subtotal + shipping

  const handleInputChange = (field: string, value: string) => {
    const sanitizedValue = sanitizeInput(value)
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }))
    if (formErrors[field]) {
      setFormErrors(prev => { const n = { ...prev }; delete n[field]; return n })
    }
  }

  const handleCODSubmit = async () => {
    try {
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { email: formData.email, firstName: formData.firstName, lastName: formData.lastName, phone: formData.phone },
          shipping: { addressLine1: formData.address, city: formData.city, department: formData.department, postalCode: formData.postalCode },
          items: items.map(item => ({ productId: parseInt(item.product.id), productName: item.product.name, productImage: item.product.images[0], unitPrice: item.product.price, quantity: item.quantity })),
          subtotal, shippingCost: shipping, total,
          paymentMethod: 'COD', notes: formData.notes,
          customerId: customerSession?.customerId || null,
        }),
      })
      if (!orderResponse.ok) {
        const error = await orderResponse.json()
        throw new Error(error.error || 'Error al crear la orden')
      }
      const { orderNumber } = await orderResponse.json()
      const whatsappMessage = generateWhatsAppMessage({
        orderNumber,
        customer: { firstName: formData.firstName, lastName: formData.lastName, phone: formData.phone, email: formData.email },
        shipping: { address: formData.address, city: formData.city, department: formData.department },
        items: items.map(item => ({ name: item.product.name, quantity: item.quantity, price: item.product.price })),
        subtotal, shippingCost: shipping, total, notes: formData.notes,
      })
      clearCartAfterPayment()
      toast.success('Pedido creado! Redirigiendo a WhatsApp...')
      setTimeout(() => {
        window.open(`https://wa.me/${BUSINESS.whatsapp}?text=${whatsappMessage}`, '_blank')
        window.location.href = `/checkout/confirmacion?order=${orderNumber}&method=cod`
      }, 500)
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar el pedido')
      setIsLoading(false)
    }
  }

  const handleWompiSubmit = async () => {
    try {
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { email: formData.email, firstName: formData.firstName, lastName: formData.lastName, phone: formData.phone },
          shipping: { addressLine1: formData.address, city: formData.city, department: formData.department, postalCode: formData.postalCode },
          items: items.map(item => ({ productId: parseInt(item.product.id), productName: item.product.name, productImage: item.product.images[0], unitPrice: item.product.price, quantity: item.quantity })),
          subtotal, shippingCost: shipping, total,
          paymentMethod: 'WOMPI', notes: formData.notes,
          customerId: customerSession?.customerId || null,
        }),
      })
      if (!orderResponse.ok) {
        const error = await orderResponse.json()
        throw new Error(error.error || 'Error al crear la orden')
      }
      const { orderNumber } = await orderResponse.json()
      const wompiResponse = await fetch('/api/checkout/wompi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, amountInCents: total * 100, customerEmail: formData.email }),
      })
      const wompiConfig = await wompiResponse.json()
      if (!wompiResponse.ok) throw new Error(wompiConfig.error || 'Error al iniciar pago')
      if (!wompiConfig.publicKey) throw new Error('Wompi no está configurado. Contacta al administrador.')
      setPendingOrder(orderNumber)
      const checkoutUrl = new URL('https://checkout.wompi.co/p/')
      checkoutUrl.searchParams.set('public-key', wompiConfig.publicKey)
      checkoutUrl.searchParams.set('currency', 'COP')
      checkoutUrl.searchParams.set('amount-in-cents', wompiConfig.amountInCents.toString())
      checkoutUrl.searchParams.set('reference', wompiConfig.reference)
      checkoutUrl.searchParams.set('signature:integrity', wompiConfig.signature)
      checkoutUrl.searchParams.set('redirect-url', wompiConfig.redirectUrl)
      checkoutUrl.searchParams.set('customer-data:email', formData.email)
      checkoutUrl.searchParams.set('customer-data:full-name', `${formData.firstName} ${formData.lastName}`)
      checkoutUrl.searchParams.set('customer-data:phone-number', formData.phone)
      checkoutUrl.searchParams.set('customer-data:phone-number-prefix', '+57')
      toast.success('Redirigiendo a Wompi...')
      window.location.href = checkoutUrl.toString()
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar el pedido')
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (items.length === 0) { toast.error('Tu carrito está vacío'); return }
    if (!checkRateLimit('checkout-submit', 3, 60000)) {
      toast.error('Demasiados intentos. Por favor espera un momento.'); return
    }
    const validation = validateCheckoutForm(formData)
    if (!validation.isValid) {
      setFormErrors(validation.errors)
      toast.error('Por favor corrige los errores en el formulario')
      return
    }
    setIsLoading(true)
    try {
      localStorage.setItem('raven_checkout_data', JSON.stringify({
        firstName: formData.firstName, lastName: formData.lastName, phone: formData.phone,
        address: formData.address, city: formData.city, department: formData.department,
      }))
    } catch {}
    if (paymentMethod === 'cod') await handleCODSubmit()
    else if (paymentMethod === 'wompi') await handleWompiSubmit()
  }

  // ── Empty cart ──────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <ShoppingBag className="h-10 w-10 text-neutral-700 mb-5" />
        <h2 className="text-xl font-black text-white tracking-tighter mb-2">Carrito vacío</h2>
        <p className="text-neutral-600 text-sm mb-8">Agrega productos antes de continuar</p>
        <Link href="/tienda" className="bg-white text-black text-[12px] font-bold px-8 h-11 rounded-xl flex items-center hover:bg-white/90 transition-colors">
          IR A LA TIENDA
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Trust bar */}
      <div className="flex items-center justify-center gap-4 sm:gap-8 py-3 mb-8 border border-[#1a1a1a] rounded-2xl bg-[#0f0f0f] text-[11px] text-neutral-600 flex-wrap px-4">
        <div className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-neutral-500" /> Datos cifrados SSL</div>
        <div className="flex items-center gap-1.5"><Truck className="h-3 w-3 text-neutral-500" /> Envío a todo Colombia</div>
        <div className="flex items-center gap-1.5"><Check className="h-3 w-3 text-green-500" /> Contraentrega disponible</div>
        <div className="flex items-center gap-1.5"><CreditCard className="h-3 w-3 text-neutral-500" /> Pago protegido por Wompi</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12">

        {/* ── LEFT: Form ─────────────────────────────────────────────────────── */}
        <div className="space-y-8">

          {/* Contact */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-6 h-6 rounded-full bg-white text-black text-[11px] font-black flex items-center justify-center flex-shrink-0">1</span>
              <h2 className="text-[13px] font-bold text-white uppercase tracking-[0.15em]">Contacto</h2>
            </div>
            <div className="space-y-3">
              <DarkInput id="email" label="Correo electrónico" type="email" placeholder="tu@email.com"
                value={formData.email} onChange={v => handleInputChange('email', v)} error={formErrors.email} />
              <DarkInput id="phone" label="Teléfono / WhatsApp" type="tel" placeholder="300 123 4567"
                value={formData.phone} onChange={v => handleInputChange('phone', v)} error={formErrors.phone} />
            </div>
          </div>

          {/* Shipping */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-6 h-6 rounded-full bg-white text-black text-[11px] font-black flex items-center justify-center flex-shrink-0">2</span>
              <h2 className="text-[13px] font-bold text-white uppercase tracking-[0.15em]">Dirección de envío</h2>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <DarkInput id="firstName" label="Nombre" placeholder="Juan"
                  value={formData.firstName} onChange={v => handleInputChange('firstName', v)} error={formErrors.firstName} />
                <DarkInput id="lastName" label="Apellido" placeholder="Pérez"
                  value={formData.lastName} onChange={v => handleInputChange('lastName', v)} error={formErrors.lastName} />
              </div>
              <DarkInput id="address" label="Dirección completa" placeholder="Calle 123 #45-67, Apto 101, Barrio"
                value={formData.address} onChange={v => handleInputChange('address', v)} error={formErrors.address} />
              <div className="grid grid-cols-2 gap-3">
                <DarkInput id="city" label="Ciudad" placeholder="Bogotá"
                  value={formData.city} onChange={v => handleInputChange('city', v)} error={formErrors.city} />
                <div>
                  <label htmlFor="department" className="block text-[11px] text-neutral-500 uppercase tracking-[0.12em] mb-2">Departamento</label>
                  <select
                    id="department"
                    value={formData.department}
                    onChange={e => handleInputChange('department', e.target.value)}
                    required
                    className={`w-full bg-[#111] border text-[13px] rounded-xl px-4 h-11 focus:outline-none transition-colors appearance-none ${formErrors.department ? 'border-red-500/60 text-white' : 'border-[#222] focus:border-[#444] text-white'}`}
                  >
                    <option value="" className="bg-[#111]">Seleccionar</option>
                    {departments.map(d => <option key={d} value={d} className="bg-[#111]">{d}</option>)}
                  </select>
                  {formErrors.department && <p className="text-[11px] text-red-400 mt-1">{formErrors.department}</p>}
                </div>
              </div>

              {/* Shipping cost indicator */}
              {(formData.city || formData.department) && (
                <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-[12px] ${shippingInfo.isFree ? 'bg-green-900/20 border border-green-900/30 text-green-400' : 'bg-[#111] border border-[#1a1a1a] text-neutral-400'}`}>
                  <Truck className="h-3.5 w-3.5 flex-shrink-0" />
                  {shippingInfo.isFree ? '¡Envío GRATIS a Acacias, Meta!' : `Envío: ${formatPrice(shipping)}`}
                </div>
              )}

              <div>
                <label htmlFor="notes" className="block text-[11px] text-neutral-500 uppercase tracking-[0.12em] mb-2">Notas (opcional)</label>
                <textarea
                  id="notes" rows={2} value={formData.notes}
                  onChange={e => handleInputChange('notes', e.target.value)}
                  placeholder="Instrucciones de entrega, referencias, etc."
                  className="w-full bg-[#111] border border-[#222] text-white text-[13px] rounded-xl px-4 py-3 placeholder:text-neutral-700 focus:outline-none focus:border-[#444] transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-6 h-6 rounded-full bg-white text-black text-[11px] font-black flex items-center justify-center flex-shrink-0">3</span>
              <h2 className="text-[13px] font-bold text-white uppercase tracking-[0.15em]">Método de pago</h2>
            </div>
            <div className="space-y-3">
              {/* COD - primero porque convierte más en Colombia */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left relative ${paymentMethod === 'cod' ? 'border-[#25d366]/50 bg-[#25d366]/5' : 'border-[#1a1a1a] bg-[#0f0f0f] hover:border-[#2a2a2a]'}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === 'cod' ? 'border-[#25d366] bg-[#25d366]' : 'border-[#444]'}`}>
                  {paymentMethod === 'cod' && <div className="w-2 h-2 rounded-full bg-black" />}
                </div>
                <Truck className={`h-5 w-5 flex-shrink-0 ${paymentMethod === 'cod' ? 'text-[#25d366]' : 'text-neutral-500'}`} />
                <div className="flex-1">
                  <p className="text-white text-[13px] font-semibold">Contraentrega — No pagas nada ahora</p>
                  <p className="text-neutral-500 text-[11px] mt-0.5">Pagas en efectivo cuando llega tu gorra</p>
                </div>
                <span className="text-[10px] bg-[#25d366]/20 text-[#25d366] px-2 py-1 rounded-full font-semibold shrink-0">
                  El más elegido
                </span>
              </button>

              {paymentMethod === 'cod' && (
                <div className="flex items-start gap-3 bg-[#25d366]/5 border border-[#25d366]/20 rounded-xl p-4">
                  <MessageCircle className="h-4 w-4 text-[#25d366] flex-shrink-0 mt-0.5" />
                  <p className="text-neutral-300 text-[12px] leading-relaxed">
                    Registramos tu pedido ahora y te contactamos por WhatsApp para confirmar. <strong className="text-white">No pagas hasta que llegue</strong> a tu puerta.
                  </p>
                </div>
              )}

              {/* Wompi - segundo */}
              <button
                type="button"
                onClick={() => setPaymentMethod('wompi')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === 'wompi' ? 'border-white/20 bg-white/5' : 'border-[#1a1a1a] bg-[#0f0f0f] hover:border-[#2a2a2a]'}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === 'wompi' ? 'border-white bg-white' : 'border-[#444]'}`}>
                  {paymentMethod === 'wompi' && <div className="w-2 h-2 rounded-full bg-black" />}
                </div>
                <CreditCard className={`h-5 w-5 flex-shrink-0 ${paymentMethod === 'wompi' ? 'text-white' : 'text-neutral-500'}`} />
                <div className="flex-1">
                  <p className="text-white text-[13px] font-semibold">Pago en línea — Inmediato</p>
                  <p className="text-neutral-500 text-[11px] mt-0.5">Tarjeta · PSE · Nequi · Daviplata · Bancolombia</p>
                </div>
                <span className="text-[10px] bg-white/10 text-neutral-400 px-2 py-1 rounded-full shrink-0">Wompi</span>
              </button>

              {paymentMethod === 'wompi' && (
                <div className="flex items-center gap-3 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4">
                  <Lock className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                  <p className="text-neutral-400 text-[12px]">Pago cifrado · Procesado por Wompi (Bancolombia) · Confirmación inmediata</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Order summary ────────────────────────────────────────────── */}
        <div>
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-5 sticky top-24">
            <p className="text-[11px] text-neutral-600 uppercase tracking-[0.2em] mb-4">Tu pedido</p>

            {/* Items */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {items.map(item => (
                <div key={item.product.id} className="flex gap-3">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#1a1a1a] shrink-0">
                    <Image src={item.product.images[0] || '/placeholder.svg'} alt={item.product.name} fill className="object-cover" />
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[12px] font-medium line-clamp-1">{item.product.name}</p>
                    {item.product.collection && <p className="text-neutral-600 text-[10px] mt-0.5">{item.product.collection}</p>}
                    <p className="text-neutral-300 text-[12px] font-bold mt-1">{formatPrice(item.product.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#1a1a1a] my-4" />

            {/* Totals */}
            <div className="space-y-2.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal</span>
                <span className="text-neutral-300">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Envío</span>
                {!formData.city && !formData.department ? (
                  <span className="text-neutral-600 text-[11px] italic">Ingresa tu ciudad</span>
                ) : shippingInfo.isFree ? (
                  <span className="text-green-400 font-medium text-[12px]">GRATIS</span>
                ) : (
                  <span className="text-neutral-300">{formatPrice(shipping)}</span>
                )}
              </div>
            </div>

            <div className="border-t border-[#1a1a1a] my-4" />

            <div className="flex justify-between items-baseline mb-5">
              <span className="text-white font-bold">Total</span>
              <span className="text-white text-xl font-black">{formatPrice(total)}</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full h-13 text-[13px] font-bold tracking-wide rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 py-3.5 ${
                paymentMethod === 'cod'
                  ? 'bg-[#25d366] text-black hover:bg-[#20bf5a]'
                  : 'bg-white text-black hover:bg-white/90'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Procesando...
                </>
              ) : paymentMethod === 'cod' ? (
                <>
                  <Truck className="h-4 w-4" />
                  Confirmar — Pago al recibir · {formatPrice(total)}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Pagar {formatPrice(total)} de forma segura
                </>
              )}
            </button>

            {/* Trust */}
            <div className="mt-4 space-y-2">
              {[
                { icon: Lock, text: 'Datos encriptados y seguros' },
                { icon: Truck, text: 'Entrega en 2-5 días hábiles' },
                { icon: Check, text: '100% originales Goorin Bros' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-[11px] text-neutral-600">
                  <Icon className="h-3 w-3 flex-shrink-0" />
                  {text}
                </div>
              ))}
            </div>

            <Link href="/carrito" className="flex items-center justify-center gap-1.5 mt-5 text-[12px] text-neutral-600 hover:text-neutral-400 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
              Volver al carrito
            </Link>
          </div>
        </div>
      </div>
    </form>
  )
}
