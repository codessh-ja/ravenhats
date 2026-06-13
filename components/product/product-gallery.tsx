'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ProductGalleryProps {
  images: string[]
  name: string
}

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [current, setCurrent] = useState(0)
  const total = images.length

  const prev = useCallback(() => setCurrent(i => (i - 1 + total) % total), [total])
  const next = useCallback(() => setCurrent(i => (i + 1) % total), [total])

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#111] group">
        <Image
          src={images[current] || '/placeholder.svg'}
          alt={`${name} - ${current + 1}`}
          fill
          className="object-cover transition-opacity duration-300"
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />

        {/* Arrows — visible on hover when multiple images */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 active:scale-95"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 active:scale-95"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dots indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all ${
                    i === current
                      ? 'w-4 h-1.5 bg-white'
                      : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                i === current
                  ? 'border-white'
                  : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <Image
                src={img}
                alt={`${name} - ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
