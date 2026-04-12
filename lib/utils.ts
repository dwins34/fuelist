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
export function getImageUrl(url: string) {
  if (!url) return ""

  // Handle Google Drive links
  if (url.includes("drive.google.com")) {
    const match = url.match(/\/d\/(.*?)\//)
    const fileId = match?.[1]

    if (fileId) {
      return `https://drive.google.com/uc?export=view&id=${fileId}`
    }
  }

  return url
}