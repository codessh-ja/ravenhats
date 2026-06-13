import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ProductGallery } from '@/components/product/product-gallery'
import { ProductInfo } from '@/components/product/product-info'
import { ProductSlider } from '@/components/home/product-slider'
import { getProductBySlug, getProducts } from '@/lib/db'
import type { Product } from '@/lib/types'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

// Transformar producto de DB a formato frontend
function transformProduct(dbProduct: any): Product {
  return {
    id: String(dbProduct.id),
    name: dbProduct.name,
    slug: dbProduct.slug,
    price: Number(dbProduct.price),
    compareAtPrice: dbProduct.compare_at_price ? Number(dbProduct.compare_at_price) : undefined,
    description: dbProduct.description || '',
    images: dbProduct.images ? dbProduct.images.split(',') : [],
    category: dbProduct.category_name || '',
    collection: dbProduct.collection_name || '',
    stock: dbProduct.stock,
    featured: Boolean(dbProduct.is_featured),
    tags: [],
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  
  try {
    const dbProduct = await getProductBySlug(slug)
    
    if (!dbProduct) {
      return { title: 'Producto no encontrado' }
    }

    const product = transformProduct(dbProduct)

    return {
      title: `${product.name}`,
      description: product.description,
      openGraph: {
        title: `${product.name} | RavenHats`,
        description: product.description,
        images: product.images[0] ? [product.images[0]] : [],
      },
    }
  } catch {
    return { title: 'Producto no encontrado' }
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  
  let product: Product | null = null
  let relatedProducts: Product[] = []
  
  try {
    const dbProduct = await getProductBySlug(slug)
    
    if (!dbProduct) {
      notFound()
    }
    
    product = transformProduct(dbProduct)
    
    // Obtener productos relacionados de la misma coleccion
    const allProducts = await getProducts({ collectionId: dbProduct.collection_id || undefined })
    relatedProducts = allProducts
      .filter((p: any) => p.id !== dbProduct.id)
      .slice(0, 6)
      .map(transformProduct)
  } catch {
    notFound()
  }

  return (
    <>
      <Header />
      <main className="pt-[100px] min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="px-4 lg:px-8 py-4 max-w-7xl mx-auto">
          <nav className="flex text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Inicio</Link>
            <span className="mx-2">/</span>
            <Link href="/tienda" className="hover:text-foreground transition-colors">Gorras</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{product.name}</span>
          </nav>
        </div>

        {/* Product */}
        <section className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            <ProductGallery images={product.images} name={product.name} />
            <ProductInfo product={product} />
          </div>
        </section>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 border-t border-border pt-12">
            <ProductSlider 
              title="TAMBIEN TE PUEDE GUSTAR" 
              products={relatedProducts}
            />
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
