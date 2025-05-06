import { useRef, useState, useEffect } from "react";
import "./Chessboard.css";
import Tile from "../Tile/Tile";
import { VERTICAL_AXIS, HORIZONTAL_AXIS, GRID_SIZE } from "../../Constants";
import { Piece, Position } from "../../models";

interface Props {
  playMove: (piece: Piece, position: Position) => boolean;
  pieces: Piece[];
}

export default function Chessboard({ playMove, pieces }: Props) {
  const [activePiece, setActivePiece] = useState<HTMLElement | null>(null);
  const [grabPosition, setGrabPosition] = useState<Position>(new Position(-1, -1));
  const chessboardRef = useRef<HTMLDivElement>(null);

  // Spielerfarbe direkt aus localStorage (wird beim Start-Event gesetzt)
  const playerColor =
    (localStorage.getItem("worldchess-color") as "white" | "black") || "white";
console.log("Chessboard – playerColor:", playerColor);

  function grabPiece(e: React.MouseEvent) {
    const element = e.target as HTMLElement;
    const board = chessboardRef.current;
    if (element.classList.contains("chess-piece") && board) {
      const x = Math.floor((e.clientX - board.offsetLeft) / GRID_SIZE);
      const y = Math.abs(
        Math.ceil((e.clientY - board.offsetTop - GRID_SIZE * 8) / GRID_SIZE)
      );
      setGrabPosition(new Position(x, y));
      element.style.position = "absolute";
      element.style.pointerEvents = "none";
      setActivePiece(element);
    }
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
    const board = chessboardRef.current;
    if (!activePiece || !board) return;
    const x = Math.floor((e.clientX - board.offsetLeft) / GRID_SIZE);
    const y = Math.abs(
      Math.ceil((e.clientY - board.offsetTop - GRID_SIZE * 8) / GRID_SIZE)
    );

    const piece = pieces.find((p) => p.samePosition(grabPosition));
    if (piece) {
      const success = playMove(piece.clone(), new Position(x, y));
      if (!success) {
        activePiece.style.position = "relative";
        activePiece.style.removeProperty("top");
        activePiece.style.removeProperty("left");
      }
    }
    setActivePiece(null);
  }

  const boardTiles: JSX.Element[] = [];
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
      className={playerColor === "black" ? "rotate-board" : ""}
      onMouseMove={movePiece}
      onMouseDown={grabPiece}
      onMouseUp={dropPiece}
    >
      {boardTiles}
    </div>
  );

}

