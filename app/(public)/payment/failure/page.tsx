import Link from 'next/link'

export default function PaymentFailurePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-red-100 p-6 mb-6">
        <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Payment Failed</h1>
      <p className="text-gray-500 max-w-sm mb-8">
        Something went wrong while verifying your payment. If money was deducted, it will be
        refunded automatically within 5–7 business days. Please try again.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/menu"
          className="rounded-full bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors"
        >
          Try again
        </Link>
        <Link
          href="/"
          className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
