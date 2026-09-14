import { useEffect, useState } from 'react'
import { productService } from '@/services/productService'
import type { Product } from '@/types'
import { formatTZS } from '@/utils/format'

const emptyForm: Partial<Product> = {
  name: '', sku: '', barcode: '', buying_price: 0, selling_price: 0,
  discount_type: 'NONE', discount_value: 0, current_stock: 0, minimum_stock: 5,
}

export default function Products() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Partial<Product>>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const { data } = await productService.list(0, 100)
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function startEdit(p: Product) {
    setEditingId(p.id)
    setForm(p)
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await productService.update(editingId, form)
      } else {
        await productService.create(form)
      }
      resetForm()
      await load()
    } catch (e: any) {
      setError(e?.message || 'Imeshindikana kuhifadhi bidhaa.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Una uhakika unataka kufuta bidhaa hii?')) return
    await productService.softDelete(id)
    await load()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border bg-white p-4">
        <h3 className="mb-3 font-semibold">Bidhaa</h3>
        {loading ? (
          <p className="text-slate-500">Inapakia...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-400">Hakuna bidhaa bado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr><th className="py-1">Jina</th><th>Bei</th><th>Stock</th><th>Hali</th><th></th></tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-1">{p.name}</td>
                    <td>{formatTZS(p.final_price)}</td>
                    <td>{p.current_stock}</td>
                    <td>
                      {p.current_stock === 0 ? (
                        <span className="text-red-600">HAKUNA STOCK</span>
                      ) : p.current_stock <= p.minimum_stock ? (
                        <span className="text-amber-600">STOCK NDOGO</span>
                      ) : (
                        <span className="text-green-600">STOCK IPO</span>
                      )}
                    </td>
                    <td className="space-x-2 text-right">
                      <button onClick={() => startEdit(p)} className="text-blue-600">Badilisha</button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-600">Futa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border bg-white p-4">
        <h3 className="font-semibold">{editingId ? 'Badilisha Bidhaa' : 'Ongeza Bidhaa'}</h3>
        <input required placeholder="Jina la bidhaa" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
        <input placeholder="SKU" value={form.sku ?? ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
        <input placeholder="Barcode" value={form.barcode ?? ''} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
        <input required type="number" min={0} placeholder="Buying price" value={form.buying_price ?? 0} onChange={(e) => setForm({ ...form, buying_price: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" />
        <input required type="number" min={0} placeholder="Selling price" value={form.selling_price ?? 0} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" />
        <select value={form.discount_type ?? 'NONE'} onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })} className="w-full rounded-lg border px-3 py-2 text-sm">
          <option value="NONE">Hakuna discount</option>
          <option value="AMOUNT">Discount ya kiasi</option>
          <option value="PERCENT">Discount ya asilimia</option>
        </select>
        {form.discount_type !== 'NONE' && (
          <input type="number" min={0} placeholder="Discount value" value={form.discount_value ?? 0} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" />
        )}
        <input required type="number" min={0} placeholder="Stock ya awali" value={form.current_stock ?? 0} onChange={(e) => setForm({ ...form, current_stock: Number(e.target.value) })} disabled={!!editingId} className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-slate-100" />
        <input required type="number" min={0} placeholder="Minimum stock" value={form.minimum_stock ?? 5} onChange={(e) => setForm({ ...form, minimum_stock: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" />

        {editingId && <p className="text-xs text-slate-400">Tumia ukurasa wa Stock kubadilisha kiasi cha stock.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-brand-accent py-2 font-semibold text-white disabled:opacity-50">
            {saving ? 'Inahifadhi...' : 'HIFADHI'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded-lg border px-4 py-2 text-sm">GHAIRI</button>
          )}
        </div>
      </form>
    </div>
  )
}
