import { useState, useEffect, useRef } from 'react'
import { useInventoryStore } from '@/stores/inventoryStore'
import { Database } from '@/types/supabase'
import ProductForm from '@/components/ProductForm'
import CategoriesManager from '@/components/CategoriesManager'
import { Search, Plus, Pencil, Trash2, Tags } from 'lucide-react'

type Product = Database['public']['Tables']['products']['Row']

export default function InventoryPage() {
    const {
        products,
        fetchProducts,
        loading,
        hasMore,
        loadMore,
        setSearchTerm,
        addProduct,
        updateProduct,
        deleteProduct
    } = useInventoryStore()

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined)
    const [localSearch, setLocalSearch] = useState('')
    const observerTarget = useRef<HTMLTableRowElement>(null)

    // Initial Load
    useEffect(() => {
        fetchProducts(true)
    }, [fetchProducts])

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(localSearch)
        }, 500)
        return () => clearTimeout(timer)
    }, [localSearch, setSearchTerm])

    // Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadMore()
                }
            },
            { threshold: 1.0 }
        )

        if (observerTarget.current) {
            observer.observe(observerTarget.current)
        }

        return () => observer.disconnect()
    }, [hasMore, loading, loadMore])

    const handleCreate = () => {
        setEditingProduct(undefined)
        setIsModalOpen(true)
    }

    const handleEdit = (product: Product) => {
        setEditingProduct(product)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) {
            await deleteProduct(id)
        }
    }

    const handleSubmit = async (formData: any) => {
        let result;
        try {
            if (editingProduct) {
                result = await updateProduct(editingProduct.id, formData)
            } else {
                result = await addProduct(formData)
            }

            if (result.error) {
                console.error("Error saving product:", result.error)
                alert(`Error al guardar el producto: ${result.error.message || JSON.stringify(result.error)}`)
                return; // Do NOT close modal
            }

            setIsModalOpen(false)
        } catch (e: any) {
            console.error("Unexpected error in handleSubmit:", e)
            alert(`Error inesperado: ${e.message || e}`)
        }
    }

    return (
        <div className="p-4 md:p-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold tracking-tight">Inventario de Productos</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsCategoryManagerOpen(true)}
                        className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-secondary/80 transition-colors"
                    >
                        <Tags className="w-4 h-4" />
                        Categorías
                    </button>
                    <button
                        onClick={handleCreate}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Producto
                    </button>
                </div>
            </div>

            <div className="bg-card rounded-md border flex flex-col flex-1 min-h-0 shadow-sm">
                <div className="p-4 border-b">
                    <div className="relative max-w-md">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            placeholder="Buscar por nombre, SKU o código..."
                            className="w-full pl-8 p-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 border-b sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="p-4 font-medium min-w-[300px]">Producto</th>
                                <th className="p-4 font-medium">SKU</th>
                                <th className="p-4 font-medium">Precio Pub.</th>
                                <th className="p-4 font-medium">Precio May.</th>
                                <th className="p-4 font-medium text-center">Stock</th>
                                <th className="p-4 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                        No se encontraron productos.
                                    </td>
                                </tr>
                            )}
                            {products.map((p) => (
                                <tr key={p.id} className="border-b hover:bg-muted/50 transition-colors group">
                                    <td className="p-4 font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {p.image_url ? (
                                                    <img
                                                        src={p.image_url}
                                                        alt=""
                                                        className="object-cover w-full h-full"
                                                        referrerPolicy="no-referrer"
                                                        onError={(e) => {
                                                            console.error("Image load error:", e);
                                                            e.currentTarget.style.display = 'none'; // Hide broken image
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground">Sin img</span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-semibold line-clamp-1">{p.name}</div>
                                                <div className="text-xs text-muted-foreground">{p.category}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-muted-foreground">{p.sku}</td>
                                    <td className="p-4 font-medium">${p.price_regular}</td>
                                    <td className="p-4 text-blue-600">${p.price_wholesale}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px - 2 py - 1 rounded - full text - xs font - bold ${p.stock <= p.min_stock_threshold
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                            } `}>
                                            {p.stock}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(p)}
                                                className="p-2 hover:bg-muted rounded-md text-blue-600"
                                                title="Editar"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p.id)}
                                                className="p-2 hover:bg-red-50 rounded-md text-red-600"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {/* Sentinel Row */}
                            <tr ref={observerTarget}>
                                <td colSpan={6} className="p-4 text-center text-muted-foreground h-10">
                                    {loading && 'Cargando más productos...'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {isCategoryManagerOpen && (
                <CategoriesManager onClose={() => setIsCategoryManagerOpen(false)} />
            )}

            {isModalOpen && (
                <ProductForm
                    initialData={editingProduct}
                    onSubmit={handleSubmit}
                    onCancel={() => setIsModalOpen(false)}
                    isLoading={loading}
                />
            )}
        </div>
    )
}
