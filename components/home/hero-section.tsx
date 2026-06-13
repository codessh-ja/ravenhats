'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <section className="relative h-screen min-h-[700px] max-h-[1000px] mt-[100px] overflow-hidden bg-black">
      {/* Background image with premium treatment */}
      <div className="absolute inset-0">
        <Image
          src="/Goorinhatsbanner.webp"
          alt="RavenHats Collection"
          fill
          className={`object-cover transition-all duration-[2s] ${isLoaded ? 'scale-100 opacity-60' : 'scale-110 opacity-0'}`}
          priority
          sizes="100vw"
          unoptimized
        />
      </div>
      
      {/* Premium gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
      
      {/* Content - Centered and minimal */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center px-6 max-w-4xl">
          {/* Subtle label */}
          <p 
            className={`text-white/50 text-xs sm:text-sm tracking-[0.3em] uppercase mb-6 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            RavenHats Collection
          </p>
          
          {/* Main headline - Bold and aspirational */}
          <h1 
            className={`text-5xl sm:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[0.85] mb-8 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            DEFINE TU<br />
            <span className="gradient-text">ESTILO</span>
          </h1>
          
          {/* Minimal description */}
          <p 
            className={`text-white/60 text-base sm:text-lg max-w-lg mx-auto mb-12 leading-relaxed transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            Gorras originales para quienes crean tendencias
          </p>
          
          {/* Single prominent CTA */}
          <div 
            className={`transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <Link href="/tienda">
              <Button 
                size="lg" 
                className="bg-white text-black hover:bg-white/90 rounded-none px-14 h-16 text-sm font-bold tracking-widest group btn-premium"
              >
                COMPRAR AHORA
                <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Minimal bottom info */}
      <div 
        className={`absolute bottom-8 left-0 right-0 transition-all duration-700 delay-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between">
          {/* Left - Social hint */}
          <div className="hidden lg:flex items-center gap-6">
            <a
              href="https://instagram.com/ravenhats.store"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 text-xs tracking-widest hover:text-white transition-colors"
            >
              INSTAGRAM
            </a>
            <span className="text-white/20">|</span>
            <a
              href="https://tiktok.com/@ravenhats.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 text-xs tracking-widest hover:text-white transition-colors"
            >
              TIKTOK
            </a>
          </div>
          
          {/* Center - Trust */}
          <p className="text-white/40 text-xs tracking-widest text-center flex-1 lg:flex-none">
            100% ORIGINALES
          </p>
          
          {/* Right - Scroll indicator */}
          <div className="hidden lg:flex items-center gap-3 text-white/40">
            <span className="text-xs tracking-widest">SCROLL</span>
            <div className="w-8 h-px bg-white/40" />
          </div>
        </div>
      </div>
    </section>
  )
}
