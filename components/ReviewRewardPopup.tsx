'use client'

import { useState } from 'react'

interface ReviewRewardPopupProps {
  onClose: () => void
  isLoggedIn: boolean
  googleReviewUrl?: string
}

type PopupStep = 'nudge' | 'confirm' | 'done' | 'already_claimed'

const GOOGLE_REVIEW_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL ?? '#'

export default function ReviewRewardPopup({
  onClose,
  isLoggedIn,
  googleReviewUrl = GOOGLE_REVIEW_URL,
}: ReviewRewardPopupProps) {
  const [step, setStep]       = useState<PopupStep>('nudge')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  function handleReviewClick() {
    window.open(googleReviewUrl, '_blank', 'noopener,noreferrer')
    setStep('confirm')
  }

  async function handleClaimReward() {
    if (!isLoggedIn) {
      setError('Please sign in to claim your reward.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/rewards/claim-review', { method: 'POST' })
      const data = await res.json()

      if (res.status === 409 || data.already_claimed) {
        setStep('already_claimed')
        return
      }
      if (!res.ok) {
        setError(data.error ?? 'Could not claim reward. Try again.')
        return
      }
      setStep('done')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* ── Step: nudge ── */}
        {step === 'nudge' && (
          <>
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 px-6 pt-6 pb-4 text-center">
              <div className="text-4xl mb-2">🌟</div>
              <h2 className="text-lg font-extrabold text-gray-900">
                Enjoying your meal?
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Leave us a Google review and earn{' '}
                <span className="font-bold text-amber-600">+20 reward points</span>!
              </p>
            </div>

            <div className="px-6 py-4 space-y-3">
              <button
                onClick={handleReviewClick}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#4285F4] px-5 py-3 text-sm font-bold text-white hover:bg-[#3574e2] active:scale-95 transition-all shadow-md shadow-blue-100"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm.14 19.018c-3.868 0-7-3.14-7-7.018 0-3.878 3.132-7.018 7-7.018 1.89 0 3.47.697 4.682 1.829l-1.974 1.978v-.004c-.735-.702-1.667-1.062-2.708-1.062-2.31 0-4.187 1.956-4.187 4.273 0 2.315 1.877 4.277 4.187 4.277 2.096 0 3.522-1.202 3.816-2.852H12.14v-2.737h6.585c.088.47.135.96.135 1.474 0 4.01-2.677 6.86-6.72 6.86z" />
                </svg>
                Review on Google
              </button>

              <button
                onClick={onClose}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </>
        )}

        {/* ── Step: confirm ── */}
        {step === 'confirm' && (
          <>
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="text-4xl mb-2">✍️</div>
              <h2 className="text-lg font-extrabold text-gray-900">Did you leave a review?</h2>
              <p className="mt-1 text-sm text-gray-500">
                Once you&apos;ve submitted your Google review, claim your{' '}
                <span className="font-bold text-amber-600">20 reward points</span>.
              </p>
            </div>

            {error && <p className="px-6 text-center text-xs text-red-500 mb-2">{error}</p>}

            <div className="px-6 pb-5 space-y-2">
              <button
                onClick={handleClaimReward}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-5 py-3 text-sm font-bold text-white hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : 'Yes, claim my 20 points!'}
              </button>

              <button
                onClick={() => setStep('nudge')}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
              >
                Go back
              </button>
            </div>
          </>
        )}

        {/* ── Step: done ── */}
        {step === 'done' && (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="text-5xl">🎁</div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">+20 Points Added!</h2>
              <p className="mt-1 text-sm text-gray-500">
                Thanks for your review. Points are now in your account and can be redeemed on your next order.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-full bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors"
            >
              Awesome, thanks!
            </button>
          </div>
        )}

        {/* ── Step: already claimed ── */}
        {step === 'already_claimed' && (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="text-5xl">⭐</div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">Already Claimed</h2>
              <p className="mt-1 text-sm text-gray-500">
                You&apos;ve already earned your review reward. Thanks for the kind words!
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-full bg-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
