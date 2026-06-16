'use client'

import { useState, useCallback } from 'react'
import {
  Plus, Search, Loader2, Check, X,
  TrendingDown, Banknote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/data'

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
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const g = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`
}

interface FinanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (type: 'sale' | 'expense') => void
  defaultTab?: 'sale' | 'expense'
  products: Product[]
  showToast: (msg: string, type: 'success' | 'error') => void
}

export function FinanceModal({
  isOpen, onClose, onSuccess, defaultTab = 'sale', products, showToast,
}: FinanceModalProps) {
  const [modalTab, setModalTab] = useState<'sale' | 'expense'>(defaultTab)
  const [saving, setSaving] = useState(false)

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState<{ name: string; phone: string }[]>([])
  const [searchingCustomers, setSearchingCustomers] = useState(false)

  const [saleForm, setSaleForm] = useState({
    customerName: '', customerPhone: '', customerEmail: '',
    paymentMethod: 'cash', paymentStatus: 'approved',
    firstPaymentAmount: '', paymentReference: '',
    shippingCost: '0', discount: '0',
    description: '', notes: '',
    transactionDate: getBogotaDateTimeStr(),
    items: [{ productId: null as number | null, productName: '', quantity: 1, unitPrice: 0 }] as SaleItem[],
  })

  const [expenseForm, setExpenseForm] = useState({
    category: 'otros', description: '', total: '',
    paymentMethod: 'cash', paymentReference: '',
    notes: '', transactionDate: getBogotaDateTimeStr(),
  })

  const resetForms = () => {
    setModalTab(defaultTab)
    setCustomerSearch('')
    setCustomerSuggestions([])
    setSaleForm({
      customerName: '', customerPhone: '', customerEmail: '',
      paymentMethod: 'cash', paymentStatus: 'approved',
      firstPaymentAmount: '', paymentReference: '',
      shippingCost: '0', discount: '0',
      description: '', notes: '',
      transactionDate: getBogotaDateTimeStr(),
      items: [{ productId: null, productName: '', quantity: 1, unitPrice: 0 }],
    })
    setExpenseForm({
      category: 'otros', description: '', total: '',
      paymentMethod: 'cash', paymentReference: '',
      notes: '', transactionDate: getBogotaDateTimeStr(),
    })
  }

  const handleClose = () => {
    resetForms()
    onClose()
  }

  const searchCustomers = useCallback(async (term: string) => {
    if (term.trim().length < 2) { setCustomerSuggestions([]); return }
    setSearchingCustomers(true)
    try {
      const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(term)}`)
      const data = await res.json()
      if (data.success) setCustomerSuggestions(data.customers || [])
    } catch { /* ignore */ } finally { setSearchingCustomers(false) }
  }, [])

  const addSaleItem = () => setSaleForm(prev => ({
    ...prev, items: [...prev.items, { productId: null, productName: '', quantity: 1, unitPrice: 0 }],
  }))

  const removeSaleItem = (index: number) => {
    if (saleForm.items.length <= 1) return
    setSaleForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
  }

  const updateSaleItem = (index: number, field: keyof SaleItem, value: any) => {
    setSaleForm(prev => {
      const items = [...prev.items]
      items[index] = { ...items[index], [field]: value }
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

  const saleSubtotal = saleForm.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const saleTotal = saleSubtotal + Number(saleForm.shippingCost || 0) - Number(saleForm.discount || 0)

  const handleSaveSale = async () => {
    const validItems = saleForm.items.filter(i => i.productName && i.unitPrice > 0)
    if (validItems.length === 0) { showToast('Agrega al menos un producto', 'error'); return }
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
          items: validItems.map(i => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Ingreso registrado', 'success')
        handleClose()
        onSuccess('sale')
      } else { showToast(data.error || 'Error al registrar', 'error') }
    } catch { showToast('Error al registrar ingreso', 'error') }
    finally { setSaving(false) }
  }

  const handleSaveExpense = async () => {
    if (!expenseForm.description || !expenseForm.total) {
      showToast('Descripcion y monto son requeridos', 'error'); return
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
        }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Egreso registrado', 'success')
        handleClose()
        onSuccess('expense')
      } else { showToast(data.error || 'Error al registrar', 'error') }
    } catch { showToast('Error al registrar gasto', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h2 className="text-lg font-bold tracking-tight">Registrar Transacción</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Ingreso o egreso del negocio</p>
        </div>

        <div className="px-6 pt-4 pb-2">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary/50">
            <button
              onClick={() => setModalTab('sale')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                modalTab === 'sale' ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Banknote className="h-4 w-4 text-green-500" />
              Ingreso / Venta
            </button>
            <button
              onClick={() => setModalTab('expense')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                modalTab === 'expense' ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingDown className="h-4 w-4 text-red-500" />
              Egreso / Gasto
            </button>
          </div>
        </div>

        {/* SALE TAB */}
        {modalTab === 'sale' && (
          <div className="px-6 pb-6 space-y-5 pt-2">
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
                      <SelectItem value="nequi">Nequi</SelectItem>
                      <SelectItem value="daviplata">Daviplata</SelectItem>
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
                  <Input className="h-9" placeholder="# transferencia..." value={saleForm.paymentReference} onChange={(e) => setSaleForm(prev => ({ ...prev, paymentReference: e.target.value }))} />
                </div>
              </div>

              {saleForm.paymentStatus === 'partial' && (
                <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 space-y-2">
                  <Label className="text-xs font-semibold text-yellow-600">Monto del abono inicial</Label>
                  <Input type="number" placeholder="0" value={saleForm.firstPaymentAmount} onChange={(e) => setSaleForm(prev => ({ ...prev, firstPaymentAmount: e.target.value }))} className="h-9" />
                  {saleTotal > 0 && Number(saleForm.firstPaymentAmount) > 0 && (
                    <div className="flex justify-between text-xs text-yellow-600/80">
                      <span>Abonado: {formatPrice(Number(saleForm.firstPaymentAmount))}</span>
                      <span>Pendiente: {formatPrice(Math.max(saleTotal - Number(saleForm.firstPaymentAmount), 0))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente <span className="normal-case font-normal">(opcional)</span></p>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  {searchingCustomers && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  <Input className="h-9 pl-8 text-sm" placeholder="Buscar cliente registrado..." value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); searchCustomers(e.target.value) }} />
                </div>
                {customerSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 rounded-lg border border-border bg-background shadow-lg overflow-hidden">
                    {customerSuggestions.map((s, i) => (
                      <button key={i} type="button" className="w-full flex items-start gap-3 px-3 py-2.5 text-sm hover:bg-secondary/50 text-left border-b border-border last:border-0" onClick={() => { setSaleForm(prev => ({ ...prev, customerName: s.name || '', customerPhone: s.phone || '' })); setCustomerSearch(''); setCustomerSuggestions([]) }}>
                        <div><p className="font-medium">{s.name}</p>{s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}</div>
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
                        <Select value={item.productId?.toString() || 'custom'} onValueChange={(v) => { if (v === 'custom') { updateSaleItem(index, 'productId', null); updateSaleItem(index, 'productName', ''); updateSaleItem(index, 'unitPrice', 0) } else { updateSaleItem(index, 'productId', v) } }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="custom">Producto personalizado</SelectItem>
                            {products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} — {formatPrice(p.price)} {p.stock > 0 ? `(${p.stock})` : '(sin stock)'}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {!item.productId && <Input placeholder="Nombre del producto" value={item.productName} onChange={(e) => updateSaleItem(index, 'productName', e.target.value)} className="mt-1.5 h-8 text-xs" />}
                      </div>
                      {saleForm.items.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 shrink-0" onClick={() => removeSaleItem(index)}><X className="h-3.5 w-3.5" /></Button>}
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
                        <div className="h-8 flex items-center px-3 rounded-md bg-secondary/50 text-sm font-semibold">{formatPrice(item.quantity * item.unitPrice)}</div>
                      </div>
                    </div>
                    {item.productId && (() => { const prod = products.find(p => p.id.toString() === item.productId?.toString()); if (prod && prod.stock <= 0) return <p className="text-[10px] text-yellow-500">Sin stock — se registrará sin descontar inventario</p>; if (prod && item.quantity > prod.stock) return <p className="text-[10px] text-yellow-500">Excede el stock disponible ({prod.stock} uds)</p>; return null })()}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Resumen</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Costo de Envío</Label><Input type="number" className="h-9" value={saleForm.shippingCost} onChange={(e) => setSaleForm(prev => ({ ...prev, shippingCost: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Descuento</Label><Input type="number" className="h-9" value={saleForm.discount} onChange={(e) => setSaleForm(prev => ({ ...prev, discount: e.target.value }))} /></div>
              </div>
              <div className="space-y-1 text-sm border-t border-border pt-2">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatPrice(saleSubtotal)}</span></div>
                {Number(saleForm.shippingCost) > 0 && <div className="flex justify-between text-muted-foreground"><span>Envío</span><span>+{formatPrice(Number(saleForm.shippingCost))}</span></div>}
                {Number(saleForm.discount) > 0 && <div className="flex justify-between text-red-500"><span>Descuento</span><span>−{formatPrice(Number(saleForm.discount))}</span></div>}
                <div className="flex justify-between font-bold text-base pt-1 border-t border-border"><span>Total</span><span className="text-green-500">{formatPrice(saleTotal)}</span></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notas (opcional)</Label>
              <Textarea placeholder="Observaciones..." value={saleForm.notes} onChange={(e) => setSaleForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} className="resize-none text-sm" />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleClose}>Cancelar</Button>
              <Button size="sm" onClick={handleSaveSale} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Registrar Ingreso
              </Button>
            </div>
          </div>
        )}

        {/* EXPENSE TAB */}
        {modalTab === 'expense' && (
          <div className="px-6 pb-6 space-y-5 pt-2">
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
                <Input placeholder="Ej: Domicilios semana, Facebook Ads..." value={expenseForm.description} onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))} />
              </div>
            </div>

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
              <Button variant="outline" size="sm" onClick={handleClose}>Cancelar</Button>
              <Button size="sm" variant="destructive" onClick={handleSaveExpense} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingDown className="h-3.5 w-3.5" />}
                Registrar Egreso
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
