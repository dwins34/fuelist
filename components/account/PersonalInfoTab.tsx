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
      <div className="flex flex-col gap-1 border-b border-stone-100 pb-3">
        <h1 className="text-base sm:text-xl font-black text-stone-900 tracking-tighter capitalize">Personal Information</h1>
        <p className="text-[11px] sm:text-xs font-medium text-stone-400">Update your profile details.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
          <Input
            label="Full Name"
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Swapnil Bansal"
            error={formErrors.name}
            icon={<Icon name="user" size={16} />}
          />

          <Input
            label="Mobile Number"
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 7337488364"
            error={formErrors.phone}
            icon={<Icon name="phone" size={16} />}
          />
        </div>

        {/* Read-only Email Section */}
        <Card className="bg-stone-50/50 border-dashed border-stone-200">
          <CardContent className="flex flex-col gap-2 p-3 sm:p-5">
            <div>
              <label className="text-[10px] font-black capitalize tracking-wider text-stone-400 ml-1 mb-1.5 block">
                Email Address
              </label>
              <div className="flex items-center gap-2 bg-white border border-stone-100 rounded-xl px-3 py-2.5 shadow-sm opacity-60">
                <Icon name="mail" size={15} className="text-stone-300 shrink-0" />
                <span className="text-xs font-bold text-stone-500 truncate">{email}</span>
                <div className="ml-auto flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 capitalize tracking-tight shrink-0">
                  <Icon name="success" size={9} strokeWidth={3} />
                  Verified
                </div>
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-stone-400 ml-1">
              <Icon name="info" size={11} strokeWidth={2.5} className="text-stone-300 shrink-0" />
              Email cannot be changed here.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={saving}
            size="sm"
            className="sm:min-w-[160px] shadow-premium"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </motion.div>
  )
}
