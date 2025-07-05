'use client'

import { useEffect, ReactNode, useRef } from 'react'
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js'

export const MiniKitProvider = ({ children }: { children: ReactNode }) => {
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    MiniKit.install()

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

      const resJson = await verifyResponse.json().catch(() => ({} as any))

      if (verifyResponse.ok || resJson.code === 'max_verifications_reached') {
        console.log('Verification success!')
        if (typeof window !== 'undefined') {
          localStorage.setItem('worldIdVerified', 'true')
        }
      } else {
        console.error('Verification failed:', verifyResponse.status, resJson)
      }
    }

    handleVerify()
  }, [])

  return <>{children}</>
}

