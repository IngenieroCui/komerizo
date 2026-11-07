import { supabase } from './supabase'
import { getCurrentProfile } from './session'

// Authentication and password changes are handled exclusively by Supabase Auth.

// Función para crear un usuario en komerizo_usuarios
export async function crearUsuario(usuarioData: {
  cc: string
  tipo_documento_id: number
  nombre: string
  apellido: string
  correo_electronico: string
  telefono?: string
  direccion?: string
  comuna_id?: number
  barrio_id?: number
  jac?: string
  fecha_nacimiento?: string
  comision_trabajo_id?: number
  constancia_no_pertenecer_otra_jac?: boolean
  observaciones?: string
  roles?: number[] // IDs de roles
}) {
  return { success: false, error: 'Las cuentas se crean con Supabase Auth Admin desde un entorno privado.' }
}

// Función para actualizar usuario
export async function actualizarUsuario(
  usuarioId: number,
  updateData: Partial<any>
) {
  try {
    const { data, error } = await supabase
      .from('komerizo_usuarios')
      .update(Object.fromEntries(Object.entries(updateData).filter(([key]) => !['contrasena', 'auth_user_id', 'roles'].includes(key))))
      .eq('id', usuarioId)
      .select()

    if (error) throw error
    return { success: true, usuario: data?.[0] }
  } catch (error: any) {
    console.error('Error actualizando usuario:', error)
    return { success: false, error: error.message }
  }
}

// Función para obtener usuario con sus roles
export async function obtenerUsuarioConRoles(usuarioId: number) {
  try {
    const { data, error } = await supabase
      .from('komerizo_usuarios')
      .select('*, komerizo_usuario_roles(*, komerizo_roles(*))')
      .eq('id', usuarioId)
      .single()

    if (error) throw error
    return { success: true, usuario: data }
  } catch (error: any) {
    console.error('Error obteniendo usuario:', error)
    return { success: false, error: error.message }
  }
}

// Función para cambiar contraseña
export async function cambiarContrasena(
  usuarioId: number,
  contrasenaNueva: string
) {
  try {
    const profile = await getCurrentProfile()
    if (profile?.id !== usuarioId) throw new Error('Solo puedes cambiar tu propia contraseña.')
    const { error } = await supabase.auth.updateUser({ password: contrasenaNueva })
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Error cambiando contraseña:', error)
    return { success: false, error: error.message }
  }
}

// Función para verificar si un CC ya existe
export async function verificarCCExistente(cc: string) {
  try {
    const { count, error } = await supabase
      .from('komerizo_usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('cc', cc)

    if (error) throw error
    return { existe: count ? count > 0 : false }
  } catch (error: any) {
    console.error('Error verificando CC:', error)
    return { existe: false, error: error.message }
  }
}

// Función para verificar si un correo ya existe
export async function verificarCorreoExistente(correo: string) {
  try {
    const { count, error } = await supabase
      .from('komerizo_usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('correo_electronico', correo)

    if (error) throw error
    return { existe: count ? count > 0 : false }
  } catch (error: any) {
    console.error('Error verificando correo:', error)
    return { existe: false, error: error.message }
  }
}
