'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, Download, Loader2, Check, Trash2,
  TrendingUp, ShoppingCart, Store, Receipt, Eye, Pencil,
  CreditCard, X, Calendar, ArrowUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip,
} from 'recharts'
import { formatPrice } from '@/lib/data'
import { FinanceModal } from '@/components/admin/finance-modal'

interface Transaction {
  id: number
  type: string
  payment_method: string
  payment_status: string
  order_id: number | null
  order_number: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  subtotal: number
  shipping_cost: number
  discount: number
  total: number
  amount_paid: number
  balance: number
  description: string | null
  notes: string | null
  payment_reference: string | null
  created_by: string
  transaction_date: string
  item_count: number
}

interface Payment {
  id: number
  transaction_id: number
  amount: number
  payment_method: string
  payment_reference: string | null
  notes: string | null
  payment_date: string
}

interface Product { id: number; name: string; price: number; stock: number }
interface Toast { id: number; message: string; type: 'success' | 'error' }

const paymentMethodLabels: Record<string, string> = {
  wompi: 'Wompi', cod: 'Contra entrega', transfer: 'Transferencia',
  cash: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata', other: 'Otro',
}
const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  approved: 'bg-green-500/10 text-green-500 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
}
const paymentStatusLabels: Record<string, string> = {
  pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado',
}

const typeLabels: Record<string, string> = {
  online_sale: 'Online', physical_sale: 'Fisica',
}
const typePillColors: Record<string, string> = {
  online_sale: 'bg-blue-500/10 text-blue-400',
  physical_sale: 'bg-green-500/10 text-green-400',
}

