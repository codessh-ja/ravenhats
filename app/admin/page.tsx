'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DollarSign, ShoppingCart, Package, Loader2, Clock,
  AlertTriangle, BarChart3, MapPin, CreditCard, Percent, Calendar, X, Download,
  ArrowUpRight, ArrowDownRight, RefreshCw, TrendingUp,
  ChevronRight, Zap, Receipt
} from 'lucide-react'
import { formatPrice } from '@/lib/data'
import { SalesChart } from '@/components/admin/sales-chart'
import { RecentOrders } from '@/components/admin/recent-orders'
import Link from 'next/link'

interface Stats {
  totalSales: number
  onlineSales: number
  physicalSales: number
  physicalSalesCount: number
  totalOrders: number
  pendingOrders: number
  totalProducts: number
  lowStockCount: number
  outOfStockCount: number
  totalCustomers: number
  salesGrowth: number
  ordersGrowth: number
  conversionRate: number
  weeklySales: { day: string; sales: number; orders: number }[]
  topProducts: { name: string; sold: number; revenue: number }[]
  recentOrders: {
    id: number
    order_number: string
    customer_name: string
    total: number
    status: string
    payment_status: string
    payment_method: string
    created_at: string
  }[]
  paymentMethodStats: { method: string; orders: number; revenue: number }[]
  cityStats: { city: string; orders: number; revenue: number }[]
  lowStockProducts: { id: number; name: string; sku: string; stock: number; low_stock_threshold: number }[]
  categoryStats: { category: string; orders: number; units: number; revenue: number }[]
  stockAlertsEnabled: boolean
  globalLowStockThreshold: number
}

