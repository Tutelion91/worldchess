import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-900 text-white space-y-10">
      {/* Rotierende Weltkugel */}
      <div
        className="w-48 h-48 rounded-full bg-cover bg-center shadow-inner"
        style={{
          backgroundImage: "url('/world-map.jpg')",
        }}
      ></div>

      {/* Buttons */}
      <div className="flex flex-col items-center space-y-4">
        <Link
          href="/faq"
          className="block w-64 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-3 px-6 rounded-lg text-center shadow-md hover:shadow-lg border border-blue-400"
        >
          FAQ
        </Link>
        <Link
          href="/create-game"
          className="block w-64 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-3 px-6 rounded-lg text-center shadow-md hover:shadow-lg border border-blue-400"
        >
          Spiel erstellen
        </Link>
        <Link
          href="/waiting-games"
          className="block w-64 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-3 px-6 rounded-lg text-center shadow-md hover:shadow-lg border border-blue-400"
        >
          Wartende Spiele
        </Link>
        <Link
        href="/singleplayer"
        className="block w-64 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold py-3 px-6 rounded-lg text-center"
      >
        Einzelspiel starten
      </Link>
      </div>
    </div>
  );
}

