// app/api/game-info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

// Nur die View-Funktion aus deinem Escrow
const ESCROW_ABI = [
  "function getGameInfo(uint256) view returns (address player1, address player2, uint256 stake, bool active, uint64 createdAt)"
];

const RPC = process.env.WORLDCHAIN_RPC_URL!;
const ESCROW = process.env.ESCROW_ADDRESS!;
const provider = new ethers.JsonRpcProvider(RPC);
const contract = new ethers.Contract(ESCROW, ESCROW_ABI, provider);

// Deine String-GameID -> uint256 (keccak256)
function toGameId(id: string): bigint {
  return BigInt(ethers.keccak256(ethers.toUtf8Bytes(id)));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  try {
    const gameId = toGameId(id);
    const info = await contract.getGameInfo(gameId);
    const player1: string = info.player1;
    const player2: string = info.player2;
    const stake = info.stake as bigint;       // uint256 -> bigint (ethers v6)
    const active: boolean = info.active;
    const createdAt = info.createdAt as bigint; // uint64 -> bigint

    return NextResponse.json({
      id,                          // deine String-ID
      gameIdHex: "0x" + gameId.toString(16), // lesbar
      onchain: {
        player1,
        player2,
        stakeWei: stake.toString(),          // <-- kein bigint in JSON
        stakeWLD: ethers.formatUnits(stake, 18),
        active,
        createdAt: Number(createdAt),        // Sekunden (Number reicht hier)
        createdAtISO: new Date(Number(createdAt) * 1000).toISOString()
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}

