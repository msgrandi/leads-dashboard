'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ScrapingPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [maxResults, setMaxResults] = useState(20)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleScraping() {
    if (!query.trim()) {
      alert('⚠️ Inserisci una query di ricerca')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      // Qui chiamerai il tuo webhook n8n
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_SCRAPING_WEBHOOK || ''
      
      if (!webhookUrl) {
        alert('⚠️ Webhook n8n non configurato. Aggiungi NEXT_PUBLIC_N8N_SCRAPING_WEBHOOK in .env.local')
        setLoading(false)
        return
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          maxResults: maxResults
        })
      })

      if (response.ok) {
        setResult(`✅ Scraping avviato per: "${query}" (max ${maxResults} risultati)`)
      } else {
        throw new Error('Errore risposta webhook')
      }
    } catch (error) {
      console.error('Errore:', error)
      setResult('❌ Errore durante l\'avvio dello scraping')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-[#00243F] shadow-lg">
        <div className="flex items-center justify-between py-4 px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🔍</span>
            <div>
              <h1 className="text-xl font-bold text-white">Scraping Google Maps</h1>
              <p className="text-slate-300 text-sm">Trova nuovi dentisti</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-white text-[#00243F] px-5 py-2 rounded-lg hover:bg-gray-100 transition-all font-medium"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4">🚀 Avvia Nuovo Scraping</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Query di ricerca *</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="es: dentisti Milano, studi dentistici Como..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max risultati</label>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10 risultati</option>
                <option value={20}>20 risultati</option>
                <option value={50}>50 risultati</option>
                <option value={100}>100 risultati</option>
              </select>
            </div>

            <button
              onClick={handleScraping}
              disabled={loading}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Avvio in corso...' : '🚀 Avvia Scraping'}
            </button>
          </div>

          {result && (
            <div className={`mt-4 p-4 rounded-lg ${result.includes('✅') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={result.includes('✅') ? 'text-green-700' : 'text-red-700'}>{result}</p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
          <p className="text-sm text-blue-700">
            <strong>💡 Come funziona:</strong><br />
            1. Inserisci la query (es: "dentisti Milano")<br />
            2. Scegli quanti risultati vuoi<br />
            3. Clicca "Avvia Scraping"<br />
            4. I lead verranno salvati automaticamente nel database
          </p>
        </div>
      </main>
    </div>
  )
}
