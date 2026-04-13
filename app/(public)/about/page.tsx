'use client'

import { useState, useEffect } from 'react'
import Section from '@/components/ui/Section'
import Button from '@/components/ui/Button'
import { Target, Users, Zap, Award, ShoppingBag, MapPin, Smile } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsData {
  totalOrders: number
  totalUsers: number
  activeCities: number
}

export default function AboutPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/public/stats')
        const data = await res.json()
        if (data.success) {
          setStats(data.stats)
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const displayStats = [
    { 
      label: 'Orders Delivered', 
      value: stats ? stats.totalOrders.toLocaleString() + '+' : '50,000+', 
      icon: ShoppingBag, 
      color: 'bg-green-100 text-green-600' 
    },
    { 
      label: 'Happy Customers', 
      value: stats ? stats.totalUsers.toLocaleString() + '+' : '12,000+', 
      icon: Smile, 
      color: 'bg-blue-100 text-blue-600' 
    },
    { 
      label: 'Cities Served', 
      value: stats ? stats.activeCities.toString() + '+' : '5+', 
      icon: MapPin, 
      color: 'bg-amber-100 text-amber-600' 
    },
  ]

  const VALUES = [
    {
      icon: Target,
      title: 'Macro-Focused',
      description: 'We believe transparency is key. Every bowl comes with full nutritional and macro breakdown.'
    },
    {
      icon: Users,
      title: 'Community First',
      description: 'Fuelist isn\'t just a food startup; it\'s a movement for people who care about what they put in their bodies.'
    },
    {
      icon: Zap,
      title: 'Zero Compromise',
      description: 'No preservatives, no artificial sugars, and no shortcuts. Just pure, clean energy.'
    }
  ]

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <Section bg="green" className="!pt-32 !pb-20 relative">
        <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-8">
            Fueling the <span className="text-green-500 underline decoration-green-200 decoration-8 underline-offset-8">Optimized</span> Human.
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed font-medium">
            We started Fuelist because we were tired of "healthy" food that didn't actually make us feel good. We're here to bridge the gap between delicious taste and functional nutrition.
          </p>
          <Button size="lg" href="/menu">Browse the Menu</Button>
        </div>
        {/* Abstract shapes for detail */}
        <div className="absolute top-20 right-10 opacity-20 hidden lg:block">
            <Award className="h-48 w-48 text-green-500 rotate-12" />
        </div>
      </Section>

      {/* Stats Section */}
      <Section bg="white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {displayStats.map((stat) => (
            <div 
              key={stat.label} 
              className={cn(
                'flex flex-col items-center p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-gray-100 transition-all duration-500',
                loading && 'animate-pulse'
              )}
            >
              <div className={`${stat.color} p-4 rounded-2xl mb-6`}>
                <stat.icon className="h-8 w-8" />
              </div>
              <span className="text-4xl font-extrabold text-gray-900 mb-2">
                {loading ? '...' : stat.value}
              </span>
              <span className="text-gray-500 font-bold uppercase tracking-widest text-xs tracking-tight">{stat.label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Story Section */}
      <Section bg="gray">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
                <span className="text-green-600 font-bold tracking-widest uppercase text-sm">Our Origin</span>
                <h2 className="text-4xl font-bold text-gray-900 leading-tight">Born in a Kitchen, Built for the Streets.</h2>
                <div className="space-y-4 text-gray-600 leading-relaxed text-lg">
                    <p>
                        Fuelist began in 2023 with a simple realisation: people are busier than ever, yet they've never been more health-conscious. Finding a meal that is genuinely fast, fresh, and macro-balanced was nearly impossible.
                    </p>
                    <p>
                        Our founder, a fitness enthusiast and food lover, started experimenting with bowl combinations that didn't just satisfy hunger, but actually provided the clean energy needed for a productive day.
                    </p>
                    <p>
                        Today, Fuelist is a growing community of thousands of "Fuelers" who refuse to compromise on their health for convenience.
                    </p>
                </div>
            </div>
            <div className="relative">
                <div className="aspect-square rounded-[3rem] bg-green-500 overflow-hidden shadow-2xl rotate-3">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Leaf className="h-48 w-48 text-white opacity-20" />
                        <span className="text-6xl font-black text-white px-8 text-center leading-none tracking-tighter">GOOD FOOD <br/> ONLY.</span>
                    </div>
                </div>
            </div>
        </div>
      </Section>

      {/* Values Section */}
      <Section bg="white">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">The Fuelist Manifesto</h2>
          <p className="text-lg text-gray-500">Every decision we make, from sourcing to delivery, is guided by three non-negotiable pillars.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {VALUES.map((value) => (
            <div key={value.title} className="space-y-6 text-center group">
              <div className="h-20 w-20 rounded-3xl bg-white border border-gray-100 shadow-sm flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-green-500 group-hover:text-white transition-all duration-300">
                <value.icon className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{value.title}</h3>
              <p className="text-gray-500 leading-relaxed text-lg">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA Section */}
      <Section bg="dark" className="text-center">
        <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-extrabold">Join the Clean Eating Revolution.</h2>
            <p className="text-gray-400 text-lg">Your journey to a healthier, more energized version of yourself starts with your next meal.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" href="/menu">Explore Our Menu</Button>
                <Button size="lg" variant="ghost" className="text-white border-white/20 hover:bg-white/10" href="/contact">Get in Touch</Button>
            </div>
        </div>
      </Section>
    </div>
  )
}

function Leaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2-8 2 0-3 7-2 7-2S23.5 3 17 8z"/>
    </svg>
  )
}
