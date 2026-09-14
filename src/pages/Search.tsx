import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { productService } from '@/services/productService'
import { serviceService } from '@/services/serviceService'
import { useCart } from '@/store/CartContext'
import type { Product, Service } from '@/types'
import { formatTZS } from '@/utils/format'

export default function Search() {
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const cart = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) { setProducts([]); setServices([]); return }
      const [p, s] = await Promise.all([productService.search(query), serviceService.search(query)])
      setProducts(p); setServices(s)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tafuta bidhaa au huduma..."
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg focus:border-brand-accent focus:outline-none"
      />
      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border bg-white p-3">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-slate-500">Stock: {p.current_stock}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-brand-accent">{formatTZS(p.final_price)}</p>
              <button
                onClick={() => { cart.addProduct(p); navigate('/sales') }}
                className="mt-1 rounded bg-brand-accent px-3 py-1 text-xs text-white"
              >ONGEZA KWENYE MAUZO</button>
            </div>
          </div>
        ))}
        {services.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border bg-white p-3">
            <p className="font-medium">{s.name} <span className="text-xs text-slate-400">(Huduma)</span></p>
            <div className="text-right">
              <p className="font-semibold text-brand-accent">{formatTZS(s.final_price)}</p>
              <button
                onClick={() => { cart.addService(s); navigate('/sales') }}
                className="mt-1 rounded bg-brand-accent px-3 py-1 text-xs text-white"
              >ONGEZA KWENYE MAUZO</button>
            </div>
          </div>
        ))}
        {query && products.length === 0 && services.length === 0 && (
          <p className="text-sm text-slate-400">Hakuna kilichopatikana.</p>
        )}
      </div>
    </div>
  )
}
