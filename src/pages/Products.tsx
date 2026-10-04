import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface Product {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  min_stock: number
  category: string
}

// Extended initial mock/seed data items for component inventory catalog
const INITIAL_COMPONENTS = [
  { name: 'ATmega328P Microcontroller', sku: 'MCU-328P', price: 450, stock: 45, min_stock: 10, category: 'Microcontrollers' },
  { name: 'ESP32 Wi-Fi & Bluetooth Module', sku: 'WIFI-ESP32', price: 550, stock: 8, min_stock: 15, category: 'Microcontrollers' },
  { name: 'Arduino Nano V3.0', sku: 'ARD-NANO-03', price: 320, stock: 60, min_stock: 10, category: 'Development Boards' },
  { name: 'HC-05 Bluetooth Serial Module', sku: 'COMM-HC05', price: 280, stock: 4, min_stock: 10, category: 'Communication' },
  { name: 'DHT22 Temperature & Humidity Sensor', sku: 'SEN-DHT22', price: 350, stock: 25, min_stock: 5, category: 'Sensors' },
  { name: 'SG90 9G Servo Motor', sku: 'MOT-SG90-9G', price: 180, stock: 90, min_stock: 20, category: 'Actuators' },
  { name: 'LM2596 DC-DC Step-Down Buck Converter', sku: 'PWR-LM2596', price: 150, stock: 35, min_stock: 10, category: 'Power Supply' },
  { name: '16x2 I2C LCD Display Module', sku: 'DIS-1602-I2C', price: 290, stock: 18, min_stock: 8, category: 'Displays' },
  { name: 'HC-SR04 Ultrasonic Distance Sensor', sku: 'SEN-HCSR04', price: 130, stock: 50, min_stock: 12, category: 'Sensors' },
  { name: 'Raspberry Pi Pico W', sku: 'MCU-RP-PICO-W', price: 520, stock: 22, min_stock: 10, category: 'Microcontrollers' },
  { name: 'BMP280 Barometric Pressure Sensor', sku: 'SEN-BMP280', price: 410, stock: 14, min_stock: 5, category: 'Sensors' },
  { name: 'Relay Module 4-Channel 5V', sku: 'REL-4CH-5V', price: 340, stock: 30, min_stock: 8, category: 'Power Supply' }
]

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').is('deleted_at', null).order('name')
  if (error) throw error
  
  // Fallback to initial seed catalog if database table is empty
  if (!data || data.length === 0) {
    return INITIAL_COMPONENTS.map((item, index) => ({
      id: `seed-${index + 1}`,
      ...item
    }))
  }
  return data
}

export default function Products() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const { data: products = [], isLoading, error, refetch } = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [category, setCategory] = useState('Microcontrollers')
  const [busy, setBusy] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    await supabase.from('products').insert([{ name, sku, price: Number(price), stock: Number(stock), min_stock: 5, category }])
    setName(''); setSku(''); setPrice(''); setStock(''); setBusy(false); setShowAdd(false)
    refetch()
  }

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))]

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-teal-950 p-8 text-white shadow-2xl border border-white/10">
        <div className="absolute right-0 top-0 bottom-0 opacity-20 pointer-events-none hidden md:block">
          <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=600" alt="Tech Background" className="h-full w-96 object-cover" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">Hardware Catalog</span>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">Component Inventory</h1>
            <p className="text-slate-300 text-sm max-w-lg">Manage electronic components, microcontrollers, SKUs, pricing matrices, and stock velocity indicators.</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-400 to-indigo-500 text-slate-950 font-bold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transform hover:-translate-y-0.5 transition-all">
            + Add New Component
          </button>
        </div>
      </div>

      {/* Search Filter & Category Tabs */}
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl flex items-center gap-4">
          <input aria-label="Search components by name or SKU" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white" placeholder="Search by name or SKU code…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Modal Add Drawer */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <form onSubmit={handleAdd} className="w-full max-w-lg p-8 rounded-3xl bg-slate-900 border border-white/20 shadow-2xl space-y-4 text-white">
            <h2 className="font-display text-2xl font-bold">Register Component</h2>
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Component Name
                <input className="mt-1 w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g., ESP32 Wi-Fi Module" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  SKU Code
                  <input className="mt-1 w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white" required value={sku} onChange={e => setSku(e.target.value)} placeholder="WIFI-ESP32" />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Category
                  <input className="mt-1 w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white" required value={category} onChange={e => setCategory(e.target.value)} placeholder="Microcontrollers" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Price (INR)
                  <input type="number" step="0.01" className="mt-1 w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white" required value={price} onChange={e => setPrice(e.target.value)} placeholder="550" />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Initial Stock
                  <input type="number" className="mt-1 w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white" required value={stock} onChange={e => setStock(e.target.value)} placeholder="30" />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition">Cancel</button>
              <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition">Save Component</button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Products */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-48 rounded-3xl bg-slate-800/40 animate-pulse" />)}</div>
      ) : error ? (
        <p className="text-red-500 font-medium">Failed to load inventory components.</p>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-2">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No components found matching your filters.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {filtered.map(p => (
            <div key={p.id} className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none flex flex-col justify-between transform hover:-translate-y-1 transition-all duration-300 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">{p.category}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${p.stock <= p.min_stock ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    {p.stock <= p.min_stock ? 'Low Stock' : `${p.stock} in stock`}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">{p.name}</h3>
                <p className="text-xs text-slate-400 font-mono">SKU: {p.sku}</p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-widest">Unit Price</span>
                  <p className="font-display text-xl font-extrabold text-slate-900 dark:text-white">₹ {p.price.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}