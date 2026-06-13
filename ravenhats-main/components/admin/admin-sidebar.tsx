'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Receipt,
  BarChart3,
  MessageCircle,
  X,
  Store,
  ExternalLink,
  Bell,
  Search,
  Command,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Navigation organized by sections
const mainNavigation = [
  { name: 'Dashboard',    href: '/admin',           icon: LayoutDashboard, description: 'Resumen general',       badgeKey: '' },
  { name: 'Productos',    href: '/admin/productos',  icon: Package,         description: 'Gestionar catalogo',    badgeKey: 'lowStock' },
  { name: 'Pedidos',      href: '/admin/pedidos',    icon: ShoppingCart,    description: 'Ordenes y envios',      badgeKey: 'pending' },
  { name: 'Clientes',     href: '/admin/clientes',   icon: Users,           description: 'Base de clientes',      badgeKey: '' },
]

const analyticsNavigation = [
  { name: 'Contabilidad', href: '/admin/contabilidad', icon: Receipt,      description: 'Finanzas y pagos',           badgeKey: '' },
  { name: 'Reportes',     href: '/admin/reportes',     icon: BarChart3,     description: 'Estadisticas detalladas',   badgeKey: '' },
  { name: 'Chatbot IA',   href: '/admin/chatbot',      icon: MessageCircle, description: 'Analytics del asistente',   badgeKey: '' },
]

const settingsNavigation = [
  { name: 'Configuracion', href: '/admin/configuracion', icon: Settings, description: 'Ajustes del sistema', badgeKey: '' },
]

interface LiveCounts {
  pending: number
  lowStock: number
}

interface NavItemProps {
  item: { name: string; href: string; icon: React.ElementType; description: string; badgeKey: string }
  isActive: boolean
  isCollapsed: boolean
  liveCounts: LiveCounts
  onClose?: () => void
}

