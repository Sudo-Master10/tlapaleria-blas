import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'
import { useAuthStore } from './authStore'

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

        try {
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
                    hasMore: data.length === PRODUCTS_PER_PAGE
                }))
            } else if (error) {
                console.error("Dashboard: fetchProducts query error:", error)
            }
        } catch (err) {
            console.error("Fetch error:", err)
        } finally {
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
        const session = useAuthStore.getState().session;

        if (!session) {
            return { error: { message: "Sesión expirada. Por favor recarga la página o inicia sesión de nuevo." } };
        }

        try {
            // Short timeout for fallback (3s)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Supabase request timed out")), 3000)
            );

            const dbPromise = supabase
                .from('products')
                .insert(newProduct)
                .select()
                .single();

            let result: any = {};

            try {
                result = await Promise.race([dbPromise, timeoutPromise]);
            } catch (firstError) {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing env vars for fallback");

                const response = await fetch(`${supabaseUrl}/rest/v1/products`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                        'apikey': supabaseAnonKey,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(newProduct)
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Fallback failed: ${response.status} ${errText}`);
                }

                const data = await response.json();
                result = { data: data[0], error: null };
            }

            const { data, error } = result;

            if (data) {
                set((state) => ({ products: [data, ...state.products] }))
            }
            return { error }
        } catch (err: any) {
            console.error("Store: Error in addProduct:", err);
            return { error: { message: err.message || "Unknown error" } };
        }
    },

    updateProduct: async (id, updates) => {
        const session = useAuthStore.getState().session;

        if (!session) {
            return { error: { message: "Sesión expirada. Por favor recarga la página o inicia sesión de nuevo." } };
        }

        try {
            // Race condition with timeout (3s)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Supabase request timed out")), 3000)
            );

            const dbPromise = supabase
                .from('products')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            let result: any = {};

            try {
                result = await Promise.race([dbPromise, timeoutPromise]);
            } catch (firstError) {
                // Fallback: Direct Fetch
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing env vars for fallback");

                const response = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                        'apikey': supabaseAnonKey,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(updates)
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Fallback fetch failed: ${response.status} ${errText}`);
                }

                const data = await response.json();
                result = { data: data[0], error: null };
            }

            const { data, error } = result;

            if (data) {
                set((state) => ({
                    products: state.products.map(p => p.id === id ? data : p)
                }))
            }
            return { error }
        } catch (err: any) {
            console.error("Store: Unexpected error in updateProduct:", err);
            return { error: { message: err.message || "Unknown error in store" } };
        }
    },

    deleteProduct: async (id) => {
        const session = useAuthStore.getState().session;

        if (!session) {
            return { error: { message: "Sesión expirada" } };
        }

        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Supabase request timed out")), 3000)
            );

            const dbPromise = supabase
                .from('products')
                .delete()
                .eq('id', id);

            try {
                // Delete doesn't return data unless selected, but we just need to know it didn't fail
                await Promise.race([dbPromise, timeoutPromise]);
            } catch (firstError) {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing env vars");

                const response = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'apikey': supabaseAnonKey
                    }
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Fallback delete failed: ${response.status} ${errText}`);
                }
            }

            set((state) => ({
                products: state.products.filter(p => p.id !== id)
            }))

            return { error: null }
        } catch (err: any) {
            console.error("Store: Error in deleteProduct:", err);
            return { error: { message: err.message || "Unknown error" } };
        }
    }
}))
