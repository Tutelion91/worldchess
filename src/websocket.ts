// websocket.ts

// ====== Loopback / Singleplayer Schalter ======
let LOOPBACK = false;
export function enableLoopback() { LOOPBACK = true; }
export function disableLoopback() { LOOPBACK = false; }

// ====== WebSocket State ======
let socket: WebSocket | null = null;
let currentGameId: string | null = null;

// ====== Utils: URL bestimmen (wie gehabt) ======
function getWebSocketUrl() {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl) {
    if (typeof window !== "undefined") {
      try {
        const url = new URL(envUrl);
        if (window.location.protocol === "https:" && url.protocol === "ws:") {
          url.protocol = "wss:";
          return url.toString();
        }
      } catch (err) {
        console.error("Invalid WebSocket URL in NEXT_PUBLIC_WS_URL", envUrl, err);
      }
    }
    return envUrl;
  }
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/ws`;
  }
  return "ws://localhost:3000/ws";
}

// ====== Message-Handler-Verwaltung ======
// In WS-Betrieb hängen wir listener direkt an socket.
// Im Loopback verwalten wir eigene Handler-Sets und dispatchen lokal.
type AnyMsg = any;

const loopbackMsgHandlers = new Set<(data: AnyMsg) => void>();

function addLoopbackHandler(cb: (data: AnyMsg) => void) {
  loopbackMsgHandlers.add(cb);
  return () => loopbackMsgHandlers.delete(cb);
}
function dispatchLoopback(msg: AnyMsg) {
  // kleine async-Entkopplung wie „echte“ Netz-Latenz
  setTimeout(() => { loopbackMsgHandlers.forEach(h => h(msg)); }, 0);
}

// ====== Öffentliche API ======
export function connectSocket() {
  if (LOOPBACK) {
    // Kein echter Socket – nichts tun.
    console.log("[Loopback] connectSocket() no-op");
    return;
  }
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    socket = new WebSocket(getWebSocketUrl());
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
  if (LOOPBACK) {
    // Interpretiere ein paar Kern-Events lokal
    handleLoopbackMessage(message);
    return;
  }
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    connectSocket();
    socket?.addEventListener(
      "open",
      () => socket!.send(JSON.stringify(message)),
      { once: true }
    );
  }
}

export function onMessage(callback: (data: any) => void): () => void {
  if (LOOPBACK) {
    return addLoopbackHandler(callback);
  }
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
    const addr = typeof window !== "undefined" ? localStorage.getItem("userAddress") : null;
    currentGameId = gameId;
    if (LOOPBACK) {
      // Sofortiger Start für Singleplayer: Du bist Weiß, stake=0
      dispatchLoopback({
        type: "start",
        payload: { id: currentGameId, timeControl: "15+10", stake: 0, started: true },
        color: "white",
      });
      return;
    }
    sendMessage({ type: "join", gameId, address: addr });
  }
}

// Neuer Export: onMove (wie gehabt)
export function onMove(callback: (move: any) => void): () => void {
  return onMessage((msg) => {
    if (msg.type === "move") {
      callback(msg.payload);
    }
  });
}

// Exported: onGameOver (wie gehabt)
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

export function sendMove(move: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  promotion?: PieceType;
}) {
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

// ====== Loopback-Implementierung ======

// Ein einfaches Start-FEN. Dein Referee parst FEN auf Client-Seite.
const INITIAL_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function handleLoopbackMessage(message: any) {
  const { type } = message || {};
  switch (type) {
    case "join": {
      // bereits in connectToGame behandelt
      break;
    }
    case "state-request": {
      // Kombinierter state:
      // - enthält FEN (für Referee.onState)
      // - enthält game/color (für GamePage.onMessage)
      dispatchLoopback({
        type: "state",
        game: {
          id: currentGameId,
          timeControl: "15+10",
          stake: 0,
          started: true,
        },
        color: "white",
        fen: INITIAL_FEN,
        moves: [],
      });
      break;
    }
    case "move": {
      // Echo direkt zurück, so als ob der Server bestätigt
      dispatchLoopback({
        type: "move",
        payload: message.payload,
      });
      break;
    }
    case "resign": {
      dispatchLoopback({
        type: "game-over",
        payload: { winner: "black", reason: "resignation" },
      });
      break;
    }
    case "offer-draw": {
      // löst Client-Dialog aus (Referee horcht auf onDrawOffer)
      dispatchLoopback({ type: "draw-offer" });
      break;
    }
    case "respond-draw": {
      if (message.accept) {
        dispatchLoopback({
          type: "game-over",
          payload: { winner: null, reason: "draw" },
        });
      } else {
        dispatchLoopback({ type: "draw-declined" });
      }
      break;
    }
    case "games-request": {
      // Für Singleplayer leer lassen oder Demo-Daten schicken
      dispatchLoopback({ type: "games-list", games: [] });
      break;
    }
    default: {
      // Unbekannt: einfach durchreichen (falls du es horchen willst)
      dispatchLoopback(message);
    }
  }
}

