import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { salesService } from '@/services/salesService'
import { formatTZS } from '@/utils/format'
import { toZonedTime } from 'date-fns-tz'
import type { DashboardSummary, Sale } from '@/types'

const TZ = 'Africa/Dar_es_Salaam'
const DAY_LABELS = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi']

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [recent, setRecent] = useState<Sale[]>([])
  const [weekly, setWeekly] = useState<{ day: string; total: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, r, w] = await Promise.all([
          salesService.dashboardSummary(),
          salesService.listRecent(10),
          salesService.weeklySales(),
        ])
        setSummary(s as DashboardSummary)
        setRecent(r)

        const buckets: Record<string, number> = {}
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const zoned = toZonedTime(d, TZ)
          const key = zoned.toDateString()
          buckets[key] = 0
        }
        w.forEach((sale) => {
          const zoned = toZonedTime(new Date(sale.created_at), TZ)
          const key = zoned.toDateString()
          if (buckets[key] !== undefined) buckets[key] += sale.total
        })
        const chartData = Object.keys(buckets).map((key) => {
          const d = new Date(key)
          return { day: DAY_LABELS[d.getDay()], total: buckets[key] }
        })
        setWeekly(chartData)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <p className="text-slate-500">Inapakia dashibodi...</p>

  const target = summary?.target ?? summary?.default_target ?? 250000
  const sales = summary?.total_sales ?? 0
  const achievement = target > 0 ? Math.round((sales / target) * 100) : 0
  const remaining = Math.max(target - sales, 0)
  const overTarget = Math.max(sales - target, 0)

  let status = 'CHINI YA TARGET'
  let statusColor = 'text-amber-600'
  if (sales >= target && sales < target * 1.0001) { status = 'TARGET IMEFIKIWA'; statusColor = 'text-green-600' }
  else if (sales > target) { status = 'TARGET IMEZIDIWA'; statusColor = 'text-green-600' }

  const cards = [
    { label: 'Mauzo ya Leo', value: formatTZS(sales) },
    { label: 'Profit ya Leo', value: formatTZS(summary?.total_profit ?? 0) },
    { label: 'Idadi ya Transactions', value: summary?.transaction_count ?? 0 },
    { label: 'Bidhaa Zilizouzwa', value: summary?.products_sold ?? 0 },
    { label: 'Stock Ndogo', value: summary?.low_stock_count ?? 0 },
    { label: 'Hakuna Stock', value: summary?.out_of_stock_count ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-white p-4">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h3 className="mb-3 font-semibold">Mauzo ya Wiki</h3>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={weekly}>
              <XAxis dataKey="day" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => formatTZS(v)} />
              <Bar dataKey="total" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Target ya Leo</h3>
          <span className={`text-sm font-bold ${statusColor}`}>{status}</span>
        </div>
        <div className="mb-1 flex justify-between text-sm">
          <span>{formatTZS(sales)} / {formatTZS(target)}</span>
          <span>{achievement}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full ${sales >= target ? 'bg-green-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(achievement, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {sales < target ? `Imebaki: ${formatTZS(remaining)}` : `Imezidi kwa: ${formatTZS(overTarget)}`}
        </p>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Mauzo ya Karibuni</h3>
          <a href="/reports" className="text-sm text-blue-600">Tazama Yote →</a>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400">Hakuna mauzo bado.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((s) => (
              <div key={s.id} className="flex justify-between border-t pt-2 text-sm">
                <span>{s.transaction_number}</span>
                <span className="font-semibold">{formatTZS(s.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
