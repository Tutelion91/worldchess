let socket: WebSocket | null = null;

export function connectToGame(gameId: string, onMove: (move: string) => void) {
  socket = new WebSocket("ws://localhost:3001");

  socket.onopen = () => {
    socket?.send(JSON.stringify({ type: "join", gameId }));
    console.log("[WS] Connected to game:", gameId);
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "move") {
      console.log("[WS] Incoming move:", message.data);
      onMove(message.data); // z. B. "e2e4"
    }
  };

  socket.onclose = () => {
    console.log("[WS] Disconnected");
  };

  socket.onerror = (err) => {
    console.error("[WS] Error", err);
  };
}

export function sendMove(move: string) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "move", gameId: currentGameId, data: move }));
  }
}

// Optional: Für spätere Aufräumarbeiten
export function disconnect() {
  if (socket) socket.close();
}

// Wird von außen gesetzt
let currentGameId = "";

export function setGameId(id: string) {
  currentGameId = id;
}

