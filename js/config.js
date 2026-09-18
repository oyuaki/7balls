window.ColorLinesConfig = Object.freeze({
  GAME_CONFIG: Object.freeze({
    boardSize: 9,
    lineLength: 5,
    initialBalls: 5,
    spawnCount: 3,
    moveStepDuration: 38,
    removeDuration: 200,
    wildcardChance: 0.06,
    bestScoreStorageKey: "colorLinesBest",
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
