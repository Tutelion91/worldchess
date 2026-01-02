"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { connectToGame, onMessage } from "@/websocket";
import Link from "next/link";
import { MiniKit } from "@worldcoin/minikit-js";

export default function WaitingRoom() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const hasJoinedRef = useRef(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [status, setStatus] = useState("Prüfe Zahlungsstatus …");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("userAddress") : null;
    if (stored) {
      setUserAddress(stored);
    }
    (async () => {
      try {
        const info = await MiniKit.getUserInfo();
        const addr = (info as any)?.wallet_address || (info as any)?.walletAddress;
        if (addr) {
          localStorage.setItem("userAddress", addr);
          setUserAddress(addr);
        }
      } catch (err) {
        console.error("[waiting-room] wallet lookup failed", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!id || !userAddress || hasJoinedRef.current) return;

    const verifyAndJoin = async () => {
      // Prüfe, ob der Stake lokal bereits als gezahlt markiert ist (nur als Optimierung genutzt)
      const localFlag =
        typeof window !== "undefined" &&
        localStorage.getItem(`escrowJoined-${id}`) === "true";

      setStatus(localFlag ? "Stake lokal bestätigt. Prüfe Escrow-Join …" : "Prüfe Escrow-Join …");

      let player1: string | undefined;
      let player2: string | undefined;

      try {
        const res = await fetch(`/api/game-info?id=${id}`);
        if (!res.ok) {
          console.warn("[waiting-room] game-info response not ok", res.status);
          setError("Spielinformationen konnten nicht geladen werden.");
          setStatus("Beitritt nicht bestätigt.");
          return;
        }
        const data = await res.json();
        player1 = data?.onchain?.player1 as string | undefined;
        player2 = data?.onchain?.player2 as string | undefined;
      } catch (err) {
        console.error("[waiting-room] game-info fetch failed", err);
        setError("Spielinformationen konnten nicht geladen werden.");
        setStatus("Beitritt nicht bestätigt.");
        return;
      }

      const addr = userAddress?.toLowerCase();
      const isHost = player1 && addr && player1.toLowerCase() === addr;
      const isJoiner = player2 && addr && player2.toLowerCase() === addr;

      if (isHost) {
        if (typeof window !== "undefined") {
          localStorage.setItem(`escrowJoined-${id}`, "true");
        }
        hasJoinedRef.current = true;
        setStatus("Warte auf Gegner …");
        connectToGame(id);
        return;
      }

      if (isJoiner) {
        if (typeof window !== "undefined") {
          localStorage.setItem(`escrowJoined-${id}`, "true");
        }
        hasJoinedRef.current = true;
        setStatus("Stake bestätigt. Verbinde …");
        connectToGame(id);
        return;
      }

      setError("Du bist nicht für dieses Spiel registriert.");
      setStatus("Beitritt nicht bestätigt.");
    };

    verifyAndJoin();
  }, [id, userAddress]);

  useEffect(() => {
    const off = onMessage((msg) => {
      if (msg.type === "start") {
        if (msg.color) {
          localStorage.setItem("worldchess-color", msg.color);
        }
        router.push(`/game/${id}`);
      }
      if (msg.type === "error") {
        console.error("Join-Error:", msg.message);
      }
    });
    return () => off();
  }, [id, router]);

  return (
    <div className="min-h-screen bg-blue-900 text-white flex flex-col items-center justify-center space-y-4">
      <p>{status}</p>
      {error && <p className="text-red-300">{error}</p>}
      <Link
        href="/"
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
      >
        Zurück
      </Link>
    </div>
  );
}
