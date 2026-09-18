(function initializeApp() {
const { GAME_CONFIG, WILDCARD_BALL } = window.ColorLinesConfig;
const { ColorLinesGame } = window;

class ColorLinesApp {
  constructor() {
    this.game = new ColorLinesGame();
    this.busy = false;
    this.bestScore = this.loadBestScore();
    this.elements = {
      board: document.getElementById("board"),
      score: document.getElementById("score"),
      best: document.getElementById("best"),
      nextBalls: document.getElementById("nextBalls"),
      gameOver: document.getElementById("gameOver"),
      finalScore: document.getElementById("finalScore"),
      restartButton: document.getElementById("restartButton"),
      gameOverRestart: document.getElementById("gameOverRestart"),
    };

    this.elements.restartButton.addEventListener("click", () => this.start());
    this.elements.gameOverRestart.addEventListener("click", () => this.start());
  }

  start() {
    this.game.reset();
    this.busy = false;
    this.elements.gameOver.classList.remove("show");
    this.updateStatus();
    this.renderBoard();
  }

  renderBoard() {
    const { boardSize } = this.game.config;
    this.elements.board.innerHTML = "";

    for (let row = 0; row < boardSize; row += 1) {
      for (let col = 0; col < boardSize; col += 1) {
        const cell = document.createElement("div");
        const color = this.game.board[row][col];

        cell.className = "cell";
        cell.dataset.row = row;
        cell.dataset.col = col;

        if (this.isSelected(row, col)) cell.classList.add("selected");
        if (color) cell.appendChild(this.createBall(color));

        cell.addEventListener("click", () => this.handleCellClick(row, col));
        this.elements.board.appendChild(cell);
      }
    }
  }

  async handleCellClick(row, col) {
    if (this.busy) return;

    if (this.game.hasBall(row, col)) {
      this.game.select(row, col);
      this.renderBoard();
      return;
    }

    if (!this.game.selected) return;

    const move = this.game.beginMove(row, col);
    if (!move) {
      this.showBlockedSelection();
      return;
    }

    this.busy = true;

    try {
      await this.animateMovement(move.path, move.color);
      this.game.completeMove(move);
      this.renderBoard();

      const removed = await this.removeCompletedLines();

      if (!removed) {
        this.game.spawnNextBalls();
        this.renderBoard();
        await this.removeCompletedLines();
        this.game.refreshNextColors();
      }

      this.updateStatus();

      if (this.game.isGameOver()) this.endGame();
    } finally {
      this.busy = false;
    }
  }

  async animateMovement(path, color) {
    for (let index = 1; index < path.length; index += 1) {
      this.renderBoard();

      const { row, col } = path[index];
      const cellIndex = row * this.game.config.boardSize + col;
      const cell = this.elements.board.children[cellIndex];

      cell.appendChild(this.createBall(color));
      cell.classList.add("path");

      await this.sleep(this.game.config.moveStepDuration);
    }
  }

  async removeCompletedLines() {
    const completed = this.game.findCompletedLines();
    if (!completed.length) return false;

    for (const { row, col } of completed) {
      const index = row * this.game.config.boardSize + col;
      this.elements.board.children[index]?.classList.add("removing");
    }

    await this.sleep(this.game.config.removeDuration);
    this.game.removeCells(completed);
    this.updateBestScore();
    this.renderBoard();
    this.updateStatus();

    return true;
  }

  endGame() {
    this.updateBestScore();
    this.elements.finalScore.textContent = this.game.score;
    this.elements.gameOver.classList.add("show");
    this.updateStatus();
  }

  updateStatus() {
    this.elements.score.textContent = this.game.score;
    this.elements.best.textContent = this.bestScore;
    this.elements.nextBalls.innerHTML = "";

    for (const color of this.game.nextColors) {
      this.elements.nextBalls.appendChild(this.createBall(color, "mini-ball"));
    }
  }

  updateBestScore() {
    if (this.game.score <= this.bestScore) return;

    this.bestScore = this.game.score;
    localStorage.setItem(
      GAME_CONFIG.bestScoreStorageKey,
      String(this.bestScore),
    );
  }

  loadBestScore() {
    const savedScore = Number(
      localStorage.getItem(GAME_CONFIG.bestScoreStorageKey) || 0,
    );

    return Number.isFinite(savedScore) ? savedScore : 0;
  }

  createBall(color, className = "ball") {
    const ball = document.createElement("div");
    const face = document.createElement("span");
    ball.className = className;
    face.className = "face";
    face.setAttribute("aria-hidden", "true");
    face.innerHTML = `
      <span class="eye eye-left"><span class="pupil"></span></span>
      <span class="eye eye-right"><span class="pupil"></span></span>
      <span class="cheek cheek-left"></span>
      <span class="cheek cheek-right"></span>
      <span class="mouth"></span>
    `;
    ball.appendChild(face);
    ball.addEventListener("pointermove", (event) => this.updateGaze(event, ball));
    ball.addEventListener("pointerleave", () => this.clearGaze(ball));

    if (color === WILDCARD_BALL.value) {
      ball.classList.add("wildcard");
      ball.style.backgroundColor = WILDCARD_BALL.color;
    } else {
      ball.style.backgroundColor = color;
    }

    return ball;
  }

  updateGaze(event, ball) {
    if (event.pointerType === "touch") return;

    const bounds = ball.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - .5;
    const vertical = (event.clientY - bounds.top) / bounds.height - .5;

    ball.style.setProperty("--look-x", `${horizontal * 4}px`);
    ball.style.setProperty("--look-y", `${vertical * 3}px`);
  }

  clearGaze(ball) {
    ball.style.removeProperty("--look-x");
    ball.style.removeProperty("--look-y");
  }

  showBlockedSelection() {
    const { row, col } = this.game.selected;
    const index = row * this.game.config.boardSize + col;
    const cell = this.elements.board.children[index];

    cell?.classList.add("blocked");
    setTimeout(() => cell?.classList.remove("blocked"), 280);
  }

  isSelected(row, col) {
    return this.game.selected?.row === row && this.game.selected?.col === col;
  }

  sleep(duration) {
    return new Promise((resolve) => setTimeout(resolve, duration));
  }
}

new ColorLinesApp().start();
})();
