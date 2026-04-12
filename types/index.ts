export type Role = 'admin' | 'kitchen' | 'delivery' | 'user'

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
export type Category = 'fruit' | 'breakfast' | 'power'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: Role
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

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface Order {
  id: string
  user_id: string | null
  items: CartItem[]
  total_price: number
  status: OrderStatus
  whatsapp_message: string
  created_at: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}
