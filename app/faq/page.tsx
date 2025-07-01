"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MiniKit } from "@worldcoin/minikit-js"
import WLD_ABI from "../WLD_ABI.json"

const WLD_TOKEN_ADDRESS = "0x4C34d508C19562f5020b7b6209aA3Ac1E0188c10"

async function payoutUser(address: string) {
  try {
    const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
      transaction: [
        {
          address: WLD_TOKEN_ADDRESS,
          abi: WLD_ABI as any,
          functionName: "transfer",
          args: [address, "100000000000000000"],
        },
      ],
    })

    console.log("Transaktionstatus:", (finalPayload as any).status)
  } catch (error) {
    console.error("Auszahlung fehlgeschlagen", error)
  }
}

export default function FAQPage() {
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [loadingAddress, setLoadingAddress] = useState(true)

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const info = await MiniKit.getUserInfo()
        if (info.walletAddress) {
          setUserAddress(info.walletAddress)
        }
      } catch (err) {
        console.error("Nutzerinfo konnte nicht geladen werden", err)
      } finally {
        setLoadingAddress(false)
      }
    }

    fetchAddress()
  }, [])

  return (
    <main className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">FAQ</h1>
      {loadingAddress ? (
        <p>Lade Nutzeradresse...</p>
      ) : userAddress ? (
        <button
          onClick={() => payoutUser(userAddress)}
          className="mb-4 px-6 py-3 bg-green-600 hover:bg-green-700 rounded text-white font-semibold"
        >
          0.1 WLD Test-Auszahlung starten
        </button>
      ) : (
        <p>Bitte einloggen oder verifizieren.</p>
      )}
      <Link
        href="/"
        className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
      >
        Zurück
      </Link>
    </main>
  )
}
