'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

type UploadExcelModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type LeadPreview = {
  nome: string
  telefono: string
  email: string
  interesse: string
  note?: string
  dettagli_claude?: string
  contesto_aggiuntivo?: string
  canale_preferito: string
  valid: boolean
  errors: string[]
}

export default function UploadExcelModal({ isOpen, onClose, onSuccess }: UploadExcelModalProps) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<LeadPreview[]>([])
  const [showPreview, setShowPreview] = useState(false)

  function handleFileSelect(selectedFile: File) {
    setFile(selectedFile)
    parseFile(selectedFile)
  }

  function parseFile(file: File) {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet) as any[]

        // Valida e prepara preview
        const leadsPreview: LeadPreview[] = json.map((row, index) => {
          const errors: string[] = []
          
          // Validazioni
          if (!row.nome && !row.Nome) errors.push('Nome mancante')
          if (!row.telefono && !row.Telefono) errors.push('Telefono mancante')
          if (!row.interesse && !row.Interesse) errors.push('Interesse mancante')
          
          const nome = row.nome || row.Nome || ''
          const telefono = String(row.telefono || row.Telefono || '').replace(/\s/g, '')
          const email = row.email || row.Email || ''
          const interesse = row.interesse || row.Interesse || ''
          const note = row.note || row.Note || ''
          const dettagli_claude = row.dettagli_claude || row.Dettagli || row.dettagli || ''
          const contesto_aggiuntivo = row.contesto_aggiuntivo || row.Contesto || row.contesto || ''
          const canale_preferito = (row.canale_preferito || row.Canale || 'whatsapp').toLowerCase()

          // Valida canale
          if (!['whatsapp', 'email', 'entrambi'].includes(canale_preferito)) {
            errors.push('Canale non valido (usa: whatsapp, email, entrambi)')
          }

          return {
            nome,
            telefono,
            email,
            interesse,
            note,
            dettagli_claude,
            contesto_aggiuntivo,
            canale_preferito,
            valid: errors.length === 0,
            errors
          }
        })

        setPreview(leadsPreview)
        setShowPreview(true)
      } catch (error) {
        console.error('Errore parsing file:', error)
        alert('❌ Errore nel parsing del file. Assicurati che sia un file Excel o CSV valido.')
      }
    }

    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    setLoading(true)

    try {
      // Filtra solo lead validi
      const validLeads = preview.filter(l => l.valid)

      if (validLeads.length === 0) {
        alert('❌ Nessun lead valido da importare!')
        setLoading(false)
        return
      }

      // Ottieni ultimo row_number
      const { data: maxRow } = await supabase
        .from('leads')
        .select('row_number')
        .order('row_number', { ascending: false })
        .limit(1)
        .single()

      let currentRowNumber = (maxRow?.row_number || 0) + 1

      // Prepara dati per insert
      const leadsToInsert = validLeads.map(lead => ({
        nome: lead.nome,
        telefono: lead.telefono,
        email: lead.email,
        interesse: lead.interesse,
        note: lead.note,
        dettagli_claude: lead.dettagli_claude,
        contesto_aggiuntivo: lead.contesto_aggiuntivo,
        canale_preferito: lead.canale_preferito,
        stato: 'nuovo',
        row_number: currentRowNumber++
      }))

      // Insert batch
      const { data, error } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select()

      if (error) throw error

      alert(`✅ ${validLeads.length} lead importati con successo!`)
      onSuccess()
      onClose()
      
      // Reset
      setFile(null)
      setPreview([])
      setShowPreview(false)
    } catch (error) {
      console.error('Errore import:', error)
      alert('❌ Errore durante l\'importazione')
    } finally {
      setLoading(false)
    }
  }

  function downloadTemplate() {
    const template = [
      {
        nome: 'Dr. Mario Rossi',
        telefono: '3479635862',
        email: 'mario.rossi@example.com',
        interesse: 'Corso EdgeEndo',
        note: 'Contatto da webinar',
        dettagli_claude: 'Corso 20 ore, certificato incluso',
        contesto_aggiuntivo: 'Ha partecipato al webinar del 15 gennaio',
        canale_preferito: 'whatsapp'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'template_import_lead.xlsx')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">📤 Upload Excel/CSV</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>

          {!showPreview ? (
            /* UPLOAD SECTION */
            <div>
              <div className="mb-4">
                <button
                  onClick={downloadTemplate}
                  className="text-blue-600 hover:underline text-sm"
                >
                  📥 Scarica Template Excel
                </button>
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const droppedFile = e.dataTransfer.files[0]
                  if (droppedFile) handleFileSelect(droppedFile)
                }}
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <div className="text-6xl mb-4">📁</div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Trascina qui il file Excel/CSV
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  oppure clicca per selezionare
                </p>
                <p className="text-xs text-gray-400">
                  Formati supportati: .xlsx, .xls, .csv
                </p>
              </div>

              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                aria-label="Seleziona file Excel o CSV"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0]
                  if (selectedFile) handleFileSelect(selectedFile)
                }}
                className="hidden"
              />

              {/* Info Box */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-semibold mb-2">📋 Colonne richieste:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>nome</strong> (obbligatorio) - es: Dr. Mario Rossi</li>
                  <li>• <strong>telefono</strong> (obbligatorio) - es: 3479635862</li>
                  <li>• <strong>interesse</strong> (obbligatorio) - es: Corso EdgeEndo</li>
                  <li>• <strong>email</strong> (opzionale)</li>
                  <li>• <strong>note</strong> (opzionale)</li>
                  <li>• <strong>dettagli_claude</strong> (opzionale)</li>
                  <li>• <strong>contesto_aggiuntivo</strong> (opzionale)</li>
                  <li>• <strong>canale_preferito</strong> (opzionale) - whatsapp/email/entrambi</li>
                </ul>
              </div>
            </div>
          ) : (
            /* PREVIEW SECTION */
            <div>
              <div className="mb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">Preview Import</h3>
                  <p className="text-sm text-gray-600">
                    {preview.filter(l => l.valid).length} lead validi / {preview.length} totali
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPreview(false)
                    setFile(null)
                    setPreview([])
                  }}
                  className="text-blue-600 hover:underline text-sm"
                >
                  ← Cambia file
                </button>
              </div>

              {/* Tabella Preview */}
              <div className="overflow-x-auto max-h-96 border rounded">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Stato</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nome</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Telefono</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Interesse</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Canale</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Errori</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.map((lead, index) => (
                      <tr key={index} className={lead.valid ? '' : 'bg-red-50'}>
                        <td className="px-3 py-2">
                          {lead.valid ? (
                            <span className="text-green-600 font-bold">✅</span>
                          ) : (
                            <span className="text-red-600 font-bold">❌</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm">{lead.nome}</td>
                        <td className="px-3 py-2 text-sm">{lead.telefono}</td>
                        <td className="px-3 py-2 text-sm">{lead.interesse}</td>
                        <td className="px-3 py-2 text-sm">{lead.canale_preferito}</td>
                        <td className="px-3 py-2 text-sm text-red-600">
                          {lead.errors.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowPreview(false)
                    setFile(null)
                    setPreview([])
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={loading}
                >
                  Annulla
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  disabled={loading || preview.filter(l => l.valid).length === 0}
                >
                  {loading ? 'Importazione...' : `✅ Importa ${preview.filter(l => l.valid).length} Lead`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}