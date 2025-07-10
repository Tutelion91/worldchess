import { MiniKit } from '@worldcoin/minikit-js'
import wldAbi from '@/abi/wldAbi.json'

const WLD_ADDRESS = process.env.NEXT_PUBLIC_WLD_ADDRESS

export async function payoutWLD(to: string, amountWld = 0.1): Promise<void> {
  if (!WLD_ADDRESS) throw new Error('WLD token address missing')
  const wei = BigInt(Math.round(amountWld * 1e18)).toString()

  try {
    const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
      transaction: [
        {
          address: WLD_ADDRESS,
          abi: wldAbi as any,
          functionName: 'transfer',
          args: [to, wei],
        },
      ],
    })

    await fetch('/api/txlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txId: (finalPayload as any).transaction_id,
        to,
        amount: wei,
      }),
    })

    if ((finalPayload as any).status !== 'success') {
      throw new Error('Transaction rejected')
    }
  } catch (e: any) {
    await fetch('/api/txlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txId: 'ERROR',
        to,
        amount: wei,
        error: e?.message ?? 'unknown',
      }),
    })
    throw e
  }
}
