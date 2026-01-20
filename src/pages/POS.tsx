import { useEffect, useState, useRef } from 'react'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import { Search, Plus, Minus, Trash2, Eye, ScanBarcode, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Database } from '@/types/supabase'
import { supabase } from '@/lib/supabase'
import { generateReceipt } from '@/lib/pdfUtils'
import { v4 as uuidv4 } from 'uuid'
import BarcodeScannerComponent from 'react-qr-barcode-scanner'

type Product = Database['public']['Tables']['products']['Row']

export default function POSPage() {
    const { products, fetchProducts, loading, hasMore, loadMore, setSearchTerm: setStoreSearchTerm, getProductByCode } = useInventoryStore()
    const { items, addToCart, removeFromCart, updateQuantity, total, clearCart, priceType, setPriceType } = useCartStore()
    const { user } = useAuthStore()

    const [localSearchTerm, setLocalSearchTerm] = useState('')
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const observerTarget = useRef<HTMLDivElement>(null)

    // Checkout Modal State
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
    const [receivedAmount, setReceivedAmount] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    // Scanner State
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [lastScanned, setLastScanned] = useState<string | null>(null)

    // Initial Load
    useEffect(() => {
        fetchProducts(true)
    }, [])

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setStoreSearchTerm(localSearchTerm)
        }, 500)
        return () => clearTimeout(timer)
    }, [localSearchTerm, setStoreSearchTerm])

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

    const cartTotal = total()
    const change = Number(receivedAmount) - cartTotal

    const handleScan = async (_err: unknown, result: any) => {
        if (result) {
            const code = result.text
            if (code === lastScanned) return // Debounce duplicate scans

            // 1. Try to find in current list
            let product = products.find(p => p.barcode === code || p.sku === code)

            // 2. If not found, try to fetch from DB
            if (!product) {
                const fetched = await getProductByCode(code)
                if (fetched) product = fetched
            }

            if (product) {
                addToCart(product)
                setLastScanned(code)
                // Optional: Play beep sound here
                // Reset debounce after 2 seconds
                setTimeout(() => setLastScanned(null), 2000)
            } else {
                console.log('Product not found:', code)
            }
        }
    }

    const handleProcessSale = async () => {
        if (!user) {
            alert('Error: No hay sesión de usuario activa.')
            return
        }
        if (Number(receivedAmount) < cartTotal) {
            alert('El monto recibido es insuficiente.')
            return
        }

        setIsProcessing(true)
        try {
            const saleId = uuidv4()
            const now = new Date().toISOString()

            // 1. Create Sale Record
            const { error: saleError } = await supabase.from('sales').insert({
                id: saleId,
                cashier_id: user.id,
                total_amount: cartTotal,
                payment_method: 'cash',
                status: 'completed',
                created_at: now
            })

            if (saleError) throw saleError

            // 2. Create Sale Items
            const saleItems = items.map(item => ({
                sale_id: saleId,
                product_id: item.id,
                quantity: item.quantity,
                price_at_sale: priceType === 'regular' ? item.price_regular : item.price_wholesale,
                subtotal: item.subtotal
            }))

            const { error: itemsError } = await supabase.from('sale_items').insert(saleItems)

            if (itemsError) throw itemsError

            // 3. Generate Receipt
            generateReceipt({
                items,
                total: cartTotal,
                receivedAmount: Number(receivedAmount),
                change,
                paymentMethod: 'Efectivo',
                date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
                ticketId: saleId
            })

            // 4. Cleanup
            alert('¡Venta completada con éxito!')
            clearCart()
            setIsCheckoutOpen(false)
            setReceivedAmount('')

        } catch (error: any) {
            console.error('Checkout Error:', error)
            alert('Hubo un error al procesar la venta: ' + error.message)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:h-full lg:overflow-hidden p-2 lg:p-4">
            {/* Left Panel: Product Grid */}
            <div className="lg:col-span-8 bg-card rounded-lg p-4 shadow-sm border flex flex-col h-[500px] lg:h-full min-h-0 order-2 lg:order-1">
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 flex-shrink-0">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            placeholder="Buscar producto..."
                            value={localSearchTerm}
                            onChange={(e) => setLocalSearchTerm(e.target.value)}
                            className="pl-8 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="h-10 px-4 py-2 w-full sm:w-auto bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md flex items-center justify-center gap-2 font-medium"
                    >
                        <ScanBarcode className="w-4 h-4" />
                        <span>Escanear</span>
                    </button>
                </div>

                {/* Pricing Toggle */}
                <div className="mb-4 flex gap-2 flex-shrink-0 overflow-x-auto pb-1">
                    <button
                        onClick={() => setPriceType('regular')}
                        className={cn(
                            "px-4 py-1 text-sm rounded-full border transition-colors whitespace-nowrap",
                            priceType === 'regular' ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground"
                        )}
                    >
                        Público General
                    </button>
                    <button
                        onClick={() => setPriceType('wholesale')}
                        className={cn(
                            "px-4 py-1 text-sm rounded-full border transition-colors whitespace-nowrap",
                            priceType === 'wholesale' ? "bg-blue-600 text-white border-blue-600" : "bg-background text-muted-foreground"
                        )}
                    >
                        Mayorista
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto pr-2 pb-4 min-h-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
                        {products.map(product => {
                            const currentPrice = priceType === 'regular' ? product.price_regular : product.price_wholesale
                            return (
                                <div key={product.id} className="border rounded-md p-2 lg:p-3 flex flex-col gap-2 hover:border-primary transition-colors bg-background relative group shadow-sm">
                                    <div className="relative aspect-square bg-muted rounded-md overflow-hidden mb-2">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Sin Imagen</div>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedProduct(product)
                                            }}
                                            className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        {product.stock <= product.min_stock_threshold && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-red-500/90 text-white text-[10px] py-0.5 text-center font-bold">
                                                BAJO STOCK
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-h-[2.5rem]">
                                        <h3 className="font-medium text-xs lg:text-sm line-clamp-2 leading-tight">{product.name}</h3>
                                        <p className="text-[10px] lg:text-xs text-muted-foreground mt-1">{product.sku}</p>
                                    </div>
                                    <div className="flex justify-between items-center mt-auto pt-2 border-t">
                                        <span className={cn("font-bold text-base lg:text-lg", priceType === 'wholesale' && "text-blue-700")}>
                                            ${currentPrice}
                                        </span>
                                        <button
                                            onClick={() => addToCart(product)}
                                            className="h-7 w-7 lg:h-8 lg:w-8 flex items-center justify-center bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-transform active:scale-95"
                                        >
                                            <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {/* Sentinel for Infinite Scroll */}
                    <div ref={observerTarget} className="h-10 flex items-center justify-center mt-4">
                        {loading && <span className="text-muted-foreground text-sm">Cargando...</span>}
                    </div>
                </div>
            </div>

            {/* Right Panel: Cart */}
            <div className="lg:col-span-4 bg-card rounded-lg p-4 shadow-sm border flex flex-col h-auto lg:h-full min-h-0 order-1 lg:order-2 mb-4 lg:mb-0">
                <div className="flex justify-between items-center mb-4 pb-2 border-b flex-shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <div className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                            {items.length}
                        </div>
                        Carrito
                    </h2>
                    <button
                        onClick={clearCart}
                        className="text-xs text-destructive hover:underline font-medium"
                        disabled={items.length === 0}
                    >
                        Limpiar todo
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-3 pb-4 min-h-0">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                            <ScanBarcode className="w-16 h-16 mb-4" />
                            <p className="text-center px-4">Escanea un código o selecciona productos del catálogo</p>
                        </div>
                    ) : (
                        items.map(item => {
                            const price = priceType === 'regular' ? item.price_regular : item.price_wholesale
                            return (
                                <div key={item.id} className="flex gap-3 p-3 border rounded-md bg-muted/20 hover:bg-muted/30 transition-colors">
                                    <div className="w-12 h-12 bg-white rounded border flex-shrink-0 overflow-hidden">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                        ) : null}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm truncate">{item.name}</h4>
                                        <div className="text-xs text-muted-foreground mt-0.5">${price} x {item.quantity}</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="font-bold text-sm text-primary">${item.subtotal.toFixed(2)}</span>
                                        <div className="flex items-center gap-1 bg-background rounded border shadow-sm">
                                            <button
                                                className="p-1 hover:bg-muted text-foreground"
                                                onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="text-xs w-5 text-center font-medium">{item.quantity}</span>
                                            <button
                                                className="p-1 hover:bg-muted text-foreground"
                                                onClick={() => addToCart(item)}
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="text-muted-foreground hover:text-destructive p-1 self-start"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="border-t pt-4 mt-auto bg-muted/10 -mx-4 px-4 pb-6">
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Subtotal</span>
                            <span>${total().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>IVA (16% incluido)</span>
                            <span>${(total() * 0.16).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-3xl font-bold pt-2 text-primary">
                            <span>Total</span>
                            <span>${total().toFixed(2)}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCheckoutOpen(true)}
                        disabled={items.length === 0}
                        className="w-full h-14 bg-green-600 text-white text-xl rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                    >
                        COBRAR
                    </button>
                </div>
            </div>

            {/* Product Detail Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedProduct(null)}>
                    <div className="bg-card w-full max-w-2xl rounded-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end p-2 absolute right-0 top-0 z-10">
                            <button onClick={() => setSelectedProduct(null)} className="bg-black/20 hover:bg-black/40 text-black rounded-full p-1"><X className="w-5 h-5 text-white" /></button>
                        </div>
                        <div className="grid md:grid-cols-2">
                            <div className="aspect-square bg-white flex items-center justify-center p-8 bg-muted/20">
                                {selectedProduct.image_url ? (
                                    <img src={selectedProduct.image_url} alt={selectedProduct.name} className="object-contain w-full h-full drop-shadow-md" />
                                ) : (
                                    <span className="text-muted-foreground">Sin Imagen</span>
                                )}
                            </div>
                            <div className="p-6 flex flex-col">
                                <h2 className="text-2xl font-bold mb-2 leading-tight">{selectedProduct.name}</h2>
                                <div className="mb-4 flex flex-wrap gap-2">
                                    <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-xs font-bold uppercase">{selectedProduct.category}</span>
                                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs">SKU: {selectedProduct.sku}</span>
                                </div>

                                <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">
                                    {selectedProduct.description || "Sin descripción disponible."}
                                </p>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className={cn("border-2 rounded-lg p-3 text-center cursor-pointer transition-colors", priceType === 'regular' ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground")}>
                                            <div className="text-xs uppercase font-bold text-muted-foreground mb-1">Precio Público</div>
                                            <div className="text-2xl font-bold">${selectedProduct.price_regular}</div>
                                        </div>
                                        <div className={cn("border-2 rounded-lg p-3 text-center cursor-pointer transition-colors", priceType === 'wholesale' ? "border-blue-500 bg-blue-50" : "border-border hover:border-muted-foreground")}>
                                            <div className="text-xs uppercase font-bold text-blue-600 mb-1">Mayoreo</div>
                                            <div className="text-2xl font-bold text-blue-700">${selectedProduct.price_wholesale}</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            addToCart(selectedProduct)
                                            setSelectedProduct(null)
                                        }}
                                        className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-bold text-lg hover:bg-primary/90 flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-5 h-5" /> Agregar al Carrito
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b bg-muted/10">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold">Resumen de Pago</h2>
                                <button onClick={() => setIsCheckoutOpen(false)}><X className="w-6 h-6 text-muted-foreground" /></button>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="text-center space-y-2">
                                <p className="text-muted-foreground">Total a Pagar</p>
                                <div className="text-5xl font-black text-primary">${cartTotal.toFixed(2)}</div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Monto Recibido</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">$</span>
                                    <input
                                        type="number"
                                        autoFocus
                                        value={receivedAmount}
                                        onChange={e => setReceivedAmount(e.target.value)}
                                        className="w-full h-14 pl-8 text-2xl font-bold rounded-lg border-2 focus:border-primary focus:ring-0"
                                        placeholder="0.00"
                                    />
                                </div>
                                {change >= 0 && (
                                    <div className="flex justify-between items-center p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
                                        <span className="font-bold">Cambio a devolver</span>
                                        <span className="text-xl font-black">${change.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleProcessSale}
                                disabled={isProcessing || Number(receivedAmount) < cartTotal}
                                className="w-full h-14 bg-primary text-primary-foreground rounded-lg font-bold text-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isProcessing ? 'Procesando...' : (
                                    <>
                                        <Check className="w-6 h-6" /> Finalizar Venta
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scanner Modal */}
            {isScannerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-card w-full max-w-md rounded-lg overflow-hidden shadow-xl relative">
                        <button
                            onClick={() => setIsScannerOpen(false)}
                            className="absolute top-2 right-2 z-10 bg-white/20 p-2 rounded-full text-white hover:bg-white/40"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="bg-black relative aspect-square flex items-center justify-center">
                            <BarcodeScannerComponent
                                width="100%"
                                height="100%"
                                onUpdate={handleScan}
                                onError={(err: any) => console.log(err)}
                            />
                            {/* Scanner Overlay UI */}
                            <div className="absolute inset-0 border-2 border-primary/50 m-12 rounded-lg pointer-events-none animate-pulse"></div>
                        </div>

                        <div className="p-4 text-center">
                            <h3 className="font-bold text-lg mb-1">Escaneando Código...</h3>
                            <p className="text-sm text-muted-foreground mb-2">Apunta la cámara al código de barras</p>

                            {lastScanned && (
                                <div className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold animate-bounce">
                                    ¡Detectado: {lastScanned}!
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
