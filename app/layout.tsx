import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { CartProvider } from '@/lib/cart-context'
import { ChatbotProvider } from '@/lib/chatbot-context'
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget'
import './globals.css'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: 'RavenHats | Gorras Goorin Bros Originales Colombia - Envio Gratis',
    template: '%s | RavenHats Colombia'
  },
  description: 'Tienda oficial de gorras Goorin Bros 100% originales en Colombia. Envios a todo el pais. Pago contraentrega disponible. Pago seguro con Wompi. WhatsApp +1 341 213 3624',
  keywords: ['gorras goorin bros', 'gorras colombia', 'goorin bros colombia', 'gorras originales', 'caps colombia', 'ravenhats', 'tienda gorras bogota', 'gorras trucker', 'gorras animales', 'the farm goorin'],
  authors: [{ name: 'RavenHats' }],
  creator: 'RavenHats',
  publisher: 'RavenHats',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://ravenhats.store'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'RavenHats | Gorras Goorin Bros Originales Colombia',
    description: 'Tienda oficial de gorras Goorin Bros 100% originales. Envios a todo Colombia. Pago contraentrega. Pago seguro.',
    url: 'https://ravenhats.store',
    siteName: 'RavenHats',
    locale: 'es_CO',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'RavenHats - Gorras Goorin Bros Originales Colombia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RavenHats | Gorras Goorin Bros Originales Colombia',
    description: 'Gorras Goorin Bros 100% originales. Envios a todo Colombia. Pago contraentrega.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'tu-codigo-de-verificacion-google',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Store",
              "name": "RavenHats",
              "description": "Gorras 100% originales en Colombia",
              "url": "https://ravenhats.store",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "CO"
              },
              "priceRange": "$$",
              "paymentAccepted": ["Credit Card", "Debit Card", "PSE", "Nequi"],
              "currenciesAccepted": "COP",
              "sameAs": [
                "https://instagram.com/ravenhats.store",
                "https://tiktok.com/@ravenhats.co"
              ]
            })
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-foreground focus:text-background"
        >
          Saltar al contenido
        </a>
        <CartProvider>
          <ChatbotProvider>
            {children}
            <ChatbotWidget />
            <Toaster />
          </ChatbotProvider>
        </CartProvider>
        <Analytics />
      </body>
    </html>
  )
}