function NavItem({ item, isActive, isCollapsed, liveCounts, onClose }: NavItemProps) {
  const badgeCount = item.badgeKey ? (liveCounts[item.badgeKey as keyof LiveCounts] ?? 0) : 0
  const showBadge = badgeCount > 0

  const content = (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg relative',
        isActive
          ? 'bg-foreground text-background shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
      )}
    >
      <div className="relative shrink-0">
        <item.icon className={cn(
          "h-[18px] w-[18px] transition-all duration-200",
          !isActive && "group-hover:scale-110"
        )} />
        {showBadge && isCollapsed && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </div>
      {!isCollapsed && (
        <>
          <span className="truncate flex-1">{item.name}</span>
          {showBadge && (
            <span className={cn(
              'min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums leading-none',
              isActive ? 'bg-background/20 text-background' : 'bg-red-500/90 text-white'
            )}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
          {isActive && !showBadge && (
            <div className="h-1.5 w-1.5 rounded-full bg-background animate-pulse" />
          )}
        </>
      )}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col gap-0.5">
          <span className="font-medium">{item.name}</span>
          <span className="text-xs text-muted-foreground">{item.description}</span>
          {showBadge && <span className="text-xs text-red-400">{badgeCount} pendientes</span>}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

function SidebarContent({
  isCollapsed = false,
  onLogout,
  onClose,
  liveCounts,
}: {
  isCollapsed?: boolean
  onLogout: () => void
  onClose?: () => void
  liveCounts: LiveCounts
}) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href))

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-sidebar">
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <Link href="/admin" className="flex items-center gap-3" onClick={onClose}>
            <div className="h-9 w-9 rounded-lg bg-foreground flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-background" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-wide">RAVENHATS</span>
                <span className="text-[10px] text-muted-foreground tracking-wider">ADMIN PANEL</span>
              </div>
            )}
          </Link>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden shrink-0">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Quick Search - Only on expanded */}
        {!isCollapsed && (
          <div className="px-3 pt-4">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-sidebar-accent/50 hover:bg-sidebar-accent rounded-lg transition-colors">
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Buscar...</span>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-sidebar-border bg-sidebar px-1.5 font-mono text-[10px] text-muted-foreground">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-hide">
          {/* Main Section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Principal
              </p>
            )}
            {mainNavigation.map((item) => (
              <NavItem
                key={item.name}
                item={item}
                isActive={isActive(item.href)}
                isCollapsed={isCollapsed}
                liveCounts={liveCounts}
                onClose={onClose}
              />
            ))}
          </div>

          {/* Analytics Section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Analitica
              </p>
            )}
            {analyticsNavigation.map((item) => (
              <NavItem
                key={item.name}
                item={item}
                isActive={isActive(item.href)}
                isCollapsed={isCollapsed}
                liveCounts={liveCounts}
                onClose={onClose}
              />
            ))}
          </div>

          {/* Settings Section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Sistema
              </p>
            )}
            {settingsNavigation.map((item) => (
              <NavItem
                key={item.name}
                item={item}
                isActive={isActive(item.href)}
                isCollapsed={isCollapsed}
                liveCounts={liveCounts}
                onClose={onClose}
              />
            ))}
          </div>
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          {isCollapsed ? (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link 
                    href="/" 
                    target="_blank"
                    className="flex items-center justify-center p-2.5 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg transition-all"
                  >
                    <ExternalLink className="h-[18px] w-[18px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Ver tienda</TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center justify-center p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <LogOut className="h-[18px] w-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Cerrar sesion</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Link 
                href="/" 
                target="_blank"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent group"
              >
                <ExternalLink className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110" />
                <span>Ver tienda</span>
              </Link>
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 group"
              >
                <LogOut className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:translate-x-0.5" />
                <span>Cerrar sesion</span>
              </button>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

export function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [liveCounts, setLiveCounts] = useState<LiveCounts>({ pending: 0, lowStock: 0 })
  const router = useRouter()
  const pathname = usePathname()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved))
    }
  }, [])

  // Live counts: fetch pending orders + low stock every 60s
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/admin/stats?period=week')
        const data = await res.json()
        if (data.success) {
          setLiveCounts({
            pending:  Number(data.stats.pendingOrders  ?? 0),
            lowStock: Number(data.stats.lowStockCount  ?? 0) + Number(data.stats.outOfStockCount ?? 0),
          })
        }
      } catch { /* silent */ }
    }
    fetchCounts()
    const id = setInterval(fetchCounts, 60_000)
    return () => clearInterval(id)
  }, [])

  const toggleCollapsed = () => {
    const newValue = !isCollapsed
    setIsCollapsed(newValue)
    localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(newValue))
  }

  const handleLogout = () => {
    document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    sessionStorage.removeItem('admin_session')
    router.replace('/admin/login')
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between h-full px-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
              <Store className="h-4 w-4 text-background" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wide leading-none">RAVENHATS</span>
              <span className="text-[9px] text-muted-foreground tracking-wider">ADMIN</span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="hover:bg-secondary h-9 w-9"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="hover:bg-secondary h-9 w-9"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 transform transition-transform duration-300 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onLogout={handleLogout} onClose={() => setMobileOpen(false)} liveCounts={liveCounts} />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar admin-sidebar relative',
          isCollapsed ? 'w-[68px]' : 'w-[260px]'
        )}
      >
        <SidebarContent isCollapsed={isCollapsed} onLogout={handleLogout} liveCounts={liveCounts} />
        
        {/* Collapse Toggle Button */}
        <button
          onClick={toggleCollapsed}
          className={cn(
            "absolute -right-3 top-[72px] h-6 w-6 rounded-full border border-border bg-background",
            "flex items-center justify-center hover:bg-secondary transition-all",
            "shadow-sm hover:shadow-md z-10"
          )}
          title={isCollapsed ? 'Expandir' : 'Colapsar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </aside>

      {/* Mobile Spacer */}
      <div className="lg:hidden h-14 shrink-0" />
    </>
  )
}
