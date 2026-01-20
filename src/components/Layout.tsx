import { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ShoppingCart, Package, Receipt, LogOut, Settings, Menu, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export default function Layout() {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const signOut = useAuthStore(state => state.signOut)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const navItems = [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/pos', label: 'Punto de Venta', icon: ShoppingCart },
        { href: '/inventory', label: 'Inventario', icon: Package },
        { href: '/sales', label: 'Ventas', icon: Receipt },
        { href: '/settings', label: 'Configuración', icon: Settings },
    ]

    const handleLogout = async () => {
        if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            await signOut()
            navigate('/login')
        }
    }

    const NavContent = () => (
        <>
            <div className="p-6 border-b">
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground p-1 rounded">TB</span>
                    Tlapalería Blas
                </h1>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                </button>
            </div>
        </>
    )

    return (
        <div className="flex h-screen bg-muted/20 overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 bg-card border-r flex-col">
                <NavContent />
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                    <aside
                        className="w-64 bg-card h-full flex flex-col shadow-xl animate-in slide-in-from-left duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-end p-2 md:hidden">
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2"><X className="w-6 h-6" /></button>
                        </div>
                        <NavContent />
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="md:hidden bg-card border-b p-4 flex items-center justify-between flex-shrink-0">
                    <button onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-bold">Tlapalería Blas</span>
                    <div className="w-6" /> {/* Spacer */}
                </header>

                <main className="flex-1 overflow-auto relative">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
