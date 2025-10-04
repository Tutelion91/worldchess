import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const ABI = [
  "function createGameRecord(uint256 _gameId, address _player1, uint256 _stake) external",
];

function toId(gameId: string) {
  // Freitext → uint256 (keccak256). Hex erlaubt: 0x... wird direkt genommen.
  return gameId.startsWith("0x")
    ? BigInt(gameId)
    : BigInt(ethers.keccak256(ethers.toUtf8Bytes(gameId)));
}

export async function POST(req: NextRequest) {
  try {
    const { gameId, stakeWLD, player1 } = await req.json();

    const provider = new ethers.JsonRpcProvider(process.env.WORLDCHAIN_RPC_URL!);
    const signer = new ethers.Wallet(process.env.SETTLER_PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(process.env.ESCROW_ADDRESS!, ABI, signer);

    const stakeWei = ethers.parseUnits(String(stakeWLD), 18);
    const id = toId(String(gameId));

    const tx = await contract.createGameRecord(id, player1, stakeWei);
    const rc = await tx.wait();
    return NextResponse.json({ success: true, txHash: rc?.hash ?? tx.hash });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? "error" }, { status: 500 });
  }
}

