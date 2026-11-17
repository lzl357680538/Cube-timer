import { stylePuzzleViewer, setFloatingFacelets } from "./viewer-style.js";
const $ = (id) => document.getElementById(id);
const player = $("cubeViewer");
const panel = $("playbackPanel");
const slider = $("progressSlider");
let type = "3x3",
  revision = 0,
  boundaries = [],
  total = 0,
  current = 0;
let playing = false,
  ready = false,
  scrambleAlg = "",
  timelineReady = false,
  timelineJob = null;
let Alg, Move, Pause;
let seekSequence = 0,
  seeking = false;
const puzzleMap = {
  "2x2": "2x2x2",
  "3x3": "3x3x3",
  "3x3oh": "3x3x3",
  "4x4": "4x4x4",
  "5x5": "5x5x5",
  "6x6": "6x6x6",
  "7x7": "7x7x7",
  clock: "clock",
  minx: "megaminx",
  pyram: "pyraminx",
  skewb: "skewb",
};
function controls() {
  if (ready)
    setFloatingFacelets(
      player,
      type !== "sq1" &&
        type !== "clock" &&
        total > 0 &&
        current === total &&
        !playing &&
        !seeking,
    );
  slider.max = total;
  slider.value = current;
  slider.disabled = !total;
  $("stepCounter").textContent = `${current} / ${total}`;
  $("playPauseBtn").textContent = playing
    ? "暂停"
    : current === total
      ? "重播"
      : "播放";
  $("playPauseBtn").disabled = !total;
  $("startStepBtn").disabled = $("prevStepBtn").disabled =
    !total || current <= 0;
  $("endStepBtn").disabled = $("nextStepBtn").disabled =
    !total || current >= total;
  $("replayBtn").disabled = !total;
  $("previewStatus").textContent =
    current === total ? "最终状态" : current === 0 ? "复原状态" : "打乱过程";
  // Lets the scramble text highlight the move currently shown in 3D.
  window.dispatchEvent(
    new CustomEvent("scramble-progress", {
      detail: { current, total, open: !panel.hidden },
    }),
  );
}

// Three.js (legacy build) is only needed for Square-1; load it on first use.
let legacyThreeJob = null;
function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.append(script);
  });
}
function loadLegacyThree() {
  if (window.THREE && window.THREE.OrbitControls) return Promise.resolve(true);
  return (legacyThreeJob ||= (async () => {
    if (!window.THREE) await loadScriptOnce("vendor/legacy-three/three.min.js");
    if (!window.THREE.OrbitControls)
      await loadScriptOnce("vendor/legacy-three/OrbitControls.js");
    return true;
  })().catch((error) => {
    console.error(error);
    legacyThreeJob = null;
    return false;
  }));
}
function resetCamera() {
  const coordinates = /^(?:[2-7]x[2-7]|3x3oh)$/.test(type)
    ? { latitude: 35.264389682754654, longitude: 45, distance: 7.5 }
    : type === "clock"
      ? "auto"
      : { distance: type === "minx" ? 8.1 : type === "pyram" ? 7.2 : 7.5 };
  player.experimentalModel.twistySceneModel.orbitCoordinatesRequest.set(
    coordinates,
  );
}
function pause() {
  if (type === "sq1") window.Sq1Playback?.pause();
  else if (ready) player.pause();
  playing = false;
}
function collapse() {
  panel.hidden = true;
  $("replayBtn").textContent = "↻ 查看打乱过程";
}
function clearTimeline() {
  timelineReady = false;
  timelineJob = null;
  boundaries = [];
}
function showStaticPreview() {
  // A setup transform computes only the final state; there is no move timeline.
  timelineReady = false;
  player.alg = "";
  player.experimentalSetupAlg = scrambleAlg;
  player.timestamp = "end";
}
async function prepareTimeline() {
  if (type === "sq1") return true;
  if (!ready) return false;
  if (timelineReady) return true;
  if (timelineJob) return timelineJob;
  const token = revision;
  timelineJob = (async () => {
    try {
      player.experimentalSetupAlg = "";
      player.alg = scrambleAlg;
      player.timestamp = "start";
      const indexer = await player.experimentalModel.indexer.get();
      if (token !== revision) return false;
      total = indexer.numAnimatedLeaves();
      boundaries = Array.from({ length: total }, (_, i) =>
        indexer.indexToMoveStartTimestamp(i),
      );
      timelineReady = true;
      return true;
    } catch (error) {
      if (token === revision)
        $("viewerMessage").textContent = "回放准备失败，请重试。";
      console.error(error);
      return false;
    } finally {
      if (token === revision) timelineJob = null;
    }
  })();
  return timelineJob;
}
async function seek(step) {
  const token = revision;
  const request = ++seekSequence;
  pause();
  const target = Math.max(0, Math.min(total, Number(step)));
  seeking = true;
  current = target;
  controls();
  try {
    if (type === "sq1") window.Sq1Playback?.seekTo(target);
    else {
      if (
        !(await prepareTimeline()) ||
        token !== revision ||
        request !== seekSequence
      )
        return false;
      player.timestamp = target === total ? "end" : (boundaries[target] ?? 0);
      await player.experimentalModel.detailedTimelineInfo.get();
    }
    if (token !== revision || request !== seekSequence) return false;
    current = target;
    return true;
  } finally {
    if (request === seekSequence) {
      seeking = false;
      controls();
    }
  }
}

