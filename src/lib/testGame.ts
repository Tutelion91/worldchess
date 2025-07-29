import { MiniKit } from '@worldcoin/minikit-js';
import wldAbi from '@/abi/wldAbi.json';
import testAbi from '@/abi/testGameAbi.json';

const WLD_ADDRESS = process.env.NEXT_PUBLIC_WLD_ADDRESS!;
const TEST_CONTRACT = process.env.NEXT_PUBLIC_TEST_CONTRACT_ADDRESS || '0xd9145CCE52D386f254917e481eB44e9943F39138';

// stake in WLD (0.2 WLD -> 10^18-Skalierung)
const TEST_STAKE_WEI = BigInt(Math.floor(0.2 * 1e18)).toString();

export async function createTestGame(gameId: number | string) {
  if (!MiniKit.isInstalled()) throw new Error('MiniKit is not installed');
  const idArg = BigInt(gameId).toString();
  // erst Approve, dann deposit ausführen
  await MiniKit.commandsAsync.sendTransaction({
    transaction: [
      {
        address: WLD_ADDRESS,
        abi: wldAbi as any,
        functionName: 'approve',
        args: [TEST_CONTRACT, TEST_STAKE_WEI],
      },
      {
        address: TEST_CONTRACT,
        abi: testAbi as any,
        functionName: 'depositTestGame',
        args: [idArg],
      },
    ],
  });
}

export async function settleTestGame(gameId: number | string) {
  if (!MiniKit.isInstalled()) throw new Error('MiniKit is not installed');
  const idArg = BigInt(gameId).toString();
  await MiniKit.commandsAsync.sendTransaction({
    transaction: [
      {
        address: TEST_CONTRACT,
        abi: testAbi as any,
        functionName: 'payoutTestGame',
        args: [idArg],
      },
    ],
  });
}
