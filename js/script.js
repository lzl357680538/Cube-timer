const STORAGE_KEY = "cubeTimer.solveTimes.v1";
const EVENT_STORAGE_KEY = "cubeTimer.event.v1";
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
const NXN_TYPES = /^(?:[2-7]x[2-7]|3x3oh)$/;
const SCRAMBLE_BUFFER_SIZE = 10;

let solveTimesMap = Object.fromEntries(EVENT_TYPES.map((type) => [type, []]));
let timerState = "IDLE";
let startTime = 0;
let activeInterval = null;
let activeFrame = 0;
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

/* ==========================================================================
   Timer text width estimate (tabular figures) — lets us size the numerals
   without measuring the DOM on every frame.
   ========================================================================== */
function estimateTimerWidthEm(text) {
  let em = 0;
  for (const ch of String(text)) {
    if (/[0-9]/.test(ch)) em += 0.56;
    else if (ch === "." || ch === ":") em += 0.27;
    else em += 0.66; // D, N, F
  }
  return em;
}

/* ==========================================================================
   Storage
   ========================================================================== */
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(solveTimesMap));
  } catch (e) {
    console.warn("Failed to save solve times", e);
  }
}

function loadStoredEvent() {
  try {
    const type = localStorage.getItem(EVENT_STORAGE_KEY);
    if (EVENT_TYPES.includes(type))
      document.getElementById("cubeType").value = type;
  } catch {}
}

function saveStoredEvent(type) {
  try {
    localStorage.setItem(EVENT_STORAGE_KEY, type);
  } catch {}
}

/* ==========================================================================
   Scramble generation
   ========================================================================== */
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
      // Never compete with a live solve for the main thread.
      while (!["IDLE", "STOPPED"].includes(timerState))
        await new Promise((resolve) => setTimeout(resolve, 250));
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

/* ==========================================================================
   Scramble display (one chip per move so playback can highlight it)
   ========================================================================== */
let scrambleTokens = [];

function tokenizeLine(line, type) {
  if (type === "sq1") {
    return line.match(/\(\s*-?\d+\s*,\s*-?\d+\s*\)\s*\/?|\/|\S+/g) || [];
  }
  return line.split(/\s+/).filter(Boolean);
}

function renderScrambleText(scramble) {
  const el = document.getElementById("displayText");
  const type = getCurrentType();
  const lines = String(scramble || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const fragment = document.createDocumentFragment();
  scrambleTokens = [];
  lines.forEach((line, lineIndex) => {
    const host = lines.length > 1 ? document.createElement("span") : fragment;
    if (lines.length > 1) host.className = "mv-line";
    tokenizeLine(line, type).forEach((token, i) => {
      if (i) host.append(" ");
      const chip = document.createElement("span");
      chip.className = "mv";
      chip.textContent = token.trim();
      scrambleTokens.push(chip);
      host.append(chip);
    });
    if (lines.length > 1) {
      fragment.append(host);
      if (lineIndex < lines.length - 1) fragment.append("\n");
    }
  });
  el.replaceChildren(fragment);
  el.dataset.scramble = scramble;
  delete el.dataset.step;
  const count = scrambleTokens.length;
  el.dataset.size = count <= 25 ? "m" : count <= 50 ? "l" : "xl";
  const meta = document.getElementById("scrambleMeta");
  if (meta)
    meta.textContent = NXN_TYPES.test(type) && count ? `${count} 步` : "";
}

function getCurrentScramble() {
  const el = document.getElementById("displayText");
  return el.dataset.scramble || el.textContent || "";
}

let lastProgressKey = "";
window.addEventListener("scramble-progress", (event) => {
  const { current, total, open } = event.detail || {};
  const el = document.getElementById("displayText");
  const active = open && total > 0 && total === scrambleTokens.length;
  const key = active ? `${current}/${total}` : "off";
  if (key === lastProgressKey) return;
  lastProgressKey = key;
  if (!active) {
    delete el.dataset.step;
    scrambleTokens.forEach((chip) => chip.classList.remove("done", "current"));
    return;
  }
  el.dataset.step = current;
  scrambleTokens.forEach((chip, i) => {
    chip.classList.toggle("done", i < current - 1);
    chip.classList.toggle("current", i === current - 1);
  });
  const currentChip = scrambleTokens[current - 1];
  if (currentChip && el.scrollHeight > el.clientHeight) {
    const top = currentChip.offsetTop - el.offsetTop;
    if (top < el.scrollTop || top > el.scrollTop + el.clientHeight - 30)
      el.scrollTop = Math.max(0, top - el.clientHeight / 2);
  }
});

function showScramble(scramble) {
  lastProgressKey = "";
  renderScrambleText(scramble);
  clearCrossResult();
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
  clearCrossResult();
  const type = getCurrentType();
  saveStoredEvent(type);
  window.dispatchEvent(new CustomEvent("change-puzzle", { detail: type }));
  document.getElementById("crossControls").hidden = !["3x3", "3x3oh"].includes(
    type,
  );
  updateStatistics();
  handleRandomScramble();
}

/* ==========================================================================
   Results
   ========================================================================== */
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
    ? `${formatSolveTime(finalTime)}+`
    : formatSolveTime(finalTime);
}

