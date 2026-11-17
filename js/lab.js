import { parseMoves as parse } from "./moves.js";
import { stylePuzzleViewer } from "./viewer-style.js";
const $ = (id) => document.getElementById(id);
const states = [[], []];
let libraries,
  solution = "",
  solutionSource = "",
  version = 0,
  busy = false;
const storageKey = "cubeTimer.lab.v1";
const moveGroups = [
  { id: "face", label: "面转", faces: ["U", "R", "F", "D", "L", "B"] },
  { id: "wide", label: "宽转", faces: ["u", "r", "f", "d", "l", "b"] },
  { id: "slice", label: "转体 / 中层", faces: ["x", "y", "z", "M", "E", "S"] },
];

function initializeMoveButtons(index) {
  const modes = $(`moveModes${index}`);
  const grid = $(`moveButtons${index}`);
  function selectGroup(group) {
    modes.querySelectorAll("button").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.moveMode === group.id),
      );
    });
    grid.replaceChildren();
    for (const suffix of ["", "'", "2"])
      for (const face of group.faces) {
        const move = face + suffix;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = move;
        if ("URFDLB".includes(face.toUpperCase()))
          button.dataset.face = face.toUpperCase();
        button.setAttribute("aria-label", `转动 ${move}`);
        button.addEventListener("click", () => {
          if (applyInput(index)) setState(index, [...states[index], move]);
        });
        grid.append(button);
      }
  }
  for (const group of moveGroups) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = group.label;
    button.dataset.moveMode = group.id;
    button.setAttribute("aria-controls", grid.id);
    button.addEventListener("click", () => selectGroup(group));
    modes.append(button);
  }
  selectGroup(moveGroups[0]);
}
function initializeLabViewers() {
  document.querySelectorAll("[data-lazy-player]").forEach((placeholder) => {
    const viewer = document.createElement("twisty-player");
    for (const attribute of placeholder.attributes) {
      if (attribute.name !== "data-lazy-player")
        viewer.setAttribute(attribute.name, attribute.value);
    }
    viewer.setAttribute("visualization", "PG3D");
    stylePuzzleViewer(viewer);
    placeholder.replaceWith(viewer);
  });
}
function getLibraries() {
  return (libraries ||= Promise.all([
    import("./state-engine.js"),
    import("../vendor/cubing/twisty/index.js"),
  ])
    .then(([engine]) => {
      initializeLabViewers();
      return engine;
    })
    .catch((error) => {
      libraries = null;
      throw error;
    }));
}

