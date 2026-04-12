// ─────────────────────────────────────────────────────────────────────────────
// Service Area Configuration
// Add or remove pincodes here as coverage expands.
// ─────────────────────────────────────────────────────────────────────────────

export const SERVICE_AREA_NAME = 'Ghaziabad'
export const SERVICE_AREA_DESCRIPTION = 'Ghaziabad, Uttar Pradesh (Delhi NCR)'

/**
 * Valid delivery pincodes.
 * Grouped by locality for easy maintenance.
 */
const VALID_PINCODES = new Set<string>([
  // ── Ghaziabad City ──────────────────────────────────────────────────────
  '201001', // Ghaziabad HO
  // '201002', // Navyug Market
  // '201003', // Sahibabad
  // '201004', // Raj Nagar
  // '201005', // Pratap Vihar
  // '201006', // Vasundhara
  // '201007', // Indirapuram
  // '201008', // Crossing Republik
  // '201009', // Vaishali
  // '201010', // Kaushambi
  // '201011', // Sanjay Nagar
  // '201012', // Govindpuram
  // '201013', // Shastri Nagar
  // '201014', // Gandhi Nagar
  // '201015', // Vijay Nagar
  // '201016', // Mohan Nagar
  // '201017', // Lajpat Nagar
  // '201018', // Arthala
  // '201019', // Nandgram
  // '201020', // Naya Ganj

  // // ── Ghaziabad Extended ──────────────────────────────────────────────────
  // '201102', // Hapur Road / Pilkhuwa
  // '201204', // Muradnagar
  // '201206', // Loni
])

/**
 * Returns true if the given pincode is within the delivery service area.
 * Trims whitespace before checking.
 */
export function isInServiceArea(pincode: string): boolean {
  return VALID_PINCODES.has(pincode.trim())
}

/**
 * Human-readable list of served areas shown to users.
 */
export const SERVED_AREAS = [
  'Nehru Nagar',
  'Raj Nagar',
  'Ashok Nagar',
  'Nandgram',
  'Vijay Nagar',
  'Crossing Republik',
]