function calculateMean(arr) {
  const validTimes = arr.map(getFinalTime).filter(Number.isFinite);
  if (validTimes.length === 0) return "-";
  let sum = validTimes.reduce((a, b) => a + b, 0);
  return formatSolveTime(sum / validTimes.length);
}

// WCA-style average: drop the best and worst, mean the rest.
function calculateAverageOf(arr, n) {
  if (arr.length < n) return "-";
  const sorted = arr
    .slice(-n)
    .map(getFinalTime)
    .sort((a, b) => a - b);
  const middle = sorted.slice(1, n - 1);
  if (middle.some((t) => !Number.isFinite(t))) return "DNF";
  return formatSolveTime(middle.reduce((a, b) => a + b, 0) / middle.length);
}

function calculateAo12(arr) {
  return calculateAverageOf(arr, 12);
}

function findBestIndex(arr) {
  let best = -1;
  let bestTime = Infinity;
  arr.forEach((entry, i) => {
    const t = getFinalTime(entry);
    if (t < bestTime) {
      bestTime = t;
      best = i;
    }
  });
  return best;
}

function updateStatistics() {
  const type = getCurrentType();
  const arr = solveTimesMap[type];
  const bestIndex = findBestIndex(arr);
  document.getElementById("countDisplay").textContent = arr.length;
  document.getElementById("meanDisplay").textContent = calculateMean(arr);
  document.getElementById("ao5Display").textContent = calculateAverageOf(
    arr,
    5,
  );
  document.getElementById("ao12Display").textContent = calculateAo12(arr);
  document.getElementById("bestDisplay").textContent =
    bestIndex >= 0 ? formatSolveTime(getFinalTime(arr[bestIndex])) : "-";

  const fragment = document.createDocumentFragment();
  for (let index = arr.length - 1; index >= 0; index--) {
    const solve = normalizeSolve(arr[index]);
    const li = document.createElement("li");
    li.dataset.index = index;
    if (solve.penalty === "DNF") li.className = "dnf-result";
    else if (solve.penalty === "+2") li.className = "plus-two-result";
    if (index === bestIndex) li.dataset.best = "";
    li.innerHTML = `<span class="time-index">${index + 1}</span><span class="time-value"></span><div class="time-actions"><button type="button" data-penalty="OK" aria-pressed="${solve.penalty === "OK"}">OK</button><button type="button" data-penalty="+2" aria-pressed="${solve.penalty === "+2"}">+2</button><button type="button" data-penalty="DNF" aria-pressed="${solve.penalty === "DNF"}">DNF</button><button type="button" class="delete-btn" data-delete aria-label="删除第 ${index + 1} 次成绩">×</button></div>`;
    li.querySelector(".time-value").textContent = formatSolveResult(solve);
    fragment.append(li);
  }
  document.getElementById("timeList").replaceChildren(fragment);
  document.getElementById("emptyTimes").hidden = arr.length > 0;
}

