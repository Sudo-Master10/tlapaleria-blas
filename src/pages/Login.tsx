import React, { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const signIn = useAuthStore(state => state.signIn)
    // useNavigate no es estrictamente necesario si App.tsx redirige basado en sesión, 
    // pero es bueno para forzar la navegación si es necesario o manejar estados locales.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg(null)

        const { error } = await signIn(email, password)

        if (error) {
            console.error(error)
            setErrorMsg('Credenciales inválidas. Por favor verifica tu correo y contraseña.')
            setLoading(false)
        } else {
            // El cambio de sesión en authStore disparará la redirección en App.tsx
            // No necesitamos hacer nada más aquí excepto quizás limpiar estado
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-lg border shadow-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Tlapalería Blas</h1>
                    <p className="text-muted-foreground mt-2">Ingreso al Sistema</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Correo Electrónico</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                            placeholder="usuario@tlapaleria.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Contraseña</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full p-2 pr-10 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">
                            {errorMsg}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-2.5 rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin w-4 h-4" />}
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    )
}
