import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/Login'
import POSPage from '@/pages/POS'
import InventoryPage from '@/pages/Inventory'
import Dashboard from '@/pages/Dashboard'
import SalesPage from '@/pages/Sales'
import { useAuthStore } from '@/stores/authStore'


function Settings() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Configuración</h1></div>
}

function App() {
    const { session, loading, initialize } = useAuthStore()

    useEffect(() => {
        initialize()
    }, [])

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Cargando Sistema...</div>
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" />} />

                <Route element={session ? <Layout /> : <Navigate to="/login" />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/pos" element={<POSPage />} />
                    <Route path="/inventory" element={<InventoryPage />} />
                    <Route path="/sales" element={<SalesPage />} />
                    <Route path="/settings" element={<Settings />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
