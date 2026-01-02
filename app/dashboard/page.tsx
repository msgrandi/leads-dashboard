'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Lead = {
  id: number
  nome: string
  telefono: string
  email: string
  interesse: string
  stato: string
  created_at: string
}

export default function Dashboard() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  // Controllo sessione
  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      router.push('/login')
      return
    }
    fetchLeads()
  }

  // Fetch leads
  async function fetchLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

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

          {/* Logout */}
          <div className="mt-4 md:mt-0">
            <button
              onClick={handleLogout}
              className="border border-white px-5 py-2 rounded-lg
                         text-sm text-white hover:bg-white hover:text-[#00243F]
                         transition-all duration-200 font-medium shadow-sm w-full md:w-auto"
            >
              Logout →
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="p-8 max-w-5xl mx-auto">
        {leads.length === 0 ? (
          <div className="text-slate-500">Nessun lead presente</div>
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
                <p className="text-xs text-slate-400 mt-2">Stato: {lead.stato}</p>

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
    </div>
  )
}