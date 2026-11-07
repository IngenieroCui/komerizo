'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/session'

export type KomerizoUsuario = {
  id: number; cc: string; nombre: string; apellido: string;
  correo_electronico: string; telefono: string | null; direccion?: string;
  jac?: string; roles?: Array<{id: number; nombre: string}>;
  estado: string; firma: boolean; [key: string]: any
}
type AuthContextType = { user: KomerizoUsuario | null; loading: boolean; signOut: () => Promise<void> }
const AuthContext = createContext<AuthContextType>({ user: null, loading: true, signOut: async () => {} })
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<KomerizoUsuario | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    let revision = 0
    const load = async () => {
      const current = ++revision
      try {
        const profile = await getCurrentProfile()
        if (active && current === revision) setUser(profile)
      } catch { if (active && current === revision) setUser(null) }
      finally { if (active && current === revision) setLoading(false) }
    }
    localStorage.removeItem('komerizo_user')
    localStorage.removeItem('userRoles')
    void load()
    // Do not await Supabase queries inside the auth event callback (auth lock).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { setTimeout(() => { if (active) void load() }, 0) })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    window.location.assign('/login')
  }
  return <AuthContext.Provider value={{user, loading, signOut}}>{children}</AuthContext.Provider>
}
