import { MiniKit } from '@worldcoin/minikit-js'
import wldAbi from '@/abi/wldAbi.json'

const WLD_ADDRESS = process.env.NEXT_PUBLIC_WLD_ADDRESS

export async function payoutWLD(to: string, amountWld = 0.1): Promise<void> {
  if (!WLD_ADDRESS) throw new Error('WLD token address missing')
  const amountWei = BigInt(Math.round(amountWld * 1e18)).toString()

  const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
    transaction: [
      {
        address: WLD_ADDRESS,
        abi: wldAbi as any,
        functionName: 'transfer',
        args: [to, amountWei],
      },
    ],
  })

  if ((finalPayload as any).status !== 'success') {
    throw new Error('Transaction rejected')
  }
}
