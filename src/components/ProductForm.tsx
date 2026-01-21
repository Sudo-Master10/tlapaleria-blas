import { useState, useEffect } from 'react'
import { Database } from '@/types/supabase'
import ImageUploader from '@/components/ImageUploader'
import { useCategoryStore } from '@/stores/categoryStore'
import { X } from 'lucide-react'

type Product = Database['public']['Tables']['products']['Row']
type ProductFormData = Omit<Product, 'id' | 'created_at'>

interface ProductFormProps {
    initialData?: Product
    onSubmit: (data: ProductFormData) => Promise<void>
    onCancel: () => void
    isLoading: boolean
}

export default function ProductForm({ initialData, onSubmit, onCancel, isLoading }: ProductFormProps) {
    const { categories, fetchCategories } = useCategoryStore()
    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        description: '',
        sku: '',
        barcode: '',
        price_regular: 0,
        price_wholesale: 0,
        stock: 0,
        min_stock_threshold: 5,
        category: 'General',
        image_url: null,
        variants: null
    })

    useEffect(() => {
        fetchCategories()
    }, [])

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                description: initialData.description || '',
                sku: initialData.sku,
                barcode: initialData.barcode || '',
                price_regular: initialData.price_regular,
                price_wholesale: initialData.price_wholesale,
                stock: initialData.stock,
                min_stock_threshold: initialData.min_stock_threshold,
                category: initialData.category,
                image_url: initialData.image_url,
                variants: initialData.variants
            })
        }
    }, [initialData])

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (isSubmitting) return;

        try {
            setIsSubmitting(true);

            // Sanitize data: Convert empty strings to null for optional fields
            const dataToSubmit = {
                ...formData,
                barcode: formData.barcode?.trim() === '' ? null : formData.barcode,
                description: formData.description?.trim() === '' ? null : formData.description,
            };

            await onSubmit(dataToSubmit)
        } catch (err) {
            console.error("Error in ProductForm submission:", err);
            // Error handling should be done by parent, but we ensure state is reset
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }))
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <div className="bg-card w-full max-w-2xl rounded-lg shadow-lg border my-8">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold">
                        {initialData ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    <button onClick={onCancel} className="p-2 hover:bg-muted rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Image Upload */}
                        <div className="col-span-1 md:col-span-2 flex justify-center">
                            <ImageUploader
                                onUpload={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                                currentImage={formData.image_url ?? undefined}
                                productName={formData.name}
                            />
                        </div>

                        {/* Basic Info */}
                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <label className="text-sm font-medium">Nombre del Producto *</label>
                            <input
                                required
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                                placeholder="Ej. Martillo de uña 16oz"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">SKU (Código Interno) *</label>
                            <input
                                required
                                name="sku"
                                value={formData.sku}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                                placeholder="Ej. HER-001"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Código de Barras</label>
                            <input
                                name="barcode"
                                value={formData.barcode || ''}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                                placeholder="Escanea o escribe..."
                            />
                        </div>

                        {/* Pricing */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Precio Público *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    name="price_regular"
                                    value={formData.price_regular}
                                    onChange={handleChange}
                                    className="w-full pl-7 p-2 border rounded-md bg-background"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Precio Mayorista *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    name="price_wholesale"
                                    value={formData.price_wholesale}
                                    onChange={handleChange}
                                    className="w-full pl-7 p-2 border rounded-md bg-background"
                                />
                            </div>
                        </div>

                        {/* Stock */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Stock Actual *</label>
                            <input
                                required
                                type="number"
                                name="stock"
                                value={formData.stock}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Stock Mínimo</label>
                            <input
                                required
                                type="number"
                                name="min_stock_threshold"
                                value={formData.min_stock_threshold}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <label className="text-sm font-medium">Categoría</label>
                            <select
                                name="category"
                                value={formData.category ?? ''}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-background"
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || isSubmitting}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50"
                        >
                            {isLoading || isSubmitting ? 'Guardando...' : 'Guardar Producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
