import { create } from 'zustand'
import { Database } from '@/types/supabase'

type Product = Database['public']['Tables']['products']['Row']
type PriceType = 'regular' | 'wholesale'

export interface CartItem extends Product {
    quantity: number
    subtotal: number
}

interface CartState {
    items: CartItem[]
    priceType: PriceType
    setPriceType: (type: PriceType) => void
    addToCart: (product: Product, quantity?: number) => void
    removeFromCart: (productId: string) => void
    updateQuantity: (productId: string, quantity: number) => void
    clearCart: () => void
    total: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],
    priceType: 'regular',

    setPriceType: (type) => {
        set((state) => ({
            priceType: type,
            items: state.items.map(item => {
                const price = type === 'regular' ? item.price_regular : item.price_wholesale
                return {
                    ...item,
                    subtotal: item.quantity * price
                }
            })
        }))
    },

    addToCart: (product, quantity = 1) => {
        set((state) => {
            const price = state.priceType === 'regular' ? product.price_regular : product.price_wholesale
            const existing = state.items.find(i => i.id === product.id)

            if (existing) {
                return {
                    items: state.items.map(i =>
                        i.id === product.id
                            ? { ...i, quantity: i.quantity + quantity, subtotal: (i.quantity + quantity) * price }
                            : i
                    )
                }
            }
            return {
                items: [...state.items, { ...product, quantity, subtotal: quantity * price }]
            }
        })
    },

    removeFromCart: (productId) => {
        set((state) => ({
            items: state.items.filter(i => i.id !== productId)
        }))
    },

    updateQuantity: (productId, quantity) => {
        set((state) => {
            const item = state.items.find(i => i.id === productId)
            if (!item) return state

            const price = state.priceType === 'regular' ? item.price_regular : item.price_wholesale

            return {
                items: state.items.map(i =>
                    i.id === productId
                        ? { ...i, quantity, subtotal: quantity * price }
                        : i
                )
            }
        })
    },

    clearCart: () => set({ items: [] }),

    total: () => {
        const items = get().items
        return items.reduce((sum, item) => sum + item.subtotal, 0)
    }
}))
