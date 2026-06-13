'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Filter, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

interface Collection {
  name: string
  slug: string
  description?: string
  productCount?: number
}

interface StoreFiltersProps {
  collections: Collection[]
}

const sortOptions = [
  { label: 'Relevancia', value: 'default' },
  { label: 'Mas recientes', value: 'newest' },
  { label: 'Mas vendidos', value: 'bestseller' },
  { label: 'Precio: menor a mayor', value: 'price-asc' },
  { label: 'Precio: mayor a menor', value: 'price-desc' },
]

const priceRanges = [
  { label: 'Menos de $100.000', value: '0-100000' },
  { label: '$100.000 - $150.000', value: '100000-150000' },
  { label: '$150.000 - $200.000', value: '150000-200000' },
  { label: 'Mas de $200.000', value: '200000-999999' },
]

function StoreFiltersContent({ collections }: StoreFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [openSections, setOpenSections] = useState<string[]>(['collections', 'sort'])

  const currentSort = searchParams.get('sort') || 'default'
  const currentCollection = searchParams.get('collection')
  const currentPrice = searchParams.get('price')
  const showSale = searchParams.get('filter') === 'sale'

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'default' && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/tienda?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/tienda')
  }

  const hasFilters = currentCollection || currentPrice || showSale || (currentSort && currentSort !== 'default')

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Active filters */}
      {hasFilters && (
        <div className="pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtros activos</span>
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground">
              Limpiar todo
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentCollection && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-xs">
                {collections.find(c => c.slug === currentCollection)?.name}
                <button onClick={() => updateFilter('collection', null)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {showSale && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent text-accent-foreground text-xs">
                En oferta
                <button onClick={() => updateFilter('filter', null)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sale filter */}
      <div className="pb-4 border-b border-border">
        <button
          onClick={() => updateFilter('filter', showSale ? null : 'sale')}
          className={`w-full text-left py-2 px-3 text-sm font-medium transition-colors ${
            showSale ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary'
          }`}
        >
          En oferta
        </button>
      </div>

      {/* Collections */}
      <div className="pb-4 border-b border-border">
        <button 
          onClick={() => toggleSection('collections')}
          className="flex items-center justify-between w-full py-2"
        >
          <span className="text-xs font-semibold uppercase tracking-wider">Colecciones</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes('collections') ? 'rotate-180' : ''}`} />
        </button>
        {openSections.includes('collections') && (
          <div className="mt-2 space-y-1">
            <button
              onClick={() => updateFilter('collection', null)}
              className={`w-full text-left py-2 px-3 text-sm transition-colors ${
                !currentCollection ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todas
            </button>
            {collections.map((collection) => (
              <button
                key={collection.slug}
                onClick={() => updateFilter('collection', collection.slug)}
                className={`w-full text-left py-2 px-3 text-sm transition-colors flex items-center justify-between ${
                  currentCollection === collection.slug ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{collection.name}</span>
                {collection.productCount && (
                  <span className="text-xs text-muted-foreground/50">{collection.productCount}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Price range */}
      <div className="pb-4 border-b border-border">
        <button 
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full py-2"
        >
          <span className="text-xs font-semibold uppercase tracking-wider">Precio</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes('price') ? 'rotate-180' : ''}`} />
        </button>
        {openSections.includes('price') && (
          <div className="mt-2 space-y-1">
            {priceRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => updateFilter('price', currentPrice === range.value ? null : range.value)}
                className={`w-full text-left py-2 px-3 text-sm transition-colors ${
                  currentPrice === range.value ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sort */}
      <div>
        <button 
          onClick={() => toggleSection('sort')}
          className="flex items-center justify-between w-full py-2"
        >
          <span className="text-xs font-semibold uppercase tracking-wider">Ordenar</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes('sort') ? 'rotate-180' : ''}`} />
        </button>
        {openSections.includes('sort') && (
          <div className="mt-2 space-y-1">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => updateFilter('sort', option.value)}
                className={`w-full text-left py-2 px-3 text-sm transition-colors ${
                  currentSort === option.value ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile filters */}
      <div className="lg:hidden mb-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full bg-transparent rounded-none h-12">
              <Filter className="h-4 w-4 mr-2" />
              Filtros y ordenar
              {hasFilters && (
                <span className="ml-2 h-5 w-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full max-w-sm">
            <SheetHeader>
              <SheetTitle className="text-left">Filtros</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop filters */}
      <div className="hidden lg:block sticky top-32">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-6">Filtrar por</h2>
        <FilterContent />
      </div>
    </>
  )
}

// CRITICAL: Wrap in Suspense to fix Next.js useSearchParams() error
export function StoreFilters({ collections }: StoreFiltersProps) {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-secondary/20 rounded" />}>
      <StoreFiltersContent collections={collections} />
    </Suspense>
  )
}
