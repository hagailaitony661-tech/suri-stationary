import { supabase } from '@/lib/supabase'
import type { CartLine, PaymentMethod, Sale } from '@/types'

export function makeIdempotencyKey() {
  // Stable unique key generated client-side so retries/duplicates (double-click,
  // offline sync replays) never create two sales for the same attempt.
  return crypto.randomUUID()
}

export const salesService = {
  async completeSale(params: {
    items: CartLine[]
    paymentMethod: PaymentMethod
    customerName?: string
    customerPhone?: string
    idempotencyKey: string
  }) {
    const p_items = params.items.map((l) => ({
      product_id: l.product_id ?? null,
      service_id: l.service_id ?? null,
      quantity: l.quantity,
      discount: l.discount,
    }))

    const { data, error } = await supabase.rpc('process_sale', {
      p_items,
      p_payment_method: params.paymentMethod,
      p_idempotency_key: params.idempotencyKey,
      p_customer_name: params.customerName ?? null,
      p_customer_phone: params.customerPhone ?? null,
    })
    if (error) throw error
    return data as Sale
  },

  async cancelSale(saleId: string) {
    const { data, error } = await supabase.rpc('cancel_sale', { p_sale_id: saleId })
    if (error) throw error
    return data as Sale
  },

  async listRecent(limit = 20) {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data as Sale[]
  },

  async dashboardSummary(date?: string) {
    const { data, error } = await supabase.rpc('get_dashboard_summary', date ? { p_date: date } : {})
    if (error) throw error
    return data
  },
}
