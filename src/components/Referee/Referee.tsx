import { useEffect, useRef, useState } from "react";
import { initialBoard } from "../../Constants";
import { Piece, Position } from "../../models";
import { Board } from "../../models/Board";
import { Pawn } from "../../models/Pawn";
import {
  bishopMove,
  getPossibleBishopMoves,
  getPossibleKingMoves,
  getPossibleKnightMoves,
  getPossiblePawnMoves,
  getPossibleQueenMoves,
  getPossibleRookMoves,
  kingMove,
  knightMove,
  pawnMove,
  queenMove,
  rookMove,
} from "../../referee/rules";
import { PieceType, TeamType } from "../../Types";
import Chessboard from "../Chessboard/Chessboard";
import { Howl } from "howler";
import { sendMove } from "@/websocket";
import { onMove } from "@/websocket";


const moveSound = new Howl({
  src: ["/sounds/move-self.mp3"],
});

const captureSound = new Howl({
  src: ["/sounds/capture.mp3"],
});

const checkmateSound = new Howl({
  src: ["/sounds/move-check.mp3"],
});

export default function Referee() {
  const [board, setBoard] = useState<Board>(initialBoard.clone());
  const [promotionPawn, setPromotionPawn] = useState<Piece>();
  const modalRef = useRef<HTMLDivElement>(null);
  const stalemateModalRef = useRef<HTMLDivElement>(null);
  const checkmateModalRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const unsubscribe = onMove((move: { from: { x: number; y: number }; to: { x: number; y: number } }) => {
    setBoard((currentBoard) => {
      const clonedBoard = currentBoard.clone();

      const piece = clonedBoard.pieces.find((p) =>
        p.position.x === move.from.x && p.position.y === move.from.y
      );

      if (piece) {
        clonedBoard.playMove(
          false, // Kein En Passant nötig
          true,  // Wir vertrauen darauf, dass der Zug korrekt ist
          piece,
          new Position(move.to.x, move.to.y)
        );
        clonedBoard.totalTurns += 1;
      }

      return clonedBoard;
    });
  });

  return () => {
    unsubscribe();
  };
}, []);


  function playMove(playedPiece: Piece, destination: Position): boolean {
    // If the playing piece doesn't have any moves return
    if (playedPiece.possibleMoves === undefined) return false;

    // Prevent the inactive team from playing
    if (playedPiece.team === TeamType.OUR && board.totalTurns % 2 !== 1)
      return false;
    if (playedPiece.team === TeamType.OPPONENT && board.totalTurns % 2 !== 0)
      return false;

    let playedMoveIsValid = false;

    const validMove = playedPiece.possibleMoves?.some((m) =>
      m.samePosition(destination)
    );

    if (!validMove) return false;

    const enPassantMove = isEnPassantMove(
      playedPiece.position,
      destination,
      playedPiece.type,
      playedPiece.team
    );

    // playMove modifies the board thus we
    // need to call setBoard
setBoard(() => {
  const clonedBoard = board.clone();

  const moveWasPlayed = clonedBoard.playMove(
    enPassantMove,
    validMove,
    playedPiece,
    destination
  );

  if (moveWasPlayed) {
    moveSound.play();
    clonedBoard.totalTurns += 1;

    const nextTeam = playedPiece.team === TeamType.OUR ? TeamType.OPPONENT : TeamType.OUR;
    clonedBoard.calculateAllMoves();

    if (isStalemate(clonedBoard, nextTeam)) {
      stalemateModalRef.current?.classList.remove("hidden");
      return clonedBoard;
    }

    if (clonedBoard.winningTeam !== undefined) {
      checkmateModalRef.current?.classList.remove("hidden");
      checkmateSound.play();
    }
  }

  return clonedBoard;
});

sendMove({
  from: { x: playedPiece.position.x, y: playedPiece.position.y },
  to: { x: destination.x, y: destination.y },
});


    // This is for promoting a pawn
    let promotionRow = playedPiece.team === TeamType.OUR ? 7 : 0;

    if (destination.y === promotionRow && playedPiece.isPawn) {
      modalRef.current?.classList.remove("hidden");
      setPromotionPawn((previousPromotionPawn) => {
        const clonedPlayedPiece = playedPiece.clone();
        clonedPlayedPiece.position = destination.clone();
        return clonedPlayedPiece;
      });
    }

    return playedMoveIsValid;
  }

  function isEnPassantMove(
    initialPosition: Position,
    desiredPosition: Position,
    type: PieceType,
    team: TeamType
  ) {
    const pawnDirection = team === TeamType.OUR ? 1 : -1;

    if (type === PieceType.PAWN) {
      if (
        (desiredPosition.x - initialPosition.x === -1 ||
          desiredPosition.x - initialPosition.x === 1) &&
        desiredPosition.y - initialPosition.y === pawnDirection
      ) {
        const piece = board.pieces.find(
          (p) =>
            p.position.x === desiredPosition.x &&
            p.position.y === desiredPosition.y - pawnDirection &&
            p.isPawn &&
            (p as Pawn).enPassant
        );
        if (piece) {
          return true;
        }
      }
    }

    return false;
  }

