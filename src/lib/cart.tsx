import { createContext, useContext, useState, ReactNode } from 'react'
export type CartLine = { product_id: string; name: string; price: number; currency: string; quantity: number }
const Ctx = createContext<{ lines: CartLine[]; add: (l: Omit<CartLine, 'quantity'>) => void; setQty: (id: string, q: number) => void; clear: () => void; count: number }>(null as never)
export const useCart = () => useContext(Ctx)
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const add = (l: Omit<CartLine, 'quantity'>) => setLines(p => p.some(x => x.product_id === l.product_id) ? p.map(x => x.product_id === l.product_id ? { ...x, quantity: x.quantity + 1 } : x) : [...p, { ...l, quantity: 1 }])
  const setQty = (id: string, q: number) => setLines(p => q <= 0 ? p.filter(x => x.product_id !== id) : p.map(x => x.product_id === id ? { ...x, quantity: q } : x))
  return <Ctx.Provider value={{ lines, add, setQty, clear: () => setLines([]), count: lines.reduce((a, l) => a + l.quantity, 0) }}>{children}</Ctx.Provider>
}
