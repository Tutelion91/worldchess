import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js'

/**
 * Prompts the user for World ID verification and verifies the proof
 * on the backend. Returns `true` if the verification succeeded.
 */
export async function handleVerify(): Promise<boolean> {
  if (!MiniKit.isInstalled()) {
    return false
  }

  const verifyPayload: VerifyCommandInput = {
    action: 'chess-game',
    signal: '0x12312',
    verification_level: VerificationLevel.Orb,
  }

  try {
    const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload)
    if (finalPayload.status === 'error') {
      console.log('Error payload', finalPayload)
      return false
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
    return verifyResponseJson.status === 200
  } catch (err) {
    console.error('Verification failed', err)
    return false
  }
}
