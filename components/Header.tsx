'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Header() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
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
                  onClick={() => { router.push('/dashboard'); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                >
                  🏠 Dashboard
                </button>
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
          <button 
            onClick={() => router.push('/settings')} 
            className="border border-white px-5 py-2 rounded-lg text-sm text-white hover:bg-white hover:text-[#00243F] transition-all duration-200 font-medium shadow-sm"
          >
            ⚙️
          </button>
          <button 
            onClick={handleLogout} 
            className="bg-red-500 hover:bg-red-600 px-5 py-2 rounded-lg text-sm text-white transition-all duration-200 font-medium shadow-sm"
          >
            🚪
          </button>
        </div>
      </div>
    </header>
  );
}