function setPenalty(index, penalty) {
  const type = getCurrentType();
  if (!solveTimesMap[type][index]) return;
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
  if (!solveTimesMap[type].length) return;
  if (confirm(`确定要清空该项目的所有成绩吗？`)) {
    solveTimesMap[type] = [];
    saveStoredTimes();
    updateStatistics();
  }
}

/* ==========================================================================
   Timer display
   ========================================================================== */
const TIMER_LABELS = {
  idle: "准备好就开始",
  ready: "松开即开始计时",
  running: "计时中",
  stopped: "完成，继续下一次",
  inspecting: "观察中，按住准备",
  dnf: "观察超时，请重试",
};
let currentTimerText = "";
let fittedUnits = 0;

function setTimerClass(className) {
  const state = className || "idle";
  const card = document.getElementById("timerCard");
  if (card) card.dataset.state = state;
  document.getElementById("timerStatus").textContent =
    TIMER_LABELS[state] || TIMER_LABELS.idle;
  const busy = ["ready", "running", "inspecting"].includes(state);
  document.body.classList.toggle("is-timing", busy);
  document.getElementById("cubeType").disabled = busy;
  document.getElementById("labTab").disabled = busy;
  document.getElementById("appearanceBtn").disabled = busy;
  updateScrambleNavButtons();
  fitTimerDisplay(true);
}

function getTimerBaseFontSize() {
  const card = document.getElementById("timerCard");
  // Fullscreen focus mode on phones/tablets
  if (card && getComputedStyle(card).position === "fixed") return 200;
  return window.matchMedia("(max-width: 680px)").matches ? 96 : 132;
}

// Width of "00.000" — keep sub-minute times the same size so the numerals never jump.
const REFERENCE_UNITS = estimateTimerWidthEm("00.000");

function fitTimerDisplay(force = false) {
  const el = document.getElementById("timerDisplay");
  if (!el) return;
  const units = Math.max(
    REFERENCE_UNITS,
    estimateTimerWidthEm(currentTimerText),
  );
  if (!force && units === fittedUnits) return;
  fittedUnits = units;

  const available = el.clientWidth;
  const base = getTimerBaseFontSize();
  if (available <= 0) {
    el.style.fontSize = `${base}px`;
    return;
  }
  // Also respect screen height in focus mode / landscape.
  const maxByHeight = Math.max(40, window.innerHeight * 0.38);
  const size = Math.max(
    28,
    Math.floor(Math.min(base, maxByHeight, (available * 0.94) / units)),
  );
  el.style.fontSize = `${size}px`;
}

function setTimerText(value) {
  const el = document.getElementById("timerDisplay");
  if (!el) return;
  const text = String(value);
  if (text === currentTimerText) return;
  currentTimerText = text;
  el.textContent = text;
  fitTimerDisplay();
}

function stopTicking() {
  clearInterval(activeInterval);
  activeInterval = null;
  cancelAnimationFrame(activeFrame);
  activeFrame = 0;
}

function updateInspection() {
  let elapsed = performance.now() - startTime;
  let left = 15 - Math.floor(elapsed / 1000);
  if (left <= 0) {
    stopTicking();
    setTimerText("DNF");
    setTimerClass("dnf");
    timerState = "IDLE";
  } else if (timerState === "INSPECTING") {
    setTimerText(left);
  }
}

function getSelectedCrossColor() {
  const checked = document.querySelector('input[name="crossColor"]:checked');
  return checked ? checked.value : "white";
}

let crossSolveSequence = 0;
function clearCrossResult() {
  crossSolveSequence++;
  document.getElementById("crossResult").textContent = "";
}

async function solveCross(xcross = false) {
  const token = ++crossSolveSequence;
  const result = document.getElementById("crossResult");
  const type = document.getElementById("cubeType").value;
  if (!["3x3", "3x3oh"].includes(type)) {
    result.textContent = "目前仅支持三阶的 Cross / XCross 求解。";
    return;
  }

  const currentScramble = getCurrentScramble();
  if (!currentScramble) {
    result.textContent = "打乱还在生成，请稍后再试。";
    return;
  }

  const color = getSelectedCrossColor();
  result.textContent = "计算中…";

  const start = performance.now();
  try {
    const solution = await (xcross
      ? window.CrossSolver.solveXCross(currentScramble, color)
      : window.CrossSolver.solveBest(currentScramble, color));
    if (token !== crossSolveSequence) return;
    const timeTook = (performance.now() - start).toFixed(1);
    result.textContent = `${solution}（${timeTook} ms）`;
  } catch (error) {
    if (token === crossSolveSequence)
      result.textContent = "求解失败：" + error.message;
  }
}

