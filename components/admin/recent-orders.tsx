'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/data'
import { Package } from 'lucide-react'

interface Order {
  id: number
  order_number: string
  customer_name: string
  total: number
  status: string
  payment_status: string
  created_at: string
}

interface RecentOrdersProps {
  orders: Order[]
}

const paymentStatusStyles: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
  approved: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
}

const paymentStatusLabels: Record<string, string> = {
  pending: 'Sin pagar',
  approved: 'Pagado',
  rejected: 'Rechazado',
}

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20' },
  confirmed: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  processing: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
  shipped: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/20' },
  delivered: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  processing: 'Procesando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No hay pedidos recientes</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const paymentStyle = paymentStatusStyles[order.payment_status] || paymentStatusStyles.pending
        const orderStyle = statusStyles[order.status] || statusStyles.pending
        
        return (
          <Link 
            key={order.id} 
            href={`/admin/pedidos?order=${order.order_number}`}
            className="block"
          >
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm group-hover:text-foreground transition-colors">
                    {order.order_number}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {order.customer_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="text-right space-y-2 shrink-0 ml-4">
                <p className="font-bold">{formatPrice(order.total)}</p>
                <div className="flex gap-1.5 justify-end flex-wrap">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${paymentStyle.bg} ${paymentStyle.text} ${paymentStyle.border}`}
                  >
                    {paymentStatusLabels[order.payment_status] || order.payment_status}
                  </Badge>
                  {order.payment_status === 'approved' && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${orderStyle.bg} ${orderStyle.text} ${orderStyle.border}`}
                    >
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
