let socket: WebSocket | null = null;
let currentGameId: string | null = null;

const WS_URL = "ws://localhost:8080";

// baut bei Bedarf eine Verbindung auf
export function connectSocket() {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    socket = new WebSocket(WS_URL);
    console.log("Connecting to WebSocket..."); // Hinzugefügt

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
  console.log("sendMessage called with message:", message); // Hinzugefügt
  if (socket?.readyState === WebSocket.OPEN) {
    console.log("WebSocket is open, sending message:", message); // Hinzugefügt
    socket.send(JSON.stringify(message));
  } else if (socket?.readyState === WebSocket.CONNECTING) {
    console.log("WebSocket is connecting, adding event listener for open event"); // Hinzugefügt
    socket.addEventListener(
      "open",
      () => {
        console.log("WebSocket is open, sending message:", message); // Hinzugefügt
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
        console.log("WebSocket is open after reconnect, sending message:", message); // Hinzugefügt
        socket?.send(JSON.stringify(message));
      },
      { once: true }
    );
  }
}

// registriert den Callback für eingehende Nachrichten
export function onMessage(callback: (data: any) => void): () => void {
  if (!socket) return () => {};

  const handler = (event: MessageEvent) => {
    let data: any;
    try {
      data = JSON.parse(event.data);
      console.log("Received WebSocket message:", data); // Hinzugefügt
    } catch {
      console.error("[WebSocket] Ungültige Nachricht:", event.data);
      return;
    }
    callback(data);
  };

  socket.addEventListener("message", handler);
  return () => {
    socket.removeEventListener("message", handler);
  };
}

// Spiel beitreten
export function connectToGame(gameId: string) {
  console.log("connectToGame called with gameId:", gameId); // Hinzugefügt
  connectSocket();
  sendMessage({ type: "join", gameId });
  currentGameId = gameId;
}

// Spielzug senden
export function sendMove(move: any) {
  if (currentGameId) {
    console.log("Sending move:", move, "for gameId:", currentGameId); // Hinzugefügt
    sendMessage({ type: "move", gameId: currentGameId, move });
  }
}

// initial die Warteliste abfragen
export function requestWaitingGames() {
  console.log("requestWaitingGames called"); // Hinzugefügt
  sendMessage({ type: "get-waiting-games" });
}
export function setGameId(gameId: string) {
  currentGameId = gameId;
}
export function onMove(callback: (move: any) => void): () => void {
  // wir nutzen onMessage und filtern nur move-Events heraus
  return onMessage(data => {
    if (data.type === "move") {
      callback(data.move);
    }
  });
}
