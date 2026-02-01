import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { leadId, feedback } = await request.json()

    if (!leadId || !feedback) {
      return NextResponse.json(
        { error: 'leadId e feedback richiesti' },
        { status: 400 }
      )
    }

    // Aggiorna il lead con il feedback e resetta lo stato
    const { error } = await supabase
      .from('leads')
      .update({
        feedback_rigenerazione: feedback,
        stato: 'nuovo'
      })
      .eq('id', leadId)

    if (error) {
      console.error('Errore Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Elimina le vecchie proposte
    await supabase
      .from('proposte_messaggi')
      .delete()
      .eq('lead_id', leadId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore:', error)
    return NextResponse.json(
      { error: 'Errore server' },
      { status: 500 }
    )
  }
}