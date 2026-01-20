import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Session, User } from '@supabase/supabase-js'

interface AuthState {
    session: Session | null
    user: User | null
    role: 'admin' | 'cashier' | null
    loading: boolean
    initialize: () => Promise<void>
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    role: null,
    loading: true,

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            set({ session, user: session?.user ?? null })

            if (session?.user) {
                // Fetch role
                const { data: roleData } = await supabase
                    .from('users_roles')
                    .select('role')
                    .eq('user_id', session.user.id)
                    .single()

                set({ role: roleData?.role ?? null })
            }

            supabase.auth.onAuthStateChange(async (_event, session) => {
                set({ session, user: session?.user ?? null })
                if (session?.user) {
                    const { data: roleData } = await supabase
                        .from('users_roles')
                        .select('role')
                        .eq('user_id', session.user.id)
                        .single()
                    set({ role: roleData?.role ?? null })
                } else {
                    set({ role: null })
                }
            })
        } catch (error) {
            console.error('Auth Init Error:', error)
        } finally {
            set({ loading: false })
        }
    },

    signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error }
    },

    signOut: async () => {
        await supabase.auth.signOut()
        set({ session: null, user: null, role: null })
    }
}))
