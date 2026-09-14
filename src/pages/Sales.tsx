import { useEffect, useState } from 'react'
import { productService } from '@/services/productService'
import { serviceService } from '@/services/serviceService'
import { salesService, makeIdempotencyKey } from '@/services/salesService'
import { useCart } from '@/store/CartContext'
import type { PaymentMethod, Product, Service } from '@/types'
import { formatTZS } from '@/utils/format'
import { Plus, Minus, Trash2 } from 'lucide-react'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MOBILE_MONEY', label: 'M-Pesa / Mobile Money' },
  { value: 'BANK', label: 'Benki' },
  { value: 'OTHER', label: 'Nyingine' },
]

export default function Sales() {
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [payment, setPayment] = useState<PaymentMethod>('CASH')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [idKey, setIdKey] = useState(makeIdempotencyKey())

  const cart = useCart()

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setProducts([])
        setServices([])
        return
      }
      try {
        const [p, s] = await Promise.all([productService.search(query), serviceService.search(query)])
        setProducts(p)
        setServices(s)
      } catch {
        // offline or error: silently keep old results
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  async function handleCheckout() {
    if (checkingOut || cart.lines.length === 0) return
    setCheckingOut(true)
    setMessage(null)
    try {
      await salesService.completeSale({
        items: cart.lines,
        paymentMethod: payment,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        idempotencyKey: idKey,
      })
      setMessage({ type: 'ok', text: 'MAUZO YAMEKAMILIKA' })
      cart.clear()
      setCustomerName('')
      setCustomerPhone('')
      setIdKey(makeIdempotencyKey())
    } catch (e: any) {
      setMessage({ type: 'err', text: e?.message || 'Haiwezekani kukamilisha mauzo. Angalia internet au jaribu tena.' })
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-3">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tafuta bidhaa au huduma..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg focus:border-brand-accent focus:outline-none"
        />

        {(products.length > 0 || services.length > 0) && (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto rounded-xl border bg-white p-2">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => cart.addProduct(p)}
                disabled={p.current_stock <= 0}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-40"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    Stock: {p.current_stock} {p.current_stock <= p.minimum_stock && p.current_stock > 0 && '• STOCK NDOGO'}
                    {p.current_stock === 0 && '• HAKUNA STOCK'}
                  </p>
                </div>
                <span className="font-semibold text-brand-accent">{formatTZS(p.final_price)}</span>
              </button>
            ))}
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => cart.addService(s)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50"
              >
                <p className="font-medium">{s.name} <span className="text-xs text-slate-400">(Huduma)</span></p>
                <span className="font-semibold text-brand-accent">{formatTZS(s.final_price)}</span>
              </button>
            ))}
          </div>
        )}
        {query && products.length === 0 && services.length === 0 && (
          <p className="text-sm text-slate-400">Hakuna kilichopatikana.</p>
        )}
      </div>

      <div className="space-y-3 rounded-xl border bg-white p-4">
        <h3 className="font-semibold">Kikapu</h3>
        {cart.lines.length === 0 && <p className="text-sm text-slate-400">Hakuna bidhaa kwenye kikapu.</p>}
        <div className="space-y-2">
          {cart.lines.map((l) => (
            <div key={l.key} className="flex items-center justify-between gap-2 border-b pb-2 text-sm">
              <div className="flex-1">
                <p className="font-medium">{l.name}</p>
                <p className="text-xs text-slate-500">{formatTZS(l.unit_price)} x {l.quantity} = {formatTZS(l.unit_price * l.quantity - l.discount)}</p>
              </div>
              <button onClick={() => cart.updateQuantity(l.key, l.quantity - 1)} className="rounded bg-slate-100 p-1"><Minus size={14} /></button>
              <span className="w-5 text-center">{l.quantity}</span>
              <button onClick={() => cart.updateQuantity(l.key, l.quantity + 1)} className="rounded bg-slate-100 p-1"><Plus size={14} /></button>
              <button onClick={() => cart.removeLine(l.key)} className="rounded bg-red-50 p-1 text-red-600"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <div className="space-y-1 border-t pt-2 text-sm">
          <div className="flex justify-between"><span>Jumla ndogo</span><span>{formatTZS(cart.subtotal)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>{formatTZS(cart.totalDiscount)}</span></div>
          <div className="flex justify-between text-base font-bold"><span>Jumla kuu</span><span>{formatTZS(cart.total)}</span></div>
        </div>

        <input
          placeholder="Jina la mteja (si lazima)"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <input
          placeholder="Simu ya mteja (si lazima)"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />

        <select value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod)} className="w-full rounded-lg border px-3 py-2 text-sm">
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {message && (
          <p className={message.type === 'ok' ? 'text-sm font-semibold text-green-600' : 'text-sm font-semibold text-red-600'}>
            {message.text}
          </p>
        )}

        <button
          onClick={handleCheckout}
          disabled={checkingOut || cart.lines.length === 0}
          className="w-full rounded-lg bg-brand-accent py-3 font-bold text-white disabled:opacity-40"
        >
          {checkingOut ? 'INACHAKATA...' : 'KAMILISHA MAUZO'}
        </button>
      </div>
    </div>
  )
}
