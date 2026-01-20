import { useEffect } from 'react'
import { useDashboardStore } from '@/stores/dashboardStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Package, AlertTriangle, ShoppingCart, DollarSign } from 'lucide-react'

export default function Dashboard() {
    const {
        salesMetrics,
        topProducts,
        lowStockProducts,
        loading,
        refreshAll
    } = useDashboardStore()

    useEffect(() => {
        refreshAll()
    }, [refreshAll])

    const avgTicket = salesMetrics.todayCount > 0
        ? salesMetrics.today / salesMetrics.todayCount
        : 0

    const chartData = [
        { name: 'Hoy', ventas: salesMetrics.today },
        { name: 'Esta Semana', ventas: salesMetrics.week },
        { name: 'Este Mes', ventas: salesMetrics.month }
    ]

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <button
                    onClick={refreshAll}
                    disabled={loading}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm"
                >
                    {loading ? 'Actualizando...' : 'Actualizar'}
                </button>
            </div>

            {/* Revenue Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Ventas Hoy</span>
                        <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold">${salesMetrics.today.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{salesMetrics.todayCount} transacciones</p>
                </div>

                <div className="bg-card border rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Ventas Semana</span>
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold">${salesMetrics.week.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{salesMetrics.weekCount} transacciones</p>
                </div>

                <div className="bg-card border rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Ventas Mes</span>
                        <ShoppingCart className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-2xl font-bold">${salesMetrics.month.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{salesMetrics.monthCount} transacciones</p>
                </div>

                <div className="bg-card border rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Ticket Promedio</span>
                        <Package className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="text-2xl font-bold">${avgTicket.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Hoy</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Chart */}
                <div className="lg:col-span-2 bg-card border rounded-lg p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Resumen de Ventas</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip
                                formatter={(value: number | undefined) => value ? `$${value.toFixed(2)}` : '$0.00'}
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                            />
                            <Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Products */}
                <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Productos Más Vendidos</h2>
                    <div className="space-y-3">
                        {topProducts.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No hay datos de ventas aún
                            </p>
                        )}
                        {topProducts.map((product, idx) => (
                            <div key={product.product_id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium line-clamp-1">{product.product_name}</div>
                                        <div className="text-xs text-muted-foreground">{product.total_quantity} unidades</div>
                                    </div>
                                </div>
                                <div className="text-sm font-semibold text-green-600">
                                    ${product.total_revenue.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Low Stock Alert */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h2 className="text-lg font-semibold">Alertas de Stock Bajo</h2>
                </div>

                {lowStockProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        ✅ Todos los productos tienen stock suficiente
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {lowStockProducts.map(product => (
                            <div key={product.id} className="border border-red-200 bg-red-50 rounded-md p-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm line-clamp-1">{product.name}</div>
                                        <div className="text-xs text-muted-foreground">{product.sku}</div>
                                    </div>
                                    <div className="ml-2">
                                        <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                                            {product.stock}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Mínimo: {product.min_stock_threshold}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
