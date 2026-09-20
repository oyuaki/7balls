(function initializeApp() {
const { GAME_CONFIG, ITEMS, WILDCARD_BALL } = window.ColorLinesConfig;
const { ColorLinesGame } = window;

class ColorLinesApp {
  constructor() {
    this.game = new ColorLinesGame();
    this.busy = false;
    this.activeItem = null;
    this.noticeTimer = null;
    this.bestScore = this.loadBestScore();
    this.elements = {
      board: document.getElementById("board"),
      score: document.getElementById("score"),
      best: document.getElementById("best"),
      nextBalls: document.getElementById("nextBalls"),
      itemButtons: document.getElementById("itemButtons"),
      itemHint: document.getElementById("itemHint"),
      gameOver: document.getElementById("gameOver"),
      finalScore: document.getElementById("finalScore"),
      restartButton: document.getElementById("restartButton"),
      gameOverRestart: document.getElementById("gameOverRestart"),
    };

    this.elements.restartButton.addEventListener("click", () => this.start());
    this.elements.gameOverRestart.addEventListener("click", () => this.start());
    this.renderItemButtons();
  }

  start() {
    this.game.reset();
    this.busy = false;
    this.activeItem = null;
    clearTimeout(this.noticeTimer);
    this.elements.itemHint.textContent = "每局限量使用";
    this.elements.itemHint.classList.remove("show");
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
        if (this.activeItem && color) cell.classList.add("item-target");
        if (color) cell.appendChild(this.createBall(color));

        cell.addEventListener("click", () => this.handleCellClick(row, col));
        this.elements.board.appendChild(cell);
      }
    }
  }

  async handleCellClick(row, col) {
    if (this.busy) return;

    if (this.activeItem) {
      await this.useTargetItem(row, col);
      return;
    }

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
        if (this.game.shouldSkipSpawn()) {
          this.showItemNotice("已跳過這次補球！");
        } else {
          this.game.spawnNextBalls();
          this.renderBoard();
          await this.removeCompletedLines();
          this.game.refreshNextColors();
        }
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

    this.updateItemButtons();
  }

  renderItemButtons() {
    this.elements.itemButtons.innerHTML = "";

    for (const [type, item] of Object.entries(ITEMS)) {
      const button = document.createElement("button");
      button.className = "item-button";
      button.type = "button";
      button.dataset.item = type;
      button.title = item.description;
      button.setAttribute("aria-label", `${item.label}：${item.description}`);
      button.innerHTML = `
        <span class="item-icon" aria-hidden="true">${item.icon}</span>
        <span class="item-name">${item.label}</span>
        <span class="item-count" aria-hidden="true"></span>
      `;
      button.addEventListener("click", () => this.handleItemClick(type));
      this.elements.itemButtons.appendChild(button);
    }
  }

  handleItemClick(type) {
    if (this.busy || !this.game.canUseItem(type)) return;

    const item = ITEMS[type];
    if (!item.needsTarget) {
      if (this.game.useItem(type)) {
        this.activeItem = null;
        this.game.selected = null;
        this.showItemNotice("下次補球已暫停");
        this.renderBoard();
        this.updateStatus();
      } else {
        this.showItemNotice("暫停效果已經啟動");
      }
      return;
    }

    this.activeItem = this.activeItem === type ? null : type;
    this.game.selected = null;
    this.renderBoard();
    this.updateItemButtons();

    this.elements.itemHint.textContent = this.activeItem
      ? `${item.icon} 選擇一顆球`
      : "已取消選擇";
  }

  async useTargetItem(row, col) {
    const type = this.activeItem;

    if (!this.game.hasBall(row, col)) {
      this.showItemNotice("請選擇一顆球");
      return;
    }

    if (!this.game.useItem(type, row, col)) {
      this.showItemNotice(type === "rainbow" ? "這已經是萬用球" : "無法使用道具");
      return;
    }

    this.activeItem = null;
    this.busy = true;
    this.renderBoard();
    this.updateStatus();
    this.showItemNotice(`${ITEMS[type].label}使用成功！`);

    try {
      if (type === "rainbow") await this.removeCompletedLines();
    } finally {
      this.busy = false;
    }
  }

  updateItemButtons() {
    for (const button of this.elements.itemButtons.children) {
      const { item: type } = button.dataset;
      const remaining = this.game.itemUses[type];
      const isActive = this.activeItem === type
        || (type === "stop" && this.game.stopNextSpawn);

      button.querySelector(".item-count").textContent = `×${remaining}`;
      button.classList.toggle("active", isActive);
      button.classList.toggle("effect-active", type === "stop" && this.game.stopNextSpawn);
      button.disabled = remaining === 0 || (type === "stop" && this.game.stopNextSpawn);
      button.setAttribute("aria-pressed", String(isActive));
      button.setAttribute(
        "aria-label",
        `${ITEMS[type].label}：${ITEMS[type].description}、剩餘${remaining}次`,
      );
    }
  }

  showItemNotice(message) {
    clearTimeout(this.noticeTimer);
    this.elements.itemHint.textContent = message;
    this.elements.itemHint.classList.add("show");

    this.noticeTimer = setTimeout(() => {
      this.elements.itemHint.textContent = "每局限量使用";
      this.elements.itemHint.classList.remove("show");
    }, 1800);
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
