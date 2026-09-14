export type Role = 'ADMIN' | 'STAFF'
export type ProfileStatus = 'ACTIVE' | 'DISABLED'

export interface Profile {
  id: string
  auth_user_id: string
  full_name: string
  email: string
  phone: string | null
  role: Role
  status: ProfileStatus
  avatar_url: string | null
}

export interface Category {
  id: string
  name: string
  description: string | null
}

export type DiscountType = 'NONE' | 'AMOUNT' | 'PERCENT'

export interface Product {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  category_id: string | null
  description: string | null
  buying_price: number
  selling_price: number
  discount_type: DiscountType
  discount_value: number
  final_price: number
  current_stock: number
  minimum_stock: number
  image_url: string | null
  active: boolean
}

export interface Service {
  id: string
  name: string
  category: string | null
  description: string | null
  buying_cost: number
  selling_price: number
  discount_type: DiscountType
  discount_value: number
  final_price: number
  active: boolean
}

export interface CartLine {
  key: string
  product_id?: string
  service_id?: string
  name: string
  unit_price: number
  quantity: number
  discount: number
  max_stock?: number
}

export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK' | 'OTHER'

export interface Sale {
  id: string
  transaction_number: string
  staff_id: string
  customer_name: string | null
  customer_phone: string | null
  subtotal: number
  discount: number
  total: number
  payment_method: PaymentMethod
  total_profit: number
  status: 'COMPLETED' | 'CANCELLED' | 'PENDING'
  created_at: string
}

export interface DashboardSummary {
  total_sales: number
  total_profit: number
  transaction_count: number
  products_sold: number
  target: number | null
  default_target: number
  low_stock_count: number
  out_of_stock_count: number
}
