import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const ABI = [
  "function settleDraw(uint256 _gameId) external",
];

function toId(gameId: string) {
  return gameId.startsWith("0x")
    ? BigInt(gameId)
    : BigInt(ethers.keccak256(ethers.toUtf8Bytes(gameId)));
}

export async function POST(req: NextRequest) {
  try {
    const { gameId } = await req.json();

    const provider = new ethers.JsonRpcProvider(process.env.WORLDCHAIN_RPC_URL!);
    const signer = new ethers.Wallet(process.env.SETTLER_PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(process.env.ESCROW_ADDRESS!, ABI, signer);

    const id = toId(String(gameId));

    const tx = await contract.settleDraw(id);
    const rc = await tx.wait();
    return NextResponse.json({ success: true, txHash: rc?.hash ?? tx.hash });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? "error" }, { status: 500 });
  }
}

