import { useRef, useState, useEffect } from "react";
import type React from "react";
import "./Chessboard.css";
import Tile from "../Tile/Tile";
import { Piece, Position } from "../../models";
import { TeamType } from "../../Types";

interface Props {
  playMove: (piece: Piece, position: Position) => boolean;
  pieces: Piece[];
  playerColor: "white" | "black";
}

export default function Chessboard({ playMove, pieces, playerColor }: Props) {
  const [activePiece, setActivePiece] = useState<HTMLElement | null>(null);
  const [grabPosition, setGrabPosition] = useState<Position>(new Position(-1, -1));
  const chessboardRef = useRef<HTMLDivElement>(null);
  const [tileSize, setTileSize] = useState<number>(0);

  // Feldgröße dynamisch berechnen
  useEffect(() => {
    const recalc = () => {
      const board = chessboardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      setTileSize(rect.width / 8);
    };
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("orientationchange", recalc);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("orientationchange", recalc);
    };
  }, []);

  // Maus-/Touch-Position → Brettkoordinaten
  function getBoardPositionLocal(clientX: number, clientY: number): Position | null {
    const board = chessboardRef.current;
    if (!board) return null;

    const rect = board.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    if (relX < 0 || relY < 0 || relX >= rect.width || relY >= rect.height) {
      return null;
    }

    const colTopLeft = Math.floor((relX / rect.width) * 8);
    const rowTopLeft = Math.floor((relY / rect.height) * 8);

    const x = playerColor === "white" ? colTopLeft : 7 - colTopLeft;
    const y = playerColor === "white" ? 7 - rowTopLeft : rowTopLeft;

    return new Position(x, y);
  }

  // === Pointer Events ===
  function onPointerDown(e: React.PointerEvent) {
    const board = chessboardRef.current;
    if (!board) return;

    // nur linke Taste / Primary pointer
    if (e.button !== undefined && e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (!target.classList.contains("chess-piece")) return;

    const position = getBoardPositionLocal(e.clientX, e.clientY);
    if (!position) return;

    const team = playerColor === "white" ? TeamType.OUR : TeamType.OPPONENT;
    const piece = pieces.find((p) => p.samePosition(position) && p.team === team);
    if (!piece) return;

    setGrabPosition(position);

    // während des Draggens alle Pointer-Events an das Board liefern
    board.setPointerCapture?.(e.pointerId);

    target.style.position = "absolute";
    target.style.pointerEvents = "none";
    setActivePiece(target);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!activePiece || !chessboardRef.current) return;

    const board = chessboardRef.current;
    const rect = board.getBoundingClientRect();
    const size = tileSize || rect.width / 8;

    const desiredLeft = e.clientX - size / 2;
    const desiredTop = e.clientY - size / 2;

    const clampedLeft = Math.min(Math.max(desiredLeft, rect.left), rect.left + rect.width - size);
    const clampedTop = Math.min(Math.max(desiredTop, rect.top), rect.top + rect.height - size);

    activePiece.style.left = `${clampedLeft}px`;
    activePiece.style.top = `${clampedTop}px`;
  }

  function onPointerUp(e: React.PointerEvent) {
    const board = chessboardRef.current;
    if (board && e.pointerId !== undefined) {
      try { board.releasePointerCapture?.(e.pointerId); } catch {}
    }
    if (!activePiece) return;

    const destination = getBoardPositionLocal(e.clientX, e.clientY);
    if (!destination) {
      // zurücksetzen
      activePiece.style.position = "relative";
      activePiece.style.removeProperty("top");
      activePiece.style.removeProperty("left");
      activePiece.style.pointerEvents = "auto";
      setActivePiece(null);
      return;
    }

    const piece = pieces.find((p) => p.samePosition(grabPosition));
    if (piece) {
      const success = playMove(piece.clone(), destination);
      if (!success) {
        activePiece.style.position = "relative";
        activePiece.style.removeProperty("top");
        activePiece.style.removeProperty("left");
      }
    }
    activePiece.style.pointerEvents = "auto";
    setActivePiece(null);
  }

  function onPointerCancel(e: React.PointerEvent) {
    // defensive reset
    if (activePiece) {
      activePiece.style.position = "relative";
      activePiece.style.removeProperty("top");
      activePiece.style.removeProperty("left");
      activePiece.style.pointerEvents = "auto";
      setActivePiece(null);
    }
    const board = chessboardRef.current;
    if (board && e.pointerId !== undefined) {
      try { board.releasePointerCapture?.(e.pointerId); } catch {}
    }
  }

  // Tiles rendern
  const boardTiles: React.ReactElement[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const j = playerColor === "white" ? 7 - row : row; // y
      const i = playerColor === "white" ? col : 7 - col; // x
      const number = j + i + 2;

      const piece = pieces.find((p) => p.samePosition(new Position(i, j)));
      const image = piece?.image;

      const currentPiece =
        activePiece != null ? pieces.find((p) => p.samePosition(grabPosition)) : undefined;

      const highlight = currentPiece?.possibleMoves
        ? currentPiece.possibleMoves.some((p) => p.samePosition(new Position(i, j)))
        : false;

      boardTiles.push(
        <Tile key={`${row},${col}`} image={image} number={number} highlight={highlight} />
      );
    }
  }

  return (
    <div
      id="chessboard"
      ref={chessboardRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {boardTiles}
    </div>
  );
}

