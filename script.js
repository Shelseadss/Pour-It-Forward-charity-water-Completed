/* Game Rules:

The scoring rules are:

+5 points for each newly reached pipe.
Each pipe can only award points once.
+50 points when the community fountain is reached.
The score updates immediately on the page.
Initially connected tiles do not award points before the player makes a move.


*/

const levels = [
  {
    id: 1,
    location: "Dhaka",
    description: "Build a reliable path to bring clean water to the community.",
    difficulty: "Beginner",
    timeLimit: 30,
    scoreMultiplier: 1,
    columns: 6,
    rows: 4,
    startTile: 1,
    goalTile: 24,
    tiles: [
      { connections: ["left", "right"] },
      { connections: ["left", "right"] },
      { connections: ["right", "bottom"] },
      { connections: ["top", "bottom"] },
      { connections: ["right", "top"] },
      { connections: ["left", "right"] },
      { connections: ["right", "bottom"] },
      { connections: ["top", "bottom"] },
      { connections: ["top", "bottom"] },
      { connections: ["left", "bottom"] },
      { connections: ["left", "right"] },
      { connections: ["left", "top"] },
      { connections: ["left", "right"] },
      { connections: ["right", "top"] },
      { connections: ["left", "right"] },
      { connections: ["left", "top"] },
      { connections: ["top", "bottom"] },
      { connections: ["right", "bottom"] },
      { connections: ["left", "right"] },
      { connections: ["left", "top"] },
      { connections: ["right", "top"] },
      { connections: ["left", "right"] },
      { connections: ["left", "right"] },
      { connections: ["left", "right"] },
    ]
  },
  {
    id: 2,
    location: "Nairobi",
    description: "Connect the pipes to bring water to the community.",
    difficulty: "Intermediate",
    timeLimit: 35,
    scoreMultiplier: 1.2,
    columns: 6,
    rows: 4,
    startTile: 1,
    goalTile: 24,
    tiles: [
      { connections: ["left", "right"] },
      { connections: ["top", "bottom"] },
      { connections: ["left", "right"] },
      { connections: ["top", "bottom"] },
      { connections: ["left", "right"] },
      { connections: ["right", "top"] },
      { connections: ["right", "bottom"] },
      { connections: ["left", "right"] },
      { connections: ["left", "top"] },
      { connections: ["top", "bottom"] },
      { connections: ["right", "bottom"] },
      { connections: ["left", "right"] },
      { connections: ["top", "bottom"] },
      { connections: ["right", "top"] },
      { connections: ["left", "right"] },
      { connections: ["left", "top"] },
      { connections: ["right", "bottom"] },
      { connections: ["left", "right"] },
      { connections: ["top", "bottom"] },
      { connections: ["right", "top"] },
      { connections: ["right", "bottom"] },
      { connections: ["top", "bottom"] },
      { connections: ["left", "top"] },
      { connections: ["right", "top"] },
    ]
  }
];

// The DOM is a rendering target. Game state lives here so resetting a level is predictable.
const state = {
  levelIndex: 0,
  score: 0,
  timeLeft: 0,
  timerId: null,
  hasWon: false,
  isPlaying: false,
  tiles: [],
  scoredTiles: new Set()
};

const highestUnlockedLevelKey = "pourItForward.highestUnlockedLevel";
const completedLevelsKey = "pourItForward.completedLevels";

const elements = {
  mapScreen: document.querySelector("#map-screen"),
  levelMap: document.querySelector("#level-map"),
  puzzleGrid: document.querySelector("#puzzle-grid"),
  levelLocation: document.querySelector("#level-location"),
  levelTitle: document.querySelector("#level-title"),
  levelProgress: document.querySelector("#level-progress"),
  gameMessage: document.querySelector("#game-message"),
  score: document.querySelector("#score"),
  timer: document.querySelector("#timer"),
  gameplayScreen: document.querySelector("#gameplay-screen"),
  startScreen: document.querySelector("#start-screen"),
  startLocation: document.querySelector("#start-location"),
  startTitle: document.querySelector("#start-title"),
  startDescription: document.querySelector("#start-description"),
  startDifficulty: document.querySelector("#start-difficulty"),
  nextLevelButton: document.querySelector("#next-level-button")
};

const directions = {
  top: { row: -1, column: 0, opposite: "bottom" },
  right: { row: 0, column: 1, opposite: "left" },
  bottom: { row: 1, column: 0, opposite: "top" },
  left: { row: 0, column: -1, opposite: "right" }
};

const clockwiseDirection = {
  top: "right",
  right: "bottom",
  bottom: "left",
  left: "top"
};

