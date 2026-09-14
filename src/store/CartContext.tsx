import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { CartLine, Product, Service } from '@/types'

interface CartState {
  lines: CartLine[]
  addProduct: (p: Product) => void
  addService: (s: Service) => void
  updateQuantity: (key: string, quantity: number) => void
  removeLine: (key: string) => void
  clear: () => void
  subtotal: number
  totalDiscount: number
  total: number
}

const CartContext = createContext<CartState | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])

  function addProduct(p: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product_id === p.id)
      if (existing) {
        if (existing.quantity + 1 > (p.current_stock ?? Infinity)) return prev
        return prev.map((l) => (l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l))
      }
      if (p.current_stock <= 0) return prev
      return [
        ...prev,
        {
          key: `p_${p.id}`,
          product_id: p.id,
          name: p.name,
          unit_price: p.final_price,
          quantity: 1,
          discount: 0,
          max_stock: p.current_stock,
        },
      ]
    })
  }

  function addService(s: Service) {
    setLines((prev) => {
      const existing = prev.find((l) => l.service_id === s.id)
      if (existing) return prev.map((l) => (l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l))
      return [
        ...prev,
        { key: `s_${s.id}`, service_id: s.id, name: s.name, unit_price: s.final_price, quantity: 1, discount: 0 },
      ]
    })
  }

  function updateQuantity(key: string, quantity: number) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l
        const q = Math.max(1, l.max_stock ? Math.min(quantity, l.max_stock) : quantity)
        return { ...l, quantity: q }
      })
    )
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  function clear() {
    setLines([])
  }

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.unit_price * l.quantity, 0), [lines])
  const totalDiscount = useMemo(() => lines.reduce((s, l) => s + l.discount, 0), [lines])
  const total = subtotal - totalDiscount

  return (
    <CartContext.Provider
      value={{ lines, addProduct, addService, updateQuantity, removeLine, clear, subtotal, totalDiscount, total }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart lazima itumike ndani ya CartProvider')
  return ctx
}
