'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Package, Clock, CheckCircle, Truck, XCircle,
  LogOut, ChevronRight, ShoppingBag, CreditCard,
  User2, Settings, ArrowRight, LayoutDashboard,
} from 'lucide-react'
import { formatPrice } from '@/lib/data'

interface Order {
  id: number
  order_number: string
  total: number
  status: string
  payment_status: string
  created_at: string
  item_count: number
  tracking_number?: string
}

interface Customer {
  customerId: number
  email: string
  firstName: string
  lastName: string
}

const statusConfig: Record<string, { label: string; icon: any; dot: string; iconColor: string }> = {
  pending:    { label: 'Esperando pago',  icon: Clock,         dot: 'bg-amber-400',   iconColor: 'text-amber-400' },
  confirmed:  { label: 'Confirmado',      icon: CheckCircle,   dot: 'bg-blue-400',    iconColor: 'text-blue-400' },
  processing: { label: 'Preparando',      icon: Package,       dot: 'bg-purple-400',  iconColor: 'text-purple-400' },
  shipped:    { label: 'En camino',       icon: Truck,         dot: 'bg-indigo-400',  iconColor: 'text-indigo-400' },
  delivered:  { label: 'Entregado',       icon: CheckCircle,   dot: 'bg-emerald-400', iconColor: 'text-emerald-400' },
  cancelled:  { label: 'Cancelado',       icon: XCircle,       dot: 'bg-red-400',     iconColor: 'text-red-400' },
}

