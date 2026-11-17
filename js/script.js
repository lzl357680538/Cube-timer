const STORAGE_KEY = "cubeTimer.solveTimes.v1";
const EVENT_TYPES = [
  "2x2",
  "3x3",
  "3x3oh",
  "4x4",
  "5x5",
  "6x6",
  "7x7",
  "clock",
  "minx",
  "pyram",
  "skewb",
  "sq1",
];
const SCRAMBLE_BUFFER_SIZE = 10;

let solveTimesMap = {
  "2x2": [],
  "3x3": [],
  "3x3oh": [],
  "4x4": [],
  "5x5": [],
  "6x6": [],
  "7x7": [],
  clock: [],
  minx: [],
  pyram: [],
  skewb: [],
  sq1: [],
};
let timerState = "IDLE";
let startTime = 0;
let activeInterval = null;
let scrambleGenerationToken = 0;
let appInitialized = false;
const scrambleStateMap = Object.fromEntries(
  EVENT_TYPES.map((type) => [
    type,
    {
      scrambles: [],
      currentIndex: -1,
      filling: false,
    },
  ]),
);

function normalizeSq1Scramble(scramble) {
  return String(scramble || "")
    .replace(/`/g, "")
    .replace(/\s*\/\s*/g, "/ ")
    .trim();
}

function normalizeSolve(entry) {
  if (typeof entry === "number") {
    return { time: entry, penalty: "OK", createdAt: Date.now() };
  }
  return {
    time: Number(entry.time) || 0,
    penalty: ["OK", "+2", "DNF"].includes(entry.penalty) ? entry.penalty : "OK",
    createdAt: Number(entry.createdAt) || Date.now(),
  };
}

function loadStoredTimes() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored !== "object") return;
    EVENT_TYPES.forEach((type) => {
      solveTimesMap[type] = Array.isArray(stored[type])
        ? stored[type].map(normalizeSolve)
        : [];
    });
  } catch (e) {
    console.warn("Failed to load stored solve times", e);
  }
}

function saveStoredTimes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(solveTimesMap));
}

function generateScrambleStr(type) {
  const modifiers = ["", "'", "2"];
  let n = parseInt(type[0]);
  if (type === "3x3oh") n = 3;
  let scramble = [];
  let lastAxis = -1;
  if (n === 2) {
    const moves = ["U", "R", "F"];
    let lastMove = "";
    for (let i = 0; i < 11; i++) {
      let move = moves[Math.floor(Math.random() * moves.length)];
      while (move === lastMove)
        move = moves[Math.floor(Math.random() * moves.length)];
      scramble.push(
        move + modifiers[Math.floor(Math.random() * modifiers.length)],
      );
      lastMove = move;
    }
    return scramble.join(" ");
  }
  const axes = [
    ["U", "D"],
    ["F", "B"],
    ["L", "R"],
  ];
  let allowedMoves = [[], [], []];
  for (let i = 0; i < 3; i++) {
    for (let face of axes[i]) {
      allowedMoves[i].push(face);
      if (n >= 4) allowedMoves[i].push(face + "w");
      if (n >= 6) allowedMoves[i].push("3" + face + "w");
    }
  }
  const lengths = { 3: 20, 4: 45, 5: 60, 6: 80, 7: 100 };
  let len = lengths[n];
  for (let i = 0; i < len; i++) {
    let axis = Math.floor(Math.random() * 3);
    while (axis === lastAxis) axis = Math.floor(Math.random() * 3);
    let move =
      allowedMoves[axis][Math.floor(Math.random() * allowedMoves[axis].length)];
    scramble.push(
      move + modifiers[Math.floor(Math.random() * modifiers.length)],
    );
    lastAxis = axis;
  }
  return scramble.join(" ");
}

function generateAlienScramble(type) {
  const r = Math.random;
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  let res = [];
  if (type === "sq1") {
    for (let i = 0; i < 12; i++) {
      let top = Math.floor(r() * 12) - 5;
      let bot = Math.floor(r() * 12) - 5;
      if (top === 0 && bot === 0) top = 1;
      res.push(`(${top}, ${bot})`);
      res.push("/");
    }
    return res.join(" ");
  }
  if (type === "pyram") {
    const moves = ["U", "L", "R", "B"];
    const tips = ["u", "l", "r", "b"];
    const mods = ["", "'"];
    let last = "";
    for (let i = 0; i < 11; i++) {
      let m = pick(moves);
      while (m === last) m = pick(moves);
      res.push(m + pick(mods));
      last = m;
    }
    tips.forEach((t) => {
      if (r() < 0.5) res.push(t + pick(mods));
    });
    return res.join(" ");
  }
  if (type === "skewb") {
    const moves = ["U", "L", "R", "B"];
    const mods = ["", "'"];
    let last = "";
    for (let i = 0; i < 11; i++) {
      let m = pick(moves);
      while (m === last) m = pick(moves);
      res.push(m + pick(mods));
      last = m;
    }
    return res.join(" ");
  }
  if (type === "clock") {
    let pins = ["UR", "DR", "DL", "UL", "U", "R", "D", "L", "ALL"];
    pins.forEach((p) => {
      let v = Math.floor(r() * 12) - 5;
      res.push(p + Math.abs(v) + (v >= 0 ? "+" : "-"));
    });
    res.push("y2");
    ["U", "R", "D", "L", "ALL"].forEach((p) => {
      let v = Math.floor(r() * 12) - 5;
      res.push(p + Math.abs(v) + (v >= 0 ? "+" : "-"));
    });
    ["UR", "DR", "DL", "UL"].forEach((p) => {
      if (r() < 0.5) res.push(p);
    });
    return res.join(" ");
  }
  if (type === "minx") {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 10; j++) {
        let m = j % 2 === 0 ? "R" : "D";
        let dir = r() < 0.5 ? "++" : "--";
        res.push(m + dir);
      }
      res.push(r() < 0.5 ? "U" : "U'");
    }
    return res.join(" ");
  }
  return "";
}

function applyScramble(scrambleStr) {
  window.dispatchEvent(
    new CustomEvent("update-scramble", { detail: scrambleStr }),
  );
}

async function createScrambleForType(type) {
  if (type === "sq1") {
    if (window.CsTimerSq1 && window.CsTimerSq1.getRandomScramble) {
      const scramble = normalizeSq1Scramble(
        window.CsTimerSq1.getRandomScramble(),
      );
      if (scramble) return scramble;
    }
    if (window.getOfficialScramble) {
      const scramble = await window.getOfficialScramble(type);
      if (scramble) return scramble;
    }
    return generateAlienScramble(type);
  } else if (["clock", "minx", "pyram", "skewb"].includes(type)) {
    if (window.getOfficialScramble) {
      const scramble = await window.getOfficialScramble(type);
      if (scramble) return scramble;
    }
    return generateAlienScramble(type);
  }

  return generateScrambleStr(type);
}

function waitForBackgroundTurn() {
  return new Promise((resolve) => {
    if (window.requestIdleCallback)
      window.requestIdleCallback(resolve, { timeout: 150 });
    else setTimeout(resolve, 16);
  });
}
async function fillScrambleBuffer(type) {
  const state = scrambleStateMap[type];
  if (!state || state.filling) return;

  state.filling = true;
  try {
    while (
      state.scrambles.length < SCRAMBLE_BUFFER_SIZE ||
      state.scrambles.length <= state.currentIndex + SCRAMBLE_BUFFER_SIZE
    ) {
      // Let the current preview paint before preparing another cached scramble.
      await waitForBackgroundTurn();
      state.scrambles.push(await createScrambleForType(type));
    }
  } finally {
    state.filling = false;
    updateScrambleNavButtons();
  }
}

async function ensureVisibleScramble(type) {
  const state = scrambleStateMap[type];
  if (!state) return "";
  if (state.currentIndex >= 0 && state.scrambles[state.currentIndex]) {
    fillScrambleBuffer(type);
    return state.scrambles[state.currentIndex];
  }

  if (state.scrambles.length === 0) {
    state.scrambles.push(await createScrambleForType(type));
  }
  state.currentIndex = 0;
  fillScrambleBuffer(type);
  return state.scrambles[state.currentIndex];
}

function showScramble(scramble) {
  document.getElementById("displayText").innerText = scramble;
  const crossRes = document.getElementById("crossResult");
  if (crossRes) crossRes.innerText = "";
  applyScramble(scramble);
  updateScrambleNavButtons();
}

async function handleRandomScramble() {
  const type = document.getElementById("cubeType").value;
  const token = ++scrambleGenerationToken;
  const scramble = await ensureVisibleScramble(type);
  if (token !== scrambleGenerationToken || type !== getCurrentType()) return;
  showScramble(scramble);
}

async function stepScramble(direction, force = false) {
  if (!force && !canNavigateScrambles()) return;
  const token = ++scrambleGenerationToken;

  const type = getCurrentType();
  const state = scrambleStateMap[type];
  if (!state) return;

  if (state.currentIndex < 0) {
    await ensureVisibleScramble(type);
  }
  if (token !== scrambleGenerationToken || type !== getCurrentType()) return;

  if (direction < 0) {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      showScramble(state.scrambles[state.currentIndex]);
    }
    return;
  }

  const nextIndex = state.currentIndex + 1;
  if (!state.scrambles[nextIndex]) {
    state.scrambles.push(await createScrambleForType(type));
  }
  if (token !== scrambleGenerationToken || type !== getCurrentType()) return;
  state.currentIndex = nextIndex;
  showScramble(state.scrambles[state.currentIndex]);
  fillScrambleBuffer(type);
}

function canNavigateScrambles() {
  if (window.activeWorkspace === "lab") return false;
  if (timerState !== "IDLE" && timerState !== "STOPPED") return false;
  const active = document.activeElement;
  if (!active) return true;
  return (
    !document.querySelector("dialog[open]") &&
    !active.matches("input, select, textarea, button, a")
  );
}

function updateScrambleNavButtons() {
  const state = scrambleStateMap[getCurrentType()];
  const prevBtn = document.getElementById("prevScrambleBtn");
  const nextBtn = document.getElementById("nextScrambleBtn");
  const busy = !["IDLE", "STOPPED"].includes(timerState);
  if (prevBtn) prevBtn.disabled = busy || !state || state.currentIndex <= 0;
  if (nextBtn)
    nextBtn.disabled =
      busy ||
      !state ||
      (state.filling && !state.scrambles[state.currentIndex + 1]);
}

function getCurrentType() {
  return document.getElementById("cubeType").value;
}

function changeCubeType() {
  const type = getCurrentType();
  window.dispatchEvent(new CustomEvent("change-puzzle", { detail: type }));
  document.getElementById("crossControls").hidden = !["3x3", "3x3oh"].includes(
    type,
  );
  updateStatistics();
  handleRandomScramble();
}

function formatSolveTime(ms) {
  let totalSeconds = ms / 1000;
  let minutes = Math.floor(totalSeconds / 60);
  let seconds = (totalSeconds % 60).toFixed(3);
  return minutes > 0
    ? minutes + ":" + (seconds < 10 ? "0" : "") + seconds
    : seconds;
}

function getFinalTime(entry) {
  const solve = normalizeSolve(entry);
  if (solve.penalty === "DNF") return Infinity;
  return solve.time + (solve.penalty === "+2" ? 2000 : 0);
}

function formatSolveResult(entry) {
  const solve = normalizeSolve(entry);
  if (solve.penalty === "DNF") return "DNF";
  const finalTime = getFinalTime(solve);
  return solve.penalty === "+2"
    ? `${formatSolveTime(finalTime)} +2`
    : formatSolveTime(finalTime);
}

function calculateMean(arr) {
  const validTimes = arr.map(getFinalTime).filter(Number.isFinite);
  if (validTimes.length === 0) return "-";
  let sum = validTimes.reduce((a, b) => a + b, 0);
  return formatSolveTime(sum / validTimes.length);
}

function calculateAo12(arr) {
  if (arr.length < 12) return "-";
  let last12 = arr
    .slice(-12)
    .map(getFinalTime)
    .sort((a, b) => a - b);
  let middle = last12.slice(1, 11);
  if (middle.some((t) => !Number.isFinite(t))) return "DNF";
  let sum = middle.reduce((a, b) => a + b, 0);
  return formatSolveTime(sum / 10);
}

function updateStatistics() {
  const type = getCurrentType();
  const arr = solveTimesMap[type];
  document.getElementById("countDisplay").innerText = arr.length;
  document.getElementById("meanDisplay").innerText = calculateMean(arr);
  document.getElementById("ao12Display").innerText = calculateAo12(arr);
  let listHtml = "";
  arr.forEach((t, index) => {
    const solve = normalizeSolve(t);
    const penaltyClass =
      solve.penalty === "DNF"
        ? "dnf-result"
        : solve.penalty === "+2"
          ? "plus-two-result"
          : "";
    listHtml =
      `<li class="${penaltyClass}">
            <span>${index + 1}. ${formatSolveResult(solve)}</span>
            <div class="time-actions">
                <button class="${solve.penalty === "OK" ? "active" : ""}" onclick="setPenalty(${index}, 'OK'); this.blur();">OK</button>
                <button class="${solve.penalty === "+2" ? "active" : ""}" onclick="setPenalty(${index}, '+2'); this.blur();">+2</button>
                <button class="${solve.penalty === "DNF" ? "active" : ""}" onclick="setPenalty(${index}, 'DNF'); this.blur();">DNF</button>
                <button class="delete-btn" onclick="deleteTime(${index}); this.blur();">×</button>
            </div>
        </li>` + listHtml;
  });
  document.getElementById("timeList").innerHTML = listHtml;
  document.getElementById("emptyTimes").hidden = arr.length > 0;
}

function setPenalty(index, penalty) {
  const type = getCurrentType();
  solveTimesMap[type][index] = {
    ...normalizeSolve(solveTimesMap[type][index]),
    penalty,
  };
  saveStoredTimes();
  updateStatistics();
}

function deleteTime(index) {
  solveTimesMap[getCurrentType()].splice(index, 1);
  saveStoredTimes();
  updateStatistics();
}

function clearCurrentTimes() {
  const type = getCurrentType();
  if (confirm(`确定要清空该项目的所有成绩吗？`)) {
    solveTimesMap[type] = [];
    saveStoredTimes();
    updateStatistics();
  }
}

function setTimerClass(className) {
  const el = document.getElementById("timerDisplay");
  el.className = className || "";
  const labels = {
    ready: "松开空格，开始计时",
    running: "专注当下",
    stopped: "完成！继续下一次",
    inspecting: "观察中 · 按住空格准备",
    dnf: "观察结束，请重试",
  };
  document.getElementById("timerStatus").textContent =
    labels[className] || "准备好下一次突破";
  const busy = ["ready", "running", "inspecting"].includes(className);
  document.getElementById("cubeType").disabled = busy;
  document.getElementById("labTab").disabled = busy;
  document.getElementById("appearanceBtn").disabled = busy;
  updateScrambleNavButtons();
  fitTimerDisplay();
}

function getTimerBaseFontSize() {
  return window.matchMedia("(max-width: 480px)").matches ? 64 : 104;
}

function fitTimerDisplay() {
  const el = document.getElementById("timerDisplay");
  if (!el) return;

  const baseSize = getTimerBaseFontSize();
  const minSize = 28;
  el.style.fontSize = `${baseSize}px`;

  const available = el.clientWidth;
  if (available <= 0 || el.scrollWidth <= available) return;

  let fittedSize = Math.max(
    minSize,
    Math.floor((baseSize * available) / el.scrollWidth),
  );
  el.style.fontSize = `${fittedSize}px`;
  while (fittedSize > minSize && el.scrollWidth > available) {
    fittedSize -= 1;
    el.style.fontSize = `${fittedSize}px`;
  }
}

function setTimerText(value) {
  const el = document.getElementById("timerDisplay");
  if (!el) return;
  el.innerText = value;
  fitTimerDisplay();
}

function updateInspection() {
  let elapsed = performance.now() - startTime;
  let left = 15 - Math.floor(elapsed / 1000);
  if (left <= 0) {
    clearInterval(activeInterval);
    setTimerText("DNF");
    setTimerClass("dnf");
    timerState = "IDLE";
  } else if (timerState === "INSPECTING") {
    setTimerText(left);
  }
}

function solveCross() {
  const type = document.getElementById("cubeType").value;
  if (!["3x3", "3x3oh"].includes(type)) {
    document.getElementById("crossResult").innerText =
      "提示：目前仅支持 3x3x3 魔方的 Cross 求解。";
    return;
  }

  const currentScramble = document.getElementById("displayText").innerText;
  if (!currentScramble) {
    document.getElementById("crossResult").innerText =
      "请先生成或输入打乱公式！";
    return;
  }

  const color = document.getElementById("crossColor").value;
  document.getElementById("crossResult").innerText = "计算中...";

  setTimeout(() => {
    const start = performance.now();
    const solution = window.CrossSolver.solveBest(currentScramble, color);
    const timeTook = (performance.now() - start).toFixed(2);
    document.getElementById("crossResult").innerText =
      `${solution} (耗时: ${timeTook}ms)`;
  }, 10);
}

function updateTimer() {
  let currentTime = performance.now() - startTime;
  setTimerText(formatSolveTime(currentTime));
}

function isTimerControlBlockedTarget(target) {
  return (
    !!target &&
    !!target.closest(
      'button, a, input, select, textarea, [role="button"], twisty-player, #sq1Viewer, .playback-panel, dialog',
    )
  );
}

function pressTimerControl() {
  if (window.activeWorkspace === "lab") return;
  if (
    document.querySelector("dialog[open]") ||
    (document.activeElement &&
      document.activeElement.matches("input, select, textarea, button, a"))
  )
    return;
  if (document.activeElement) document.activeElement.blur();

  if (timerState === "IDLE") {
    timerState = "INSPECTING";
    setTimerClass("inspecting");
    setTimerText("15");
    startTime = performance.now();
    activeInterval = setInterval(updateInspection, 100);
  } else if (timerState === "INSPECTING") {
    timerState = "READY";
    setTimerClass("ready");
  } else if (timerState === "RUNNING") {
    clearInterval(activeInterval);
    timerState = "STOPPED";
    let finalTime = performance.now() - startTime;
    solveTimesMap[getCurrentType()].push({
      time: finalTime,
      penalty: "OK",
      createdAt: Date.now(),
    });
    setTimerText(formatSolveTime(finalTime));
    setTimerClass("stopped");
    saveStoredTimes();
    updateStatistics();
    stepScramble(1, true);
  }
}

function releaseTimerControl() {
  if (window.activeWorkspace === "lab") return;
  if (
    document.querySelector("dialog[open]") ||
    (document.activeElement &&
      document.activeElement.matches("input, select, textarea, button, a"))
  )
    return;

  if (timerState === "READY") {
    clearInterval(activeInterval);
    timerState = "RUNNING";
    setTimerClass("running");
    startTime = performance.now();
    activeInterval = setInterval(updateTimer, 10);
  } else if (timerState === "STOPPED") {
    timerState = "IDLE";
    setTimerClass("");
  }
}

window.addEventListener("keydown", (e) => {
  if (window.activeWorkspace === "lab") return;
  if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
    if (canNavigateScrambles()) {
      e.preventDefault();
      stepScramble(e.code === "ArrowLeft" ? -1 : 1);
    }
    return;
  }

  if (e.code === "Space") {
    if (
      document.querySelector("dialog[open]") ||
      document.activeElement.matches("input, select, textarea, button, a")
    )
      return;
    e.preventDefault();
    if (!e.repeat) {
      pressTimerControl();
    }
  }
});

function bindScrambleControls() {
  const prevBtn = document.getElementById("prevScrambleBtn");
  const nextBtn = document.getElementById("nextScrambleBtn");
  if (prevBtn)
    prevBtn.addEventListener("click", () => {
      prevBtn.blur();
      stepScramble(-1, true);
    });
  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      nextBtn.blur();
      stepScramble(1, true);
    });
}

window.addEventListener("keyup", (e) => {
  if (window.activeWorkspace === "lab") return;
  if (e.code === "Space") {
    if (
      document.querySelector("dialog[open]") ||
      document.activeElement.matches("input, select, textarea, button, a")
    )
      return;
    e.preventDefault();
    releaseTimerControl();
  }
});

let activeTouchTimerPointerId = null;

window.addEventListener(
  "pointerdown",
  (e) => {
    if (
      e.pointerType !== "touch" ||
      activeTouchTimerPointerId !== null ||
      !e.target.closest(".timer-card") ||
      isTimerControlBlockedTarget(e.target)
    )
      return;
    e.preventDefault();
    activeTouchTimerPointerId = e.pointerId;
    pressTimerControl();
  },
  { passive: false },
);

window.addEventListener(
  "pointerup",
  (e) => {
    if (e.pointerId !== activeTouchTimerPointerId) return;
    e.preventDefault();
    activeTouchTimerPointerId = null;
    releaseTimerControl();
  },
  { passive: false },
);

window.addEventListener("pointercancel", (e) => {
  if (e.pointerId === activeTouchTimerPointerId) {
    activeTouchTimerPointerId = null;
  }
});

function init() {
  if (window.viewerLoaded) {
    if (appInitialized) return;
    appInitialized = true;
    loadStoredTimes();
    bindScrambleControls();
    fitTimerDisplay();
    changeCubeType();
  } else {
    setTimeout(init, 50);
  }
}
init();

window.addEventListener("resize", fitTimerDisplay);
