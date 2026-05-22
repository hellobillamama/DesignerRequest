import { create } from 'zustand'
import type { Profile } from '@/types/database'

interface AppStore {
  profile: Profile | null
  sidebarOpen: boolean
  notifications: number
  setProfile: (p: Profile | null) => void
  setSidebarOpen: (v: boolean) => void
  setNotifications: (n: number) => void
  toggleSidebar: () => void
}

export const useStore = create<AppStore>((set) => ({
  profile: null,
  sidebarOpen: true,
  notifications: 0,
  setProfile: (profile) => set({ profile }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setNotifications: (notifications) => set({ notifications }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))
