import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const ABI = [
  "function getGameInfo(uint256) view returns (address player1, address player2, uint256 stake, bool active, uint64 createdAt)",
  "function settleGame(uint256 _gameId, address winner) external",
];

function toId(gameId: string) {
  return gameId.startsWith("0x")
    ? BigInt(gameId)
    : BigInt(ethers.keccak256(ethers.toUtf8Bytes(gameId)));
}

export async function POST(req: NextRequest) {
  try {
    const { gameId, winner } = await req.json(); // winner: 'p1' | 'p2'

    const provider = new ethers.JsonRpcProvider(process.env.WORLDCHAIN_RPC_URL!);
    const signer = new ethers.Wallet(process.env.SETTLER_PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(process.env.ESCROW_ADDRESS!, ABI, signer);

    const id = toId(String(gameId));

    const [p1, p2] = await contract.getGameInfo(id);
    const winnerAddr = winner === "p1" ? p1 : p2;

    const tx = await contract.settleGame(id, winnerAddr);
    const rc = await tx.wait();
    return NextResponse.json({ success: true, txHash: rc?.hash ?? tx.hash });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? "error" }, { status: 500 });
  }
}

