'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NewLeadModal from './components/NewLeadModal'
import UploadExcelModal from './components/UploadExcelModal'

type Lead = {
  id: number
  nome: string
  telefono: string
  email: string
  interesse: string
  stato: string
  created_at: string
  canale_preferito: string
}

type FiltroStato = 'tutti' | 'nuovo' | 'in_attesa_approvazione' | 'approvato'

export default function Dashboard() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadsFiltered, setLeadsFiltered] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [filtroAttivo, setFiltroAttivo] = useState<FiltroStato>('in_attesa_approvazione')
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({ nuovo: 0, in_attesa: 0, approvato: 0, totale: 0 })

  // Modifica & Elimina
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [editForm, setEditForm] = useState({
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
    const filtered = leads.filter(lead => 
      lead.nome.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.telefono.includes(query) ||
      lead.interesse.toLowerCase().includes(query)
    )
    setLeadsFiltered(filtered)
  }, [searchQuery, leads])

  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase.from('leads').select('stato')
      if (data) {
        const nuovo = data.filter(l => l.stato === 'nuovo').length
        const in_attesa = data.filter(l => l.stato === 'in_attesa_approvazione').length
        const approvato = data.filter(l => l.stato === 'approvato').length
        setStats({ nuovo, in_attesa, approvato, totale: data.length })
      }
    }
    fetchStats()
  }, [leads])

  async function checkSession() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
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
      const excelData = leadsData?.map(lead => {
        const ultimoLog = logData?.find(log => log.lead_id === lead.id)
        return {
          'Nome Completo': lead.nome,
          'Email': lead.email,
          'Telefono': lead.telefono,
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
      worksheet['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 40 }]
      XLSX.writeFile(workbook, `HSE_Leads_Export_${new Date().toISOString().split('T')[0]}.xlsx`)
      alert('✅ Export Excel completato!')
    } catch (error) {
      console.error('Errore export:', error)
      alert('❌ Errore durante l\'export')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // MODIFICA LEAD
  function openEditModal(lead: Lead) {
    setSelectedLead(lead)
    setEditForm({
      nome: lead.nome,
      telefono: lead.telefono,
      email: lead.email || '',
      interesse: lead.interesse,
      canale_preferito: lead.canale_preferito
    })
    setIsEditModalOpen(true)
  }

  async function handleEditLead() {
    if (!selectedLead) return

    // Validazione
    if (!editForm.nome.trim() || !editForm.telefono.trim() || !editForm.interesse.trim()) {
      alert('⚠️ Compila tutti i campi obbligatori!')
      return
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          nome: editForm.nome.trim(),
          telefono: editForm.telefono.trim(),
          email: editForm.email.trim() || null,
          interesse: editForm.interesse.trim(),
          canale_preferito: editForm.canale_preferito
        })
        .eq('id', selectedLead.id)

      if (error) throw error

      // Log modifica
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

  // ELIMINA LEAD
  function openDeleteModal(lead: Lead) {
    setSelectedLead(lead)
    setIsDeleteModalOpen(true)
  }

  async function handleDeleteLead() {
    if (!selectedLead) return

    try {
      // Elimina log associati
      await supabase.from('log').delete().eq('lead_id', selectedLead.id)

      // Elimina proposte messaggi
      await supabase.from('proposte_messaggi').delete().eq('lead_id', selectedLead.id)

      // Elimina lead
      const { error } = await supabase.from('leads').delete().eq('id', selectedLead.id)

      if (error) throw error

      alert('✅ Lead eliminato definitivamente!')
      setIsDeleteModalOpen(false)
      fetchLeads()
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('❌ Errore durante l\'eliminazione')
    }
  }

  if (loading) {
    return <div className="p-8">Caricamento...</div>
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-[#00243F] shadow">
        <div className="flex flex-col md:flex-row justify-between items-center py-4 px-6 md:px-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 md:gap-6 w-full md:w-auto">
            <div className="bg-white p-3 rounded-xl shadow-md flex items-center justify-center flex-shrink-0">
              <img src="/logo-mario-stefano-grandi.png" alt="Mario Stefano Grandi" width={100} height={100} className="object-contain" />
            </div>
            <div className="flex flex-col justify-center text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Mario Stefano Grandi</h1>
              <p className="text-slate-300 text-sm sm:text-base mt-1">HSE Leads Dashboard – Gestione professionale dei contatti</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3 flex-wrap">
            <button onClick={() => setIsModalOpen(true)} className="bg-white text-[#00243F] px-5 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium shadow-sm flex items-center gap-2">
              <span className="text-xl">+</span> Nuovo Lead
            </button>
            <button onClick={() => setIsUploadModalOpen(true)} className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-sm flex items-center gap-2">
              📤 Upload Excel
            </button>
            <button onClick={exportToExcel} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm flex items-center gap-2">
              📥 Esporta Excel
            </button>
            <button onClick={() => router.push('/settings')} className="border border-white px-5 py-2 rounded-lg text-sm text-white hover:bg-white hover:text-[#00243F] transition-all duration-200 font-medium shadow-sm">
              ⚙️ Impostazioni
            </button>
            <button onClick={handleLogout} className="border border-white px-5 py-2 rounded-lg text-sm text-white hover:bg-white hover:text-[#00243F] transition-all duration-200 font-medium shadow-sm">
              Logout →
            </button>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-5xl mx-auto">
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
            <input type="text" placeholder="🔍 Cerca per nome, email, telefono o interesse..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-3 pl-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700" />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 text-xl">🔍</span>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold">✕</button>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-slate-500 mt-2">{leadsFiltered.length} risultat{leadsFiltered.length === 1 ? 'o' : 'i'} trovat{leadsFiltered.length === 1 ? 'o' : 'i'}</p>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <p className="text-sm font-medium text-slate-700 mb-3">Mostra:</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFiltroAttivo('in_attesa_approvazione')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroAttivo === 'in_attesa_approvazione' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              🟠 In Attesa ({stats.in_attesa})
            </button>
            <button onClick={() => setFiltroAttivo('nuovo')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroAttivo === 'nuovo' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              🔵 Nuovi ({stats.nuovo})
            </button>
            <button onClick={() => setFiltroAttivo('approvato')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroAttivo === 'approvato' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              ✅ Approvati ({stats.approvato})
            </button>
            <button onClick={() => setFiltroAttivo('tutti')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtroAttivo === 'tutti' ? 'bg-slate-700 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              📊 Tutti ({stats.totale})
            </button>
          </div>
        </div>

        {leadsFiltered.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg">
            <p className="text-slate-500">
              {searchQuery ? `Nessun risultato per "${searchQuery}"` : filtroAttivo === 'tutti' ? 'Nessun lead presente' : `Nessun lead con stato "${filtroAttivo}"`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {leadsFiltered.map((lead) => (
              <div key={lead.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-center">
                  <h2 className="font-medium text-slate-800">{lead.nome}</h2>
                  <span className="text-xs text-slate-400">{new Date(lead.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-600 flex-1">📞 {lead.telefono}</p>
                    <a href={`tel:${lead.telefono}`} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-700 transition-all duration-200 font-medium">📞 Chiama</a>
                    <a href={`https://wa.me/${lead.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-700 transition-all duration-200 font-medium">💬 WhatsApp</a>
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-600 flex-1">📧 {lead.email}</p>
                      <a href={`mailto:${lead.email}`} className="bg-slate-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-slate-700 transition-all duration-200 font-medium">📧 Email</a>
                    </div>
                  )}
                  {lead.interesse && <p className="text-sm text-slate-600">🎯 {lead.interesse}</p>}
                  {lead.canale_preferito && <p className="text-sm text-slate-600">📱 {lead.canale_preferito}</p>}
                </div>
                <div className="mt-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${lead.stato === 'nuovo' ? 'bg-blue-100 text-blue-700' : lead.stato === 'in_attesa_approvazione' ? 'bg-orange-100 text-orange-700' : lead.stato === 'approvato' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {lead.stato === 'nuovo' ? '🔵 Nuovo' : lead.stato === 'in_attesa_approvazione' ? '🟠 In Attesa' : lead.stato === 'approvato' ? '✅ Approvato' : lead.stato}
                  </span>
                </div>
                
                {/* BOTTONI AZIONI */}
                <div className="mt-4 flex gap-2">
                  <button onClick={() => router.push(`/lead/${lead.id}`)} className="flex-1 bg-[#00243F] text-white px-4 py-2 rounded-lg hover:bg-[#003D66] transition-all duration-200 text-sm font-medium shadow-sm">
                    👁️ Vedi messaggi
                  </button>
                  <button onClick={() => openEditModal(lead)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-sm">
                    ✏️ Modifica
                  </button>
                  <button onClick={() => openDeleteModal(lead)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-200 text-sm font-medium shadow-sm">
                    🗑️ Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <NewLeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => { fetchLeads(); setIsModalOpen(false); }} />
      <UploadExcelModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onSuccess={() => { fetchLeads(); setIsUploadModalOpen(false); }} />

      {/* MODAL MODIFICA LEAD */}
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
                  placeholder="Dr. Mario Rossi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefono *</label>
                <input
                  type="text"
                  value={editForm.telefono}
                  onChange={(e) => setEditForm({...editForm, telefono: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="3471234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="mario.rossi@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Interesse *</label>
                <input
                  type="text"
                  value={editForm.interesse}
                  onChange={(e) => setEditForm({...editForm, interesse: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Corso Endodonzia Avanzata"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Canale Preferito *</label>
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

      {/* MODAL CONFERMA ELIMINAZIONE */}
      {isDeleteModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Conferma Eliminazione</h3>
            
            <p className="text-slate-700 mb-2">
              Sei sicuro di voler eliminare definitivamente questo lead?
            </p>
            <p className="text-sm text-slate-600 mb-4">
              <strong>{selectedLead.nome}</strong><br/>
              {selectedLead.telefono}<br/>
              {selectedLead.interesse}
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">
                <strong>⚠️ Attenzione:</strong> Questa azione è <strong>irreversibile</strong>. 
                Tutti i dati associati (messaggi, log) saranno eliminati definitivamente.
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
                🗑️ Elimina Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}