'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Template = {
  id: number
  nome: string
  oggetto: string
  corpo: string
  tipo: string
  created_at: string
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

  const [form, setForm] = useState({
    nome: '',
    oggetto: '',
    corpo: '',
    tipo: 'email'
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Errore fetch templates:', error)
    } else {
      setTemplates(data || [])
    }
    setLoading(false)
  }

  function openNewModal() {
    setEditingTemplate(null)
    setForm({ nome: '', oggetto: '', corpo: '', tipo: 'email' })
    setIsModalOpen(true)
  }

  function openEditModal(template: Template) {
    setEditingTemplate(template)
    setForm({
      nome: template.nome,
      oggetto: template.oggetto,
      corpo: template.corpo,
      tipo: template.tipo
    })
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.corpo.trim()) {
      alert('⚠️ Nome e corpo sono obbligatori')
      return
    }

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('templates')
          .update({
            nome: form.nome.trim(),
            oggetto: form.oggetto.trim(),
            corpo: form.corpo.trim(),
            tipo: form.tipo
          })
          .eq('id', editingTemplate.id)

        if (error) throw error
        alert('✅ Template modificato!')
      } else {
        const { error } = await supabase
          .from('templates')
          .insert({
            nome: form.nome.trim(),
            oggetto: form.oggetto.trim(),
            corpo: form.corpo.trim(),
            tipo: form.tipo
          })

        if (error) throw error
        alert('✅ Template creato!')
      }

      setIsModalOpen(false)
      fetchTemplates()
    } catch (error) {
      console.error('Errore salvataggio:', error)
      alert('❌ Errore durante il salvataggio')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Sei sicuro di voler eliminare questo template?')) return

    try {
      const { error } = await supabase.from('templates').delete().eq('id', id)
      if (error) throw error
      alert('✅ Template eliminato!')
      fetchTemplates()
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('❌ Errore durante l\'eliminazione')
    }
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
            <span className="text-3xl">📧</span>
            <div>
              <h1 className="text-xl font-bold text-white">Templates Email</h1>
              <p className="text-slate-300 text-sm">Gestisci i tuoi template</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openNewModal}
              className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition-all font-medium"
            >
              + Nuovo Template
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-white text-[#00243F] px-5 py-2 rounded-lg hover:bg-gray-100 transition-all font-medium"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        {templates.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-slate-500">Nessun template presente</p>
            <button
              onClick={openNewModal}
              className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-all font-medium"
            >
              + Crea il primo template
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {templates.map((template) => (
              <div key={template.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-bold text-slate-800 text-lg">{template.nome}</h2>
                    <p className="text-sm text-slate-500 mt-1">📌 {template.oggetto || 'Nessun oggetto'}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                      template.tipo === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {template.tipo === 'email' ? '📧 Email' : '💬 WhatsApp'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(template)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-all"
                    >
                      ✏️ Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="mt-3 bg-slate-50 rounded-lg p-3">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{template.corpo.substring(0, 200)}...</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              {editingTemplate ? '✏️ Modifica Template' : '➕ Nuovo Template'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Template *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({...form, nome: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es: Prima Email Presentazione"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({...form, tipo: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="email">📧 Email</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Oggetto (solo email)</label>
                <input
                  type="text"
                  value={form.oggetto}
                  onChange={(e) => setForm({...form, oggetto: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es: Proposta collaborazione ProTaper Next"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Corpo Messaggio *</label>
                <textarea
                  value={form.corpo}
                  onChange={(e) => setForm({...form, corpo: e.target.value})}
                  rows={10}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Scrivi il tuo template qui... Usa {{nome}}, {{citta}}, {{icebreaking}} come variabili"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>💡 Variabili disponibili:</strong><br />
                  {'{{nome}}'} - Nome del lead<br />
                  {'{{citta}}'} - Città<br />
                  {'{{icebreaking}}'} - Frase icebreaking personalizzata
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-all font-medium"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all font-medium"
              >
                💾 Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
