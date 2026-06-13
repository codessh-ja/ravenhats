'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ChevronDown, MessageCircle, Truck, CreditCard, Package, RotateCcw } from 'lucide-react'
import { BUSINESS, SHIPPING } from '@/lib/constants'
import { formatPrice } from '@/lib/data'

const waHref = `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent('Hola! Tengo una pregunta sobre RavenHats.')}`

interface FAQItem {
  q: string
  a: React.ReactNode
}

interface FAQCategory {
  icon: React.ElementType
  label: string
  items: FAQItem[]
}

const categories: FAQCategory[] = [
  {
    icon: Truck,
    label: 'Envíos y entregas',
    items: [
      {
        q: '¿A qué ciudades hacen envíos?',
        a: 'Enviamos a toda Colombia a través de Interrapidísimo. Desde las principales ciudades hasta municipios más pequeños — si hay cobertura de paquetería, llega tu gorra.',
      },
      {
        q: '¿Cuánto cuesta el envío?',
        a: (
          <span>
            Las tarifas dependen de tu ciudad:<br /><br />
            <strong className="text-neutral-300">Ciudades principales</strong> (Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga): {formatPrice(SHIPPING.zones.zone1.price)}<br />
            <strong className="text-neutral-300">Ciudades intermedias</strong> (Pereira, Manizales, Neiva, Villavicencio, etc.): {formatPrice(SHIPPING.zones.zone2.price)}<br />
            <strong className="text-neutral-300">Resto del país:</strong> {formatPrice(SHIPPING.zones.zone3.price)}<br />
            <strong className="text-green-400">Acacias, Meta: GRATIS</strong>
          </span>
        ),
      },
      {
        q: '¿Cuánto tarda en llegar mi pedido?',
        a: `El tiempo estimado de entrega es de ${SHIPPING.estimatedDays.min} a ${SHIPPING.estimatedDays.max} días hábiles desde que tu pago es confirmado. Las ciudades principales suelen estar en el rango más corto.`,
      },
      {
        q: '¿Puedo rastrear mi envío?',
        a: 'Sí. Cuando tu pedido salga de bodega te enviamos el número de guía de Interrapidísimo por correo. Con ese número puedes rastrear tu paquete directamente en el sitio de la transportadora.',
      },
      {
        q: '¿Qué pasa si no estoy cuando llegue el pedido?',
        a: 'Interrapidísimo intenta la entrega hasta 2 veces. Si no es posible, el paquete queda en la sede más cercana por unos días para que lo recojas. Te avisamos si hay algún inconveniente.',
      },
    ],
  },
  {
    icon: CreditCard,
    label: 'Pagos',
    items: [
      {
        q: '¿Qué métodos de pago aceptan?',
        a: 'Aceptamos pago online con Wompi (tarjeta de crédito/débito, PSE, Nequi, Bancolombia) y pago contra entrega en efectivo. La contraentrega es la opción más elegida.',
      },
      {
        q: '¿Qué es el pago contraentrega?',
        a: 'Con contraentrega pagas en efectivo directamente al mensajero cuando te entrega la gorra. No necesitas tarjeta ni cuenta bancaria — pagas solo cuando tienes el producto en tus manos.',
      },
      {
        q: '¿Es seguro pagar online?',
        a: 'Sí. Los pagos se procesan a través de Wompi, plataforma de pagos de Bancolombia. Nosotros nunca vemos ni almacenamos tus datos bancarios — todo ocurre en el entorno cifrado de Wompi.',
      },
      {
        q: '¿Cuándo se descuenta el dinero?',
        a: 'El cobro se realiza en el momento en que completas el pago online. Con contraentrega no se te cobra nada hasta recibir el paquete.',
      },
    ],
  },
  {
    icon: Package,
    label: 'Productos',
    items: [
      {
        q: '¿Las gorras son 100% originales?',
        a: 'Absolutamente. Todas son Goorin Bros originales con etiquetas, parches bordados de alta calidad y empaque oficial. Si tienes alguna duda sobre la autenticidad, escríbenos y te lo demostramos.',
      },
      {
        q: '¿Qué talla tienen?',
        a: 'Las gorras Goorin Bros son talla única con cierre Snapback ajustable en la parte trasera. Se adaptan a la mayoría de cabezas de adultos y jóvenes.',
      },
      {
        q: '¿De qué material están hechas?',
        a: 'La mayoría son una mezcla de algodón, poliéster y malla (el panel trasero de ventilación es el estilo trucker característico de Goorin Bros). Las especificaciones exactas están en la página de cada producto.',
      },
      {
        q: '¿Puedo ver más fotos antes de comprar?',
        a: 'Las fotos del catálogo son de los productos reales. Si quieres ver más ángulos de algún diseño específico, escríbenos por WhatsApp y te enviamos más fotos al instante.',
      },
    ],
  },
  {
    icon: RotateCcw,
    label: 'Cambios y devoluciones',
    items: [
      {
        q: '¿Puedo cambiar mi gorra?',
        a: 'Sí. Tienes 10 días hábiles desde que recibes el pedido para solicitar un cambio, siempre que la gorra esté sin usar, con etiquetas y en su empaque original. Contáctanos por WhatsApp para coordinar.',
      },
      {
        q: '¿Qué hago si llega dañada?',
        a: 'Si el producto llega con defecto de fábrica o daño de transporte, escríbenos de inmediato por WhatsApp con fotos del daño. Lo resolvemos sin costo adicional para ti.',
      },
      {
        q: '¿Cuánto tarda el proceso de cambio?',
        a: 'Una vez coordinamos el cambio y recibimos la gorra original, procesamos y enviamos el nuevo producto en 1-3 días hábiles. El tiempo de envío aplica igual que un pedido normal.',
      },
    ],
  },
]

