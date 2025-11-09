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

  // Für Re-Parenting beim Drag
  const originParentRef = useRef<HTMLElement | null>(null);
  const placeholderRef = useRef<HTMLDivElement | null>(null);

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

    if (relX < 0 || relY < 0 || relX >= rect.width || relY >= rect.height) return null;

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
    if (e.button !== undefined && e.button !== 0) return; // nur Primärpointer
    const target = e.target as HTMLElement;
    if (!target.classList.contains("chess-piece")) return;

    const position = getBoardPositionLocal(e.clientX, e.clientY);
    if (!position) return;

    const team = playerColor === "white" ? TeamType.OUR : TeamType.OPPONENT;
    const piece = pieces.find((p) => p.samePosition(position) && p.team === team);
    if (!piece) return;

    setGrabPosition(position);

    // Pointer-Capture, damit Move/Up sicher beim Brett ankommen
    board.setPointerCapture?.(e.pointerId);

    // Re-Parenting: Stück aus der Tile ins Board hängen
    const origin = target.parentElement as HTMLElement | null;
    originParentRef.current = origin;

    const placeholder = document.createElement("div");
    placeholder.style.width = "100%";
    placeholder.style.height = "100%";
    placeholder.style.visibility = "hidden";
    placeholderRef.current = placeholder;
    origin?.appendChild(placeholder);

    board.appendChild(target); // jetzt ist das Stück direktes Kind des Brettes

    // Ab jetzt absolute Position RELATIV ZUM BRETT
    const rect = board.getBoundingClientRect();
    const size = tileSize || rect.width / 8;

    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    target.style.position = "absolute";
    target.style.width = `${size}px`;
    target.style.height = `${size}px`;
    target.style.zIndex = "1000";
    target.style.pointerEvents = "none";

    const left = Math.min(Math.max(relX - size / 2, 0), rect.width - size);
    const top  = Math.min(Math.max(relY - size / 2, 0), rect.height - size);
    target.style.left = `${left}px`;
    target.style.top  = `${top}px`;

    setActivePiece(target);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!activePiece || !chessboardRef.current) return;

    const board = chessboardRef.current;
    const rect = board.getBoundingClientRect();
    const size = tileSize || rect.width / 8;

    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    const left = Math.min(Math.max(relX - size / 2, 0), rect.width - size);
    const top  = Math.min(Math.max(relY - size / 2, 0), rect.height - size);

    activePiece.style.left = `${left}px`;
    activePiece.style.top  = `${top}px`;
  }

  function resetActivePiece(el: HTMLElement) {
    // zurück in die ursprüngliche Tile setzen (DOM wieder sauber)
    const origin = originParentRef.current;
    const placeholder = placeholderRef.current;
    if (origin && placeholder) {
      try { origin.replaceChild(el, placeholder); }
      catch { /* falls zwischenzeitlich gerendert wurde: ignorieren */ }
    }
    // Styles resetten – Render übernimmt die neue Stellung
    el.style.position = "relative";
    el.style.removeProperty("left");
    el.style.removeProperty("top");
    el.style.removeProperty("width");
    el.style.removeProperty("height");
    el.style.removeProperty("z-index");
    el.style.pointerEvents = "auto";

    originParentRef.current = null;
    placeholderRef.current = null;
  }

  function onPointerUp(e: React.PointerEvent) {
    const board = chessboardRef.current;
    if (board && e.pointerId !== undefined) {
      try { board.releasePointerCapture?.(e.pointerId); } catch {}
    }
    if (!activePiece) return;

    const el = activePiece;
    const destination = getBoardPositionLocal(e.clientX, e.clientY);

    if (!destination) {
      resetActivePiece(el);
      setActivePiece(null);
      return;
    }

    const piece = pieces.find((p) => p.samePosition(grabPosition));
    if (piece) {
      const success = playMove(piece.clone(), destination);
      // Immer zurückstecken – State/Server rendert danach korrekt
      resetActivePiece(el);
      setActivePiece(null);
      if (!success) {
        // optional: Feedback
      }
    } else {
      resetActivePiece(el);
      setActivePiece(null);
    }
  }

  function onPointerCancel(e: React.PointerEvent) {
    const board = chessboardRef.current;
    if (board && e.pointerId !== undefined) {
      try { board.releasePointerCapture?.(e.pointerId); } catch {}
    }
    if (activePiece) {
      resetActivePiece(activePiece);
      setActivePiece(null);
    }
  }

  // Tiles rendern
  const boardTiles: React.ReactElement[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const j = playerColor === "white" ? 7 - row : row; // y (0 unten)
      const i = playerColor === "white" ? col : 7 - col; // x (0 links)
      const number = j + i + 2;

      const piece = pieces.find((p) => p.samePosition(new Position(i, j)));
      const image = piece?.image;

      // Highlight: mögliche Züge der gerade gegriffenen Figur
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

