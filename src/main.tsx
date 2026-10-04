import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/auth'
import { CartProvider } from './lib/cart'
import App from './App'
import './index.css'
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><QueryClientProvider client={qc}><BrowserRouter><AuthProvider><CartProvider><App /></CartProvider></AuthProvider></BrowserRouter></QueryClientProvider></React.StrictMode>)

if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