const pipeSymbols = {
  "left right": "─",
  "top bottom": "│",
  "right bottom": "┌",
  "left bottom": "┐",
  "left top": "┘",
  "right top": "└"
};

function getCurrentLevel() {
  return levels[state.levelIndex];
}

function getHighestUnlockedLevel() {
  const savedLevel = Number(localStorage.getItem(highestUnlockedLevelKey));
  return Number.isInteger(savedLevel) && savedLevel >= 1
    ? Math.min(savedLevel, levels.length)
    : 1;
}

function getCompletedLevels() {
  try {
    const savedLevels = JSON.parse(localStorage.getItem(completedLevelsKey) || "[]");
    return Array.isArray(savedLevels)
      ? new Set(savedLevels.filter((levelId) => Number.isInteger(levelId)))
      : new Set();
  } catch (error) {
    console.error("Unable to load completed levels.", error);
    return new Set();
  }
}

function saveLevelProgress() {
  const level = getCurrentLevel();
  const completedLevels = getCompletedLevels();
  completedLevels.add(level.id);
  localStorage.setItem(completedLevelsKey, JSON.stringify([...completedLevels]));

  const nextLevel = Math.min(level.id + 1, levels.length);
  localStorage.setItem(
    highestUnlockedLevelKey,
    String(Math.max(getHighestUnlockedLevel(), nextLevel))
  );
}

function renderLevelMap() {
  const highestUnlockedLevel = getHighestUnlockedLevel();
  const completedLevels = getCompletedLevels();
  elements.levelMap.replaceChildren();

  levels.forEach((level) => {
    // The same loop written with for would be:
    // for (let index = 0; index < levels.length; index += 1) {
    //   const level = levels[index];
    //   // Put the loop body here.
    // }
    // A while version would be:
    // let index = 0;
    // while (index < levels.length) {
    //   const level = levels[index];
    //   // Put the loop body here.
    //   index += 1;
    // }
    const isCompleted = completedLevels.has(level.id);
    const isUnlocked = level.id <= highestUnlockedLevel;
    const status = isCompleted ? "Completed" : isUnlocked ? "Unlocked" : "Locked";
    const button = document.createElement("button");

    button.type = "button";
    button.className = `level-map-button ${status.toLowerCase()}`;
    button.disabled = !isUnlocked;
    button.innerHTML = `
      <strong>Level ${level.id}</strong>
      <span>${level.location}</span>
      <span>${level.description}</span>
      <span>${level.difficulty} · ${level.timeLimit}s</span>
      <span>${level.scoreMultiplier}× score</span>
      <span class="level-map-status">${status}</span>
    `;

    if (isUnlocked) {
      button.addEventListener("click", () => openLevel(level.id - 1));
    }
    elements.levelMap.appendChild(button);
  });
}

function updateLevelDetails(level) {
  const levelLabel = `Level ${level.id}`;
  elements.levelLocation.textContent = level.location;
  elements.levelTitle.textContent = levelLabel;
  elements.levelProgress.textContent = `${levelLabel}/${levels.length}`;
  elements.startLocation.textContent = level.location;
  elements.startTitle.textContent = levelLabel;
  elements.startDescription.textContent = level.description;
  elements.startDifficulty.textContent =
    `${level.difficulty} · ${level.timeLimit} seconds · ${level.scoreMultiplier}× score`;
}

function getPipeSymbol(connections) {
  return pipeSymbols[connections.join(" ")] || "?";
}

function renderBoard(level) {
  elements.puzzleGrid.replaceChildren();
  elements.puzzleGrid.style.setProperty("--board-columns", level.columns);

  state.tiles = level.tiles.map((tileData, index) => ({
    number: index + 1,
    connections: [...tileData.connections],
    initialConnections: [...tileData.connections]
  }));

  state.tiles.forEach((tileState) => {
    // The same loop written with for would be:
    // for (let index = 0; index < state.tiles.length; index += 1) {
    //   const tileState = state.tiles[index];
    //   // Create and append the button here.
    // }
    // A while version would be:
    // let index = 0;
    // while (index < state.tiles.length) {
    //   const tileState = state.tiles[index];
    //   // Create and append the button here.
    //   index += 1;
    // }
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "pipe-cell";
    tile.disabled = true;
    tile.dataset.tile = String(tileState.number);
    tile.setAttribute("aria-label", `Pipe tile ${tileState.number}`);
    tile.textContent = getPipeSymbol(tileState.connections);
    elements.puzzleGrid.appendChild(tile);
  });
}

function renderStatus() {
  elements.score.textContent = `Score: ${state.score}`;
  elements.timer.textContent = `Time: ${state.timeLeft}`;
}

