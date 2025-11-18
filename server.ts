import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import type { RawData } from "ws";
import { Chess } from "chess.js";
import fs from "fs";
import path from "path";
import http from "http";
import next from "next";
import { ethers } from "ethers";

const PORT = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

// Set up logging
const LOG_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

const RESULTS_LOG = path.join(LOG_DIR, "results.csv");
if (!fs.existsSync(RESULTS_LOG)) {
  fs.writeFileSync(
    RESULTS_LOG,
    "gameId,whitePlayer,blackPlayer,stake,result,timestamp\n"
  );
}

const ESCROW_ABI = [
  "function cancelGame(uint256 _gameId) external",
  "function settleGame(uint256 _gameId, address winner) external",
  "function settleDraw(uint256 _gameId) external",
];


function toGameId(gameId: string): bigint {
  return gameId.startsWith("0x")
    ? BigInt(gameId)
    : BigInt(ethers.keccak256(ethers.toUtf8Bytes(gameId)));
}

async function cancelGameOnChain(idString: string) {
  const rpcUrl = process.env.WORLDCHAIN_RPC_URL;
  const privateKey = process.env.SETTLER_PRIVATE_KEY;
  const escrowAddress = process.env.ESCROW_ADDRESS;

  if (!rpcUrl || !privateKey || !escrowAddress) {
    throw new Error("Missing WORLDCHAIN_RPC_URL, SETTLER_PRIVATE_KEY or ESCROW_ADDRESS env variable");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(escrowAddress, ESCROW_ABI, signer);
  const gameId = toGameId(idString);
  const tx = await contract.cancelGame(gameId);
  await tx.wait();
}

async function settleGameOnChain(idString: string, winnerAddr: string) {
  const rpcUrl = process.env.WORLDCHAIN_RPC_URL;
  const privateKey = process.env.SETTLER_PRIVATE_KEY;
  const escrowAddress = process.env.ESCROW_ADDRESS;

  if (!rpcUrl || !privateKey || !escrowAddress) {
    throw new Error("Missing WORLDCHAIN_RPC_URL, SETTLER_PRIVATE_KEY or ESCROW_ADDRESS env variable");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(escrowAddress, ESCROW_ABI, signer);
  const gameId = toGameId(idString);
  const tx = await contract.settleGame(gameId, winnerAddr);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

async function settleDrawOnChain(idString: string) {
  const rpcUrl = process.env.WORLDCHAIN_RPC_URL;
  const privateKey = process.env.SETTLER_PRIVATE_KEY;
  const escrowAddress = process.env.ESCROW_ADDRESS;

  if (!rpcUrl || !privateKey || !escrowAddress) {
    throw new Error("Missing WORLDCHAIN_RPC_URL, SETTLER_PRIVATE_KEY or ESCROW_ADDRESS env variable");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(escrowAddress, ESCROW_ABI, signer);
  const gameId = toGameId(idString);
  const tx = await contract.settleDraw(gameId);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

function logMove(gameId: string, message: string) {
  fs.appendFile(path.join(LOG_DIR, `${gameId}.log`), message + "\n", err => {
    if (err) {
      console.error("Failed to write log", err);
    }
  });
}

function logGameResult(
  gameId: string,
  whitePlayer: string,
  blackPlayer: string,
  stake: number,
  result: string
) {
  const timestamp = new Date().toISOString();
  const row = `${gameId},${whitePlayer},${blackPlayer},${stake},${result},${timestamp}\n`;
  fs.appendFile(RESULTS_LOG, row, err => {
    if (err) {
      console.error("Failed to log game result", err);
    }
  });
}

nextApp.prepare().then(() => {
  const app = express();
  app.use(cors());
  // app.use(express.json()); // NICHT verwenden (Next Response-Objekt)

  // In-Memory Speicher für offene Spiele
  type PlayerKey = 'player1' | 'player2';

  interface Game {
    id: string;
    players: WebSocket[];
    timeControl: string;
    stake: number;
    started: boolean;
    finished?: boolean;
    board: Chess;
    moves: Array<{
      from: { x: number; y: number };
      to: { x: number; y: number };
      promotion?: string;
    }>;
    player1Address?: string;
    player2Address?: string;
    white?: PlayerKey;
    black?: PlayerKey;
  }
  const games: Record<string, Game> = {};
  // Mapping from websocket connections to the assigned player color
  const playerColors = new Map<WebSocket, 'white' | 'black'>();

  type GameResult = { winner: 'white' | 'black' | null; reason: string };

  function getAddressForPlayer(game: Game, playerKey?: PlayerKey): string | undefined {
    if (playerKey === 'player1') {
      return game.player1Address;
    }
    if (playerKey === 'player2') {
      return game.player2Address;
    }
    return undefined;
  }

  function getAddressForColor(game: Game, color: 'white' | 'black'): string | undefined {
    const playerKey = color === 'white' ? game.white : game.black;
    return getAddressForPlayer(game, playerKey);
  }

  function broadcastGameOver(game: Game, result: GameResult) {
    game.players.forEach(player => {
      if (player.readyState === WebSocket.OPEN) {
        player.send(
          JSON.stringify({
            type: "game-over",
            payload: result,
          })
        );
      }
    });
  }

  function broadcastSettlementComplete(
    game: Game,
    payload: { success: boolean; txHash?: string; error?: string; winner: 'white' | 'black' | null }
  ) {
    const message = JSON.stringify({
      type: "settlement-complete",
      payload: { ...payload, gameId: game.id },
    });
    game.players.forEach(player => {
      if (player.readyState === WebSocket.OPEN) {
        player.send(message);
      }
    });
  }

  async function triggerSettlement(game: Game, result: GameResult) {
    try {
      let txHash: string | undefined;
      if (result.winner) {
        const winnerAddr = getAddressForColor(game, result.winner);
        if (!winnerAddr) {
          throw new Error(
            `Missing ${result.winner} address for game ${game.id}`
          );
        }
        txHash = await settleGameOnChain(game.id, winnerAddr);
      } else {
        txHash = await settleDrawOnChain(game.id);
      }
      broadcastSettlementComplete(game, {
        success: true,
        txHash,
        winner: result.winner,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Settlement failed";
      console.error(`Settlement for game ${game.id} failed:`, err);
      broadcastSettlementComplete(game, {
        success: false,
        error: message,
        winner: result.winner,
      });
    }
  }

  async function finalizeGame(game: Game, result: GameResult) {
    if (game.finished) {
      return;
    }
    game.finished = true;
    broadcastGameOver(game, result);
    const resultText =
      result.winner !== null ? `${result.winner} wins by ${result.reason}` : result.reason;
    logGameResult(
      game.id,
      getAddressForColor(game, 'white') || "unknown",
      getAddressForColor(game, 'black') || "unknown",
      game.stake,
      resultText
    );
    await triggerSettlement(game, result);
  }

  function safeFinalizeGame(game: Game, result: GameResult) {
    finalizeGame(game, result).catch(err => {
      console.error(`Failed to finalize game ${game.id}:`, err);
    });
  }

  function coordsToAlgebraic(x: number, y: number): string {
    const files = "abcdefgh";
    if (x < 0 || x > 7 || y < 0 || y > 7) {
      throw new Error(`Invalid coordinates: (${x}, ${y})`);
    }
    return `${files[x]}${y + 1}`;
  }

  function algebraicToCoords(square: string): { x: number; y: number } {
    const files = "abcdefgh";
    if (!/^([a-h][1-8])$/.test(square)) {
      throw new Error(`Invalid square: ${square}`);
    }
    const x = files.indexOf(square[0]);
    const y = parseInt(square[1], 10) - 1;
    return { x, y };
  }

  // HTTP-Endpoint: Liste offener Spiele (weniger als 2 Spieler)
  app.get("/games", (req: Request, res: Response, _next: NextFunction) => {
    console.log(
      "GET /games → Spieler pro Spiel:",
      Object.values(games).map(g => ({ id: g.id, playersCount: g.players.length }))
    );
    const openGames = Object.values(games).filter(
      g => !g.started && g.players.length < 2
    );
    res.json(openGames);
  });

  // HTTP-Endpoint: Einzelnes Spiel (auch gestartete)
  app.get("/games/:id", (req: Request, res: Response, _next: NextFunction) => {
    const game = games[req.params.id];
    if (!game) {
      res.status(404).json({ error: "Spiel nicht gefunden" });
      return;
    }
    res.json({
      id: game.id,
      players: game.players.length,
      timeControl: game.timeControl,
      stake: game.stake,
      started: game.started
    });
  });

  // Create HTTP and WebSocket servers on the same port
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const waitingClients = new Set<WebSocket>();
  const upgrade = nextApp.getUpgradeHandler();

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, ws => {
        wss.emit('connection', ws, req);
      });
    } else {
      upgrade(req, socket, head);
    }
  });

  server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
  });
  console.log(`WebSocket Server läuft auf ws://localhost:${PORT}`);

  // Alle übrigen HTTP-Requests an Next.js
  app.use((req, res) => handle(req, res));

  // ==========================
  //  WEBSOCKET HANDLER (FIX)
  // ==========================
  wss.on("connection", (ws) => {
    console.log("WebSocket: Ein Client verbunden");

    ws.on("message", (message: RawData) => {
      let data: any;
      try {
        data = JSON.parse(message.toString());
      } catch {
        return console.error("Ungültiges JSON:", message);
      }

      if (data.type === "state-request") {
        const game = games[data.gameId];
        if (game) {
          if (game.moves.length && typeof (game.moves[0] as any).from === "string") {
            game.moves = (game.moves as any).map((m: any) => ({
              from: algebraicToCoords(m.from),
              to: algebraicToCoords(m.to),
              promotion: m.promotion,
            }));
          }
          ws.send(
            JSON.stringify({
              type: "state",
              fen: game.board.fen(),
              moves: game.moves,
            })
          );
        } else {
          ws.send(JSON.stringify({ type: "error", message: "Spiel nicht gefunden" }));
        }
        return;
      }

      // Aktuelle Liste offener Spiele anfordern
      if (data.type === "games-request") {
        waitingClients.add(ws);
        const openGames = Object.values(games)
          .filter(g => !g.started && g.players.length < 2)
          .map(g => ({ id: g.id, timeControl: g.timeControl, stake: g.stake }));
        ws.send(JSON.stringify({ type: "games-list", games: openGames }));
        return;
      }

      // Neues Spiel anlegen
      if (data.type === "new-game") {
        const { id, timeControl, stake, hostAddress } = data.payload;
        games[id] = {
          id,
          timeControl,
          stake,
          players: [ws],
          started: false,
          finished: false,
          board: new Chess(),
          moves: [],
          player1Address: hostAddress,
        };
        // Create log file for this game
        try {
          fs.writeFileSync(path.join(LOG_DIR, `${id}.log`), "");
        } catch (err) {
          console.error("Failed to create log file", err);
        }
        ws.send(JSON.stringify({ type: "new-game-ack", gameId: id }));
        waitingClients.delete(ws);
        waitingClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "new-game", payload: { id, timeControl, stake } }));
          }
        });
      }

      // Spieler beitreten (sicherstellen, dass ein Client nur einmal hinzugefügt wird)
      if (data.type === "join") {
        const game = games[data.gameId];
        if (!game) {
          ws.send(JSON.stringify({ type: "error", message: "Spiel nicht gefunden" }));
          return;
        }
        // Füge Client nur hinzu, wenn noch nicht enthalten
        if (!game.players.includes(ws)) {
          if (game.players.length >= 2) {
            ws.send(JSON.stringify({ type: "error", message: "Raum voll" }));
            return;
          }
          game.players.push(ws);
          game.player2Address = data.address;
        }
        waitingClients.delete(ws);
        // Starte Spiel erst, wenn genau 2 unterschiedliche Clients verbunden sind
        if (!game.started && game.players.length === 2) {
          game.started = true;
          const colors = ['white','black'] as Array<'white'|'black'>;
          colors.sort(() => Math.random() - 0.5);
          game.players.forEach((player, idx) => {
            const color = colors[idx];
            playerColors.set(player, color);
            const playerKey: PlayerKey = idx === 0 ? 'player1' : 'player2';
            if (color === 'white') {
              game.white = playerKey;
            } else {
              game.black = playerKey;
            }
            player.send(
              JSON.stringify({
                type: "start",
                payload: {
                  id: game.id,
                  timeControl: game.timeControl,
                  stake: game.stake,
                  started: true
                },
                color,
                fen: game.board.fen()
              })
            );
          });
          // Broadcast an alle Sessions: Spiel gestartet
          waitingClients.delete(ws);
          waitingClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "game-started", gameId: data.gameId }));
            }
          });
        }
      }

      // Aufgabe eines Spielers
      if (data.type === "resign") {
        const game = games[data.gameId];
        if (game) {
          if (game.finished) {
            ws.send(JSON.stringify({ type: "error", message: "Game already finished" }));
            return;
          }
          const resigningColor = playerColors.get(ws);
          if (!resigningColor) {
            ws.send(JSON.stringify({ type: "error", message: "Cannot determine resigning player" }));
            return;
          }
          const winner: 'white' | 'black' = resigningColor === "white" ? "black" : "white";
          safeFinalizeGame(game, { winner, reason: "resignation" });
        }
        return;
      }

      // Draw offer from a player
      if (data.type === "offer-draw") {
        const game = games[data.gameId];
        if (game && !game.finished) {
          game.players.forEach(player => {
            if (player !== ws && player.readyState === WebSocket.OPEN) {
              player.send(JSON.stringify({ type: "draw-offer" }));
            }
          });
        }
        return;
      }

      // Response to a draw offer
      if (data.type === "respond-draw") {
        const game = games[data.gameId];
        if (game && !game.finished) {
          if (data.accept) {
            safeFinalizeGame(game, { winner: null, reason: "draw" });
          } else {
            game.players.forEach(player => {
              if (player !== ws && player.readyState === WebSocket.OPEN) {
                player.send(JSON.stringify({ type: "draw-declined" }));
              }
            });
          }
        }
        return;
      }

      // Spielfiguren-Movement
      if (data.type === "move") {
        const game = games[data.gameId];
        if (game) {
          if (game.finished) {
            ws.send(JSON.stringify({ type: "error", message: "Game already finished" }));
            return;
          }
          const playerColor = playerColors.get(ws);
          const turnColor = game.board.turn() === "w" ? "white" : "black";
          if (playerColor !== turnColor) {
            ws.send(JSON.stringify({ type: "error", message: "Not your turn" }));
            return;
          }
          const { from, to, promotion } = data.payload;
          let move;
          let fromAlg: string;
          let toAlg: string;
          try {
            fromAlg = coordsToAlgebraic(from.x, from.y);
            toAlg = coordsToAlgebraic(to.x, to.y);
            move = game.board.move({ from: fromAlg, to: toAlg, promotion });
          } catch (err) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid coordinates" }));
            return;
          }

          if (move) {
            game.moves.push({
              from: algebraicToCoords(move.from),
              to: algebraicToCoords(move.to),
              promotion,
            });

            // Log the move for this game
            logMove(game.id, JSON.stringify({ from: move.from, to: move.to, promotion }));

            game.players.forEach(player => {
              if (player.readyState === WebSocket.OPEN) {
                player.send(
                  JSON.stringify({
                    type: "state",
                    fen: game.board.fen(),
                    moves: game.moves,
                  })
                );
              }
            });

            if (game.board.isGameOver()) {
              let winner: "white" | "black" | null = null;
              let reason: "checkmate" | "stalemate" | "draw";
              if (game.board.isCheckmate()) {
                reason = "checkmate";
                winner = game.board.turn() === "w" ? "black" : "white";
              } else if (game.board.isStalemate()) {
                reason = "stalemate";
              } else {
                reason = "draw";
              }
              safeFinalizeGame(game, { winner, reason });
            }
          } else {
            ws.send(JSON.stringify({ type: "error", message: "Invalid move" }));
          }
        }
      }
    });

    ws.on("close", () => {
      console.log("WebSocket: Client getrennt");
      playerColors.delete(ws);
      waitingClients.delete(ws);

      for (const id in games) {
        const room = games[id];
        room.players = room.players.filter(p => p !== ws);

        // ungestartetes Spiel, keine Spieler → löschen & cancelGame
        if (!room.started && room.players.length === 0) {
          console.log("Lösche ungenutzten Raum", id);
          delete games[id];
          // broadcast an alle, dass das Spiel entfernt wurde
          waitingClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "game-cancelled", gameId: id }));
            }
          });
          cancelGameOnChain(id).catch((err: any) => {
            console.error(`cancelGameOnChain(${id}) failed:`, err);
          });
        }
        // laufendes Spiel, noch ein Spieler und noch nicht beendet
        else if (room.started && room.players.length > 0 && !room.finished) {
          const remaining = room.players[0];
          const winnerColor = playerColors.get(remaining); // 'white' oder 'black'
          if (!winnerColor) {
            console.warn(`Cannot determine winner color for disconnect in game ${id}`);
            continue;
          }
          safeFinalizeGame(room, {
            winner: winnerColor,
            reason: "opponent disconnected",
          });
        }
      }
    });

  }); // <-- schließt wss.on("connection")

}); // <-- schließt nextApp.prepare().then(() => { ... })

