import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type Product = Database['public']['Tables']['products']['Row']

interface SalesMetrics {
    today: number
    week: number
    month: number
    todayCount: number
    weekCount: number
    monthCount: number
}

interface TopProduct {
    product_id: string
    product_name: string
    total_quantity: number
    total_revenue: number
}

interface DashboardState {
    salesMetrics: SalesMetrics
    topProducts: TopProduct[]
    lowStockProducts: Product[]
    loading: boolean
    fetchSalesMetrics: () => Promise<void>
    fetchTopProducts: (limit?: number) => Promise<void>
    fetchLowStockProducts: () => Promise<void>
    refreshAll: () => Promise<void>
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
    salesMetrics: {
        today: 0,
        week: 0,
        month: 0,
        todayCount: 0,
        weekCount: 0,
        monthCount: 0
    },
    topProducts: [],
    lowStockProducts: [],
    loading: false,

    fetchSalesMetrics: async () => {
        set({ loading: true })

        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        // Today's sales
        const { data: todaySales } = await supabase
            .from('sales')
            .select('total_amount')
            .gte('created_at', todayStart)
            .eq('status', 'completed')

        // Week's sales
        const { data: weekSales } = await supabase
            .from('sales')
            .select('total_amount')
            .gte('created_at', weekStart)
            .eq('status', 'completed')

        // Month's sales
        const { data: monthSales } = await supabase
            .from('sales')
            .select('total_amount')
            .gte('created_at', monthStart)
            .eq('status', 'completed')

        set({
            salesMetrics: {
                today: todaySales?.reduce((sum, s) => sum + s.total_amount, 0) || 0,
                week: weekSales?.reduce((sum, s) => sum + s.total_amount, 0) || 0,
                month: monthSales?.reduce((sum, s) => sum + s.total_amount, 0) || 0,
                todayCount: todaySales?.length || 0,
                weekCount: weekSales?.length || 0,
                monthCount: monthSales?.length || 0
            },
            loading: false
        })
    },

    fetchTopProducts: async (limit = 5) => {
        const { data } = await supabase
            .from('sale_items')
            .select('product_id, quantity, subtotal, products(name)')
            .not('product_id', 'is', null)

        if (data) {
            // Aggregate by product
            const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()

            data.forEach(item => {
                if (item.product_id && item.products) {
                    const existing = productMap.get(item.product_id) || { name: '', quantity: 0, revenue: 0 }
                    productMap.set(item.product_id, {
                        name: (item.products as any).name,
                        quantity: existing.quantity + item.quantity,
                        revenue: existing.revenue + item.subtotal
                    })
                }
            })

            const topProducts = Array.from(productMap.entries())
                .map(([id, data]) => ({
                    product_id: id,
                    product_name: data.name,
                    total_quantity: data.quantity,
                    total_revenue: data.revenue
                }))
                .sort((a, b) => b.total_quantity - a.total_quantity)
                .slice(0, limit)

            set({ topProducts })
        }
    },

    fetchLowStockProducts: async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .filter('stock', 'lte', 'min_stock_threshold')
            .order('stock', { ascending: true })
            .limit(10)

        if (data) {
            // Filter in JS since Supabase doesn't support column-to-column comparison directly
            const filtered = data.filter(p => p.stock <= p.min_stock_threshold)
            set({ lowStockProducts: filtered })
        }
    },

    refreshAll: async () => {
        await Promise.all([
            get().fetchSalesMetrics(),
            get().fetchTopProducts(),
            get().fetchLowStockProducts()
        ])
    }
}))
