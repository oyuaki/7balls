(function initializeGameModel() {
const { BALL_COLORS, GAME_CONFIG, WILDCARD_BALL } = window.ColorLinesConfig;

const MOVE_DIRECTIONS = Object.freeze([
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]);

const LINE_DIRECTIONS = Object.freeze([
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]);

class ColorLinesGame {
  constructor(config = GAME_CONFIG, colors = BALL_COLORS, wildcard = WILDCARD_BALL) {
    this.config = config;
    this.colors = colors;
    this.wildcard = wildcard;
    this.reset();
  }

  reset() {
    const { boardSize, initialBalls, spawnCount } = this.config;

    this.board = Array.from(
      { length: boardSize },
      () => Array(boardSize).fill(null),
    );
    this.selected = null;
    this.score = 0;
    this.nextColors = this.randomColors(spawnCount);
    this.itemUses = { ...this.config.itemLimits };
    this.stopNextSpawn = false;
    this.placeRandomBalls(initialBalls);
  }

  canUseItem(type) {
    return Object.prototype.hasOwnProperty.call(this.itemUses, type)
      && this.itemUses[type] > 0;
  }

  useItem(type, row, col) {
    if (!this.canUseItem(type)) return false;

    if (type === "stop") {
      if (this.stopNextSpawn) return false;

      this.stopNextSpawn = true;
      this.itemUses.stop -= 1;
      return true;
    }

    if (!this.isInsideBoard(row, col) || !this.hasBall(row, col)) return false;

    if (type === "hammer") {
      this.board[row][col] = null;
    } else if (type === "rainbow") {
      if (this.board[row][col] === this.wildcard.value) return false;
      this.board[row][col] = this.wildcard.value;
    } else {
      return false;
    }

    this.itemUses[type] -= 1;
    this.selected = null;
    return true;
  }

  shouldSkipSpawn() {
    if (!this.stopNextSpawn) return false;

    this.stopNextSpawn = false;
    return true;
  }

  randomColor() {
    if (Math.random() < this.config.wildcardChance) {
      return this.wildcard.value;
    }

    return this.colors[Math.floor(Math.random() * this.colors.length)];
  }

  randomColors(count) {
    return Array.from({ length: count }, () => this.randomColor());
  }

  hasBall(row, col) {
    return Boolean(this.board[row][col]);
  }

  select(row, col) {
    this.selected = { row, col };
  }

  beginMove(targetRow, targetCol) {
    if (!this.selected) return null;

    const { row: startRow, col: startCol } = this.selected;
    const path = this.findPath(startRow, startCol, targetRow, targetCol);

    if (!path) return null;

    const move = {
      color: this.board[startRow][startCol],
      path,
      target: { row: targetRow, col: targetCol },
    };

    this.board[startRow][startCol] = null;
    this.selected = null;

    return move;
  }

  completeMove({ color, target }) {
    this.board[target.row][target.col] = color;
  }

  findPath(startRow, startCol, targetRow, targetCol) {
    const { boardSize } = this.config;
    const queue = [{
      row: startRow,
      col: startCol,
      path: [{ row: startRow, col: startCol }],
    }];
    const visited = Array.from(
      { length: boardSize },
      () => Array(boardSize).fill(false),
    );

    visited[startRow][startCol] = true;

    while (queue.length) {
      const current = queue.shift();

      if (current.row === targetRow && current.col === targetCol) {
        return current.path;
      }

      for (const [rowDelta, colDelta] of MOVE_DIRECTIONS) {
        const row = current.row + rowDelta;
        const col = current.col + colDelta;

        if (!this.isInsideBoard(row, col) || visited[row][col]) continue;
        if (this.board[row][col] && !(row === targetRow && col === targetCol)) {
          continue;
        }

        visited[row][col] = true;
        queue.push({
          row,
          col,
          path: [...current.path, { row, col }],
        });
      }
    }

    return null;
  }

  spawnNextBalls() {
    for (const color of this.nextColors) {
      const emptyCells = this.getEmptyCells();
      if (!emptyCells.length) break;

      const target = this.pickRandom(emptyCells);
      this.board[target.row][target.col] = color;
    }
  }

  refreshNextColors() {
    this.nextColors = this.randomColors(this.config.spawnCount);
  }

  placeRandomBalls(count) {
    for (let index = 0; index < count; index += 1) {
      const emptyCells = this.getEmptyCells();
      if (!emptyCells.length) return;

      const target = this.pickRandom(emptyCells);
      this.board[target.row][target.col] = this.randomColor();
    }
  }

  getEmptyCells() {
    const emptyCells = [];
    const { boardSize } = this.config;

    for (let row = 0; row < boardSize; row += 1) {
      for (let col = 0; col < boardSize; col += 1) {
        if (!this.board[row][col]) emptyCells.push({ row, col });
      }
    }

    return emptyCells;
  }

  findCompletedLines() {
    const completed = new Set();
    const { boardSize, lineLength } = this.config;

    for (let row = 0; row < boardSize; row += 1) {
      for (let col = 0; col < boardSize; col += 1) {
        for (const [rowDelta, colDelta] of LINE_DIRECTIONS) {
          const cells = [];

          for (let step = 0; step < lineLength; step += 1) {
            const currentRow = row + rowDelta * step;
            const currentCol = col + colDelta * step;

            if (
              !this.isInsideBoard(currentRow, currentCol)
              || !this.board[currentRow][currentCol]
            ) {
              cells.length = 0;
              break;
            }

            cells.push({
              row: currentRow,
              col: currentCol,
              color: this.board[currentRow][currentCol],
            });
          }

          if (cells.length !== lineLength || !this.isWildcardLine(cells)) {
            continue;
          }

          for (const cell of cells) {
            completed.add(`${cell.row},${cell.col}`);
          }
        }
      }
    }

    return [...completed].map((key) => {
      const [row, col] = key.split(",").map(Number);
      return { row, col };
    });
  }

  isWildcardLine(cells) {
    const fixedColors = new Set(
      cells
        .map(({ color }) => color)
        .filter((color) => color !== this.wildcard.value),
    );

    return fixedColors.size <= 1;
  }

  removeCells(cells) {
    for (const { row, col } of cells) {
      this.board[row][col] = null;
    }

    this.score += this.calculateScore(cells.length);
  }

  calculateScore(count) {
    if (count <= this.config.lineLength) return count * 2;
    return this.config.lineLength * 2 + (count - this.config.lineLength) * 3;
  }

  isGameOver() {
    return this.getEmptyCells().length === 0;
  }

  isInsideBoard(row, col) {
    const { boardSize } = this.config;
    return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
  }

  pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
  }
}

window.ColorLinesGame = ColorLinesGame;
})();
