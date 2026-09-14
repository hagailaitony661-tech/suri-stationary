import { useEffect, useState } from 'react'
import { productService } from '@/services/productService'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types'

export default function Stock() {
  const [items, setItems] = useState<Product[]>([])
  const [target, setTarget] = useState<Product | null>(null)
  const [qty, setQty] = useState(0)
  const [type, setType] = useState<'RESTOCK' | 'ADJUSTMENT' | 'DAMAGE' | 'CORRECTION'>('RESTOCK')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const { data } = await productService.list(0, 200)
    setItems(data)
  }
  useEffect(() => { load() }, [])

  function openFor(p: Product) {
    setTarget(p)
    setQty(0)
    setType('RESTOCK')
    setReason('')
    setError(null)
  }

  async function submit() {
    if (!target) return
    setSaving(true)
    setError(null)
    try {
      const change = type === 'RESTOCK' ? Math.abs(qty) : qty // adjustment/damage/correction can be negative
      const { error } = await supabase.rpc('adjust_stock', {
        p_product_id: target.id,
        p_quantity_change: change,
        p_movement_type: type,
        p_reason: reason || null,
        p_reference: null,
      })
      if (error) throw error
      setTarget(null)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Imeshindikana kubadilisha stock.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border bg-white p-4">
        <h3 className="mb-3 font-semibold">Usimamizi wa Stock</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="py-1">Bidhaa</th><th>SKU</th><th>Stock</th><th>Min</th><th>Hali</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="py-1">{p.name}</td>
                <td>{p.sku}</td>
                <td>{p.current_stock}</td>
                <td>{p.minimum_stock}</td>
                <td>
                  {p.current_stock === 0 ? <span className="text-red-600">HAKUNA STOCK</span>
                    : p.current_stock <= p.minimum_stock ? <span className="text-amber-600">STOCK NDOGO</span>
                    : <span className="text-green-600">STOCK IPO</span>}
                </td>
                <td className="text-right">
                  <button onClick={() => openFor(p)} className="text-blue-600">Rekebisha</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {target && (
        <div className="space-y-2 rounded-xl border bg-white p-4">
          <h3 className="font-semibold">{target.name}</h3>
          <p className="text-sm text-slate-500">Stock ya sasa: {target.current_stock}</p>
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="RESTOCK">Ongeza Stock (Restock)</option>
            <option value="ADJUSTMENT">Rekebisha Stock</option>
            <option value="DAMAGE">Bidhaa Zimeharibika</option>
            <option value="CORRECTION">Marekebisho</option>
          </select>
          <input
            type="number"
            placeholder={type === 'RESTOCK' ? 'Kiasi cha kuongeza' : 'Mabadiliko (+ au -)'}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <input placeholder="Sababu" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <p className="text-sm text-slate-500">Stock mpya: {target.current_stock + (type === 'RESTOCK' ? Math.abs(qty) : qty)}</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={submit} disabled={saving} className="flex-1 rounded-lg bg-brand-accent py-2 font-semibold text-white disabled:opacity-50">
              {saving ? 'Inahifadhi...' : 'HIFADHI'}
            </button>
            <button onClick={() => setTarget(null)} className="rounded-lg border px-4 py-2 text-sm">GHAIRI</button>
          </div>
        </div>
      )}
    </div>
  )
}
