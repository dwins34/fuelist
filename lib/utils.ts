import { Category } from '@/types'

export function formatPrice(price: number): string {
  return `₹${price.toFixed(0)}`
}

export function categoryLabel(category: Category): string {
  const labels: Record<Category, string> = {
    fruit: 'Fruit Bowls',
    breakfast: 'Breakfast Bowls',
    power: 'Power Bowls',
  }
  return labels[category]
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
