import { Metadata } from 'next'
import Link from 'next/link'
import { MessageCircle, Lock, Check } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidad | RavenHats',
  description: 'Política de privacidad y tratamiento de datos personales de RavenHats.',
}

export default function PrivacyPage() {
  return (
    <div className="space-y-10">

      {/* Header */}
      <div>
        <p className="text-neutral-600 text-[11px] tracking-[0.3em] uppercase mb-3">Legal</p>
        <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-white mb-2">PRIVACIDAD</h1>
        <p className="text-neutral-600 text-[12px]">Actualizado: Enero 2026 · Cómo manejamos tu información.</p>
      </div>

      {/* Security highlight */}
      <div className="flex items-start gap-4 border border-[#1a2a1a] bg-[#0d1a0d] rounded-2xl p-5">
        <div className="w-9 h-9 rounded-xl bg-green-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Lock className="h-4 w-4 text-green-500" />
        </div>
        <div>
          <p className="text-white text-[13px] font-semibold mb-1">Tu información está protegida</p>
          <p className="text-neutral-400 text-[12px] leading-relaxed">
            Usamos cifrado SSL en todo el sitio. Los pagos van directo a Wompi — nunca vemos ni guardamos datos de tarjetas.
          </p>
        </div>
      </div>

      {/* Qué pedimos */}
      <div>
        <h2 className="text-white text-[13px] font-bold mb-3 uppercase tracking-wider">Qué datos pedimos</h2>
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5 space-y-2.5">
          {['Nombre completo', 'Cédula', 'Dirección de envío', 'Celular'].map(item => (
            <div key={item} className="flex items-center gap-3">
              <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              <span className="text-neutral-300 text-[13px]">{item}</span>
            </div>
          ))}
        </div>
        <p className="text-neutral-600 text-[11px] mt-2 pl-1">Solo lo necesario para procesar y enviar tu pedido.</p>
      </div>

      {/* Para qué */}
      <div>
        <h2 className="text-white text-[13px] font-bold mb-3 uppercase tracking-wider">Para qué los usamos</h2>
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5 space-y-2.5">
          {[
            'Procesar tu pedido',
            'Coordinar el envío con InterRapidísimo',
            'Contactarte si hay algún problema',
            'Responder si nos escribes',
          ].map(item => (
            <div key={item} className="flex items-center gap-3">
              <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              <span className="text-neutral-300 text-[13px]">{item}</span>
            </div>
          ))}
        </div>
        <p className="text-neutral-600 text-[11px] mt-2 pl-1">No vendemos tu información ni te llenamos de spam.</p>
      </div>

      {/* Con quién */}
      <div>
        <h2 className="text-white text-[13px] font-bold mb-3 uppercase tracking-wider">Con quién compartimos</h2>
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl divide-y divide-[#1a1a1a]">
          <div className="p-4">
            <p className="text-white text-[13px] font-medium">Wompi</p>
            <p className="text-neutral-500 text-[12px] mt-0.5">Para procesar tu pago de forma segura</p>
          </div>
          <div className="p-4">
            <p className="text-white text-[13px] font-medium">InterRapidísimo</p>
            <p className="text-neutral-500 text-[12px] mt-0.5">Para enviar tu pedido a todo Colombia</p>
          </div>
        </div>
      </div>

      {/* Derechos */}
      <div className="border-l-2 border-[#2a2a2a] pl-4">
        <p className="text-neutral-400 text-sm leading-relaxed">
          Puedes pedirnos ver, corregir o borrar tus datos cuando quieras. Solo escríbenos por WhatsApp.
        </p>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-2">
        <Link href="/legal/terminos" className="text-[11px] px-3 py-1.5 rounded-full border border-[#1a1a1a] text-neutral-500 hover:text-white hover:border-[#2a2a2a] transition-colors">
          Términos y condiciones
        </Link>
      </div>

      {/* WhatsApp CTA */}
      <a
        href="https://wa.me/13412133624?text=Hola,%20tengo%20una%20pregunta%20sobre%20mis%20datos"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-between bg-[#0f0f0f] border border-[#1a1a1a] hover:border-[#25d366]/30 rounded-2xl p-5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#25d366]/10 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-4 w-4 text-[#25d366]" />
          </div>
          <div>
            <p className="text-white text-[13px] font-medium">¿Preguntas sobre tus datos?</p>
            <p className="text-neutral-600 text-[11px]">Escríbenos por WhatsApp</p>
          </div>
        </div>
        <span className="text-[#25d366] text-[12px] font-semibold">Escribir →</span>
      </a>
    </div>
  )
}
