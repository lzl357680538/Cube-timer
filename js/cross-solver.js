import { parseMoves } from "./moves.js";

export const MOVES = [
  "R",
  "R'",
  "R2",
  "L",
  "L'",
  "L2",
  "U",
  "U'",
  "U2",
  "D",
  "D'",
  "D2",
  "F",
  "F'",
  "F2",
  "B",
  "B'",
  "B2",
];
const CYCLES = [
  [1, 10, 5, 9],
  [3, 8, 7, 11],
  [0, 3, 2, 1],
  [4, 5, 6, 7],
  [0, 9, 4, 8],
  [2, 11, 6, 10],
];
export const SETUPS = {
  white: ["x2", "x2 y", "x2 y2", "x2 y'"],
  yellow: ["", "y", "y2", "y'"],
  green: ["x'", "x' y", "x' y2", "x' y'"],
  blue: ["x", "x y", "x y2", "x y'"],
  red: ["z", "z y", "z y2", "z y'"],
  orange: ["z'", "z' y", "z' y2", "z' y'"],
};
const ROTATIONS = {
  x: { U: "B", F: "U", D: "F", B: "D", R: "R", L: "L" },
  "x'": { U: "F", F: "D", D: "B", B: "U", R: "R", L: "L" },
  x2: { U: "D", F: "B", D: "U", B: "F", R: "R", L: "L" },
  y: { U: "U", D: "D", F: "L", R: "F", B: "R", L: "B" },
  "y'": { U: "U", D: "D", F: "R", R: "B", B: "L", L: "F" },
  y2: { U: "U", D: "D", F: "B", R: "L", B: "F", L: "R" },
  z: { U: "R", F: "F", D: "L", B: "B", R: "D", L: "U" },
  "z'": { U: "L", F: "F", D: "R", B: "B", R: "U", L: "D" },
};
const POSITION_COUNT = 12 * 11 * 10 * 9;
const STATE_COUNT = POSITION_COUNT * 16;

// Four labelled edge positions and four orientation bits describe a cross.
function rank(a, b, c, d) {
  return (
    ((a * 11 + b - (a < b)) * 10 + c - (a < c) - (b < c)) * 9 +
    d -
    (a < d) -
    (b < d) -
    (c < d)
  );
}
export const CROSS_GOAL = rank(4, 5, 6, 7) << 4;
const inverse = (move) =>
  move % 3 === 0 ? move + 1 : move % 3 === 1 ? move - 1 : move;
const moveCost = (move) => (move < 6 ? -1 : move >= 12 ? 100 : 0);

export function mapScramble(scramble, setup) {
  const rotations = setup.split(" ").filter(Boolean);
  return parseMoves(scramble)
    .map((move) => {
      let face = move[0];
      for (const rotation of rotations) face = ROTATIONS[rotation][face];
      return face + move.slice(1);
    })
    .join(" ");
}

export class CrossSolver {
  initialize() {
    if (this.distances) return;
    const positions = new Uint16Array(POSITION_COUNT * 18);
    const flips = new Uint8Array(POSITION_COUNT * 18);
    const edgePositions = new Uint8Array(18 * 12);
    const edgeFlips = new Uint8Array(18 * 12);
    for (let move = 0; move < 18; move++) {
      const cycle = CYCLES[Math.floor(move / 3)];
      const turns = [1, 3, 2][move % 3];
      for (let p = 0; p < 12; p++) {
        const index = cycle.indexOf(p);
        edgePositions[move * 12 + p] =
          index < 0 ? p : cycle[(index + turns) % 4];
        edgeFlips[move * 12 + p] = Number(
          move >= 12 && index >= 0 && turns % 2 === 1,
        );
      }
    }
    for (let a = 0; a < 12; a++)
      for (let b = 0; b < 12; b++) {
        if (a === b) continue;
        for (let c = 0; c < 12; c++) {
          if (a === c || b === c) continue;
          for (let d = 0; d < 12; d++) {
            if (a === d || b === d || c === d) continue;
            const base = rank(a, b, c, d) * 18;
            for (let move = 0; move < 18; move++) {
              const m = move * 12;
              positions[base + move] = rank(
                edgePositions[m + a],
                edgePositions[m + b],
                edgePositions[m + c],
                edgePositions[m + d],
              );
              flips[base + move] =
                edgeFlips[m + a] |
                (edgeFlips[m + b] << 1) |
                (edgeFlips[m + c] << 2) |
                (edgeFlips[m + d] << 3);
            }
          }
        }
      }

    // Reverse BFS visits all 190,080 states, storing exact HTM distances and
    // the preferred next move among shortest paths (the old F/B tie-breaker).
    const distances = new Uint8Array(STATE_COUNT).fill(255);
    const bestMoves = new Uint8Array(STATE_COUNT).fill(255);
    const costs = new Int16Array(STATE_COUNT).fill(32767);
    const queue = new Uint32Array(STATE_COUNT);
    distances[CROSS_GOAL] = costs[CROSS_GOAL] = 0;
    queue[0] = CROSS_GOAL;
    let tail = 1;
    for (let head = 0; head < tail; head++) {
      const state = queue[head],
        base = (state >>> 4) * 18,
        orientation = state & 15;
      const distance = distances[state] + 1;
      for (let move = 0; move < 18; move++) {
        const next =
          (positions[base + move] << 4) | (orientation ^ flips[base + move]);
        if (distances[next] === 255) {
          distances[next] = distance;
          queue[tail++] = next;
        }
        if (distances[next] !== distance) continue;
        const cost = costs[state] + moveCost(move);
        if (cost < costs[next]) {
          costs[next] = cost;
          bestMoves[next] = inverse(move);
        }
      }
    }
    if (tail !== STATE_COUNT) throw new Error("Cross 距离表初始化失败。");
    Object.assign(this, { positions, flips, bestMoves, distances });
  }

  transition(state, move) {
    const index = (state >>> 4) * 18 + move;
    return (this.positions[index] << 4) | ((state & 15) ^ this.flips[index]);
  }

  stateFor(scramble) {
    const moves = parseMoves(scramble);
    this.initialize();
    let state = CROSS_GOAL;
    for (const move of moves)
      state = this.transition(state, MOVES.indexOf(move));
    return state;
  }

  solve(scramble) {
    let state = this.stateFor(scramble);
    const solution = [];
    while (state !== CROSS_GOAL) {
      const move = this.bestMoves[state];
      solution.push(MOVES[move]);
      state = this.transition(state, move);
    }
    return solution.join(" ");
  }

  solveBestResult(scramble, color = "white") {
    parseMoves(scramble);
    let best;
    for (const setup of SETUPS[color] || SETUPS.white) {
      const algorithm = this.solve(mapScramble(scramble, setup));
      const tokens = algorithm ? algorithm.split(" ") : [];
      const score = tokens.reduce(
        (sum, move) => sum + moveCost(MOVES.indexOf(move)),
        0,
      );
      if (
        !best ||
        tokens.length < best.length ||
        (tokens.length === best.length && score < best.score)
      )
        best = { setup, algorithm, length: tokens.length, score };
    }
    return best;
  }

  solveBest(scramble, color) {
    const { setup, algorithm } = this.solveBestResult(scramble, color);
    return [setup, algorithm || "(已完成)"].filter(Boolean).join("   ");
  }
}
