import { useState, useRef } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Send, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ContactForm() {
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
      user_name:  formRef.current.user_name.value,
      user_email: formRef.current.user_email.value,
      message:    formRef.current.message.value,
    }

    try {
      // Hits our backend API which now handles both DB Logging and Resend Email
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setStatus('success')
      formRef.current.reset()
    } catch (error: any) {
      console.error('Contact Form Error:', error)
      setStatus('error')
      setErrorMessage(error?.message || 'Something went wrong. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-green-50 rounded-3xl p-8 text-center border border-green-100 flex flex-col items-center gap-4 transition-all animate-in fade-in zoom-in duration-300">
        <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center text-white">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">Message Sent!</h3>
        <p className="text-green-700 max-w-sm">
          Thank you for reaching out. Our team will get back to you at support@fuelist.in within 24 hours.
        </p>
        <Button 
          variant="secondary" 
          onClick={() => setStatus('idle')}
          className="mt-2"
        >
          Send another message
        </Button>
      </div>
    )
  }

  return (
    <form 
      ref={formRef} 
      onSubmit={handleSubmit} 
      className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-100 space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="user_name" className="text-sm font-bold text-gray-700 ml-1">
            Full Name
          </label>
          <Input 
            name="user_name" 
            id="user_name"
            placeholder="John Doe" 
            required 
            className="rounded-2xl border-gray-200 focus:border-green-500"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="user_email" className="text-sm font-bold text-gray-700 ml-1">
            Email Address
          </label>
          <Input 
            type="email" 
            name="user_email" 
            id="user_email"
            placeholder="john@example.com" 
            required 
            className="rounded-2xl border-gray-200 focus:border-green-500"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="message" className="text-sm font-bold text-gray-700 ml-1">
          How can we help?
        </label>
        <textarea
          name="message"
          id="message"
          rows={4}
          required
          placeholder="Tell us about your query..."
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none text-gray-900"
        />
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl text-sm border border-red-100">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <Button 
        type="submit" 
        loading={loading} 
        variant="primary" 
        size="lg" 
        className="w-full text-lg h-14"
      >
        <span className="flex items-center gap-2">
          Send Message <Send className="h-4 w-4" />
        </span>
      </Button>
      
      <p className="text-center text-xs text-gray-400">
        By sending a message, you agree to our Terms and Privacy Policy.
      </p>
    </form>
  )
}
