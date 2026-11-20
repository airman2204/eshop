declare module "easystarjs" {
  export class js {
    setGrid(grid: number[][]): void;
    setAcceptableTiles(tiles: number[]): void;
    enableDiagonals(): void;
    disableDiagonals(): void;
    findPath(
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      callback: (path: Array<{ x: number; y: number }> | null) => void
    ): void;
    calculate(): void;
  }
}
