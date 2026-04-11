import { CartItem } from '@/types'
import { formatPrice } from './utils'

const WHATSAPP_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? '919999999999'

export interface DeliveryAddress {
  name: string
  phone: string
  address_line1: string
  address_line2?: string
  city: string
  state?: string
  pincode: string
  landmark?: string
}

export function buildWhatsAppMessage(items: CartItem[], total: number, address?: DeliveryAddress): string {
  const lines = items.map(
    (ci) => `• ${ci.quantity}x ${ci.item.name} — ${formatPrice(ci.item.price * ci.quantity)}`
  )

  const addressLines = address ? [
    '',
    '📍 Delivery address:',
    `Name: ${address.name}`,
    `Phone: ${address.phone}`,
    address.address_line1,
    address.address_line2 ? address.address_line2 : null,
    `${address.city}${address.state ? ', ' + address.state : ''} — ${address.pincode}`,
    address.landmark ? `Landmark: ${address.landmark}` : null,
  ].filter(Boolean) : []

  return [
    'Hi Fuelist! I want to order:',
    '',
    ...lines,
    '',
    `Total: ${formatPrice(total)}`,
    ...addressLines,
    '',
    'Please confirm my order. Thank you! 🙏',
  ].join('\n')
}

export function whatsAppOrderUrl(items: CartItem[], total: number, address?: DeliveryAddress): string {
  const message = buildWhatsAppMessage(items, total, address)
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`
}

export function whatsAppSingleItemUrl(name: string, price: number): string {
  const message = [
    `Hi Fuelist! I'm interested in ordering:`,
    '',
    `• 1x ${name} — ${formatPrice(price)}`,
    '',
    'Please confirm availability. Thank you! 🙏',
  ].join('\n')
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`
}
