import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const ABI = [
  "function markJoined(uint256 _gameId, address _player2) external",
  "function getGameInfo(uint256) view returns (address player1, address player2, uint256 stake, bool active, uint64 createdAt)",
];

function toId(gameId: string) {
  return gameId.startsWith("0x")
    ? BigInt(gameId)
    : BigInt(ethers.keccak256(ethers.toUtf8Bytes(gameId)));
}

export async function POST(req: NextRequest) {
  try {
    const { gameId, player2 } = await req.json();
    if (!gameId) {
      return NextResponse.json({ success: false, error: "invalid gameId" }, { status: 400 });
    }
    if (!player2 || !ethers.isAddress(player2)) {
      return NextResponse.json({ success: false, error: "invalid player2" }, { status: 400 });
    }
    const provider = new ethers.JsonRpcProvider(process.env.WORLDCHAIN_RPC_URL!);
    const signer = new ethers.Wallet(process.env.SETTLER_PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(process.env.ESCROW_ADDRESS!, ABI, signer);

    const id = toId(String(gameId));

    const [p1, p2Current, , active] = await contract.getGameInfo(id);

    if (!active) {
      return NextResponse.json({ success: false, error: "game not active" }, { status: 400 });
    }
    if (p2Current !== ethers.ZeroAddress) {
      return NextResponse.json({ success: false, error: "already joined" }, { status: 400 });
    }
    if (p1.toLowerCase() === player2.toLowerCase()) {
      return NextResponse.json({ success: false, error: "player2 same as player1" }, { status: 400 });
    }

    const tx = await contract.markJoined(id, player2);
    const rc = await tx.wait();
    return NextResponse.json({ success: true, txHash: rc?.hash ?? tx.hash });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? "error" }, { status: 500 });
  }
}

