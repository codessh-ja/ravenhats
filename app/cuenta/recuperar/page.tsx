'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Mail, KeyRound, CheckCircle, Loader2 } from 'lucide-react'

type Step = 'email' | 'code' | 'password' | 'success'

export default function RecoverPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Paso 1: Solicitar codigo
  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al enviar el codigo')
        return
      }

      setStep('code')
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Paso 2: Verificar codigo
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Codigo invalido')
        return
      }

      setStep('password')
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Paso 3: Cambiar contrasena
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Las contrasenas no coinciden')
      return
    }

    if (newPassword.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al cambiar la contrasena')
        return
      }

      setStep('success')
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-[100px] pb-16">
        <div className="max-w-md mx-auto px-4">
          {/* Back link */}
          <Link
            href="/cuenta/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a iniciar sesion
          </Link>

          {/* Card */}
          <div className="bg-card border border-border rounded-lg p-6 lg:p-8">
            {/* Step: Email */}
            {step === 'email' && (
              <>
                <div className="text-center mb-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="text-xl font-bold mb-2">Recuperar contrasena</h1>
                  <p className="text-sm text-muted-foreground">
                    Ingresa tu correo electronico y te enviaremos un codigo de verificacion.
                  </p>
                </div>

                <form onSubmit={handleRequestCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electronico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      autoFocus
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar codigo'
                    )}
                  </Button>
                </form>
              </>
            )}

            {/* Step: Code */}
            {step === 'code' && (
              <>
                <div className="text-center mb-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="text-xl font-bold mb-2">Ingresa el codigo</h1>
                  <p className="text-sm text-muted-foreground">
                    Enviamos un codigo de 6 digitos a <strong>{email}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Codigo de verificacion</Label>
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="text-center text-2xl tracking-[0.5em] font-mono"
                      maxLength={6}
                      required
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      El codigo expira en 15 minutos
                    </p>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      'Verificar codigo'
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="w-full text-sm text-muted-foreground hover:text-foreground"
                  >
                    No recibi el codigo
                  </button>
                </form>
              </>
            )}

            {/* Step: New Password */}
            {step === 'password' && (
              <>
                <div className="text-center mb-6">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h1 className="text-xl font-bold mb-2">Crear nueva contrasena</h1>
                  <p className="text-sm text-muted-foreground">
                    Codigo verificado. Ahora crea tu nueva contrasena.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva contrasena</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimo 6 caracteres"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar contrasena</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite tu contrasena"
                      required
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar contrasena'
                    )}
                  </Button>
                </form>
              </>
            )}

            {/* Step: Success */}
            {step === 'success' && (
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-xl font-bold mb-2">Contrasena actualizada</h1>
                <p className="text-sm text-muted-foreground mb-6">
                  Tu contrasena ha sido cambiada exitosamente. Ya puedes iniciar sesion con tu nueva contrasena.
                </p>
                <Link href="/cuenta/login">
                  <Button className="w-full">
                    Iniciar sesion
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
