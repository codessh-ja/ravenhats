'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Lock, Eye, EyeOff, Check, Loader2,
  Settings, ShoppingBag, LogOut, LayoutDashboard, User2,
} from 'lucide-react'
import { toast } from 'sonner'

interface Customer {
  customerId: number
  email: string
  firstName: string
  lastName: string
}

export default function AccountSettingsPage() {
  const router = useRouter()
  const [customer,  setCustomer]  = useState<Customer | null>(null)
  const [current,   setCurrent]   = useState('')
  const [next,      setNext]      = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [show,      setShow]      = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) { router.push('/login'); return }
        setCustomer(data.customer)
      })
      .catch(() => router.push('/login'))
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (next !== confirm) { setError('Las contraseñas nuevas no coinciden'); return }
    if (next.length < 6)  { setError('La nueva contraseña debe tener al menos 6 caracteres'); return }

    setLoading(true)
    try {
      const res  = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) { toast.error('Sesión expirada'); router.push('/login'); return }
        setError(data.error || 'Error al cambiar la contraseña')
        return
      }
      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
      toast.success('Contraseña actualizada')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({
    id, label, value, onChange,
  }: {
    id: string; label: string; value: string; onChange: (v: string) => void
  }) => (
    <div>
      <label htmlFor={id} className="block text-[12px] text-neutral-400 mb-2 tracking-wide">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-600 pointer-events-none" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          required
          className="w-full bg-[#111] border border-[#222] text-white text-[13px] rounded-xl pl-10 pr-11 h-11 placeholder:text-neutral-700 focus:outline-none focus:border-[#444] transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )

  const initials = customer
    ? `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`.toUpperCase()
    : ''

  return (
    <main className="min-h-screen bg-[#0a0a0a]">

      {/* ── Mobile header ── */}
      <div className="lg:hidden sticky top-0 z-20 border-b border-[#161616] bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="px-4 flex items-center justify-between h-14">
          <Link href="/mi-cuenta" className="text-[12px] text-neutral-500 hover:text-white tracking-widest transition-colors">
            ← MI CUENTA
          </Link>
          <p className="text-[13px] font-bold text-white">CONFIGURACIÓN</p>
          <div className="w-16" />
        </div>
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <Link
            href="/mi-cuenta"
            className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#1a1a1a] border border-[#222] text-neutral-400 hover:text-white text-[11px] transition-colors"
          >
            Inicio
          </Link>
          <span className="shrink-0 px-3.5 py-1.5 rounded-full bg-white text-black text-[11px] font-bold">
            Configuración
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-7 lg:py-10">
        <div className="flex gap-6">

          {/* ── Sidebar (desktop) ── */}
          <aside className="hidden lg:flex flex-col gap-4 w-[220px] shrink-0">

            {/* Profile card */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-5 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#181818] border border-[#262626] flex items-center justify-center">
                {initials ? (
                  <span className="text-[18px] font-black text-neutral-400">{initials}</span>
                ) : (
                  <User2 className="h-6 w-6 text-neutral-500" />
                )}
              </div>
              {customer && (
                <div className="min-w-0 w-full">
                  <p className="text-[14px] font-bold text-white leading-snug">
                    {customer.firstName} {customer.lastName}
                  </p>
                  <p className="text-neutral-600 text-[11px] mt-1 break-all leading-snug">{customer.email}</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl overflow-hidden divide-y divide-[#1a1a1a]">
              <Link
                href="/mi-cuenta"
                className="flex items-center gap-3 px-4 py-3.5 text-neutral-500 hover:text-white hover:bg-white/[0.03] text-[13px] transition-all"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                Mi cuenta
              </Link>
              <div className="flex items-center gap-3 px-4 py-3.5 bg-white/[0.04] text-white text-[13px] font-semibold">
                <Settings className="h-4 w-4 shrink-0" />
                Configuración
              </div>
            </nav>

            {/* Quick links */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl overflow-hidden divide-y divide-[#1a1a1a]">
              <Link
                href="/tienda"
                className="flex items-center gap-3 px-4 py-3.5 text-neutral-500 hover:text-white hover:bg-white/[0.03] text-[13px] transition-all"
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                Ir a la tienda
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-neutral-600 hover:text-red-400 hover:bg-red-500/5 text-[13px] transition-all"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Cerrar sesión
              </button>
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">
            <div className="mb-6 hidden lg:block">
              <p className="text-neutral-600 text-[10px] tracking-[0.3em] uppercase mb-1">Cuenta</p>
              <h1 className="text-[24px] font-black text-white tracking-tight">Configuración</h1>
            </div>

            <div className="max-w-lg space-y-4">

              {/* Password section */}
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-[#1a1a1a]">
                  <h2 className="text-[12px] font-bold text-white tracking-[0.15em] uppercase">
                    Cambiar contraseña
                  </h2>
                  <p className="text-[12px] text-neutral-600 mt-1">
                    Actualiza tu contraseña para mantener tu cuenta segura
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <Field id="current"  label="Contraseña actual"          value={current}  onChange={setCurrent} />
                  <Field id="next"     label="Nueva contraseña"           value={next}     onChange={setNext} />
                  <Field id="confirm"  label="Confirmar nueva contraseña" value={confirm}  onChange={setConfirm} />

                  {error && (
                    <p className="text-[12px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                      {error}
                    </p>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 text-[12px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      Contraseña actualizada correctamente
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-white text-black text-[13px] font-bold tracking-widest rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                      ) : 'ACTUALIZAR CONTRASEÑA'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Account info (read-only) */}
              {customer && (
                <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl overflow-hidden">
                  <div className="px-6 py-5 border-b border-[#1a1a1a]">
                    <h2 className="text-[12px] font-bold text-white tracking-[0.15em] uppercase">
                      Información de la cuenta
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] text-neutral-600 mb-1.5">Nombre</p>
                        <p className="text-[13px] text-white font-medium">{customer.firstName}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-neutral-600 mb-1.5">Apellido</p>
                        <p className="text-[13px] text-white font-medium">{customer.lastName}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-neutral-600 mb-1.5">Correo electrónico</p>
                      <p className="text-[13px] text-white font-medium">{customer.email}</p>
                    </div>
                    <p className="text-[11px] text-neutral-700">
                      Para actualizar tu nombre o correo, contáctanos por WhatsApp.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile logout */}
            <div className="lg:hidden mt-6">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 h-11 border border-[#1a1a1a] rounded-xl text-[12px] text-neutral-500 hover:text-red-400 hover:border-red-500/20 transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
