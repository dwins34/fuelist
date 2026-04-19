import { Category } from '@/types'

export function formatPrice(price: number): string {
  return `₹${price.toFixed(0)}`
}

export function categoryLabel(category: Category): string {
  const labels: Record<Category, string> = {
    fruit: 'Fruit Bowls',
    breakfast: 'Breakfast Bowls',
    power: 'Power Bowls',
    shakes: 'Muscle Blends',
    craft_juices: 'Craft Juices',
  }
  return labels[category]
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
export function getImageUrl(url: string, width = 400) {
  if (!url) return ""

  if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
    // Extract file ID from any Drive URL pattern:
    // /file/d/FILE_ID/view  OR  ?id=FILE_ID  OR  /d/FILE_ID
    const match =
      url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
      url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    const fileId = match?.[1]
    if (fileId) {
      // lh3.googleusercontent.com serves Drive images publicly without auth
      return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`
    }
  }

  return url
}

/**
 * Returns today's date in YYYY-MM-DD format using IST (+5:30)
 */
export function getTodayStrIST(): string {
  const date = new Date()
  // IST is UTC + 5:30
  const istOffset = 5.5 * 60 * 60 * 1000
  const istDate = new Date(date.getTime() + istOffset)
  return istDate.toISOString().split('T')[0]
}