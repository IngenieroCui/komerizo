'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getRedirectUrlByRole } from '@/lib/roleRedirect'
import { getCurrentProfile } from '@/lib/session'
import Footer from './Footer'
import './Login.css'

export default function Login() {
  const [identifier, setIdentifier] = useState('') // CC o correo
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      setError('El acceso está temporalmente desactivado. Contacta al administrador.')
      return
    }
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: identifier.trim().toLowerCase(), password })
      if (authError) throw new Error('Correo o contraseña incorrectos.')
      let profile
      try { profile = await getCurrentProfile() }
      catch (error) { await supabase.auth.signOut(); throw error }
      if (!profile) throw new Error('No se pudo recuperar la sesión.')
      setPassword('')
      window.location.assign(getRedirectUrlByRole(profile.roles))
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error)
      setError(error.message || 'Ocurrió un error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">🔐 Komerizo</h1>
        <p className="login-subtitle">Plataforma de Gestión de Comunales</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="identifier">📧 Correo electrónico</label>
            <input
              id="identifier"
              type="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="tu@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">🔒 Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {error && <div className="message error">{error}</div>}
          {message && <div className="message success">{message}</div>}

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? '⏳ Iniciando sesión...' : '✨ Iniciar Sesión'}
          </button>
        </form>

        <p className="login-footer">
          ℹ️ ¿No tienes cuenta? Contacta al administrador de la JAC
        </p>
      </div>
      <Footer />
    </div>
  )
}
