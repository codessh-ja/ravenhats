'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // No verificar autenticacion en la pagina de login
    if (pathname === '/admin/login') {
      setIsLoading(false)
      setIsAuthenticated(true) // Permitir ver la pagina de login
      return
    }

    const checkAuth = () => {
      const sessionData = sessionStorage.getItem('admin_session')
      
      if (!sessionData) {
        router.replace('/admin/login')
        return
      }

      try {
        const session = JSON.parse(sessionData)
        
        // Verificar si la sesion expiro
        if (Date.now() > session.expiry) {
          sessionStorage.removeItem('admin_session')
          router.replace('/admin/login')
          return
        }

        setIsAuthenticated(true)
      } catch {
        sessionStorage.removeItem('admin_session')
        router.replace('/admin/login')
      }
      
      setIsLoading(false)
    }

    checkAuth()

    // Verificar sesion cada minuto
    const interval = setInterval(checkAuth, 60000)
    return () => clearInterval(interval)
  }, [pathname, router])

  // Mostrar loading mientras verifica
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  // Pagina de login - renderizar sin sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  // No autenticado
  if (!isAuthenticated) {
    return null
  }

  // Autenticado - mostrar layout completo
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
