"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MiniKit } from "@worldcoin/minikit-js"
import { payoutWLD } from "@/lib/payoutWld"
import { createTestGame, settleTestGame } from "@/lib/testGame"

export default function FAQPage() {
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [loadingAddress, setLoadingAddress] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [testGameId, setTestGameId] = useState<string | null>(null)
  const [txLoading, setTxLoading] = useState(false)

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        if (typeof window !== "undefined") {
          if (localStorage.getItem("worldIdVerified") === "true") {
            setIsVerified(true)
          }
          if (localStorage.getItem("wldPayoutDone") === "true") {
            setClaimed(true)
          }
        }

        const info = await MiniKit.getUserInfo()
        if ((info as any).wallet_address) {
          setUserAddress((info as any).wallet_address)
        } else if ((info as any).walletAddress) {
          setUserAddress((info as any).walletAddress)
        }
      } catch (err) {
        console.error("Nutzerinfo konnte nicht geladen werden", err)
      } finally {
        setLoadingAddress(false)
      }
    }

    fetchAddress()
  }, [])

  const handlePayout = async () => {
    if (!userAddress) return
    setError(null)
    try {
      await payoutWLD(userAddress)
      setClaimed(true)
      setSuccess(true)
      if (typeof window !== "undefined") {
        localStorage.setItem("wldPayoutDone", "true")
      }
    } catch (err: any) {
      console.error("Auszahlung fehlgeschlagen", err)
      setError(err.message || "Transaktion abgelehnt")
    }
  }

  const handleCreateTestGame = async () => {
    if (!isVerified) {
      setError('Bitte verifiziere dich über World ID.')
      return
    }
    setTxLoading(true)
    try {
      const id = crypto.randomUUID().replace(/-/g, '')
      await createTestGame(id)
      setTestGameId(id)
      setSuccess(true)
    } catch (e: any) {
      setError(e.message ?? 'Transaktion abgelehnt')
    } finally {
      setTxLoading(false)
    }
  }

  const handleSettleTestGame = async () => {
    if (!testGameId) {
      setError('Es wurde noch kein Testspiel erstellt.')
      return
    }
    setTxLoading(true)
    try {
      await settleTestGame(testGameId)
      setSuccess(true)
    } catch (e: any) {
      setError(e.message ?? 'Transaktion abgelehnt oder kein Besitzer')
    } finally {
      setTxLoading(false)
    }
  }

  return (
    <main className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">FAQ</h1>
      {loadingAddress ? (
        <p>Lade Nutzeradresse...</p>
      ) : (
        <>
          <button
            disabled={!isVerified || claimed || !userAddress}
            onClick={handlePayout}
            className="mb-4 px-6 py-2 bg-green-600 rounded disabled:opacity-50"
          >
            0.1 WLD Preisgeld abholen
          </button>
          <button
            onClick={handleCreateTestGame}
            disabled={txLoading || !isVerified}
            className="mr-2 mb-4 px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
          >
            Testspiel erstellen (0.2 WLD)
          </button>
          <button
            onClick={handleSettleTestGame}
            disabled={txLoading || !isVerified || !testGameId}
            className="mb-4 px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-50"
          >
            Testspiel auszahlen
          </button>
          {success && <p className="text-green-400 mb-2">Auszahlung erfolgreich!</p>}
          {error && <p className="text-red-400 mb-2">{error}</p>}
          {!isVerified && <p>Bitte einloggen oder verifizieren.</p>}
          {!userAddress && !error && <p>Nutzeradresse konnte nicht geladen werden.</p>}
        </>
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
