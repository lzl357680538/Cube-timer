const $ = (id) => document.getElementById(id);
const player = $("cubeViewer");
const panel = $("playbackPanel");
const slider = $("progressSlider");
let type = "3x3",
  revision = 0,
  boundaries = [],
  total = 0,
  current = 0,
  playing = false,
  ready = false;
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
async function seek(step) {
  pause();
  current = Math.max(0, Math.min(total, Number(step)));
  if (type === "sq1") window.Sq1Playback?.seekTo(current);
  else if (ready)
    player.timestamp = current === total ? "end" : (boundaries[current] ?? 0);
  controls();
}
async function loadScramble(alg) {
  const token = ++revision;
  pause();
  collapse();
  total = current = 0;
  controls();
  if (type === "sq1") {
    window.Sq1Viewer?.applyScramble(alg);
    const state = window.Sq1Playback?.getState();
    total = state?.total || 0;
    current = total;
    controls();
    $("viewerMessage").textContent = window.THREE
      ? ""
      : "SQ1 预览加载失败，请检查网络后刷新。";
    return;
  }
  if (!ready) return;
  try {
    player.alg = alg;
    player.timestamp = "end";
    const indexer = await player.experimentalModel.indexer.get();
    if (token !== revision) return;
    total = indexer.numAnimatedLeaves();
    boundaries = Array.from({ length: total }, (_, i) =>
      indexer.indexToMoveStartTimestamp(i),
    );
    current = total;
    controls();
    $("viewerMessage").textContent = "";
  } catch (error) {
    if (token === revision)
      $("viewerMessage").textContent =
        "暂时无法显示此打乱，请检查网络或更换项目。";
    console.error(error);
  }
}
window.addEventListener("change-puzzle", (event) => {
  pause();
  ++revision;
  type = event.detail;
  total = current = 0;
  collapse();
  controls();
  const sq1 = type === "sq1";
  player.style.display = sq1 ? "none" : "grid";
  $("sq1Viewer").style.display = sq1 ? "flex" : "none";
  if (sq1) window.Sq1Viewer?.show();
  else {
    window.Sq1Viewer?.hide();
    if (ready) {
      player.alg = "";
      player.puzzle = puzzleMap[type] || "3x3x3";
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
  if (panel.hidden) {
    panel.hidden = false;
    $("replayBtn").textContent = "↻ 从头回放";
  }
  await seek(0);
  if (type === "sq1") window.Sq1Playback?.toggle();
  else player.play();
});
$("playPauseBtn").addEventListener("click", () => {
  if (type === "sq1") window.Sq1Playback?.toggle();
  else player.togglePlay();
});
$("startStepBtn").addEventListener("click", () => seek(0));
$("prevStepBtn").addEventListener("click", () => seek(current - 1));
$("nextStepBtn").addEventListener("click", () => seek(current + 1));
$("endStepBtn").addEventListener("click", () => seek(total));
slider.addEventListener("input", () => seek(slider.value));
$("closePlaybackBtn").addEventListener("click", () => {
  seek(total);
  collapse();
});
window.addEventListener("workspace-change", () => pause());
try {
  await import("../vendor/cubing/twisty/index.js");
  ready = true;
  player.controlPanel = "none";
  player.hintFacelets = "none";
  player.experimentalModel.detailedTimelineInfo.addFreshListener((info) => {
    if (type === "sq1" || !total) return;
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
    "3D 组件加载失败。计时仍可使用，请检查网络后刷新。";
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
