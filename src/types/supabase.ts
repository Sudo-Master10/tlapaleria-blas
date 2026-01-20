export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            cash_cuts: {
                Row: {
                    end_amount: number | null
                    ended_at: string | null
                    expected_amount: number | null
                    id: string
                    start_amount: number
                    started_at: string
                    user_id: string
                }
                Insert: {
                    end_amount?: number | null
                    ended_at?: string | null
                    expected_amount?: number | null
                    id?: string
                    start_amount: number
                    started_at?: string
                    user_id: string
                }
                Update: {
                    end_amount?: number | null
                    ended_at?: string | null
                    expected_amount?: number | null
                    id?: string
                    start_amount?: number
                    started_at?: string
                    user_id?: string
                }
                Relationships: []
            }
            products: {
                Row: {
                    barcode: string | null
                    category: string | null
                    created_at: string
                    description: string | null
                    id: string
                    image_url: string | null
                    min_stock_threshold: number
                    name: string
                    price_regular: number
                    price_wholesale: number
                    sku: string
                    stock: number
                    variants: Json | null
                }
                Insert: {
                    barcode?: string | null
                    category?: string | null
                    created_at?: string
                    description?: string | null
                    id?: string
                    image_url?: string | null
                    min_stock_threshold?: number
                    name: string
                    price_regular?: number
                    price_wholesale?: number
                    sku: string
                    stock: number
                    variants?: Json | null
                }
                Update: {
                    barcode?: string | null
                    category?: string | null
                    created_at?: string
                    description?: string | null
                    id?: string
                    image_url?: string | null
                    min_stock_threshold?: number
                    name?: string
                    price_regular?: number
                    price_wholesale?: number
                    sku?: string
                    stock?: number
                    variants?: Json | null
                }
                Relationships: []
            }
            sale_items: {
                Row: {
                    id: string
                    price_at_sale: number
                    product_id: string | null
                    quantity: number
                    sale_id: string
                    subtotal: number
                }
                Insert: {
                    id?: string
                    price_at_sale: number
                    product_id?: string | null
                    quantity: number
                    sale_id: string
                    subtotal: number
                }
                Update: {
                    id?: string
                    price_at_sale?: number
                    product_id?: string | null
                    quantity?: number
                    sale_id?: string
                    subtotal?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "sale_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "sale_items_sale_id_fkey"
                        columns: ["sale_id"]
                        isOneToOne: false
                        referencedRelation: "sales"
                        referencedColumns: ["id"]
                    },
                ]
            }
            categories: {
                Row: {
                    id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    created_at?: string
                }
                Relationships: []
            }
            sales: {
                Row: {
                    cashier_id: string | null
                    created_at: string
                    id: string
                    payment_method: string | null
                    status: string | null
                    total_amount: number
                }
                Insert: {
                    cashier_id?: string | null
                    created_at?: string
                    id?: string
                    payment_method?: string | null
                    status?: string | null
                    total_amount?: number
                }
                Update: {
                    cashier_id?: string | null
                    created_at?: string
                    id?: string
                    payment_method?: string | null
                    status?: string | null
                    total_amount?: number
                }
                Relationships: []
            }
            users_roles: {
                Row: {
                    created_at: string
                    id: string
                    role: Database["public"]["Enums"]["user_role"]
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    role?: Database["public"]["Enums"]["user_role"]
                    user_id: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    role?: Database["public"]["Enums"]["user_role"]
                    user_id?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            user_role: "admin" | "cashier"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
