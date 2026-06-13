'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, ShoppingCart, TrendingUp, Percent,
  Download, RefreshCw, Calendar, Loader2, AlertTriangle,
  Package, MapPin, CreditCard, BarChart3, ArrowUpRight,
  ArrowDownRight, CheckCircle, Truck, Clock, XCircle, Store,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
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

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  pending:    { label: 'Pago pendiente', icon: Clock,        color: 'text-amber-500'   },
  confirmed:  { label: 'Confirmados',    icon: CheckCircle,  color: 'text-blue-500'    },
  processing: { label: 'Preparando',     icon: Package,      color: 'text-purple-500'  },
  shipped:    { label: 'En camino',      icon: Truck,        color: 'text-indigo-500'  },
  delivered:  { label: 'Entregados',     icon: CheckCircle,  color: 'text-green-500'   },
  cancelled:  { label: 'Cancelados',     icon: XCircle,      color: 'text-red-500'     },
}

const PAYMENT_LABELS: Record<string, string> = {
  COD: 'Contra entrega', WOMPI: 'Online (Wompi)',
  efectivo: 'Efectivo', transferencia: 'Transferencia',
  nequi: 'Nequi', daviplata: 'Daviplata',
}

function GrowthIndicator({ value }: { value: number }) {
  if (value === 0) return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">— 0%</span>
      <span>vs anterior</span>
    </span>
  )
  const pos = value > 0
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded-full ${
        pos
          ? 'text-green-700 bg-green-100 dark:bg-green-500/15 dark:text-green-400'
          : 'text-red-700 bg-red-100 dark:bg-red-500/15 dark:text-red-400'
      }`}>
        {pos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {pos ? '+' : ''}{value.toFixed(1)}%
      </span>
      <span className="text-muted-foreground">vs anterior</span>
    </span>
  )
}

export default function ReportesPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState('month')
  const [exporting, setExporting] = useState<string | null>(null)

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch(`/api/admin/stats?period=${period}`)
      const data = await res.json()
      if (data.success) setStats(data.stats)
    } catch { /* silent */ } finally {
      setLoading(false)
      setRefreshing(false)
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
      <div className="pt-16 lg:pt-0 space-y-6">
        <div className="flex justify-between">
          <div className="h-8 w-40 bg-secondary rounded-lg skeleton-shimmer" />
          <div className="h-9 w-48 bg-secondary rounded-lg skeleton-shimmer" />
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-secondary rounded-xl skeleton-shimmer" />)}
          </div>
          <div className="grid gap-3 grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-secondary rounded-xl skeleton-shimmer" />)}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 h-80 bg-secondary rounded-xl skeleton-shimmer" />
          <div className="h-80 bg-secondary rounded-xl skeleton-shimmer" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="pt-16 lg:pt-0 flex flex-col items-center justify-center h-80 gap-4">
        <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Error al cargar reportes</p>
        <Button onClick={() => fetchStats()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
        </Button>
      </div>
    )
  }

  const statusMap = Object.fromEntries(stats.orderStatusBreakdown.map(s => [s.status, Number(s.count)]))
  const funnelSteps = [
    { label: 'Creados',     value: stats.totalAllOrders, color: 'bg-secondary' },
    { label: 'Confirmados', value: (statusMap.confirmed ?? 0) + (statusMap.processing ?? 0) + (statusMap.shipped ?? 0) + (statusMap.delivered ?? 0), color: 'bg-blue-500' },
    { label: 'Enviados',    value: (statusMap.shipped ?? 0) + (statusMap.delivered ?? 0), color: 'bg-indigo-500' },
    { label: 'Entregados',  value: statusMap.delivered ?? 0, color: 'bg-green-500' },
  ]
  const maxFunnel = funnelSteps[0].value || 1
  const totalPayRev = stats.paymentMethodStats.reduce((s, p) => s + Number(p.revenue), 0)
  const totalCatRev = stats.categoryStats.reduce((s, c) => s + Number(c.revenue), 0)
  const totalCityRev = stats.cityStats.reduce((s, c) => s + Number(c.revenue), 0)

  return (
    <div className="pt-16 lg:pt-0 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground mt-1 text-sm">Análisis de ventas y rendimiento de la tienda</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchStats(true)} disabled={refreshing} className="h-9 w-9 shrink-0">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px] h-9 bg-card">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Últimos 7 días</SelectItem>
              <SelectItem value="month">Último mes</SelectItem>
              <SelectItem value="quarter">Último trimestre</SelectItem>
              <SelectItem value="year">Último año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats — 3 principales + 4 secundarios */}
      <div className="space-y-3">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Card className="admin-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-3.5 w-3.5 text-green-500" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total ingresos</p>
              </div>
              <p className="text-3xl font-bold tracking-tight tabular-nums text-green-500">{formatPrice(stats.totalSales)}</p>
              <div className="mt-2.5"><GrowthIndicator value={stats.salesGrowth} /></div>
              {stats.physicalSales > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Online {formatPrice(stats.onlineSales)} · Físico {formatPrice(stats.physicalSales)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ventas online</p>
              </div>
              <p className="text-3xl font-bold tracking-tight tabular-nums text-blue-500">{formatPrice(stats.onlineSales)}</p>
              <div className="mt-2.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-blue-500/50 transition-all" style={{ width: `${stats.totalSales > 0 ? (stats.onlineSales / stats.totalSales) * 100 : 0}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">{stats.totalOrders} pedidos pagados</p>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Store className="h-3.5 w-3.5 text-purple-500" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ventas físicas</p>
              </div>
              <p className="text-3xl font-bold tracking-tight tabular-nums text-purple-500">{formatPrice(stats.physicalSales)}</p>
              <div className="mt-2.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-purple-500/50 transition-all" style={{ width: `${stats.totalSales > 0 ? (stats.physicalSales / stats.totalSales) * 100 : 0}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">{stats.physicalSalesCount} ventas registradas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Card className="admin-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                <p className="text-xs text-muted-foreground">Ticket promedio</p>
              </div>
              <p className="text-base font-bold">{formatPrice(stats.avgOrderValue)}</p>
              <p className="text-[11px] text-muted-foreground">por pedido</p>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Percent className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-xs text-muted-foreground">Conversión</p>
              </div>
              <p className="text-base font-bold">{stats.conversionRate.toFixed(1)}%</p>
              <p className="text-[11px] text-muted-foreground">{stats.totalAllOrders} creados</p>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-3.5 w-3.5 text-indigo-500" />
                <p className="text-xs text-muted-foreground">Pedidos totales</p>
              </div>
              <p className="text-base font-bold">{stats.totalOrders}</p>
              <div className="mt-0.5"><GrowthIndicator value={stats.ordersGrowth} /></div>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Clientes</p>
              </div>
              <p className="text-base font-bold">{stats.totalCustomers}</p>
              <p className="text-[11px] text-muted-foreground">registrados</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gráfico + Embudo */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="admin-card lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Ingresos por período</CardTitle>
                <CardDescription className="mt-0.5">
                  Online {formatPrice(stats.onlineSales)} · Físico {formatPrice(stats.physicalSales)}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => exportReport('sales')} disabled={exporting === 'sales'}>
                {exporting === 'sales' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <SalesChart data={stats.weeklySales} />
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Embudo de pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {funnelSteps.map((step, i) => {
                const pct = maxFunnel > 0 ? Math.round(step.value / maxFunnel * 100) : 0
                return (
                  <div key={step.label}>
                    <div className="flex items-center justify-between mb-1.5 text-sm">
                      <span className="text-muted-foreground">{step.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold tabular-nums">{step.value}</span>
                        {i > 0 && <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>}
                      </div>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${step.color} transition-all duration-700`} style={{ width: `${(step.value / maxFunnel) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-border space-y-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = statusMap[key] ?? 0
                if (count === 0) return null
                const Icon = cfg.icon
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                      <span className="text-muted-foreground">{cfg.label}</span>
                    </div>
                    <span className="font-bold tabular-nums">{count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top productos + Ciudades */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="admin-card overflow-hidden">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" /> Productos más vendidos
              </CardTitle>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => exportReport('inventory')} disabled={exporting === 'inventory'}>
                {exporting === 'inventory' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-3">
            {stats.topProducts.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Package className="h-8 w-8" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {stats.topProducts.map((p, i) => {
                  const maxRev = Math.max(...stats.topProducts.map(x => Number(x.revenue)))
                  const pct = maxRev > 0 ? (Number(p.revenue) / maxRev) * 100 : 0
                  return (
                    <div key={i} className="px-6 py-3 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs text-muted-foreground w-4 tabular-nums shrink-0">#{i + 1}</span>
                          <span className="text-sm font-medium truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-xs text-muted-foreground tabular-nums">{p.sold} uds</span>
                          <span className="text-sm font-bold tabular-nums">{formatPrice(p.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-foreground/20 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="admin-card overflow-hidden">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" /> Ventas por ciudad
              </CardTitle>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => exportReport('orders')} disabled={exporting === 'orders'}>
                {exporting === 'orders' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-3">
            {stats.cityStats.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <MapPin className="h-8 w-8" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {stats.cityStats.slice(0, 7).map((c, i) => {
                  const pct = totalCityRev > 0 ? (Number(c.revenue) / totalCityRev) * 100 : 0
                  return (
                    <div key={i} className="px-6 py-3 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-4 tabular-nums">{i + 1}</span>
                          <span className="text-sm font-medium">{c.city || 'Sin ciudad'}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground tabular-nums">{c.orders} ped.</span>
                          <span className="text-sm font-bold tabular-nums w-20 text-right">{formatPrice(c.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500/40 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Métodos de pago + Categorías */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" /> Métodos de pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.paymentMethodStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sin datos</p>
            ) : (
              <div className="space-y-4">
                {stats.paymentMethodStats.map((pm, i) => {
                  const pct = totalPayRev > 0 ? (Number(pm.revenue) / totalPayRev) * 100 : 0
                  const label = PAYMENT_LABELS[pm.method] || pm.method
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-2 text-sm">
                        <span className="font-medium">{label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground tabular-nums">{pm.orders} pedidos</span>
                          <span className="font-bold tabular-nums">{formatPrice(pm.revenue)}</span>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-foreground/30 transition-all duration-700 progress-animated" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" /> Por categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.categoryStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sin datos</p>
            ) : (
              <div className="space-y-4">
                {stats.categoryStats.map((cat, i) => {
                  const pct = totalCatRev > 0 ? (Number(cat.revenue) / totalCatRev) * 100 : 0
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-2 text-sm">
                        <span className="font-medium">{cat.category}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground tabular-nums">{cat.units} uds</span>
                          <span className="font-bold tabular-nums">{formatPrice(cat.revenue)}</span>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-purple-500/40 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Exportar */}
      <Card className="admin-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Download className="h-4 w-4 text-muted-foreground" /> Exportar datos
          </CardTitle>
          <CardDescription>Descarga los datos del período seleccionado en formato CSV</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { key: 'sales',      label: 'Ventas',      desc: 'Resumen de ingresos',  icon: DollarSign,   color: 'text-green-500 bg-green-500/10' },
              { key: 'orders',     label: 'Pedidos',     desc: 'Detalle de órdenes',   icon: ShoppingCart, color: 'text-blue-500 bg-blue-500/10' },
              { key: 'inventory',  label: 'Inventario',  desc: 'Stock actual',          icon: Package,      color: 'text-orange-500 bg-orange-500/10' },
              { key: 'accounting', label: 'Contabilidad',desc: 'Todas las transacciones', icon: BarChart3, color: 'text-purple-500 bg-purple-500/10' },
            ].map(item => (
              <Button
                key={item.key}
                variant="outline"
                onClick={() => exportReport(item.key)}
                disabled={exporting === item.key}
                className="h-auto py-4 justify-start gap-4 bg-secondary/30 hover:bg-secondary border-transparent hover:border-border"
              >
                {exporting === item.key ? (
                  <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                ) : (
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                )}
                <div className="text-left">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
