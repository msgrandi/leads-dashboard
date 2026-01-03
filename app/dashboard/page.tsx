'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NewLeadModal from './components/NewLeadModal'

type Lead = {
  id: number
  nome: string
  telefono: string
  email: string
  interesse: string
  stato: string
  created_at: string
}

type FiltroStato = 'tutti' | 'nuovo' | 'in_attesa_approvazione' | 'approvato'

export default function Dashboard() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filtroAttivo, setFiltroAttivo] = useState<FiltroStato>('in_attesa_approvazione')

  // Controllo sessione
  useEffect(() => {
    checkSession()
  }, [])

  // Ricarica quando cambia filtro
  useEffect(() => {
    if (!loading) {
      fetchLeads()
    }
  }, [filtroAttivo])

  async function checkSession() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      router.push('/login')
      return
    }
    fetchLeads()
  }

  // Fetch leads con filtro
  async function fetchLeads() {
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    // Applica filtro se non è "tutti"
    if (filtroAttivo !== 'tutti') {
      query = query.eq('stato', filtroAttivo)
    }

    const { data, error } = await query

    if (error) {
      console.error('Errore fetch:', error)
    } else {
      setLeads(data || [])
    }

    setLoading(false)
  }

  // Logout
  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Conta lead per stato
  const [stats, setStats] = useState({ nuovo: 0, in_attesa: 0, approvato: 0, totale: 0 })

  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase
        .from('leads')
        .select('stato')

      if (data) {
        const nuovo = data.filter(l => l.stato === 'nuovo').length
        const in_attesa = data.filter(l => l.stato === 'in_attesa_approvazione').length
        const approvato = data.filter(l => l.stato === 'approvato').length
        setStats({ nuovo, in_attesa, approvato, totale: data.length })
      }
    }
    fetchStats()
  }, [leads])

  if (loading) {
    return <div className="p-8">Caricamento...</div>
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* HEADER */}
      <header className="bg-[#00243F] shadow">
        <div className="flex flex-col md:flex-row justify-between items-center py-4 px-6 md:px-8 max-w-7xl mx-auto">
          {/* Logo + Titolo */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 md:gap-6 w-full md:w-auto">
            {/* Logo su sfondo bianco */}
            <div className="bg-white p-3 rounded-xl shadow-md flex items-center justify-center flex-shrink-0">
              <img
                src="/logo-mario-stefano-grandi.png"
                alt="Mario Stefano Grandi"
                width={100}
                height={100}
                className="object-contain"
              />
            </div>

            {/* Titolo */}
            <div className="flex flex-col justify-center text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                Mario Stefano Grandi
              </h1>
              <p className="text-slate-300 text-sm sm:text-base mt-1">
                HSE Leads Dashboard – Gestione professionale dei contatti
              </p>
            </div>
          </div>

          {/* Bottoni: Nuovo Lead + Impostazioni + Logout */}
          <div className="mt-4 md:mt-0 flex gap-3 flex-wrap">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-[#00243F] px-5 py-2 rounded-lg
                         hover:bg-gray-100 transition-all duration-200 font-medium shadow-sm
                         flex items-center gap-2"
            >
              <span className="text-xl">+</span> Nuovo Lead
            </button>
            
            <button
              onClick={() => router.push('/settings')}
              className="border border-white px-5 py-2 rounded-lg
                         text-sm text-white hover:bg-white hover:text-[#00243F]
                         transition-all duration-200 font-medium shadow-sm"
            >
              ⚙️ Impostazioni
            </button>
            
            <button
              onClick={handleLogout}
              className="border border-white px-5 py-2 rounded-lg
                         text-sm text-white hover:bg-white hover:text-[#00243F]
                         transition-all duration-200 font-medium shadow-sm"
            >
              Logout →
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="p-8 max-w-5xl mx-auto">
        {/* STATISTICHE */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-500">Totali</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totale}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-blue-600">Nuovi</p>
            <p className="text-2xl font-bold text-blue-700">{stats.nuovo}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-orange-600">In Attesa</p>
            <p className="text-2xl font-bold text-orange-700">{stats.in_attesa}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-green-600">Approvati</p>
            <p className="text-2xl font-bold text-green-700">{stats.approvato}</p>
          </div>
        </div>

        {/* FILTRI */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <p className="text-sm font-medium text-slate-700 mb-3">Mostra:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroAttivo('in_attesa_approvazione')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filtroAttivo === 'in_attesa_approvazione'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🟠 In Attesa ({stats.in_attesa})
            </button>
            <button
              onClick={() => setFiltroAttivo('nuovo')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filtroAttivo === 'nuovo'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🔵 Nuovi ({stats.nuovo})
            </button>
            <button
              onClick={() => setFiltroAttivo('approvato')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filtroAttivo === 'approvato'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ✅ Approvati ({stats.approvato})
            </button>
            <button
              onClick={() => setFiltroAttivo('tutti')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filtroAttivo === 'tutti'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📊 Tutti ({stats.totale})
            </button>
          </div>
        </div>

        {/* LISTA LEAD */}
        {leads.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg">
            <p className="text-slate-500">
              {filtroAttivo === 'tutti' 
                ? 'Nessun lead presente' 
                : `Nessun lead con stato "${filtroAttivo}"`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <h2 className="font-medium text-slate-800">{lead.nome}</h2>
                  <span className="text-xs text-slate-400">
                    {new Date(lead.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-sm text-slate-600 mt-2">📞 {lead.telefono}</p>
                {lead.email && <p className="text-sm text-slate-600">📧 {lead.email}</p>}
                {lead.interesse && <p className="text-sm text-slate-600">🎯 {lead.interesse}</p>}
                
                {/* Badge stato */}
                <div className="mt-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    lead.stato === 'nuovo' ? 'bg-blue-100 text-blue-700' :
                    lead.stato === 'in_attesa_approvazione' ? 'bg-orange-100 text-orange-700' :
                    lead.stato === 'approvato' ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {lead.stato === 'nuovo' ? '🔵 Nuovo' :
                     lead.stato === 'in_attesa_approvazione' ? '🟠 In Attesa' :
                     lead.stato === 'approvato' ? '✅ Approvato' :
                     lead.stato}
                  </span>
                </div>

                {/* BOTTONE VEDI MESSAGGI */}
                <button
                  onClick={() => router.push(`/lead/${lead.id}`)}
                  className="mt-4 bg-[#00243F] text-white px-4 py-2 rounded-lg
                             hover:bg-[#003D66] transition-all duration-200 text-sm font-medium
                             shadow-sm w-full sm:w-auto"
                >
                  👁️ Vedi messaggi
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Nuovo Lead */}
      <NewLeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchLeads()
          setIsModalOpen(false)
        }}
      />
    </div>
  )
}