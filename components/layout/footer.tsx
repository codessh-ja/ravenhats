'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Instagram } from 'lucide-react'

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

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand & Social */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="relative w-8 h-8 flex-shrink-0">
                <Image 
                  src="/logo.jpg" 
                  alt="RavenHats" 
                  fill
                  sizes="32px"
                  className="rounded-full object-cover"
                  unoptimized
                />
              </div>
              <span className="text-lg font-black tracking-[0.12em]">RAVENHATS</span>
            </Link>
            <p className="mt-3 text-sm text-background/60 leading-relaxed">
              Gorras originales Goorin Bros en Colombia. Envios a todo el pais.
            </p>
            
            {/* Social Icons */}
            <div className="flex gap-3 mt-4">
              <a
                href="https://instagram.com/ravenhats.store"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://tiktok.com/@ravenhats.co"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
                aria-label="TikTok"
              >
                <TikTokIcon className="h-4 w-4" />
              </a>
            </div>

            {/* WhatsApp */}
            <a 
              href="https://wa.me/13412133624" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block mt-4 text-sm text-background/60 hover:text-background transition-colors"
            >
              +1 341 213 3624
            </a>
          </div>

          {/* Tienda */}
          <div>
            <h3 className="font-semibold text-sm tracking-wide mb-4">TIENDA</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/tienda" className="text-sm text-background/60 hover:text-background transition-colors">
                  Todas las gorras
                </Link>
              </li>
              <li>
                <Link href="/descuentos" className="text-sm text-red-400 hover:text-red-300 transition-colors">
                  Descuentos
                </Link>
              </li>
            </ul>
          </div>

          {/* Ayuda */}
          <div>
            <h3 className="font-semibold text-sm tracking-wide mb-4">AYUDA</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/contacto" className="text-sm text-background/60 hover:text-background transition-colors">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-background/60 hover:text-background transition-colors">
                  Preguntas frecuentes
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-sm tracking-wide mb-4">LEGAL</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/legal/terminos" className="text-sm text-background/60 hover:text-background transition-colors">
                  Terminos y condiciones
                </Link>
              </li>
              <li>
                <Link href="/legal/privacidad" className="text-sm text-background/60 hover:text-background transition-colors">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="text-sm text-background/40 hover:text-background/60 transition-colors">
                  Admin
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment & Copyright */}
        <div className="mt-10 pt-8 border-t border-background/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-background/50">
              © 2026 RavenHats. Todos los derechos reservados.
            </p>
            
            {/* Payment Badge */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-background/50">Pagos seguros con</span>
              <div className="flex items-center gap-1.5 bg-background/10 px-3 py-1.5 rounded">
                <svg className="h-4 w-4 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="text-sm font-bold tracking-wide">WOMPI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
