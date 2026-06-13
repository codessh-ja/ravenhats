'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { formatPrice } from '@/lib/data'
import type { Product } from '@/lib/types'
import { Loader2, Search, X, ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/cart-context'

type SortOption = 'newest' | 'price-low' | 'price-high' | 'name'

export default function TiendaPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [selectedCollection, setSelectedCollection] = useState<string>('all')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { addItem } = useCart()

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products')
        if (!res.ok) throw new Error('Error al conectar')
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setProducts(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error de conexión')
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const collections = useMemo(() => {
    const unique = [...new Set(products.map(p => p.collection).filter(Boolean))]
    return unique.sort()
  }, [products])

  const filteredProducts = useMemo(() => {
    let result = [...products]

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.collection?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      )
    }

    if (selectedCollection !== 'all') {
      result = result.filter(p => p.collection === selectedCollection)
    }

    switch (sortBy) {
      case 'price-low':  result.sort((a, b) => a.price - b.price); break
      case 'price-high': result.sort((a, b) => b.price - a.price); break
      case 'name':       result.sort((a, b) => a.name.localeCompare(b.name)); break
      default:           result.reverse(); break
    }

    return result
  }, [products, debouncedSearch, selectedCollection, sortBy])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 280)
  }

  const clearAll = () => {
    setSearchQuery('')
    setDebouncedSearch('')
    setSelectedCollection('all')
  }
  const hasActive = !!(searchQuery || selectedCollection !== 'all')

  return (
    <>
      <Header />
      <main className="min-h-screen pt-[100px] bg-[#0a0a0a]">

        {/* ── Top bar ──────────────────────────────────────────────── */}
        <div className="px-4 py-10 border-b border-[#161616]">
          <div className="max-w-7xl mx-auto">

            {/* Title + Search */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-7">
              <div>
                <p className="text-neutral-600 text-[11px] tracking-[0.3em] uppercase mb-2">
                  Catálogo completo
                </p>
                <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white leading-none">
                  GORRAS
                </h1>
              </div>

              {/* Search */}
              <div className="relative lg:w-[340px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, color, estilo..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] rounded-full pl-11 pr-10 py-3 text-[13px] text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter pills + sort */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedCollection('all')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                  selectedCollection === 'all'
                    ? 'bg-white text-black'
                    : 'border border-[#252525] text-neutral-500 hover:border-neutral-500 hover:text-white'
                }`}
              >
                Todas
              </button>

              {collections.map(col => (
                <button
                  key={col}
                  onClick={() => setSelectedCollection(selectedCollection === col ? 'all' : col)}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                    selectedCollection === col
                      ? 'bg-white text-black'
                      : 'border border-[#252525] text-neutral-500 hover:border-neutral-500 hover:text-white'
                  }`}
                >
                  {col}
                </button>
              ))}

              <div className="hidden lg:block w-px h-4 bg-[#252525] mx-1" />

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="bg-transparent border border-[#252525] text-neutral-500 text-[12px] px-3 py-1.5 rounded-full focus:outline-none hover:border-neutral-500 hover:text-white cursor-pointer transition-colors"
              >
                <option value="newest"     className="bg-[#111] text-white">Más recientes</option>
                <option value="price-low"  className="bg-[#111] text-white">Menor precio</option>
                <option value="price-high" className="bg-[#111] text-white">Mayor precio</option>
                <option value="name"       className="bg-[#111] text-white">Nombre A-Z</option>
              </select>

              <div className="ml-auto flex items-center gap-4">
                {!loading && (
                  <span className="text-neutral-600 text-[12px]">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'gorra' : 'gorras'}
                  </span>
                )}
                {hasActive && (
                  <button
                    onClick={clearAll}
                    className="flex items-center gap-1 text-[12px] text-neutral-500 hover:text-white transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Grid ────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
          {loading ? (
            <div className="flex items-center justify-center py-40">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-700" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-40 gap-3">
              <p className="text-neutral-500 text-sm">{error}</p>
              <button onClick={() => window.location.reload()} className="text-white text-[12px] underline underline-offset-4">
                Reintentar
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 gap-3">
              <Search className="h-10 w-10 text-neutral-800" />
              <p className="text-white font-medium text-sm">Sin resultados</p>
              <p className="text-neutral-600 text-[13px] text-center">
                {debouncedSearch
                  ? `Nada coincide con "${debouncedSearch}"`
                  : 'No hay productos con estos filtros'}
              </p>
              <button
                onClick={clearAll}
                className="mt-2 px-6 py-2.5 bg-white text-black text-[12px] font-bold rounded-full hover:bg-neutral-100 transition-colors"
              >
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={() => addItem(product, 1)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

// ── Product card ────────────────────────────────────────────────────────────
function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product
  onAddToCart: () => void
}) {
  const hasDiscount = !!(product.compareAtPrice && product.compareAtPrice > product.price)
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
    : 0
  const isLowStock = product.stock > 0 && product.stock <= 3
  const isOut = product.stock === 0

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      {/* Image container */}
      <div className="relative aspect-[3/4] bg-[#0f0f0f] overflow-hidden rounded-2xl">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className={`object-cover transition-all duration-500 group-hover:scale-[1.04] ${isOut ? 'opacity-40 grayscale' : ''}`}
            sizes="(max-width: 640px) 50vw, 25vw"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-neutral-800" />
          </div>
        )}

        {/* Top-left badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {hasDiscount && (
            <span className="bg-white text-black text-[10px] font-black px-2.5 py-0.5 rounded-full leading-5">
              -{discountPct}%
            </span>
          )}
          {isLowStock && (
            <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-0.5 rounded-full border border-white/10 leading-5">
              Solo {product.stock}
            </span>
          )}
          {product.featured && !hasDiscount && (
            <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-0.5 rounded-full border border-white/10 leading-5">
              Top
            </span>
          )}
        </div>

        {/* Out of stock */}
        {isOut && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="bg-black/80 backdrop-blur-sm text-white text-[11px] font-bold tracking-[0.15em] px-4 py-1.5 rounded-full border border-white/10">
              AGOTADO
            </span>
          </div>
        )}

        {/* Hover: add to cart button slides up */}
        {!isOut && (
          <div className="absolute inset-x-3 bottom-3 translate-y-[110%] group-hover:translate-y-0 transition-transform duration-300 ease-out z-10">
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onAddToCart() }}
              className="w-full bg-white text-black text-[12px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-100 active:scale-[0.98] transition-all shadow-lg"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Agregar al carrito
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-3 px-0.5">
        {product.collection && (
          <p className="text-[10px] text-neutral-600 uppercase tracking-[0.15em] mb-1 truncate">
            {product.collection}
          </p>
        )}
        <h3 className="text-[13px] font-medium text-neutral-200 leading-snug line-clamp-1 group-hover:text-white transition-colors">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-[14px] font-bold text-white">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-[11px] text-neutral-600 line-through">
              {formatPrice(product.compareAtPrice!)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
