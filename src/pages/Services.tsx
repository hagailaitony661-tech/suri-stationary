import { useEffect, useState } from 'react'
import { serviceService } from '@/services/serviceService'
import type { Service } from '@/types'
import { formatTZS } from '@/utils/format'

const emptyForm: Partial<Service> = {
  name: '', category: '', buying_cost: 0, selling_price: 0, discount_type: 'NONE', discount_value: 0,
}

export default function Services() {
  const [items, setItems] = useState<Service[]>([])
  const [form, setForm] = useState<Partial<Service>>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setItems(await serviceService.list())
  }
  useEffect(() => { load() }, [])

  function startEdit(s: Service) { setEditingId(s.id); setForm(s) }
  function resetForm() { setEditingId(null); setForm(emptyForm) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) await serviceService.update(editingId, form)
      else await serviceService.create(form)
      resetForm()
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Una uhakika unataka kufuta huduma hii?')) return
    await serviceService.softDelete(id)
    await load()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border bg-white p-4">
        <h3 className="mb-3 font-semibold">Huduma</h3>
        {items.length === 0 ? <p className="text-slate-400">Hakuna huduma bado.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500"><tr><th className="py-1">Jina</th><th>Bei</th><th></th></tr></thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="py-1">{s.name}</td>
                  <td>{formatTZS(s.final_price)}</td>
                  <td className="space-x-2 text-right">
                    <button onClick={() => startEdit(s)} className="text-blue-600">Badilisha</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-600">Futa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border bg-white p-4">
        <h3 className="font-semibold">{editingId ? 'Badilisha Huduma' : 'Ongeza Huduma'}</h3>
        <input required placeholder="Jina la huduma" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
        <input placeholder="Category" value={form.category ?? ''} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
        <input required type="number" min={0} placeholder="Buying cost" value={form.buying_cost ?? 0} onChange={(e) => setForm({ ...form, buying_cost: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" />
        <input required type="number" min={0} placeholder="Selling price" value={form.selling_price ?? 0} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" />
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-brand-accent py-2 font-semibold text-white disabled:opacity-50">
            {saving ? 'Inahifadhi...' : 'HIFADHI'}
          </button>
          {editingId && <button type="button" onClick={resetForm} className="rounded-lg border px-4 py-2 text-sm">GHAIRI</button>}
        </div>
      </form>
    </div>
  )
}
