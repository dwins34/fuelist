'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/lib/icons'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SecurityTabProps {
  isGoogleUser: boolean
  email?: string
  hasPassword: boolean
  showPwForm: boolean
  setShowPwForm: (v: boolean) => void
  passwordForm: {
    password:     string
    confirm:      string
    errors:       { password?: string; confirm?: string }
    saving:       boolean
  }
  setPassword:    (v: string) => void
  setConfirm:     (v: string) => void
  onPasswordSubmit: (e: React.FormEvent) => void
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export default function SecurityTab({
  isGoogleUser, email, hasPassword, showPwForm, setShowPwForm,
  passwordForm, setPassword, setConfirm, onPasswordSubmit
}: SecurityTabProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      {/* Header Section */}
      <div className="flex flex-col gap-1.5 border-b border-stone-100 pb-8">
        <h1 className="text-3xl font-black text-stone-900 tracking-tighter">Login & Security</h1>
        <p className="text-sm font-medium text-stone-400">Manage your sign-in options and account security.</p>
      </div>

      <div className="space-y-8">
        {/* Connection Status Section */}
        <div className="space-y-4">
          <h2 className="text-[11px] font-black text-stone-400 capitalize tracking-widest ml-1">Sign-in Methods</h2>
          <div className="grid grid-cols-1 gap-4">
            
            {/* Google Row */}
            <AnimatePresence>
              {isGoogleUser && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card variant="default" className="p-4 sm:p-5 group hover:bg-stone-50/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-stone-100 group-hover:scale-110 transition-transform duration-300">
                          <GoogleIcon />
                        </div>
                        <div>
                          <p className="text-base font-black text-stone-900 leading-tight">Google Account</p>
                          <p className="text-xs font-medium text-stone-400 mt-0.5">{email}</p>
                        </div>
                      </div>
                      <Badge variant="success" className="px-3 shrink-0">
                        <Icon name="success" size={10} strokeWidth={3} />
                        Connected
                      </Badge>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email/Password Row */}
            <Card 
              className={cn(
                "p-4 sm:p-5 transition-all duration-300",
                showPwForm ? "ring-2 ring-amber-500/20 border-amber-500/30 bg-amber-50/10 shadow-premium" : "hover:bg-stone-50/50"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-300 shadow-sm border",
                    showPwForm ? "bg-amber-500 text-white border-amber-400 shadow-amber-200" : "bg-white text-stone-400 border-stone-100"
                  )}>
                    <Icon name="security" size={24} />
                  </div>
                  <div>
                    <p className="text-base font-black text-stone-900 leading-tight">Account Password</p>
                    <p className="text-xs font-medium text-stone-400 mt-0.5">
                      {hasPassword ? 'Securely set' : 'Not configured yet'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={showPwForm ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowPwForm(!showPwForm)}
                  className="px-6 shrink-0"
                >
                  {showPwForm ? 'Cancel' : hasPassword ? 'Change' : 'Set up'}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Inline Password Form */}
        <AnimatePresence>
          {showPwForm && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="overflow-hidden"
            >
              <Card variant="glass" className="p-8 sm:p-10 border-amber-100 bg-white/60 shadow-premium">
                <div className="space-y-2 mb-8">
                  <h3 className="text-xl font-black text-stone-900 tracking-tight">
                    {hasPassword ? 'Update your password' : 'Create a password'}
                  </h3>
                  <p className="text-sm font-medium text-stone-400 max-w-lg">
                    {hasPassword
                      ? 'Enter your new password below. Ensure it is at least 6 characters long.'
                      : 'Add a password to enable direct sign-in with your email address.'}
                  </p>
                </div>

                <form onSubmit={onPasswordSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Input
                      label="New Password"
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      error={passwordForm.errors.password}
                      icon={<Icon name="security" size={18} />}
                    />
                    <Input
                      label="Confirm Password"
                      id="confirm"
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      error={passwordForm.errors.confirm}
                      icon={<Icon name="success" size={18} />}
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button 
                      type="submit" 
                      loading={passwordForm.saving} 
                      size="lg"
                      className="min-w-[200px] shadow-premium"
                    >
                      {hasPassword ? 'Update Password' : 'Save Password'}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
