import Link from 'next/link'
import { Leaf } from 'lucide-react'

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
)

// Twitter and LinkedIn icons removed as per request

const FOOTER_LINKS = [
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' }
    ]
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact Us', href: '/contact' }
    ]
  },
  {
    title: 'Discover',
    links: [
      { label: 'Rewards', href: '/account' },
      { label: 'Menu', href: '/menu' },
      { label: 'Subscriptions', href: '/subscriptions' }
    ]
  }
]

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Section */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <Leaf className="h-8 w-8 text-green-500 fill-green-500" />
              <span className="text-2xl font-extrabold text-gray-900 tracking-tight">Fuelist</span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              Handcrafted, clean, and nutritious bowls designed to fuel your active lifestyle. No shortcuts, just real food.
            </p>
            <div className="flex items-center gap-4">
              <a 
                href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/fuelist"} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-2 rounded-full bg-gray-50 text-gray-400 hover:text-green-500 hover:bg-green-50 transition-all"
                title="Follow us on Instagram!"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links Section */}
          {FOOTER_LINKS.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">
                {section.title}
              </h3>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link 
                      href={link.href} 
                      className="text-gray-500 hover:text-green-600 transition-colors text-sm font-medium"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-xs">
            © {new Date().getFullYear()} Fuelist. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-gray-400 text-xs flex items-center gap-1">
              Made with 💚 for a healthier India
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
