import React from 'react'

interface JsonLdProps {
  data: Record<string, any>
}

/**
 * SEO Structured Data Component
 * Safely injects JSON-LD schema into the head.
 */
export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
