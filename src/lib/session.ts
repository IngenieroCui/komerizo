import { supabase } from './supabase'

// Business identity and roles always come from RLS-protected queries.
export async function getCurrentProfile() {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null
  const { data, error } = await supabase.from('komerizo_usuarios')
    .select('*, komerizo_usuario_roles(komerizo_roles(id,nombre))')
    .eq('auth_user_id', user.id).eq('estado', 'activo').single()
  if (error) throw new Error('La cuenta no tiene un perfil activo de Komerizo.')
  const roles = (data.komerizo_usuario_roles || []).map((r: any) => r.komerizo_roles).filter(Boolean)
  if (!roles.length) throw new Error('La cuenta no tiene roles de Komerizo.')
  return { ...data, roles }
}

export async function getSerializedProfile() {
  const profile = await getCurrentProfile()
  return profile ? JSON.stringify(profile) : null
}
