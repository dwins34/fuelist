'use client'

interface RewardPointsToggleProps {
  availablePoints: number
  orderAmount: number       // amount before points are applied
  pointsToUse: number       // currently selected points
  onChange: (points: number) => void
}

const MAX_REDEEM_FRACTION = 0.5   // mirrors server constant

export default function RewardPointsToggle({
  availablePoints,
  orderAmount,
  pointsToUse,
  onChange,
}: RewardPointsToggleProps) {
  if (availablePoints <= 0) return null

  const maxRedeemable = Math.min(
    availablePoints,
    Math.floor(orderAmount * MAX_REDEEM_FRACTION),
  )
  const isApplied = pointsToUse > 0

  function toggle() {
    onChange(isApplied ? 0 : maxRedeemable)
  }

  return (
    <div className={`rounded-xl border px-4 py-3 transition-colors ${
      isApplied
        ? 'border-amber-300 bg-amber-50'
        : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base">⭐</span>
          <div>
            <p className={`text-sm font-semibold ${isApplied ? 'text-amber-800' : 'text-gray-700'}`}>
              Reward Points
            </p>
            <p className={`text-xs ${isApplied ? 'text-amber-600' : 'text-gray-500'}`}>
              {isApplied
                ? `${pointsToUse} pts = ₹${pointsToUse} off`
                : `You have ${availablePoints} pts · up to ₹${maxRedeemable} off`}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          type="button"
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isApplied ? 'bg-amber-500' : 'bg-gray-300'
          }`}
          role="switch"
          aria-checked={isApplied}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
              isApplied ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
