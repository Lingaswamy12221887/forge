import { lazy, Suspense, ReactNode } from 'react'
import { Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Package, LogOut, ShoppingCart, Receipt, LifeBuoy, FileText, Wrench, GraduationCap, Bell, BarChart3, Landmark, Users, Boxes, FolderOpen } from 'lucide-react'
import { useCart } from './lib/cart'
import NotificationBadge from './components/NotificationBadge'
import AIChat from './components/AIChat'
import CommandPalette from './components/CommandPalette'
import { useAuth } from './lib/auth'
const Login = lazy(() => import('./pages/Login')), Dashboard = lazy(() => import('./pages/Dashboard')),
  Products = lazy(() => import('./pages/Products')), Onboarding = lazy(() => import('./pages/Onboarding')),
  Cart = lazy(() => import('./pages/Cart')), Orders = lazy(() => import('./pages/Orders')), Tickets = lazy(() => import('./pages/Tickets')),
  Quotes = lazy(() => import('./pages/Quotes')), Prototypes = lazy(() => import('./pages/Prototypes')),
  Training = lazy(() => import('./pages/Training')), VerifyCertificate = lazy(() => import('./pages/VerifyCertificate')),
  Notifications = lazy(() => import('./pages/Notifications')), Reports = lazy(() => import('./pages/Reports')), Finance = lazy(() => import('./pages/Finance')),
  Crm = lazy(() => import('./pages/Crm')), Inventory = lazy(() => import('./pages/Inventory')), Documents = lazy(() => import('./pages/Documents'))
function Guard({ children }: { children: ReactNode }) {
  const { session, loading, orgId } = useAuth()
  if (loading) return <p className="p-8">Loading…</p>
  if (!session) return <Navigate to="/login" replace />
  if (!orgId) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
function Shell() {
  const { signOut } = useAuth(); const { count } = useCart()
  const link = ({ isActive }: { isActive: boolean }) => `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-signal text-white' : 'hover:bg-black/5'}`
  return (<div className="min-h-screen md:flex">
    <nav aria-label="Main" className="flex gap-2 border-b border-black/10 p-3 md:w-56 md:flex-col md:border-b-0 md:border-r">
      <span className="hidden px-3 py-2 font-display text-xl font-bold md:block">Forge</span>
      <NavLink to="/" end className={link}><LayoutDashboard size={16} />Overview</NavLink>
      <NavLink to="/products" className={link}><Package size={16} />Products</NavLink>
      <NavLink to="/cart" className={link}><ShoppingCart size={16} />Cart{count > 0 && ` (${count})`}</NavLink>
      <NavLink to="/orders" className={link}><Receipt size={16} />Orders</NavLink>
      <NavLink to="/quotes" className={link}><FileText size={16} />Quotations</NavLink>
      <NavLink to="/prototyping" className={link}><Wrench size={16} />Prototyping</NavLink>
      <NavLink to="/training" className={link}><GraduationCap size={16} />Training</NavLink>
      <NavLink to="/notifications" className={link}><Bell size={16} />Notifications<NotificationBadge /></NavLink>
      <NavLink to="/crm" className={link}><Users size={16} />Pipeline</NavLink>
      <NavLink to="/inventory" className={link}><Boxes size={16} />Inventory</NavLink>
      <NavLink to="/documents" className={link}><FolderOpen size={16} />Documents</NavLink>
      <NavLink to="/finance" className={link}><Landmark size={16} />Finance</NavLink>
      <NavLink to="/reports" className={link}><BarChart3 size={16} />Reports</NavLink>
      <NavLink to="/support" className={link}><LifeBuoy size={16} />Support</NavLink>
      <button onClick={signOut} className="flex items-center gap-2 px-3 py-2 text-sm md:mt-auto"><LogOut size={16} />Sign out</button></nav>
    <main className="flex-1 p-6"><Outlet /></main><AIChat /><CommandPalette /></div>)
}
export default function App() {
  return (<Suspense fallback={<p className="p-8">Loading…</p>}><Routes>
    <Route path="/login" element={<Login />} /><Route path="/verify-certificate/:code" element={<VerifyCertificate />} /><Route path="/onboarding" element={<Onboarding />} />
    <Route element={<Guard><Shell /></Guard>}><Route index element={<Dashboard />} /><Route path="products" element={<Products />} /><Route path="cart" element={<Cart />} /><Route path="orders" element={<Orders />} /><Route path="quotes" element={<Quotes />} /><Route path="prototyping" element={<Prototypes />} /><Route path="training" element={<Training />} /><Route path="notifications" element={<Notifications />} /><Route path="crm" element={<Crm />} /><Route path="inventory" element={<Inventory />} /><Route path="documents" element={<Documents />} /><Route path="finance" element={<Finance />} /><Route path="reports" element={<Reports />} /><Route path="support" element={<Tickets />} /></Route>
    <Route path="*" element={<p className="p-8">Page not found.</p>} /></Routes></Suspense>)
}
