'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { HeroSection } from '@/components/home/hero-section'
import { Button } from '@/components/ui/button'
import type { Product } from '@/lib/types'
import { formatPrice } from '@/lib/data'
import { useCart } from '@/lib/cart-context'
import { Loader2, ArrowRight, Truck, Shield, CreditCard, ShoppingBag } from 'lucide-react'

function HomeProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const hasDiscount = !!(product.compareAtPrice && product.compareAtPrice > product.price)
  const pct = hasDiscount ? Math.round((1 - product.price / product.compareAtPrice!) * 100) : 0
  const isOut = product.stock === 0

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] bg-[#111] overflow-hidden rounded-xl">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className={`object-cover transition-transform duration-500 group-hover:scale-[1.05] ${isOut ? 'opacity-40 grayscale' : ''}`}
            sizes="(max-width: 640px) 50vw, 25vw"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-neutral-700" />
          </div>
        )}

        {hasDiscount && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="bg-red-500 text-white text-[11px] font-black px-2.5 py-1 rounded-full">
              -{pct}%
            </span>
          </div>
        )}
        {product.featured && !hasDiscount && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="bg-white/90 text-black text-[10px] font-black px-2.5 py-1 rounded-full tracking-wider">
              TOP
            </span>
          </div>
        )}
        {isOut && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="bg-black/80 text-white text-[11px] font-bold tracking-[0.15em] px-3 py-1 rounded-full border border-white/10">
              AGOTADO
            </span>
          </div>
        )}

        {!isOut && (
          <div className="absolute inset-x-3 bottom-3 translate-y-[110%] group-hover:translate-y-0 transition-transform duration-300 ease-out z-10">
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); addItem(product, 1) }}
              className="w-full bg-white text-black text-[12px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-100 active:scale-[0.98] transition-all shadow-lg"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Agregar
            </button>
          </div>
        )}
      </div>

      <div className="mt-3">
        {product.collection && (
          <p className="text-[10px] text-neutral-600 uppercase tracking-[0.15em] mb-0.5 truncate">
            {product.collection}
          </p>
        )}
        <h3 className="text-[13px] font-medium text-neutral-300 line-clamp-1 group-hover:text-white transition-colors">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 mt-1 flex-wrap">
          <span className="text-[14px] font-bold text-white">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-[11px] text-neutral-600 line-through">{formatPrice(product.compareAtPrice!)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

