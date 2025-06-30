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

  if (!appId) {
    return NextResponse.json({ error: 'APP_ID not configured', status: 500 })
  }

  try {
    const verifyRes = (await verifyCloudProof(payload, appId, action, signal)) as IVerifyResponse

    if (verifyRes.success) {
      // This is where you should perform backend actions if the verification succeeds
      // Such as, setting a user as "verified" in a database
      return NextResponse.json({ verifyRes, status: 200 })
    } else {
      // This is where you should handle errors from the World ID /verify endpoint.
      // Usually these errors are due to a user having already verified.
      return NextResponse.json({ verifyRes, status: 400 })
    }
  } catch (err: any) {
    console.error('Verification failed:', err)
    return NextResponse.json({ error: 'Verification failed', status: 500 })
  }
}