function getTileElement(tileNumber) {
  return elements.puzzleGrid.querySelector(`[data-tile="${tileNumber}"]`);
}

function getTileState(tileNumber) {
  return state.tiles[tileNumber - 1];
}

function getTileNumber(row, column) {
  const level = getCurrentLevel();
  if (row < 0 || column < 0 || column >= level.columns || row >= level.rows) {
    return null;
  }

  const tileNumber = row * level.columns + column + 1;
  return tileNumber <= level.tiles.length ? tileNumber : null;
}

function findConnectedTiles() {
  const level = getCurrentLevel();
  const start = level.startTile;
  const connectedTiles = new Set();
  const tilesToCheck = [start];

  while (tilesToCheck.length > 0) {
    const tileNumber = tilesToCheck.shift();
    if (!tileNumber || connectedTiles.has(tileNumber)) {
      continue;
    }

    connectedTiles.add(tileNumber);
    const tile = getTileState(tileNumber);
    const row = Math.floor((tileNumber - 1) / level.columns);
    const column = (tileNumber - 1) % level.columns;

    tile.connections.forEach((direction) => {
      // The same loop written with for would be:
      // for (let index = 0; index < tile.connections.length; index += 1) {
      //   const direction = tile.connections[index];
      //   // Check this direction here.
      // }
      // A while version would be:
      // let index = 0;
      // while (index < tile.connections.length) {
      //   const direction = tile.connections[index];
      //   // Check this direction here.
      //   index += 1;
      // }
      const change = directions[direction];
      const neighborNumber = getTileNumber(row + change.row, column + change.column);
      const neighbor = neighborNumber && getTileState(neighborNumber);

      if (neighbor && neighbor.connections.includes(change.opposite)) {
        tilesToCheck.push(neighborNumber);
      }
    });
  }

  return connectedTiles;
}

function updateConnectedStyles(shouldAwardPoints = false) {
  const connectedTiles = findConnectedTiles();
  const level = getCurrentLevel();

  if (shouldAwardPoints) {
    connectedTiles.forEach((tileNumber) => {
      // The same loop written with for...of would be:
      // for (const tileNumber of connectedTiles) {
      //   // Award points for this tile here.
      // }
      // A while version would first convert the Set to an array:
      // const tiles = [...connectedTiles];
      // let index = 0;
      // while (index < tiles.length) {
      //   const tileNumber = tiles[index];
      //   // Award points for this tile here.
      //   index += 1;
      // }
      if (!state.scoredTiles.has(tileNumber)) {
        state.scoredTiles.add(tileNumber);
        state.score += Math.round(5 * level.scoreMultiplier);
      }
    });
    renderStatus();
  }

  state.tiles.forEach((tile) => {
    // The same loop written with for would be:
    // for (let index = 0; index < state.tiles.length; index += 1) {
    //   const tile = state.tiles[index];
    //   // Update this tile's connected style here.
    // }
    // A while version would be:
    // let index = 0;
    // while (index < state.tiles.length) {
    //   const tile = state.tiles[index];
    //   // Update this tile's connected style here.
    //   index += 1;
    // }
    getTileElement(tile.number).classList.toggle("connected", connectedTiles.has(tile.number));
  });

  if (connectedTiles.has(level.goalTile) && !state.hasWon) {
    endGame("You reached the community fountain!", true);
  }
}

function rotateTile(tileNumber) {
  if (!state.isPlaying || state.hasWon || state.timeLeft <= 0) {
    return;
  }

  const tileState = getTileState(tileNumber);
  const tile = getTileElement(tileNumber);
  tileState.connections = tileState.connections.map(
    (connection) => clockwiseDirection[connection]
  );
  tile.textContent = getPipeSymbol(tileState.connections);
  updateConnectedStyles(true);
}

function setBoardEnabled(enabled) {
  state.tiles.forEach((tile) => {
    // The same loop written with for would be:
    // for (let index = 0; index < state.tiles.length; index += 1) {
    //   const tile = state.tiles[index];
    //   // Enable or disable this tile here.
    // }
    // A while version would be:
    // let index = 0;
    // while (index < state.tiles.length) {
    //   const tile = state.tiles[index];
    //   // Enable or disable this tile here.
    //   index += 1;
    // }
    getTileElement(tile.number).disabled = !enabled;
  });
}

function stopTimer() {
  window.clearInterval(state.timerId);
  state.timerId = null;
}

