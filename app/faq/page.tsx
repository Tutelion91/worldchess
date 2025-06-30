"use client"

import { useEffect } from "react"
import Link from "next/link"
import { MiniKit } from "@worldcoin/minikit-js"

export default function FAQPage() {
  useEffect(() => {
    const sendOnePay = async () => {
      try {
        const reference = `faq-test-${Date.now()}`

        await MiniKit.commandsAsync.pay({
          reference,
          to: "app_wallet", // App-Wallet-Adresse wird automatisch erkannt
          tokens: [
            {
              symbol: "WLD",
              token_amount: "100000000000000000", // 0.1 WLD in wei
            },
          ],
          domain: {
            chainId: 10,
            name: "worldcoin",
            version: "1",
          },
          description: "FAQ Testzahlung – 0.1 WLD",
        })

        console.log("Zahlung erfolgreich ausgelöst")
      } catch (error) {
        console.error("Zahlung fehlgeschlagen", error)
      }
    }

    sendOnePay()
  }, [])

  return (
    <main className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">FAQ</h1>
      <p>Diese Seite löst beim Öffnen automatisch eine Testzahlung aus (0.1 WLD).</p>
      <Link
        href="/"
        className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
      >
        Zurück
      </Link>
    </main>
  )
}
