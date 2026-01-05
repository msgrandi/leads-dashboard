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
  const [showRegeneraModal, setShowRegeneraModal] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [regenerating, setRegenerating] = useState(false)

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

    // Fetch proposte messaggi - PRENDE IL PIÙ RECENTE
    const { data: proposteData } = await supabase
      .from('proposte_messaggi')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log('Lead:', leadData)
    console.log('Proposte:', proposteData)

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

  async function handleRigenera() {
    if (!lead) return
    
    setRegenerating(true)

    try {
      // Salva feedback e cambia stato a "nuovo"
      const { error } = await supabase
        .from('leads')
        .update({
          stato: 'nuovo',
          feedback_rigenerazione: feedback || 'Rigenerazione richiesta senza feedback specifico'
        })
        .eq('id', lead.id)

      if (error) throw error

      // Log
      await supabase
        .from('log')
        .insert({
          lead_id: lead.id,
          azione: 'rigenerazione_richiesta',
          dettagli: `Feedback: ${feedback || 'Nessun feedback'}`
        })

      alert('✅ Messaggi in rigenerazione! n8n genererà nuovi messaggi tra pochi minuti.')
      
      // Chiudi modal e resetta
      setShowRegeneraModal(false)
      setFeedback('')
      
      // Torna alla dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Errore rigenerazione:', error)
      alert('❌ Errore durante la rigenerazione')
    } finally {
      setRegenerating(false)
    }
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

  // Parse email se presenti
  let email1 = null
  let email2 = null
  let email3 = null

  // Per canale "email", i messaggi sono in messaggio_1_formale invece di email_1_formale
  const emailSource = canale === 'email' 
    ? (proposte?.messaggio_1_formale ? 'messaggio' : null)
    : (proposte?.email_1_formale ? 'email' : null)

  if (emailSource === 'messaggio' && proposte?.messaggio_1_formale) {
    try {
      email1 = JSON.parse(proposte.messaggio_1_formale)
      email2 = JSON.parse(proposte.messaggio_2_cordiale!)
      email3 = JSON.parse(proposte.messaggio_3_urgenza!)
    } catch (e) {
      console.error('Errore parsing email da messaggio:', e)
    }
  } else if (emailSource === 'email' && proposte?.email_1_formale) {
    try {
      email1 = JSON.parse(proposte.email_1_formale)
      email2 = JSON.parse(proposte.email_2_cordiale!)
      email3 = JSON.parse(proposte.email_3_urgenza!)
    } catch (e) {
      console.error('Errore parsing email:', e)
    }
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
          
          {/* Visualizza contesto aggiuntivo */}
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
          {/* BOTTONE RIGENERA */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800 mb-3">
              I messaggi non ti convincono? Chiedi a Claude di rigenerarli con indicazioni specifiche.
            </p>
            <button
              onClick={() => setShowRegeneraModal(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium"
            >
              🔄 Rigenera Messaggi con Feedback
            </button>
          </div>

          {/* SEZIONE WHATSAPP */}
          {mostraWhatsApp && (proposte.whatsapp_1_formale || proposte.messaggio_1_formale) && !email1 && (
            <div>
              <h2 className="text-xl font-bold mb-4">📱 Messaggi WhatsApp</h2>
              
              {/* WhatsApp Formale */}
              {(proposte.whatsapp_1_formale || proposte.messaggio_1_formale) && (
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
              )}

              {/* WhatsApp Cordiale */}
              {(proposte.whatsapp_2_cordiale || proposte.messaggio_2_cordiale) && (
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
              )}

              {/* WhatsApp Urgenza */}
              {(proposte.whatsapp_3_urgenza || proposte.messaggio_3_urgenza) && (
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
              )}
            </div>
          )}

          {/* SEZIONE EMAIL */}
          {mostraEmail && email1 && (
            <div>
              <h2 className="text-xl font-bold mb-4">📧 Messaggi Email</h2>
              
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
              {email2 && (
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
              )}

              {/* Email Urgenza */}
              {email3 && (
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
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL RIGENERA */}
      {showRegeneraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold mb-4">🔄 Rigenera Messaggi</h2>
            
            <p className="text-gray-700 mb-4">
              Fornisci indicazioni a Claude per migliorare i messaggi:
            </p>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
              rows={6}
              placeholder="Es: Troppo formale, voglio un tono più cordiale. Aggiungi più urgenza. Menziona esplicitamente il webinar a cui ha partecipato..."
            />

            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Suggerimenti:</strong> Più dettagli fornisci, migliori saranno i nuovi messaggi! Esempi: "Meno tecnico", "Più esempi pratici", "Focus su risparmio tempo", "Tono più commerciale"
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRegeneraModal(false)
                  setFeedback('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={regenerating}
              >
                Annulla
              </button>
              <button
                onClick={handleRigenera}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                disabled={regenerating}
              >
                {regenerating ? 'Rigenerazione...' : '🔄 Rigenera Ora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}