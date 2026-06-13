import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Home, Search, ShoppingBag, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-[100px] bg-background flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center py-16">
          {/* 404 Visual */}
          <div className="relative mb-8">
            <div className="text-[150px] lg:text-[200px] font-black text-muted/20 leading-none select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-12 w-12 text-primary" />
              </div>
            </div>
          </div>
          
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-4">
            Pagina no encontrada
          </h1>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            Lo sentimos, la pagina que buscas no existe o ha sido movida. 
            Pero no te preocupes, tenemos muchas gorras increibles esperandote.
          </p>
          
          {/* Quick Links */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link href="/">
              <Button size="lg" className="w-full sm:w-auto">
                <Home className="h-4 w-4 mr-2" />
                Ir al inicio
              </Button>
            </Link>
            <Link href="/tienda">
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Ver tienda
              </Button>
            </Link>
          </div>

          {/* Helpful links */}
          <div className="border-t border-border pt-8">
            <p className="text-sm text-muted-foreground mb-4">
              Tambien puedes explorar:
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link href="/drops" className="text-primary hover:underline">
                Nuevos drops
              </Link>
              <Link href="/colecciones" className="text-primary hover:underline">
                Colecciones
              </Link>
              <Link href="/faq" className="text-primary hover:underline">
                Preguntas frecuentes
              </Link>
              <Link href="/legal/envios" className="text-primary hover:underline">
                Info de envios
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
