'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Search, Users, Mail, Phone, MapPin, ShoppingBag, Loader2, Eye, TrendingUp,
  Clock, AlertCircle, DollarSign, Crown, MessageCircle, Download, ArrowUpDown,
  Plus, Pencil, Trash2, UserPlus, X
} from 'lucide-react'
import { formatPrice } from '@/lib/data'

interface Customer {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string | null
  city: string | null
  department: string | null
  total_orders: number
  paid_orders: number
  pending_orders: number
  rejected_orders: number
  cancelled_orders: number
  total_spent: number
  pending_amount: number
  last_order_date: string
  first_order_date: string
  last_address: string | null
  is_manual?: boolean
  notes?: string | null
}

interface CustomerOrder {
  id: number
  order_number: string
  total: number
  status: string
  payment_status: string
  payment_method: string
  created_at: string
  shipping_city: string
  shipping_department: string
  item_count: number
}

interface PendingPaymentCustomer {
  email: string
  first_name: string
  last_name: string
  phone: string | null
  order_number: string
  total: number
  created_at: string
  hours_since_order: number
}

interface Stats {
  total_customers: number
  total_revenue: number
  total_orders: number
  pending_payments: number
  pending_revenue: number
  avg_order_value: number
}

interface TopCustomer {
  email: string
  first_name: string
  last_name: string
  order_count: number
  total_spent: number
}

