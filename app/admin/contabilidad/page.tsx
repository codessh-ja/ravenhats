'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, Download, Loader2, Check, Trash2, DollarSign,
  TrendingUp, TrendingDown, ShoppingCart, Store, X,
  Receipt, CreditCard, Banknote, ArrowUpDown, Eye, Pencil
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
} from "@/components/ui/alert-dialog"
import { formatPrice } from '@/lib/data'

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
  created_at: string
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
  created_at: string
}

interface Product {
  id: number
  name: string
  price: number
  stock: number
}

interface SaleItem {
  productId: number | null
  productName: string
  quantity: number
  unitPrice: number
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

const typeLabels: Record<string, string> = {
  online_sale: 'Venta Online',
  physical_sale: 'Venta Fisica',
  refund: 'Devolucion',
  expense: 'Gasto',
  adjustment: 'Ajuste',
}

const typeColors: Record<string, string> = {
  online_sale: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  physical_sale: 'bg-green-500/10 text-green-500 border-green-500/20',
  refund: 'bg-red-500/10 text-red-500 border-red-500/20',
  expense: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  adjustment: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const paymentMethodLabels: Record<string, string> = {
  wompi: 'Wompi',
  cod: 'Contra entrega',
  transfer: 'Transferencia',
  cash: 'Efectivo',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  other: 'Otro',
}

const paymentStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  approved: 'bg-green-500/10 text-green-500 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const expenseCategoryLabels: Record<string, string> = {
  envios: 'Envíos',
  inventario: 'Inventario',
  marketing: 'Marketing',
  servicios: 'Servicios',
  impuestos: 'Impuestos',
  empaque: 'Empaque',
  otros: 'Otros',
}

function getBogotaDateTimeStr(): string {
  const now   = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const g = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`
}

export default function AdminAccountingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [summary, setSummary] = useState<any>({})
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalTab, setModalTab] = useState('sale')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null)

  // Edit transaction state
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState({
    paymentMethod: '',
    paymentReference: '',
    transactionDate: '',
    notes: '',
    description: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Edit payment state
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount: '',
    paymentMethod: '',
    paymentReference: '',
    paymentDate: '',
    notes: '',
  })
  const [savingPaymentEdit, setSavingPaymentEdit] = useState(false)

  // Force payment status
  const [forcingPayment, setForcingPayment] = useState(false)

  // Abonos state
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showAbonoForm, setShowAbonoForm] = useState(false)
  const [savingAbono, setSavingAbono] = useState(false)
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null)
  const [abonoForm, setAbonoForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    paymentReference: '',
    notes: '',
    paymentDate: getBogotaDateTimeStr(),
  })

  // Customer search (for sale modal)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState<{ name: string; phone: string; email: string }[]>([])
  const [searchingCustomers, setSearchingCustomers] = useState(false)

  const searchCustomers = useCallback(async (term: string) => {
    if (term.trim().length < 2) { setCustomerSuggestions([]); return }
    setSearchingCustomers(true)
    try {
      const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(term)}`)
      const data = await res.json()
      if (data.success) setCustomerSuggestions(data.customers || [])
    } catch { /* ignore */ } finally {
      setSearchingCustomers(false)
    }
  }, [])

  // Sale form
  const [saleForm, setSaleForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    paymentMethod: 'cash' as string,
    paymentStatus: 'approved' as string,
    firstPaymentAmount: '',
    paymentReference: '',
    shippingCost: '0',
    discount: '0',
    description: '',
    notes: '',
    transactionDate: getBogotaDateTimeStr(),
    items: [{ productId: null as number | null, productName: '', quantity: 1, unitPrice: 0 }] as SaleItem[],
  })

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    category: 'otros' as string,
    description: '',
    total: '',
    paymentMethod: 'cash' as string,
    paymentReference: '',
    notes: '',
    transactionDate: getBogotaDateTimeStr(),
  })

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (paymentFilter === 'pending') {
        params.set('paymentStatus', 'pending')
      } else if (paymentFilter !== 'all') {
        params.set('paymentMethod', paymentFilter)
      }
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('page', pagination.page.toString())

      const res = await fetch(`/api/admin/accounting?${params}`)
      const data = await res.json()

      if (data.success) {
        setTransactions(data.transactions || [])
        setSummary(data.summary || {})
        setPagination(prev => ({ ...prev, total: data.pagination?.total || 0, totalPages: data.pagination?.totalPages || 0 }))
      } else {
        showToast(data.error || 'Error al cargar transacciones', 'error')
      }
    } catch (err: any) {
      console.error('[v0] Fetch error:', err)
      showToast('Error de conexion al cargar transacciones', 'error')
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, paymentFilter, dateFrom, dateTo, pagination.page])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products')
      const data = await res.json()
      if (data.products) {
        setProducts(data.products.filter((p: any) => p.is_active))
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    fetchProducts()
  }, [])

  const openSaleModal = () => {
    setCustomerSearch('')
    setCustomerSuggestions([])
    setSaleForm({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      paymentMethod: 'cash',
      paymentStatus: 'approved',
      firstPaymentAmount: '',
      paymentReference: '',
      shippingCost: '0',
      discount: '0',
      description: '',
      notes: '',
      transactionDate: getBogotaDateTimeStr(),
      items: [{ productId: null, productName: '', quantity: 1, unitPrice: 0 }],
    })
    setExpenseForm({
      category: 'otros',
      description: '',
      total: '',
      paymentMethod: 'cash',
      paymentReference: '',
      notes: '',
      transactionDate: getBogotaDateTimeStr(),
    })
    setModalTab('sale')
    setShowModal(true)
  }

  // Sale item management
  const addSaleItem = () => {
    setSaleForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: null, productName: '', quantity: 1, unitPrice: 0 }]
    }))
  }

  const removeSaleItem = (index: number) => {
    if (saleForm.items.length <= 1) return
    setSaleForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateSaleItem = (index: number, field: keyof SaleItem, value: any) => {
    setSaleForm(prev => {
      const items = [...prev.items]
      items[index] = { ...items[index], [field]: value }

      // If selecting a product, fill name and price
      if (field === 'productId' && value) {
        const product = products.find(p => p.id === Number(value))
        if (product) {
          items[index].productName = product.name
          items[index].unitPrice = product.price
          items[index].productId = product.id
        }
      }
      return { ...prev, items }
    })
  }

  const saleSubtotal = saleForm.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const saleTotal = saleSubtotal + Number(saleForm.shippingCost || 0) - Number(saleForm.discount || 0)

  const handleSaveSale = async () => {
    // Validate
    const validItems = saleForm.items.filter(i => i.productName && i.unitPrice > 0)
    if (validItems.length === 0) {
      showToast('Agrega al menos un producto', 'error')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'physical_sale',
          paymentMethod: saleForm.paymentMethod,
          paymentStatus: saleForm.paymentStatus,
          firstPaymentAmount: saleForm.paymentStatus === 'partial' ? Number(saleForm.firstPaymentAmount || 0) : undefined,
          customerName: saleForm.customerName || null,
          customerPhone: saleForm.customerPhone || null,
          customerEmail: saleForm.customerEmail || null,
          subtotal: saleSubtotal,
          shippingCost: Number(saleForm.shippingCost || 0),
          discount: Number(saleForm.discount || 0),
          total: saleTotal,
          description: saleForm.description || `Venta fisica - ${validItems.map(i => i.productName).join(', ')}`,
          notes: saleForm.notes || null,
          paymentReference: saleForm.paymentReference || null,
          transactionDate: saleForm.transactionDate ? saleForm.transactionDate.replace('T', ' ') + ':00' : undefined,
          items: validItems.map(i => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        })
      })

      const data = await res.json()
      if (data.success) {
        showToast('Venta registrada exitosamente', 'success')
        setShowModal(false)
        fetchTransactions()
        fetchProducts() // Refresh stock
      } else {
        showToast(data.error || 'Error al registrar venta', 'error')
      }
    } catch {
      showToast('Error al registrar venta', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveExpense = async () => {
    if (!expenseForm.description || !expenseForm.total) {
      showToast('Descripcion y monto son requeridos', 'error')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense',
          paymentMethod: expenseForm.paymentMethod,
          paymentStatus: 'approved',
          total: Number(expenseForm.total),
          subtotal: Number(expenseForm.total),
          description: expenseForm.category !== 'otros'
            ? `${expenseCategoryLabels[expenseForm.category]}: ${expenseForm.description}`
            : expenseForm.description,
          notes: expenseForm.notes || null,
          paymentReference: expenseForm.paymentReference || null,
          transactionDate: expenseForm.transactionDate ? expenseForm.transactionDate.replace('T', ' ') + ':00' : undefined,
        })
      })

      const data = await res.json()
      if (data.success) {
        showToast('Gasto registrado exitosamente', 'success')
        setShowModal(false)
        fetchTransactions()
      } else {
        showToast(data.error || 'Error al registrar gasto', 'error')
      }
    } catch {
      showToast('Error al registrar gasto', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ===== ABONOS FUNCTIONS =====
  const fetchPayments = async (transactionId: number) => {
    setLoadingPayments(true)
    try {
      const res = await fetch(`/api/admin/accounting/payments?transactionId=${transactionId}`)
      const data = await res.json()
      if (data.success) {
        setPayments(data.payments || [])
      }
    } catch {
      showToast('Error al cargar abonos', 'error')
    } finally {
      setLoadingPayments(false)
    }
  }

  const handleAddAbono = async () => {
    if (!viewTransaction || !abonoForm.amount || Number(abonoForm.amount) <= 0) {
      showToast('Ingresa un monto valido', 'error')
      return
    }

    setSavingAbono(true)
    try {
      const res = await fetch('/api/admin/accounting/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: viewTransaction.id,
          amount: Number(abonoForm.amount),
          paymentMethod: abonoForm.paymentMethod,
          paymentReference: abonoForm.paymentReference || null,
          notes: abonoForm.notes || null,
          paymentDate: abonoForm.paymentDate ? abonoForm.paymentDate.replace('T', ' ') + ':00' : undefined,
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast('Abono registrado exitosamente', 'success')
        setShowAbonoForm(false)
        setAbonoForm({ amount: '', paymentMethod: 'cash', paymentReference: '', notes: '', paymentDate: getBogotaDateTimeStr() })
        // Refresh payments and transactions
        fetchPayments(viewTransaction.id)
        fetchTransactions()
        // Update viewTransaction locally
        setViewTransaction(prev => prev ? {
          ...prev,
          amount_paid: data.totalPaid,
          balance: prev.total - data.totalPaid,
          payment_status: data.newStatus
        } : null)
      } else {
        showToast(data.error || 'Error al registrar abono', 'error')
      }
    } catch {
      showToast('Error al registrar abono', 'error')
    } finally {
      setSavingAbono(false)
    }
  }

  const handleDeletePayment = async (paymentId: number) => {
    if (!viewTransaction) return
    setDeletingPaymentId(paymentId)
    try {
      const res = await fetch(`/api/admin/accounting/payments?id=${paymentId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        showToast('Abono eliminado', 'success')
        fetchPayments(viewTransaction.id)
        fetchTransactions()
        setViewTransaction(prev => prev ? {
          ...prev,
          amount_paid: data.totalPaid,
          balance: prev.total - data.totalPaid,
          payment_status: data.newStatus
        } : null)
      } else {
        showToast(data.error || 'Error al eliminar abono', 'error')
      }
    } catch {
      showToast('Error al eliminar abono', 'error')
    } finally {
      setDeletingPaymentId(null)
    }
  }

  const openViewTransaction = (tx: Transaction) => {
    setViewTransaction(tx)
    setPayments([])
    setShowAbonoForm(false)
    // Fetch payments for sales with pending status or any transaction that has partial payments
    if (tx.type === 'physical_sale' || tx.type === 'online_sale') {
      fetchPayments(tx.id)
    }
  }

  // Force toggle payment status (mark as paid or mark as pending)
  const handleForcePaymentStatus = async (newStatus: 'approved' | 'pending') => {
    if (!viewTransaction) return
    setForcingPayment(true)
    try {
      const res = await fetch('/api/admin/accounting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: viewTransaction.id,
          paymentStatus: newStatus,
          forceAmountPaid: newStatus === 'approved' ? viewTransaction.total : undefined,
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast(newStatus === 'approved' ? 'Marcado como pagado completo' : 'Marcado como pendiente', 'success')
        fetchTransactions()
        setViewTransaction(prev => prev ? {
          ...prev,
          payment_status: newStatus,
          amount_paid: newStatus === 'approved' ? prev.total : prev.amount_paid,
        } : null)
      } else {
        showToast(data.error || 'Error', 'error')
      }
    } catch {
      showToast('Error al cambiar estado de pago', 'error')
    } finally {
      setForcingPayment(false)
    }
  }

  // ===== EDIT FUNCTIONS =====
  const openEditTransaction = (tx: Transaction) => {
    setEditForm({
      paymentMethod: tx.payment_method,
      paymentReference: tx.payment_reference || '',
      transactionDate: tx.transaction_date ? new Date(tx.transaction_date).toISOString().slice(0, 16) : '',
      notes: tx.notes || '',
      description: tx.description || '',
      customerName: tx.customer_name || '',
      customerPhone: tx.customer_phone || '',
      customerEmail: tx.customer_email || '',
    })
    setEditTransaction(tx)
  }

  const handleSaveEdit = async () => {
    if (!editTransaction) return
    setSavingEdit(true)
    try {
      const res = await fetch('/api/admin/accounting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editTransaction.id,
          paymentMethod: editForm.paymentMethod,
          paymentReference: editForm.paymentReference,
          transactionDate: editForm.transactionDate ? editForm.transactionDate.replace('T', ' ') + ':00' : undefined,
          notes: editForm.notes,
          description: editForm.description,
          customerName: editForm.customerName,
          customerPhone: editForm.customerPhone,
          customerEmail: editForm.customerEmail,
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast('Transaccion actualizada', 'success')
        setEditTransaction(null)
        fetchTransactions()
      } else {
        showToast(data.error || 'Error al actualizar', 'error')
      }
    } catch {
      showToast('Error al actualizar transaccion', 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  const openEditPayment = (p: Payment) => {
    setEditPaymentForm({
      amount: String(p.amount),
      paymentMethod: p.payment_method,
      paymentReference: p.payment_reference || '',
      paymentDate: p.payment_date ? new Date(p.payment_date).toISOString().slice(0, 16) : '',
      notes: p.notes || '',
    })
    setEditingPayment(p)
  }

  const handleSavePaymentEdit = async () => {
    if (!editingPayment || !viewTransaction) return
    setSavingPaymentEdit(true)
    try {
      const newAmount = Number(editPaymentForm.amount)
      const amountChanged = newAmount !== editingPayment.amount
      
      const res = await fetch('/api/admin/accounting/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPayment.id,
          amount: amountChanged ? newAmount : undefined,
          paymentMethod: editPaymentForm.paymentMethod,
          paymentReference: editPaymentForm.paymentReference,
          paymentDate: editPaymentForm.paymentDate ? editPaymentForm.paymentDate.replace('T', ' ') + ':00' : undefined,
          notes: editPaymentForm.notes,
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast('Abono actualizado', 'success')
        setEditingPayment(null)
        fetchPayments(viewTransaction.id)
        fetchTransactions()
        // Update view if totals changed
        if (data.totalPaid !== undefined) {
          setViewTransaction(prev => prev ? {
            ...prev,
            amount_paid: data.totalPaid,
            balance: prev.total - data.totalPaid,
            payment_status: data.newStatus || prev.payment_status,
          } : null)
        }
      } else {
        showToast(data.error || 'Error al actualizar abono', 'error')
      }
    } catch {
      showToast('Error al actualizar abono', 'error')
    } finally {
      setSavingPaymentEdit(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/accounting?id=${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        showToast('Transaccion eliminada', 'success')
        fetchTransactions()
      } else {
        showToast(data.error || 'Error al eliminar', 'error')
      }
    } catch {
      showToast('Error al eliminar transaccion', 'error')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('type', 'accounting')
      params.set('period', 'custom')

      const res = await fetch(`/api/admin/reports/export?${params}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contabilidad-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch {
      showToast('Error al exportar', 'error')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const netIncome = Number(summary.totalIncome || 0) - Number(summary.totalRefunds || 0) - Number(summary.totalExpenses || 0)

  return (
    <div className="space-y-6 pt-16 lg:pt-0">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right ${
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            <Check className="h-4 w-4" />
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contabilidad</h1>
          <p className="text-muted-foreground text-sm">
            Ventas online (automático) · Ventas físicas y gastos (manual)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button size="sm" onClick={openSaleModal}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar
          </Button>
        </div>
      </div>


      {/* Summary — 3 main + 3 secondary */}
      <div className="space-y-3">
        {/* Main row */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Card className="admin-card">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Ingresos</p>
                  <div className="text-2xl font-bold text-green-500">{formatPrice(Number(summary.totalIncome || 0))}</div>
                  <p className="text-xs text-muted-foreground mt-1">Ventas cobradas</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Gastos</p>
                  <div className="text-2xl font-bold text-red-500">{formatPrice(Number(summary.totalExpenses || 0))}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total de egresos</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`admin-card ${netIncome >= 0 ? 'border-green-500/20' : 'border-red-500/20'}`}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Ganancia neta</p>
                  <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPrice(netIncome)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Ingresos − Gastos</p>
                </div>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${netIncome >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <DollarSign className={`h-4 w-4 ${netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary row */}
        <div className="grid gap-3 grid-cols-3">
          <Card className="admin-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />
                <p className="text-xs text-muted-foreground">Ventas Online</p>
              </div>
              <p className="text-base font-bold">{formatPrice(Number(summary.onlineTotal || 0))}</p>
              <p className="text-[11px] text-muted-foreground">{summary.onlineSales || 0} transacciones</p>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Store className="h-3.5 w-3.5 text-green-500" />
                <p className="text-xs text-muted-foreground">Ventas Físicas</p>
              </div>
              <p className="text-base font-bold">{formatPrice(Number(summary.physicalTotal || 0))}</p>
              <p className="text-[11px] text-muted-foreground">{summary.physicalSales || 0} transacciones</p>
            </CardContent>
          </Card>

          <Card className={`admin-card ${Number(summary.pendingBalance || 0) > 0 ? 'border-yellow-500/25' : ''}`}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Receipt className={`h-3.5 w-3.5 ${Number(summary.pendingBalance || 0) > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                <p className="text-xs text-muted-foreground">Por Cobrar</p>
              </div>
              <p className={`text-base font-bold ${Number(summary.pendingBalance || 0) > 0 ? 'text-yellow-500' : ''}`}>
                {formatPrice(Number(summary.pendingBalance || 0))}
              </p>
              <p className="text-[11px] text-muted-foreground">{summary.partialCount || 0} con saldo pendiente</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Row 1: type tabs + search + payment filter */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Type tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 shrink-0">
            {[
              { value: 'all',           label: 'Todo' },
              { value: 'online_sale',   label: 'Online' },
              { value: 'physical_sale', label: 'Física' },
              { value: 'expense',       label: 'Gastos' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => { setTypeFilter(tab.value); setPagination(prev => ({ ...prev, page: 1 })) }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  typeFilter === tab.value
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por cliente, pedido..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPagination(prev => ({ ...prev, page: 1 })) }}
            />
          </div>

          {/* Payment filter — solo los que usas */}
          <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPagination(prev => ({ ...prev, page: 1 })) }}>
            <SelectTrigger className="w-[150px] shrink-0">
              <CreditCard className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Cobro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cash">Efectivo</SelectItem>
              <SelectItem value="transfer">Transferencia</SelectItem>
              <SelectItem value="pending">Sin pago</SelectItem>
            </SelectContent>
          </Select>

          {(search || typeFilter !== 'all' || paymentFilter !== 'all' || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="shrink-0" onClick={() => {
              setSearch(''); setTypeFilter('all'); setPaymentFilter('all')
              setDateFrom(''); setDateTo('')
              setPagination(prev => ({ ...prev, page: 1 }))
            }}>
              <X className="mr-1 h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Row 2: date range — opcional */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground shrink-0">Fecha:</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPagination(prev => ({ ...prev, page: 1 })) }}
            className="w-[140px] text-sm"
          />
          <span className="text-muted-foreground text-sm">→</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPagination(prev => ({ ...prev, page: 1 })) }}
            className="w-[140px] text-sm"
          />
        </div>
      </div>

      {/* Transactions */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="admin-card flex flex-col items-center justify-center py-12 text-center">
          <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No hay transacciones</p>
          <Button onClick={openSaleModal}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar primera transaccion
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table — 5 cols */}
          <div className="hidden md:block rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-3 w-[44%]">Transacción</TableHead>
                  <TableHead className="w-[120px]">Fecha</TableHead>
                  <TableHead className="text-right w-[150px]">Total</TableHead>
                  <TableHead className="w-[130px]">Método</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const isExpense = tx.type === 'expense' || tx.type === 'refund'
                  const isSale    = tx.type === 'physical_sale' || tx.type === 'online_sale'
                  const paid  = Number(tx.amount_paid || 0)
                  const total = Number(tx.total || 0)
                  const pct   = total > 0 ? Math.min((paid / total) * 100, 100) : 0
                  const indicatorColor = tx.type === 'online_sale' ? 'bg-blue-500' :
                    tx.type === 'physical_sale' ? 'bg-green-500' :
                    tx.type === 'expense'       ? 'bg-orange-500' :
                    tx.type === 'refund'        ? 'bg-red-500' : 'bg-muted-foreground/40'
                  const typePill = tx.type === 'online_sale' ? 'bg-blue-500/10 text-blue-400' :
                    tx.type === 'physical_sale' ? 'bg-green-500/10 text-green-400' :
                    tx.type === 'expense'       ? 'bg-orange-500/10 text-orange-400' :
                    tx.type === 'refund'        ? 'bg-red-500/10 text-red-400' : 'bg-muted text-muted-foreground'
                  return (
                    <TableRow key={tx.id} className="group">
                      {/* Transacción */}
                      <TableCell className="pl-0 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-0.5 h-9 rounded-full shrink-0 ${indicatorColor}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none ${typePill}`}>
                                {typeLabels[tx.type] || tx.type}
                              </span>
                              <span className="text-[10px] text-muted-foreground/50">T-{tx.id}</span>
                              {tx.order_number && (
                                <span className="text-[10px] text-muted-foreground">#{tx.order_number}</span>
                              )}
                            </div>
                            <p className="text-sm font-medium truncate max-w-[280px] leading-snug">
                              {tx.description || (tx.order_number ? `Pedido ${tx.order_number}` : '—')}
                            </p>
                            {tx.customer_name && (
                              <p className="text-xs text-muted-foreground truncate">{tx.customer_name}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Fecha */}
                      <TableCell className="tabular-nums">
                        <p className="text-sm">{formatDate(tx.transaction_date)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(tx.transaction_date)}</p>
                      </TableCell>

                      {/* Total + cobro */}
                      <TableCell className="text-right">
                        <p className={`text-sm font-bold ${isExpense ? 'text-red-500' : ''}`}>
                          {isExpense ? '−' : ''}{formatPrice(total)}
                        </p>
                        {isSale && (
                          <div className="mt-1 flex flex-col items-end gap-0.5">
                            {paid >= total ? (
                              <span className="text-[10px] font-semibold text-green-500">Cobrado ✓</span>
                            ) : paid > 0 ? (
                              <>
                                <div className="w-14 h-1 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-yellow-500" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] text-yellow-500">{formatPrice(paid)} / {formatPrice(total)}</span>
                              </>
                            ) : (
                              <span className="text-[10px] text-red-400">Sin cobrar</span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Método */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {paymentMethodLabels[tx.payment_method] || tx.payment_method}
                        </span>
                      </TableCell>

                      {/* Acciones — solo visibles al hover */}
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openViewTransaction(tx)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {!tx.order_id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTransaction(tx)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {!tx.order_id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(tx.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {transactions.map((tx) => {
              const isExpense = tx.type === 'expense' || tx.type === 'refund'
              const isSale    = tx.type === 'physical_sale' || tx.type === 'online_sale'
              const paid  = Number(tx.amount_paid || 0)
              const total = Number(tx.total || 0)
              const pct   = total > 0 ? Math.min((paid / total) * 100, 100) : 0
              const borderColor = tx.type === 'online_sale' ? 'border-l-blue-500' :
                tx.type === 'physical_sale' ? 'border-l-green-500' :
                tx.type === 'expense'       ? 'border-l-orange-500' :
                tx.type === 'refund'        ? 'border-l-red-500' : 'border-l-border'
              return (
                <div key={tx.id} className={`admin-card border-l-2 ${borderColor} pl-3 pr-4 py-3`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none mb-1 ${typeColors[tx.type] || ''}`}>
                        {typeLabels[tx.type] || tx.type}
                      </span>
                      <p className="text-sm font-medium truncate leading-snug">
                        {tx.description || (tx.order_number ? `Pedido #${tx.order_number}` : '—')}
                      </p>
                      {tx.customer_name && (
                        <p className="text-xs text-muted-foreground">{tx.customer_name}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-base font-bold leading-snug ${isExpense ? 'text-red-500' : ''}`}>
                        {isExpense ? '−' : ''}{formatPrice(total)}
                      </p>
                      {isSale && (
                        paid >= total ? (
                          <p className="text-[10px] font-semibold text-green-500 mt-0.5">Cobrado ✓</p>
                        ) : paid > 0 ? (
                          <p className="text-[10px] text-yellow-500 mt-0.5">{formatPrice(paid)} cobrado</p>
                        ) : (
                          <p className="text-[10px] text-red-400 mt-0.5">Sin cobrar</p>
                        )
                      )}
                    </div>
                  </div>

                  {isSale && paid > 0 && paid < total && (
                    <div className="h-1 rounded-full bg-muted overflow-hidden mb-2">
                      <div className="h-full rounded-full bg-yellow-500" style={{ width: `${pct}%` }} />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(tx.transaction_date)} · {paymentMethodLabels[tx.payment_method] || tx.payment_method}</span>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openViewTransaction(tx)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {!tx.order_id && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTransaction(tx)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {!tx.order_id && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(tx.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{pagination.total} transacciones en total</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            >
              Anterior
            </Button>
            <span className="text-sm">Pagina {pagination.page} de {pagination.totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* View Transaction Modal */}
      <Dialog open={!!viewTransaction} onOpenChange={() => { setViewTransaction(null); setShowAbonoForm(false) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Transaccion</DialogTitle>
          </DialogHeader>
          {viewTransaction && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <Badge variant="outline" className={typeColors[viewTransaction.type] || ''}>
                    {typeLabels[viewTransaction.type] || viewTransaction.type}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDate(viewTransaction.transaction_date)} {formatTime(viewTransaction.transaction_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Metodo de pago</p>
                  <p className="font-medium">{paymentMethodLabels[viewTransaction.payment_method]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <Badge variant="outline" className={paymentStatusColors[viewTransaction.payment_status] || ''}>
                    {paymentStatusLabels[viewTransaction.payment_status]}
                  </Badge>
                </div>
                {viewTransaction.customer_name && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Cliente</p>
                    <p className="font-medium">{viewTransaction.customer_name}</p>
                    {viewTransaction.customer_phone && <p className="text-xs text-muted-foreground">{viewTransaction.customer_phone}</p>}
                    {viewTransaction.customer_email && <p className="text-xs text-muted-foreground">{viewTransaction.customer_email}</p>}
                  </div>
                )}
                {viewTransaction.order_number && (
                  <div>
                    <p className="text-muted-foreground">Pedido</p>
                    <p className="font-medium">#{viewTransaction.order_number}</p>
                  </div>
                )}
                {viewTransaction.payment_reference && (
                  <div>
                    <p className="text-muted-foreground">Referencia</p>
                    <p className="font-medium">{viewTransaction.payment_reference}</p>
                  </div>
                )}
              </div>
              {viewTransaction.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Descripcion</p>
                  <p className="text-sm">{viewTransaction.description}</p>
                </div>
              )}
              {viewTransaction.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="text-sm">{viewTransaction.notes}</p>
                </div>
              )}
              <div className="border-t pt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(viewTransaction.subtotal)}</span>
                </div>
                {Number(viewTransaction.shipping_cost) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envio</span>
                    <span>{formatPrice(viewTransaction.shipping_cost)}</span>
                  </div>
                )}
                {Number(viewTransaction.discount) > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Descuento</span>
                    <span>-{formatPrice(viewTransaction.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total</span>
                  <span>{formatPrice(viewTransaction.total)}</span>
                </div>
              </div>

              {/* ===== SECCION DE ABONOS ===== */}
              {(viewTransaction.type === 'physical_sale' || viewTransaction.type === 'online_sale') && (
                <div className="border-t pt-4 space-y-4">
                  {/* Barra de progreso de pago */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Progreso de Pago</h4>
                      <div className="flex items-center gap-2">
                        {Number(viewTransaction.amount_paid) >= Number(viewTransaction.total) ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Pagado completo</Badge>
                        ) : Number(viewTransaction.amount_paid) > 0 ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pago parcial</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Sin pago</Badge>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          Number(viewTransaction.amount_paid) >= Number(viewTransaction.total) 
                            ? 'bg-green-500' 
                            : Number(viewTransaction.amount_paid) > 0 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min((Number(viewTransaction.amount_paid) / Number(viewTransaction.total)) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Abonado: <span className="font-semibold text-foreground">{formatPrice(Number(viewTransaction.amount_paid || 0))}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Pendiente: <span className="font-semibold text-foreground">{formatPrice(Math.max(Number(viewTransaction.total) - Number(viewTransaction.amount_paid || 0), 0))}</span>
                      </span>
                    </div>
                  </div>

                  {/* Force payment status buttons */}
                  <div className="flex flex-wrap gap-2">
                    {Number(viewTransaction.amount_paid) < Number(viewTransaction.total) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600/30 hover:bg-green-500/10"
                        onClick={() => handleForcePaymentStatus('approved')}
                        disabled={forcingPayment}
                      >
                        {forcingPayment ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                        Marcar como Pagado Completo
                      </Button>
                    )}
                    {viewTransaction.payment_status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-yellow-600 border-yellow-600/30 hover:bg-yellow-500/10"
                        onClick={() => handleForcePaymentStatus('pending')}
                        disabled={forcingPayment}
                      >
                        {forcingPayment ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ArrowUpDown className="mr-1 h-3 w-3" />}
                        Cambiar a Pendiente
                      </Button>
                    )}
                  </div>

                  {/* Lista de abonos */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Historial de Abonos</h4>
                      {Number(viewTransaction.amount_paid) < Number(viewTransaction.total) && (
                        <Button size="sm" variant="outline" onClick={() => {
                          setShowAbonoForm(!showAbonoForm)
                          setAbonoForm({ amount: '', paymentMethod: 'cash', paymentReference: '', notes: '', paymentDate: getBogotaDateTimeStr() })
                        }}>
                          <Plus className="mr-1 h-3 w-3" />
                          Agregar Abono
                        </Button>
                      )}
                    </div>

                    {loadingPayments ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : payments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">No hay abonos registrados</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-green-600">+{formatPrice(p.amount)}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {paymentMethodLabels[p.payment_method] || p.payment_method}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">{formatDate(p.payment_date)} {formatTime(p.payment_date)}</span>
                                {p.payment_reference && <span className="text-xs text-muted-foreground">Ref: {p.payment_reference}</span>}
                              </div>
                              {p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditPayment(p)}
                                title="Editar abono"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={() => handleDeletePayment(p.id)}
                                disabled={deletingPaymentId === p.id}
                              >
                                {deletingPaymentId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Form para agregar abono */}
                  {showAbonoForm && (
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                      <h5 className="font-semibold text-sm">Nuevo Abono</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Monto *</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={abonoForm.amount}
                            onChange={(e) => setAbonoForm(prev => ({ ...prev, amount: e.target.value }))}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Max: {formatPrice(Math.max(Number(viewTransaction.total) - Number(viewTransaction.amount_paid || 0), 0))}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Metodo de Pago</Label>
                          <Select value={abonoForm.paymentMethod} onValueChange={(v) => setAbonoForm(prev => ({ ...prev, paymentMethod: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Efectivo</SelectItem>
                              <SelectItem value="transfer">Transferencia</SelectItem>
                              <SelectItem value="nequi">Nequi</SelectItem>
                              <SelectItem value="daviplata">Daviplata</SelectItem>
                              <SelectItem value="other">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fecha</Label>
                          <Input
                            type="datetime-local"
                            value={abonoForm.paymentDate}
                            onChange={(e) => setAbonoForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Referencia</Label>
                          <Input
                            placeholder="Numero de comprobante"
                            value={abonoForm.paymentReference}
                            onChange={(e) => setAbonoForm(prev => ({ ...prev, paymentReference: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nota (opcional)</Label>
                        <Input
                          placeholder="Nota del abono..."
                          value={abonoForm.notes}
                          onChange={(e) => setAbonoForm(prev => ({ ...prev, notes: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowAbonoForm(false)}>Cancelar</Button>
                        <Button size="sm" onClick={handleAddAbono} disabled={savingAbono}>
                          {savingAbono && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                          Registrar Abono
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">Registrado por: {viewTransaction.created_by}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Transaction Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          {/* Modal header */}
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <h2 className="text-lg font-bold tracking-tight">Registrar Transacción</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Venta física o gasto del negocio</p>
          </div>

          {/* Type selector */}
          <div className="px-6 pt-4 pb-2">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary/50">
              <button
                onClick={() => setModalTab('sale')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  modalTab === 'sale'
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Banknote className="h-4 w-4 text-green-500" />
                Venta Física
              </button>
              <button
                onClick={() => setModalTab('expense')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  modalTab === 'expense'
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TrendingDown className="h-4 w-4 text-red-500" />
                Gasto
              </button>
            </div>
          </div>

          {/* SALE TAB */}
          {modalTab === 'sale' && (
            <div className="px-6 pb-6 space-y-5 pt-2">

              {/* Pago */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pago</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Método *</Label>
                    <Select value={saleForm.paymentMethod} onValueChange={(v) => setSaleForm(prev => ({ ...prev, paymentMethod: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estado *</Label>
                    <Select value={saleForm.paymentStatus} onValueChange={(v) => setSaleForm(prev => ({ ...prev, paymentStatus: v, firstPaymentAmount: '' }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Pagado completo</SelectItem>
                        <SelectItem value="partial">Abono parcial</SelectItem>
                        <SelectItem value="pending">Sin pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fecha y Hora</Label>
                    <Input className="h-9" type="datetime-local" value={saleForm.transactionDate} onChange={(e) => setSaleForm(prev => ({ ...prev, transactionDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Referencia</Label>
                    <Input className="h-9" placeholder="# transferencia / Nequi..." value={saleForm.paymentReference} onChange={(e) => setSaleForm(prev => ({ ...prev, paymentReference: e.target.value }))} />
                  </div>
                </div>

                {saleForm.paymentStatus === 'partial' && (
                  <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 space-y-2">
                    <Label className="text-xs font-semibold text-yellow-600">Monto del abono inicial</Label>
                    <Input
                      type="number" placeholder="0"
                      value={saleForm.firstPaymentAmount}
                      onChange={(e) => setSaleForm(prev => ({ ...prev, firstPaymentAmount: e.target.value }))}
                      className="h-9"
                    />
                    {saleTotal > 0 && Number(saleForm.firstPaymentAmount) > 0 && (
                      <div className="flex justify-between text-xs text-yellow-600/80">
                        <span>Abonado: {formatPrice(Number(saleForm.firstPaymentAmount))}</span>
                        <span>Pendiente: {formatPrice(Math.max(saleTotal - Number(saleForm.firstPaymentAmount), 0))}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cliente */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente <span className="normal-case font-normal">(opcional)</span></p>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    {searchingCustomers && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    <Input
                      className="h-9 pl-8 text-sm"
                      placeholder="Buscar cliente registrado..."
                      value={customerSearch}
                      onChange={(e) => { setCustomerSearch(e.target.value); searchCustomers(e.target.value) }}
                    />
                  </div>
                  {customerSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 rounded-lg border border-border bg-background shadow-lg overflow-hidden">
                      {customerSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full flex items-start gap-3 px-3 py-2.5 text-sm hover:bg-secondary/50 text-left border-b border-border last:border-0 transition-colors"
                          onClick={() => {
                            setSaleForm(prev => ({ ...prev, customerName: s.name || '', customerPhone: s.phone || '' }))
                            setCustomerSearch('')
                            setCustomerSuggestions([])
                          }}
                        >
                          <div>
                            <p className="font-medium">{s.name}</p>
                            {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre</Label>
                    <Input className="h-9" placeholder="Nombre completo" value={saleForm.customerName} onChange={(e) => setSaleForm(prev => ({ ...prev, customerName: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Teléfono</Label>
                    <Input className="h-9" placeholder="3001234567" value={saleForm.customerPhone} onChange={(e) => setSaleForm(prev => ({ ...prev, customerPhone: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Productos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Productos</p>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addSaleItem}>
                    <Plus className="h-3 w-3" /> Agregar
                  </Button>
                </div>
                <div className="space-y-2">
                  {saleForm.items.map((item, index) => (
                    <div key={index} className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Select
                            value={item.productId?.toString() || 'custom'}
                            onValueChange={(v) => {
                              if (v === 'custom') {
                                updateSaleItem(index, 'productId', null)
                                updateSaleItem(index, 'productName', '')
                                updateSaleItem(index, 'unitPrice', 0)
                              } else {
                                updateSaleItem(index, 'productId', v)
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Seleccionar producto..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="custom">Producto personalizado</SelectItem>
                              {products.map(p => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                  {p.name} — {formatPrice(p.price)} {p.stock > 0 ? `(${p.stock})` : '(sin stock)'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!item.productId && (
                            <Input
                              placeholder="Nombre del producto"
                              value={item.productName}
                              onChange={(e) => updateSaleItem(index, 'productName', e.target.value)}
                              className="mt-1.5 h-8 text-xs"
                            />
                          )}
                        </div>
                        {saleForm.items.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 shrink-0" onClick={() => removeSaleItem(index)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Cantidad</Label>
                          <Input type="number" min="1" className="h-8 text-sm" value={item.quantity} onChange={(e) => updateSaleItem(index, 'quantity', parseInt(e.target.value) || 1)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Precio unit.</Label>
                          <Input type="number" className="h-8 text-sm" value={item.unitPrice} onChange={(e) => updateSaleItem(index, 'unitPrice', Number(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Subtotal</Label>
                          <div className="h-8 flex items-center px-3 rounded-md bg-secondary/50 text-sm font-semibold">
                            {formatPrice(item.quantity * item.unitPrice)}
                          </div>
                        </div>
                      </div>
                      {item.productId && (() => {
                        const prod = products.find(p => p.id.toString() === item.productId?.toString())
                        if (prod && prod.stock <= 0) return <p className="text-[10px] text-yellow-500">Sin stock — se registrará sin descontar inventario</p>
                        if (prod && item.quantity > prod.stock) return <p className="text-[10px] text-yellow-500">Excede el stock disponible ({prod.stock} uds)</p>
                        return null
                      })()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen + envío/descuento */}
              <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Resumen</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Costo de Envío</Label>
                    <Input type="number" className="h-9" value={saleForm.shippingCost} onChange={(e) => setSaleForm(prev => ({ ...prev, shippingCost: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Descuento</Label>
                    <Input type="number" className="h-9" value={saleForm.discount} onChange={(e) => setSaleForm(prev => ({ ...prev, discount: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1 text-sm border-t border-border pt-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span><span>{formatPrice(saleSubtotal)}</span>
                  </div>
                  {Number(saleForm.shippingCost) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Envío</span><span>+{formatPrice(Number(saleForm.shippingCost))}</span>
                    </div>
                  )}
                  {Number(saleForm.discount) > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Descuento</span><span>−{formatPrice(Number(saleForm.discount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                    <span>Total</span>
                    <span className="text-green-500">{formatPrice(saleTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notas (opcional)</Label>
                <Textarea placeholder="Observaciones de la venta..." value={saleForm.notes} onChange={(e) => setSaleForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} className="resize-none text-sm" />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleSaveSale} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Registrar Venta
                </Button>
              </div>
            </div>
          )}

          {/* EXPENSE TAB */}
          {modalTab === 'expense' && (
            <div className="px-6 pb-6 space-y-5 pt-2">

              {/* Categoría + descripción */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Detalle del Gasto</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Categoría *</Label>
                    <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="envios">📦 Envíos</SelectItem>
                        <SelectItem value="inventario">🏷️ Inventario</SelectItem>
                        <SelectItem value="marketing">📣 Marketing</SelectItem>
                        <SelectItem value="empaque">🎁 Empaque</SelectItem>
                        <SelectItem value="servicios">⚙️ Servicios</SelectItem>
                        <SelectItem value="impuestos">🧾 Impuestos</SelectItem>
                        <SelectItem value="otros">📌 Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fecha y Hora</Label>
                    <Input className="h-9" type="datetime-local" value={expenseForm.transactionDate} onChange={(e) => setExpenseForm(prev => ({ ...prev, transactionDate: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Descripción *</Label>
                  <Input placeholder="Ej: Domicilios semana del 19 mayo, Facebook Ads..." value={expenseForm.description} onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))} />
                </div>
              </div>

              {/* Monto + pago */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pago</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Monto *</Label>
                    <Input type="number" className="h-9" placeholder="0" value={expenseForm.total} onChange={(e) => setExpenseForm(prev => ({ ...prev, total: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Método</Label>
                    <Select value={expenseForm.paymentMethod} onValueChange={(v) => setExpenseForm(prev => ({ ...prev, paymentMethod: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                        <SelectItem value="nequi">Nequi</SelectItem>
                        <SelectItem value="daviplata">Daviplata</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Referencia (opcional)</Label>
                    <Input className="h-9" placeholder="# comprobante, factura..." value={expenseForm.paymentReference} onChange={(e) => setExpenseForm(prev => ({ ...prev, paymentReference: e.target.value }))} />
                  </div>
                </div>
              </div>

              {expenseForm.total && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total del gasto</p>
                    <p className="text-lg font-bold text-red-500">−{formatPrice(Number(expenseForm.total))}</p>
                  </div>
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs">
                    {expenseCategoryLabels[expenseForm.category]}
                  </Badge>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Notas (opcional)</Label>
                <Textarea placeholder="Detalles adicionales..." value={expenseForm.notes} onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} className="resize-none text-sm" />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button size="sm" variant="destructive" onClick={handleSaveExpense} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  Registrar Gasto
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Modal */}
      <Dialog open={!!editTransaction} onOpenChange={() => setEditTransaction(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Transaccion</DialogTitle>
            <DialogDescription>Modifica los datos de esta transaccion manual.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha y Hora</Label>
                <Input
                  type="datetime-local"
                  value={editForm.transactionDate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, transactionDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Metodo de Pago</Label>
                <Select value={editForm.paymentMethod} onValueChange={(v) => setEditForm(prev => ({ ...prev, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="nequi">Nequi</SelectItem>
                    <SelectItem value="daviplata">Daviplata</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Referencia de Pago</Label>
              <Input
                placeholder="Numero de comprobante"
                value={editForm.paymentReference}
                onChange={(e) => setEditForm(prev => ({ ...prev, paymentReference: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Cliente</Label>
                <Input
                  value={editForm.customerName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, customerName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Telefono</Label>
                <Input
                  value={editForm.customerPhone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm">Email</Label>
                <Input
                  value={editForm.customerEmail}
                  onChange={(e) => setEditForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setEditTransaction(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Modal */}
      <Dialog open={!!editingPayment} onOpenChange={() => setEditingPayment(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Abono</DialogTitle>
            <DialogDescription>Modifica los datos de este abono, incluyendo el monto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-semibold">Monto del Abono *</Label>
              <Input
                type="number"
                placeholder="0"
                value={editPaymentForm.amount}
                onChange={(e) => setEditPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
              />
              {editingPayment && Number(editPaymentForm.amount) !== editingPayment.amount && (
                <p className="text-xs text-yellow-600">
                  Monto original: {formatPrice(editingPayment.amount)} - Se recalcularan los totales
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metodo de Pago</Label>
                <Select value={editPaymentForm.paymentMethod} onValueChange={(v) => setEditPaymentForm(prev => ({ ...prev, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="nequi">Nequi</SelectItem>
                    <SelectItem value="daviplata">Daviplata</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="datetime-local"
                  value={editPaymentForm.paymentDate}
                  onChange={(e) => setEditPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Referencia</Label>
              <Input
                placeholder="Numero de comprobante"
                value={editPaymentForm.paymentReference}
                onChange={(e) => setEditPaymentForm(prev => ({ ...prev, paymentReference: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Nota</Label>
              <Input
                value={editPaymentForm.notes}
                onChange={(e) => setEditPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setEditingPayment(null)}>Cancelar</Button>
              <Button onClick={handleSavePaymentEdit} disabled={savingPaymentEdit}>
                {savingPaymentEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar transaccion</AlertDialogTitle>
            <AlertDialogDescription>
              Esta transaccion se eliminara permanentemente. Solo se pueden eliminar transacciones manuales, las ventas online no se pueden borrar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
