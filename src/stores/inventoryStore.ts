import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type Product = Database['public']['Tables']['products']['Row']

interface InventoryState {
    products: Product[]
    loading: boolean
    hasMore: boolean
    page: number
    searchTerm: string
    fetchProducts: (reset?: boolean) => Promise<void>
    setSearchTerm: (term: string) => void
    loadMore: () => Promise<void>
    getProductByCode: (code: string) => Promise<Product | null>
    updateProduct: (id: string, updates: Partial<Product>) => Promise<{ error: any }>
    addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<{ error: any }>
    deleteProduct: (id: string) => Promise<{ error: any }>
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
    products: [],
    loading: false,
    hasMore: true,
    page: 0,
    searchTerm: '',

    setSearchTerm: (term: string) => {
        set({ searchTerm: term })
        get().fetchProducts(true)
    },

    fetchProducts: async (reset = false) => {
        const { page, searchTerm } = get()
        const currentPage = reset ? 0 : page
        const PRODUCTS_PER_PAGE = 20

        set({ loading: true })
        if (reset) {
            set({ products: [], hasMore: true, page: 0 })
        }

        let query = supabase
            .from('products')
            .select('*')
            .order('name')
            .range(currentPage * PRODUCTS_PER_PAGE, (currentPage + 1) * PRODUCTS_PER_PAGE - 1)

        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`)
        }

        const { data, error } = await query

        if (!error && data) {
            set(state => ({
                products: reset ? data : [...state.products, ...data],
                page: currentPage + 1,
                hasMore: data.length === PRODUCTS_PER_PAGE,
                loading: false
            }))
        } else {
            console.error(error)
            set({ loading: false })
        }
    },

    loadMore: async () => {
        const { loading, hasMore } = get()
        if (loading || !hasMore) return
        await get().fetchProducts(false)
    },

    getProductByCode: async (code: string) => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .or(`sku.eq.${code},barcode.eq.${code}`)
            .single()

        if (error) return null
        return data
    },

    addProduct: async (newProduct) => {
        const { data, error } = await supabase
            .from('products')
            .insert(newProduct)
            .select()
            .single()

        if (data) {
            set((state) => ({ products: [data, ...state.products] }))
        }
        return { error }
    },

    updateProduct: async (id, updates) => {
        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (data) {
            set((state) => ({
                products: state.products.map(p => p.id === id ? data : p)
            }))
        }
        return { error }
    },

    deleteProduct: async (id) => {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id)

        if (!error) {
            set((state) => ({
                products: state.products.filter(p => p.id !== id)
            }))
        }
        return { error }
    }
}))