function FAQAccordionItem({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-[#1a1a1a] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="text-[14px] font-medium text-neutral-200 group-hover:text-white transition-colors leading-snug pr-4">
          {item.q}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-neutral-600 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="pb-5 text-[13px] text-neutral-400 leading-relaxed pr-8">
          {item.a}
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0a0a0a] pt-[100px]">

        <div className="px-5 lg:px-10 py-10 border-b border-[#161616]">
          <div className="max-w-4xl mx-auto">
            <p className="text-neutral-600 text-[11px] tracking-[0.3em] uppercase mb-2">Ayuda</p>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white leading-none">
              PREGUNTAS FRECUENTES
            </h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-5 lg:px-10 py-12">
          <div className="space-y-4">
            {categories.map((cat) => {
              const Icon = cat.icon
              return (
                <div key={cat.label} className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1a1a1a]">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-neutral-400" />
                    </div>
                    <h2 className="text-[12px] font-bold text-white tracking-[0.15em] uppercase">
                      {cat.label}
                    </h2>
                  </div>
                  <div className="px-6">
                    {cat.items.map((item, i) => (
                      <FAQAccordionItem key={i} item={item} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-white font-bold text-[15px] mb-1">¿No encontraste lo que buscabas?</h3>
              <p className="text-neutral-500 text-[13px]">Escríbenos por WhatsApp y te respondemos en minutos.</p>
            </div>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 bg-[#25d366] text-black text-[13px] font-bold px-5 h-11 rounded-xl hover:bg-[#20bf5a] active:scale-[0.98] transition-all whitespace-nowrap flex-shrink-0"
            >
              <MessageCircle className="h-4 w-4" />
              Hablar con nosotros
            </a>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-neutral-700 text-[12px]">¿Listo para comprar?</p>
            <div className="flex items-center gap-6">
              <Link href="/tienda" className="text-neutral-500 hover:text-white text-[12px] tracking-widest transition-colors">
                VER CATÁLOGO
              </Link>
              <Link href="/contacto" className="text-neutral-500 hover:text-white text-[12px] tracking-widest transition-colors">
                CONTACTO
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
