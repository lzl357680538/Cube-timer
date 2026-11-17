// Keep application styling outside the generated cubing.js assets.
const viewers = new WeakMap();

export function setFloatingFacelets(viewer, floating) {
  const state = viewers.get(viewer);
  if (!state || state.floating === floating) return;
  state.floating = floating;
  viewer.hintFacelets = floating ? "floating" : "none";
}

export function stylePuzzleViewer(viewer) {
  if (viewers.has(viewer)) return;
  const state = { floating: false, revision: 0 };
  viewers.set(viewer, state);
  viewer.experimentalModel.twistySceneModel.foundationDisplay.set("none");
  // Set this once, before geometry creation; PG3D cannot resize live stickers.
  viewer.experimentalFaceletScale = 0.94;
  viewer.hintFacelets = "none";
  viewer.experimentalModel.puzzleLoader.addFreshListener(async (loader) => {
    const revision = ++state.revision;
    if (loader.id === "clock") return;
    try {
      // Clock uses a separate 2D scene. Read the current scene instead of the
      // deprecated accessor, which can keep returning a previous 3D scene.
      for (let attempt = 0; attempt < 180; attempt++) {
        if (revision !== state.revision) return;
        const [vantage] = [...(await viewer.experimentalCurrentVantages())];
        const wrapper =
          await vantage?.scene.experimentalTwisty3DPuzzleWrapper();
        if (wrapper?.puzzleLoader.id === loader.id) {
          const puzzle = await wrapper.twisty3DPuzzle();
          if (revision !== state.revision) return;
          puzzle.experimentalUpdateOptions({
            showFoundation: false,
            hintStickerOpacity: 1,
            hintFacelets: state.floating ? "floating" : "none",
          });
          return;
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    } catch (error) {
      if (revision === state.revision) console.error("模型样式加载失败", error);
    }
  });
}
