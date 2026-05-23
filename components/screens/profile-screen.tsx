'use client'

import { ChevronRight, History, Heart, Bell, HelpCircle, Shield, LogOut, BadgeCheck, Briefcase, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ProfileScreenProps {
  userName: string
  phone: string
  onMenuClick: (menu: string) => void
  onBecomeWorker: () => void
  onLogout: () => void
}

const menuItems = [
  { id: 'personal-info', icon: UserCircle, label: 'Хувийн мэдээлэл' },
  { id: 'history', icon: History, label: 'Захиалгын түүх' },
  { id: 'saved', icon: Heart, label: 'Хадгалсан ажилтнууд' },
  { id: 'notifications', icon: Bell, label: 'Мэдэгдэл' },
  { id: 'help', icon: HelpCircle, label: 'Тусламж' },
  { id: 'privacy', icon: Shield, label: 'Нууцлал' },
]

export function ProfileScreen({
  userName,
  phone,
  onMenuClick,
  onBecomeWorker,
  onLogout,
}: ProfileScreenProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-12">
        <h1 className="text-xl font-bold text-foreground">Профайл</h1>
      </div>

      {/* Profile Card */}
      <div className="mt-6 mx-6 flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
        <Avatar className="h-16 w-16">
          <AvatarImage src="" />
          <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
            {userName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-lg font-semibold text-foreground">{userName}</p>
          <p className="text-sm text-muted-foreground">{phone}</p>
          <div className="mt-1 flex items-center gap-1">
            <BadgeCheck className="h-4 w-4 text-success" />
            <span className="text-xs font-medium text-success">ДАН баталгаажсан</span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="mt-6 mx-6 rounded-2xl bg-card shadow-sm overflow-hidden">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onMenuClick(item.id)}
              className={`flex w-full items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 ${
                index !== menuItems.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="flex-1 text-left font-medium text-foreground">{item.label}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          )
        })}
      </div>

      {/* Become Worker Button */}
      <div className="mt-6 mx-6">
        <Button
          onClick={onBecomeWorker}
          variant="outline"
          className="h-14 w-full rounded-2xl border-accent text-accent font-semibold shadow-sm hover:bg-accent/10"
        >
          <Briefcase className="mr-2 h-5 w-5" />
          Ажилтнаар бүртгүүлэх
        </Button>
      </div>

      {/* Logout Button */}
      <div className="mt-4 mx-6">
        <Button
          onClick={onLogout}
          variant="ghost"
          className="h-14 w-full rounded-2xl text-destructive font-semibold hover:bg-destructive/10"
        >
          <LogOut className="mr-2 h-5 w-5" />
          Гарах
        </Button>
      </div>
    </div>
  )
}
