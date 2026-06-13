'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, X, Link as LinkIcon, Check, Loader2, Copy,
  Package, AlertTriangle, Filter, ChevronDown, Eye, Settings2, Download, RefreshCw, Tag, DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatPrice } from '@/lib/data'
import Link from 'next/link'

interface Product {
  id: number
  name: string
  slug: string
  description: string | null
  price: number
  compare_at_price: number | null
  sku: string | null
  stock: number
  low_stock_threshold: number
  category_id: number | null
  category_name: string | null
  collection_id: number | null
  collection_name: string | null
  is_featured: boolean
  is_active: boolean
  show_in_descuentos: boolean
  image: string | null
  images: string | null
}

interface Category {
  id: number
  name: string
  slug: string
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [toasts, setToasts] = useState<Toast[]>([])
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkAction, setBulkAction] = useState('')

  // Form state with tabs
  const [formTab, setFormTab] = useState('basic')
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    compareAtPrice: '',
    sku: '',
    stock: '0',
    lowStockThreshold: '5',
    categoryId: '',
    collectionId: '',
    isFeatured: false,
    isActive: true,
    showInDescuentos: false,
    images: [] as string[]
  })
  const [newImageUrl, setNewImageUrl] = useState('')

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterCategory !== 'all') params.set('category', filterCategory)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      
      const res = await fetch(`/api/admin/products?${params}`)
      const data = await res.json()
      
      if (data.products) {
        setProducts(data.products)
      }
      if (data.categories) {
        setCategories(data.categories)
      }
    } catch {
      showToast('Error al cargar productos', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, filterCategory, filterStatus])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Sorting
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc': return a.name.localeCompare(b.name)
      case 'name_desc': return b.name.localeCompare(a.name)
      case 'price_asc': return a.price - b.price
      case 'price_desc': return b.price - a.price
      case 'stock_asc': return a.stock - b.stock
      case 'stock_desc': return b.stock - a.stock
      case 'newest': return 0
      default: return 0
    }
  })

  // Stats
  const totalValue = products.reduce((s, p) => s + (p.price * p.stock), 0)
  const lowStock = products.filter(p => p.stock <= (p.low_stock_threshold || 5) && p.stock > 0).length
  const outOfStock = products.filter(p => p.stock === 0).length
  const activeCount = products.filter(p => p.is_active).length
  const featuredCount = products.filter(p => p.is_featured).length
  const discountCount = products.filter(p => p.show_in_descuentos).length

  const openCreateModal = () => {
    setEditingProduct(null)
    setFormTab('basic')
    setForm({
      name: '', description: '', price: '', compareAtPrice: '', sku: '',
      stock: '0', lowStockThreshold: '5', categoryId: '', collectionId: '',
      isFeatured: false, isActive: true, showInDescuentos: false, images: []
    })
    setShowModal(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setFormTab('basic')
    const imageList = product.images ? product.images.split(',').filter(Boolean) : 
                     product.image ? [product.image] : []
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      compareAtPrice: product.compare_at_price?.toString() || '',
      sku: product.sku || '',
      stock: product.stock.toString(),
      lowStockThreshold: (product.low_stock_threshold || 5).toString(),
      categoryId: product.category_id?.toString() || '',
      collectionId: product.collection_id?.toString() || '',
      isFeatured: product.is_featured,
      isActive: product.is_active,
      showInDescuentos: product.show_in_descuentos || false,
      images: imageList
    })
    setShowModal(true)
  }

  const addImageUrl = () => {
    if (!newImageUrl.trim()) { showToast('Ingresa una URL de imagen', 'error'); return }
    if (form.images.length >= 5) { showToast('Maximo 5 imagenes permitidas', 'error'); return }
    try { new URL(newImageUrl) } catch { showToast('URL no valida', 'error'); return }
    setForm(prev => ({ ...prev, images: [...prev.images, newImageUrl.trim()] }))
    setNewImageUrl('')
  }

  const removeImage = (index: number) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
  }

  const handleSave = async () => {
    if (!form.name || !form.price) {
      showToast('Nombre y precio son requeridos', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...(editingProduct && { id: editingProduct.id }),
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
        sku: form.sku || null,
        stock: parseInt(form.stock) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
        categoryId: form.categoryId ? parseInt(form.categoryId) : null,
        collectionId: form.collectionId ? parseInt(form.collectionId) : null,
        isFeatured: form.isFeatured,
        isActive: form.isActive,
        showInDescuentos: form.showInDescuentos,
        images: form.images
      }

      const res = await fetch('/api/admin/products', {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      
      if (data.success || data.product) {
        showToast(
          editingProduct ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente',
          'success'
        )
        setShowModal(false)
        fetchProducts()
      } else {
        showToast(data.error || 'Error al guardar producto', 'error')
      }
    } catch {
      showToast('Error al guardar producto', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async (productId: number) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate', id: productId })
      })
      const data = await res.json()
      if (data.success) {
        showToast('Producto duplicado', 'success')
        fetchProducts()
      } else {
        showToast(data.error || 'Error al duplicar', 'error')
      }
    } catch {
      showToast('Error al duplicar producto', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/products?id=${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        showToast('Producto eliminado', 'success')
        fetchProducts()
      } else {
        showToast(data.error || 'Error al eliminar', 'error')
      }
    } catch {
      showToast('Error al eliminar producto', 'error')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  // Bulk toggle
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    if (selectedIds.size === sortedProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedProducts.map(p => p.id)))
    }
  }

  const handleBulkAction = async () => {
    if (selectedIds.size === 0 || !bulkAction) return
    try {
      const ids = Array.from(selectedIds)
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: bulkAction, ids })
      })
      const data = await res.json()
      if (data.success) {
        showToast(`${ids.length} producto(s) actualizado(s)`, 'success')
        setSelectedIds(new Set())
        setBulkAction('')
        fetchProducts()
      } else {
        showToast(data.error || 'Error en accion masiva', 'error')
      }
    } catch {
      showToast('Error en accion masiva', 'error')
    }
  }

  // Quick inline stock update
  const handleQuickStockUpdate = async (productId: number, newStock: number) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStock', id: productId, stock: newStock })
      })
      const data = await res.json()
      if (data.success) {
        showToast('Stock actualizado', 'success')
        fetchProducts()
      }
    } catch {
      showToast('Error al actualizar stock', 'error')
    }
  }

  return (
    <div className="space-y-6 pt-16 lg:pt-0">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right-5 ${
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Productos</h1>
            <p className="text-muted-foreground mt-1">
              Administra tu catalogo de {products.length} productos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => fetchProducts(true)}
              disabled={refreshing}
              className="h-9 w-9"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={openCreateModal} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Agregar producto</span>
              <span className="sm:hidden">Agregar</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Card className="admin-card">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Total productos</p>
                  <div className="text-2xl font-bold">{products.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">{activeCount} activos en catálogo</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Activos</p>
                  <div className="text-2xl font-bold text-green-500">{activeCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">{featuredCount} destacados</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Valor inventario</p>
                  <div className="text-2xl font-bold">{formatPrice(totalValue)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Precio × stock actual</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 grid-cols-3">
          <Card className={`admin-card ${lowStock > 0 ? 'border-amber-500/25' : ''}`}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={`h-3.5 w-3.5 ${lowStock > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <p className="text-xs text-muted-foreground">Stock bajo</p>
              </div>
              <p className={`text-base font-bold ${lowStock > 0 ? 'text-amber-500' : ''}`}>{lowStock}</p>
              <p className="text-[11px] text-muted-foreground">productos</p>
            </CardContent>
          </Card>

          <Card className={`admin-card ${outOfStock > 0 ? 'border-red-500/25' : ''}`}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <X className={`h-3.5 w-3.5 ${outOfStock > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                <p className="text-xs text-muted-foreground">Agotados</p>
              </div>
              <p className={`text-base font-bold ${outOfStock > 0 ? 'text-red-500' : ''}`}>{outOfStock}</p>
              <p className="text-[11px] text-muted-foreground">sin stock</p>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Tag className="h-3.5 w-3.5 text-red-500" />
                <p className="text-xs text-muted-foreground">En descuentos</p>
              </div>
              <p className="text-base font-bold">{discountCount}</p>
              <p className="text-[11px] text-muted-foreground">en oferta</p>
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
                placeholder="Buscar por nombre o SKU..." 
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[160px] h-9">
                  <Filter className="mr-2 h-3.5 w-3.5" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                  <SelectItem value="low_stock">Stock bajo</SelectItem>
                  <SelectItem value="out_of_stock">Agotados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Mas recientes</SelectItem>
                  <SelectItem value="name_asc">Nombre A-Z</SelectItem>
                  <SelectItem value="name_desc">Nombre Z-A</SelectItem>
                  <SelectItem value="price_asc">Precio menor</SelectItem>
                  <SelectItem value="price_desc">Precio mayor</SelectItem>
                  <SelectItem value="stock_asc">Menor stock</SelectItem>
                  <SelectItem value="stock_desc">Mayor stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="admin-card border-foreground/20 bg-foreground/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" className="text-sm font-medium">
                {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
              </Badge>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-[200px] h-8">
                  <SelectValue placeholder="Accion masiva..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activate">Activar</SelectItem>
                  <SelectItem value="deactivate">Desactivar</SelectItem>
                  <SelectItem value="feature">Marcar destacado</SelectItem>
                  <SelectItem value="unfeature">Quitar destacado</SelectItem>
                  <SelectItem value="add_to_descuentos">Agregar a Descuentos</SelectItem>
                  <SelectItem value="remove_from_descuentos">Quitar de Descuentos</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleBulkAction} disabled={!bulkAction} className="h-8">
                Aplicar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setSelectedIds(new Set()); setBulkAction('') }} className="h-8">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="admin-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cargando productos...</p>
            </div>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center mb-4">
              <Package className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No hay productos con estos filtros</p>
            <Button onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Crear primer producto
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === sortedProducts.length && sortedProducts.length > 0}
                        onChange={toggleAll}
                        className="rounded border-border h-4 w-4"
                      />
                    </TableHead>
                    <TableHead className="w-[70px]">Imagen</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-center w-[100px]">Stock</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProducts.map((product) => {
                    const imageUrl = product.image || (product.images ? product.images.split(',')[0] : null)
                    const isLowStock = product.stock <= (product.low_stock_threshold || 5) && product.stock > 0
                    const isOutOfStock = product.stock === 0
                    return (
                      <TableRow key={product.id} className={selectedIds.has(product.id) ? 'bg-secondary/30' : ''}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product.id)}
                            onChange={() => toggleSelect(product.id)}
                            className="rounded border-border h-4 w-4"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-secondary/50 border border-border">
                            {imageUrl ? (
                              <Image src={imageUrl} alt={product.name} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate max-w-[200px]">{product.name}</p>
                              {!!product.is_featured && (
                                <Badge variant="secondary" className="text-[10px] px-1.5">Destacado</Badge>
                              )}
                              {!!product.show_in_descuentos && (
                                <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] px-1.5">Oferta</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{product.sku || 'Sin SKU'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {product.category_name ? (
                            <Badge variant="outline" className="font-normal">{product.category_name}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <span className="font-semibold tabular-nums">{formatPrice(product.price)}</span>
                            {product.compare_at_price && product.compare_at_price > product.price && (
                              <p className="text-[10px] text-muted-foreground line-through tabular-nums">
                                {formatPrice(product.compare_at_price)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`font-semibold tabular-nums ${
                              isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : ''
                            }`}>
                              {product.stock}
                            </span>
                            {isOutOfStock && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] px-1">Agotado</Badge>
                            )}
                            {isLowStock && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] px-1">Bajo</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {product.is_active ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Activo</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Inactivo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openEditModal(product)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar producto
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/producto/${product.slug}`} target="_blank">
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver en tienda
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(product.id)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteId(product.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-border">
              {sortedProducts.map((product) => {
                const imageUrl = product.image || (product.images ? product.images.split(',')[0] : null)
                const isLowStock = product.stock <= (product.low_stock_threshold || 5) && product.stock > 0
                const isOutOfStock = product.stock === 0
                return (
                  <div key={product.id} className="flex items-center gap-3 p-4">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-secondary/50 border border-border shrink-0">
                      {imageUrl ? (
                        <Image src={imageUrl} alt={product.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-medium text-sm leading-snug line-clamp-2">{product.name}</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openEditModal(product)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/producto/${product.slug}`} target="_blank">
                                <Eye className="mr-2 h-4 w-4" /> Ver en tienda
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(product.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-semibold text-sm tabular-nums">{formatPrice(product.price)}</span>
                        <span className={`text-xs tabular-nums ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          Stock: {product.stock}
                        </span>
                        {product.is_active ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] px-1.5">Activo</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] px-1.5">Inactivo</Badge>
                        )}
                        {!!product.is_featured && (
                          <Badge variant="secondary" className="text-[10px] px-1.5">Destacado</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      {/* Create/Edit Modal with Tabs */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b border-border">
            <DialogTitle className="text-xl">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Modifica los detalles del producto' : 'Completa la informacion para crear un nuevo producto'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={formTab} onValueChange={setFormTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-3 w-full shrink-0">
              <TabsTrigger value="basic">Basico</TabsTrigger>
              <TabsTrigger value="pricing">Precio/Stock</TabsTrigger>
              <TabsTrigger value="media">Imagenes</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto py-4">
              <TabsContent value="basic" className="mt-0 space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del producto *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Gorra Snapback Classic"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descripcion</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe tu producto..."
                    rows={4}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(value) => setForm(prev => ({ ...prev, categoryId: value === 'none' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin categoria</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Visibility Options */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <Label className="text-sm font-medium">Visibilidad</Label>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <Label htmlFor="active" className="font-medium">Producto activo</Label>
                        <p className="text-xs text-muted-foreground">Visible en la tienda</p>
                      </div>
                      <Switch
                        id="active"
                        checked={form.isActive}
                        onCheckedChange={(checked) => setForm(prev => ({ ...prev, isActive: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <Label htmlFor="featured" className="font-medium">Destacado</Label>
                        <p className="text-xs text-muted-foreground">Aparece en secciones especiales</p>
                      </div>
                      <Switch
                        id="featured"
                        checked={form.isFeatured}
                        onCheckedChange={(checked) => setForm(prev => ({ ...prev, isFeatured: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                      <div>
                        <Label htmlFor="showInDescuentos" className="font-medium text-red-500">Mostrar en Descuentos</Label>
                        <p className="text-xs text-muted-foreground">Aparece en la seccion de ofertas</p>
                      </div>
                      <Switch
                        id="showInDescuentos"
                        checked={form.showInDescuentos}
                        onCheckedChange={(checked) => setForm(prev => ({ ...prev, showInDescuentos: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="mt-0 space-y-4">
                {/* Prices */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Precio de venta *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        id="price"
                        type="number"
                        value={form.price}
                        onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compareAtPrice">Precio anterior</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        id="compareAtPrice"
                        type="number"
                        value={form.compareAtPrice}
                        onChange={(e) => setForm(prev => ({ ...prev, compareAtPrice: e.target.value }))}
                        placeholder="0"
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Para mostrar descuento</p>
                  </div>
                </div>

                {/* SKU */}
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU (Codigo de producto)</Label>
                  <Input
                    id="sku"
                    value={form.sku}
                    onChange={(e) => setForm(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Ej: RH-CAP-001"
                  />
                </div>

                {/* Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock disponible</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={form.stock}
                      onChange={(e) => setForm(prev => ({ ...prev, stock: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lowStockThreshold">Alerta de stock bajo</Label>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      value={form.lowStockThreshold}
                      onChange={(e) => setForm(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                      placeholder="5"
                    />
                    <p className="text-xs text-muted-foreground">Notificar cuando baje de este numero</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="media" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Imagenes del producto</Label>
                    <p className="text-xs text-muted-foreground mt-1">Agrega hasta 5 imagenes (URLs)</p>
                  </div>
                  <Badge variant="outline">{form.images.length}/5</Badge>
                </div>
                
                {form.images.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {form.images.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary/50 group">
                        <Image src={img || "/placeholder.svg"} alt="" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <X className="h-5 w-5 text-white" />
                        </button>
                        {index === 0 && (
                          <Badge className="absolute bottom-1 left-1 text-[9px] px-1 bg-foreground/80">Principal</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {form.images.length < 5 && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                          placeholder="https://ejemplo.com/imagen.jpg"
                          className="pl-9"
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl() } }}
                        />
                      </div>
                      <Button type="button" onClick={addImageUrl} variant="secondary">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pega la URL de la imagen y presiona Enter o el boton +
                    </p>
                  </div>
                )}

                {form.images.length === 0 && (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">No hay imagenes agregadas</p>
                    <p className="text-xs text-muted-foreground mt-1">Agrega URLs de imagenes arriba</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-border shrink-0">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingProduct ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
            <AlertDialogDescription>
              Este producto se eliminara permanentemente. El historial de pedidos se mantendra. Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
