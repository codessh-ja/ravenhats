'use client'

import { useState, useEffect } from 'react'
import {
  MessageCircle, TrendingUp, ShoppingCart, Users, Zap,
  RefreshCw, BarChart3, ArrowUpRight, Sparkles
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface AnalyticsData {
  period: string
  summary: {
    totalSessions: number
    totalConversions: number
    conversionRate: string
    onlineConversions: number
    codConversions: number
    avgIntentScore: number
    avgMessages: string
    hesitationRate: string
    hesitationConversionRate: string
  }
  funnel: {
    total: number
    engaged: number
    shownProducts: number
    addedToCart: number
    converted: number
  }
  topProducts: {
    id: number
    name: string
    price: number
    times_shown: number
    times_added_to_cart: number
    times_purchased: number
    show_to_cart_rate: number
    cart_to_purchase_rate: number
    total_revenue: number
  }[]
  intentDistribution: {
    intent_level: string
    count: number
    converted: number
  }[]
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function pct(value: number, total: number): string {
  if (!total) return '0%'
  return ((value / total) * 100).toFixed(1) + '%'
}

function FunnelBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value.toLocaleString()} <span className="text-muted-foreground font-normal">({pct(value, total)})</span></span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%`, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function AdminChatbotPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState('7')

  async function load(d = days) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/chat-analytics?days=${d}`)
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

  const summary = data?.summary
  const funnel  = data?.funnel

  return (
    <div className="p-6 space-y-6 max-w-6xl pt-20 lg:pt-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Chatbot IA — Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Rendimiento del asistente conversacional</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="14">Últimos 14 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Sesiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.totalSessions?.toLocaleString() ?? '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4" /> Conversiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.totalConversions?.toLocaleString() ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tasa: {summary?.conversionRate ?? '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Intent Score promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.avgIntentScore ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{summary?.avgMessages ?? '—'} msgs/sesión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Tasa de hesitación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.hesitationRate ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conversión tras hesitar: {summary?.hesitationConversionRate ?? '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion split */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Online vs Contraentrega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Pago online</span>
              <Badge variant="outline">{summary?.onlineConversions ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Contraentrega</span>
              <Badge variant="outline">{summary?.codConversions ?? 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" /> Embudo de conversión
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {funnel ? (
              <>
                <FunnelBar label="Sesiones totales"     value={funnel.total}          total={funnel.total} color="bg-muted-foreground/40" />
                <FunnelBar label="Enganchados"          value={funnel.engaged}         total={funnel.total} color="bg-blue-500/60" />
                <FunnelBar label="Vieron productos"     value={funnel.shownProducts}   total={funnel.total} color="bg-purple-500/60" />
                <FunnelBar label="Añadieron al carrito" value={funnel.addedToCart}     total={funnel.total} color="bg-amber-500/60" />
                <FunnelBar label="Compraron"            value={funnel.converted}       total={funnel.total} color="bg-emerald-500/80" />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top converting products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Productos más efectivos en el chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.topProducts && data.topProducts.length > 0 ? (
            <div className="space-y-3">
              {data.topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
                  <span className="text-muted-foreground text-sm w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${Number(p.price).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{p.times_shown ?? 0} mostrado</p>
                    <p className="text-xs text-muted-foreground">{p.times_added_to_cart ?? 0} al carrito · {p.times_purchased ?? 0} vendido</p>
                  </div>
                  <div className="w-16 text-right shrink-0">
                    <Badge variant={Number(p.show_to_cart_rate) > 0.2 ? 'default' : 'outline'}>
                      {(Number(p.show_to_cart_rate) * 100).toFixed(0)}%
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-0.5">show→cart</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin datos de productos aún</p>
              <p className="text-xs mt-1">Aparecerán aquí a medida que el chatbot interactúe con clientes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Intent distribution */}
      {data?.intentDistribution && data.intentDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5" />
              Distribución de intención de compra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {data.intentDistribution.map(({ intent_level, count, converted }) => (
                <div key={intent_level} className="text-center p-4 rounded-lg border border-border">
                  <Badge
                    variant={intent_level === 'high' ? 'default' : 'outline'}
                    className="mb-2 capitalize"
                  >
                    {intent_level === 'high' ? 'Alta' : intent_level === 'medium' ? 'Media' : 'Baja'}
                  </Badge>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {converted} convirtieron ({pct(converted, count)})
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Config note */}
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-start gap-3">
          <MessageCircle className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Motor IA: GPT-4o-mini + RAG</p>
            <p>El chatbot usa OpenAI GPT-4o-mini con búsqueda de productos en tiempo real. Para activarlo, agrega tu <code className="bg-muted px-1 rounded">OPENAI_API_KEY</code> en el archivo <code className="bg-muted px-1 rounded">.env</code>.</p>
            <p className="text-xs">Actualización futura: embeddings vectoriales con Pinecone para búsqueda semántica más precisa.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
