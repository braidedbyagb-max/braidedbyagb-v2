import { create } from 'zustand'
import { supabase } from './supabase'

interface AuthState {
  session:    any | null
  loading:    boolean
  setSession: (session: any | null) => void
  signOut:    () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,

  setSession: (session) => set({ session, loading: false }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null })
  },
}))
