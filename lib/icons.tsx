import React from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  ShoppingBag, 
  LogOut, 
  BarChart3, 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Menu,
  X,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Loader2,
  Home,
  Briefcase,
  Compass,
  Star,
  Settings,
  ShieldCheck,
  CreditCard,
  Gift,
  HelpCircle,
  Salad,
  Package,
  ChefHat,
  Truck,
  ClipboardList,
  Leaf,
  Zap,
  Search,
  Pencil,
  Upload,
  Download,
  AlertTriangle,
  Users,
  CheckCircle,
  Pause,
  MessageCircle
} from 'lucide-react'

/**
 * Global Icon Registry for Fuelist
 * Standardizes stroke width, sizing, and style across the application.
 */
export const ICONS = {
  // Navigation & User
  user: User,
  mail: Mail,
  phone: Phone,
  role: ShieldCheck,
  logout: LogOut,
  settings: Settings,
  dashboard: BarChart3,
  
  // Account & Rewards
  points: Sparkles,
  rewards: Gift,
  security: Lock,
  subscriptions: ShoppingBag,
  cart: ShoppingBag,
  shoppingBag: ShoppingBag,
  billing: CreditCard,
  
  // Location & Address
  location: MapPin,
  home: Home,
  work: Briefcase,
  other: Compass,
  compass: Compass,
  
  // Status & Feedback
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: HelpCircle,
  star: Star,
  
  // Actions & UI
  arrowRight: ArrowRight,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  menu: Menu,
  close: X,
  plus: Plus,
  delete: Trash2,
  calendar: Calendar,
  time: Clock,
  bowl: Salad,
  package: Package,
  preparing: ChefHat,
  shipping: Truck,
  received: ClipboardList,
  leaf: Leaf,
  zap: Zap,
  search: Search,
  edit: Pencil,
  upload: Upload,
  download: Download,
  spinner: Loader2,
  users: Users,
  checkCircle: CheckCircle,
  pause: Pause,
  whatsapp: MessageCircle,
} as const

export type IconName = keyof typeof ICONS

interface IconProps extends React.ComponentPropsWithoutRef<'svg'> {
  name: IconName
  size?: number | string
  strokeWidth?: number
}

/**
 * Standardized Icon component to enforce design system rules.
 */
export function Icon({ 
  name, 
  size = 20, 
  strokeWidth = 1.5, 
  className, 
  ...props 
}: IconProps) {
  const IconComponent = ICONS[name]
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in registry.`)
    return null
  }

  return (
    <IconComponent 
      size={size} 
      strokeWidth={strokeWidth} 
      className={className}
      aria-hidden="true"
      {...props} 
    />
  )
}