function isStalemate(board: Board, team: TeamType): boolean {
  const teamPieces = board.pieces.filter(p => p.team === team);

  for (let piece of teamPieces) {
    if (piece.possibleMoves && piece.possibleMoves.length > 0) {
      return false;
    }
  }

  // Alle Figuren haben 0 Züge → prüfen ob König im Schach steht
  const king = teamPieces.find(p => p.type === PieceType.KING);
  if (!king) return false;

  const enemyMoves = board.pieces
    .filter(p => p.team !== team && p.possibleMoves)
    .flatMap(p => p.possibleMoves!);

  const inCheck = enemyMoves.some(move =>
    move.samePosition(king.position)
  );

  return !inCheck;
}


  //TODO
  //Add stalemate!
  function isValidMove(
    initialPosition: Position,
    desiredPosition: Position,
    type: PieceType,
    team: TeamType
  ) {
    let validMove = false;
    switch (type) {
      case PieceType.PAWN:
        validMove = pawnMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.KNIGHT:
        validMove = knightMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.BISHOP:
        validMove = bishopMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.ROOK:
        validMove = rookMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.QUEEN:
        validMove = queenMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.KING:
        validMove = kingMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
    }

    return validMove;
  }

  function promotePawn(pieceType: PieceType) {
    if (promotionPawn === undefined) {
      return;
    }

    setBoard((previousBoard) => {
      const clonedBoard = board.clone();
      clonedBoard.pieces = clonedBoard.pieces.reduce((results, piece) => {
        if (piece.samePiecePosition(promotionPawn)) {
          results.push(
            new Piece(piece.position.clone(), pieceType, piece.team, true)
          );
        } else {
          results.push(piece);
        }
        return results;
      }, [] as Piece[]);

      clonedBoard.calculateAllMoves();

      return clonedBoard;
    });

    modalRef.current?.classList.add("hidden");
  }

  function promotionTeamType() {
    return promotionPawn?.team === TeamType.OUR ? "w" : "b";
  }

  function restartGame() {
    checkmateModalRef.current?.classList.add("hidden");
    setBoard(initialBoard.clone());
  }

  return (
    <>
      <p style={{ color: "white", fontSize: "24px", textAlign: "center" }}>
        Total turns: {board.totalTurns}
      </p>
      <div className="modal hidden" ref={modalRef}>
        <div className="modal-body">
          <img
            onClick={() => promotePawn(PieceType.ROOK)}
            src={`/assets/images/rook_${promotionTeamType()}.png`}
          />
          <img
            onClick={() => promotePawn(PieceType.BISHOP)}
            src={`/assets/images/bishop_${promotionTeamType()}.png`}
          />
          <img
            onClick={() => promotePawn(PieceType.KNIGHT)}
            src={`/assets/images/knight_${promotionTeamType()}.png`}
          />
          <img
            onClick={() => promotePawn(PieceType.QUEEN)}
            src={`/assets/images/queen_${promotionTeamType()}.png`}
          />
        </div>
      </div>
      <div className="modal hidden" ref={checkmateModalRef}>
        <div className="modal-body">
          <div className="checkmate-body">
            <span>
              The winning team is{" "}
              {board.winningTeam === TeamType.OUR ? "white" : "black"}!
            </span>
            <button onClick={restartGame}>Play again</button>
          </div>
        </div>
      </div>
      <div className="modal hidden" ref={stalemateModalRef}>
  <div className="modal-body">
    <div className="checkmate-body">
      <span>Stalemate! Das Spiel endet unentschieden.</span>
      <button onClick={restartGame}>Play again</button>
    </div>
  </div>
</div>

      <Chessboard playMove={playMove} pieces={board.pieces} />
    </>
  );
}
