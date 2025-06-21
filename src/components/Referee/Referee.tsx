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
import {
  sendMove,
  sendResign,
  sendOfferDraw,
  respondDraw,
  onMove,
  onState,
  onError,
  onGameOver,
  requestState,
  onDrawOffer,
  onDrawDeclined,
} from "@/websocket";
import { symbolToPieceType } from "@/utils/pieceSymbols";
import { isServerEnPassant } from "@/utils/serverMove";
import ChessClock from "../Clock/ChessClock";

import { parseFen } from "@/utils/fen";
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from "@worldcoin/minikit-js";

interface RefereeProps {
  initialGame: {
    id: string;
    timeControl: string;
    stake: number;
    started: boolean;
  };
  playerColor: 'white' | 'black';
  finishGame: () => void;
}

const moveSound = new Howl({
  src: ["/sounds/move-self.mp3"],
});

const captureSound = new Howl({
  src: ["/sounds/capture.mp3"],
});

const checkmateSound = new Howl({
  src: ["/sounds/move-check.mp3"],
});

export default function Referee({ initialGame, playerColor, finishGame }: RefereeProps) {
  const [board, setBoard] = useState<Board>(initialBoard.clone());
  const [promotionPawn, setPromotionPawn] = useState<Piece>();
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Position; to: Position } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const stalemateModalRef = useRef<HTMLDivElement>(null);
  const checkmateModalRef = useRef<HTMLDivElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const myTeam: TeamType = playerColor === "white" ? TeamType.OUR : TeamType.OPPONENT;

  function handleTimeout(winner: TeamType) {
    setBoard((current) => {
      const clone = current.clone();
      clone.winningTeam = winner;
      return clone;
    });
    setGameOver(true);
    checkmateModalRef.current?.classList.remove("hidden");
    checkmateSound.play();
  }

useEffect(() => {
  const applyMove = (move: { from: { x: number; y: number }; to: { x: number; y: number }; promotion?: string }) => {
    setBoard((currentBoard) => {
      const clonedBoard = currentBoard.clone();

      const piece = clonedBoard.pieces.find(
        (p) => p.position.x === move.from.x && p.position.y === move.from.y
      );

      if (piece) {
        const destination = new Position(move.to.x, move.to.y);
        const enPassant = isServerEnPassant(move, clonedBoard);

        clonedBoard.playMove(enPassant, true, piece, destination);
        if (move.promotion) {
          const promotionType = symbolToPieceType(move.promotion);
          if (promotionType) {
            clonedBoard.pieces = clonedBoard.pieces.map((p) =>
              p.position.x === move.to.x &&
              p.position.y === move.to.y &&
              p.team === piece.team
                ? new Piece(p.position.clone(), promotionType, p.team, true)
                : p
            );
          }
        }
        clonedBoard.totalTurns += 1;
        clonedBoard.calculateAllMoves();
      }

      return clonedBoard;
    });
  };

  const applyState = (state: { fen: string; moves: any[] }) => {
    setBoard(() => parseFen(state.fen));
  };

  const distributeWinnings = async (winner: string | null) => {
    if (typeof window === "undefined") return;
    const address = localStorage.getItem("userAddress");
    if (!address) return;

    const res = await fetch('/api/initiate-pay', { method: 'POST' });
    const { id: reference } = await res.json();

    let amount = initialGame.stake * 0.95;
    if (winner && winner === playerColor) {
      amount = initialGame.stake * 2 * 0.95;
    } else if (winner) {
      return; // loser sends nothing
    }

    const payload: PayCommandInput = {
      reference,
      to: address,
      tokens: [
        {
          symbol: Tokens.WLD,
          token_amount: tokenToDecimals(amount, Tokens.WLD).toString(),
        },
      ],
      description: `Payout for game ${initialGame.id}`,
    };

    if (!MiniKit.isInstalled()) return;

    const { finalPayload } = await MiniKit.commandsAsync.pay(payload);

    await fetch('/api/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalPayload),
    });
  };

  const handleError = (msg: any) => {
    // Refresh the board state in case we desynced
    requestState(initialGame.id);
    alert(msg.message || "An error occurred");
  };

  const handleGameOver = (result: { winner: string | null; reason: string }) => {
    setBoard((current) => {
      const clone = current.clone();
      if ((result.reason === "checkmate" || result.reason === "resignation") && result.winner) {
        clone.winningTeam = result.winner === "white" ? TeamType.OUR : TeamType.OPPONENT;
        clone.isStalemate = false;
      } else {
        clone.winningTeam = undefined;
        clone.isStalemate = true;
      }
      return clone;
    });
    setGameOver(true);
    distributeWinnings(result.winner).finally(() => finishGame());
  };

  const unsubMove = onMove(applyMove);
  const unsubState = onState(applyState);
  const unsubError = onError(handleError);
  const unsubGameOver = onGameOver(handleGameOver);
  const unsubDrawOffer = onDrawOffer(() => {
    if (typeof window === "undefined") return;
    const accept = window.confirm("Do you want to accept a draw?");
    respondDraw(initialGame.id, accept);
  });
  const unsubDrawDeclined = onDrawDeclined(() => {
    if (typeof window === "undefined") return;
    alert("Draw offer declined");
  });

  return () => {
    unsubMove();
    unsubState();
    unsubError();
    unsubGameOver();
    unsubDrawOffer();
    unsubDrawDeclined();
  };
}, []);

