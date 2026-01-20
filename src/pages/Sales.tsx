import { useEffect, useRef, useState } from 'react'
import { useSalesStore } from '@/stores/salesStore'
import { generateReceipt } from '@/lib/pdfUtils'
import { Receipt, Eye, Printer, Calendar } from 'lucide-react'
import { X } from 'lucide-react'

export default function SalesPage() {
    const { sales, currentSale, fetchSales, fetchSaleDetails, loading, hasMore, loadMore } = useSalesStore()
    const observerTarget = useRef<HTMLTableRowElement>(null)
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)

    useEffect(() => {
        fetchSales(true)
    }, [fetchSales])

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

    const handleViewDetails = async (saleId: string) => {
        setSelectedSaleId(saleId)
        await fetchSaleDetails(saleId)
    }

    const handleCloseModal = () => {
        setSelectedSaleId(null)
    }

    const handleReprint = () => {
        if (currentSale) {
            generateReceipt({
                items: currentSale.sale_items.map(item => ({
                    quantity: item.quantity,
                    name: item.products?.name || 'Producto',
                    price_regular: item.price_at_sale,
                    subtotal: item.subtotal
                })) as any,
                total: currentSale.total_amount,
                paymentMethod: currentSale.payment_method || 'Efectivo',
                receivedAmount: currentSale.total_amount,
                change: 0,
                date: new Date(currentSale.created_at).toLocaleString('es-MX'),
                ticketId: currentSale.id
            })
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="p-4 md:p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Receipt className="w-8 h-8 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">Ventas / Tickets</h1>
                </div>
            </div>

            <div className="bg-card rounded-md border flex flex-col flex-1 min-h-0 shadow-sm">
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 border-b sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="p-4 font-medium">Fecha</th>
                                <th className="p-4 font-medium">Total</th>
                                <th className="p-4 font-medium">Método de Pago</th>
                                <th className="p-4 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        No hay ventas registradas.
                                    </td>
                                </tr>
                            )}
                            {sales.map((sale) => (
                                <tr key={sale.id} className="border-b hover:bg-muted/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-medium">{formatDate(sale.created_at)}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-green-600">${sale.total_amount.toFixed(2)}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                            {sale.payment_method || 'Efectivo'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleViewDetails(sale.id)}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Ver Detalles
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            <tr ref={observerTarget}>
                                <td colSpan={4} className="p-4 text-center text-muted-foreground h-10">
                                    {loading && 'Cargando más ventas...'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedSaleId && currentSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-card w-full max-w-2xl rounded-lg shadow-lg border max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-xl font-bold">Detalles de Venta</h2>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-muted rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                                <div>
                                    <p className="text-sm text-muted-foreground">Fecha</p>
                                    <p className="font-medium">{formatDate(currentSale.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total</p>
                                    <p className="font-bold text-lg text-green-600">${currentSale.total_amount.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Método de Pago</p>
                                    <p className="font-medium">{currentSale.payment_method || 'Efectivo'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Estado</p>
                                    <p className="font-medium capitalize">{currentSale.status}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-3">Productos</h3>
                                <div className="space-y-2">
                                    {currentSale.sale_items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center overflow-hidden">
                                                    {item.products?.image_url ? (
                                                        <img src={item.products.image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Sin img</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{item.products?.name || 'Producto'}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.quantity} × ${item.price_at_sale.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="font-bold">${item.subtotal.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t flex justify-end gap-3">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={handleReprint}
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md flex items-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                Reimprimir Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
