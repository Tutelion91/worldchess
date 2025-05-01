let socket: WebSocket | null = null;
let currentGameId: string | null = null;
const WS_URL = "ws://localhost:8080";

export function connectSocket() {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    socket = new WebSocket(WS_URL);
    console.log("Connecting to WebSocket...");
    socket.onopen = () => console.log("[WebSocket] verbunden");
    socket.onclose = () => {
      console.log("[WebSocket] getrennt");
      socket = null;
    };
    socket.onerror = (err) => console.error("[WebSocket] Fehler:", err);
  }
}

export function sendMessage(message: any) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    connectSocket();
    socket?.addEventListener("open", () => socket!.send(JSON.stringify(message)), { once: true });
  }
}

export function onMessage(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  const handler = (e: MessageEvent) => {
    const data = JSON.parse(e.data);
    callback(data);
  };
  socket.addEventListener("message", handler);
  return () => socket.removeEventListener("message", handler);
}

export function connectToGame(gameId: string) {
  if (currentGameId !== gameId) {
    sendMessage({ type: "join", gameId });
    currentGameId = gameId;
  }
}

// Neuer Export: onMove
export function onMove(callback: (move: any) => void): () => void {
  return onMessage((msg) => {
    if (msg.type === "move") {
      callback(msg.payload);
    }
  });
}

// Neuer Export: sendMove
export function sendMove(move: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  if (!currentGameId) return;
  sendMessage({ type: "move", gameId: currentGameId, payload: move });
}

