import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type Sale = Database['public']['Tables']['sales']['Row']
type SaleItem = Database['public']['Tables']['sale_items']['Row']

interface SaleWithItems extends Sale {
    sale_items: (SaleItem & { products: any })[]
}

interface SalesState {
    sales: Sale[]
    currentSale: SaleWithItems | null
    loading: boolean
    hasMore: boolean
    page: number
    fetchSales: (reset?: boolean) => Promise<void>
    fetchSaleDetails: (saleId: string) => Promise<void>
    loadMore: () => Promise<void>
}

export const useSalesStore = create<SalesState>((set, get) => ({
    sales: [],
    currentSale: null,
    loading: false,
    hasMore: true,
    page: 0,

    fetchSales: async (reset = false) => {
        const { page } = get()
        const currentPage = reset ? 0 : page
        const SALES_PER_PAGE = 20

        set({ loading: true })
        if (reset) {
            set({ sales: [], hasMore: true, page: 0 })
        }

        const { data, error } = await supabase
            .from('sales')
            .select('*')
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .range(currentPage * SALES_PER_PAGE, (currentPage + 1) * SALES_PER_PAGE - 1)

        if (!error && data) {
            set(state => ({
                sales: reset ? data : [...state.sales, ...data],
                page: currentPage + 1,
                hasMore: data.length === SALES_PER_PAGE,
                loading: false
            }))
        } else {
            set({ loading: false })
        }
    },

    fetchSaleDetails: async (saleId: string) => {
        set({ loading: true })

        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .select(`
                *,
                sale_items (
                    *,
                    products (name, sku, image_url)
                )
            `)
            .eq('id', saleId)
            .single()

        if (!saleError && sale) {
            set({ currentSale: sale as SaleWithItems, loading: false })
        } else {
            set({ loading: false })
        }
    },

    loadMore: async () => {
        const { loading, hasMore } = get()
        if (loading || !hasMore) return
        await get().fetchSales(false)
    }
}))
