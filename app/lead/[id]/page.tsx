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
  canale_preferito: string
  contesto_aggiuntivo: string
}

type Proposte = {
  messaggio_1_formale: string | null
  messaggio_2_cordiale: string | null
  messaggio_3_urgenza: string | null
  whatsapp_1_formale: string | null
  whatsapp_2_cordiale: string | null
  whatsapp_3_urgenza: string | null
  email_1_formale: string | null
  email_2_cordiale: string | null
  email_3_urgenza: string | null
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

  async function approvaMessaggio(tipo: string, messaggio: string, canale: string) {
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
        dettagli: `Approvato messaggio ${tipo} (${canale})`
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

  function openEmail(email: string, oggetto: string, corpo: string) {
    const subject = encodeURIComponent(oggetto)
    const body = encodeURIComponent(corpo)
    const url = `mailto:${email}?subject=${subject}&body=${body}`
    window.open(url, '_blank')
  }

  if (loading) {
    return <div className="p-8">Caricamento...</div>
  }

  if (!lead) {
    return <div className="p-8">Lead non trovato</div>
  }

  // Determina quali messaggi mostrare
  const canale = lead.canale_preferito || 'whatsapp'
  const mostraWhatsApp = canale === 'whatsapp' || canale === 'entrambi'
  const mostraEmail = canale === 'email' || canale === 'entrambi'

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
          
          {/* NUOVO: Visualizza contesto aggiuntivo */}
          {lead.contesto_aggiuntivo && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-800 mb-1">💡 Contesto:</p>
              <p className="text-sm text-blue-900 whitespace-pre-wrap">{lead.contesto_aggiuntivo}</p>
            </div>
          )}
          
          <p><strong>📊 Stato:</strong> {lead.stato}</p>
          <p><strong>📲 Canale:</strong> {canale === 'entrambi' ? 'WhatsApp + Email' : canale === 'email' ? 'Email' : 'WhatsApp'}</p>
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
        <div className="space-y-8">
          {/* SEZIONE WHATSAPP */}
          {mostraWhatsApp && (proposte.whatsapp_1_formale || proposte.messaggio_1_formale) && (
            <div>
              <h2 className="text-xl font-bold mb-4">📱 Messaggi WhatsApp</h2>
              
              {/* WhatsApp Formale */}
              <div className="border rounded-lg p-6 mb-4">
                <h3 className="font-bold text-lg mb-3">💼 Messaggio Formale</h3>
                <div className="bg-gray-50 p-4 rounded mb-4 whitespace-pre-wrap">
                  {proposte.whatsapp_1_formale || proposte.messaggio_1_formale}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => approvaMessaggio('formale', (proposte.whatsapp_1_formale || proposte.messaggio_1_formale)!, 'whatsapp')}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    ✅ Approva
                  </button>
                  <button
                    onClick={() => copyToClipboard((proposte.whatsapp_1_formale || proposte.messaggio_1_formale)!)}
                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                  >
                    {copied ? '✅ Copiato!' : '📋 Copia'}
                  </button>
                  <button
                    onClick={() => openWhatsApp(lead.telefono, (proposte.whatsapp_1_formale || proposte.messaggio_1_formale)!)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    📱 WhatsApp
                  </button>
                </div>
              </div>

              {/* WhatsApp Cordiale */}
              <div className="border rounded-lg p-6 mb-4">
                <h3 className="font-bold text-lg mb-3">😊 Messaggio Cordiale</h3>
                <div className="bg-gray-50 p-4 rounded mb-4 whitespace-pre-wrap">
                  {proposte.whatsapp_2_cordiale || proposte.messaggio_2_cordiale}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => approvaMessaggio('cordiale', (proposte.whatsapp_2_cordiale || proposte.messaggio_2_cordiale)!, 'whatsapp')}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    ✅ Approva
                  </button>
                  <button
                    onClick={() => copyToClipboard((proposte.whatsapp_2_cordiale || proposte.messaggio_2_cordiale)!)}
                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                  >
                    {copied ? '✅ Copiato!' : '📋 Copia'}
                  </button>
                  <button
                    onClick={() => openWhatsApp(lead.telefono, (proposte.whatsapp_2_cordiale || proposte.messaggio_2_cordiale)!)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    📱 WhatsApp
                  </button>
                </div>
              </div>

              {/* WhatsApp Urgenza */}
              <div className="border rounded-lg p-6 mb-4">
                <h3 className="font-bold text-lg mb-3">⚡ Messaggio Urgenza</h3>
                <div className="bg-gray-50 p-4 rounded mb-4 whitespace-pre-wrap">
                  {proposte.whatsapp_3_urgenza || proposte.messaggio_3_urgenza}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => approvaMessaggio('urgenza', (proposte.whatsapp_3_urgenza || proposte.messaggio_3_urgenza)!, 'whatsapp')}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    ✅ Approva
                  </button>
                  <button
                    onClick={() => copyToClipboard((proposte.whatsapp_3_urgenza || proposte.messaggio_3_urgenza)!)}
                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                  >
                    {copied ? '✅ Copiato!' : '📋 Copia'}
                  </button>
                  <button
                    onClick={() => openWhatsApp(lead.telefono, (proposte.whatsapp_3_urgenza || proposte.messaggio_3_urgenza)!)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    📱 WhatsApp
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SEZIONE EMAIL */}
          {mostraEmail && proposte.email_1_formale && (
            <div>
              <h2 className="text-xl font-bold mb-4">📧 Messaggi Email</h2>
              
              {(() => {
                const email1 = JSON.parse(proposte.email_1_formale!)
                const email2 = JSON.parse(proposte.email_2_cordiale!)
                const email3 = JSON.parse(proposte.email_3_urgenza!)
                
                return (
                  <>
                    {/* Email Formale */}
                    <div className="border rounded-lg p-6 mb-4">
                      <h3 className="font-bold text-lg mb-3">💼 Email Formale</h3>
                      <div className="mb-4">
                        <p className="font-semibold text-sm text-gray-600 mb-1">Oggetto:</p>
                        <div className="bg-blue-50 p-3 rounded">
                          {email1.oggetto}
                        </div>
                      </div>
                      <div className="mb-4">
                        <p className="font-semibold text-sm text-gray-600 mb-1">Corpo:</p>
                        <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">
                          {email1.corpo}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => approvaMessaggio('formale', `${email1.oggetto}\n\n${email1.corpo}`, 'email')}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                          ✅ Approva
                        </button>
                        <button
                          onClick={() => copyToClipboard(`${email1.oggetto}\n\n${email1.corpo}`)}
                          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                        >
                          {copied ? '✅ Copiato!' : '📋 Copia'}
                        </button>
                        <button
                          onClick={() => openEmail(lead.email, email1.oggetto, email1.corpo)}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          📧 Email
                        </button>
                      </div>
                    </div>

                    {/* Email Cordiale */}
                    <div className="border rounded-lg p-6 mb-4">
                      <h3 className="font-bold text-lg mb-3">😊 Email Cordiale</h3>
                      <div className="mb-4">
                        <p className="font-semibold text-sm text-gray-600 mb-1">Oggetto:</p>
                        <div className="bg-blue-50 p-3 rounded">
                          {email2.oggetto}
                        </div>
                      </div>
                      <div className="mb-4">
                        <p className="font-semibold text-sm text-gray-600 mb-1">Corpo:</p>
                        <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">
                          {email2.corpo}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => approvaMessaggio('cordiale', `${email2.oggetto}\n\n${email2.corpo}`, 'email')}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                          ✅ Approva
                        </button>
                        <button
                          onClick={() => copyToClipboard(`${email2.oggetto}\n\n${email2.corpo}`)}
                          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                        >
                          {copied ? '✅ Copiato!' : '📋 Copia'}
                        </button>
                        <button
                          onClick={() => openEmail(lead.email, email2.oggetto, email2.corpo)}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          📧 Email
                        </button>
                      </div>
                    </div>

                    {/* Email Urgenza */}
                    <div className="border rounded-lg p-6 mb-4">
                      <h3 className="font-bold text-lg mb-3">⚡ Email Urgenza</h3>
                      <div className="mb-4">
                        <p className="font-semibold text-sm text-gray-600 mb-1">Oggetto:</p>
                        <div className="bg-blue-50 p-3 rounded">
                          {email3.oggetto}
                        </div>
                      </div>
                      <div className="mb-4">
                        <p className="font-semibold text-sm text-gray-600 mb-1">Corpo:</p>
                        <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">
                          {email3.corpo}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => approvaMessaggio('urgenza', `${email3.oggetto}\n\n${email3.corpo}`, 'email')}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                          ✅ Approva
                        </button>
                        <button
                          onClick={() => copyToClipboard(`${email3.oggetto}\n\n${email3.corpo}`)}
                          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                        >
                          {copied ? '✅ Copiato!' : '📋 Copia'}
                        </button>
                        <button
                          onClick={() => openEmail(lead.email, email3.oggetto, email3.corpo)}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          📧 Email
                        </button>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}