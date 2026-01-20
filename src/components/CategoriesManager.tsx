import { useState, useEffect } from 'react'
import { useCategoryStore } from '@/stores/categoryStore'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'

interface CategoriesManagerProps {
    onClose: () => void
}

export default function CategoriesManager({ onClose }: CategoriesManagerProps) {
    const { categories, fetchCategories, addCategory, deleteCategory, loading } = useCategoryStore()
    const [newCategory, setNewCategory] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        fetchCategories()
    }, [])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCategory.trim()) return

        setIsSubmitting(true)
        const { error } = await addCategory(newCategory.trim())
        setIsSubmitting(false)

        if (error) {
            alert('Error al crear categoría: ' + error.message)
        } else {
            setNewCategory('')
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`¿Eliminar categoría "${name}"?`)) {
            const { error } = await deleteCategory(id)
            if (error) alert('Error al eliminar: ' + error.message)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-card w-full max-w-md rounded-lg shadow-lg border flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold">Gestionar Categorías</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 border-b">
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <input
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Nueva categoría..."
                            className="flex-1 p-2 border rounded-md bg-background"
                            disabled={isSubmitting}
                        />
                        <button
                            type="submit"
                            disabled={isSubmitting || !newCategory.trim()}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Agregar
                        </button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <div className="space-y-1">
                            {categories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-md group">
                                    <span className="font-medium">{cat.name}</span>
                                    <button
                                        onClick={() => handleDelete(cat.id, cat.name)}
                                        className="text-red-500 p-2 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {categories.length === 0 && (
                                <p className="text-center text-muted-foreground py-4">No hay categorías registradas.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
