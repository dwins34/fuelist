'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/lib/icons'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface PersonalInfoTabProps {
  name: string
  setName: (v: string) => void
  phone: string
  setPhone: (v: string) => void
  email?: string
  formErrors: { name?: string; phone?: string }
  saving: boolean
  onSubmit: (e: React.FormEvent) => void
}

export default function PersonalInfoTab({
  name, setName, phone, setPhone, email, formErrors, saving, onSubmit
}: PersonalInfoTabProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header Section */}
      <div className="flex flex-col gap-1 bottom-b border-stone-100 pb-5">
        <h1 className="text-xl font-black text-stone-900 tracking-tighter capitalize">Personal Information</h1>
        <p className="text-xs font-medium text-stone-400">Update your profile details for a personalized experience.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Full Name"
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Swapnil Bansal"
            error={formErrors.name}
            icon={<Icon name="user" size={18} />}
          />

          <Input
            label="Mobile Number"
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 7337488364"
            error={formErrors.phone}
            icon={<Icon name="phone" size={18} />}
          />
        </div>

        {/* Read-only Email Section */}
        <Card className="bg-stone-50/50 border-dashed border-stone-200">
          <CardContent className="flex flex-col gap-3 p-5">
            <div>
              <label className="text-[11px] font-black capitalize tracking-wider text-stone-400 ml-1 mb-2 block">
                Email Address
              </label>
              <div className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl px-4 py-3 shadow-sm opacity-60">
                <Icon name="mail" size={18} className="text-stone-300" />
                <span className="text-sm font-bold text-stone-500">{email}</span>
                <div className="ml-auto flex items-center gap-1.5 text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 capitalize tracking-tight">
                  <Icon name="success" size={10} strokeWidth={3} />
                  Verified
                </div>
              </div>
            </div>
            <p className="flex items-center gap-2 text-[11px] font-bold text-stone-400 ml-1">
              <Icon name="info" size={12} strokeWidth={2.5} className="text-stone-300" />
              Connected via Google authentication. Email cannot be changed here.
            </p>
          </CardContent>
        </Card>

        <div className="pt-6 flex justify-end">
          <Button 
            type="submit" 
            loading={saving} 
            size="lg"
            className="min-w-[200px] shadow-premium"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </motion.div>
  )
}
