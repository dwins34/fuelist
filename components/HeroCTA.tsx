'use client'

import { useAuthContext } from '@/context/AuthContext'
import Button from './ui/Button'
import { motion } from 'framer-motion'

export default function HeroCTA() {
  const { profile, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <div className="h-16 w-48 animate-pulse rounded-[2rem] bg-amber-100" />
        <div className="h-16 w-36 animate-pulse rounded-[2rem] bg-stone-100" />
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col sm:flex-row gap-4 justify-center"
    >
      <Button href="/menu" size="lg" className="w-full sm:w-auto px-10 py-5 !rounded-3xl shadow-premium">
        Explore Menu
      </Button>
      {!profile && (
        <Button href="/signup" variant="outline" size="lg" className="w-full sm:w-auto px-10 py-5 !rounded-3xl">
          Join Community
        </Button>
      )}
    </motion.div>
  )
}
