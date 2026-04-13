import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionProps {
  children: ReactNode
  className?: string
  containerClassName?: string
  id?: string
  bg?: 'white' | 'gray' | 'green' | 'dark'
}

export default function Section({
  children,
  className,
  containerClassName,
  id,
  bg = 'white'
}: SectionProps) {
  const bgClasses = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    green: 'bg-green-50/50',
    dark: 'bg-gray-900 text-white'
  }

  return (
    <section 
      id={id} 
      className={cn('py-16 md:py-24 overflow-hidden', bgClasses[bg], className)}
    >
      <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', containerClassName)}>
        {children}
      </div>
    </section>
  )
}
