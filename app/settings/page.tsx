'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Settings() {
  const router = useRouter()
  const [emailNotifiche, setEmailNotifiche] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      router.push('/login')
      return
    }
    fetchSettings()
  }

  async function fetchSettings() {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'email_notifiche')
      .single()

    if (data) {
      setEmailNotifiche(data.value || '')
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)

    const { error } = await supabase
      .from('settings')
      .update({ value: emailNotifiche, updated_at: new Date().toISOString() })
      .eq('key', 'email_notifiche')

    if (error) {
      alert('Errore nel salvataggio: ' + error.message)
    } else {
      alert('✅ Impostazioni salvate!')
    }

    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div className="p-8">Caricamento...</div>
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* HEADER */}
      <header className="bg-[#00243F] shadow">
        <div className="flex flex-col md:flex-row justify-between items-center py-4 px-6 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <div className="bg-white p-3 rounded-xl shadow-md">
              <img
                src="/logo-mario-stefano-grandi.png"
                alt="Mario Stefano Grandi"
                width={100}
                height={100}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Impostazioni
              </h1>
              <p className="text-slate-300 text-sm">
                Configurazione sistema notifiche
              </p>
            </div>
          </div>

          <div className="mt-4 md:mt-0 flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="border border-white px-5 py-2 rounded-lg text-sm text-white hover:bg-white hover:text-[#00243F] transition-all"
            >
              ← Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="border border-white px-5 py-2 rounded-lg text-sm text-white hover:bg-white hover:text-[#00243F] transition-all"
            >
              Logout →
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="p-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-6">📧 Notifiche Email</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email per ricevere notifiche nuovi lead:
              </label>
              <input
                type="email"
                value={emailNotifiche}
                onChange={(e) => setEmailNotifiche(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="mario@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Riceverai una notifica ogni volta che n8n genera nuovi messaggi per un lead
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#00243F] text-white px-6 py-3 rounded-lg hover:bg-[#003D66] transition-all disabled:opacity-50 font-medium"
            >
              {saving ? 'Salvataggio...' : '💾 Salva Impostazioni'}
            </button>
          </div>
        </div>

        {/* INFO */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Come funziona:</strong><br />
            Quando n8n rileva un nuovo lead e genera i messaggi, invierà automaticamente una email all'indirizzo configurato con un link diretto per approvare i messaggi.
          </p>
        </div>
      </main>
    </div>
  )
}