function endGame(message, won = false) {
  stopTimer();
  state.isPlaying = false;
  state.hasWon = won;
  elements.gameMessage.textContent = message;
  elements.gameMessage.classList.toggle("win-message", won);
  elements.gameMessage.classList.toggle("lose-message", !won);
  setBoardEnabled(false);

  if (won) {
    state.score += Math.round(50 * getCurrentLevel().scoreMultiplier);
    renderStatus();
    launchConfetti();
    saveLevelProgress();
    renderLevelMap();
    if (state.levelIndex < levels.length - 1) {
      elements.nextLevelButton.classList.remove("is-hidden");
    }
  }
}

function startTimer() {
  stopTimer();
  state.timerId = window.setInterval(() => {
    state.timeLeft -= 1;
    renderStatus();
    if (state.timeLeft <= 0) {
      endGame("Time is up! Try again.");
    }
  }, 1000);
}

function startLevel() {
  state.isPlaying = true;
  elements.startScreen.classList.add("is-hidden");
  setBoardEnabled(true);
  startTimer();
}

function resetLevel() {
  const level = getCurrentLevel();
  stopTimer();
  state.score = 0;
  state.timeLeft = level.timeLimit;
  state.hasWon = false;
  state.isPlaying = true;
  state.scoredTiles.clear();
  elements.nextLevelButton.classList.add("is-hidden");
  elements.gameMessage.textContent = "Tap or click a pipe to rotate it and connect the water.";
  elements.gameMessage.classList.remove("win-message", "lose-message");

  state.tiles.forEach((tile) => {
    // The same loop written with for would be:
    // for (let index = 0; index < state.tiles.length; index += 1) {
    //   const tile = state.tiles[index];
    //   // Reset this tile here.
    // }
    // A while version would be:
    // let index = 0;
    // while (index < state.tiles.length) {
    //   const tile = state.tiles[index];
    //   // Reset this tile here.
    //   index += 1;
    // }
    tile.connections = [...tile.initialConnections];
    const element = getTileElement(tile.number);
    element.textContent = getPipeSymbol(tile.connections);
    element.classList.remove("connected");
  });

  renderStatus();
  state.scoredTiles = findConnectedTiles();
  updateConnectedStyles();
  setBoardEnabled(true);
  startTimer();
}

function loadLevel(levelIndex, startImmediately = true) {
  stopTimer();
  state.levelIndex = levelIndex;
  state.score = 0;
  state.timeLeft = getCurrentLevel().timeLimit;
  state.hasWon = false;
  state.isPlaying = false;
  state.scoredTiles.clear();
  elements.nextLevelButton.classList.add("is-hidden");
  elements.gameMessage.textContent = "Tap or click a pipe to rotate it and connect the water.";
  elements.gameMessage.classList.remove("win-message", "lose-message");

  updateLevelDetails(getCurrentLevel());
  renderBoard(getCurrentLevel());
  renderStatus();
  updateConnectedStyles();
  state.scoredTiles = findConnectedTiles();

  if (startImmediately) {
    startLevel();
  }
}

function showMap() {
  stopTimer();
  state.isPlaying = false;
  elements.mapScreen.style.display = "block";
  elements.gameplayScreen.style.display = "none";
  elements.startScreen.classList.add("is-hidden");
  renderLevelMap();
}

function openLevel(levelIndex) {
  const level = levels[levelIndex];
  if (!level || level.id > getHighestUnlockedLevel()) {
    return;
  }

  loadLevel(levelIndex, false);
  elements.mapScreen.style.display = "none";
  elements.gameplayScreen.style.display = "block";
  elements.startScreen.classList.remove("is-hidden");
}

function launchConfetti() {
  const container = document.createElement("div");
  const colors = ["#ffc907", "#003366", "#77a8bb", "#bf6c46"];
  container.className = "confetti-container";
  container.setAttribute("aria-hidden", "true");

  for (let index = 0; index < 60; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    piece.style.animationDuration = `${2.5 + Math.random() * 1.5}s`;
    container.appendChild(piece);
  }

  document.body.appendChild(container);
  window.setTimeout(() => container.remove(), 4500);
}

// Event delegation keeps the board interaction in one place, even when tiles are rebuilt.
elements.puzzleGrid.addEventListener("click", (event) => {
  const tile = event.target.closest(".pipe-cell");
  if (tile) {
    rotateTile(Number(tile.dataset.tile));
  }
});

document.querySelector("#restart-button").addEventListener("click", resetLevel);
document.querySelector("#start-button").addEventListener("click", startLevel);
document.querySelector("#back-to-map-button").addEventListener("click", showMap);
document.querySelector("#start-back-to-map-button").addEventListener("click", showMap);
elements.nextLevelButton.addEventListener("click", () => loadLevel(state.levelIndex + 1));

// Render the first board once, then show the map as the initial screen.
loadLevel(0, false);
showMap();
