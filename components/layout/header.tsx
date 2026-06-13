'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Menu, X, ShoppingBag, CreditCard, Truck, Instagram, User, HelpCircle, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useCart } from '@/lib/cart-context'

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  )
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showBanner, setShowBanner] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const { itemCount } = useCart()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Verificar si el usuario esta logueado
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session')
        const data = await res.json()
        setIsLoggedIn(data.authenticated)
        if (data.customer) {
          setCustomerName(data.customer.firstName)
        }
      } catch {
        setIsLoggedIn(false)
      }
    }
    checkSession()
  }, [])

  useEffect(() => {
    const bannerDismissed = localStorage.getItem('banner_dismissed')
    if (bannerDismissed) {
      setShowBanner(false)
    }
  }, [])

  const dismissBanner = () => {
    setShowBanner(false)
    localStorage.setItem('banner_dismissed', 'true')
  }

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-background/95 backdrop-blur-md' : 'bg-background'
      }`}
    >
      {/* Announcement bar - dismissable */}
      {showBanner && (
        <div className="bg-foreground text-background py-2.5 relative">
          <div className="text-center pr-8">
            <p className="text-xs font-medium tracking-wide">
              PAGO CONTRAENTREGA DISPONIBLE EN TODO COLOMBIA
            </p>
          </div>
          <button
            onClick={dismissBanner}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-background/10 rounded transition-colors"
            aria-label="Cerrar banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <nav className="border-b border-border/40">
        <div className="flex items-center justify-between h-16 px-4 lg:px-8 max-w-7xl mx-auto">
          {/* Left - Nav links (desktop) */}
          <div className="hidden lg:flex items-center gap-6 w-1/3">
            <Link 
              href="/tienda" 
              className="text-sm font-medium tracking-wide hover:opacity-60 transition-opacity"
            >
              GORRAS
            </Link>
            <Link 
              href="/descuentos" 
              className="text-sm font-medium tracking-wide hover:opacity-60 transition-opacity text-red-600"
            >
              DESCUENTOS
            </Link>
            <Link
              href="/contacto" 
              className="text-sm font-medium tracking-wide hover:opacity-60 transition-opacity"
            >
              CONTACTO
            </Link>
          </div>

          {/* Mobile menu trigger */}
          <div className="lg:hidden w-1/3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 -ml-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-sm bg-background border-border p-0">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-5 border-b border-border">
                    <span className="text-lg font-black tracking-[0.2em]">RAVENHATS</span>
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 p-5">
                    <nav className="space-y-6">
                      <Link
                        href="/tienda"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-2xl font-bold tracking-wide"
                      >
                        GORRAS
                      </Link>
                      <Link
                        href="/descuentos"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-2xl font-bold tracking-wide text-red-600"
                      >
                        DESCUENTOS
                      </Link>
                      
                      <div className="pt-4 border-t border-border">
                        <Link
                          href="/mi-cuenta"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 text-lg py-2"
                        >
                          <div className="relative">
                            <User className="h-5 w-5" />
                            {isLoggedIn && (
                              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500" />
                            )}
                          </div>
                          {isLoggedIn ? `Hola, ${customerName}` : 'Mi cuenta'}
                        </Link>
                        <Link
                          href="/contacto"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 text-lg text-muted-foreground py-2"
                        >
                          <MessageCircle className="h-5 w-5" />
                          Contacto
                        </Link>
                      </div>
                    </nav>
                  </div>

                  <div className="p-5 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-4">Siguenos</p>
                    <div className="flex gap-3">
                      <a
                        href="https://instagram.com/ravenhats.store"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                        aria-label="Instagram"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                      <a
                        href="https://tiktok.com/@ravenhats.co"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                        aria-label="TikTok"
                      >
                        <TikTokIcon className="h-5 w-5" />
                      </a>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Center - Logo */}
          <Link href="/" className="flex items-center justify-center gap-2 w-1/3">
            <div className="relative w-9 h-9 flex-shrink-0">
              <Image 
                src="/logo.jpg" 
                alt="RavenHats" 
                fill
                sizes="36px"
                className="rounded-full object-cover"
                priority
                unoptimized
              />
            </div>
            <span className="text-lg lg:text-xl font-black tracking-[0.12em] hidden sm:block">
              RAVENHATS
            </span>
          </Link>

          {/* Right - Account & Cart */}
          <div className="flex items-center justify-end gap-1 w-1/3">
            <Link href="/mi-cuenta">
              <Button variant="ghost" size="icon" className="relative h-10 w-10">
                <User className="h-5 w-5" />
                {isLoggedIn && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                )}
                <span className="sr-only">{isLoggedIn ? `Hola ${customerName}` : 'Mi cuenta'}</span>
              </Button>
            </Link>
            <Link href="/carrito">
              <Button variant="ghost" size="icon" className="relative h-10 w-10">
                <ShoppingBag className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-foreground text-background text-[10px] flex items-center justify-center font-bold">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
                <span className="sr-only">Carrito ({itemCount} items)</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}
