const { test } = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const load = (file) =>
  import(pathToFileURL(path.resolve(__dirname, "../js", file)));
const modules = Promise.all([
  load("cross-solver.js"),
  load("xcross-solver.js"),
  load("state-engine.js"),
]);
const colors = ["white", "yellow", "green", "blue", "red", "orange"];

function scrambles(count) {
  let seed = 357680538;
  const random = (n) => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return Math.floor(((seed >>> 0) / 4294967296) * n);
  };
  const faces = ["U", "R", "F", "D", "L", "B"],
    suffixes = ["", "'", "2"];
  return Array.from({ length: count }, () => {
    const moves = [];
    for (let i = 0; i < 20; i++) {
      let face;
      do {
        face = faces[random(6)];
      } while (face === moves.at(-1)?.[0]);
      moves.push(face + suffixes[random(3)]);
    }
    return moves.join(" ");
  });
}

function assertSolved(puzzle, scramble, result, xcross = false) {
  const expected = puzzle.defaultPattern().applyAlg(result.setup).patternData;
  const actual = puzzle
    .defaultPattern()
    .applyAlg(`${scramble} ${result.setup} ${result.algorithm}`).patternData;
  const check = (orbit, position) => {
    assert.equal(
      actual[orbit].pieces[position],
      expected[orbit].pieces[position],
    );
    assert.equal(
      actual[orbit].orientation[position],
      expected[orbit].orientation[position],
    );
  };
  for (const edge of [4, 5, 6, 7]) check("EDGES", edge);
  if (xcross) {
    check("EDGES", 8);
    check("CORNERS", 4);
  }
}

test("cross table gives exact distances for all 190080 states", async () => {
  const [{ CrossSolver, CROSS_GOAL }] = await modules;
  const solver = new CrossSolver();
  solver.initialize();
  let maximum = 0,
    zeroes = 0;
  for (let state = 0; state < solver.distances.length; state++) {
    const distance = solver.distances[state];
    assert.notEqual(distance, 255);
    maximum = Math.max(maximum, distance);
    if (!distance) zeroes++;
    else
      assert.equal(
        solver.distances[solver.transition(state, solver.bestMoves[state])],
        distance - 1,
      );
    // A distance function with a descending path and this bound on every edge
    // cannot underestimate or overestimate any state's shortest solution.
    for (let move = 0; move < 18; move++)
      assert.ok(
        Math.abs(solver.distances[solver.transition(state, move)] - distance) <=
          1,
      );
  }
  assert.equal(solver.distances.length, 190080);
  assert.equal(maximum, 8);
  assert.equal(zeroes, 1);
  assert.equal(solver.distances[CROSS_GOAL], 0);
});

test("six-color cross and XCross solutions agree with an independent full cube model", async () => {
  const [{ CrossSolver }, { solveXCrossResult }, { puzzle }] = await modules;
  const solver = new CrossSolver();
  const cases = ["", "U", "R U R'", "D", "R U R' U' F2 D L2", ...scrambles(36)];
  for (const scramble of cases)
    for (const color of colors) {
      const cross = solver.solveBestResult(scramble, color);
      assertSolved(puzzle, scramble, cross);
      assert.ok(cross.length <= 8);
      const xcross = solveXCrossResult(solver, scramble, color);
      assertSolved(puzzle, scramble, xcross, true);
      assert.ok(xcross.length >= cross.length);
    }
});

test("XCross is already complete or finds the minimum on shallow cases", async () => {
  const [{ CrossSolver, MOVES }, { solveXCrossResult }, { puzzle }] =
    await modules;
  const solver = new CrossSolver();
  assert.equal(solveXCrossResult(solver, "", "yellow").length, 0);
  assert.equal(solveXCrossResult(solver, "U U2", "yellow").length, 0);
  for (const scramble of ["D", "R F", "R D F", "L2 D2 R", "B R2 D"]) {
    const result = solveXCrossResult(solver, scramble, "yellow");
    assertSolved(puzzle, scramble, result, true);
    const start = puzzle.defaultPattern().applyAlg(scramble);
    const slots = [
      [4, 8],
      [5, 9],
      [6, 11],
      [7, 10],
    ];
    const goal = (pattern) => {
      const { EDGES, CORNERS } = pattern.patternData;
      return (
        [4, 5, 6, 7].every(
          (p) => EDGES.pieces[p] === p && EDGES.orientation[p] === 0,
        ) &&
        slots.some(
          ([c, e]) =>
            CORNERS.pieces[c] === c &&
            CORNERS.orientation[c] === 0 &&
            EDGES.pieces[e] === e &&
            EDGES.orientation[e] === 0,
        )
      );
    };
    function shorter(pattern, remaining) {
      if (goal(pattern)) return true;
      if (!remaining) return false;
      return MOVES.some((move) =>
        shorter(pattern.applyMove(move), remaining - 1),
      );
    }
    if (result.length)
      assert.equal(shorter(start, result.length - 1), false, scramble);
  }
});

test("cross input validation rejects invalid notation instead of silently ignoring it", async () => {
  const [{ CrossSolver }, { solveXCrossResult }] = await modules;
  const solver = new CrossSolver();
  for (const input of ["R invalid", "x", "Rw", "R3", "R ".repeat(501)]) {
    assert.throws(() => solver.solveBest(input));
    assert.throws(() => solveXCrossResult(solver, input));
  }
  assert.equal(solver.solve("\nR2'\tR2 "), "");
});
