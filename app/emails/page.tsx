'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Lead = {
  id: number
  nome: string
  email: string
  citta: string
  email_body: string
  email_oggetto: string
  email_inviata: boolean
  created_at: string
}

export default function EmailsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'tutti' | 'generati' | 'inviati'>('generati')
  const [selectedEmail, setSelectedEmail] = useState<Lead | null>(null)

  useEffect(() => {
    fetchLeads()
  }, [filter])

  async function fetchLeads() {
    setLoading(true)
    let query = supabase
      .from('leads')
      .select('*')
      .not('email_body', 'is', null)
      .order('created_at', { ascending: false })

    if (filter === 'inviati') {
      query = query.eq('email_inviata', true)
    } else if (filter === 'generati') {
      query = query.eq('email_inviata', false)
    }

    const { data, error } = await query
    if (error) {
      console.error('Errore fetch:', error)
    } else {
      setLeads(data || [])
    }
    setLoading(false)
  }

  async function markAsSent(id: number) {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ email_inviata: true })
        .eq('id', id)
      if (error) throw error
      alert('✅ Email segnata come inviata!')
      fetchLeads()
      setSelectedEmail(null)
    } catch (error) {
      console.error('Errore:', error)
      alert('❌ Errore durante l\'aggiornamento')
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    alert('✅ Copiato negli appunti!')
  }

  function getMailtoLink(lead: Lead) {
    const subject = encodeURIComponent(lead.email_oggetto || '')
    const body = encodeURIComponent(lead.email_body || '')
    return 'mailto:' + lead.email + '?subject=' + subject + '&body=' + body
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Caricamento...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-[#00243F] shadow-lg">
        <div className="flex items-center justify-between py-4 px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-3xl">📬</span>
            <div>
              <h1 className="text-xl font-bold text-white">Email Generate</h1>
              <p className="text-slate-300 text-sm">Visualizza e invia email</p>
            </div>
          </div>
          <button onClick={() => router.push('/dashboard')} className="bg-white text-[#00243F] px-5 py-2 rounded-lg hover:bg-gray-100 transition-all font-medium">
            ← Dashboard
          </button>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <div className="flex gap-2">
            <button onClick={() => setFilter('generati')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'generati' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              📝 Da inviare
            </button>
            <button onClick={() => setFilter('inviati')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'inviati' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              ✅ Inviate
            </button>
            <button onClick={() => setFilter('tutti')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'tutti' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              📊 Tutte
            </button>
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-slate-500">Nessuna email trovata</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {leads.map((lead) => (
              <div key={lead.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-bold text-slate-800">{lead.nome}</h2>
                    <p className="text-sm text-slate-500">{lead.email}</p>
                    {lead.citta && <p className="text-sm text-slate-500">📍 {lead.citta}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${lead.email_inviata ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {lead.email_inviata ? '✅ Inviata' : '📝 Da inviare'}
                  </span>
                </div>
                {lead.email_oggetto && (
                  <p className="mt-2 text-sm text-slate-600"><strong>Oggetto:</strong> {lead.email_oggetto}</p>
                )}
                <div className="mt-3 bg-slate-50 rounded-lg p-3">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{lead.email_body.substring(0, 200)}...</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setSelectedEmail(lead)} className="flex-1 bg-[#00243F] text-white px-4 py-2 rounded-lg hover:bg-[#003D66] transition-all text-sm font-medium">
                    👁️ Vedi Completa
                  </button>
                  <button onClick={() => copyToClipboard(lead.email_body)} className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-all text-sm font-medium">
                    📋 Copia
                  </button>
                  {!lead.email_inviata && <a href={getMailtoLink(lead)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all text-sm font-medium">📧 Invia</a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedEmail.nome}</h3>
                <p className="text-slate-500">{selectedEmail.email}</p>
              </div>
              <button onClick={() => setSelectedEmail(null)} className="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
            </div>
            {selectedEmail.email_oggetto && (
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-700">Oggetto:</p>
                <p className="text-slate-800">{selectedEmail.email_oggetto}</p>
              </div>
            )}
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Corpo Email:</p>
              <p className="text-slate-700 whitespace-pre-wrap">{selectedEmail.email_body}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => copyToClipboard(selectedEmail.email_body)} className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-all font-medium">📋 Copia Testo</button>
              {!selectedEmail.email_inviata && <a href={getMailtoLink(selectedEmail)} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all font-medium text-center">📧 Apri Client Email</a>}
              {!selectedEmail.email_inviata && <button onClick={() => markAsSent(selectedEmail.id)} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all font-medium">✅ Segna Inviata</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
