'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FAQItem {
  question: string
  answer: string | React.ReactNode
}

interface FAQAccordionProps {
  items: FAQItem[]
  className?: string
}

export default function FAQAccordion({ items, className }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {items.map((item, index) => (
        <div 
          key={index} 
          className={cn(
            'border rounded-2xl overflow-hidden transition-all duration-300',
            openIndex === index 
              ? 'border-green-200 bg-green-50/30' 
              : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm hover:shadow-md'
          )}
        >
          <button
            onClick={() => toggle(index)}
            className="w-full flex items-center justify-between px-6 py-5 text-left transition-colors"
          >
            <span className={cn(
              'font-semibold text-lg transition-colors',
              openIndex === index ? 'text-green-700' : 'text-gray-900'
            )}>
              {item.question}
            </span>
            <ChevronDown 
              className={cn(
                'h-5 w-5 text-gray-400 transition-transform duration-300',
                openIndex === index && 'rotate-180 text-green-600'
              )} 
            />
          </button>
          
          <div 
            className={cn(
              'transition-all duration-300 ease-in-out',
              openIndex === index ? 'max-h-[500px] opacity-100 pb-5' : 'max-h-0 opacity-0'
            )}
          >
            <div className="px-6 text-gray-600 leading-relaxed">
              {item.answer}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
