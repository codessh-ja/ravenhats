'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, ShoppingCart, TrendingUp, Percent,
  Download, RefreshCw, Calendar, Loader2, AlertTriangle,
  Package, MapPin, CreditCard, BarChart3, ArrowUpRight,
  ArrowDownRight, Users, CheckCircle, Truck, Clock, XCircle,
} from 'lucide-react'
import { formatPrice } from '@/lib/data'
import { SalesChart } from '@/components/admin/sales-chart'

interface Stats {
  totalSales: number
  onlineSales: number
  physicalSales: number
  physicalSalesCount: number
  totalOrders: number
  totalAllOrders: number
  pendingOrders: number
  rejectedOrders: number
  totalCustomers: number
  salesGrowth: number
  ordersGrowth: number
  conversionRate: number
  avgOrderValue: number
  weeklySales: { day: string; sales: number; orders: number }[]
  topProducts: { name: string; sold: number; revenue: number }[]
  paymentMethodStats: { method: string; orders: number; revenue: number }[]
  cityStats: { city: string; orders: number; revenue: number }[]
  categoryStats: { category: string; orders: number; units: number; revenue: number }[]
  orderStatusBreakdown: { status: string; count: number }[]
}

const PERIODS = [
  { value: 'week',    label: '7 días' },
  { value: 'month',   label: '30 días' },
  { value: 'quarter', label: '90 días' },
  { value: 'year',    label: '1 año' },
]

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  pending:    { label: 'Pago pendiente', icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-400' },
  confirmed:  { label: 'Confirmados',    icon: CheckCircle,  color: 'text-blue-400',    bg: 'bg-blue-400' },
  processing: { label: 'Preparando',     icon: Package,      color: 'text-purple-400',  bg: 'bg-purple-400' },
  shipped:    { label: 'En camino',      icon: Truck,        color: 'text-indigo-400',  bg: 'bg-indigo-400' },
  delivered:  { label: 'Entregados',     icon: CheckCircle,  color: 'text-emerald-400', bg: 'bg-emerald-400' },
  cancelled:  { label: 'Cancelados',     icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-400' },
}

function GrowthBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-[11px] text-neutral-600">Sin cambio</span>
  const pos = value > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
      {pos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {pos ? '+' : ''}{value.toFixed(1)}% vs anterior
    </span>
  )
}

