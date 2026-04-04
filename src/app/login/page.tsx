'use client'
import { useMemo, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

import { Loader2, Mail, Lock, UserPlus, LogIn } from 'lucide-react'

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false) // Estado para swichear
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = useMemo(() => createBrowserSupabaseClient(), [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isRegistering) {
      // Lógica de Registro
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) alert(error.message)
      else alert('¡Revisa tu correo! Te enviamos un enlace de confirmación.')
    } else {
      // Lógica de Login
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
      else window.location.href = '/'
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="p-8 bg-white shadow-xl rounded-2xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            {isRegistering ? 'Crea tu cuenta' : '¡Bienvenido!'}
          </h1>
          <p className="text-slate-500 mt-2">
            {isRegistering ? 'Empieza a organizar tus finanzas hoy' : 'Ingresa tus datos para continuar'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-slate-400 size-5" />
            <input 
              type="email" required placeholder="tu@email.com" 
              className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-slate-50"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 text-slate-400 size-5" />
            <input 
              type="password" required placeholder="Contraseña" 
              className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-slate-50"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : isRegistering ? <UserPlus size={20}/> : <LogIn size={20}/>}
            {isRegistering ? 'Registrarme' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  )
}