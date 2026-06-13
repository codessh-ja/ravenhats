'use client'

import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [locked, setLocked] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (locked) {
      setError('Demasiados intentos. Espera 5 minutos.')
      return
    }

    setLoading(true)
    setError('')

    // Simular delay para prevenir ataques de fuerza bruta
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Validacion de credenciales
    const validUser = 'ravadmin'
    const validPass = 'ZXbTk3xb6Ow3ZWBrw'

    if (username === validUser && password === validPass) {
      // Crear cookie de sesion para el backend
      const expiry = new Date(Date.now() + (8 * 60 * 60 * 1000)) // 8 horas
      document.cookie = `admin_session=authenticated; expires=${expiry.toUTCString()}; path=/; SameSite=Strict`
      
      // Tambien guardar en sessionStorage para el frontend
      sessionStorage.setItem('admin_session', JSON.stringify({
        expiry: expiry.getTime(),
        user: validUser
      }))
      
      router.push('/admin')
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      
      if (newAttempts >= 5) {
        setLocked(true)
        setError('Cuenta bloqueada por seguridad. Intenta en 5 minutos.')
        setTimeout(() => {
          setLocked(false)
          setAttempts(0)
        }, 5 * 60 * 1000)
      } else {
        setError(`Credenciales incorrectas. ${5 - newAttempts} intentos restantes.`)
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Panel Administrativo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acceso restringido
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingresa tu usuario"
              disabled={loading || locked}
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contrasena</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contrasena"
                disabled={loading || locked}
                autoComplete="current-password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || locked}
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Si olvidaste tus credenciales, contacta al administrador del sistema.
        </p>
      </div>
    </div>
  )
}