export default function MiCuentaPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders]     = useState<Order[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { init() }, [])

  const init = async () => {
    try {
      const res  = await fetch('/api/auth/session')
      const data = await res.json()
      if (!data.authenticated) { router.push('/login'); return }
      setCustomer(data.customer)
      const ordRes  = await fetch('/api/mi-cuenta/pedidos')
      const ordData = await ordRes.json()
      setOrders(ordData.orders || [])
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  const pendingOrders = orders.filter(o => o.payment_status === 'pending' && o.status !== 'cancelled')
  const inTransit     = orders.filter(o => o.status === 'shipped')
  const delivered     = orders.filter(o => o.status === 'delivered')
  const totalSpent    = orders.filter(o => o.payment_status === 'approved').reduce((sum, o) => sum + Number(o.total), 0)
  const initials      = customer
    ? `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`.toUpperCase()
    : ''

  return (
    <main className="min-h-screen bg-[#0a0a0a]">

      {/* ── Mobile header ── */}
      <div className="lg:hidden sticky top-0 z-20 border-b border-[#161616] bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="px-4 flex items-center justify-between h-14">
          <Link href="/" className="text-[12px] text-neutral-500 hover:text-white tracking-widest transition-colors">
            ← TIENDA
          </Link>
          <p className="text-[13px] font-bold text-white">MI CUENTA</p>
          <button onClick={handleLogout} className="text-[12px] text-neutral-500 hover:text-red-400 transition-colors">
            Salir
          </button>
        </div>
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <span className="shrink-0 px-3.5 py-1.5 rounded-full bg-white text-black text-[11px] font-bold">
            Inicio
          </span>
          <Link
            href="/mi-cuenta/configuracion"
            className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#1a1a1a] border border-[#222] text-neutral-400 hover:text-white text-[11px] transition-colors"
          >
            Configuración
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-7 lg:py-10">
        <div className="flex gap-6">

          {/* ── Sidebar (desktop) ── */}
          <aside className="hidden lg:flex flex-col gap-4 w-[220px] shrink-0">

            {/* Profile card */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-5 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#181818] border border-[#262626] flex items-center justify-center">
                {initials ? (
                  <span className="text-[18px] font-black text-neutral-400">{initials}</span>
                ) : (
                  <User2 className="h-6 w-6 text-neutral-500" />
                )}
              </div>
              <div className="min-w-0 w-full">
                <p className="text-[14px] font-bold text-white leading-snug">
                  {customer?.firstName} {customer?.lastName}
                </p>
                <p className="text-neutral-600 text-[11px] mt-1 break-all leading-snug">{customer?.email}</p>
              </div>
              {totalSpent > 0 && (
                <div className="w-full pt-3 border-t border-[#1a1a1a]">
                  <p className="text-[10px] text-neutral-600 tracking-wider uppercase">Total gastado</p>
                  <p className="text-[15px] font-black text-white mt-0.5">{formatPrice(totalSpent)}</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl overflow-hidden divide-y divide-[#1a1a1a]">
              <div className="flex items-center gap-3 px-4 py-3.5 bg-white/[0.04] text-white text-[13px] font-semibold">
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                Mi cuenta
              </div>
              <Link
                href="/mi-cuenta/configuracion"
                className="flex items-center gap-3 px-4 py-3.5 text-neutral-500 hover:text-white hover:bg-white/[0.03] text-[13px] transition-all"
              >
                <Settings className="h-4 w-4 shrink-0" />
                Configuración
              </Link>
            </nav>

            {/* Quick links */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl overflow-hidden divide-y divide-[#1a1a1a]">
              <Link
                href="/tienda"
                className="flex items-center gap-3 px-4 py-3.5 text-neutral-500 hover:text-white hover:bg-white/[0.03] text-[13px] transition-all"
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                Ir a la tienda
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-neutral-600 hover:text-red-400 hover:bg-red-500/5 text-[13px] transition-all"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Cerrar sesión
              </button>
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Greeting (desktop) */}
            <div className="hidden lg:block">
              <p className="text-neutral-600 text-[10px] tracking-[0.3em] uppercase mb-1">Panel de usuario</p>
              <h1 className="text-[24px] font-black text-white tracking-tight">
                Hola, {customer?.firstName}
              </h1>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Pedidos totales',  value: orders.length,        color: 'text-white',        border: 'border-[#1a1a1a]' },
                { label: 'Pago pendiente',   value: pendingOrders.length, color: 'text-amber-400',    border: pendingOrders.length  ? 'border-amber-400/25'  : 'border-[#1a1a1a]' },
                { label: 'En camino',        value: inTransit.length,     color: 'text-indigo-400',   border: inTransit.length      ? 'border-indigo-400/25' : 'border-[#1a1a1a]' },
                { label: 'Entregados',       value: delivered.length,     color: 'text-emerald-400',  border: delivered.length      ? 'border-emerald-400/25': 'border-[#1a1a1a]' },
              ].map(s => (
                <div key={s.label} className={`bg-[#0f0f0f] border ${s.border} rounded-2xl px-5 py-4`}>
                  <p className={`text-2xl font-black tracking-tight ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-neutral-600 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Pending payment alerts */}
            {pendingOrders.length > 0 && (
              <div className="space-y-2">
                {pendingOrders.slice(0, 2).map(order => (
                  <Link
                    key={order.id}
                    href={`/mi-cuenta/pedido/${order.order_number}`}
                    className="flex items-center justify-between p-4 bg-amber-400/5 border border-amber-400/20 hover:border-amber-400/40 rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-[13px] font-semibold text-amber-300">
                          Pedido {order.order_number} · Pago pendiente
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          Completa el pago de {formatPrice(order.total)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </Link>
                ))}
              </div>
            )}

            {/* Orders list */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#1a1a1a]">
                <h2 className="text-[13px] font-bold text-white tracking-wide uppercase">Mis Pedidos</h2>
                {orders.length > 0 && (
                  <span className="text-[11px] text-neutral-600">
                    {orders.length} pedido{orders.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#161616] border border-[#222] flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-neutral-700" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold text-[15px]">Aún no tienes pedidos</p>
                    <p className="text-neutral-600 text-[13px] mt-1">Explora nuestras gorras Goorin Bros</p>
                  </div>
                  <Link
                    href="/tienda"
                    className="flex items-center gap-2 bg-white text-black text-[12px] font-bold px-5 h-10 rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all mt-2"
                  >
                    Ver catálogo <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#1a1a1a]">
                  {orders.map((order) => {
                    const s = statusConfig[order.status] ?? statusConfig.pending
                    const StatusIcon = s.icon
                    const needsPayment = order.payment_status === 'pending' && order.status !== 'cancelled'
                    return (
                      <Link
                        key={order.id}
                        href={`/mi-cuenta/pedido/${order.order_number}`}
                        className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-[#161616] border border-[#222] flex items-center justify-center">
                              <StatusIcon className={`h-4 w-4 ${s.iconColor}`} />
                            </div>
                            {needsPayment && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-[13px] font-bold text-white">{order.order_number}</p>
                              <span className={`hidden sm:flex items-center gap-1 text-[11px] ${s.iconColor}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                {s.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-600">
                              {new Date(order.created_at).toLocaleDateString('es-CO', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })}
                              {' · '}{order.item_count} producto{order.item_count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-[14px] font-black text-white">{formatPrice(order.total)}</p>
                            {needsPayment ? (
                              <p className="text-[10px] text-amber-400 font-semibold mt-0.5">Pagar ahora</p>
                            ) : (
                              <p className={`text-[10px] mt-0.5 sm:hidden ${s.iconColor}`}>{s.label}</p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-neutral-700 group-hover:text-neutral-400 transition-colors" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Mobile: CTA + logout */}
            <div className="lg:hidden flex flex-col gap-3 pt-1">
              <Link
                href="/tienda"
                className="flex items-center justify-center gap-2 w-full h-11 bg-white text-black text-[12px] font-bold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                <ShoppingBag className="h-4 w-4" />
                Seguir comprando
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 h-11 border border-[#1a1a1a] rounded-xl text-[12px] text-neutral-500 hover:text-red-400 hover:border-red-500/20 transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
