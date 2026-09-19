import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { productService } from '@/services/productService'
import type { Product } from '@/types'
import { formatTZS } from '@/utils/format'

type Item = Product & { image_url?: string | null }
type ProductForm = Partial<Item>

const BUCKET = 'product-images'

const emptyForm: ProductForm = {
  name: '',
  sku: '',
  barcode: '',
  buying_price: 0,
  selling_price: 0,
  discount_type: 'NONE',
  discount_value: 0,
  current_stock: 0,
  minimum_stock: 5,
  image_url: null,
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base disabled:bg-slate-100 disabled:text-slate-400'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

function calcFinal(price: number, type: string | undefined, value: number): number {
  if (type === 'AMOUNT') return Math.max(price - value, 0)
  if (type === 'PERCENT') {
    const pct = Math.min(Math.max(value, 0), 100)
    return Math.round(price * (1 - pct / 100))
  }
  return price
}

function money(n: number): string {
  return n < 0 ? `-${formatTZS(Math.abs(n))}` : formatTZS(n)
}

// Phone photos are several MB. Shrink to max 800px JPEG before uploading.
async function compressImage(file: File, maxSize = 800, quality = 0.8): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    return blob ?? file
  } catch {
    return file
  }
}

async function uploadImage(file: File): Promise<string> {
  const blob = await compressImage(file)
  const path = `${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) {
    throw new Error(
      'Imeshindikana kupakia picha. Hakikisha bucket ya product-images imeundwa kwenye Supabase. (' +
        error.message +
        ')',
    )
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export default function Products() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!imageFile) {
      setPreview(null)
      return undefined
    }
    const url = URL.createObjectURL(imageFile)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  async function load() {
    setLoading(true)
    try {
      const { data } = await productService.list(0, 100)
      setItems((data ?? []) as Item[])
    } catch (e: any) {
      setError(e?.message || 'Imeshindikana kupakia bidhaa.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.sku ?? '').toLowerCase().includes(q),
    )
  }, [items, query])

  function setField<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function readNumber(e: ChangeEvent<HTMLInputElement>): number {
    const v = Number(e.target.value)
    return Number.isFinite(v) && v >= 0 ? v : 0
  }

  function showNotice(text: string) {
    setNotice(text)
    window.setTimeout(() => setNotice(null), 3000)
  }

  function pickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    e.target.value = ''
    if (file && !file.type.startsWith('image/')) {
      setError('Chagua faili la picha tu.')
      return
    }
    setError(null)
    setImageFile(file)
  }

  function removeImage() {
    setImageFile(null)
    setField('image_url', null)
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
    setImageFile(null)
    setError(null)
  }

  function openNew() {
    resetForm()
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelForm() {
    resetForm()
    setShowForm(false)
  }

  function startEdit(p: Item) {
    setEditingId(p.id)
    setForm(p)
    setImageFile(null)
    setError(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setError(null)

    if (!form.name || !form.name.trim()) {
      setError('Andika jina la bidhaa.')
      return
    }
    if (!form.selling_price || form.selling_price <= 0) {
      setError('Andika bei ya kuuzia (zaidi ya 0).')
      return
    }

    setSaving(true)
    try {
      let imageUrl: string | null = form.image_url ?? null
      if (imageFile) imageUrl = await uploadImage(imageFile)

      const payload: ProductForm = {
        ...form,
        name: form.name.trim(),
        image_url: imageUrl,
      }

      let productId: string | null = editingId
      if (editingId) {
        await productService.update(editingId, payload)
      } else {
        const saved: any = await productService.create(payload)
        productId = saved?.id ?? saved?.data?.id ?? null
        if (!productId && imageUrl) {
          const { data: found } = await supabase
            .from('products')
            .select('id')
            .eq('name', payload.name as string)
            .order('created_at', { ascending: false })
            .limit(1)
          productId = found?.[0]?.id ?? null
        }
      }

      // Make sure the image link is stored, whatever the service layer does.
      if (productId && (imageUrl !== null || editingId !== null)) {
        const { error: imgError } = await supabase
          .from('products')
          .update({ image_url: imageUrl })
          .eq('id', productId)
        if (imgError) {
          throw new Error(
            'Bidhaa imehifadhiwa lakini picha haikuunganishwa: ' + imgError.message,
          )
        }
      }

      const wasEditing = editingId !== null
      resetForm()
      if (wasEditing) setShowForm(false)
      showNotice(wasEditing ? 'Bidhaa imebadilishwa.' : 'Bidhaa imeongezwa.')
      await load()
    } catch (err: any) {
      setError(err?.message || 'Imeshindikana kuhifadhi bidhaa.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Una uhakika unataka kufuta bidhaa hii?')) return
    try {
      await productService.softDelete(id)
      await load()
    } catch (err: any) {
      setError(err?.message || 'Imeshindikana kufuta bidhaa.')
    }
  }

  const buying = form.buying_price ?? 0
  const selling = form.selling_price ?? 0
  const finalPreview = calcFinal(selling, form.discount_type, form.discount_value ?? 0)
  const profitPerUnit = finalPreview - buying
  const shownImage = preview ?? form.image_url ?? null

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex items-center justify-between lg:col-span-3">
        <h2 className="text-xl font-bold">Bidhaa ({items.length})</h2>
        {!showForm && (
          <button
            type="button"
            onClick={openNew}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white lg:hidden"
          >
            + Ongeza bidhaa
          </button>
        )}
      </div>

      {notice && (
        <p className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700 lg:col-span-3">
          {notice}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className={`${
          showForm ? 'block' : 'hidden'
        } space-y-3 rounded-xl border bg-white p-4 lg:order-2 lg:block`}
      >
        <h3 className="font-semibold">
          {editingId ? 'Badilisha bidhaa' : 'Ongeza bidhaa'}
        </h3>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Picha ya bidhaa</p>
          <div className="flex items-center gap-3">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-3xl">
              {shownImage ? (
                <img src={shownImage} alt="Picha ya bidhaa" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden="true">📷</span>
              )}
            </div>
            <div className="flex flex-col items-start gap-2">
              <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium">
                {shownImage ? 'Badilisha picha' : 'Chagua picha'}
                <input type="file" accept="image/*" onChange={pickImage} className="hidden" />
              </label>
              {shownImage && (
                <button type="button" onClick={removeImage} className="text-sm text-red-600">
                  Ondoa picha
                </button>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Picha inapunguzwa ukubwa yenyewe kabla ya kupakiwa.
          </p>
        </div>

        <Field label="Jina la bidhaa">
          <input
            required
            className={inputCls}
            placeholder="Mfano: Daftari Quire 4"
            value={form.name ?? ''}
            onChange={(e) => setField('name', e.target.value)}
          />
        </Field>

        <Field label="SKU (si lazima)">
          <input
            className={inputCls}
            value={form.sku ?? ''}
            onChange={(e) => setField('sku', e.target.value)}
          />
        </Field>

        <Field label="Barcode (si lazima)">
          <input
            className={inputCls}
            value={form.barcode ?? ''}
            onChange={(e) => setField('barcode', e.target.value)}
          />
        </Field>

        <Field label="Bei ya kununulia" hint="Ya siri. Inatumika kuhesabu profit.">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className={inputCls}
            placeholder="0"
            value={form.buying_price ? form.buying_price : ''}
            onChange={(e) => setField('buying_price', readNumber(e))}
          />
        </Field>

        <Field label="Bei ya kuuzia (kwa mteja)">
          <input
            required
            type="number"
            inputMode="numeric"
            min={1}
            className={inputCls}
            placeholder="0"
            value={form.selling_price ? form.selling_price : ''}
            onChange={(e) => setField('selling_price', readNumber(e))}
          />
        </Field>

        <Field label="Punguzo">
          <select
            className={inputCls}
            value={form.discount_type ?? 'NONE'}
            onChange={(e) =>
              setField('discount_type', e.target.value as Product['discount_type'])
            }
          >
            <option value="NONE">Hakuna punguzo</option>
            <option value="AMOUNT">Punguzo la kiasi (TZS)</option>
            <option value="PERCENT">Punguzo la asilimia (%)</option>
          </select>
        </Field>

        {form.discount_type && form.discount_type !== 'NONE' && (
          <Field label={form.discount_type === 'PERCENT' ? 'Asilimia ya punguzo' : 'Kiasi cha punguzo'}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              className={inputCls}
              placeholder="0"
              value={form.discount_value ? form.discount_value : ''}
              onChange={(e) => setField('discount_value', readNumber(e))}
            />
          </Field>
        )}

        {selling > 0 && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p>
              Bei ya mwisho: <span className="font-bold">{formatTZS(finalPreview)}</span>
            </p>
            <p className={profitPerUnit < 0 ? 'text-red-600' : 'text-green-700'}>
              Faida kwa kipande: {money(profitPerUnit)}
            </p>
          </div>
        )}

        <Field label="Stock ya awali">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            disabled={editingId !== null}
            className={inputCls}
            placeholder="0"
            value={form.current_stock ? form.current_stock : ''}
            onChange={(e) => setField('current_stock', readNumber(e))}
          />
        </Field>

        <Field label="Stock ya chini kabisa" hint="Ikifika hapa au chini, inaonyesha STOCK NDOGO.">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className={inputCls}
            value={form.minimum_stock ?? 0}
            onChange={(e) => setField('minimum_stock', readNumber(e))}
          />
        </Field>

        {editingId && (
          <p className="text-xs text-slate-500">
            Kubadilisha idadi ya stock, tumia ukurasa wa Stock.
          </p>
        )}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Inahifadhi...' : 'Hifadhi bidhaa'}
          </button>
          <button
            type="button"
            onClick={cancelForm}
            className="rounded-lg border border-slate-300 px-4 py-3 text-sm"
          >
            Ghairi
          </button>
        </div>
      </form>

      <section className="space-y-3 lg:order-1 lg:col-span-2">
        <input
          className={inputCls}
          placeholder="Tafuta bidhaa..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {loading ? (
          <p className="text-slate-500">Inapakia...</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border bg-white p-4 text-slate-500">
            {items.length === 0
              ? 'Hakuna bidhaa bado. Gusa "Ongeza bidhaa" kuanza.'
              : 'Hakuna bidhaa inayolingana na utafutaji.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border bg-white p-3">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl">
                    <span aria-hidden="true">📦</span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="text-sm">
                    <span className="font-semibold">{formatTZS(p.final_price)}</span>
                    {p.final_price !== p.selling_price && (
                      <s className="ml-2 text-slate-400">{formatTZS(p.selling_price)}</s>
                    )}
                  </p>
                  <p className="text-sm text-slate-600">
                    Stock: {p.current_stock}{' '}
                    {p.current_stock === 0 ? (
                      <span className="font-semibold text-red-600">HAKUNA STOCK</span>
                    ) : p.current_stock <= p.minimum_stock ? (
                      <span className="font-semibold text-amber-600">STOCK NDOGO</span>
                    ) : (
                      <span className="font-semibold text-green-600">STOCK IPO</span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="font-medium text-blue-600"
                  >
                    Badilisha
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="font-medium text-red-600"
                  >
                    Futa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
