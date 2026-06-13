import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { MessageCircle, Instagram, Clock, ArrowUpRight, MapPin } from 'lucide-react'
import { BUSINESS } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Contacto | RavenHats',
  description: 'Contacta con RavenHats por WhatsApp o Instagram. Respondemos rápido.',
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
}

const waHref = `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent('Hola! Tengo una consulta sobre una gorra.')}`

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0a0a0a] pt-[100px]">

        {/* Strip header */}
        <div className="px-5 lg:px-10 py-10 border-b border-[#161616]">
          <div className="max-w-7xl mx-auto">
            <p className="text-neutral-600 text-[11px] tracking-[0.3em] uppercase mb-2">Estamos aquí</p>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white leading-none">CONTACTO</h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-5 lg:px-10 py-12">

          <div className="grid lg:grid-cols-2 gap-4">

            {/* WhatsApp — hero channel */}
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative bg-[#0f0f0f] border border-[#1c1c1c] hover:border-[#25d366]/40 rounded-2xl p-8 lg:p-10 flex flex-col justify-between gap-8 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#25d366]/[0.03] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-[#25d366]/10 flex items-center justify-center mb-6">
                  <MessageCircle className="w-6 h-6 text-[#25d366]" />
                </div>
                <p className="text-neutral-500 text-[11px] tracking-[0.2em] uppercase mb-2">Canal principal</p>
                <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tighter mb-3">WhatsApp</h2>
                <p className="text-neutral-400 text-sm leading-relaxed max-w-xs">
                  Respuesta inmediata. Consulta precios, tallas, disponibilidad o el estado de tu pedido.
                </p>
              </div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-[#25d366] text-sm font-semibold">Escribir ahora</p>
                  <p className="text-neutral-600 text-[11px] mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Lun–Sáb 9am–7pm
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full border border-[#1c1c1c] group-hover:border-[#25d366]/40 flex items-center justify-center transition-colors">
                  <ArrowUpRight className="w-4 h-4 text-neutral-600 group-hover:text-[#25d366] transition-colors" />
                </div>
              </div>
            </a>

            {/* Instagram + TikTok stacked */}
            <div className="flex flex-col gap-4">

              {/* Instagram */}
              <a
                href={BUSINESS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-[#0f0f0f] border border-[#1c1c1c] hover:border-[#2a2a2a] rounded-2xl p-6 flex items-center justify-between gap-4 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Instagram className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-white text-[13px] font-semibold">Instagram</p>
                    <p className="text-neutral-500 text-[12px] mt-0.5">@ravenhats.store</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-600 text-[11px] hidden sm:block">DMs abiertos</span>
                  <ArrowUpRight className="w-4 h-4 text-neutral-700 group-hover:text-neutral-400 transition-colors flex-shrink-0" />
                </div>
              </a>

              {/* TikTok */}
              <a
                href={BUSINESS.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-[#0f0f0f] border border-[#1c1c1c] hover:border-[#2a2a2a] rounded-2xl p-6 flex items-center justify-between gap-4 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                    <TikTokIcon className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-white text-[13px] font-semibold">TikTok</p>
                    <p className="text-neutral-500 text-[12px] mt-0.5">@ravenhats.co</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-600 text-[11px] hidden sm:block">Síguenos</span>
                  <ArrowUpRight className="w-4 h-4 text-neutral-700 group-hover:text-neutral-400 transition-colors flex-shrink-0" />
                </div>
              </a>

              {/* Info bar */}
              <div className="bg-[#0f0f0f] border border-[#1c1c1c] rounded-2xl px-6 py-5">
                <div className="flex flex-col gap-3 text-[12px] text-neutral-500">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-neutral-700 flex-shrink-0" />
                    Colombia — envíos a todo el país
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-neutral-700 flex-shrink-0" />
                    Atención Lun–Sáb · 9am a 7pm
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#25d366] animate-pulse flex-shrink-0" />
                    Disponibles ahora por WhatsApp
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom links */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-neutral-700 text-[12px]">¿Buscas algo específico?</p>
            <div className="flex items-center gap-6">
              <Link href="/tienda" className="text-neutral-500 hover:text-white text-[12px] tracking-widest transition-colors">
                VER CATÁLOGO
              </Link>
              <Link href="/mi-cuenta" className="text-neutral-500 hover:text-white text-[12px] tracking-widest transition-colors">
                MIS PEDIDOS
              </Link>
              <Link href="/carrito" className="text-neutral-500 hover:text-white text-[12px] tracking-widest transition-colors">
                CARRITO
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
