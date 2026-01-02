'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Lead = {
  id: number
  nome: string
  telefono: string
  email: string
  interesse: string
  note: string
  stato: string
}

type Proposte = {
  messaggio_1_formale: string
  messaggio_2_cordiale: string
  messaggio_3_urgenza: string
}

export default function LeadPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [proposte, setProposte] = useState<Proposte | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchLead()
  }, [])

  async function fetchLead() {
    const leadId = params.id

    // Fetch lead
    const { data: leadData } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    // Fetch proposte messaggi
    const { data: proposteData } = await supabase
      .from('proposte_messaggi')
      .select('*')
      .eq('lead_id', leadId)
      .single()

    setLead(leadData)
    setProposte(proposteData)
    setLoading(false)
  }

  async function approvaMessaggio(tipo: string, messaggio: string) {
    if (!lead) return

    // Aggiorna lead
    await supabase
      .from('leads')
      .update({
        stato: 'approvato',
        messaggio_inviato: messaggio,
        messaggio_tipo: tipo,
        data_invio: new Date().toISOString()
      })
      .eq('id', lead.id)

    // Log
    await supabase
      .from('log')
      .insert({
        lead_id: lead.id,
        azione: 'messaggio_approvato',
        dettagli: `Approvato messaggio ${tipo}`
      })

    alert('Messaggio approvato!')
    router.push('/dashboard')
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openWhatsApp(telefono: string, messaggio: string) {
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(messaggio)}`
    window.open(url, '_blank')
  }

  if (loading) {
    return <div className="p-8">Caricamento...</div>
  }

  if (!lead) {
    return <div className="p-8">Lead non trovato</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button 
        onClick={() => router.push('/dashboard')}
        className="mb-6 text-blue-600 hover:underline"
      >
        ← Torna alla dashboard
      </button>

      <div className="bg-white border rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">{lead.nome}</h1>
        <div className="space-y-2">
          <p><strong>📧 Email:</strong> {lead.email}</p>
          <p><strong>📞 Telefono:</strong> {lead.telefono}</p>
          <p><strong>🎯 Interesse:</strong> {lead.interesse}</p>
          {lead.note && <p><strong>📝 Note:</strong> {lead.note}</p>}
          <p><strong>📊 Stato:</strong> {lead.stato}</p>
        </div>
      </div>

      {!proposte ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Nessun messaggio generato per questo lead.</p>
          <p className="text-sm text-gray-400 mt-2">
            I messaggi verranno generati automaticamente da n8n
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Messaggio 1 - Formale */}
          <div className="border rounded-lg p-6">
            <h2 className="font-bold text-lg mb-3">💼 Messaggio Formale</h2>
            <div className="bg-gray-50 p-4 rounded mb-4 whitespace-pre-wrap">
              {proposte.messaggio_1_formale}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approvaMessaggio('formale', proposte.messaggio_1_formale)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                ✅ Approva
              </button>
              <button
                onClick={() => copyToClipboard(proposte.messaggio_1_formale)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                {copied ? '✅ Copiato!' : '📋 Copia'}
              </button>
              <button
                onClick={() => openWhatsApp(lead.telefono, proposte.messaggio_1_formale)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                📱 WhatsApp
              </button>
            </div>
          </div>

          {/* Messaggio 2 - Cordiale */}
          <div className="border rounded-lg p-6">
            <h2 className="font-bold text-lg mb-3">😊 Messaggio Cordiale</h2>
            <div className="bg-gray-50 p-4 rounded mb-4 whitespace-pre-wrap">
              {proposte.messaggio_2_cordiale}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approvaMessaggio('cordiale', proposte.messaggio_2_cordiale)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                ✅ Approva
              </button>
              <button
                onClick={() => copyToClipboard(proposte.messaggio_2_cordiale)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                {copied ? '✅ Copiato!' : '📋 Copia'}
              </button>
              <button
                onClick={() => openWhatsApp(lead.telefono, proposte.messaggio_2_cordiale)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                📱 WhatsApp
              </button>
            </div>
          </div>

          {/* Messaggio 3 - Urgenza */}
          <div className="border rounded-lg p-6">
            <h2 className="font-bold text-lg mb-3">⚡ Messaggio Urgenza</h2>
            <div className="bg-gray-50 p-4 rounded mb-4 whitespace-pre-wrap">
              {proposte.messaggio_3_urgenza}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approvaMessaggio('urgenza', proposte.messaggio_3_urgenza)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                ✅ Approva
              </button>
              <button
                onClick={() => copyToClipboard(proposte.messaggio_3_urgenza)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                {copied ? '✅ Copiato!' : '📋 Copia'}
              </button>
              <button
                onClick={() => openWhatsApp(lead.telefono, proposte.messaggio_3_urgenza)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                📱 WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}