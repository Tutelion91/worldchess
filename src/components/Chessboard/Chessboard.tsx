import { useRef, useState, useEffect } from "react";
import type React from "react";
import "./Chessboard.css";
import Tile from "../Tile/Tile";
import { VERTICAL_AXIS, HORIZONTAL_AXIS, GRID_SIZE } from "../../Constants";
import { Piece, Position } from "../../models";
import { TeamType } from "../../Types";

interface Props {
  playMove: (piece: Piece, position: Position) => boolean;
  pieces: Piece[];
  playerColor: 'white' | 'black';
}

export default function Chessboard({ playMove, pieces ,playerColor }: Props) {
  const [activePiece, setActivePiece] = useState<HTMLElement | null>(null);
  const [grabPosition, setGrabPosition] = useState<Position>(new Position(-1, -1));
  const chessboardRef = useRef<HTMLDivElement>(null);

  // Spielerfarbe direkt aus localStorage (wird beim Start-Event gesetzt)
  //const playerColor =
  //  (localStorage.getItem("worldchess-color") as "white" | "black") || "white";
console.log("Chessboard – playerColor:", playerColor);

  // Convert mouse coordinates to board coordinates depending on orientation
  function getBoardPosition(clientX: number, clientY: number): Position | null {
    const board = chessboardRef.current;
    if (!board) return null;

    let x = Math.floor((clientX - board.offsetLeft) / GRID_SIZE);
    let y = 7 - Math.floor((clientY - board.offsetTop) / GRID_SIZE);

    if (playerColor === "black") {
      x = 7 - x;
      y = 7 - y;
    }

    if (x < 0 || x > 7 || y < 0 || y > 7) return null;
    return new Position(x, y);
  }

  function grabPiece(e: React.MouseEvent) {
    const element = e.target as HTMLElement;
    if (!element.classList.contains("chess-piece")) return;

    const position = getBoardPosition(e.clientX, e.clientY);
    if (!position) return;

    const team = playerColor === "white" ? TeamType.OUR : TeamType.OPPONENT;
    const piece = pieces.find(
      (p) => p.samePosition(position) && p.team === team
    );

    if (!piece) return;

    setGrabPosition(position);
    element.style.position = "absolute";
    element.style.pointerEvents = "none";
    setActivePiece(element);
  }

  function movePiece(e: React.MouseEvent) {
    if (!activePiece || !chessboardRef.current) return;
    const board = chessboardRef.current;
    const x = e.clientX - GRID_SIZE / 2;
    const y = e.clientY - GRID_SIZE / 2;
    activePiece.style.left = `${Math.min(
      Math.max(x, board.offsetLeft),
      board.offsetLeft + board.clientWidth - GRID_SIZE
    )}px`;
    activePiece.style.top = `${Math.min(
      Math.max(y, board.offsetTop),
      board.offsetTop + board.clientHeight - GRID_SIZE
    )}px`;
  }

  function dropPiece(e: React.MouseEvent) {
    if (!activePiece) return;

    const destination = getBoardPosition(e.clientX, e.clientY);
    if (!destination) {
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
    if (activePiece) {
      activePiece.style.pointerEvents = "auto";
    }
    setActivePiece(null);
  }

  const boardTiles: React.ReactElement[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const j = playerColor === "white" ? 7 - row : row;
      const i = playerColor === "white" ? col : 7 - col;
      const number = j + i + 2;
      const piece = pieces.find((p) => p.samePosition(new Position(i, j)));
      const image = piece?.image;

      const currentPiece =
        activePiece != null ? pieces.find((p) => p.samePosition(grabPosition)) : undefined;
      const highlight = currentPiece?.possibleMoves
        ? currentPiece.possibleMoves.some((p) => p.samePosition(new Position(i, j)))
        : false;

      boardTiles.push(
        <Tile
          key={`${row},${col}`}
          image={image}
          number={number}
          highlight={highlight}
        />
      );
    }
  }

  return (
    <div
      id="chessboard"
      ref={chessboardRef}
      onMouseMove={movePiece}
      onMouseDown={grabPiece}
      onMouseUp={dropPiece}
    >
      {boardTiles}
    </div>
  );

}

