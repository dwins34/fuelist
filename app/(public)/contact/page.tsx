'use client'

import { useState, useEffect } from 'react'
import Section from '@/components/ui/Section'
import ContactForm from '@/components/contact/ContactForm'
import FAQAccordion from '@/components/ui/FAQAccordion'
import { Mail, MessageCircle, MapPin, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

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

const CONTACT_METHODS = [
  {
    title: 'Email Us',
    value: 'support@fuelist.in',
    description: 'The best way to get a detailed response for orders or account issues.',
    icon: Mail,
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  },
  {
    title: 'Chat Support',
    value: 'In-App Chat',
    description: 'Average response time: 5 minutes during operating hours.',
    icon: MessageCircle,
    color: 'text-green-600',
    bg: 'bg-green-50'
  },
  {
    title: 'Phone',
    value: '+91 8882828922',
    description: 'For urgent delivery issues, give us a call.',
    icon: Phone,
    color: 'text-purple-600',
    bg: 'bg-purple-50'
  },
  {
    title: 'Head Office',
    value: 'Old Arya Nagar, Ghaziabad',
    description: 'Visit us for collaborations and administrative queries.',
    icon: MapPin,
    color: 'text-amber-600',
    bg: 'bg-amber-50'
  }
]

export default function ContactPage() {
  const [faqs, setFaqs] = useState<any[]>(FALLBACK_FAQS)

  useEffect(() => {
    async function fetchFaqs() {
      try {
        const res = await fetch('/api/public/faqs')
        const data = await res.json()
        if (data.success && data.faqs && data.faqs.length > 0) {
          setFaqs(data.faqs)
        }
      } catch (err) {
        console.error('Failed to fetch FAQs:', err)
      }
    }
    fetchFaqs()
  }, [])

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
              {CONTACT_METHODS.map((method) => (
                <div key={method.title} className="flex gap-5 group">
                  <div className={cn('h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110', method.bg)}>
                    <method.icon className={cn('h-7 w-7', method.color)} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-900 text-lg">{method.title}</h3>
                    <p className="text-green-600 font-bold">{method.value}</p>
                    <p className="text-gray-400 text-sm leading-relaxed">{method.description}</p>
                  </div>
                </div>
              ))}
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

