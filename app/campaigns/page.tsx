'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('scraping_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Errore caricamento campagne:', error);
    } else {
      setCampaigns(data || []);
    }
    
    setLoading(false);
  }

  return (
    <>
      <Header />
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Campagne Scraping</h1>
          <button
            onClick={() => router.push('/scraping')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Nuova Campagna
          </button>
        </div>

        {loading ? (
          <p>Caricamento...</p>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">Nessuna campagna presente</p>
            <button
              onClick={() => router.push('/scraping')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Inizia il primo scraping
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign: any) => (
              <div key={campaign.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{campaign.campaign_name}</h2>
                    <p className="text-sm text-gray-500">
                      Query: <span className="font-medium">{campaign.search_query}</span>
                    </p>
                    {campaign.target_location && (
                      <p className="text-sm text-gray-500">
                        Località: <span className="font-medium">{campaign.target_location}</span>
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {campaign.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Lead Trovati</p>
                    <p className="text-2xl font-bold text-gray-800">{campaign.results_found || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Email Trovate</p>
                    <p className="text-2xl font-bold text-blue-600">{campaign.emails_found || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Max Risultati</p>
                    <p className="text-2xl font-bold text-gray-600">{campaign.max_results}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Tasso Email</p>
                    <p className="text-2xl font-bold text-green-600">
                      {campaign.results_found > 0 
                        ? `${Math.round((campaign.emails_found / campaign.results_found) * 100)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 flex justify-between items-center text-sm text-gray-500">
                  <div>
                    <p>Creata: {new Date(campaign.created_at).toLocaleString('it-IT')}</p>
                    {campaign.completed_at && (
                      <p>Completata: {new Date(campaign.completed_at).toLocaleString('it-IT')}</p>
                    )}
                  </div>
                  <button
                    onClick={() => router.push(`/scraped-leads?campaign=${campaign.id}`)}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
                  >
                    Vedi Lead
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STATISTICHE TOTALI */}
        {campaigns.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Statistiche Totali</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Campagne Totali</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lead Totali</p>
                <p className="text-2xl font-bold text-blue-600">
                  {campaigns.reduce((sum: number, c: any) => sum + (c.results_found || 0), 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email Totali</p>
                <p className="text-2xl font-bold text-green-600">
                  {campaigns.reduce((sum: number, c: any) => sum + (c.emails_found || 0), 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Completate</p>
                <p className="text-2xl font-bold text-green-600">
                  {campaigns.filter((c: any) => c.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}