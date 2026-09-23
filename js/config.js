window.ColorLinesConfig = Object.freeze({
  GAME_CONFIG: Object.freeze({
    boardSize: 9,
    lineLength: 5,
    initialBalls: 5,
    spawnCount: 3,
    moveStepDuration: 38,
    removeDuration: 200,
    wildcardChance: 0.03,
    bestScoreStorageKey: "colorLinesBest",
    itemLimits: Object.freeze({
      hammer: 2,
      rainbow: 2,
      stop: 1,
    }),
  }),

  ITEMS: Object.freeze({
    hammer: Object.freeze({
      icon: "🔨",
      label: "鐵鎚",
      description: "移除一顆球",
      needsTarget: true,
    }),
    rainbow: Object.freeze({
      icon: "🌈",
      label: "彩虹",
      description: "把球變成萬用球",
      needsTarget: true,
    }),
    stop: Object.freeze({
      icon: "⏸",
      label: "暫停",
      description: "跳過下一次補球",
      needsTarget: false,
    }),
  }),

  WILDCARD_BALL: Object.freeze({
    value: "__wildcard__",
    color: "#f5fbff",
  }),

  BALL_COLORS: Object.freeze([
    "#f20b0b",
    "#3948df",
    "#00df2a",
    "#ed8405",
    "#9e00ca",
    "#f4ec00",
    "#72cdea",
  ]),
});
