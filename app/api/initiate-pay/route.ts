import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const uuid = crypto.randomUUID().replace(/-/g, '')
  // TODO: Persist uuid to database for later verification
  return NextResponse.json({ id: uuid })
}
