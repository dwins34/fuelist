'use client'

import { motion } from 'framer-motion'
import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'

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

  // Calculate maximum redeemable points (1 point = 1 INR)
  // Limited by available points and 50% of order value
  const maxRedeemable = Math.min(
    availablePoints,
    Math.floor(orderAmount * MAX_REDEEM_FRACTION),
  )
  const isApplied = pointsToUse > 0

  function toggle() {
    onChange(isApplied ? 0 : maxRedeemable)
  }

  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={toggle}
      className={cn(
        "cursor-pointer rounded-[1.5rem] border px-6 py-4 flex items-center justify-between transition-all duration-300",
        isApplied
          ? "border-amber-500 bg-amber-50 shadow-sm"
          : "border-stone-100 bg-stone-50 hover:bg-stone-100/80"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm",
          isApplied ? "bg-amber-500 text-white" : "bg-white text-stone-300 border border-stone-100"
        )}>
          <Icon name="points" size={18} strokeWidth={3} />
        </div>
        
        <div className="flex flex-col leading-none">
          <p className={cn(
            "text-sm font-black tracking-tight mb-0.5",
            isApplied ? "text-amber-700" : "text-stone-900"
          )}>
            {availablePoints} Points
          </p>
          <p className={cn(
            "text-[10px] font-black capitalize tracking-widest",
            isApplied ? "text-amber-600" : "text-stone-400"
          )}>
             {isApplied 
               ? `Redeeming ₹${pointsToUse}` 
               : `Save ₹${maxRedeemable} now`
             }
          </p>
        </div>
      </div>

      <div
        className={cn(
          "relative h-6 w-11 rounded-full p-1 transition-colors duration-300 shadow-inner",
          isApplied ? "bg-amber-500" : "bg-stone-200"
        )}
      >
        <motion.div
            initial={false}
            animate={{ x: isApplied ? 20 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="h-4 w-4 rounded-full bg-white shadow-sm flex items-center justify-center"
        >
          {isApplied && <Icon name="success" size={10} strokeWidth={4} className="text-amber-500" />}
        </motion.div>
      </div>
    </motion.div>
  )
}