function ProgressBar({ value, max, color = 'bg-white' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-1 bg-[#222] rounded-full overflow-hidden flex-1">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function ReportesPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [exporting, setExporting] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/stats?period=${period}`)
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setLastUpdated(new Date())
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchStats() }, [fetchStats])

  const exportReport = async (type: string) => {
    setExporting(type)
    try {
      const res = await fetch(`/api/admin/reports/export?type=${type}&period=${period}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-${period}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <div className="pt-16 lg:pt-0 space-y-4">
        <div className="h-8 w-48 bg-[#1a1a1a] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-[#1a1a1a] rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-72 bg-[#1a1a1a] rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-[#1a1a1a] rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="pt-16 lg:pt-0 flex flex-col items-center justify-center h-80 gap-4">
        <AlertTriangle className="h-8 w-8 text-neutral-700" />
        <p className="text-neutral-500 text-sm">Error al cargar reportes</p>
        <button onClick={fetchStats} className="text-white text-[12px] border border-[#2a2a2a] px-4 h-9 rounded-xl hover:bg-white/5 transition-colors">
          Reintentar
        </button>
      </div>
    )
  }

  // Status funnel data
  const statusMap = Object.fromEntries(
    stats.orderStatusBreakdown.map(s => [s.status, Number(s.count)])
  )
  const funnelSteps = [
    { key: 'all',       label: 'Creados',    value: stats.totalAllOrders,   color: 'bg-neutral-500' },
    { key: 'confirmed', label: 'Confirmados',value: (statusMap.confirmed ?? 0) + (statusMap.processing ?? 0) + (statusMap.shipped ?? 0) + (statusMap.delivered ?? 0), color: 'bg-blue-500' },
    { key: 'shipped',   label: 'Enviados',   value: (statusMap.shipped ?? 0) + (statusMap.delivered ?? 0), color: 'bg-indigo-500' },
    { key: 'delivered', label: 'Entregados', value: statusMap.delivered ?? 0, color: 'bg-emerald-500' },
  ]
  const maxFunnel = funnelSteps[0].value || 1

  // Payment method total revenue
  const totalPayRev = stats.paymentMethodStats.reduce((s, p) => s + Number(p.revenue), 0)
  const totalCityRev = stats.cityStats.reduce((s, c) => s + Number(c.revenue), 0)
  const totalCatRev  = stats.categoryStats.reduce((s, c) => s + Number(c.revenue), 0)

  return (
    <div className="pt-16 lg:pt-0 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] text-neutral-600 tracking-[0.2em] uppercase mb-1">Análisis</p>
          <h1 className="text-2xl font-black tracking-tight text-white">REPORTES</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lastUpdated && (
            <span className="text-[11px] text-neutral-600 mr-1">
              Actualizado {lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 border border-[#222] text-neutral-400 hover:text-white text-[12px] px-3 h-8 rounded-lg hover:bg-white/5 transition-all"
          >
            <RefreshCw className="h-3 w-3" />
            Actualizar
          </button>
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-[#111] border border-[#222] rounded-lg p-0.5">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 h-7 rounded-md text-[12px] font-medium transition-all ${
                  period === p.value ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Ingresos',
            value: formatPrice(stats.totalSales),
            sub: <GrowthBadge value={stats.salesGrowth} />,
            icon: DollarSign, accent: 'text-emerald-400', bg: 'bg-emerald-400/10',
          },
          {
            label: 'Ventas pagadas',
            value: stats.totalOrders,
            sub: <GrowthBadge value={stats.ordersGrowth} />,
            icon: ShoppingCart, accent: 'text-blue-400', bg: 'bg-blue-400/10',
          },
          {
            label: 'Ticket promedio',
            value: formatPrice(stats.avgOrderValue),
            sub: <span className="text-[11px] text-neutral-600">{stats.totalOrders} ventas totales</span>,
            icon: TrendingUp, accent: 'text-purple-400', bg: 'bg-purple-400/10',
          },
          {
            label: 'Conversión',
            value: `${stats.conversionRate.toFixed(1)}%`,
            sub: <span className="text-[11px] text-neutral-600">{stats.totalAllOrders} creados · {stats.rejectedOrders} rechazados</span>,
            icon: Percent, accent: 'text-amber-400', bg: 'bg-amber-400/10',
          },
        ].map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-[12px] text-neutral-500">{card.label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.accent}`} />
                </div>
              </div>
              <p className="text-2xl font-black text-white tracking-tight">{card.value}</p>
              <div className="mt-2">{card.sub}</div>
            </div>
          )
        })}
      </div>

      {/* Revenue chart + Breakdown row */}
      <div className="grid lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[13px] font-bold text-white">Ingresos por período</h2>
              {(stats.totalOrders > 0 || stats.physicalSalesCount > 0) && (
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Online {formatPrice(stats.onlineSales)} · Físico {formatPrice(stats.physicalSales)} ({stats.physicalSalesCount})
                </p>
              )}
            </div>
            <button
              onClick={() => exportReport('sales')}
              disabled={exporting === 'sales'}
              className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-white border border-[#222] px-2.5 h-7 rounded-lg hover:bg-white/5 transition-all disabled:opacity-50"
            >
              {exporting === 'sales' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              CSV
            </button>
          </div>
          <SalesChart data={stats.weeklySales} />
        </div>

        {/* Order funnel */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-5">
          <h2 className="text-[13px] font-bold text-white mb-4">Embudo de pedidos</h2>
          <div className="space-y-4">
            {funnelSteps.map((step, i) => {
              const pct = funnelSteps[0].value > 0 ? Math.round(step.value / funnelSteps[0].value * 100) : 0
              return (
                <div key={step.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] text-neutral-400">{step.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-white tabular-nums">{step.value}</span>
                      {i > 0 && <span className="text-[10px] text-neutral-600 w-8 text-right">{pct}%</span>}
                    </div>
                  </div>
                  <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${step.color} transition-all duration-700`}
                      style={{ width: `${Math.min(100, (step.value / maxFunnel) * 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Status pills */}
          <div className="mt-5 pt-4 border-t border-[#1a1a1a] space-y-2">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = statusMap[key] ?? 0
              if (count === 0) return null
              const Icon = cfg.icon
              return (
                <div key={key} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    <span className="text-neutral-500">{cfg.label}</span>
                  </div>
                  <span className="font-bold text-white tabular-nums">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Products + Cities row */}
      <div className="grid lg:grid-cols-2 gap-3">

        {/* Top products */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
            <h2 className="text-[13px] font-bold text-white flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-neutral-600" /> Productos más vendidos
            </h2>
            <button
              onClick={() => exportReport('inventory')}
              disabled={exporting === 'inventory'}
              className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-white border border-[#222] px-2.5 h-7 rounded-lg hover:bg-white/5 transition-all disabled:opacity-50"
            >
              {exporting === 'inventory' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              CSV
            </button>
          </div>
          {stats.topProducts.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-neutral-700">
              <Package className="h-8 w-8" />
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {stats.topProducts.map((p, i) => {
                const maxRev = Math.max(...stats.topProducts.map(x => Number(x.revenue)))
                return (
                  <div key={i} className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[11px] text-neutral-600 w-4 tabular-nums flex-shrink-0">#{i + 1}</span>
                        <span className="text-[13px] font-medium text-white truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className="text-[11px] text-neutral-500 tabular-nums">{p.sold} uds</span>
                        <span className="text-[13px] font-black text-white tabular-nums">{formatPrice(p.revenue)}</span>
                      </div>
                    </div>
                    <ProgressBar value={Number(p.revenue)} max={maxRev} color="bg-white/30" />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cities */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
            <h2 className="text-[13px] font-bold text-white flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-neutral-600" /> Ventas por ciudad
            </h2>
            <button
              onClick={() => exportReport('orders')}
              disabled={exporting === 'orders'}
              className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-white border border-[#222] px-2.5 h-7 rounded-lg hover:bg-white/5 transition-all disabled:opacity-50"
            >
              {exporting === 'orders' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              CSV
            </button>
          </div>
          {stats.cityStats.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-neutral-700">
              <MapPin className="h-8 w-8" />
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {stats.cityStats.slice(0, 7).map((c, i) => (
                <div key={i} className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-neutral-600 w-4 tabular-nums">{i + 1}</span>
                      <span className="text-[13px] font-medium text-white">{c.city || 'Sin ciudad'}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[11px] text-neutral-500 tabular-nums">{c.orders} ped.</span>
                      <span className="text-[13px] font-black text-white tabular-nums w-20 text-right">{formatPrice(c.revenue)}</span>
                    </div>
                  </div>
                  <ProgressBar value={Number(c.revenue)} max={totalCityRev} color="bg-indigo-400/50" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment methods + Categories */}
      <div className="grid lg:grid-cols-2 gap-3">

        {/* Payment methods */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-5">
          <h2 className="text-[13px] font-bold text-white flex items-center gap-2 mb-5">
            <CreditCard className="h-3.5 w-3.5 text-neutral-600" /> Métodos de pago
          </h2>
          {stats.paymentMethodStats.length === 0 ? (
            <p className="text-neutral-700 text-sm text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-5">
              {stats.paymentMethodStats.map((pm, i) => {
                const pct = totalPayRev > 0 ? (Number(pm.revenue) / totalPayRev) * 100 : 0
                const label = pm.method === 'COD' ? 'Contra entrega' : pm.method === 'WOMPI' ? 'Online (Wompi)' : pm.method === 'efectivo' ? 'Efectivo' : pm.method === 'transferencia' ? 'Transferencia' : pm.method
                const accent = pm.method === 'COD' ? 'bg-[#25d366]' : pm.method === 'efectivo' ? 'bg-amber-400' : pm.method === 'transferencia' ? 'bg-blue-400' : 'bg-white'
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-semibold text-white">{label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-neutral-600 tabular-nums">{pm.orders} pedidos</span>
                        <span className="text-[13px] font-black text-white tabular-nums">{formatPrice(pm.revenue)}</span>
                        <span className="text-[11px] text-neutral-600 w-8 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${accent} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-5">
          <h2 className="text-[13px] font-bold text-white flex items-center gap-2 mb-5">
            <BarChart3 className="h-3.5 w-3.5 text-neutral-600" /> Por categoría
          </h2>
          {stats.categoryStats.length === 0 ? (
            <p className="text-neutral-700 text-sm text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-4">
              {stats.categoryStats.map((cat, i) => {
                const pct = totalCatRev > 0 ? (Number(cat.revenue) / totalCatRev) * 100 : 0
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-semibold text-white">{cat.category}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-neutral-600 tabular-nums">{cat.units} uds</span>
                        <span className="text-[13px] font-black text-white tabular-nums">{formatPrice(cat.revenue)}</span>
                        <span className="text-[11px] text-neutral-600 w-8 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <ProgressBar value={Number(cat.revenue)} max={totalCatRev} color="bg-purple-400/50" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Exports */}
      <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-5">
        <h2 className="text-[13px] font-bold text-white mb-1">Exportar datos</h2>
        <p className="text-[11px] text-neutral-600 mb-4">CSV del período seleccionado: {PERIODS.find(p => p.value === period)?.label}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: 'sales',       label: 'Ventas',       icon: DollarSign,   color: 'text-emerald-400' },
            { key: 'orders',      label: 'Pedidos',       icon: ShoppingCart, color: 'text-blue-400' },
            { key: 'inventory',   label: 'Inventario',    icon: Package,      color: 'text-amber-400' },
            { key: 'accounting',  label: 'Contabilidad',  icon: BarChart3,    color: 'text-purple-400' },
          ].map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                onClick={() => exportReport(item.key)}
                disabled={!!exporting}
                className="flex items-center gap-3 p-3.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl hover:border-[#2a2a2a] hover:bg-white/[0.02] transition-all disabled:opacity-50 text-left group"
              >
                {exporting === item.key ? (
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-500 flex-shrink-0" />
                ) : (
                  <Icon className={`h-4 w-4 ${item.color} flex-shrink-0`} />
                )}
                <div>
                  <p className="text-[12px] font-semibold text-white">{item.label}</p>
                  <p className="text-[10px] text-neutral-600">Descargar CSV</p>
                </div>
                <Download className="h-3 w-3 text-neutral-700 ml-auto group-hover:text-neutral-500 transition-colors" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
