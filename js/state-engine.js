// State transition engine. Both states are legal histories from the solved cube.
import { Alg } from "../vendor/cubing/alg/index.js";
import { cube3x3x3 } from "../vendor/cubing/puzzles/index.js";
export { Alg };
export const puzzle = await cube3x3x3.kpuzzle();
let searchLibrary;
import { parseMoves } from "./moves.js";
export { parseMoves };

// All legal slice/wide turns move the centres as one of 24 rigid orientations.
// A short rotation restores the centre frame before the outer-face solver runs.
const solved = puzzle.defaultPattern();
const orientations = [{ alg: new Alg(""), pattern: solved }];
const seen = new Set([solved.patternData.CENTERS.pieces.join(",")]);
for (let i = 0; i < orientations.length; i++) {
  for (const move of ["x", "x'", "x2", "y", "y'", "y2", "z", "z'", "z2"]) {
    const pattern = orientations[i].pattern.applyMove(move);
    const key = pattern.patternData.CENTERS.pieces.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    orientations.push({
      alg: orientations[i].alg.concat(new Alg(move)),
      pattern,
    });
  }
}

export async function solveTransition(source, target) {
  const sourceAlg = new Alg(parseMoves(source).join(" "));
  const targetAlg = new Alg(parseMoves(target).join(" "));
  const from = puzzle.defaultPattern().applyAlg(sourceAlg);
  const to = puzzle.defaultPattern().applyAlg(targetAlg);
  let result;
  if (from.isIdentical(to)) result = new Alg("");
  else {
    // A · X = B, so X = A^-1 · B. Solving B^-1 · A gives exactly X.
    const relative = puzzle
      .defaultPattern()
      .applyAlg(targetAlg.invert().concat(sourceAlg));
    const orientation = orientations.find(({ alg }) =>
      relative
        .applyAlg(alg)
        .patternData.CENTERS.pieces.every((piece, index) => piece === index),
    );
    if (!orientation) throw new Error("中心朝向无效，请重新输入公式。");
    const normalized = relative.applyAlg(orientation.alg);
    if (normalized.isIdentical(solved)) result = orientation.alg;
    else {
      const search = await (searchLibrary ||= import(
        "../vendor/cubing/search/index.js"
      ).catch((error) => {
        searchLibrary = null;
        throw error;
      }));
      // relative · rotation · faceSolution = I, hence A · rotation · faceSolution = B.
      result = orientation.alg.concat(
        await search.experimentalSolve3x3x3IgnoringCenters(normalized),
      );
    }
  }
  if (!from.applyAlg(result).isIdentical(to))
    throw new Error("终态校验未通过，请重新求解。");
  return result;
}
