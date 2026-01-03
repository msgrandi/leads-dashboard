'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type NewLeadModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function NewLeadModal({ isOpen, onClose, onSuccess }: NewLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefono: '',
    interesse: '',
    note: '',
    dettagli_claude: '',
    canale_preferito: 'whatsapp'
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // Calcola row_number (prendi max + 1)
      const { data: maxRow } = await supabase
        .from('leads')
        .select('row_number')
        .order('row_number', { ascending: false })
        .limit(1)
        .single()

      const newRowNumber = (maxRow?.row_number || 0) + 1

      // Insert lead
      const { data, error } = await supabase
        .from('leads')
        .insert({
          ...formData,
          row_number: newRowNumber,
          stato: 'nuovo'
        })
        .select()
        .single()

      if (error) throw error

      alert('Lead creato con successo!')
      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        nome: '',
        email: '',
        telefono: '',
        interesse: '',
        note: '',
        dettagli_claude: '',
        canale_preferito: 'whatsapp'
      })
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore durante la creazione del lead')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Nuovo Lead</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome * <span className="text-xs text-gray-500">(es. Dr. Mario Rossi)</span>
              </label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dr. Mario Rossi"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="mario.rossi@example.com"
              />
            </div>

            {/* Telefono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefono * <span className="text-xs text-gray-500">(solo numeri, es. 3479635862)</span>
              </label>
              <input
                type="tel"
                required
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="3479635862"
              />
            </div>

            {/* Interesse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interesse *
              </label>
              <input
                type="text"
                required
                value={formData.interesse}
                onChange={(e) => setFormData({ ...formData, interesse: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Corso EdgeEndo EdgeTaper"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Contatto da fiera, interessato a..."
              />
            </div>

            {/* Dettagli Claude */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dettagli per Claude <span className="text-xs text-gray-500">(info prodotto/servizio)</span>
              </label>
              <textarea
                value={formData.dettagli_claude}
                onChange={(e) => setFormData({ ...formData, dettagli_claude: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Prezzo: 299€ | Durata: 20 ore | Include certificato"
              />
            </div>

            {/* Canale Preferito */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Canale Preferito *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="canale"
                    value="whatsapp"
                    checked={formData.canale_preferito === 'whatsapp'}
                    onChange={(e) => setFormData({ ...formData, canale_preferito: e.target.value })}
                    className="mr-2"
                  />
                  <span className="text-sm">📱 WhatsApp</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="canale"
                    value="email"
                    checked={formData.canale_preferito === 'email'}
                    onChange={(e) => setFormData({ ...formData, canale_preferito: e.target.value })}
                    className="mr-2"
                  />
                  <span className="text-sm">📧 Email</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="canale"
                    value="entrambi"
                    checked={formData.canale_preferito === 'entrambi'}
                    onChange={(e) => setFormData({ ...formData, canale_preferito: e.target.value })}
                    className="mr-2"
                  />
                  <span className="text-sm">🔄 Entrambi</span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#00243F] text-white rounded-lg hover:bg-[#003D66] disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Creazione...' : '✅ Crea Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}