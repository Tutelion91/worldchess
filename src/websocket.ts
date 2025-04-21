let socket: WebSocket | null = null;
let currentGameId: string | null = null;

const WS_URL = "ws://localhost:8080";

// baut bei Bedarf eine Verbindung auf
export function connectSocket() {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log("[WebSocket] verbunden");
    };
    socket.onclose = () => {
      console.log("[WebSocket] getrennt");
      socket = null;
    };
    socket.onerror = (err) => {
      console.error("[WebSocket] Fehler:", err);
    };
  }
}

// sendet eine Nachricht zuverlässig (öffnet ggf. neu)
export function sendMessage(message: any) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else if (socket?.readyState === WebSocket.CONNECTING) {
    socket.addEventListener(
      "open",
      () => {
        socket?.send(JSON.stringify(message));
      },
      { once: true }
    );
  } else {
    console.warn("[WebSocket] nicht offen → neu verbinden");
    connectSocket();
    socket?.addEventListener(
      "open",
      () => {
        socket?.send(JSON.stringify(message));
      },
      { once: true }
    );
  }
}

// registriert den Callback für eingehende Nachrichten
export function onMessage(callback: (data: any) => void) {
  if (!socket) return;
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      callback(data);
    } catch {
      console.error("[WebSocket] ungültige Nachricht", event.data);
    }
  };
}

// Spiel beitreten
export function connectToGame(gameId: string) {
  connectSocket();
  sendMessage({ type: "join", gameId });
  currentGameId = gameId;
}

// Spielzug senden
export function sendMove(move: any) {
  if (currentGameId) {
    sendMessage({ type: "move", gameId: currentGameId, move });
  }
}

// initial die Warteliste abfragen
export function requestWaitingGames() {
  sendMessage({ type: "get-waiting-games" });
}

