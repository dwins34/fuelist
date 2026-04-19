'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Mail, MessageCircle, MapPin, Phone, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

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
  const phone = raw.replace(/\D/g, '')
  const encoded = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${phone}${encoded}`
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function ContactForm({ profile }: { profile: any }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    setLoading(true)
    setStatus('idle')

    const formData = {
      user_name: formRef.current.user_name.value,
      user_email: formRef.current.user_email.value,
      message: formRef.current.message.value,
    }

    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send message')
      setStatus('success')
      formRef.current.reset()
    } catch (error: any) {
      setStatus('error')
      setErrorMessage(error?.message || 'Something went wrong. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl bg-amber-50 border border-amber-100 p-10 text-center flex flex-col items-center gap-5"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
          <CheckCircle2 className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-2xl font-black text-stone-900 tracking-tighter">Message Sent!</h3>
        <p className="text-stone-500 max-w-sm leading-relaxed text-sm">
          Thank you for reaching out. We'll get back to you at support@fuelist.in within 24 hours.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-2 text-xs font-black uppercase tracking-widest text-amber-600 hover:text-amber-500 transition-colors"
        >
          Send another message
        </button>
      </motion.div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="user_name" className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-1">
            Full Name
          </label>
          <input
            name="user_name"
            id="user_name"
            placeholder="Your name"
            required
            defaultValue={profile?.name ?? ''}
            className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="user_email" className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-1">
            Email Address
          </label>
          <input
            type="email"
            name="user_email"
            id="user_email"
            placeholder="you@example.com"
            required
            defaultValue={profile?.email ?? ''}
            className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-1">
          How can we help?
        </label>
        <textarea
          name="message"
          id="message"
          rows={5}
          required
          placeholder="Tell us about your query..."
          className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all resize-none"
        />
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-3 text-rose-600 bg-rose-50 border border-rose-100 p-4 rounded-2xl text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <Button type="submit" loading={loading} variant="primary" size="sm" className="w-full font-black">
        <span className="flex items-center gap-2">
          Send Message <Send className="h-4 w-4" />
        </span>
      </Button>

      <p className="text-center text-[10px] text-stone-600 tracking-wide">
        By sending, you agree to our Terms and Privacy Policy.
      </p>
    </form>
  )
}

const CONTACT_METHODS = [
  {
    id: 'email',
    title: 'Email Us',
    value: 'support@fuelist.in',
    description: 'Best for detailed questions about orders or accounts.',
    icon: Mail,
    href: 'mailto:support@fuelist.in',
  },
  {
    id: 'phone',
    title: 'Call Us',
    value: '+91 88828 28922',
    description: 'For urgent delivery issues, call us directly.',
    icon: Phone,
    href: 'tel:+918882828922',
  },
  {
    id: 'office',
    title: 'Head Office',
    value: 'Old Arya Nagar, Ghaziabad',
    description: 'Visit for collaborations and admin queries.',
    icon: MapPin,
    href: null,
  },
]

export default function ContactPage() {
  const [online, setOnline] = useState(false)
  const { profile } = useAuthContext()

  useEffect(() => {
    setOnline(isWithinOperatingHours())
    const id = setInterval(() => setOnline(isWithinOperatingHours()), 60_000)
    return () => clearInterval(id)
  }, [])

  const whatsappMessage = profile
    ? `Hi! I need help with my Fuelist order.\n\n👤 Name: ${profile.name}\n📧 Email: ${profile.email}${profile.phone ? `\n📞 Phone: ${profile.phone}` : ''}`
    : `Hi! I need help with my Fuelist order.`

  const whatsappUrl = buildWhatsAppUrl(whatsappMessage)

  return (
    <div className="bg-stone-50 min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Amber glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-400/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Get in Touch</span>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="text-5xl md:text-7xl font-black text-stone-900 tracking-tighter leading-[0.95] mb-6">
              We&apos;re here<br />
              <span className="text-amber-500">to help.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-stone-500 text-lg md:text-xl max-w-xl leading-relaxed">
              Have feedback, a question about your order, or just want to tell us how much you loved your bowl? Drop us a line.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Main content */}
      <section className="px-4 pb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

          {/* Left — contact methods */}
          <div className="lg:col-span-2 space-y-6">

            {/* WhatsApp */}
            <Reveal>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-4 rounded-3xl bg-white border border-stone-100 p-5 hover:border-amber-300 hover:shadow-md transition-all duration-300 shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/25 transition-colors">
                  <MessageCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-stone-900 text-sm">Chat Support</h3>
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full',
                      online ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', online ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300')} />
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs font-black text-emerald-600">WhatsApp Chat</p>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {online
                      ? 'We\'re online! Avg response: 5 minutes.'
                      : 'Operating hours: 9 AM – 9 PM IST. Leave a message.'}
                  </p>
                </div>
              </a>
            </Reveal>

            {/* Other methods */}
            {CONTACT_METHODS.map((method, i) => {
              const inner = (
                <div className="group flex items-start gap-4 rounded-3xl bg-white border border-stone-100 p-5 hover:border-amber-300 hover:shadow-md transition-all duration-300 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                    <method.icon className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-stone-900 text-sm">{method.title}</h3>
                    <p className="text-xs font-black text-amber-500">{method.value}</p>
                    <p className="text-xs text-stone-400 leading-relaxed">{method.description}</p>
                  </div>
                </div>
              )
              return (
                <Reveal key={method.id} delay={0.05 * (i + 1)}>
                  {method.href ? (
                    <a href={method.href}>{inner}</a>
                  ) : (
                    <div>{inner}</div>
                  )}
                </Reveal>
              )
            })}

            {/* Social */}
            <Reveal delay={0.2}>
              <div className="pt-4 border-t border-stone-200">
                <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-4">Follow for updates</p>
                <a
                  href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://instagram.com/fuelist'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-stone-200 text-stone-500 text-xs font-black hover:border-amber-400 hover:text-amber-600 transition-all"
                >
                  Instagram
                </a>
              </div>
            </Reveal>
          </div>

          {/* Right — form */}
          <div className="lg:col-span-3">
            <Reveal delay={0.1}>
              <div className="rounded-3xl bg-white border border-stone-100 shadow-sm p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-black text-stone-900 tracking-tighter">Send us a message</h2>
                  <p className="text-xs text-stone-400 mt-1">We'll get back to you within 24 hours.</p>
                </div>
                <ContactForm profile={profile} />
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  )
}
