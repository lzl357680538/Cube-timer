import { CrossSolver } from "./cross-solver.js";

const solver = new CrossSolver();
let xcrossLibrary;
function loadXCross() {
  return (xcrossLibrary ||= import("./xcross-solver.js").catch((error) => {
    xcrossLibrary = null;
    throw error;
  }));
}
self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.type === "warmup") {
      solver.initialize();
      // Fetch the optional pair-search module while idle, without delaying Cross.
      void loadXCross().catch(() => {});
    } else if (data.type === "xcross") {
      const { solveXCross } = await loadXCross();
      value = solveXCross(solver, data.scramble, data.color);
    } else value = solver.solveBest(data.scramble, data.color);
    self.postMessage({ id: data.id, value });
  } catch (error) {
    self.postMessage({ id: data.id, error: error.message });
  }
};
