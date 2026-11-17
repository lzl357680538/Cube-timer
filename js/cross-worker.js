import { CrossSolver } from "./cross-solver.js";

const solver = new CrossSolver();
self.onmessage = async ({ data }) => {
  try {
    let value;
    if (data.type === "warmup") solver.initialize();
    else if (data.type === "xcross") {
      const { solveXCross } = await import("./xcross-solver.js");
      value = solveXCross(solver, data.scramble, data.color);
    } else value = solver.solveBest(data.scramble, data.color);
    self.postMessage({ id: data.id, value });
  } catch (error) {
    self.postMessage({ id: data.id, error: error.message });
  }
};
