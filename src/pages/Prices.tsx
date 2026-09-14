import { useEffect, useState } from 'react'
import { productService } from '@/services/productService'
import type { Product } from '@/types'
import { formatTZS } from '@/utils/format'

export default function Prices() {
  const [items, setItems] = useState<Product[]>([])
  useEffect(() => { productService.list(0, 200).then(({ data }) => setItems(data)) }, [])

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-3 font-semibold">Usimamizi wa Bei</h3>
      <p className="mb-3 text-xs text-slate-400">Kubadilisha bei, tumia ukurasa wa Bidhaa (Badilisha).</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="py-1">Bidhaa</th><th>Buying</th><th>Selling</th><th>Discount</th><th>Final</th><th>Profit/unit</th><th>Margin</th></tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const profit = p.final_price - p.buying_price
              const margin = p.final_price > 0 ? ((profit / p.final_price) * 100).toFixed(1) : '0.0'
              return (
                <tr key={p.id} className="border-t">
                  <td className="py-1">{p.name}</td>
                  <td>{formatTZS(p.buying_price)}</td>
                  <td>{formatTZS(p.selling_price)}</td>
                  <td>{p.discount_type === 'NONE' ? '-' : p.discount_type === 'PERCENT' ? `${p.discount_value}%` : formatTZS(p.discount_value)}</td>
                  <td className="font-semibold">{formatTZS(p.final_price)}</td>
                  <td>{formatTZS(profit)}</td>
                  <td>{margin}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
