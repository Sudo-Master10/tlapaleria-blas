import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type Category = Database['public']['Tables']['categories']['Row']

interface CategoryState {
    categories: Category[]
    loading: boolean
    fetchCategories: () => Promise<void>
    addCategory: (name: string) => Promise<{ error: any }>
    deleteCategory: (id: string) => Promise<{ error: any }>
}

export const useCategoryStore = create<CategoryState>((set) => ({
    categories: [],
    loading: false,

    fetchCategories: async () => {
        set({ loading: true })
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name')

        if (!error && data) {
            set({ categories: data })
        }
        set({ loading: false })
    },

    addCategory: async (name: string) => {
        const { data, error } = await supabase
            .from('categories')
            .insert({ name })
            .select()
            .single()

        if (data) {
            set((state) => ({ categories: [...state.categories, data].sort((a, b) => a.name.localeCompare(b.name)) }))
        }
        return { error }
    },

    deleteCategory: async (id: string) => {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id)

        if (!error) {
            set((state) => ({
                categories: state.categories.filter(c => c.id !== id)
            }))
        }
        return { error }
    }
}))
