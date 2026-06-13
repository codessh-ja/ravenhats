import { Metadata } from 'next'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Términos y Condiciones | RavenHats',
  description: 'Términos y condiciones de compra en RavenHats.',
}

const sections = [
  {
    title: 'Productos',
    content: 'Los precios están en pesos colombianos (COP) e incluyen IVA. Pueden cambiar sin aviso previo. Las fotos son de referencia.',
  },
  {
    title: 'Pedidos',
    content: 'Al comprar confirmas que tus datos son correctos. Podemos cancelar pedidos con datos falsos o sospecha de fraude.',
  },
  {
    title: 'Pagos',
    content: 'Aceptamos tarjetas, PSE, Nequi y contraentrega. Los pagos en línea los procesa Wompi. No guardamos datos de tarjetas.',
  },
  {
    title: 'Envíos',
    content: 'Enviamos a toda Colombia con InterRapidísimo. Los tiempos son estimados y pueden variar según la ciudad.',
  },
  {
    title: 'Cambios',
    content: 'Tienes 5 días desde que recibes para pedir cambio. El producto debe estar sin usar, con etiquetas y empaque original.',
  },
  {
    title: 'Garantía',
    content: 'Si llega con defecto de fábrica, repórtalo en 48 horas y lo cambiamos sin costo adicional.',
  },
]

export default function TermsPage() {
  return (
    <div className="space-y-10">

      {/* Header */}
      <div>
        <p className="text-neutral-600 text-[11px] tracking-[0.3em] uppercase mb-3">Legal</p>
        <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-white mb-2">
          TÉRMINOS Y CONDICIONES
        </h1>
        <p className="text-neutral-600 text-[12px]">Actualizado: Enero 2026 · Al comprar aceptas estos términos.</p>
      </div>

      {/* Intro */}
      <p className="text-neutral-400 text-sm leading-relaxed border-l-2 border-[#2a2a2a] pl-4">
        RavenHats es una tienda en línea de gorras Goorin Bros 100% originales en Colombia. Enviamos a todo el país con InterRapidísimo.
      </p>

      {/* Sections */}
      <div className="space-y-px">
        {sections.map((s, i) => (
          <div key={s.title} className="group border border-[#1a1a1a] bg-[#0f0f0f] rounded-xl p-5 hover:border-[#2a2a2a] transition-colors">
            <div className="flex gap-4">
              <span className="text-neutral-700 text-[11px] font-mono mt-0.5 flex-shrink-0 w-5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 className="text-white text-[13px] font-bold mb-1.5">{s.title}</h2>
                <p className="text-neutral-500 text-[12px] leading-relaxed">{s.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-2">
        <Link href="/legal/privacidad" className="text-[11px] px-3 py-1.5 rounded-full border border-[#1a1a1a] text-neutral-500 hover:text-white hover:border-[#2a2a2a] transition-colors">
          Privacidad
        </Link>
      </div>

      {/* WhatsApp CTA */}
      <a
        href="https://wa.me/13412133624?text=Hola,%20tengo%20una%20pregunta"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-between bg-[#0f0f0f] border border-[#1a1a1a] hover:border-[#25d366]/30 rounded-2xl p-5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#25d366]/10 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-4 w-4 text-[#25d366]" />
          </div>
          <div>
            <p className="text-white text-[13px] font-medium">¿Dudas sobre los términos?</p>
            <p className="text-neutral-600 text-[11px]">Escríbenos por WhatsApp</p>
          </div>
        </div>
        <span className="text-[#25d366] text-[12px] font-semibold">Escribir →</span>
      </a>
    </div>
  )
}
