let socket: WebSocket;
let currentGameId: string | null = null;

// Direkt verbinden beim Import
if (typeof window !== "undefined") {
  socket = new WebSocket("ws://localhost:3001");

  socket.onopen = () => {
    console.log("[WebSocket] Verbindung hergestellt");
  };

  socket.onclose = () => {
    console.log("[WebSocket] Verbindung geschlossen");
  };

  socket.onerror = (error) => {
    console.error("[WebSocket] Fehler:", error);
  };
}

// Nachrichten senden
export function sendMessage(message: any) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else if (socket?.readyState === WebSocket.CONNECTING) {
    console.log("Socket verbindet noch... Sende nach 'open'");
    socket.addEventListener("open", () => {
      socket?.send(JSON.stringify(message));
    }, { once: true });
  } else {
    console.error("WebSocket ist nicht offen oder wurde geschlossen!");
  }
}

// Nachrichten empfangen
export function onMessage(callback: (data: any) => void) {
  if (!socket) return;

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      callback(message);
    } catch (err) {
      console.error("Fehler beim Verarbeiten der Nachricht:", err);
    }
  };
}

// Multiplayer: Spiel beitreten
export function connectToGame(gameId: string) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "join", gameId }));
    currentGameId = gameId;
  } else {
    console.error("Socket nicht verbunden für Spielbeitritt.");
  }
}

// Multiplayer: Zug senden
export function sendMove(move: any) {
  if (socket && currentGameId) {
    socket.send(JSON.stringify({ type: "move", gameId: currentGameId, move }));
  }
}

// Multiplayer: Spiel-ID setzen
export function setGameId(id: string) {
  currentGameId = id;
}

