import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  // Erzeuge eine eindeutige Referenz-ID für die Zahlung
  const id = crypto.randomUUID().replace(/-/g, '');
  return NextResponse.json({ id });
}

