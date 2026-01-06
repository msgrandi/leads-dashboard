'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Lead = {
  id: number
  nome: string
  telefono: string
  email: string
  interesse: string
  stato: string
  canale_preferito: string
  contesto_aggiuntivo?: string
}

type Proposte = {
  messaggio_1_formale?: string
  messaggio_2_cordiale?: string
  messaggio_3_urgenza?: string
  email_1_formale?: string
  email_2_cordiale?: string
  email_3_urgenza?: string
  whatsapp_1_formale?: string
  whatsapp_2_cordiale?: string
  whatsapp_3_urgenza?: string
}

type Template = {
  id: number
  nome: string
  categoria: string
  template: string
  descrizione: string
  campi_extra?: Array<{name: string, label: string, placeholder: string}>
  supporta_allegato?: boolean
}

export default function LeadDetail() {
  const router = useRouter()
  const params = useParams()
  const leadId = params.id as string
  
  const [lead, setLead] = useState<Lead | null>(null)
  const [proposte, setProposte] = useState<Proposte | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  
  // Template WhatsApp
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [templatePreview, setTemplatePreview] = useState('')
  const [extraFields, setExtraFields] = useState<Record<string, string>>({})
  
  // Upload allegato
  const [allegatoFile, setAllegatoFile] = useState<File | null>(null)
  const [allegatoUrl, setAllegatoUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (leadId) {
      fetchLead()
      fetchTemplates()
    }
  }, [leadId])

  async function fetchLead() {
    const { data: leadData } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    const { data: proposteData } = await supabase
      .from('proposte_messaggi')
      .select('*')
      .eq('lead_id', leadId)
      .single()

    setLead(leadData)
    setProposte(proposteData)
    setLoading(false)
  }

  async function fetchTemplates() {
    const { data } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('attivo', true)
      .order('categoria, nome')
    
    setTemplates(data || [])
  }

  async function handleFileUpload(file: File) {
    if (!file) return null

    setUploading(true)
    try {
      // Nome file unico con timestamp
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${leadId}/${fileName}`

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('template-allegati')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Errore upload:', uploadError)
        alert('❌ Errore durante upload file')
        return null
      }

      // Ottieni URL pubblico
      const { data } = supabase.storage
        .from('template-allegati')
        .getPublicUrl(filePath)

      setUploading(false)
      return data.publicUrl
    } catch (error) {
      console.error('Errore:', error)
      alert('❌ Errore durante upload')
      setUploading(false)
      return null
    }
  }

  function personalizeTemplate(template: string, lead: Lead, extraData: Record<string, string> = {}, fileUrl?: string) {
    let result = template
      .replace(/{{nome}}/g, lead.nome)
      .replace(/{{interesse}}/g, lead.interesse)
      .replace(/{{telefono}}/g, lead.telefono)
      .replace(/{{email}}/g, lead.email || '')
    
    // Sostituisci campi extra
    Object.keys(extraData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      result = result.replace(regex, extraData[key])
    })

    // Aggiungi link allegato se presente
    if (fileUrl) {
      result += `\n\n📎 *Allegato:* ${fileUrl}`
    }
    
    return result
  }

  function viewTemplate(template: Template) {
    if (!lead) return
    
    // Se ha campi extra o supporta allegati, mostra form prima
    if ((template.campi_extra && template.campi_extra.length > 0) || template.supporta_allegato) {
      setSelectedTemplate(template)
      setExtraFields({})
      setAllegatoFile(null)
      setAllegatoUrl('')
      setShowFormModal(true)
    } else {
      // Altrimenti mostra direttamente anteprima
      const personalized = personalizeTemplate(template.template, lead)
      setSelectedTemplate(template)
      setTemplatePreview(personalized)
      setShowTemplateModal(true)
    }
  }

  async function handleFormSubmit() {
    if (!selectedTemplate || !lead) return
    
    // Verifica che tutti i campi siano compilati
    const missingFields = selectedTemplate.campi_extra?.filter(
      field => !extraFields[field.name]?.trim()
    )
    
    if (missingFields && missingFields.length > 0) {
      alert('⚠️ Compila tutti i campi richiesti!')
      return
    }

    // Upload file se presente
    let fileUrl = allegatoUrl
    if (allegatoFile && !fileUrl) {
      fileUrl = await handleFileUpload(allegatoFile) || ''
    }
    
    // Genera anteprima con i dati del form
    const personalized = personalizeTemplate(selectedTemplate.template, lead, extraFields, fileUrl)
    setTemplatePreview(personalized)
    setAllegatoUrl(fileUrl)
    setShowFormModal(false)
    setShowTemplateModal(true)
  }

  function useTemplate(template: Template) {
    if (!lead) return
    const encoded = encodeURIComponent(templatePreview)
    const whatsappUrl = `https://wa.me/${lead.telefono.replace(/\D/g, '')}?text=${encoded}`
    
    window.open(whatsappUrl, '_blank')
    
    // Log uso template
    logTemplateUsage(template.id)
    setShowTemplateModal(false)
    setExtraFields({})
    setAllegatoFile(null)
    setAllegatoUrl('')
  }

  async function logTemplateUsage(templateId: number) {
    await supabase.from('log').insert({
      lead_id: leadId,
      azione: 'template_whatsapp_utilizzato',
      dettagli: `Template ID: ${templateId}${allegatoUrl ? ' - Con allegato' : ''}`
    })
  }

  async function approvaMessaggio(tipo: string, testo: string) {
    await supabase.from('log').insert({
      lead_id: leadId,
      azione: 'messaggio_approvato',
      dettagli: `Tipo: ${tipo}`
    })

    await supabase
      .from('leads')
      .update({ stato: 'approvato' })
      .eq('id', leadId)

    alert('✅ Messaggio approvato!')
    fetchLead()
  }

  function copiaMessaggio(testo: string) {
    navigator.clipboard.writeText(testo)
    alert('✅ Messaggio copiato!')
  }

  function apriWhatsApp(messaggio: string) {
    if (!lead) return
    const encoded = encodeURIComponent(messaggio)
    window.open(`https://wa.me/${lead.telefono.replace(/\D/g, '')}?text=${encoded}`, '_blank')
  }

  function apriEmail(oggetto: string, corpo: string) {
    if (!lead) return
    const mailtoLink = `mailto:${lead.email}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`
    window.open(mailtoLink, '_blank')
  }

  async function rigeneraConFeedback() {
    if (!feedback.trim()) {
      alert('⚠️ Inserisci un feedback!')
      return
    }

    setRegenerating(true)

    try {
      const response = await fetch('/api/rigenera-messaggi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: leadId,
          feedback: feedback
        })
      })

      if (response.ok) {
        alert('✅ Messaggi rigenerati!')
        setShowFeedbackModal(false)
        setFeedback('')
        fetchLead()
      } else {
        alert('❌ Errore nella rigenerazione')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('❌ Errore nella rigenerazione')
    }

    setRegenerating(false)
  }

  if (loading) {
    return <div className="p-8">Caricamento...</div>
  }

  if (!lead) {
    return <div className="p-8">Lead non trovato</div>
  }

  const canale = lead.canale_preferito || 'whatsapp'
  let messaggiWhatsApp: { formale: string, cordiale: string, urgenza: string } | null = null
  let messaggiEmail: { formale: any, cordiale: any, urgenza: any } | null = null

  if (canale === 'whatsapp') {
    if (proposte?.messaggio_1_formale) {
      messaggiWhatsApp = {
        formale: proposte.messaggio_1_formale,
        cordiale: proposte.messaggio_2_cordiale!,
        urgenza: proposte.messaggio_3_urgenza!
      }
    }
  } else if (canale === 'email') {
    if (proposte?.messaggio_1_formale) {
      try {
        messaggiEmail = {
          formale: JSON.parse(proposte.messaggio_1_formale),
          cordiale: JSON.parse(proposte.messaggio_2_cordiale!),
          urgenza: JSON.parse(proposte.messaggio_3_urgenza!)
        }
      } catch (e) {
        console.error('Errore parsing email:', e)
      }
    }
  } else if (canale === 'entrambi') {
    if (proposte?.whatsapp_1_formale) {
      messaggiWhatsApp = {
        formale: proposte.whatsapp_1_formale,
        cordiale: proposte.whatsapp_2_cordiale!,
        urgenza: proposte.whatsapp_3_urgenza!
      }
    }
    if (proposte?.email_1_formale) {
      try {
        messaggiEmail = {
          formale: JSON.parse(proposte.email_1_formale),
          cordiale: JSON.parse(proposte.email_2_cordiale!),
          urgenza: JSON.parse(proposte.email_3_urgenza!)
        }
      } catch (e) {
        console.error('Errore parsing email entrambi:', e)
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-slate-600 hover:text-slate-800 mb-4"
          >
            ← Torna alla dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-800">{lead.nome}</h1>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-600">📞 {lead.telefono}</p>
            {lead.email && <p className="text-sm text-slate-600">📧 {lead.email}</p>}
            <p className="text-sm text-slate-600">🎯 {lead.interesse}</p>
            <p className="text-sm text-slate-600">📱 {lead.canale_preferito}</p>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
              lead.stato === 'nuovo' ? 'bg-blue-100 text-blue-700' :
              lead.stato === 'in_attesa_approvazione' ? 'bg-orange-100 text-orange-700' :
              'bg-green-100 text-green-700'
            }`}>
              {lead.stato}
            </span>
          </div>
        </div>

        {/* TEMPLATE WHATSAPP */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 shadow-sm border border-green-200 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            📱 Template WhatsApp Predefiniti
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Scegli un template professionale e invialo subito su WhatsApp
          </p>

          {templates.length === 0 ? (
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-slate-500">Nessun template disponibile</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map((template) => (
                <div key={template.id} className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-800">
                        {template.nome}
                        {template.supporta_allegato && <span className="ml-2 text-xs">📎</span>}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">{template.descrizione}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ml-2 flex-shrink-0 ${
                      template.categoria === 'formale' ? 'bg-blue-100 text-blue-700' :
                      template.categoria === 'follow_up' ? 'bg-purple-100 text-purple-700' :
                      template.categoria === 'urgenza' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {template.categoria}
                    </span>
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={() => viewTemplate(template)}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-all font-medium"
                    >
                      💬 Usa Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MESSAGGI WHATSAPP GENERATI */}
        {messaggiWhatsApp && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">📱 Messaggi WhatsApp Generati da AI</h2>
            
            <div className="mb-6 p-4 border border-slate-200 rounded-lg">
              <h3 className="font-medium text-slate-700 mb-2">🎩 Formale</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{messaggiWhatsApp.formale}</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => approvaMessaggio('whatsapp_formale', messaggiWhatsApp!.formale)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">✅ Approva</button>
                <button onClick={() => copiaMessaggio(messaggiWhatsApp!.formale)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">📋 Copia</button>
                <button onClick={() => apriWhatsApp(messaggiWhatsApp!.formale)} className="bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#20BA5A]">💬 WhatsApp</button>
              </div>
            </div>

            <div className="mb-6 p-4 border border-slate-200 rounded-lg">
              <h3 className="font-medium text-slate-700 mb-2">😊 Cordiale</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{messaggiWhatsApp.cordiale}</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => approvaMessaggio('whatsapp_cordiale', messaggiWhatsApp!.cordiale)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">✅ Approva</button>
                <button onClick={() => copiaMessaggio(messaggiWhatsApp!.cordiale)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">📋 Copia</button>
                <button onClick={() => apriWhatsApp(messaggiWhatsApp!.cordiale)} className="bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#20BA5A]">💬 WhatsApp</button>
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg">
              <h3 className="font-medium text-slate-700 mb-2">⚡ Urgenza</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{messaggiWhatsApp.urgenza}</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => approvaMessaggio('whatsapp_urgenza', messaggiWhatsApp!.urgenza)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">✅ Approva</button>
                <button onClick={() => copiaMessaggio(messaggiWhatsApp!.urgenza)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">📋 Copia</button>
                <button onClick={() => apriWhatsApp(messaggiWhatsApp!.urgenza)} className="bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#20BA5A]">💬 WhatsApp</button>
              </div>
            </div>
          </div>
        )}

        {/* MESSAGGI EMAIL GENERATI */}
        {messaggiEmail && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">📧 Messaggi Email Generati da AI</h2>
            
            <div className="mb-6 p-4 border border-slate-200 rounded-lg">
              <h3 className="font-medium text-slate-700 mb-2">🎩 Formale</h3>
              <p className="text-xs text-slate-500 mb-1">Oggetto:</p>
              <p className="text-sm font-medium text-slate-700 mb-3">{messaggiEmail.formale.oggetto}</p>
              <p className="text-xs text-slate-500 mb-1">Corpo:</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{messaggiEmail.formale.corpo}</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => approvaMessaggio('email_formale', messaggiEmail!.formale.corpo)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">✅ Approva</button>
                <button onClick={() => copiaMessaggio(messaggiEmail!.formale.corpo)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">📋 Copia</button>
                <button onClick={() => apriEmail(messaggiEmail!.formale.oggetto, messaggiEmail!.formale.corpo)} className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700">📧 Email</button>
              </div>
            </div>

            <div className="mb-6 p-4 border border-slate-200 rounded-lg">
              <h3 className="font-medium text-slate-700 mb-2">😊 Cordiale</h3>
              <p className="text-xs text-slate-500 mb-1">Oggetto:</p>
              <p className="text-sm font-medium text-slate-700 mb-3">{messaggiEmail.cordiale.oggetto}</p>
              <p className="text-xs text-slate-500 mb-1">Corpo:</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{messaggiEmail.cordiale.corpo}</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => approvaMessaggio('email_cordiale', messaggiEmail!.cordiale.corpo)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">✅ Approva</button>
                <button onClick={() => copiaMessaggio(messaggiEmail!.cordiale.corpo)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">📋 Copia</button>
                <button onClick={() => apriEmail(messaggiEmail!.cordiale.oggetto, messaggiEmail!.cordiale.corpo)} className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700">📧 Email</button>
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg">
              <h3 className="font-medium text-slate-700 mb-2">⚡ Urgenza</h3>
              <p className="text-xs text-slate-500 mb-1">Oggetto:</p>
              <p className="text-sm font-medium text-slate-700 mb-3">{messaggiEmail.urgenza.oggetto}</p>
              <p className="text-xs text-slate-500 mb-1">Corpo:</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{messaggiEmail.urgenza.corpo}</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => approvaMessaggio('email_urgenza', messaggiEmail!.urgenza.corpo)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">✅ Approva</button>
                <button onClick={() => copiaMessaggio(messaggiEmail!.urgenza.corpo)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">📋 Copia</button>
                <button onClick={() => apriEmail(messaggiEmail!.urgenza.oggetto, messaggiEmail!.urgenza.corpo)} className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700">📧 Email</button>
              </div>
            </div>
          </div>
        )}

        {/* BOTTONE RIGENERA */}
        {(messaggiWhatsApp || messaggiEmail) && (
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-all font-medium"
          >
            🔄 Rigenera messaggi con feedback
          </button>
        )}

        {/* NO MESSAGGI */}
        {!messaggiWhatsApp && !messaggiEmail && (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <p className="text-slate-600">Nessun messaggio generato ancora. Il sistema li sta processando...</p>
            <button
              onClick={() => fetchLead()}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              🔄 Ricarica
            </button>
          </div>
        )}

        {/* MODAL FORM CAMPI EXTRA + UPLOAD */}
        {showFormModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-slate-800 mb-2">{selectedTemplate.nome}</h3>
              <p className="text-sm text-slate-500 mb-4">Compila i campi per personalizzare il template</p>

              <div className="space-y-4">
                {/* CAMPI EXTRA */}
                {selectedTemplate.campi_extra?.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={extraFields[field.name] || ''}
                      onChange={(e) => setExtraFields({...extraFields, [field.name]: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                ))}

                {/* UPLOAD ALLEGATO */}
                {selectedTemplate.supporta_allegato && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      📎 Allegato (opzionale)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            alert('⚠️ File troppo grande! Max 10MB')
                            e.target.value = ''
                            return
                          }
                          setAllegatoFile(file)
                        }
                      }}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Formati: PDF, JPG, PNG - Max 10MB
                    </p>
                    {allegatoFile && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                        <span>✅ {allegatoFile.name}</span>
                        <button
                          onClick={() => setAllegatoFile(null)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowFormModal(false)
                    setExtraFields({})
                    setAllegatoFile(null)
                    setAllegatoUrl('')
                  }}
                  disabled={uploading}
                  className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-all font-medium disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleFormSubmit}
                  disabled={uploading}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all font-medium disabled:opacity-50"
                >
                  {uploading ? '⏳ Upload...' : '📝 Continua'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FEEDBACK */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">🔄 Rigenera con Feedback</h3>
              <p className="text-sm text-slate-600 mb-4">
                Descrivi cosa vuoi migliorare nei messaggi:
              </p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Es: Rendi il tono più professionale, aggiungi dettagli tecnici sui prodotti, abbrevia i messaggi..."
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  disabled={regenerating}
                  className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-all"
                >
                  Annulla
                </button>
                <button
                  onClick={rigeneraConFeedback}
                  disabled={regenerating}
                  className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-all disabled:opacity-50"
                >
                  {regenerating ? '⏳ Rigenerando...' : '✨ Rigenera'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL TEMPLATE PREVIEW */}
        {showTemplateModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedTemplate.nome}</h3>
                  <p className="text-sm text-slate-500">{selectedTemplate.descrizione}</p>
                </div>
                <button
                  onClick={() => {
                    setShowTemplateModal(false)
                    setExtraFields({})
                    setAllegatoFile(null)
                    setAllegatoUrl('')
                  }}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-[#ECE5DD] rounded-lg p-4 mb-4">
                <div className="bg-white rounded-lg p-3 shadow-sm max-w-[85%] whitespace-pre-wrap text-sm">
                  {templatePreview}
                </div>
                <p className="text-xs text-slate-500 mt-2 text-right">
                  Oggi {new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}
                </p>
              </div>

              {allegatoUrl && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-700 font-medium mb-1">📎 Allegato incluso nel messaggio</p>
                  <a href={allegatoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                    {allegatoUrl}
                  </a>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTemplateModal(false)
                    setExtraFields({})
                    setAllegatoFile(null)
                    setAllegatoUrl('')
                  }}
                  className="flex-1 bg-slate-200 text-slate-700 px-4 py-3 rounded-lg hover:bg-slate-300 transition-all font-medium"
                >
                  Annulla
                </button>
                <button
                  onClick={() => useTemplate(selectedTemplate)}
                  className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-all font-medium"
                >
                  💬 Invia su WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}