// State transition engine. Both states are legal histories from the solved cube.
import { Alg } from "../vendor/cubing/alg/index.js";
import { cube3x3x3 } from "../vendor/cubing/puzzles/index.js";
export { Alg };
export const puzzle = await cube3x3x3.kpuzzle();
let searchLibrary;
import { parseMoves } from "./moves.js";
export { parseMoves };
export async function solveTransition(source, target) {
  const sourceAlg = new Alg(parseMoves(source).join(" "));
  const targetAlg = new Alg(parseMoves(target).join(" "));
  const from = puzzle.defaultPattern().applyAlg(sourceAlg);
  const to = puzzle.defaultPattern().applyAlg(targetAlg);
  let result;
  if (from.isIdentical(to)) result = new Alg("");
  else {
    const search = await (searchLibrary ||= import(
      "../vendor/cubing/search/index.js"
    ).catch((error) => {
      searchLibrary = null;
      throw error;
    }));
    // A · X = B, so X = A^-1 · B. Solving B^-1 · A gives exactly X.
    const relative = puzzle
      .defaultPattern()
      .applyAlg(targetAlg.invert().concat(sourceAlg));
    result = await search.experimentalSolve3x3x3IgnoringCenters(relative);
  }
  if (!from.applyAlg(result).isIdentical(to))
    throw new Error("终态校验未通过，请重新求解。");
  return result;
}