useEffect(() => {
  if (board.winningTeam !== undefined) {
    checkmateModalRef.current?.classList.remove("hidden");
    stalemateModalRef.current?.classList.add("hidden");
    checkmateSound.play();
  } else if (board.isStalemate) {
    stalemateModalRef.current?.classList.remove("hidden");
    checkmateModalRef.current?.classList.add("hidden");
  }
}, [board]);


  function playMove(playedPiece: Piece, destination: Position): boolean {
    // If the playing piece doesn't have any moves return
    if (playedPiece.possibleMoves === undefined) return false;

    // Only allow moving our own pieces
    if (playedPiece.team !== myTeam) return false;

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

    // send move to server and wait for confirmation
    playedMoveIsValid = true;

    // This is for promoting a pawn
    let promotionRow = playedPiece.team === TeamType.OUR ? 7 : 0;

    if (destination.y === promotionRow && playedPiece.isPawn) {
      modalRef.current?.classList.remove("hidden");
      setPromotionPawn(() => {
        const clonedPlayedPiece = playedPiece.clone();
        clonedPlayedPiece.position = destination.clone();
        return clonedPlayedPiece;
      });
      setPendingPromotion({
        from: playedPiece.position.clone(),
        to: destination.clone(),
      });
    } else {
      sendMove({
        from: { x: playedPiece.position.x, y: playedPiece.position.y },
        to: { x: destination.x, y: destination.y },
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
    if (!promotionPawn || !pendingPromotion) {
      return;
    }

    const { from, to } = pendingPromotion;

    setBoard((previousBoard) => {
      const clonedBoard = previousBoard.clone();
      clonedBoard.pieces = clonedBoard.pieces.reduce((results, piece) => {
        if (piece.position.x === from.x && piece.position.y === from.y && piece.team === promotionPawn.team) {
          // replace the moving pawn with the promoted piece at the destination
          results.push(new Piece(to.clone(), pieceType, piece.team, true));
        } else if (!(piece.position.x === to.x && piece.position.y === to.y)) {
          // discard any captured piece on the destination square
          results.push(piece);
        }
        return results;
      }, [] as Piece[]);

      clonedBoard.calculateAllMoves();

      return clonedBoard;
    });

    sendMove({
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      promotion: pieceType,
    });
    setPendingPromotion(null);

    modalRef.current?.classList.add("hidden");
  }

  function promotionTeamType() {
    return promotionPawn?.team === TeamType.OUR ? "w" : "b";
  }

  function restartGame() {
    checkmateModalRef.current?.classList.add("hidden");
    setBoard(initialBoard.clone());
  }

  function handleResign() {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm("Aufgeben?");
    if (confirmed) {
      sendResign(initialGame.id);
    }
  }

  function handleOfferDraw() {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm("Do you want to offer a draw?");
    if (confirmed) {
      sendOfferDraw(initialGame.id);
    }
  }

  return (
    <>
      <p style={{ color: "white", fontSize: "24px", textAlign: "center" }}>
        Total turns: {board.totalTurns}
      </p>
      <ChessClock
        timeControl={initialGame.timeControl}
        currentTurn={board.currentTeam}
        totalTurns={board.totalTurns}
        onTimeout={handleTimeout}
        gameOver={gameOver}
      />
      <button onClick={handleResign}>Aufgeben</button>
      <button onClick={handleOfferDraw}>Offer draw</button>
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

      <Chessboard playMove={playMove} pieces={board.pieces} playerColor={playerColor} />
    </>
  );
}
