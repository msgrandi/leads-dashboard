'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Lead = {
  id: number
  nome: string
  telefono: string
  created_at: string
}

export default function Dashboard() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    const { data } = await supabase.auth.getSession()

    if (!data.session) {
      router.push('/login')
      return
    }

    fetchLeads()
  }

  async function fetchLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Errore fetch:', error)
    } else {
      setLeads(data || [])
    }

    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div className="p-8">Caricamento...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Dashboard Lead
        </h1>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg
                     text-gray-700 hover:bg-gray-900 hover:text-white
                     transition-colors duration-200"
        >
          <span className="text-sm">Logout</span>
          <span className="text-lg leading-none">→</span>
        </button>
      </div>

      {leads.length === 0 ? (
        <div className="text-gray-500">Nessun lead presente</div>
      ) : (
        <div className="grid gap-4">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm"
            >
              <h2 className="font-medium">{lead.nome}</h2>
              <p className="text-sm">📞 {lead.telefono}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(lead.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
