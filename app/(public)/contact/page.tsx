'use client'

import { useState, useEffect } from 'react'
import Section from '@/components/ui/Section'
import ContactForm from '@/components/contact/ContactForm'
import FAQAccordion from '@/components/ui/FAQAccordion'
import { Mail, MessageCircle, MapPin, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/context/AuthContext'

// Fallback FAQs in case DB is empty or fetch fails
const FALLBACK_FAQS = [
  {
    question: 'How do rewards work?',
    answer: 'Every order you place earns you points (1 pt per ₹100 spent). You can track your points in your profile and use them for discounts on future orders.'
  },
  {
    question: 'Where do you deliver?',
    answer: 'We currently serve major residential and commercial hubs across our active cities.'
  }
]

// Operating hours: 9 AM – 9 PM IST (UTC+5:30)
const OPERATING_START_HOUR = 9
const OPERATING_END_HOUR = 21

function isWithinOperatingHours(): boolean {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const istDate = new Date(now.getTime() + istOffset)
  const hour = istDate.getUTCHours()
  return hour >= OPERATING_START_HOUR && hour < OPERATING_END_HOUR
}

function buildWhatsAppUrl(message?: string): string {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? ''
  // Strip any non-digit characters (spaces, +, dashes)
  const phone = raw.replace(/\D/g, '')
  const encoded = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${phone}${encoded}`
}

const STATIC_CONTACT_METHODS = [
  {
    id: 'email',
    title: 'Email Us',
    value: 'support@fuelist.in',
    description: 'The best way to get a detailed response for orders or account issues.',
    icon: Mail,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    href: 'mailto:support@fuelist.in',
  },
  {
    id: 'phone',
    title: 'Phone',
    value: '+91 8882828922',
    description: 'For urgent delivery issues, give us a call.',
    icon: Phone,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    href: 'tel:+918882828922',
  },
  {
    id: 'office',
    title: 'Head Office',
    value: 'Old Arya Nagar, Ghaziabad',
    description: 'Visit us for collaborations and administrative queries.',
    icon: MapPin,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    href: null,
  },
]

export default function ContactPage() {
  const [faqs, setFaqs] = useState<any[]>(FALLBACK_FAQS)
  const [online, setOnline] = useState(false)
  const { profile } = useAuthContext()

  useEffect(() => {
    setOnline(isWithinOperatingHours())
    // re-check every minute so the indicator stays current
    const id = setInterval(() => setOnline(isWithinOperatingHours()), 60_000)
    return () => clearInterval(id)
  }, [])

  const whatsappMessage = profile
    ? `Hi! I need help with my Fuelist order.\n\n👤 Name: ${profile.name}\n📧 Email: ${profile.email}${profile.phone ? `\n📞 Phone: ${profile.phone}` : ''}`
    : `Hi! I need help with my Fuelist order.`

  const whatsappUrl = buildWhatsAppUrl(whatsappMessage)

  return (
    <div className="pt-20">
      {/* Header */}
      <Section bg="white" className="!pb-0">
        <div className="max-w-3xl">
          <span className="text-green-600 font-bold tracking-widest uppercase text-sm mb-4 block">Get in Touch</span>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            We&apos;re here <br /> to <span className="text-green-500">help.</span>
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed max-w-2xl font-medium">
            Have feedback, a question about your order, or just want to tell us how much you loved your bowl? Drop us a line.
          </p>
        </div>
      </Section>

      {/* Main Grid */}
      <Section bg="white">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
          {/* Left Side: Info */}
          <div className="lg:col-span-2 space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-8">

              {/* WhatsApp Chat Support — clickable card */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-5 group cursor-pointer rounded-2xl -mx-3 px-3 py-3 hover:bg-green-50/60 transition-colors"
              >
                <div className="h-14 w-14 shrink-0 rounded-2xl bg-green-50 flex items-center justify-center transition-transform group-hover:scale-110">
                  <MessageCircle className="h-7 w-7 text-green-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-900 text-lg">Chat Support</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">WhatsApp Chat</span>
                    {/* Live online/offline indicator */}
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full',
                      online
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                    )}>
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                      )} />
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {online
                      ? 'We\'re online! Average response time: 5 minutes.'
                      : 'Currently offline. Operating hours: 9 AM – 9 PM IST. Leave a message and we\'ll reply soon.'}
                  </p>
                </div>
              </a>

              {/* Other static contact methods */}
              {STATIC_CONTACT_METHODS.map((method) => {
                const inner = (
                  <>
                    <div className={cn('h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110', method.bg)}>
                      <method.icon className={cn('h-7 w-7', method.color)} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 text-lg">{method.title}</h3>
                      <p className="text-green-600 font-bold">{method.value}</p>
                      <p className="text-gray-400 text-sm leading-relaxed">{method.description}</p>
                    </div>
                  </>
                )
                return method.href ? (
                  <a key={method.id} href={method.href} className="flex gap-5 group">
                    {inner}
                  </a>
                ) : (
                  <div key={method.id} className="flex gap-5 group">
                    {inner}
                  </div>
                )
              })}
            </div>

            {/* Social links placeholder in contact info */}
            <div className="pt-8 border-t border-gray-100">
              <p className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">Follow us for updates</p>
              <div className="flex gap-4">
                <a
                  href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/fuelist"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-full border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
                >
                  Instagram
                </a>
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="lg:col-span-3">
            <ContactForm />
          </div>
        </div>
      </Section>

      {/* FAQ Section */}
      <Section bg="gray">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900">FAQ</h2>
          <p className="text-gray-500 text-lg mt-4 font-medium">Quick answers to frequently asked questions.</p>
        </div>
        <div className="max-w-3xl mx-auto">
          <FAQAccordion items={faqs} />
        </div>
      </Section>
    </div>
  )
}

