import { CartItem } from '@/types'
import { formatPrice } from './utils'

const WHATSAPP_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? '919999999999'

export function buildWhatsAppMessage(items: CartItem[], total: number): string {
  const lines = items.map(
    (ci) => `• ${ci.quantity}x ${ci.item.name} — ${formatPrice(ci.item.price * ci.quantity)}`
  )
  return [
    'Hi Fuelist! I want to order:',
    '',
    ...lines,
    '',
    `Total: ${formatPrice(total)}`,
    '',
    'Please confirm my order. Thank you! 🙏',
  ].join('\n')
}

export function whatsAppOrderUrl(items: CartItem[], total: number): string {
  const message = buildWhatsAppMessage(items, total)
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