function getBogotaDateTimeStr() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const g = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`
}

export default function IngresosPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [summary, setSummary] = useState<any>({})
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [chartData, setChartData] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)

  // Detail modal
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showAbonoForm, setShowAbonoForm] = useState(false)
  const [savingAbono, setSavingAbono] = useState(false)
  const [forcingPayment, setForcingPayment] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState({ paymentMethod: '', paymentReference: '', transactionDate: '', notes: '', description: '', customerName: '', customerPhone: '', customerEmail: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [abonoForm, setAbonoForm] = useState({ amount: '', paymentMethod: 'cash', paymentReference: '', notes: '', paymentDate: getBogotaDateTimeStr() })
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('typeGroup', 'income')
      if (search) params.set('search', search)
      if (paymentFilter === 'pending') params.set('paymentStatus', 'pending')
      else if (paymentFilter !== 'all') params.set('paymentMethod', paymentFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('page', pagination.page.toString())

      const res = await fetch(`/api/admin/accounting?${params}`)
      const data = await res.json()
      if (data.success) {
        setTransactions(data.transactions || [])
        setSummary(data.summary || {})
        setPagination(prev => ({ ...prev, total: data.pagination?.total || 0, totalPages: data.pagination?.totalPages || 0 }))
      }
    } catch { showToast('Error al cargar ingresos', 'error') }
    finally { setLoading(false) }
  }, [search, paymentFilter, dateFrom, dateTo, pagination.page])

  const fetchChartData = async () => {
    try {
      const res = await fetch('/api/admin/accounting?chartData=true')
      const data = await res.json()
      if (data.chartData) setChartData(data.chartData)
    } catch { /* ignore */ }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products')
      const data = await res.json()
      if (data.products) setProducts(data.products.filter((p: any) => p.is_active))
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchTransactions() }, [fetchTransactions])
  useEffect(() => { fetchProducts(); fetchChartData() }, [])

  const fetchPayments = async (txId: number) => {
    setLoadingPayments(true)
    try {
      const res = await fetch(`/api/admin/accounting/payments?transactionId=${txId}`)
      const data = await res.json()
      if (data.success) setPayments(data.payments || [])
    } catch { showToast('Error al cargar abonos', 'error') }
    finally { setLoadingPayments(false) }
  }

  const openViewTransaction = (tx: Transaction) => {
    setViewTransaction(tx); setPayments([]); setShowAbonoForm(false)
    fetchPayments(tx.id)
  }

  const handleAddAbono = async () => {
    if (!viewTransaction || !abonoForm.amount || Number(abonoForm.amount) <= 0) { showToast('Ingresa un monto valido', 'error'); return }
    setSavingAbono(true)
    try {
      const res = await fetch('/api/admin/accounting/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: viewTransaction.id, amount: Number(abonoForm.amount), paymentMethod: abonoForm.paymentMethod, paymentReference: abonoForm.paymentReference || null, notes: abonoForm.notes || null, paymentDate: abonoForm.paymentDate ? abonoForm.paymentDate.replace('T', ' ') + ':00' : undefined }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Abono registrado', 'success')
        setShowAbonoForm(false)
        setAbonoForm({ amount: '', paymentMethod: 'cash', paymentReference: '', notes: '', paymentDate: getBogotaDateTimeStr() })
        fetchPayments(viewTransaction.id)
        fetchTransactions()
        setViewTransaction(prev => prev ? { ...prev, amount_paid: data.totalPaid, balance: prev.total - data.totalPaid, payment_status: data.newStatus } : null)
      } else { showToast(data.error || 'Error al registrar abono', 'error') }
    } catch { showToast('Error al registrar abono', 'error') }
    finally { setSavingAbono(false) }
  }

  const handleDeletePayment = async (paymentId: number) => {
    if (!viewTransaction) return
    setDeletingPaymentId(paymentId)
    try {
      const res = await fetch(`/api/admin/accounting/payments?id=${paymentId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) { showToast('Abono eliminado', 'success'); fetchPayments(viewTransaction.id); fetchTransactions(); setViewTransaction(prev => prev ? { ...prev, amount_paid: data.totalPaid, balance: prev.total - data.totalPaid, payment_status: data.newStatus } : null) }
      else { showToast(data.error || 'Error', 'error') }
    } catch { showToast('Error', 'error') }
    finally { setDeletingPaymentId(null) }
  }

  const handleForcePaymentStatus = async (newStatus: 'approved' | 'pending') => {
    if (!viewTransaction) return
    setForcingPayment(true)
    try {
      const res = await fetch('/api/admin/accounting', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: viewTransaction.id, paymentStatus: newStatus, forceAmountPaid: newStatus === 'approved' ? viewTransaction.total : undefined }) })
      const data = await res.json()
      if (data.success) { showToast(newStatus === 'approved' ? 'Marcado como pagado' : 'Marcado como pendiente', 'success'); fetchTransactions(); setViewTransaction(prev => prev ? { ...prev, payment_status: newStatus, amount_paid: newStatus === 'approved' ? prev.total : prev.amount_paid } : null) }
      else { showToast(data.error || 'Error', 'error') }
    } catch { showToast('Error', 'error') }
    finally { setForcingPayment(false) }
  }

  const openEditTransaction = (tx: Transaction) => {
    setEditForm({ paymentMethod: tx.payment_method, paymentReference: tx.payment_reference || '', transactionDate: tx.transaction_date ? new Date(tx.transaction_date).toISOString().slice(0, 16) : '', notes: tx.notes || '', description: tx.description || '', customerName: tx.customer_name || '', customerPhone: tx.customer_phone || '', customerEmail: tx.customer_email || '' })
    setEditTransaction(tx)
  }

  const handleSaveEdit = async () => {
    if (!editTransaction) return
    setSavingEdit(true)
    try {
      const res = await fetch('/api/admin/accounting', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editTransaction.id, ...editForm, transactionDate: editForm.transactionDate ? editForm.transactionDate.replace('T', ' ') + ':00' : undefined }) })
      const data = await res.json()
      if (data.success) { showToast('Actualizado', 'success'); setEditTransaction(null); fetchTransactions() }
      else { showToast(data.error || 'Error', 'error') }
    } catch { showToast('Error', 'error') }
    finally { setSavingEdit(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/accounting?id=${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) { showToast('Eliminado', 'success'); fetchTransactions() }
      else { showToast(data.error || 'Error', 'error') }
    } catch { showToast('Error', 'error') }
    finally { setDeleting(false); setDeleteId(null) }
  }

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams({ type: 'accounting', period: 'custom' })
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/admin/reports/export?${params}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `ingresos-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove()
    } catch { showToast('Error al exportar', 'error') }
  }

  const formatDate = (s: string) => new Date(s).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
  const formatTime = (s: string) => new Date(s).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  const fmt = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K` : `$${v}`
  const hasFilters = search || paymentFilter !== 'all' || dateFrom || dateTo

  return (
    <div className="space-y-6 pt-16 lg:pt-0">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right ${t.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            <Check className="h-4 w-4" /><span className="font-medium">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ingresos</h1>
          <p className="text-muted-foreground text-sm">Ventas online y físicas cobradas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />Exportar</Button>
          <Button size="sm" onClick={() => setShowModal(true)}><Plus className="mr-2 h-4 w-4" />Registrar ingreso</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="admin-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Total cobrado</p>
                <div className="text-2xl font-bold text-green-500">{formatPrice(Number(summary.totalIncome || 0))}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Ingresos recibidos</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`admin-card ${Number(summary.pendingBalance || 0) > 0 ? 'border-yellow-500/25' : ''}`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Por cobrar</p>
                <div className={`text-2xl font-bold ${Number(summary.pendingBalance || 0) > 0 ? 'text-yellow-500' : ''}`}>{formatPrice(Number(summary.pendingBalance || 0))}</div>
                <p className="text-[11px] text-muted-foreground mt-1">{summary.partialCount || 0} con saldo pendiente</p>
              </div>
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${Number(summary.pendingBalance || 0) > 0 ? 'bg-yellow-500/10' : 'bg-secondary'}`}>
                <Receipt className={`h-4 w-4 ${Number(summary.pendingBalance || 0) > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Ventas online</p>
                <div className="text-2xl font-bold">{formatPrice(Number(summary.onlineTotal || 0))}</div>
                <p className="text-[11px] text-muted-foreground mt-1">{summary.onlineSales || 0} transacciones</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-4 w-4 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Ventas físicas</p>
                <div className="text-2xl font-bold">{formatPrice(Number(summary.physicalTotal || 0))}</div>
                <p className="text-[11px] text-muted-foreground mt-1">{summary.physicalSales || 0} transacciones</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <Store className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="admin-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="inline-block w-3 h-0.5 rounded-full bg-orange-500" />
              Ingresos históricos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: 'currentColor', opacity: 0.5 }} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickMargin={4} width={56} tick={{ fill: 'currentColor', opacity: 0.5 }} tickFormatter={fmt} />
                  <RechartsTooltip formatter={(v: number) => [new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v), 'Ingresos']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="ingresos" stroke="#f97316" strokeWidth={2} fill="url(#incGrad)" dot={{ fill: '#f97316', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#f97316', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Buscar cliente, descripcion..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })) }} />
          </div>
          <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPagination(p => ({ ...p, page: 1 })) }}>
            <SelectTrigger className="w-[150px] shrink-0"><CreditCard className="mr-2 h-4 w-4" /><SelectValue placeholder="Método" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cash">Efectivo</SelectItem>
              <SelectItem value="transfer">Transferencia</SelectItem>
              <SelectItem value="wompi">Wompi</SelectItem>
              <SelectItem value="pending">Sin pago</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={showDateFilter ? 'secondary' : 'outline'} size="sm" onClick={() => setShowDateFilter(v => !v)} className="shrink-0 gap-2">
            <Calendar className="h-4 w-4" />Fecha
            {(dateFrom || dateTo) && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />}
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="shrink-0" onClick={() => { setSearch(''); setPaymentFilter('all'); setDateFrom(''); setDateTo(''); setShowDateFilter(false); setPagination(p => ({ ...p, page: 1 })) }}>
              <X className="mr-1 h-4 w-4" />Limpiar
            </Button>
          )}
        </div>
        {showDateFilter && (
          <div className="flex items-center gap-2 flex-wrap pl-1">
            <span className="text-xs text-muted-foreground shrink-0">Desde:</span>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPagination(p => ({ ...p, page: 1 })) }} className="w-[140px] text-sm" />
            <span className="text-muted-foreground text-sm">→</span>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPagination(p => ({ ...p, page: 1 })) }} className="w-[140px] text-sm" />
            {(dateFrom || dateTo) && <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }}><X className="h-3.5 w-3.5" /></Button>}
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : transactions.length === 0 ? (
        <div className="admin-card flex flex-col items-center justify-center py-12 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">{hasFilters ? 'Sin resultados para estos filtros' : 'No hay ingresos registrados'}</p>
          {!hasFilters && <Button onClick={() => setShowModal(true)}><Plus className="mr-2 h-4 w-4" />Registrar primer ingreso</Button>}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-3 w-[42%]">Ingreso</TableHead>
                <TableHead className="w-[120px]">Fecha</TableHead>
                <TableHead className="text-right w-[150px]">Total</TableHead>
                <TableHead className="w-[130px]">Método</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const paid = Number(tx.amount_paid || 0)
                const total = Number(tx.total || 0)
                const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0
                const indicatorColor = tx.type === 'online_sale' ? 'bg-blue-500' : 'bg-green-500'
                return (
                  <TableRow key={tx.id} className="group">
                    <TableCell className="pl-0 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-0.5 h-9 rounded-full shrink-0 ${indicatorColor}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none ${typePillColors[tx.type] || 'bg-muted text-muted-foreground'}`}>{typeLabels[tx.type] || tx.type}</span>
                            {tx.order_number && <span className="text-[10px] text-muted-foreground">#{tx.order_number}</span>}
                          </div>
                          <p className="text-sm font-medium truncate max-w-[260px] leading-snug">{tx.description || (tx.order_number ? `Pedido ${tx.order_number}` : '—')}</p>
                          {tx.customer_name && <p className="text-xs text-muted-foreground truncate">{tx.customer_name}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      <p className="text-sm">{formatDate(tx.transaction_date)}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(tx.transaction_date)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-sm font-bold">{formatPrice(total)}</p>
                      <div className="mt-1 flex flex-col items-end gap-0.5">
                        {paid >= total ? (
                          <span className="text-[10px] font-semibold text-green-500">Cobrado ✓</span>
                        ) : paid > 0 ? (
                          <><div className="w-14 h-1 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-yellow-500" style={{ width: `${pct}%` }} /></div><span className="text-[10px] text-yellow-500">{formatPrice(paid)} / {formatPrice(total)}</span></>
                        ) : (
                          <span className="text-[10px] text-red-400">Sin cobrar</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{paymentMethodLabels[tx.payment_method] || tx.payment_method}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openViewTransaction(tx)}><Eye className="h-3.5 w-3.5" /></Button>
                        {!tx.order_id && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTransaction(tx)}><Pencil className="h-3.5 w-3.5" /></Button>}
                        {!tx.order_id && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(tx.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{pagination.total} ingresos en total</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Anterior</Button>
            <span className="text-sm">Pag. {pagination.page} de {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Siguiente</Button>
          </div>
        </div>
      )}

      {/* Register Modal */}
      <FinanceModal isOpen={showModal} onClose={() => setShowModal(false)} onSuccess={() => { fetchTransactions(); fetchChartData(); fetchProducts() }} defaultTab="sale" products={products} showToast={showToast} />

      {/* View Detail Modal */}
      <Dialog open={!!viewTransaction} onOpenChange={() => { setViewTransaction(null); setShowAbonoForm(false) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalle del Ingreso</DialogTitle></DialogHeader>
          {viewTransaction && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Tipo</p><Badge variant="outline" className={typePillColors[viewTransaction.type] || ''}>{typeLabels[viewTransaction.type] || viewTransaction.type}</Badge></div>
                <div><p className="text-muted-foreground">Fecha</p><p className="font-medium">{formatDate(viewTransaction.transaction_date)} {formatTime(viewTransaction.transaction_date)}</p></div>
                <div><p className="text-muted-foreground">Método de pago</p><p className="font-medium">{paymentMethodLabels[viewTransaction.payment_method]}</p></div>
                <div><p className="text-muted-foreground">Estado</p><Badge variant="outline" className={paymentStatusColors[viewTransaction.payment_status] || ''}>{paymentStatusLabels[viewTransaction.payment_status]}</Badge></div>
                {viewTransaction.customer_name && (<div className="col-span-2"><p className="text-muted-foreground">Cliente</p><p className="font-medium">{viewTransaction.customer_name}</p>{viewTransaction.customer_phone && <p className="text-xs text-muted-foreground">{viewTransaction.customer_phone}</p>}</div>)}
                {viewTransaction.order_number && (<div><p className="text-muted-foreground">Pedido</p><p className="font-medium">#{viewTransaction.order_number}</p></div>)}
                {viewTransaction.payment_reference && (<div><p className="text-muted-foreground">Referencia</p><p className="font-medium">{viewTransaction.payment_reference}</p></div>)}
              </div>
              {viewTransaction.description && <div><p className="text-sm text-muted-foreground">Descripcion</p><p className="text-sm">{viewTransaction.description}</p></div>}
              <div className="border-t pt-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(viewTransaction.subtotal)}</span></div>
                {Number(viewTransaction.shipping_cost) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Envio</span><span>{formatPrice(viewTransaction.shipping_cost)}</span></div>}
                {Number(viewTransaction.discount) > 0 && <div className="flex justify-between text-red-500"><span>Descuento</span><span>-{formatPrice(viewTransaction.discount)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{formatPrice(viewTransaction.total)}</span></div>
              </div>

              {/* Payment progress */}
              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Progreso de Pago</h4>
                    {Number(viewTransaction.amount_paid) >= Number(viewTransaction.total) ? <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Pagado completo</Badge> : Number(viewTransaction.amount_paid) > 0 ? <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pago parcial</Badge> : <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Sin pago</Badge>}
                  </div>
                  <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${Number(viewTransaction.amount_paid) >= Number(viewTransaction.total) ? 'bg-green-500' : Number(viewTransaction.amount_paid) > 0 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min((Number(viewTransaction.amount_paid) / Number(viewTransaction.total)) * 100, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Abonado: <span className="font-semibold text-foreground">{formatPrice(Number(viewTransaction.amount_paid || 0))}</span></span>
                    <span className="text-muted-foreground">Pendiente: <span className="font-semibold text-foreground">{formatPrice(Math.max(Number(viewTransaction.total) - Number(viewTransaction.amount_paid || 0), 0))}</span></span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Number(viewTransaction.amount_paid) < Number(viewTransaction.total) && <Button size="sm" variant="outline" className="text-green-600 border-green-600/30 hover:bg-green-500/10" onClick={() => handleForcePaymentStatus('approved')} disabled={forcingPayment}>{forcingPayment ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}Marcar como Pagado</Button>}
                  {viewTransaction.payment_status === 'approved' && <Button size="sm" variant="outline" className="text-yellow-600 border-yellow-600/30 hover:bg-yellow-500/10" onClick={() => handleForcePaymentStatus('pending')} disabled={forcingPayment}>{forcingPayment ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ArrowUpDown className="mr-1 h-3 w-3" />}Cambiar a Pendiente</Button>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Historial de Abonos</h4>
                    {Number(viewTransaction.amount_paid) < Number(viewTransaction.total) && <Button size="sm" variant="outline" onClick={() => { setShowAbonoForm(!showAbonoForm); setAbonoForm({ amount: '', paymentMethod: 'cash', paymentReference: '', notes: '', paymentDate: getBogotaDateTimeStr() }) }}><Plus className="mr-1 h-3 w-3" />Agregar Abono</Button>}
                  </div>
                  {loadingPayments ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    : payments.length === 0 ? <p className="text-sm text-muted-foreground text-center py-3">No hay abonos registrados</p>
                    : <div className="space-y-2 max-h-48 overflow-y-auto">{payments.map(p => (<div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"><div className="flex-1"><div className="flex items-center gap-2"><span className="font-semibold text-sm text-green-600">+{formatPrice(p.amount)}</span><Badge variant="outline" className="text-[10px] px-1.5 py-0">{paymentMethodLabels[p.payment_method] || p.payment_method}</Badge></div><span className="text-xs text-muted-foreground">{formatDate(p.payment_date)} {formatTime(p.payment_date)}</span></div><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10" onClick={() => handleDeletePayment(p.id)} disabled={deletingPaymentId === p.id}>{deletingPaymentId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}</Button></div>))}</div>
                  }
                </div>
                {showAbonoForm && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                    <h5 className="font-semibold text-sm">Nuevo Abono</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Monto *</Label><Input type="number" placeholder="0" value={abonoForm.amount} onChange={e => setAbonoForm(p => ({ ...p, amount: e.target.value }))} /><p className="text-[10px] text-muted-foreground">Max: {formatPrice(Math.max(Number(viewTransaction.total) - Number(viewTransaction.amount_paid || 0), 0))}</p></div>
                      <div className="space-y-1"><Label className="text-xs">Método</Label><Select value={abonoForm.paymentMethod} onValueChange={v => setAbonoForm(p => ({ ...p, paymentMethod: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Efectivo</SelectItem><SelectItem value="transfer">Transferencia</SelectItem><SelectItem value="nequi">Nequi</SelectItem><SelectItem value="other">Otro</SelectItem></SelectContent></Select></div>
                      <div className="space-y-1"><Label className="text-xs">Fecha</Label><Input type="datetime-local" value={abonoForm.paymentDate} onChange={e => setAbonoForm(p => ({ ...p, paymentDate: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Referencia</Label><Input placeholder="Comprobante..." value={abonoForm.paymentReference} onChange={e => setAbonoForm(p => ({ ...p, paymentReference: e.target.value }))} /></div>
                    </div>
                    <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setShowAbonoForm(false)}>Cancelar</Button><Button size="sm" onClick={handleAddAbono} disabled={savingAbono}>{savingAbono && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Registrar Abono</Button></div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Registrado por: {viewTransaction.created_by}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editTransaction} onOpenChange={() => setEditTransaction(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Ingreso</DialogTitle><DialogDescription>Modifica los datos de este registro.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fecha y Hora</Label><Input type="datetime-local" value={editForm.transactionDate} onChange={e => setEditForm(p => ({ ...p, transactionDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Método de Pago</Label><Select value={editForm.paymentMethod} onValueChange={v => setEditForm(p => ({ ...p, paymentMethod: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Efectivo</SelectItem><SelectItem value="transfer">Transferencia</SelectItem><SelectItem value="nequi">Nequi</SelectItem><SelectItem value="daviplata">Daviplata</SelectItem><SelectItem value="other">Otro</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Referencia</Label><Input value={editForm.paymentReference} onChange={e => setEditForm(p => ({ ...p, paymentReference: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Descripcion</Label><Input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Cliente</Label><Input value={editForm.customerName} onChange={e => setEditForm(p => ({ ...p, customerName: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Teléfono</Label><Input value={editForm.customerPhone} onChange={e => setEditForm(p => ({ ...p, customerPhone: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Notas</Label><Textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" onClick={() => setEditTransaction(null)}>Cancelar</Button><Button onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Eliminar ingreso</AlertDialogTitle><AlertDialogDescription>Esta transaccion se eliminara permanentemente. Las ventas online no se pueden eliminar.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={deleting}>{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
