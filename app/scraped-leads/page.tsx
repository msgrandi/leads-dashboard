'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Header from '@/components/Header';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ScrapedLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadLeads();
  }, [cityFilter, statusFilter]);

  async function loadLeads() {
    setLoading(true);
    
    let query = supabase
      .from('scraped_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (cityFilter) {
      query = query.ilike('city', `%${cityFilter}%`);
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Errore caricamento lead:', error);
    } else {
      setLeads(data || []);
    }
    
    setLoading(false);
  }

  return (
    <>
      <Header />
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Lead Scrapati</h1>

        {/* FILTRI */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Città</label>
            <input
              type="text"
              placeholder="Es: Milano"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Stato</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="all">Tutti</option>
              <option value="new">Nuovi</option>
              <option value="contacted">Contattati</option>
              <option value="qualified">Qualificati</option>
              <option value="unqualified">Non qualificati</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setCityFilter('');
                setStatusFilter('all');
              }}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              Reset Filtri
            </button>
          </div>
        </div>

        {/* TABELLA LEAD */}
        {loading ? (
          <p>Caricamento...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Città</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefono</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Nessun lead trovato
                    </td>
                  </tr>
                ) : (
                  leads.map((lead: any) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{lead.business_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{lead.city}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{lead.phone || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{lead.email || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lead.rating ? `⭐ ${lead.rating}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${
                          lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                          lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {lead.status || 'new'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString('it-IT')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* STATISTICHE */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Totale Lead</p>
            <p className="text-2xl font-bold">{leads.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Nuovi</p>
            <p className="text-2xl font-bold text-blue-600">
              {leads.filter((l: any) => l.status === 'new').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Contattati</p>
            <p className="text-2xl font-bold text-yellow-600">
              {leads.filter((l: any) => l.status === 'contacted').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Qualificati</p>
            <p className="text-2xl font-bold text-green-600">
              {leads.filter((l: any) => l.status === 'qualified').length}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}