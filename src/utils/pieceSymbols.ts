import { PieceType } from "../Types";

export function pieceTypeToSymbol(piece: PieceType): string {
  switch (piece) {
    case PieceType.KNIGHT:
      return 'n';
    case PieceType.BISHOP:
      return 'b';
    case PieceType.ROOK:
      return 'r';
    case PieceType.QUEEN:
      return 'q';
    case PieceType.KING:
      return 'k';
    case PieceType.PAWN:
    default:
      return 'p';
  }
}

export function symbolToPieceType(symbol: string): PieceType | undefined {
  switch (symbol.toLowerCase()) {
    case 'n':
      return PieceType.KNIGHT;
    case 'b':
      return PieceType.BISHOP;
    case 'r':
      return PieceType.ROOK;
    case 'q':
      return PieceType.QUEEN;
    case 'k':
      return PieceType.KING;
    case 'p':
      return PieceType.PAWN;
    default:
      return undefined;
  }
}
