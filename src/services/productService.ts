import { supabase } from '@/lib/supabase'
import type { Product } from '@/types'

export const productService = {
  async search(query: string, limit = 20) {
    let req = supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('name')
      .limit(limit)

    if (query.trim()) {
      // matches name, sku, or barcode server-side
      req = req.or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`)
    }
    const { data, error } = await req
    if (error) throw error
    return data as Product[]
  },

  async list(page = 0, pageSize = 25) {
    const { data, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order('name')
      .range(page * pageSize, page * pageSize + pageSize - 1)
    if (error) throw error
    return { data: data as Product[], count: count ?? 0 }
  },

  async create(payload: Partial<Product>) {
    const { data, error } = await supabase.from('products').insert(payload).select().single()
    if (error) throw error
    return data as Product
  },

  async update(id: string, payload: Partial<Product>) {
    const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data as Product
  },

  async softDelete(id: string) {
    const { error } = await supabase.from('products').update({ active: false }).eq('id', id)
    if (error) throw error
  },
}
