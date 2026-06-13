'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Download, Eye, Truck, Check, Loader2, X, Trash2, AlertTriangle, RefreshCw, CreditCard, Phone, Mail, MapPin, Package, Clock, CheckCircle2, XCircle, ShieldCheck, Banknote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/data'

interface Order {
  id: number
  order_number: string
  customer_email: string
  customer_first_name: string
  customer_last_name: string
  customer_phone: string | null
  shipping_address_line1: string
  shipping_city: string
  shipping_department: string
  subtotal: number
  shipping_cost: number
  total: number
  status: string
  payment_status: string
  payment_method: string | null
  tracking_number: string | null
  tracking_url: string | null
  admin_notes: string | null
  created_at: string
  item_count: number
  // Email tracking flags
  confirmation_email_sent?: boolean
  email_confirmed_sent?: boolean
  email_preparing_sent?: boolean
  email_shipped_sent?: boolean
  email_delivered_sent?: boolean
}

interface OrderItem {
  id: number
  product_name: string
  product_sku: string | null
  unit_price: number
  quantity: number
  subtotal: number
}

interface StatusHistoryEntry {
  id: number
  previous_status: string
  new_status: string
  previous_payment_status?: string
  new_payment_status?: string
  changed_by: string
  notes: string | null
  created_at: string
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning'
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  processing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  shipped: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  processing: 'En Preparacion',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  approved: 'bg-green-500/10 text-green-500 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const paymentStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [counts, setCounts] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [toasts, setToasts] = useState<Toast[]>([])
  
  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  
  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Update status modal
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusOrder, setStatusOrder] = useState<Order | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  
  // Tracking modal
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  
  // COD action modal
  const [showCODModal, setShowCODModal] = useState(false)
  const [codOrder, setCodOrder] = useState<Order | null>(null)
  const [codNotes, setCodNotes] = useState('')
  
  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
  const [deleting, setDeleting] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (paymentFilter !== 'all') params.set('paymentStatus', paymentFilter)
      
      const res = await fetch(`/api/admin/orders?${params}`)
      const data = await res.json()
      
      if (data.orders) {
        setOrders(data.orders)
        setCounts(data.counts || {})
      }
    } catch {
      showToast('Error al cargar pedidos', 'error')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, paymentFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // ============================================================
  // ORDER DETAIL
  // ============================================================
  const openOrderDetail = async (order: Order) => {
    setSelectedOrder(order)
    setLoadingDetail(true)
    setOrderItems([])
    setStatusHistory([])
    
    try {
      const res = await fetch(`/api/admin/orders?id=${order.id}`)
      const data = await res.json()
      if (data.items) setOrderItems(data.items)
      if (data.statusHistory) setStatusHistory(data.statusHistory)
    } catch {
      showToast('Error al cargar detalles', 'error')
    } finally {
      setLoadingDetail(false)
    }
  }

  // ============================================================
  // VERIFY WOMPI PAYMENT
  // ============================================================
  const verifyWompiPayment = async (order: Order) => {
    setActionLoading(`wompi-${order.id}`)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, action: 'verifyWompi' })
      })
      const data = await res.json()
      
      if (data.error) {
        showToast(data.error, 'error')
      } else if (data.wompiStatus === 'APPROVED') {
        showToast(`Pago APROBADO para ${order.order_number}. Cliente y admin notificados.`, 'success')
        fetchOrders()
      } else if (data.wompiStatus === 'PENDING') {
        showToast(`Pago aun PENDIENTE en Wompi para ${order.order_number}`, 'warning')
      } else if (data.verified === false) {
        showToast(data.message || 'No se encontro transaccion en Wompi', 'warning')
      } else {
        showToast(`Estado Wompi: ${data.wompiStatus || 'desconocido'}`, 'warning')
        fetchOrders()
      }
    } catch {
      showToast('Error al consultar Wompi', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // ============================================================
  // COD ACTIONS
  // ============================================================
  const openCODModal = (order: Order) => {
    setCodOrder(order)
    setCodNotes('')
    setShowCODModal(true)
  }

  const handleCODAction = async (action: string) => {
    if (!codOrder) return
    setActionLoading(`cod-${action}`)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: codOrder.id, action: 'confirmCOD', codAction: action, notes: codNotes })
      })
      const data = await res.json()
      if (data.success) {
        showToast(data.message, 'success')
        setShowCODModal(false)
        fetchOrders()
      } else {
        showToast(data.error || 'Error', 'error')
      }
    } catch {
      showToast('Error al procesar accion COD', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // ============================================================
  // UPDATE STATUS
  // ============================================================
  const openStatusModal = (order: Order) => {
    setStatusOrder(order)
    setNewStatus(order.status)
    setAdminNotes('')
    setShowStatusModal(true)
  }

  const handleUpdateStatus = async () => {
    if (!statusOrder) return
    setActionLoading('status')
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: statusOrder.id, action: 'updateStatus', status: newStatus, adminNotes })
      })
      const data = await res.json()
      if (data.success) {
        showToast(data.message || 'Estado actualizado', 'success')
        setShowStatusModal(false)
        fetchOrders()
      } else {
        showToast(data.error || 'Error al actualizar estado', 'error')
      }
    } catch {
      showToast('Error al actualizar estado', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // ============================================================
  // UPDATE TRACKING
  // ============================================================
  const openTrackingModal = (order: Order) => {
    setTrackingOrder(order)
    setTrackingNumber(order.tracking_number || '')
    setTrackingUrl(order.tracking_url || '')
    setShowTrackingModal(true)
  }

  const handleUpdateTracking = async () => {
    if (!trackingOrder || !trackingNumber) {
      showToast('Numero de guia requerido', 'error')
      return
    }
    setActionLoading('tracking')
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: trackingOrder.id, action: 'updateTracking', trackingNumber, trackingUrl })
      })
      const data = await res.json()
      if (data.success) {
        showToast(data.message || 'Tracking actualizado', 'success')
        setShowTrackingModal(false)
        fetchOrders()
      } else {
        showToast(data.error || 'Error', 'error')
      }
    } catch {
      showToast('Error al actualizar tracking', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // ============================================================
  // DELETE
  // ============================================================
  const handleDelete = async () => {
    if (!orderToDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/orders?id=${orderToDelete.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        showToast('Pedido eliminado exitosamente', 'success')
        setShowDeleteModal(false)
        setOrderToDelete(null)
        if (selectedOrder?.id === orderToDelete.id) setSelectedOrder(null)
        fetchOrders()
      } else {
        showToast(data.error || 'Error al eliminar', 'error')
      }
    } catch {
      showToast('Error al eliminar pedido', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ============================================================
  // RESEND EMAIL
  // ============================================================
  const resendEmail = async (order: Order, emailType: 'confirmed' | 'preparing' | 'shipped' | 'delivered') => {
    setActionLoading(`resend-${emailType}-${order.id}`)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, action: 'resendEmail', emailType })
      })
      const data = await res.json()
      
      if (data.success) {
        showToast(data.message, 'success')
        fetchOrders()
      } else {
        showToast(data.error || 'Error al enviar email', 'error')
      }
    } catch {
      showToast('Error al enviar email', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  const isCOD = (order: Order) => order.payment_method === 'COD' || order.payment_method === 'cod'
  
  // Helper para determinar que tipo de email puede reenviarse
  const getAvailableEmailTypes = (order: Order) => {
    const types: { type: 'confirmed' | 'preparing' | 'shipped' | 'delivered', label: string, available: boolean, sent: boolean }[] = []
    
    // Email de confirmacion: disponible si pago aprobado o es COD
    if (order.payment_status === 'approved' || isCOD(order)) {
      types.push({
        type: 'confirmed',
        label: 'Confirmacion',
        available: true,
        sent: !!order.confirmation_email_sent || !!order.email_confirmed_sent
      })
    }
    
    // Email de preparacion: disponible si estado es processing o superior
    if (['processing', 'shipped', 'delivered'].includes(order.status)) {
      types.push({
        type: 'preparing',
        label: 'En preparacion',
        available: true,
        sent: !!order.email_preparing_sent
      })
    }
    
    // Email de envio: disponible si hay tracking
    if (order.tracking_number) {
      types.push({
        type: 'shipped',
        label: 'Envio',
        available: true,
        sent: !!order.email_shipped_sent
      })
    }
    
    // Email de entrega: disponible si estado es delivered
    if (order.status === 'delivered') {
      types.push({
        type: 'delivered',
        label: 'Entregado',
        available: true,
        sent: !!order.email_delivered_sent
      })
    }
    
    return types
  }

  return (
    <div className="space-y-6 pt-16 lg:pt-0">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right max-w-sm ${
              toast.type === 'success' ? 'bg-green-500 text-white' 
              : toast.type === 'warning' ? 'bg-yellow-500 text-white'
              : 'bg-red-500 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> 
             : toast.type === 'warning' ? <AlertTriangle className="h-4 w-4 shrink-0" />
             : <XCircle className="h-4 w-4 shrink-0" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pedidos</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona y da seguimiento a los pedidos de tu tienda
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => fetchOrders()}
              className="h-9 w-9"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <Card 
            className={`admin-card cursor-pointer transition-all hover:scale-[1.02] ${statusFilter === 'all' && paymentFilter === 'all' ? 'ring-2 ring-foreground/20' : ''}`}
            onClick={() => { setStatusFilter('all'); setPaymentFilter('all') }}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Total</p>
                  <p className="text-xl font-bold mt-0.5 tabular-nums">{counts.total || 0}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`admin-card cursor-pointer transition-all hover:scale-[1.02] border-yellow-500/20 ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500/50' : ''}`}
            onClick={() => { setStatusFilter('pending'); setPaymentFilter('all') }}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Pendientes</p>
                  <p className="text-xl font-bold mt-0.5 text-yellow-500 tabular-nums">{counts.pending || 0}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`admin-card cursor-pointer transition-all hover:scale-[1.02] border-blue-500/20 ${statusFilter === 'confirmed' ? 'ring-2 ring-blue-500/50' : ''}`}
            onClick={() => { setStatusFilter('confirmed'); setPaymentFilter('all') }}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Confirmados</p>
                  <p className="text-xl font-bold mt-0.5 text-blue-500 tabular-nums">{counts.confirmed || 0}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`admin-card cursor-pointer transition-all hover:scale-[1.02] border-purple-500/20 ${statusFilter === 'shipped' ? 'ring-2 ring-purple-500/50' : ''}`}
            onClick={() => { setStatusFilter('shipped'); setPaymentFilter('all') }}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Enviados</p>
                  <p className="text-xl font-bold mt-0.5 text-purple-500 tabular-nums">{counts.shipped || 0}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Truck className="h-4 w-4 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`admin-card cursor-pointer transition-all hover:scale-[1.02] border-green-500/20 ${statusFilter === 'delivered' ? 'ring-2 ring-green-500/50' : ''}`}
            onClick={() => { setStatusFilter('delivered'); setPaymentFilter('all') }}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Entregados</p>
                  <p className="text-xl font-bold mt-0.5 text-green-500 tabular-nums">{counts.delivered || 0}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`admin-card cursor-pointer transition-all hover:scale-[1.02] border-orange-500/20 ${paymentFilter === 'pending' ? 'ring-2 ring-orange-500/50' : ''}`}
            onClick={() => { setStatusFilter('all'); setPaymentFilter('pending') }}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Pago Pend.</p>
                  <p className="text-xl font-bold mt-0.5 text-orange-500 tabular-nums">{counts.payment_pending || 0}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`admin-card cursor-pointer transition-all hover:scale-[1.02] border-cyan-500/20`}
            onClick={() => { setStatusFilter('all'); setPaymentFilter('all') }}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">COD Pend.</p>
                  <p className="text-xl font-bold mt-0.5 text-cyan-500 tabular-nums">{counts.cod_pending || 0}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Banknote className="h-4 w-4 text-cyan-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card className="admin-card">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por numero, cliente, email o telefono..." 
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <Filter className="mr-2 h-3.5 w-3.5" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="confirmed">Confirmados</SelectItem>
                  <SelectItem value="processing">Procesando</SelectItem>
                  <SelectItem value="shipped">Enviados</SelectItem>
                  <SelectItem value="delivered">Entregados</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <CreditCard className="mr-2 h-3.5 w-3.5" />
                  <SelectValue placeholder="Pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los pagos</SelectItem>
                  <SelectItem value="pending">Pago pendiente</SelectItem>
                  <SelectItem value="approved">Pago aprobado</SelectItem>
                  <SelectItem value="rejected">Pago rechazado</SelectItem>
                </SelectContent>
              </Select>
              {(search || statusFilter !== 'all' || paymentFilter !== 'all') && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setPaymentFilter('all') }} className="h-9">
                  <X className="mr-1 h-4 w-4" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table / Cards */}
      <Card className="admin-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cargando pedidos...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center mb-4">
              <Package className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No hay pedidos con estos filtros</p>
            <p className="text-sm text-muted-foreground mt-1">Intenta cambiar los filtros de busqueda</p>
          </div>
        ) : (
          <>
          {/* Mobile Cards View */}
          <div className="lg:hidden divide-y">
            {orders.map((order) => (
              <div key={order.id} className={`p-4 space-y-3 ${order.payment_method === 'COD' && order.status === 'pending' ? 'bg-blue-500/5' : ''}`}>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.created_at)} {formatTime(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatPrice(order.total)}</p>
                    {isCOD(order) && (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px]">COD</Badge>
                    )}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium">{order.customer_first_name[0]}{order.customer_last_name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{order.customer_first_name} {order.customer_last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{order.customer_email}</p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{order.shipping_city}, {order.shipping_department}</span>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={statusColors[order.status] || ''}>
                    {statusLabels[order.status] || order.status}
                  </Badge>
                  <Badge variant="outline" className={paymentStatusColors[order.payment_status] || ''}>
                    {paymentStatusLabels[order.payment_status] || order.payment_status}
                  </Badge>
                  {order.tracking_number && (
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[10px]">
                      Guia: {order.tracking_number}
                    </Badge>
                  )}
                </div>

                {/* Email Status Icons (mobile compact view) */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Emails:</span>
                  {(order.confirmation_email_sent || order.email_confirmed_sent) && (
                    <span className="flex items-center gap-0.5 text-green-600" title="Confirmacion enviada">
                      <CheckCircle2 className="h-3 w-3" /> Conf
                    </span>
                  )}
                  {order.email_preparing_sent && (
                    <span className="flex items-center gap-0.5 text-blue-600" title="Preparacion enviada">
                      <CheckCircle2 className="h-3 w-3" /> Prep
                    </span>
                  )}
                  {order.email_shipped_sent && (
                    <span className="flex items-center gap-0.5 text-purple-600" title="Envio enviado">
                      <CheckCircle2 className="h-3 w-3" /> Env
                    </span>
                  )}
                  {order.email_delivered_sent && (
                    <span className="flex items-center gap-0.5 text-green-600" title="Entrega enviada">
                      <CheckCircle2 className="h-3 w-3" /> Ent
                    </span>
                  )}
                  {!order.confirmation_email_sent && !order.email_confirmed_sent && !order.email_preparing_sent && !order.email_shipped_sent && !order.email_delivered_sent && (
                    <span className="text-yellow-600 flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> Pendiente
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openOrderDetail(order)}>
                    <Eye className="h-3 w-3 mr-1" /> Ver
                  </Button>
                  
                  {order.payment_status === 'pending' && !isCOD(order) && (
                    <Button
                      size="sm" variant="outline"
                      className="text-green-600 border-green-600/30 flex-1"
                      onClick={() => verifyWompiPayment(order)}
                      disabled={actionLoading === `wompi-${order.id}`}
                    >
                      {actionLoading === `wompi-${order.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
                      Verificar
                    </Button>
                  )}

                  {isCOD(order) && order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <Button
                      size="sm" variant="outline"
                      className="text-blue-600 border-blue-600/30 flex-1"
                      onClick={() => openCODModal(order)}
                    >
                      <Banknote className="h-3 w-3 mr-1" /> COD
                    </Button>
                  )}

                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openStatusModal(order)}>
                      <Check className="h-3 w-3 mr-1" /> Estado
                    </Button>
                  )}

                  {['confirmed', 'processing', 'shipped'].includes(order.status) && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openTrackingModal(order)}>
                      <Truck className="h-3 w-3 mr-1" /> Guia
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View — 5 cols */}
          <div className="hidden lg:block rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-3 w-[38%]">Pedido · Cliente</TableHead>
                <TableHead className="w-[160px]">Destino · Fecha</TableHead>
                <TableHead className="text-right w-[140px]">Total · Pago</TableHead>
                <TableHead className="w-[160px]">Estado</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const isCod = isCOD(order)
                const statusColor = statusColors[order.status] || ''
                return (
                  <TableRow
                    key={order.id}
                    className={`group ${isCod && order.status === 'pending' ? 'bg-blue-500/5' : ''}`}
                  >
                    {/* Pedido + cliente */}
                    <TableCell className="pl-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-0.5 h-9 rounded-full shrink-0 ${
                          order.status === 'delivered' ? 'bg-green-500' :
                          order.status === 'shipped'   ? 'bg-purple-500' :
                          order.status === 'cancelled' ? 'bg-red-500' :
                          order.payment_status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-sm font-bold leading-none">{order.order_number}</p>
                            <span className="text-[10px] text-muted-foreground">
                              {order.item_count || 1} prod.
                            </span>
                            {isCod && (
                              <span className="inline-flex px-1 py-0.5 rounded text-[9px] font-bold leading-none bg-blue-500/15 text-blue-400">
                                COD
                              </span>
                            )}
                          </div>
                          <p className="text-sm truncate leading-snug">
                            {order.customer_first_name} {order.customer_last_name}
                          </p>
                          {order.customer_phone ? (
                            <a
                              href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-xs text-green-600 hover:underline"
                            >
                              {order.customer_phone}
                            </a>
                          ) : (
                            <p className="text-xs text-muted-foreground truncate">{order.customer_email}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Destino + fecha */}
                    <TableCell>
                      <p className="text-sm">{order.shipping_city}</p>
                      <p className="text-xs text-muted-foreground">{order.shipping_department}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{formatDate(order.created_at)}</p>
                    </TableCell>

                    {/* Total + pago */}
                    <TableCell className="text-right">
                      <p className="text-sm font-bold">{formatPrice(order.total)}</p>
                      <Badge variant="outline" className={`mt-1 text-[10px] h-5 px-1.5 ${paymentStatusColors[order.payment_status] || ''}`}>
                        {paymentStatusLabels[order.payment_status] || order.payment_status}
                      </Badge>
                    </TableCell>

                    {/* Estado + emails */}
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusColor}`}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                      <div className="flex items-center gap-0.5 mt-1.5">
                        <div
                          className={`h-4 w-4 rounded-full flex items-center justify-center ${
                            (order.confirmation_email_sent || order.email_confirmed_sent)
                              ? 'bg-green-500/15' : 'bg-yellow-500/10'
                          }`}
                          title={(order.confirmation_email_sent || order.email_confirmed_sent) ? 'Confirmación enviada' : 'Confirmación pendiente'}
                        >
                          {(order.confirmation_email_sent || order.email_confirmed_sent)
                            ? <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                            : <Clock className="h-2.5 w-2.5 text-yellow-500" />
                          }
                        </div>
                        {order.email_preparing_sent && (
                          <div className="h-4 w-4 rounded-full bg-blue-500/15 flex items-center justify-center" title="Email preparación">
                            <Package className="h-2.5 w-2.5 text-blue-500" />
                          </div>
                        )}
                        {order.email_shipped_sent && (
                          <div className="h-4 w-4 rounded-full bg-purple-500/15 flex items-center justify-center" title="Email envío">
                            <Truck className="h-2.5 w-2.5 text-purple-500" />
                          </div>
                        )}
                        {order.email_delivered_sent && (
                          <div className="h-4 w-4 rounded-full bg-green-500/15 flex items-center justify-center" title="Email entrega">
                            <Check className="h-2.5 w-2.5 text-green-500" />
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Acciones — hover only */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openOrderDetail(order)} title="Ver detalles">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {order.payment_status === 'pending' && !isCod && (
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:bg-green-500/10"
                            onClick={() => verifyWompiPayment(order)}
                            disabled={actionLoading === `wompi-${order.id}`}
                            title="Verificar Wompi"
                          >
                            {actionLoading === `wompi-${order.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        {isCod && order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-500/10" onClick={() => openCODModal(order)} title="Contra entrega">
                            <Banknote className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openStatusModal(order)} title="Cambiar estado">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {['confirmed', 'processing', 'shipped'].includes(order.status) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTrackingModal(order)} title="Agregar guía">
                            <Truck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => { setOrderToDelete(order); setShowDeleteModal(true) }}
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </div>
          </>
        )}
      </Card>

      {/* ============================================================ */}
      {/* ORDER DETAIL MODAL */}
      {/* ============================================================ */}
      <Dialog open={!!selectedOrder && !showStatusModal && !showTrackingModal && !showCODModal} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Pedido {selectedOrder?.order_number}
              {selectedOrder && isCOD(selectedOrder) && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Contra Entrega</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Status + Payment badges */}
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={statusColors[selectedOrder.status] || ''}>
                  {statusLabels[selectedOrder.status] || selectedOrder.status}
                </Badge>
                <Badge variant="outline" className={paymentStatusColors[selectedOrder.payment_status] || ''}>
                  Pago: {paymentStatusLabels[selectedOrder.payment_status] || selectedOrder.payment_status}
                </Badge>
                {selectedOrder.tracking_number && (
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                    Guia: {selectedOrder.tracking_number}
                  </Badge>
                )}
              </div>

              {/* Customer & Shipping Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Cliente
                  </h3>
                  <p className="font-medium">{selectedOrder.customer_first_name} {selectedOrder.customer_last_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customer_email}</p>
                  {selectedOrder.customer_phone && (
                    <a 
                      href={`https://wa.me/${selectedOrder.customer_phone.replace(/\D/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" /> {selectedOrder.customer_phone}
                    </a>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Envio
                  </h3>
                  <p>{selectedOrder.shipping_address_line1}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.shipping_city}, {selectedOrder.shipping_department}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" /> Productos
                </h3>
                {loadingDetail ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between p-3">
                        <div>
                          <p className="font-medium text-sm">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} x {formatPrice(item.unit_price)}</p>
                        </div>
                        <p className="font-medium text-sm">{formatPrice(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Pago
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Metodo:</span>
                    <span className="ml-2 font-medium">{isCOD(selectedOrder) ? 'Contra Entrega' : (selectedOrder.payment_method || 'Wompi')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Estado:</span>
                    <Badge variant="outline" className={paymentStatusColors[selectedOrder.payment_status] || ''}>
                      {paymentStatusLabels[selectedOrder.payment_status]}
                    </Badge>
                  </div>
                </div>

                {/* Action buttons in detail */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedOrder.payment_status === 'pending' && !isCOD(selectedOrder) && (
                    <Button size="sm" variant="outline" className="text-green-600 border-green-600/30"
                      onClick={() => verifyWompiPayment(selectedOrder)}
                      disabled={actionLoading === `wompi-${selectedOrder.id}`}
                    >
                      {actionLoading === `wompi-${selectedOrder.id}` ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <ShieldCheck className="mr-2 h-3 w-3" />}
                      Verificar con Wompi
                    </Button>
                  )}
                  {isCOD(selectedOrder) && selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                    <Button size="sm" variant="outline" className="text-blue-600 border-blue-600/30"
                      onClick={() => { setSelectedOrder(null); openCODModal(selectedOrder) }}
                    >
                      <Banknote className="mr-2 h-3 w-3" /> Acciones COD
                    </Button>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Envio</span>
                  <span>{formatPrice(selectedOrder.shipping_cost)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Status History */}
              {statusHistory.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Historial
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {statusHistory.map((h) => (
                      <div key={h.id} className="flex items-start gap-3 text-xs border-l-2 border-muted pl-3 py-1">
                        <div className="flex-1">
                          <p>
                            <span className="text-muted-foreground">{h.previous_status}</span>
                            {' -> '}
                            <span className="font-medium">{h.new_status}</span>
                            {h.new_payment_status && (
                              <span className="text-muted-foreground"> (pago: {h.new_payment_status})</span>
                            )}
                          </p>
                          {h.notes && <p className="text-muted-foreground">{h.notes}</p>}
                        </div>
                        <span className="text-muted-foreground shrink-0">{formatDate(h.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Status & Resend */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Estado de Emails
                </h3>
                <div className="space-y-2">
                  {getAvailableEmailTypes(selectedOrder).map(({ type, label, sent }) => (
                    <div key={type} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        {sent ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="text-sm">{label}</span>
                        <Badge variant="outline" className={sent ? 'bg-green-500/10 text-green-600 text-xs' : 'bg-yellow-500/10 text-yellow-600 text-xs'}>
                          {sent ? 'Enviado' : 'Pendiente'}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => resendEmail(selectedOrder, type)}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === `resend-${type}-${selectedOrder.id}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {sent ? 'Reenviar' : 'Enviar'}
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                  {getAvailableEmailTypes(selectedOrder).length === 0 && (
                    <p className="text-sm text-muted-foreground">No hay emails disponibles para este pedido aun.</p>
                  )}
                </div>
              </div>

              {/* Admin Notes */}
              {selectedOrder.admin_notes && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm mb-1">Notas Admin</h3>
                  <p className="text-sm text-muted-foreground">{selectedOrder.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* COD ACTION MODAL */}
      {/* ============================================================ */}
      <Dialog open={showCODModal} onOpenChange={setShowCODModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-blue-500" />
              Contra Entrega - {codOrder?.order_number}
            </DialogTitle>
          </DialogHeader>

          {codOrder && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-sm">
                <p><strong>Cliente:</strong> {codOrder.customer_first_name} {codOrder.customer_last_name}</p>
                {codOrder.customer_phone && (
                  <p className="mt-1">
                    <strong>Tel:</strong>{' '}
                    <a href={`https://wa.me/${codOrder.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                      {codOrder.customer_phone}
                    </a>
                  </p>
                )}
                <p className="mt-1"><strong>Destino:</strong> {codOrder.shipping_city}, {codOrder.shipping_department}</p>
                <p className="mt-1"><strong>Total:</strong> {formatPrice(codOrder.total)}</p>
                <p className="mt-1">
                  <strong>Estado actual:</strong>{' '}
                  <Badge variant="outline" className={statusColors[codOrder.status] || ''}>
                    {statusLabels[codOrder.status]}
                  </Badge>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={codNotes}
                  onChange={(e) => setCodNotes(e.target.value)}
                  placeholder="Notas sobre esta accion..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                {codOrder.status === 'pending' && (
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => handleCODAction('confirm')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'cod-confirm' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />}
                    Confirmar Pedido (notifica cliente + admin)
                  </Button>
                )}

                {['confirmed', 'shipped'].includes(codOrder.status) && (
                  <Button
                    className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleCODAction('markPaid')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'cod-markPaid' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Marcar Entregado y Cobrado
                  </Button>
                )}

                {codOrder.status !== 'cancelled' && codOrder.status !== 'delivered' && (
                  <Button
                    className="w-full justify-start"
                    variant="destructive"
                    onClick={() => handleCODAction('cancel')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'cod-cancel' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                    Cancelar Pedido
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* UPDATE STATUS MODAL */}
      {/* ============================================================ */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cambiar Estado - {statusOrder?.order_number}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {statusOrder && statusOrder.payment_status !== 'approved' && !isCOD(statusOrder) && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-700">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Este pedido tiene pago <strong>{paymentStatusLabels[statusOrder.payment_status]}</strong>. 
                Solo se puede confirmar si el pago esta aprobado o es contra entrega.
              </div>
            )}

            <div className="space-y-2">
              <Label>Nuevo Estado</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="processing">Procesando</SelectItem>
                  <SelectItem value="shipped">Enviado</SelectItem>
                  <SelectItem value="delivered">Entregado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Notas internas..." rows={3} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowStatusModal(false)}>Cancelar</Button>
              <Button onClick={handleUpdateStatus} disabled={actionLoading === 'status'}>
                {actionLoading === 'status' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar Estado
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* TRACKING MODAL */}
      {/* ============================================================ */}
      <Dialog open={showTrackingModal} onOpenChange={setShowTrackingModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Agregar Guia - {trackingOrder?.order_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Al agregar la guia, el pedido se marca como enviado y el cliente recibe un email con el numero de seguimiento.
            </p>

            <div className="space-y-2">
              <Label>Numero de Guia *</Label>
              <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Ej: 1234567890" />
            </div>

            <div className="space-y-2">
              <Label>URL de Rastreo (opcional)</Label>
              <Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://..." />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowTrackingModal(false)}>Cancelar</Button>
              <Button onClick={handleUpdateTracking} disabled={actionLoading === 'tracking' || !trackingNumber}>
                {actionLoading === 'tracking' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar y Notificar Cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION */}
      {/* ============================================================ */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Eliminar Pedido
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estas seguro de que deseas eliminar el pedido <strong>{orderToDelete?.order_number}</strong>?
              Esta accion no se puede deshacer. Se eliminaran todos los datos del pedido, pagos asociados y registros contables.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
