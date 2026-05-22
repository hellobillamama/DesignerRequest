import { create } from 'zustand'

interface UserProfile {
  email: string
  name: string
  image?: string
  role: string
  department: string
}

interface AppStore {
  profile: UserProfile | null
  sidebarOpen: boolean
  notifications: number
  setProfile: (p: UserProfile | null) => void
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
