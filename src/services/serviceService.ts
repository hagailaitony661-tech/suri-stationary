import { supabase } from '@/lib/supabase'
import type { Service } from '@/types'

export const serviceService = {
  async search(query: string, limit = 20) {
    let req = supabase.from('services').select('*').eq('active', true).order('name').limit(limit)
    if (query.trim()) req = req.ilike('name', `%${query}%`)
    const { data, error } = await req
    if (error) throw error
    return data as Service[]
  },

  async list() {
    const { data, error } = await supabase.from('services').select('*').order('name')
    if (error) throw error
    return data as Service[]
  },

  async create(payload: Partial<Service>) {
    const { data, error } = await supabase.from('services').insert(payload).select().single()
    if (error) throw error
    return data as Service
  },

  async update(id: string, payload: Partial<Service>) {
    const { data, error } = await supabase.from('services').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data as Service
  },

  async softDelete(id: string) {
    const { error } = await supabase.from('services').update({ active: false }).eq('id', id)
    if (error) throw error
  },
}
