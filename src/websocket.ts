let socket: WebSocket | null = null;
let currentGameId: string | null = null;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

export function connectSocket() {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    socket = new WebSocket(WS_URL);
    console.log("Connecting to WebSocket...");
    socket.onopen = () => {
      console.log("[WebSocket] verbunden");
      if (currentGameId) {
        sendMessage({ type: "state-request", gameId: currentGameId });
      }
    };
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
  return () => socket?.removeEventListener("message", handler);
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

// Exported: onGameOver
export function onGameOver(
  callback: (result: { winner: string | null; reason: string }) => void
): () => void {
  return onMessage((msg) => {
    if (msg.type === "game-over") {
      callback(msg.payload);
    }
  });
}

export function onState(callback: (state: any) => void): () => void {
  return onMessage((msg) => {
    if (msg.type === "state") {
      callback(msg);
    }
  });
}

/**
 * Register a callback for error messages coming from the server.
 * Errors can occur for various reasons such as invalid moves or
 * trying to play out of turn.
 */
export function onError(callback: (msg: any) => void): () => void {
  return onMessage((msg) => {
    if (msg.type === "error") {
      callback(msg);
    }
  });
}

// Neuer Export: sendMove
import { PieceType } from "./Types";
import { pieceTypeToSymbol } from "./utils/pieceSymbols";

export function sendMove(move: { from: { x: number; y: number }; to: { x: number; y: number }; promotion?: PieceType }) {
  if (!currentGameId) return;
  const payload = {
    from: move.from,
    to: move.to,
    promotion: move.promotion ? pieceTypeToSymbol(move.promotion) : undefined,
  };
  sendMessage({ type: "move", gameId: currentGameId, payload });
}

export function sendResign(gameId: string) {
  sendMessage({ type: "resign", gameId });
}

export function sendOfferDraw(gameId: string) {
  sendMessage({ type: "offer-draw", gameId });
}

export function respondDraw(gameId: string, accept: boolean) {
  sendMessage({ type: "respond-draw", gameId, accept });
}

export function requestState(gameId: string) {
  sendMessage({ type: "state-request", gameId });
}

export function requestGames() {
  sendMessage({ type: "games-request" });
}

export function onGamesList(callback: (games: any[]) => void): () => void {
  return onMessage(msg => {
    if (msg.type === "games-list") {
      callback(msg.games);
    }
  });
}


export function onDrawOffer(callback: () => void): () => void {
  return onMessage(msg => {
    if (msg.type === "draw-offer") {
      callback();
    }
  });
}

export function onDrawDeclined(callback: () => void): () => void {
  return onMessage(msg => {
    if (msg.type === "draw-declined") {
      callback();
    }
  });
}
