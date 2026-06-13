'use client'

import React, { Suspense } from "react"
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowRight, Check } from 'lucide-react'
import { toast } from 'sonner'

function Field({ id, label, type = 'text', placeholder, value, onChange, icon: Icon, rightSlot }: {
  id: string
  label: string
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  icon: React.ElementType
  rightSlot?: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] text-neutral-400 mb-2 tracking-wide">{label}</label>
      <div className="relative flex items-center">
        <Icon className="absolute left-3.5 h-4 w-4 text-neutral-600 pointer-events-none" />
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          required
          className="w-full bg-[#111] border border-[#222] text-white text-[13px] rounded-xl px-4 pl-10 h-11 placeholder:text-neutral-700 focus:outline-none focus:border-[#444] transition-colors"
        />
        {rightSlot && (
          <div className="absolute right-3.5">{rightSlot}</div>
        )}
      </div>
    </div>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/mi-cuenta'

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [registerData, setRegisterData] = useState({
    email: '', password: '', confirmPassword: '', firstName: '', lastName: '', phone: ''
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('Bienvenido de vuelta!')
      router.push(redirect)
    } catch {
      toast.error('Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Las contraseñas no coinciden'); return
    }
    if (registerData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres'); return
    }
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerData.email, password: registerData.password,
          firstName: registerData.firstName, lastName: registerData.lastName, phone: registerData.phone,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('Cuenta creada!')
      router.push(redirect)
    } catch {
      toast.error('Error al crear cuenta')
    } finally {
      setIsLoading(false)
    }
  }

  const eyeBtn = (
    <button type="button" onClick={() => setShowPassword(p => !p)} className="text-neutral-600 hover:text-neutral-400 transition-colors">
      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  )

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">

      {/* Top nav */}
      <div className="fixed top-0 left-0 right-0 border-b border-[#161616] bg-[#0a0a0a]/90 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-7 h-7 flex-shrink-0">
              <Image src="/logo.jpg" alt="RavenHats" fill className="rounded-full object-cover" unoptimized sizes="28px" />
            </div>
            <span className="text-sm font-black tracking-[0.12em] text-white">RAVENHATS</span>
          </Link>
          <Link href="/" className="text-neutral-600 hover:text-white text-[12px] tracking-widest transition-colors">
            ← TIENDA
          </Link>
        </div>
      </div>

      <div className="w-full max-w-sm pt-16">

        {/* Brand */}
        <div className="text-center mb-8">
          <p className="text-neutral-600 text-[11px] tracking-[0.3em] uppercase mb-3">Tu cuenta</p>
          <h1 className="text-2xl font-black tracking-tighter text-white">RAVENHATS</h1>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#111] border border-[#1a1a1a] rounded-xl p-1 mb-6">
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-[12px] font-bold tracking-wider transition-all ${
                tab === t ? 'bg-white text-black' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {t === 'login' ? 'INGRESAR' : 'REGISTRARSE'}
            </button>
          ))}
        </div>

        {/* Login form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Field id="login-email" label="Correo electrónico" type="email" placeholder="tu@email.com"
              value={loginEmail} onChange={setLoginEmail} icon={Mail} />
            <Field id="login-password" label="Contraseña" type={showPassword ? 'text' : 'password'}
              placeholder="Tu contraseña" value={loginPassword} onChange={setLoginPassword}
              icon={Lock} rightSlot={eyeBtn} />
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-white text-black text-[13px] font-bold tracking-widest rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? 'Ingresando...' : 'INICIAR SESIÓN'}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-center">
              <Link href="/cuenta/recuperar" className="text-neutral-600 hover:text-neutral-400 text-[12px] transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </form>
        )}

        {/* Register form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field id="firstName" label="Nombre" placeholder="Juan" value={registerData.firstName}
                onChange={v => setRegisterData(d => ({ ...d, firstName: v }))} icon={User} />
              <div>
                <label htmlFor="lastName" className="block text-[12px] text-neutral-400 mb-2 tracking-wide">Apellido</label>
                <input
                  id="lastName" placeholder="Pérez" value={registerData.lastName}
                  onChange={e => setRegisterData(d => ({ ...d, lastName: e.target.value }))}
                  required
                  className="w-full bg-[#111] border border-[#222] text-white text-[13px] rounded-xl px-4 h-11 placeholder:text-neutral-700 focus:outline-none focus:border-[#444] transition-colors"
                />
              </div>
            </div>
            <Field id="register-email" label="Correo electrónico" type="email" placeholder="tu@email.com"
              value={registerData.email} onChange={v => setRegisterData(d => ({ ...d, email: v }))} icon={Mail} />
            <Field id="phone" label="Teléfono (opcional)" type="tel" placeholder="3001234567"
              value={registerData.phone} onChange={v => setRegisterData(d => ({ ...d, phone: v }))} icon={Phone} />
            <Field id="register-password" label="Contraseña" type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres" value={registerData.password}
              onChange={v => setRegisterData(d => ({ ...d, password: v }))} icon={Lock} rightSlot={eyeBtn} />
            <Field id="confirmPassword" label="Confirmar contraseña" type={showPassword ? 'text' : 'password'}
              placeholder="Repite tu contraseña" value={registerData.confirmPassword}
              onChange={v => setRegisterData(d => ({ ...d, confirmPassword: v }))} icon={Lock} />
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-white text-black text-[13px] font-bold tracking-widest rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? 'Creando cuenta...' : 'CREAR CUENTA'}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        )}

        {/* Benefits */}
        <div className="mt-8 space-y-2.5 border-t border-[#161616] pt-8">
          {[
            'Seguimiento de todos tus pedidos',
            'Checkout más rápido con datos guardados',
            'Notificaciones de envío y entregas',
          ].map(b => (
            <div key={b} className="flex items-center gap-3">
              <Check className="h-3.5 w-3.5 text-neutral-600 flex-shrink-0" />
              <span className="text-neutral-600 text-[12px]">{b}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </main>
    }>
      <LoginContent />
    </Suspense>
  )
}
