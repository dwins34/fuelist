import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const VALID_CATEGORIES = ['fruit', 'breakfast', 'power', 'shakes', 'craft_juices'] as const
type Category = typeof VALID_CATEGORIES[number]

interface RowInput {
  name?: unknown
  category?: unknown
  price?: unknown
  calories?: unknown
  protein?: unknown
  carbs?: unknown
  fats?: unknown
  ingredients?: unknown
  image_url?: unknown
  is_available?: unknown
  is_bestseller?: unknown
}

function parseBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return ['true', 'yes', '1'].includes(v.trim().toLowerCase())
  return true // default available
}

function parseRow(raw: RowInput, idx: number) {
  const errors: string[] = []

  const name = typeof raw.name === 'string' ? raw.name.trim() : String(raw.name ?? '').trim()
  if (!name) errors.push('name is required')

  const category = typeof raw.category === 'string' ? raw.category.trim().toLowerCase() : ''
  if (!VALID_CATEGORIES.includes(category as Category))
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`)

  const price = parseFloat(String(raw.price ?? ''))
  if (isNaN(price) || price <= 0 || price > 10000) errors.push('price must be between ₹1 and ₹10,000')

  const calories = parseInt(String(raw.calories ?? '0')) || 0
  const protein  = parseFloat(String(raw.protein  ?? '0')) || 0
  const carbs    = parseFloat(String(raw.carbs    ?? '0')) || 0
  const fats     = parseFloat(String(raw.fats     ?? '0')) || 0

  const ingredientsRaw = typeof raw.ingredients === 'string' ? raw.ingredients : String(raw.ingredients ?? '')
  const ingredients = ingredientsRaw.split(',').map((s) => s.trim()).filter(Boolean)

  const image_url    = typeof raw.image_url === 'string' ? raw.image_url.trim() : ''
  const is_available  = parseBoolean(raw.is_available)
  const is_bestseller = parseBoolean(raw.is_bestseller ?? false)

  return { errors, item: { name, category, price, calories, protein, carbs, fats, ingredients, image_url, is_available, is_bestseller } }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth + admin check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Parse multipart file
  const formData = await request.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
  }

  const buffer = Buffer.from(await (file as File).arrayBuffer())
  let rows: RowInput[]
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json<RowInput>(sheet, { defval: '' })
  } catch {
    return NextResponse.json({ error: 'Could not parse the file. Make sure it is a valid .xlsx file.' }, { status: 400 })
  }

  if (!rows.length) {
    return NextResponse.json({ error: 'The file is empty — no rows found.' }, { status: 400 })
  }

  // Validate all rows first
  const validationErrors: string[] = []
  const items: ReturnType<typeof parseRow>['item'][] = []

  rows.forEach((raw, i) => {
    const { errors, item } = parseRow(raw, i)
    if (errors.length) {
      validationErrors.push(`Row ${i + 2}: ${errors.join(', ')}`)
    } else {
      items.push(item)
    }
  })

  if (validationErrors.length) {
    return NextResponse.json({ error: 'Validation failed', details: validationErrors }, { status: 422 })
  }

  // Bulk insert
  const { data, error } = await supabase.from('menu_items').insert(items).select()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ inserted: data?.length ?? items.length, items: data }, { status: 201 })
}
