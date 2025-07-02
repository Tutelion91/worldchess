import { NextRequest, NextResponse } from 'next/server'
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js'

interface IRequestPayload {
  payload: ISuccessResult
  action: string
  signal: string | undefined
}

export async function POST(req: NextRequest) {
  const { payload, action, signal } = (await req.json()) as IRequestPayload
  const appId = process.env.APP_ID as `app_${string}` | undefined

  console.log("APP_ID:", appId)
  console.log("Payload:", payload)
  console.log("Action:", action)
  console.log("Signal:", signal)

  if (!appId) {
    console.error('APP_ID not configured')
    return NextResponse.json({ error: 'APP_ID not configured' }, { status: 500 })
  }

  try {
    const verifyRes = (await verifyCloudProof(payload, appId, action, signal)) as IVerifyResponse
    console.log("verifyRes:", verifyRes)

    if (verifyRes.success) {
      return NextResponse.json(
        {
          success: true,
          nullifier_hash: payload.nullifier_hash,
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        {
          success: false,
          code: verifyRes.code,
        },
        { status: 400 }
      )
    }

  } catch (err: any) {
  console.error('Verification failed:', err)
  return NextResponse.json(
    { success: false, error: err.message || 'Verification failed' },
    { status: 500 }
  )
}

}

