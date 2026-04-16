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
      <div className="flex flex-col gap-1 border-b border-stone-100 pb-3">
        <h1 className="text-base sm:text-xl font-black text-stone-900 tracking-tighter">Login & Security</h1>
        <p className="text-[11px] sm:text-xs font-medium text-stone-400">Manage your sign-in options.</p>
      </div>

      <div className="space-y-4">
        {/* Connection Status Section */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-black text-stone-400 capitalize tracking-widest ml-1">Sign-in Methods</h2>
          <div className="grid grid-cols-1 gap-3">

            {/* Google Row */}
            <AnimatePresence>
              {isGoogleUser && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card variant="default" className="p-3 group hover:bg-stone-50/50 transition-colors overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-stone-100 shrink-0">
                        <GoogleIcon />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-stone-900 leading-tight">Google Account</p>
                        <p className="text-[10px] font-medium text-stone-400 mt-0.5 truncate">{email}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                        <Icon name="success" size={9} strokeWidth={3} className="text-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-600 tracking-wide">Connected</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email/Password Row */}
            <Card
              className={cn(
                "p-3 transition-all duration-300 overflow-hidden",
                showPwForm ? "ring-2 ring-amber-500/20 border-amber-500/30 bg-amber-50/10 shadow-premium" : "hover:bg-stone-50/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-300 shadow-sm border shrink-0",
                  showPwForm ? "bg-amber-500 text-white border-amber-400 shadow-amber-200" : "bg-white text-stone-400 border-stone-100"
                )}>
                  <Icon name="security" size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-stone-900 leading-tight">Password</p>
                  <p className="text-[10px] font-medium text-stone-400 mt-0.5">
                    {hasPassword ? 'Securely set' : 'Not set yet'}
                  </p>
                </div>
                <Button
                  variant={showPwForm ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowPwForm(!showPwForm)}
                  className="shrink-0"
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
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="overflow-hidden"
            >
              <Card variant="glass" className="p-4 sm:p-6 border-amber-100 bg-white/60 shadow-premium">
                <div className="space-y-1 mb-4">
                  <h3 className="text-base font-black text-stone-900 tracking-tight">
                    {hasPassword ? 'Update password' : 'Create a password'}
                  </h3>
                  <p className="text-[11px] font-medium text-stone-400">
                    {hasPassword ? 'At least 6 characters.' : 'Add a password for direct email sign-in.'}
                  </p>
                </div>

                <form onSubmit={onPasswordSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="New Password"
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      error={passwordForm.errors.password}
                      icon={<Icon name="security" size={16} />}
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
                      icon={<Icon name="success" size={16} />}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      loading={passwordForm.saving}
                      size="sm"
                      className="sm:min-w-[160px] shadow-premium"
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
