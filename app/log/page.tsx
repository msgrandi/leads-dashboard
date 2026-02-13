'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type LogEntry = {
  id: number
  lead_id: number
  azione: string
  dettagli: string
  timestamp: string
  leads?: any
}

function getNome(log: LogEntry): string {
  if (!log.leads) return `Lead #${log.lead_id}`
  if (Array.isArray(log.leads)) return log.leads[0]?.nome || `Lead #${log.lead_id}`
  return log.leads.nome || `Lead #${log.lead_id}`
}

function getTelefono(log: LogEntry): string | null {
  if (!log.leads) return null
  if (Array.isArray(log.leads)) return log.leads[0]?.telefono || null
  return log.leads.telefono || null
}

export default function LogPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAzione, setFiltroAzione] = useState('tutti')
  const [searchQuery, setSearchQuery] = useState('')
  const [logsFiltered, setLogsFiltered] = useState<LogEntry[]>([])
  const [contatori, setContatori] = useState({
    totale: 0,
    template_inviato: 0,
    approvato: 0,
    generato: 0,
    modificato: 0
  })

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    let filtered = logs
    if (filtroAzione !== 'tutti') {
      if (filtroAzione === 'template_whatsapp_inviato') {
        filtered = filtered.filter(l => l.azione === 'template_whatsapp_inviato' || l.azione === 'template_whatsapp_utilizzato')
      } else {
        filtered = filtered.filter(l => l.azione === filtroAzione)
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(l =>
        getNome(l).toLowerCase().includes(q) ||
        l.dettagli?.toLowerCase().includes(q) ||
        l.azione?.toLowerCase().includes(q)
      )
    }
    setLogsFiltered(filtered)
  }, [logs, filtroAzione, searchQuery])

  async function fetchLogs() {
    const { data, error } = await supabase
      .from('log')
      .select('*, leads(nome, telefono)')
      .order('timestamp', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Errore fetch log:', error)
    } else {
      const d = data || []
      setLogs(d)
      setLogsFiltered(d)
      setContatori({
        totale: d.length,
        template_inviato: d.filter((l: LogEntry) => l.azione === 'template_whatsapp_inviato' || l.azione === 'template_whatsapp_utilizzato').length,
        approvato: d.filter((l: LogEntry) => l.azione === 'messaggio_approvato').length,
        generato: d.filter((l: LogEntry) => l.azione === 'messaggio_generato').length,
        modificato: d.filter((l: LogEntry) => l.azione === 'lead_modificato').length
      })
    }
    setLoading(false)
  }

  function getBadgeColor(azione: string) {
    switch(azione) {
      case 'template_whatsapp_inviato': return 'bg-green-100 text-green-700'
      case 'template_whatsapp_utilizzato': return 'bg-green-100 text-green-700'
      case 'messaggio_approvato': return 'bg-blue-100 text-blue-700'
      case 'lead_modificato': return 'bg-orange-100 text-orange-700'
      case 'messaggio_generato': return 'bg-purple-100 text-purple-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  function getAzioneLabel(azione: string) {
    switch(azione) {
      case 'template_whatsapp_inviato': return '💬 Template Inviato'
      case 'template_whatsapp_utilizzato': return '💬 Template Usato'
      case 'messaggio_approvato': return '✅ Messaggio Approvato'
      case 'lead_modificato': return '✏️ Lead Modificato'
      case 'messaggio_generato': return '🤖 Messaggio Generato'
      default: return azione
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-[#00243F] shadow-lg">
        <div className="flex justify-between items-center py-4 px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-3xl">📋</span>
            <div>
              <h1 className="text-xl font-bold text-white">Log Operazioni</h1>
              <p className="text-slate-300 text-sm">Storico attività sui lead</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="border border-white px-5 py-2 rounded-lg text-sm text-white hover:bg-white hover:text-[#00243F] transition-all font-medium"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">

        {/* CONTATORI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-500">Totali</p>
            <p className="text-2xl font-bold text-slate-800">{contatori.totale}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-green-600">Template Inviati</p>
            <p className="text-2xl font-bold text-green-700">{contatori.template_inviato}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-blue-600">Approvati</p>
            <p className="text-2xl font-bold text-blue-700">{contatori.approvato}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-purple-600">Generati</p>
            <p className="text-2xl font-bold text-purple-700">{contatori.generato}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-orange-600">Modificati</p>
            <p className="text-2xl font-bold text-orange-700">{contatori.modificato}</p>
          </div>
        </div>

        {/* SEARCH */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <input
            type="text"
            placeholder="🔍 Cerca per nome lead, azione, dettagli..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          />
        </div>

        {/* FILTRI */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <p className="text-sm font-medium text-slate-700 mb-3">Filtra per azione:</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFiltroAzione('tutti')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroAzione === 'tutti' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              📊 Tutti ({contatori.totale})
            </button>
            <button onClick={() => setFiltroAzione('template_whatsapp_inviato')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroAzione === 'template_whatsapp_inviato' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              💬 Template Inviati ({contatori.template_inviato})
            </button>
            <button onClick={() => setFiltroAzione('messaggio_approvato')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroAzione === 'messaggio_approvato' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              ✅ Approvati ({contatori.approvato})
            </button>
            <button onClick={() => setFiltroAzione('messaggio_generato')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroAzione === 'messaggio_generato' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              🤖 Generati ({contatori.generato})
            </button>
            <button onClick={() => setFiltroAzione('lead_modificato')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroAzione === 'lead_modificato' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              ✏️ Modificati ({contatori.modificato})
            </button>
          </div>
        </div>

        {/* LISTA LOG */}
        {logsFiltered.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg">
            <p className="text-slate-500">Nessun log trovato</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {logsFiltered.map((log) => (
              <div key={log.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getBadgeColor(log.azione)}`}>
                      {getAzioneLabel(log.azione)}
                    </span>
                    <button
                      onClick={() => router.push(`/lead/${log.lead_id}`)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {getNome(log)}
                    </button>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(log.timestamp).toLocaleString('it-IT')}
                  </span>
                </div>
                {log.dettagli && (
                  <p className="text-sm text-slate-600 mt-1">{log.dettagli}</p>
                )}
                {getTelefono(log) && (
                  <p className="text-xs text-slate-400 mt-1">📞 {getTelefono(log)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}