'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Lead = {
  id: number
  nome: string
  telefono: string
  email: string
  interesse: string
  stato: string
  created_at: string
  canale_preferito: string
  citta?: string
  indirizzo?: string
  rating?: number
  icebreaking?: string
  email_body?: string
}

type FiltroStato = 'tutti' | 'nuovo' | 'in_attesa_approvazione' | 'approvato'

export default function Dashboard() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadsFiltered, setLeadsFiltered] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAttivo, setFiltroAttivo] = useState<FiltroStato>('tutti')
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({ nuovo: 0, in_attesa: 0, approvato: 0, totale: 0 })

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<any[]>([])

  const [editForm, setEditForm] = useState({
    nome: '',
    telefono: '',
    email: '',
    interesse: '',
    canale_preferito: 'whatsapp'
  })

  const [newLeadForm, setNewLeadForm] = useState({
    nome: '',
    telefono: '',
    email: '',
    interesse: '',
    canale_preferito: 'whatsapp'
  })

  useEffect(() => {
    checkSession()
  }, [])

  useEffect(() => {
    if (!loading) {
      fetchLeads()
    }
  }, [filtroAttivo])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setLeadsFiltered(leads)
      return
    }
    const query = searchQuery.toLowerCase()
    const filtered = leads.filter((lead: Lead) =>
      lead.nome?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.telefono?.includes(query) ||
      lead.interesse?.toLowerCase().includes(query) ||
      lead.citta?.toLowerCase().includes(query)
    )
    setLeadsFiltered(filtered)
  }, [searchQuery, leads])

  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase.from('leads').select('stato')
      if (data) {
        const nuovo = data.filter((l: any) => l.stato === 'nuovo').length
        const in_attesa = data.filter((l: any) => l.stato === 'in_attesa_approvazione').length
        const approvato = data.filter((l: any) => l.stato === 'approvato').length
        setStats({ nuovo, in_attesa, approvato, totale: data.length })
      }
    }
    fetchStats()
  }, [leads])

  async function checkSession() {
    const { data } = await supabase.auth.getSession()
    const session = data?.session
    if (!session) {
      router.push('/login')
      return
    }
    fetchLeads()
  }

  async function fetchLeads() {
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (filtroAttivo !== 'tutti') {
      query = query.eq('stato', filtroAttivo)
    }
    const { data, error } = await query
    if (error) {
      console.error('Errore fetch:', error)
    } else {
      setLeads(data || [])
      setLeadsFiltered(data || [])
    }
    setLoading(false)
  }

  async function exportToExcel() {
    try {
      const XLSX = await import('xlsx')
      const { data: leadsData, error: leadsError } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
      if (leadsError) throw leadsError
      const { data: logData } = await supabase.from('log').select('*').order('created_at', { ascending: false })
      const excelData = leadsData?.map((lead: any) => {
        const ultimoLog = logData?.find((log: any) => log.lead_id === lead.id)
        return {
          'Nome Completo': lead.nome,
          'Email': lead.email,
          'Telefono': lead.telefono,
          'Città': lead.citta || '',
          'Interesse': lead.interesse,
          'Stato': lead.stato,
          'Canale Preferito': lead.canale_preferito,
          'Data Creazione': new Date(lead.created_at).toLocaleString('it-IT'),
          'Data Ultima Azione': ultimoLog ? new Date(ultimoLog.created_at).toLocaleString('it-IT') : 'N/A',
          'Tipo Ultima Attività': ultimoLog?.azione || 'N/A',
          'Dettagli Attività': ultimoLog?.dettagli || 'N/A'
        }
      })
      if (!excelData || excelData.length === 0) {
        alert('Nessun dato da esportare')
        return
      }
      const worksheet = XLSX.utils.json_to_sheet(excelData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads')
      worksheet['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 40 }]
      XLSX.writeFile(workbook, `LeadDental_Export_${new Date().toISOString().split('T')[0]}.xlsx`)
      alert('✅ Export Excel completato!')
    } catch (error) {
      console.error('Errore export:', error)
      alert('❌ Errore durante l\'export')
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    try {
      const XLSX = await import('xlsx')
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      setUploadPreview(jsonData.slice(0, 5))
    } catch (error) {
      console.error('Errore lettura file:', error)
      alert('❌ Errore lettura file Excel')
    }
  }

  async function handleImportExcel() {
    if (!uploadFile) {
      alert('⚠️ Seleziona un file Excel')
      return
    }
    setUploadLoading(true)
    try {
      const XLSX = await import('xlsx')
      const fileData = await uploadFile.arrayBuffer()
      const workbook = XLSX.read(fileData)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)
      
      if (jsonData.length === 0) {
        alert('⚠️ Il file è vuoto')
        setUploadLoading(false)
        return
      }
      
      const leadsToInsert = jsonData.map(row => ({
        nome: row['Nome'] || row['nome'] || row['Nome Completo'] || row['name'] || '',
        telefono: String(row['Telefono'] || row['telefono'] || row['Tel'] || row['phone'] || ''),
        email: row['Email'] || row['email'] || row['E-mail'] || '',
        interesse: row['Interesse'] || row['interesse'] || row['Note'] || row['notes'] || '',
        citta: row['Città'] || row['citta'] || row['City'] || row['city'] || '',
        canale_preferito: row['Canale'] || row['canale_preferito'] || 'whatsapp',
        stato: 'nuovo'
      })).filter(lead => lead.nome && lead.telefono)
      
      if (leadsToInsert.length === 0) {
        alert('⚠️ Nessun lead valido trovato. Assicurati che il file abbia colonne "Nome" e "Telefono"')
        setUploadLoading(false)
        return
      }

      const { data: insertedData, error: insertError } = await supabase.from('leads').insert(leadsToInsert)
      
      if (insertError) {
        console.error('ERRORE SUPABASE:', insertError)
        alert(`❌ Errore Supabase: ${insertError.message}`)
        throw insertError
      }
      
      console.log('LEAD INSERITI:', insertedData)
      alert(`✅ Importati ${leadsToInsert.length} leads con successo!`)
      setIsUploadModalOpen(false)
      setUploadFile(null)
      setUploadPreview([])
      fetchLeads()
    } catch (error) {
      console.error('Errore import:', error)
      alert('❌ Errore durante l\'importazione')
    } finally {
      setUploadLoading(false)
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleNewLead() {
    if (!newLeadForm.nome.trim() || !newLeadForm.telefono.trim()) {
      alert('⚠️ Nome e telefono sono obbligatori!')
      return
    }
    try {
      const { error } = await supabase.from('leads').insert({
        nome: newLeadForm.nome.trim(),
        telefono: newLeadForm.telefono.trim(),
        email: newLeadForm.email.trim() || null,
        interesse: newLeadForm.interesse.trim() || null,
        canale_preferito: newLeadForm.canale_preferito,
        stato: 'nuovo'
      })
      if (error) throw error
      alert('✅ Lead aggiunto con successo!')
      setIsNewLeadModalOpen(false)
      setNewLeadForm({ nome: '', telefono: '', email: '', interesse: '', canale_preferito: 'whatsapp' })
      fetchLeads()
    } catch (error) {
      console.error('Errore creazione:', error)
      alert('❌ Errore durante la creazione')
    }
  }

  function openEditModal(lead: Lead) {
    setSelectedLead(lead)
    setEditForm({
      nome: lead.nome,
      telefono: lead.telefono,
      email: lead.email || '',
      interesse: lead.interesse || '',
      canale_preferito: lead.canale_preferito || 'whatsapp'
    })
    setIsEditModalOpen(true)
  }

  async function handleEditLead() {
    if (!selectedLead) return
    if (!editForm.nome.trim() || !editForm.telefono.trim()) {
      alert('⚠️ Nome e telefono sono obbligatori!')
      return
    }
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          nome: editForm.nome.trim(),
          telefono: editForm.telefono.trim(),
          email: editForm.email.trim() || null,
          interesse: editForm.interesse.trim() || null,
          canale_preferito: editForm.canale_preferito
        })
        .eq('id', selectedLead.id)
      if (error) throw error
      await supabase.from('log').insert({
        lead_id: selectedLead.id,
        azione: 'lead_modificato',
        dettagli: `Modificato: ${editForm.nome}`
      })
      alert('✅ Lead modificato con successo!')
      setIsEditModalOpen(false)
      fetchLeads()
    } catch (error) {
      console.error('Errore modifica:', error)
      alert('❌ Errore durante la modifica')
    }
  }

  function openDeleteModal(lead: Lead) {
    setSelectedLead(lead)
    setIsDeleteModalOpen(true)
  }

  async function handleDeleteLead() {
    if (!selectedLead) return
    try {
      await supabase.from('log').delete().eq('lead_id', selectedLead.id)
      await supabase.from('proposte_messaggi').delete().eq('lead_id', selectedLead.id)
      const { error } = await supabase.from('leads').delete().eq('id', selectedLead.id)
      if (error) throw error
      alert('✅ Lead eliminato!')
      setIsDeleteModalOpen(false)
      fetchLeads()
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('❌ Errore durante l\'eliminazione')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-[#00243F] shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-center py-4 px-6 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🦷</span>
            <div>
              <h1 className="text-xl font-bold text-white">LeadDental AI</h1>
              <p className="text-slate-300 text-sm">Gestione Lead Dentisti</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3 flex-wrap items-center">
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="border border-white px-5 py-2 rounded-lg text-sm text-white hover:bg-white hover:text-[#00243F] transition-all duration-200 font-medium shadow-sm flex items-center gap-2"
              >
                📱 LeadDental
                <span className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {isMenuOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg py-2 min-w-[200px] z-50">
                  <button
                    onClick={() => { router.push('/scraping'); setIsMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                  >
                    🔍 Scraping
                  </button>
                  <button
                    onClick={() => { router.push('/scraped-leads'); setIsMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                  >
                    📋 Lead Scrapati
                  </button>
                  <button
                  onClick={() => { router.push('/campaigns'); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                  >
                    📊 Campagne
                  </button>
                  <button
                    onClick={() => { router.push('/templates'); setIsMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                  >
                    📧 Templates
                  </button>
                  <button
                    onClick={() => { router.push('/emails'); setIsMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                  >
                    📬 Email
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => setIsNewLeadModalOpen(true)} className="bg-white text-[#00243F] px-5 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium shadow-sm flex items-center gap-2">
              <span className="text-xl">+</span> Nuovo
            </button>
            <button onClick={() => setIsUploadModalOpen(true)} className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-sm">
              📤 Upload Excel
            </button>
            <button onClick={exportToExcel} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm">
              📥 Export
            </button>
            <button onClick={() => router.push('/settings')} className="border border-white px-5 py-2 rounded-lg text-sm text-white hover:bg-white hover:text-[#00243F] transition-all duration-200 font-medium shadow-sm">
              ⚙️
            </button>
            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-5 py-2 rounded-lg text-sm text-white transition-all duration-200 font-medium shadow-sm">
              🚪
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
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

        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Cerca per nome, email, telefono, interesse o città..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 text-xl">🔍</span>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold">✕</button>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-slate-500 mt-2">{leadsFiltered.length} risultat{leadsFiltered.length === 1 ? 'o' : 'i'}</p>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <p className="text-sm font-medium text-slate-700 mb-3">Mostra:</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFiltroAttivo('tutti')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroAttivo === 'tutti' ? 'bg-slate-700 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              📊 Tutti ({stats.totale})
            </button>
            <button onClick={() => setFiltroAttivo('nuovo')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroAttivo === 'nuovo' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              🔵 Nuovi ({stats.nuovo})
            </button>
            <button onClick={() => setFiltroAttivo('in_attesa_approvazione')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroAttivo === 'in_attesa_approvazione' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              🟠 In Attesa ({stats.in_attesa})
            </button>
            <button onClick={() => setFiltroAttivo('approvato')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroAttivo === 'approvato' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              ✅ Approvati ({stats.approvato})
            </button>
          </div>
        </div>

        {leadsFiltered.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg">
            <p className="text-slate-500">
              {searchQuery ? `Nessun risultato per "${searchQuery}"` : 'Nessun lead presente'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {leadsFiltered.map((lead) => (
              <div key={lead.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-center">
                  <h2 className="font-medium text-slate-800 text-lg">{lead.nome}</h2>
                  <span className="text-xs text-slate-400">{new Date(lead.created_at).toLocaleString('it-IT')}</span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-slate-600 flex-1">📞 {lead.telefono}</p>
                    <a href={`tel:${lead.telefono}`} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-700 transition-all font-medium">
                      📞 Chiama
                    </a>
                    <a href={`https://wa.me/${lead.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-700 transition-all font-medium">
                      💬 WhatsApp
                    </a>
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-slate-600 flex-1">📧 {lead.email}</p>
                      <a href={`mailto:${lead.email}`} className="bg-slate-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-slate-700 transition-all font-medium">
                        📧 Email
                      </a>
                    </div>
                  )}
                  {lead.citta && <p className="text-sm text-slate-600">📍 {lead.citta}</p>}
                  {lead.interesse && <p className="text-sm text-slate-600">🎯 {lead.interesse}</p>}
                  {lead.canale_preferito && <p className="text-sm text-slate-600">📱 {lead.canale_preferito}</p>}
                  {lead.rating && <p className="text-sm text-slate-600">⭐ {lead.rating}</p>}
                </div>
                <div className="mt-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    lead.stato === 'nuovo' ? 'bg-blue-100 text-blue-700' :
                    lead.stato === 'in_attesa_approvazione' ? 'bg-orange-100 text-orange-700' :
                    lead.stato === 'approvato' ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {lead.stato === 'nuovo' ? '🔵 Nuovo' :
                     lead.stato === 'in_attesa_approvazione' ? '🟠 In Attesa' :
                     lead.stato === 'approvato' ? '✅ Approvato' : lead.stato}
                  </span>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <button onClick={() => router.push(`/lead/${lead.id}`)} className="flex-1 bg-[#00243F] text-white px-4 py-2 rounded-lg hover:bg-[#003D66] transition-all text-sm font-medium shadow-sm">
                    👁️ Vedi messaggi
                  </button>
                  <button onClick={() => openEditModal(lead)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all text-sm font-medium shadow-sm">
                    ✏️ Modifica
                  </button>
                  <button onClick={() => openDeleteModal(lead)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all text-sm font-medium shadow-sm">
                    🗑️ Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">📤 Upload Excel</h3>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <div className="text-4xl mb-2">📁</div>
                  <p className="text-slate-600">Clicca per selezionare file Excel</p>
                  <p className="text-xs text-slate-400 mt-1">.xlsx, .xls, .csv</p>
                </label>
              </div>
              {uploadFile && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700">✅ File selezionato: <strong>{uploadFile.name}</strong></p>
                </div>
              )}
              {uploadPreview.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-slate-700 mb-2">Anteprima (primi 5 record):</p>
                  <div className="text-xs text-slate-600 space-y-1 max-h-32 overflow-y-auto">
                    {uploadPreview.map((row, i) => (
                      <div key={i} className="bg-white p-2 rounded">
                        {Object.entries(row).slice(0, 3).map(([key, val]) => (
                          <span key={key} className="mr-2">{key}: {String(val)}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>📋 Colonne supportate:</strong><br />
                  Nome, Telefono, Email, Interesse, Città, Canale
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setIsUploadModalOpen(false); setUploadFile(null); setUploadPreview([]); }}
                className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-all font-medium"
              >
                Annulla
              </button>
              <button
                onClick={handleImportExcel}
                disabled={!uploadFile || uploadLoading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadLoading ? '⏳ Importando...' : '📤 Importa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isNewLeadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">➕ Nuovo Lead</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={newLeadForm.nome}
                  onChange={(e) => setNewLeadForm({...newLeadForm, nome: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Dr. Mario Rossi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefono *</label>
                <input
                  type="text"
                  value={newLeadForm.telefono}
                  onChange={(e) => setNewLeadForm({...newLeadForm, telefono: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="3471234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({...newLeadForm, email: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="mario.rossi@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Interesse</label>
                <input
                  type="text"
                  value={newLeadForm.interesse}
                  onChange={(e) => setNewLeadForm({...newLeadForm, interesse: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Endodonzia, Implantologia..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Canale Preferito</label>
                <select
                  value={newLeadForm.canale_preferito}
                  onChange={(e) => setNewLeadForm({...newLeadForm, canale_preferito: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="entrambi">Entrambi</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsNewLeadModalOpen(false)}
                className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-all font-medium"
              >
                Annulla
              </button>
              <button
                onClick={handleNewLead}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all font-medium"
              >
                ➕ Aggiungi Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">✏️ Modifica Lead</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={(e) => setEditForm({...editForm, nome: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefono *</label>
                <input
                  type="text"
                  value={editForm.telefono}
                  onChange={(e) => setEditForm({...editForm, telefono: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Interesse</label>
                <input
                  type="text"
                  value={editForm.interesse}
                  onChange={(e) => setEditForm({...editForm, interesse: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Canale Preferito</label>
                <select
                  value={editForm.canale_preferito}
                  onChange={(e) => setEditForm({...editForm, canale_preferito: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="entrambi">Entrambi</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-all font-medium"
              >
                Annulla
              </button>
              <button
                onClick={handleEditLead}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all font-medium"
              >
                💾 Salva Modifiche
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Conferma Eliminazione</h3>
            <p className="text-slate-700 mb-2">
              Sei sicuro di voler eliminare definitivamente questo lead?
            </p>
            <p className="text-sm text-slate-600 mb-4">
              <strong>{selectedLead.nome}</strong><br />
              {selectedLead.telefono}<br />
              {selectedLead.interesse}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">
                <strong>⚠️ Attenzione:</strong> Questa azione è <strong>irreversibile</strong>.
                Tutti i dati associati saranno eliminati.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-all font-medium"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteLead}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all font-medium"
              >
                🗑️ Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}