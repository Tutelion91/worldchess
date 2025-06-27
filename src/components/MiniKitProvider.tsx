'use client'

import { useEffect, ReactNode } from 'react'
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js'

export const MiniKitProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    MiniKit.install()

    // Skip verification if we already stored a successful result.
    if (typeof window !== 'undefined' && localStorage.getItem('worldIdVerified') === 'true') {
      return
    }

    const verifyPayload: VerifyCommandInput = {
      action: 'verify',
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

      // The API can fail in development which results in an empty body. Guard
      // against JSON parsing errors to avoid crashing the client.
      let verifyResponseJson: any = null
      const contentType = verifyResponse.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        try {
          verifyResponseJson = await verifyResponse.json()
        } catch (err) {
          console.error('Failed to parse verification response', err)
        }
      } else {
        console.error(
          'Verification endpoint did not return JSON:',
          await verifyResponse.text()
        )
      }

      if (verifyResponseJson?.status === 200) {
        console.log('Verification success!')
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('worldIdVerified', 'true')
          }
        } catch (err) {
          console.error('Failed to store verification flag', err)
        }
      }
    }

    handleVerify()
  }, [])

  return <>{children}</>
}
