import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-green-50 to-white px-4 text-center">
      <div className="text-7xl mb-6">🥗</div>
      <h1 className="text-4xl font-extrabold text-gray-900 mb-3">404 — Bowl Not Found</h1>
      <p className="text-gray-500 text-lg mb-8 max-w-md">
        Looks like this page got eaten. Let&apos;s get you back to something delicious.
      </p>
      <Link href="/">
        <Button size="lg">Back to Home</Button>
      </Link>
    </div>
  )
}
