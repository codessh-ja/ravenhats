import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function Loading() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-[100px] bg-background">
        <div className="py-12 px-4 text-center border-b border-border">
          <div className="h-9 w-32 bg-secondary/50 rounded mx-auto animate-pulse" />
          <div className="h-4 w-24 bg-secondary/30 rounded mx-auto mt-3 animate-pulse" />
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
      <Footer />
    </>
  )
}
