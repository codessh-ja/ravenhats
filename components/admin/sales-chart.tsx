'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts'
import { BarChart3 } from 'lucide-react'

interface SalesChartProps {
  data: { day: string; sales: number; orders: number }[]
}

const chartConfig = {
  sales: {
    label: 'Ventas',
    color: 'var(--color-foreground)',
  },
}

export function SalesChart({ data }: SalesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
        <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center mb-4">
          <BarChart3 className="h-7 w-7" />
        </div>
        <p className="text-sm">Sin datos de ventas</p>
        <p className="text-xs mt-1">Selecciona otro periodo</p>
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="var(--color-border)" 
            opacity={0.5}
          />
          <XAxis
            dataKey="day"
            stroke="var(--color-muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            stroke="var(--color-muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => 
              value >= 1000000 
                ? `$${(value / 1000000).toFixed(1)}M` 
                : value >= 1000 
                ? `$${(value / 1000).toFixed(0)}K`
                : `$${value}`
            }
          />
          <ChartTooltip
            cursor={{ fill: 'var(--color-secondary)', opacity: 0.3 }}
            content={<ChartTooltipContent />}
            formatter={(value: number) =>
              new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
              }).format(value)
            }
          />
          <Bar
            dataKey="sales"
            fill="var(--color-foreground)"
            radius={[6, 6, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
