'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Bell } from 'lucide-react'

interface DropsNewsletterProps {
  collectionId?: number
  collectionName?: string
}

export function DropsNewsletter({ collectionId, collectionName }: DropsNewsletterProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) return
    
    setLoading(true)
    
    try {
      const res = await fetch('/api/drops/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, collectionId }),
      })
      
      if (!res.ok) throw new Error('Error al suscribirse')
      
      toast.success('Te has suscrito correctamente!')
      setEmail('')
    } catch {
      toast.error('No pudimos suscribirte. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-20 px-4 bg-foreground text-background text-center">
      <div className="max-w-md mx-auto">
        <div className="h-14 w-14 rounded-full bg-background/10 flex items-center justify-center mx-auto mb-6">
          <Bell className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-black tracking-tight mb-4">
          {collectionName 
            ? `ALERTA DE ${collectionName.toUpperCase()}`
            : 'NO TE PIERDAS LOS DROPS'
          }
        </h2>
        <p className="text-background/70 mb-8">
          {collectionName
            ? `Se el primero en saber cuando llegan nuevas gorras de ${collectionName}.`
            : 'Unete a la lista y se el primero en saber cuando salen nuevas colecciones exclusivas.'
          }
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 bg-background/10 border-background/20 text-background placeholder:text-background/50 focus:border-background"
          />
          <Button 
            type="submit" 
            disabled={loading}
            className="h-12 px-8 bg-background text-foreground hover:bg-background/90 font-bold tracking-wider"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'SUSCRIBIRSE'
            )}
          </Button>
        </form>
        <p className="text-background/50 text-xs mt-4">
          Sin spam. Solo notificaciones de nuevos drops.
        </p>
      </div>
    </section>
  )
}