function SectionGrid({ title, subtitle, products, viewAllLink, accentColor }: {
  title: string
  subtitle: string
  products: Product[]
  viewAllLink: string
  accentColor?: string
}) {
  return (
    <section className="py-14 lg:py-20 border-t border-[#161616]">
      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase mb-1.5 font-medium" style={{ color: accentColor ?? '#737373' }}>
              {subtitle}
            </p>
            <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tighter">{title}</h2>
          </div>
          <Link
            href={viewAllLink}
            className="flex items-center gap-1.5 text-neutral-500 hover:text-white text-[12px] tracking-widest transition-colors"
          >
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {products.map(p => (
            <HomeProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Marquee() {
  const text = '100% ORIGINALES · GOORIN BROS 1895 · ENVÍOS A COLOMBIA · CONTRAENTREGA DISPONIBLE · GORRAS PREMIUM · AUTENTICIDAD GARANTIZADA · '
  return (
    <div className="overflow-hidden border-y border-[#1a1a1a] bg-[#080808] py-3 select-none">
      <div className="flex whitespace-nowrap animate-marquee">
        {[...Array(4)].map((_, i) => (
          <span key={i} className="text-[11px] text-neutral-600 tracking-[0.2em] uppercase pr-0 shrink-0">
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products')
        if (!res.ok) throw new Error('Error al conectar con la base de datos')
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setProducts(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error de conexion')
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const bestSellers = products.filter(p => p.featured).slice(0, 4)
  const shownIds = new Set(bestSellers.map(p => p.id))

  const newArrivals = [...products]
    .reverse()
    .filter(p => !shownIds.has(p.id))
    .slice(0, 4)
  newArrivals.forEach(p => shownIds.add(p.id))

  const discountProducts = products
    .filter(p => p.compareAtPrice && p.compareAtPrice > p.price && !shownIds.has(p.id))
    .slice(0, 4)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0a0a0a]">
        <HeroSection />

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-700" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 px-4">
            <p className="text-neutral-600 text-center text-sm">{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 px-4">
            <p className="text-neutral-600 text-center">No hay productos disponibles</p>
          </div>
        ) : (
          <>
            {/* SECCION 1: BEST SELLERS */}
            {bestSellers.length > 0 && (
              <SectionGrid
                title="LO MÁS VENDIDO"
                subtitle="Favoritos"
                products={bestSellers}
                viewAllLink="/tienda"
              />
            )}

            {/* BANNER 1 */}
            <section className="relative h-[55vh] min-h-[420px] overflow-hidden">
              <Image
                src="/gorin.jpg"
                alt="RavenHats Lifestyle"
                fill
                className="object-cover"
                sizes="100vw"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
                  <div className="max-w-md">
                    <p className="text-white/50 text-[11px] tracking-[0.3em] uppercase mb-4">
                      Estilo urbano
                    </p>
                    <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter mb-4 leading-none">
                      SÉ<br />DIFERENTE
                    </h2>
                    <p className="text-white/60 text-sm mb-8 leading-relaxed">
                      Cada gorra cuenta una historia. Encuentra la tuya.
                    </p>
                    <Link href="/tienda">
                      <Button className="bg-white text-black hover:bg-white/90 rounded-none px-8 h-12 text-xs font-bold tracking-widest">
                        EXPLORAR
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* MARQUEE TICKER */}
            <Marquee />

            {/* SECCION 2: RECIÉN LLEGADOS */}
            {newArrivals.length > 0 && (
              <SectionGrid
                title="RECIÉN LLEGADOS"
                subtitle="Nuevos"
                products={newArrivals}
                viewAllLink="/tienda"
              />
            )}

            {/* BANNER 2 */}
            <section className="relative h-[55vh] min-h-[420px] overflow-hidden">
              <Image
                src="/goorin.jpg"
                alt="RavenHats Premium Collection"
                fill
                className="object-cover"
                sizes="100vw"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/65" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="max-w-4xl mx-auto px-6 text-center">
                  <p className="text-white/40 text-[11px] tracking-[0.3em] uppercase mb-6">
                    Colección premium
                  </p>
                  <h2 className="text-4xl lg:text-6xl font-black tracking-tighter mb-6 leading-none text-white">
                    GORRAS QUE<br />HABLAN POR TI
                  </h2>
                  <p className="text-white/60 text-sm max-w-lg mx-auto mb-10 leading-relaxed">
                    +{products.length} diseños originales Goorin Bros. Encuentra tu estilo, define tu identidad.
                  </p>
                  <Link href="/tienda">
                    <Button size="lg" className="bg-white text-black hover:bg-white/90 rounded-none px-12 h-14 text-xs font-bold tracking-widest">
                      VER COLECCIÓN
                      <ArrowRight className="ml-3 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </section>

            {/* SECCION 3: DESCUENTOS */}
            {discountProducts.length > 0 && (
              <SectionGrid
                title="DESCUENTOS"
                subtitle="Ofertas especiales"
                products={discountProducts}
                viewAllLink="/descuentos"
                accentColor="rgb(239 68 68)"
              />
            )}

            {/* CTA FINAL */}
            <section className="py-24 lg:py-32 text-center border-t border-[#161616]">
              <div className="max-w-xl mx-auto px-6">
                <p className="text-neutral-700 text-[11px] tracking-[0.3em] uppercase mb-4">
                  Catálogo completo
                </p>
                <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-white mb-6">
                  +{products.length} GORRAS
                </h2>
                <p className="text-neutral-500 text-sm mb-10 leading-relaxed">
                  Explora todas nuestras gorras originales Goorin Bros
                </p>
                <Link href="/tienda">
                  <Button size="lg" className="bg-white text-black hover:bg-white/90 rounded-none px-12 h-14 text-xs font-bold tracking-widest">
                    VER CATÁLOGO
                    <ArrowRight className="ml-3 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </section>
          </>
        )}

        {/* TRUST BAR */}
        <section className="py-14 border-t border-[#161616]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-3 gap-8 lg:gap-12">
              {[
                { icon: Shield, label: '100% Originales' },
                { icon: Truck, label: 'Envío Nacional' },
                { icon: CreditCard, label: 'Pago Seguro' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="text-center">
                    <Icon className="h-5 w-5 mx-auto mb-3 text-neutral-600" />
                    <p className="text-[11px] tracking-widest text-neutral-600">
                      {item.label.toUpperCase()}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* SOCIAL CTA */}
        <section className="py-20 lg:py-28 bg-white text-black">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <p className="text-black/40 text-[11px] tracking-[0.3em] uppercase mb-6">
              Síguenos
            </p>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tighter mb-8">
              @ravenhats.store
            </h2>
            <div className="flex items-center justify-center gap-8">
              <a
                href="https://instagram.com/ravenhats.store"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black/50 text-[11px] tracking-widest hover:text-black transition-colors"
              >
                INSTAGRAM
              </a>
              <span className="text-black/20">|</span>
              <a
                href="https://tiktok.com/@ravenhats.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black/50 text-[11px] tracking-widest hover:text-black transition-colors"
              >
                TIKTOK
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
