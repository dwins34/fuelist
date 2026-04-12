export type Role = 'admin' | 'kitchen' | 'delivery' | 'user'

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
export type Category = 'fruit' | 'breakfast' | 'power'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: Role
  reward_points?: number
}

export interface MenuItem {
  id: string
  name: string
  category: Category
  price: number
  calories: number
  protein: number
  carbs: number
  fats: number
  ingredients: string[]
  image_url: string
  is_available: boolean
  is_bestseller: boolean
  created_at: string
}

export type CreateMenuItemInput = Omit<MenuItem, 'id' | 'created_at'>

export type UpdateMenuItemInput = Partial<CreateMenuItemInput>

export interface CartItem {
  item: MenuItem
  quantity: number
}

export interface Order {
  id: string
  user_id: string | null
  items: CartItem[]
  total_price: number
  total_amount: number
  status: OrderStatus
  whatsapp_message: string
  payment_status: string
  payment_id: string | null
  coupon_id: string | null
  discount_amount: number
  reward_points_used: number
  reward_points_earned: number
  created_at: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}

// ── Coupon ────────────────────────────────────────────────────────────────────

export type DiscountType = 'flat' | 'percentage'

export interface Coupon {
  id: string
  code: string
  discount_type: DiscountType
  discount_value: number
  min_order_amount: number
  max_discount: number | null
  expiry_date: string | null
  usage_limit: number | null
  used_count: number
  is_active: boolean
  is_first_order_only: boolean
  per_user_limit: number
  applicable_user_ids: string[] | null
  created_at: string
}

export interface ApplyCouponResult {
  valid: boolean
  coupon?: Coupon
  discount_amount: number
  error?: string
  is_first_order?: boolean
}

// ── Rewards ───────────────────────────────────────────────────────────────────

export type RewardType = 'order_earn' | 'order_redeem' | 'review' | 'referral' | 'admin'

export interface UserRewardLog {
  id: string
  user_id: string
  type: RewardType
  points_change: number
  description: string | null
  order_id: string | null
  created_at: string
}