function runningFrame() {
  if (timerState !== "RUNNING") return;
  setTimerText(formatSolveTime(performance.now() - startTime));
  activeFrame = requestAnimationFrame(runningFrame);
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
    setTimerText("15");
    setTimerClass("inspecting");
    startTime = performance.now();
    activeInterval = setInterval(updateInspection, 100);
  } else if (timerState === "INSPECTING") {
    timerState = "READY";
    setTimerClass("ready");
  } else if (timerState === "RUNNING") {
    const finalTime = performance.now() - startTime;
    stopTicking();
    timerState = "STOPPED";
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
    stopTicking();
    timerState = "RUNNING";
    setTimerText("0.000");
    setTimerClass("running");
    startTime = performance.now();
    activeFrame = requestAnimationFrame(runningFrame);
  } else if (timerState === "STOPPED") {
    timerState = "IDLE";
    setTimerClass("");
  }
}

/* ==========================================================================
   Input
   ========================================================================== */
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

// Long-press on iOS/Android must not open a context menu while holding to start.
document.addEventListener("contextmenu", (e) => {
  if (e.target.closest && e.target.closest(".timer-card")) e.preventDefault();
});

function blurAfterPointer(element) {
  // Keep keyboard focus for keyboard users; drop it after mouse/touch so Space
  // goes straight back to the timer.
  let fromPointer = false;
  element.addEventListener("pointerdown", () => (fromPointer = true));
  element.addEventListener("change", (e) => {
    if (fromPointer && e.target.blur) e.target.blur();
    fromPointer = false;
  });
}

function bindControls() {
  const prevBtn = document.getElementById("prevScrambleBtn");
  const nextBtn = document.getElementById("nextScrambleBtn");
  prevBtn.addEventListener("click", () => {
    prevBtn.blur();
    stepScramble(-1, true);
  });
  nextBtn.addEventListener("click", () => {
    nextBtn.blur();
    stepScramble(1, true);
  });

  const cubeType = document.getElementById("cubeType");
  cubeType.addEventListener("change", () => {
    changeCubeType();
    cubeType.blur();
  });

  const solveBtn = document.getElementById("solveCrossBtn");
  solveBtn.addEventListener("click", () => {
    solveCross();
    solveBtn.blur();
  });
  blurAfterPointer(document.getElementById("crossColor"));
  document
    .getElementById("crossColor")
    .addEventListener("change", clearCrossResult);
  const xcrossBtn = document.getElementById("solveXCrossBtn");
  xcrossBtn.addEventListener("click", () => {
    solveCross(true);
    xcrossBtn.blur();
  });

  const clearBtn = document.getElementById("clearTimesBtn");
  clearBtn.addEventListener("click", () => {
    clearCurrentTimes();
    clearBtn.blur();
  });

  document.getElementById("timeList").addEventListener("click", (e) => {
    const button = e.target.closest("button");
    const li = e.target.closest("li[data-index]");
    if (!button || !li) return;
    const index = Number(li.dataset.index);
    if (button.hasAttribute("data-delete")) deleteTime(index);
    else if (button.dataset.penalty) setPenalty(index, button.dataset.penalty);
    // The list was re-rendered; make sure Space returns to the timer.
    if (document.activeElement && document.activeElement !== document.body)
      document.activeElement.blur();
  });
}

let resizeFrame = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => fitTimerDisplay(true));
});

function init() {
  if (window.viewerLoaded) {
    if (appInitialized) return;
    appInitialized = true;
    loadStoredTimes();
    loadStoredEvent();
    changeCubeType();
  } else {
    setTimeout(init, 50);
  }
}

// Paint the idle LCD and stats immediately, before the 3D modules arrive.
setTimerText("0.000");
setTimerClass("");
bindControls();
updateStatistics();
init();
