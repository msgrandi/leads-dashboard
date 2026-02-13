import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { leadNome, leadTelefono, templateNome, dataOra } = await request.json()

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    })

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'mario.grandi@henryschein.com',
      subject: `✅ Template inviato a ${leadNome}`,
      html: `
        <h2>Template WhatsApp Inviato</h2>
        <p><strong>Lead:</strong> ${leadNome}</p>
        <p><strong>Telefono:</strong> ${leadTelefono}</p>
        <p><strong>Template:</strong> ${templateNome}</p>
        <p><strong>Data/Ora:</strong> ${dataOra}</p>
      `
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore notifica:', error)
    return NextResponse.json({ error: 'Errore invio notifica' }, { status: 500 })
  }
}