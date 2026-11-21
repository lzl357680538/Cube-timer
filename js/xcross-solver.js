import { cube3x3x3 } from "../vendor/cubing/puzzles/index.js";
import { CROSS_GOAL, MOVES, SETUPS, mapScramble } from "./cross-solver.js";
import { parseFaceMoves as parseMoves } from "./moves.js";

const puzzle = await cube3x3x3.kpuzzle();
const cornerMoves = new Uint8Array(24 * 18);
const edgeMoves = new Uint8Array(24 * 18);
for (let move = 0; move < 18; move++) {
  const data = puzzle.defaultPattern().applyMove(MOVES[move]).patternData;
  for (const [orbit, orientations, table] of [
    ["CORNERS", 3, cornerMoves],
    ["EDGES", 2, edgeMoves],
  ]) {
    for (let dest = 0; dest < data[orbit].pieces.length; dest++) {
      const source = data[orbit].pieces[dest];
      for (let orientation = 0; orientation < orientations; orientation++)
        table[(source * orientations + orientation) * 18 + move] =
          dest * orientations +
          ((orientation + data[orbit].orientation[dest]) % orientations);
    }
  }
}
const CORNER_GOAL = 4 * 3,
  EDGE_GOAL = 8 * 2;
const pairDistances = new Uint8Array(24 * 24).fill(255);
const queue = [CORNER_GOAL * 24 + EDGE_GOAL];
pairDistances[queue[0]] = 0;
for (let head = 0; head < queue.length; head++) {
  const state = queue[head],
    corner = Math.floor(state / 24),
    edge = state % 24;
  for (let move = 0; move < 18; move++) {
    const next =
      cornerMoves[corner * 18 + move] * 24 + edgeMoves[edge * 18 + move];
    if (pairDistances[next] !== 255) continue;
    pairDistances[next] = pairDistances[state] + 1;
    queue.push(next);
  }
}

export function solveXCrossResult(solver, scramble, color = "white") {
  parseMoves(scramble);
  solver.initialize();
  // Each y orientation puts a different F2L slot at front-right. Search all
  // four at each depth, so the first solution is globally shortest for any pair.
  const starts = (SETUPS[color] || SETUPS.white).map((setup) => {
    const mapped = mapScramble(scramble, setup);
    let corner = CORNER_GOAL,
      edge = EDGE_GOAL;
    for (const token of parseMoves(mapped)) {
      const move = MOVES.indexOf(token);
      corner = cornerMoves[corner * 18 + move];
      edge = edgeMoves[edge * 18 + move];
    }
    const cross = solver.stateFor(mapped);
    return { setup, cross, corner, edge };
  });
  const { distances, positions, flips } = solver;
  const lowerBound = (cross, corner, edge) =>
    Math.max(distances[cross], pairDistances[corner * 24 + edge]);
  starts.sort(
    (a, b) =>
      lowerBound(a.cross, a.corner, a.edge) -
      lowerBound(b.cross, b.corner, b.edge),
  );
  const path = [];
  let nodes = 0;
  function search(cross, corner, edge, remaining, lastFace) {
    nodes++;
    if (lowerBound(cross, corner, edge) > remaining) return false;
    if (!remaining)
      return (
        cross === CROSS_GOAL && corner === CORNER_GOAL && edge === EDGE_GOAL
      );
    const base = (cross >>> 4) * 18,
      orientation = cross & 15;
    for (let face = 0; face < 6; face++) {
      if (face === lastFace || (lastFace === (face ^ 1) && face < lastFace))
        continue;
      for (let move = face * 3; move < face * 3 + 3; move++) {
        const nextCross =
          (positions[base + move] << 4) | (orientation ^ flips[base + move]);
        const nextCorner = cornerMoves[corner * 18 + move],
          nextEdge = edgeMoves[edge * 18 + move];
        if (lowerBound(nextCross, nextCorner, nextEdge) >= remaining) continue;
        path.push(move);
        if (search(nextCross, nextCorner, nextEdge, remaining - 1, face))
          return true;
        path.pop();
      }
    }
    return false;
  }
  const minimum = lowerBound(starts[0].cross, starts[0].corner, starts[0].edge);
  for (let limit = minimum; limit <= 20; limit++) {
    for (const start of starts) {
      if (search(start.cross, start.corner, start.edge, limit, -1)) {
        const algorithm = path.map((move) => MOVES[move]).join(" ");
        return { setup: start.setup, algorithm, length: path.length, nodes };
      }
    }
  }
  throw new Error("未找到 XCross 解。");
}

export function solveXCross(solver, scramble, color) {
  const { setup, algorithm } = solveXCrossResult(
    solver,
    scramble,
    color,
  );
  return [setup, algorithm].filter(Boolean).join(" ");
}
