import { useEffect, useState } from 'react'
import { salesService } from '@/services/salesService'
import { formatTZS } from '@/utils/format'
import type { DashboardSummary, Sale } from '@/types'

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [recent, setRecent] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, r] = await Promise.all([salesService.dashboardSummary(), salesService.listRecent(10)])
        setSummary(s as DashboardSummary)
        setRecent(r)
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
        <h3 className="mb-2 font-semibold">Mauzo ya Karibuni</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400">Hakuna mauzo bado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr><th className="py-1">Transaction</th><th>Kiasi</th><th>Malipo</th><th>Muda</th></tr>
            </thead>
            <tbody>
              {recent.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="py-1">{s.transaction_number}</td>
                  <td>{formatTZS(s.total)}</td>
                  <td>{s.payment_method}</td>
                  <td>{new Date(s.created_at).toLocaleTimeString('sw-TZ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
