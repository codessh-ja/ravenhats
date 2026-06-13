import React from "react"
import Link from "next/link"
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ChevronLeft } from 'lucide-react'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pt-[100px] min-h-screen bg-[#0a0a0a]">
        <div className="py-12 lg:py-16">
          <div className="mx-auto max-w-2xl px-5 lg:px-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[12px] text-neutral-600 hover:text-white transition-colors mb-10 tracking-widest"
            >
              <ChevronLeft className="h-4 w-4" />
              VOLVER
            </Link>
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
