'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, Download, Loader2, Check, Trash2,
  TrendingDown, Receipt, Eye, Pencil,
  CreditCard, X, Calendar,
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
  pending: 'Pendiente', approved: 'Pagado', rejected: 'Rechazado',
}

const typeLabels: Record<string, string> = {
  expense: 'Gasto', refund: 'Devolución',
}
const typePillColors: Record<string, string> = {
  expense: 'bg-red-500/10 text-red-400',
  refund: 'bg-orange-500/10 text-orange-400',
}

export default function GastosPage() {
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
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState({ paymentMethod: '', paymentReference: '', transactionDate: '', notes: '', description: '', customerName: '', customerPhone: '', customerEmail: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('typeGroup', 'expense')
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
    } catch { showToast('Error al cargar gastos', 'error') }
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
      const a = document.createElement('a'); a.href = url; a.download = `gastos-${new Date().toISOString().split('T')[0]}.csv`
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
          <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground text-sm">Egresos y devoluciones registrados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />Exportar</Button>
          <Button size="sm" onClick={() => setShowModal(true)}><Plus className="mr-2 h-4 w-4" />Registrar gasto</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="admin-card border-red-500/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Total egresos</p>
                <div className="text-2xl font-bold text-red-500">{formatPrice(Number(summary.totalExpenses || 0) + Number(summary.totalRefunds || 0))}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Gastos y devoluciones</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Gastos pagados</p>
                <div className="text-2xl font-bold">{formatPrice(Number(summary.totalExpenses || 0))}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Aprobados</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Devoluciones</p>
                <div className="text-2xl font-bold">{formatPrice(Number(summary.totalRefunds || 0))}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Reembolsos aprobados</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <TrendingDown className="h-4 w-4 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Saldo pendiente</p>
                <div className="text-2xl font-bold text-yellow-500">{formatPrice(Number(summary.pendingBalance || 0))}</div>
                <p className="text-[11px] text-muted-foreground mt-1">{summary.partialCount || 0} con saldo</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 text-yellow-500" />
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
              <span className="inline-block w-3 h-0.5 rounded-full bg-red-500" />
              Gastos históricos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: 'currentColor', opacity: 0.5 }} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickMargin={4} width={56} tick={{ fill: 'currentColor', opacity: 0.5 }} tickFormatter={fmt} />
                  <RechartsTooltip formatter={(v: number) => [new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v), 'Gastos']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="egresos" stroke="#ef4444" strokeWidth={2} fill="url(#expGrad)" dot={{ fill: '#ef4444', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#ef4444', strokeWidth: 0 }} />
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
            <Input placeholder="Buscar descripcion, categoria..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })) }} />
          </div>
          <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPagination(p => ({ ...p, page: 1 })) }}>
            <SelectTrigger className="w-[150px] shrink-0"><CreditCard className="mr-2 h-4 w-4" /><SelectValue placeholder="Método" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cash">Efectivo</SelectItem>
              <SelectItem value="transfer">Transferencia</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={showDateFilter ? 'secondary' : 'outline'} size="sm" onClick={() => setShowDateFilter(v => !v)} className="shrink-0 gap-2">
            <Calendar className="h-4 w-4" />Fecha
            {(dateFrom || dateTo) && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
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
          <TrendingDown className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">{hasFilters ? 'Sin resultados para estos filtros' : 'No hay gastos registrados'}</p>
          {!hasFilters && <Button onClick={() => setShowModal(true)}><Plus className="mr-2 h-4 w-4" />Registrar primer gasto</Button>}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-3 w-[42%]">Gasto</TableHead>
                <TableHead className="w-[120px]">Fecha</TableHead>
                <TableHead className="text-right w-[150px]">Total</TableHead>
                <TableHead className="w-[130px]">Método</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} className="group">
                  <TableCell className="pl-0 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-0.5 h-9 rounded-full shrink-0 bg-red-500" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none ${typePillColors[tx.type] || 'bg-muted text-muted-foreground'}`}>{typeLabels[tx.type] || tx.type}</span>
                        </div>
                        <p className="text-sm font-medium truncate max-w-[260px] leading-snug">{tx.description || '—'}</p>
                        {tx.customer_name && <p className="text-xs text-muted-foreground truncate">{tx.customer_name}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    <p className="text-sm">{formatDate(tx.transaction_date)}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(tx.transaction_date)}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className="text-sm font-bold text-red-500">-{formatPrice(Number(tx.total))}</p>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 mt-1 ${paymentStatusColors[tx.payment_status] || ''}`}>{paymentStatusLabels[tx.payment_status] || tx.payment_status}</Badge>
                  </TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{paymentMethodLabels[tx.payment_method] || tx.payment_method}</span></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewTransaction(tx)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTransaction(tx)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(tx.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{pagination.total} gastos en total</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Anterior</Button>
            <span className="text-sm">Pag. {pagination.page} de {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Siguiente</Button>
          </div>
        </div>
      )}

      {/* Register Modal */}
      <FinanceModal isOpen={showModal} onClose={() => setShowModal(false)} onSuccess={() => { fetchTransactions(); fetchChartData() }} defaultTab="expense" products={products} showToast={showToast} />

      {/* View Detail Modal */}
      <Dialog open={!!viewTransaction} onOpenChange={() => setViewTransaction(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalle del Gasto</DialogTitle></DialogHeader>
          {viewTransaction && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Tipo</p><Badge variant="outline" className={typePillColors[viewTransaction.type] || ''}>{typeLabels[viewTransaction.type] || viewTransaction.type}</Badge></div>
                <div><p className="text-muted-foreground">Fecha</p><p className="font-medium">{formatDate(viewTransaction.transaction_date)} {formatTime(viewTransaction.transaction_date)}</p></div>
                <div><p className="text-muted-foreground">Método</p><p className="font-medium">{paymentMethodLabels[viewTransaction.payment_method]}</p></div>
                <div><p className="text-muted-foreground">Estado</p><Badge variant="outline" className={paymentStatusColors[viewTransaction.payment_status] || ''}>{paymentStatusLabels[viewTransaction.payment_status]}</Badge></div>
                {viewTransaction.payment_reference && (<div className="col-span-2"><p className="text-muted-foreground">Referencia</p><p className="font-medium">{viewTransaction.payment_reference}</p></div>)}
              </div>
              {viewTransaction.description && <div><p className="text-sm text-muted-foreground">Descripcion</p><p className="text-sm">{viewTransaction.description}</p></div>}
              {viewTransaction.notes && <div><p className="text-sm text-muted-foreground">Notas</p><p className="text-sm">{viewTransaction.notes}</p></div>}
              <div className="border-t pt-4 text-sm">
                <div className="flex justify-between font-bold text-base text-red-500"><span>Total gasto</span><span>-{formatPrice(viewTransaction.total)}</span></div>
              </div>
              <p className="text-xs text-muted-foreground">Registrado por: {viewTransaction.created_by}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editTransaction} onOpenChange={() => setEditTransaction(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Gasto</DialogTitle><DialogDescription>Modifica los datos de este registro.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fecha y Hora</Label><Input type="datetime-local" value={editForm.transactionDate} onChange={e => setEditForm(p => ({ ...p, transactionDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Método de Pago</Label><Select value={editForm.paymentMethod} onValueChange={v => setEditForm(p => ({ ...p, paymentMethod: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Efectivo</SelectItem><SelectItem value="transfer">Transferencia</SelectItem><SelectItem value="nequi">Nequi</SelectItem><SelectItem value="other">Otro</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Referencia</Label><Input value={editForm.paymentReference} onChange={e => setEditForm(p => ({ ...p, paymentReference: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Descripcion</Label><Input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Notas</Label><Textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={3} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" onClick={() => setEditTransaction(null)}>Cancelar</Button><Button onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Eliminar gasto</AlertDialogTitle><AlertDialogDescription>Este gasto se eliminara permanentemente. Esta accion no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={deleting}>{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