function message(index, text, error = false) {
  $(`stateMessage${index}`).textContent = text;
  $(`stateMessage${index}`).dataset.error = error;
}
function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(states));
  } catch {}
}
function invalidate() {
  version++;
  solution = "";
  $("solutionResult").hidden = true;
  $("solutionPreview").hidden = true;
  const viewer = $("solutionViewer");
  if (typeof viewer.pause === "function") viewer.pause();
  if (!busy)
    $("solverStatus").textContent = "状态已更新，点击求解获取转换公式。";
}
function render(index) {
  const text = states[index].join(" ");
  $(`stateInput${index}`).value = text;
  $(`stateCount${index}`).textContent = `${states[index].length} 步`;
  document.querySelector(`[data-undo="${index}"]`).disabled =
    !states[index].length;
  const viewer = $(`stateViewer${index}`);
  // Attributes also work before the custom element has loaded.
  viewer.setAttribute("alg", text);
  viewer.setAttribute("timestamp", "end");
  message(
    index,
    states[index].length ? "已应用 · 每次撤销一个基本转动" : "从复原状态开始",
  );
}
function setState(index, moves) {
  states[index] = [...moves];
  render(index);
  persist();
  invalidate();
}
function applyInput(index) {
  try {
    const moves = parse($(`stateInput${index}`).value);
    if (moves.join(" ") !== states[index].join(" ")) setState(index, moves);
    else message(index, moves.length ? "公式已应用" : "从复原状态开始");
    return true;
  } catch (error) {
    message(index, error.message, true);
    return false;
  }
}
function setWorkspace(lab) {
  $("timerWorkspace").hidden = lab;
  $("labWorkspace").hidden = !lab;
  $("timerTab").setAttribute("aria-pressed", String(!lab));
  $("labTab").setAttribute("aria-pressed", String(lab));
  window.activeWorkspace = lab ? "lab" : "timer";
  window.dispatchEvent(new Event("workspace-change"));
  if (lab)
    getLibraries().catch(() => {
      $("solverStatus").textContent =
        "3D 与求解模块加载失败，请检查网络并重试。";
    });
  else window.dispatchEvent(new Event("resize"));
}
$("timerTab").addEventListener("click", (event) => {
  setWorkspace(false);
  if (event.detail) event.currentTarget.blur();
});
$("labTab").addEventListener("click", () => setWorkspace(true));
for (let index = 0; index < 2; index++) {
  initializeMoveButtons(index);
  document
    .querySelector(`[data-undo="${index}"]`)
    .addEventListener("click", () => {
      if (applyInput(index)) setState(index, states[index].slice(0, -1));
    });
  document
    .querySelector(`[data-reset="${index}"]`)
    .addEventListener("click", () => setState(index, []));
  document
    .querySelector(`[data-apply="${index}"]`)
    .addEventListener("click", () => applyInput(index));
  $(`stateInput${index}`).addEventListener("input", () => {
    invalidate();
    message(index, "尚未应用 · 点击应用或求解", false);
  });
}
document.querySelector("[data-use-scramble]").addEventListener("click", () => {
  if (!["3x3", "3x3oh"].includes($("cubeType").value)) {
    message(0, "请先在计时训练中选择三阶项目。", true);
    return;
  }
  try {
    const display = $("displayText");
    setState(0, parse(display.dataset.scramble || display.textContent));
  } catch (error) {
    message(0, error.message, true);
  }
});
$("copySourceBtn").addEventListener("click", () => {
  if (applyInput(0)) setState(1, states[0]);
});
$("solveStatesBtn").addEventListener("click", async () => {
  if (busy || !applyInput(0) || !applyInput(1)) return;
  busy = true;
  const token = version;
  const source = states[0].join(" "),
    target = states[1].join(" ");
  const button = $("solveStatesBtn");
  button.disabled = true;
  button.textContent = "正在求解…";
  $("solverStatus").textContent =
    "正在加载并初始化求解器，首次运行需要下载数据…";
  const start = performance.now();
  try {
    const { solveTransition } = await getLibraries();
    const result = await solveTransition(source, target);
    if (token !== version) {
      $("solverStatus").textContent = "求解期间状态已改变，请重新求解。";
      return;
    }
    solution = result.toString();
    solutionSource = source;
    $("solutionAlg").textContent = solution || "两个状态相同，无需转动。";
    const length = [...result.experimentalExpand()].length;
    const rotations = parse(solution).filter((move) =>
      /^[xyz]/.test(move),
    ).length;
    $("solutionMetrics").textContent =
      `${length - rotations} 步 HTM${rotations ? ` · ${rotations} 次转体` : ""} · 已校验到达目标状态`;
    $("solverStatus").textContent =
      `求解完成 · ${((performance.now() - start) / 1000).toFixed(2)} 秒（包含本次模块加载与初始化）`;
    $("solutionResult").hidden = false;
    $("playSolutionBtn").disabled = !length;
    $("copySolutionBtn").disabled = !length;
  } catch (error) {
    $("solverStatus").textContent =
      "求解失败：" + (error.message || "请检查网络并重试。");
    console.error(error);
  } finally {
    busy = false;
    button.disabled = false;
    button.textContent = "求解转换公式";
  }
});
$("copySolutionBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(solution);
    $("solverStatus").textContent = "转换公式已复制。";
  } catch {
    $("solverStatus").textContent = "无法访问剪贴板，请选中公式后手动复制。";
  }
});
$("playSolutionBtn").addEventListener("click", async () => {
  if (!solution) return;
  const viewer = $("solutionViewer");
  $("solutionPreview").hidden = false;
  viewer.pause();
  viewer.experimentalSetupAlg = solutionSource;
  viewer.alg = solution;
  viewer.timestamp = "start";
  await viewer.experimentalModel.indexer.get();
  viewer.play();
});
window.addEventListener("workspace-change", () => {
  const v = $("solutionViewer");
  if (typeof v.pause === "function") v.pause();
});
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Array.isArray(saved) && saved.length === 2)
    saved.forEach((moves, i) => {
      if (Array.isArray(moves)) states[i] = parse(moves.join(" "));
    });
} catch {}
render(0);
render(1);
