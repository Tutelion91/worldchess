'use client'

import { useEffect, ReactNode } from 'react'
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js'

export const MiniKitProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    MiniKit.install()

    const verifyPayload: VerifyCommandInput = {
      action: 'voting-action',
      signal: '0x12312',
      verification_level: VerificationLevel.Orb,
    }

    const handleVerify = async () => {
      if (!MiniKit.isInstalled()) {
        return
      }
      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload)
      if ((finalPayload as any).status === 'error') {
        return console.log('Error payload', finalPayload)
      }

      const verifyResponse = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: finalPayload as ISuccessResult,
          action: verifyPayload.action,
          signal: verifyPayload.signal,
        }),
      })
      const verifyResponseJson = await verifyResponse.json()
      if (verifyResponseJson.status === 200) {
        console.log('Verification success!')
      }
    }

    handleVerify()
  }, [])

  return <>{children}</>
}
