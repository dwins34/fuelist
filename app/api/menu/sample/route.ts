import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const SAMPLE_ROWS = [
  {
    name:          'Mango Bliss Bowl',
    category:      'fruit',
    price:         249,
    calories:      320,
    protein:       8,
    carbs:         55,
    fats:          6,
    ingredients:   'Mango, Banana, Granola, Honey, Coconut Flakes',
    image_url:     'https://images.unsplash.com/photo-1560717789-0ac7c58ac90a',
    is_available:  'true',
    is_bestseller: 'false',
  },
  {
    name:          'Power Protein Bowl',
    category:      'power',
    price:         349,
    calories:      480,
    protein:       32,
    carbs:         40,
    fats:          12,
    ingredients:   'Chicken, Quinoa, Spinach, Avocado, Lemon',
    image_url:     '',
    is_available:  'true',
    is_bestseller: 'true',
  },
]

const NOTES = [
  ['Field notes:'],
  ['name', 'Required. Any text.'],
  ['category', 'Required. Must be one of: fruit, breakfast, power'],
  ['price', 'Required. Number (e.g. 249 or 249.50)'],
  ['calories', 'Number. Leave blank for 0.'],
  ['protein / carbs / fats', 'Numbers in grams. Leave blank for 0.'],
  ['ingredients', 'Comma-separated list (e.g. Mango, Banana, Granola)'],
  ['image_url', 'Full URL or leave blank.'],
  ['is_available', 'true / false / yes / no. Defaults to true.'],
  ['is_bestseller', 'true / false / yes / no. Defaults to false.'],
]

export async function GET() {
  const wb = XLSX.utils.book_new()

  // Sheet 1: data template
  const ws = XLSX.utils.json_to_sheet(SAMPLE_ROWS)

  // Set column widths
  ws['!cols'] = [
    { wch: 24 }, // name
    { wch: 12 }, // category
    { wch: 8 },  // price
    { wch: 10 }, // calories
    { wch: 9 },  // protein
    { wch: 8 },  // carbs
    { wch: 8 },  // fats
    { wch: 40 }, // ingredients
    { wch: 40 }, // image_url
    { wch: 14 }, // is_available
    { wch: 14 }, // is_bestseller
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Menu Items')

  // Sheet 2: instructions
  const notesWs = XLSX.utils.aoa_to_sheet(NOTES)
  notesWs['!cols'] = [{ wch: 24 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, notesWs, 'Instructions')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="fuelist-menu-template.xlsx"',
    },
  })
}
