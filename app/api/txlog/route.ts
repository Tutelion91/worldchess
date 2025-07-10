import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { txId, to, amount, error } = await req.json()

  console.log('🪙 Neue Auszahlung:')
  console.log('  TX-Hash  :', txId)
  console.log('  Empfänger:', to)
  console.log('  Betrag   :', amount, 'Wei')
  if (error) {
    console.log('  Fehler   :', error)
  }

  return NextResponse.json({ ok: true })
}