const periodLabels: Record<string, string> = {
  'week': 'Ultimos 7 dias',
  'month': 'Ultimo mes',
  'quarter': 'Ultimo trimestre',
  'year': 'Ultimo ano',
  'default_empty': 'Historico',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('week')
  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>({})
  const [exporting, setExporting] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  useEffect(() => {
    fetchStats()
  }, [period])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => fetchStats(true), 120_000)
    return () => clearInterval(interval)
  }, [period])

  // Update "hace X min" counter
  useEffect(() => {
    if (!lastUpdated) return
    const tick = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
    }, 10_000)
    return () => clearInterval(tick)
  }, [lastUpdated])

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const p = period === 'default_empty' ? '' : period
      const params = p ? `?period=${p}` : ''
      const res = await fetch(`/api/admin/stats${params}`)
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setLastUpdated(new Date())
        setSecondsAgo(0)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const dismissAlert = (key: string) => {
    setDismissedAlerts(prev => ({ ...prev, [key]: true }))
  }

  const exportReport = async (type: string) => {
    setExporting(type)
    try {
      const res = await fetch(`/api/admin/reports/export?type=${type}&period=${period}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-reporte-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (error) {
      console.error('Error exporting:', error)
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 pt-16 lg:pt-0">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-40 bg-secondary rounded-lg skeleton-shimmer" />
            <div className="h-4 w-64 bg-secondary rounded skeleton-shimmer" />
          </div>
          <div className="h-10 w-48 bg-secondary rounded-lg skeleton-shimmer" />
        </div>
        
        {/* Stats skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-secondary rounded-xl skeleton-shimmer" />
          ))}
        </div>
        
        {/* Charts skeleton */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 h-80 bg-secondary rounded-xl skeleton-shimmer" />
          <div className="h-80 bg-secondary rounded-xl skeleton-shimmer" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Error al cargar estadisticas</p>
        <Button onClick={() => fetchStats()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </div>
    )
  }

  const paymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'WOMPI': 'Wompi (Online)',
      'COD': 'Contra entrega',
      'wompi': 'Wompi (Online)',
      'cod': 'Contra entrega',
      'N/A': 'Sin definir',
    }
    return labels[method] || method
  }

  const GrowthIndicator = ({ value, suffix = 'vs anterior' }: { value: number; suffix?: string }) => {
    if (value === 0) return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">— 0%</span>
        <span className="font-normal">{suffix}</span>
      </span>
    )
    const isPositive = value >= 0
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className={`inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded-full ${
          isPositive
            ? 'text-green-700 bg-green-100 dark:bg-green-500/15 dark:text-green-400'
            : 'text-red-700 bg-red-100 dark:bg-red-500/15 dark:text-red-400'
        }`}>
          {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {isPositive ? '+' : ''}{value.toFixed(1)}%
        </span>
        <span className="text-muted-foreground font-normal">{suffix}</span>
      </span>
    )
  }

  const hasAlerts = (stats.stockAlertsEnabled && (stats.lowStockCount > 0 || stats.outOfStockCount > 0)) || stats.pendingOrders > 0

  return (
    <div className="space-y-6 pt-16 lg:pt-0">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Bienvenido de vuelta. Aqui esta el resumen de tu tienda.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && !refreshing && (
              <span className="hidden sm:block text-[11px] text-muted-foreground">
                {secondsAgo < 60
                  ? 'Actualizado hace menos de 1 min'
                  : `Actualizado hace ${Math.floor(secondsAgo / 60)} min`}
              </span>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="shrink-0 h-9 w-9"
              title="Actualizar datos"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px] h-9 bg-card">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Ultimos 7 dias</SelectItem>
                <SelectItem value="month">Ultimo mes</SelectItem>
                <SelectItem value="quarter">Ultimo trimestre</SelectItem>
                <SelectItem value="year">Ultimo ano</SelectItem>
                <SelectItem value="default_empty">Historico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Alerts Banner */}
        {hasAlerts && (
          <div className="flex flex-wrap gap-2">
            {stats.stockAlertsEnabled && stats.outOfStockCount > 0 && !dismissedAlerts['out_of_stock'] && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <span className="font-medium text-red-500">{stats.outOfStockCount} producto{stats.outOfStockCount > 1 ? 's' : ''} agotado{stats.outOfStockCount > 1 ? 's' : ''}</span>
                <Link href="/admin/productos?status=out_of_stock" className="text-red-400 hover:text-red-300 underline-offset-2 hover:underline text-xs">
                  Ver
                </Link>
                <button onClick={() => dismissAlert('out_of_stock')} className="ml-1 text-red-400 hover:text-red-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {stats.stockAlertsEnabled && stats.lowStockCount > 0 && !dismissedAlerts['low_stock'] && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="font-medium text-amber-500">{stats.lowStockCount} con stock bajo</span>
                <Link href="/admin/productos?status=low_stock" className="text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline text-xs">
                  Ver
                </Link>
                <button onClick={() => dismissAlert('low_stock')} className="ml-1 text-amber-400 hover:text-amber-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {stats.pendingOrders > 0 && !dismissedAlerts['pending_orders'] && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
                <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="font-medium text-blue-500">{stats.pendingOrders} pedido{stats.pendingOrders > 1 ? 's' : ''} pendiente{stats.pendingOrders > 1 ? 's' : ''}</span>
                <Link href="/admin/pedidos?status=pending" className="text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline text-xs">
                  Ver
                </Link>
                <button onClick={() => dismissAlert('pending_orders')} className="ml-1 text-blue-400 hover:text-blue-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="admin-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-green-500" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ventas totales</p>
            </div>
            <p className="text-3xl font-bold tracking-tight tabular-nums">{formatPrice(stats.totalSales)}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <GrowthIndicator value={stats.salesGrowth} />
            </div>
            {stats.physicalSales > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Online {formatPrice(stats.onlineSales)} · Fisico {formatPrice(stats.physicalSales)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pedidos pagados</p>
            </div>
            <p className="text-3xl font-bold tracking-tight tabular-nums">{stats.totalOrders}</p>
            <div className="mt-2.5">
              <GrowthIndicator value={stats.ordersGrowth} />
            </div>
            {stats.pendingOrders > 0 && (
              <p className="text-[11px] text-amber-500 mt-1.5 font-medium">{stats.pendingOrders} pendiente{stats.pendingOrders > 1 ? 's' : ''}</p>
            )}
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-3.5 w-3.5 text-purple-500" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasa conversion</p>
            </div>
            <p className="text-3xl font-bold tracking-tight tabular-nums">{stats.conversionRate.toFixed(1)}%</p>
            <div className="mt-2.5 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-purple-500/60 transition-all" style={{ width: `${Math.min(stats.conversionRate, 100)}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Pedidos pagados vs creados</p>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-3.5 w-3.5 text-orange-500" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Productos</p>
            </div>
            <p className="text-3xl font-bold tracking-tight tabular-nums">{stats.totalProducts}</p>
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              {stats.stockAlertsEnabled && stats.lowStockCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full text-amber-700 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400">
                  {stats.lowStockCount} stock bajo
                </span>
              )}
              {stats.stockAlertsEnabled && stats.outOfStockCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full text-red-700 bg-red-100 dark:bg-red-500/15 dark:text-red-400">
                  {stats.outOfStockCount} agotado
                </span>
              )}
              {(!stats.stockAlertsEnabled || (stats.lowStockCount === 0 && stats.outOfStockCount === 0)) && (
                <p className="text-[11px] text-muted-foreground">Activos en catalogo</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="admin-card lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Ventas del Periodo</CardTitle>
                <CardDescription className="mt-0.5">
                  {stats.totalOrders > 0
                    ? `${stats.totalOrders} pedidos · Ticket promedio: ${formatPrice(stats.totalSales / stats.totalOrders)}`
                    : 'Sin ventas en este periodo'}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-medium">
                {periodLabels[period]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <SalesChart data={stats.weeklySales} />
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Top Productos
              </CardTitle>
              <Link href="/admin/productos">
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2 gap-1">
                  Ver todos
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats.topProducts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">Sin ventas aun</p>
                </div>
              ) : (() => {
                const maxRev = Math.max(...stats.topProducts.map(p => Number(p.revenue)))
                return stats.topProducts.map((product, index) => {
                  const pct = maxRev > 0 ? (Number(product.revenue) / maxRev) * 100 : 0
                  return (
                    <div key={index} className="relative group rounded-lg overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-secondary/60 transition-all rounded-lg" style={{ width: `${pct}%` }} />
                      <div className="relative flex items-center gap-3 px-2 py-2.5">
                        <span className="text-xs font-bold text-muted-foreground w-4 tabular-nums shrink-0">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sold} uds</p>
                        </div>
                        <span className="font-semibold text-sm tabular-nums shrink-0">{formatPrice(product.revenue)}</span>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Payment Methods */}
        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Metodos de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.paymentMethodStats.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">Sin datos</p>
              ) : (() => {
                const totalRev = stats.paymentMethodStats.reduce((a, b) => a + Number(b.revenue), 0)
                return stats.paymentMethodStats.map((pm, i) => {
                  const pct = totalRev > 0 ? (Number(pm.revenue) / totalRev) * 100 : 0
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{paymentMethodLabel(pm.method)}</span>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] text-muted-foreground tabular-nums">{pm.orders} ped.</span>
                          <span className="font-semibold tabular-nums">{formatPrice(pm.revenue)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full bg-foreground/60 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Top Cities */}
        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Ventas por Ciudad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.cityStats.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">Sin datos</p>
              ) : (() => {
                const maxRev = Math.max(...stats.cityStats.slice(0, 5).map(c => Number(c.revenue)))
                return stats.cityStats.slice(0, 5).map((city, i) => {
                  const pct = maxRev > 0 ? (Number(city.revenue) / maxRev) * 100 : 0
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground w-4 tabular-nums">{i + 1}</span>
                          <span className="font-medium">{city.city || 'Sin ciudad'}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] text-muted-foreground tabular-nums">{city.orders} ped.</span>
                          <span className="font-semibold tabular-nums">{formatPrice(city.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500/50 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card className="admin-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Ventas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.categoryStats.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">Sin datos</p>
              ) : (() => {
                const maxRev = Math.max(...stats.categoryStats.map(c => Number(c.revenue)))
                return stats.categoryStats.map((cat, i) => {
                  const pct = maxRev > 0 ? (Number(cat.revenue) / maxRev) * 100 : 0
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{cat.category}</span>
                        <span className="font-semibold tabular-nums">{formatPrice(cat.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500/50 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">{cat.units} uds</span>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Stock Alerts + Recent Orders */}
      <div className={`grid gap-4 ${stats.stockAlertsEnabled ? 'lg:grid-cols-5' : ''}`}>
        {stats.stockAlertsEnabled && (
          <Card className="admin-card lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Alertas de Stock
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-normal">
                  Min: {stats.globalLowStockThreshold} uds
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.lowStockProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                      <Package className="h-6 w-6 text-green-500" />
                    </div>
                    <p className="text-muted-foreground text-sm">Todo el inventario OK</p>
                  </div>
                ) : (
                  stats.lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground">{product.sku || 'Sin SKU'}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={product.stock === 0
                          ? 'bg-red-500/10 text-red-500 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}
                      >
                        {product.stock === 0 ? 'Agotado' : `${product.stock} uds`}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={`admin-card ${stats.stockAlertsEnabled ? 'lg:col-span-3' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                Pedidos Recientes
              </CardTitle>
              <Link href="/admin/pedidos">
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2 gap-1">
                  Ver todos
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <RecentOrders orders={stats.recentOrders} />
          </CardContent>
        </Card>
      </div>

      {/* Export Section */}
      <Card className="admin-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Download className="h-4 w-4 text-muted-foreground" />
            Exportar Reportes
          </CardTitle>
          <CardDescription>Descarga datos del periodo seleccionado en formato CSV</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { key: 'sales', label: 'Ventas', desc: 'Resumen de ventas', icon: DollarSign, color: 'text-green-500 bg-green-500/10' },
              { key: 'orders', label: 'Pedidos', desc: 'Detalle de items', icon: ShoppingCart, color: 'text-blue-500 bg-blue-500/10' },
              { key: 'inventory', label: 'Inventario', desc: 'Stock actual', icon: Package, color: 'text-orange-500 bg-orange-500/10' },
              { key: 'accounting', label: 'Contabilidad', desc: 'Transacciones', icon: Receipt, color: 'text-purple-500 bg-purple-500/10' },
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