async function loadScramble(alg) {
  const token = ++revision;
  ++seekSequence;
  seeking = false;
  pause();
  collapse();
  clearTimeline();
  scrambleAlg = alg;
  total = current = 0;
  controls();
  if (type === "sq1") {
    if (!window.THREE) $("viewerMessage").textContent = "正在加载 SQ1 预览…";
    const loaded = await loadLegacyThree();
    if (token !== revision) return;
    if (!loaded) {
      $("viewerMessage").textContent = "SQ1 预览加载失败，请刷新页面重试。";
      return;
    }
    window.Sq1Viewer?.show();
    window.Sq1Viewer?.applyScramble(alg);
    const state = window.Sq1Playback?.getState();
    total = state?.total || 0;
    current = total;
    controls();
    $("viewerMessage").textContent = window.THREE ? "" : "SQ1 预览加载失败。";
    return;
  }
  if (!ready) return;
  try {
    resetCamera();
    // Count notation only. State calculation is done once via setupAlg, and the
    // expensive per-move indexer is created only if the user requests playback.
    total = [...new Alg(alg).experimentalExpand()].filter(
      (node) => node instanceof Move || node instanceof Pause,
    ).length;
    current = total;
    showStaticPreview();
    controls();
    await player.experimentalModel.currentPattern.get();
    if (token !== revision) return;
    $("viewerMessage").textContent = "";
    window.dispatchEvent(new Event("scramble-preview-ready"));
  } catch (error) {
    if (token === revision)
      $("viewerMessage").textContent = "暂时无法显示此打乱，请更换项目后重试。";
    console.error(error);
  }
}
window.addEventListener("change-puzzle", (event) => {
  pause();
  ++revision;
  ++seekSequence;
  seeking = false;
  type = event.detail;
  total = current = 0;
  scrambleAlg = "";
  clearTimeline();
  collapse();
  controls();
  const sq1 = type === "sq1";
  $("viewHint").textContent =
    sq1 || /^(?:[2-7]x[2-7]|3x3oh)$/.test(type)
      ? "白顶、绿前、红右，拖动可旋转"
      : "拖动可旋转视角";
  player.style.display = sq1 ? "none" : "grid";
  $("sq1Viewer").style.display = sq1 ? "flex" : "none";
  if (sq1) {
    const token = revision;
    loadLegacyThree().then((loaded) => {
      if (loaded && token === revision && type === "sq1")
        window.Sq1Viewer?.show();
    });
  } else {
    window.Sq1Viewer?.hide();
    if (ready) {
      player.alg = "";
      player.experimentalSetupAlg = "";
      player.puzzle = puzzleMap[type] || "3x3x3";
      // All 3D puzzles share black foundations and bright coloured stickers.
      player.visualization = "PG3D";
      resetCamera();
    }
  }
});
window.addEventListener("update-scramble", (event) => {
  const puzzle = type === "sq1" ? "square1" : puzzleMap[type];
  const link = new URL("https://alpha.twizzle.net/edit/");
  link.searchParams.set("puzzle", puzzle);
  link.searchParams.set("alg", event.detail);
  $("twLink").href = link;
  loadScramble(event.detail);
});
window.addEventListener("sq1-playback-update", (event) => {
  if (type !== "sq1") return;
  ({ total, current, playing } = event.detail);
  controls();
});
$("replayBtn").addEventListener("click", async () => {
  const token = revision;
  panel.hidden = false;
  $("replayBtn").textContent = "↻ 从头回放";
  if (!(await seek(0)) || token !== revision) return;
  if (type === "sq1") window.Sq1Playback?.toggle();
  else player.play();
});
$("playPauseBtn").addEventListener("click", async () => {
  const token = revision;
  if (type === "sq1") window.Sq1Playback?.toggle();
  else if (await prepareTimeline()) {
    if (token === revision) player.togglePlay();
  }
});
$("startStepBtn").addEventListener("click", () => seek(0));
$("prevStepBtn").addEventListener("click", () => seek(current - 1));
$("nextStepBtn").addEventListener("click", () => seek(current + 1));
$("endStepBtn").addEventListener("click", () => seek(total));
slider.addEventListener("input", () => seek(slider.value));
$("closePlaybackBtn").addEventListener("click", () => {
  ++revision;
  ++seekSequence;
  seeking = false;
  pause();
  collapse();
  if (type === "sq1") window.Sq1Playback?.seekTo(total);
  else if (ready) {
    clearTimeline();
    showStaticPreview();
  }
  current = total;
  controls();
});
window.addEventListener("workspace-change", () => {
  ++revision;
  ++seekSequence;
  seeking = false;
  timelineJob = null;
  pause();
  controls();
});
try {
  const [, notation] = await Promise.all([
    import("../vendor/cubing/twisty/index.js"),
    import("../vendor/cubing/alg/index.js"),
  ]);
  ({ Alg, Move, Pause } = notation);
  ready = true;
  player.controlPanel = "none";
  stylePuzzleViewer(player);
  player.experimentalModel.detailedTimelineInfo.addFreshListener((info) => {
    if (type === "sq1" || !total || !timelineReady || seeking) return;
    current = info.atEnd
      ? total
      : Math.max(
          0,
          boundaries.filter((t) => t <= info.timestamp + 0.01).length - 1,
        );
    controls();
  });
  player.experimentalModel.playingInfo.addFreshListener((info) => {
    if (type !== "sq1") {
      playing = info.playing;
      controls();
    }
  });
  $("viewerMessage").textContent = "";
} catch (error) {
  $("viewerMessage").textContent =
    "3D 组件加载失败。计时仍可使用，请刷新页面。";
  console.error(error);
}
window.viewerLoaded = true;
window.getOfficialScramble = async (eventType) => {
  const events = {
    clock: "clock",
    minx: "minx",
    pyram: "pyram",
    skewb: "skewb",
    sq1: "sq1",
  };
  if (!events[eventType]) return "";
  try {
    const { randomScrambleForEvent } = await import(
      "../vendor/cubing/scramble/index.js"
    );
    return (await randomScrambleForEvent(events[eventType])).toString();
  } catch {
    return "";
  }
};