type SortField = 'name' | 'total_spent' | 'paid_orders' | 'last_order_date'
type SortDir = 'asc' | 'desc'

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [pendingPaymentCustomers, setPendingPaymentCustomers] = useState<PendingPaymentCustomer[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [sortField, setSortField] = useState<SortField>('last_order_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [exporting, setExporting] = useState(false)

  // Manual customer modal
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [customerForm, setCustomerForm] = useState({ first_name: '', last_name: '', phone: '', email: '', city: '', notes: '' })
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null)
  const [customerSaveError, setCustomerSaveError] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/admin/customers')
      const data = await res.json()
      if (data.success) {
        setCustomers(data.customers)
        setStats(data.stats)
        setPendingPaymentCustomers(data.pendingPaymentCustomers || [])
        setTopCustomers(data.topCustomers || [])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const viewCustomerDetails = async (customer: Customer) => {
    setSelectedCustomer(customer)
    if (customer.is_manual && !customer.email) {
      setCustomerOrders([])
      setLoadingOrders(false)
      return
    }
    setLoadingOrders(true)
    try {
      const res = await fetch(`/api/admin/customers?email=${encodeURIComponent(customer.email || '')}`)
      const data = await res.json()
      if (data.success) setCustomerOrders(data.orders || [])
    } catch (error) {
      console.error('Error fetching customer orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const sendPaymentReminder = (customer: PendingPaymentCustomer) => {
    const message = `Hola ${customer.first_name}! Te escribimos de RavenHats. Notamos que tu pedido *${customer.order_number}* por ${formatPrice(customer.total)} esta pendiente de pago. Si necesitas ayuda para completar tu compra, estamos aqui para ayudarte.`
    const whatsappUrl = `https://wa.me/57${customer.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const exportCustomersCSV = async () => {
    setExporting(true)
    try {
      const headers = ['Nombre', 'Email', 'Telefono', 'Ciudad', 'Departamento', 'Pedidos Pagados', 'Pedidos Total', 'Total Gastado', 'Pendiente', 'Primer Pedido', 'Ultimo Pedido']
      const rows = filteredAndSortedCustomers.map(c => [
        `"${c.first_name} ${c.last_name}"`,
        c.email,
        c.phone || '',
        c.city || '',
        c.department || '',
        c.paid_orders,
        c.total_orders,
        c.total_spent || 0,
        c.pending_amount || 0,
        c.first_order_date ? new Date(c.first_order_date).toLocaleDateString('es-CO') : '',
        c.last_order_date ? new Date(c.last_order_date).toLocaleDateString('es-CO') : '',
      ])
      
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clientes-ravenhats-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      a.remove()
    } finally {
      setExporting(false)
    }
  }

  const openNewCustomer = () => {
    setEditingCustomer(null)
    setCustomerForm({ first_name: '', last_name: '', phone: '', email: '', city: '', notes: '' })
    setCustomerSaveError('')
    setShowCustomerModal(true)
  }

  const openEditCustomer = (c: Customer) => {
    setEditingCustomer(c)
    setCustomerForm({
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      phone: c.phone || '',
      email: c.email || '',
      city: c.city || '',
      notes: c.notes || '',
    })
    setCustomerSaveError('')
    setShowCustomerModal(true)
  }

  const saveCustomer = async () => {
    if (!customerForm.first_name.trim()) {
      setCustomerSaveError('El nombre es requerido')
      return
    }
    setSavingCustomer(true)
    setCustomerSaveError('')
    try {
      const method = editingCustomer ? 'PUT' : 'POST'
      const body = editingCustomer
        ? { ...customerForm, id: editingCustomer.id }
        : customerForm
      const res = await fetch('/api/admin/customers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        setShowCustomerModal(false)
        fetchCustomers()
      } else {
        setCustomerSaveError(data.error || 'Error al guardar')
      }
    } catch {
      setCustomerSaveError('Error de conexión')
    } finally {
      setSavingCustomer(false)
    }
  }

  const deleteManualCustomer = async (id: number) => {
    setDeletingCustomerId(id)
    try {
      await fetch(`/api/admin/customers?id=${id}`, { method: 'DELETE' })
      fetchCustomers()
    } finally {
      setDeletingCustomerId(null)
    }
  }

  const filteredCustomers = customers.filter(customer => {
    const searchLower = search.toLowerCase()
    return (
      (customer.email || '').toLowerCase().includes(searchLower) ||
      (customer.first_name || '').toLowerCase().includes(searchLower) ||
      (customer.last_name || '').toLowerCase().includes(searchLower) ||
      (customer.phone && customer.phone.includes(search))
    )
  })

  const filteredAndSortedCustomers = [...filteredCustomers].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortField) {
      case 'name': return dir * `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      case 'total_spent': return dir * ((a.total_spent || 0) - (b.total_spent || 0))
      case 'paid_orders': return dir * (a.paid_orders - b.paid_orders)
      case 'last_order_date': return dir * (new Date(a.last_order_date).getTime() - new Date(b.last_order_date).getTime())
      default: return 0
    }
  })

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500', confirmed: 'bg-blue-500/10 text-blue-500',
      processing: 'bg-purple-500/10 text-purple-500', shipped: 'bg-indigo-500/10 text-indigo-500',
      delivered: 'bg-green-500/10 text-green-500', cancelled: 'bg-red-500/10 text-red-500',
    }
    return colors[status] || 'bg-gray-500/10 text-gray-500'
  }

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500', approved: 'bg-green-500/10 text-green-500',
      rejected: 'bg-red-500/10 text-red-500',
    }
    return colors[status] || 'bg-gray-500/10 text-gray-500'
  }

  // Customer value segments
  const totalSpentArr = customers.map(c => Number(c.total_spent || 0)).filter(v => v > 0)
  const avgSpent = totalSpentArr.length > 0 ? totalSpentArr.reduce((a, b) => a + b, 0) / totalSpentArr.length : 0
  const getCustomerTier = (spent: number) => {
    if (spent >= avgSpent * 2) return { label: 'VIP', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' }
    if (spent >= avgSpent) return { label: 'Frecuente', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' }
    return { label: 'Regular', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
  }

  const conversionRate = stats ? (stats.total_orders > 0 
    ? ((stats.total_orders - (stats.pending_payments || 0)) / stats.total_orders * 100) 
    : 0) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pt-16 lg:pt-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gestiona tu base de clientes y seguimiento de pagos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCustomersCSV} disabled={exporting} className="h-9">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Exportar
          </Button>
          <Button onClick={openNewCustomer} className="h-9 gap-2">
            <UserPlus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Card className="admin-card">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Total clientes</p>
                  <div className="text-2xl font-bold tabular-nums">{stats?.total_customers || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Clientes únicos</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Ingresos</p>
                  <div className="text-2xl font-bold text-green-500 tabular-nums">{formatPrice(stats?.total_revenue || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stats?.total_orders || 0} pedidos pagados</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Ticket promedio</p>
                  <div className="text-2xl font-bold tabular-nums">{formatPrice(stats?.avg_order_value || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Por pedido pagado</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 grid-cols-2">
          <Card className={`admin-card ${pendingPaymentCustomers.length > 0 ? 'border-yellow-500/25' : ''}`}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className={`h-3.5 w-3.5 ${pendingPaymentCustomers.length > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                <p className="text-xs text-muted-foreground">Pagos pendientes</p>
              </div>
              <p className={`text-base font-bold tabular-nums ${pendingPaymentCustomers.length > 0 ? 'text-yellow-500' : ''}`}>{stats?.pending_payments || 0}</p>
              <p className="text-[11px] text-muted-foreground">{formatPrice(stats?.pending_revenue || 0)} por cobrar</p>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                <p className="text-xs text-muted-foreground">Conversión</p>
              </div>
              <p className="text-base font-bold tabular-nums">{conversionRate.toFixed(1)}%</p>
              <p className="text-[11px] text-muted-foreground">Pedidos completados</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todos los Clientes</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pagos Pendientes
            {pendingPaymentCustomers.length > 0 && (
              <span className="ml-2 h-5 w-5 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center">
                {pendingPaymentCustomers.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="top">Top Clientes</TabsTrigger>
        </TabsList>

        {/* All Customers Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card className="admin-card">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, email o teléfono..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={`${sortField}|${sortDir}`} onValueChange={(v) => {
                  const [f, d] = v.split('|') as [SortField, SortDir]
                  setSortField(f); setSortDir(d)
                }}>
                  <SelectTrigger className="w-[200px] h-9">
                    <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_order_date|desc">Más recientes</SelectItem>
                    <SelectItem value="last_order_date|asc">Más antiguos</SelectItem>
                    <SelectItem value="total_spent|desc">Mayor gasto</SelectItem>
                    <SelectItem value="total_spent|asc">Menor gasto</SelectItem>
                    <SelectItem value="paid_orders|desc">Más pedidos</SelectItem>
                    <SelectItem value="name|asc">Nombre A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Desktop Table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Ubicacion</TableHead>
                    <TableHead className="text-center">Pedidos</TableHead>
                    <TableHead className="text-center">Segmento</TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('total_spent')}>
                      <span className="flex items-center justify-end gap-1">
                        Total Gastado
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No se encontraron clientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedCustomers.map((customer) => {
                      const tier = getCustomerTier(Number(customer.total_spent || 0))
                      return (
                        <TableRow key={`${customer.is_manual ? 'm' : 'o'}-${customer.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="text-xs">
                                  {customer.first_name?.[0]}{customer.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                                  {customer.is_manual && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-purple-500/10 text-purple-500 border-purple-500/20">Manual</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {customer.is_manual ? 'Registrado' : 'Desde'} {new Date(customer.first_order_date).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {customer.email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate max-w-[150px]">{customer.email}</span>
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  {customer.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {customer.city ? (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {customer.city}{customer.department ? `, ${customer.department}` : ''}
                              </div>
                            ) : <span className="text-muted-foreground text-sm">-</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {customer.is_manual ? (
                              <span className="text-xs text-muted-foreground">Sin pedidos</span>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant="secondary">{customer.paid_orders} pagados</Badge>
                                {customer.pending_orders > 0 && (
                                  <Badge className="bg-yellow-500/10 text-yellow-600 text-xs">{customer.pending_orders} pend.</Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={tier.color}>{tier.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {customer.is_manual ? <span className="text-muted-foreground text-sm">—</span> : formatPrice(customer.total_spent || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => viewCustomerDetails(customer)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {customer.phone && (
                                <Button variant="ghost" size="sm" onClick={() => {
                                  window.open(`https://wa.me/57${customer.phone?.replace(/\D/g, '')}`, '_blank')
                                }}>
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {customer.is_manual && (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => openEditCustomer(customer)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10" onClick={() => deleteManualCustomer(customer.id)} disabled={deletingCustomerId === customer.id}>
                                    {deletingCustomerId === customer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredAndSortedCustomers.length === 0 ? (
              <div className="admin-card p-8 text-center text-muted-foreground text-sm">
                No se encontraron clientes
              </div>
            ) : filteredAndSortedCustomers.map((customer) => {
              const tier = getCustomerTier(Number(customer.total_spent || 0))
              return (
                <div key={customer.id} className="admin-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="text-xs">
                          {customer.first_name[0]}{customer.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{customer.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={tier.color}>{tier.label}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {!customer.is_manual && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">Total gastado</p>
                          <p className="font-semibold">{formatPrice(customer.total_spent || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Pedidos</p>
                          <p>{customer.paid_orders} pagados{customer.pending_orders > 0 ? ` · ${customer.pending_orders} pend.` : ''}</p>
                        </div>
                      </>
                    )}
                    {customer.phone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Teléfono</p>
                        <p>{customer.phone}</p>
                      </div>
                    )}
                    {customer.city && (
                      <div>
                        <p className="text-xs text-muted-foreground">Ciudad</p>
                        <p>{customer.city}</p>
                      </div>
                    )}
                    {customer.is_manual && customer.notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Notas</p>
                        <p className="text-xs">{customer.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => viewCustomerDetails(customer)}>
                      <Eye className="h-3.5 w-3.5" /> Ver
                    </Button>
                    {customer.phone && (
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => {
                        window.open(`https://wa.me/57${customer.phone?.replace(/\D/g, '')}`, '_blank')
                      }}>
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </Button>
                    )}
                    {customer.is_manual && (
                      <>
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 ml-auto" onClick={() => openEditCustomer(customer)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-red-500 hover:bg-red-500/10" onClick={() => deleteManualCustomer(customer.id)} disabled={deletingCustomerId === customer.id}>
                          {deletingCustomerId === customer.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Mostrando {filteredAndSortedCustomers.length} de {customers.length} clientes
          </p>
        </TabsContent>

        {/* Pending Payments Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingPaymentCustomers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <ShoppingBag className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="font-semibold mb-1">No hay pagos pendientes</h3>
                <p className="text-sm text-muted-foreground">Todos los pedidos estan al dia</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Pedidos con Pago Pendiente ({pendingPaymentCustomers.length})
                </CardTitle>
                <CardDescription>
                  Total pendiente: {formatPrice(pendingPaymentCustomers.reduce((a, c) => a + c.total, 0))}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Tiempo</TableHead>
                      <TableHead className="text-right">Accion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPaymentCustomers.map((customer) => (
                      <TableRow key={customer.order_number}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                            {customer.phone && (
                              <p className="text-xs text-muted-foreground">{customer.phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{customer.order_number}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatPrice(customer.total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className={customer.hours_since_order > 48 ? 'text-red-500 font-medium' : ''}>
                              {customer.hours_since_order < 24 
                                ? `${customer.hours_since_order}h` 
                                : `${Math.floor(customer.hours_since_order / 24)}d`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.phone ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendPaymentReminder(customer)}
                              className="bg-transparent"
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Recordar
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin telefono</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Top Customers Tab */}
        <TabsContent value="top" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Mejores Clientes
              </CardTitle>
              <CardDescription>
                Clientes con mayor volumen de compras pagadas
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Pedidos</TableHead>
                    <TableHead className="text-right">Total Gastado</TableHead>
                    <TableHead className="text-right">Ticket Promedio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Sin datos suficientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    topCustomers.map((customer, index) => {
                      const avgTicket = customer.order_count > 0 ? customer.total_spent / customer.order_count : 0
                      return (
                        <TableRow key={customer.email}>
                          <TableCell>
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-amber-500/20 text-amber-600' :
                              index === 1 ? 'bg-gray-300/30 text-gray-500' :
                              index === 2 ? 'bg-orange-500/20 text-orange-600' :
                              'bg-secondary text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="text-xs">
                                  {customer.first_name[0]}{customer.last_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                                <p className="text-xs text-muted-foreground">{customer.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{customer.order_count}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg">
                            {formatPrice(customer.total_spent)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatPrice(avgTicket)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Customer Detail Modal */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Cliente</DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-lg">
                    {selectedCustomer.first_name[0]}{selectedCustomer.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedCustomer.first_name} {selectedCustomer.last_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                  {(() => {
                    const tier = getCustomerTier(Number(selectedCustomer.total_spent || 0))
                    return <Badge variant="outline" className={`mt-1 ${tier.color}`}>{tier.label}</Badge>
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Telefono</p>
                  <p className="font-medium">{selectedCustomer.phone || 'No registrado'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ubicacion</p>
                  <p className="font-medium">
                    {selectedCustomer.city ? `${selectedCustomer.city}, ${selectedCustomer.department}` : 'No registrada'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Ultima direccion</p>
                  <p className="font-medium text-sm">{selectedCustomer.last_address || 'No registrada'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-sm text-muted-foreground">Total Gastado</p>
                    <p className="text-xl font-bold">{formatPrice(selectedCustomer.total_spent || 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-sm text-muted-foreground">Pedidos Pagados</p>
                    <p className="text-xl font-bold text-green-600">{selectedCustomer.paid_orders}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-sm text-muted-foreground">Pendientes</p>
                    <p className="text-xl font-bold text-yellow-600">{selectedCustomer.pending_orders}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                    <p className="text-xl font-bold">
                      {selectedCustomer.paid_orders > 0 
                        ? formatPrice((selectedCustomer.total_spent || 0) / selectedCustomer.paid_orders)
                        : formatPrice(0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="font-medium mb-3">Historial de Pedidos ({customerOrders.length})</h4>
                {loadingOrders ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : customerOrders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No hay pedidos</p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{order.order_number}</p>
                            <Badge className={getPaymentStatusColor(order.payment_status)}>
                              {order.payment_status === 'approved' ? 'Pagado' : 
                               order.payment_status === 'pending' ? 'Pendiente' : 'Rechazado'}
                            </Badge>
                            {order.payment_status === 'approved' && (
                              <Badge className={getStatusColor(order.status)} variant="outline">
                                {order.status}
                              </Badge>
                            )}
                            {order.payment_method && (
                              <span className="text-xs text-muted-foreground">
                                ({order.payment_method === 'COD' ? 'Contra entrega' : order.payment_method})
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('es-CO', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })} - {order.item_count} producto{order.item_count > 1 ? 's' : ''} - {order.shipping_city}
                          </p>
                        </div>
                        <span className="font-medium text-lg">{formatPrice(order.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedCustomer.phone && (
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => {
                    window.open(`https://wa.me/57${selectedCustomer.phone?.replace(/\D/g, '')}`, '_blank')
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contactar por WhatsApp
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New / Edit Manual Customer Modal */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-w-md p-0 gap-0">
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <h2 className="text-lg font-bold tracking-tight">
              {editingCustomer ? 'Editar Cliente' : 'Registrar Cliente'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingCustomer ? 'Actualiza los datos del cliente' : 'Agrega un cliente frecuente a tu directorio'}
            </p>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre *</Label>
                <Input
                  className="h-9"
                  placeholder="Juan"
                  value={customerForm.first_name}
                  onChange={(e) => setCustomerForm(p => ({ ...p, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Apellido</Label>
                <Input
                  className="h-9"
                  placeholder="Pérez"
                  value={customerForm.last_name}
                  onChange={(e) => setCustomerForm(p => ({ ...p, last_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono</Label>
                <Input
                  className="h-9"
                  placeholder="3001234567"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ciudad</Label>
                <Input
                  className="h-9"
                  placeholder="Medellín"
                  value={customerForm.city}
                  onChange={(e) => setCustomerForm(p => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Email (opcional)</Label>
                <Input
                  className="h-9"
                  placeholder="email@ejemplo.com"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Notas (opcional)</Label>
                <Textarea
                  placeholder="Cliente frecuente, preferencias, etc..."
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
            </div>

            {customerSaveError && (
              <p className="text-xs text-red-500">{customerSaveError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setShowCustomerModal(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={saveCustomer} disabled={savingCustomer} className="gap-1.5">
                {savingCustomer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                {editingCustomer ? 'Guardar' : 'Registrar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
