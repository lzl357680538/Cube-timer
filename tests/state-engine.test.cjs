const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const engine = () =>
  import(pathToFileURL(path.resolve(__dirname, "../js/state-engine.js")));
test("parse face, wide, rotation and slice notation; reject malformed or oversized input", async () => {
  const { parseMoves } = await engine();
  assert.deepEqual(parseMoves(" R  U2  F2'\nB' "), ["R", "U2", "F2", "B'"]);
  assert.deepEqual(parseMoves(""), []);
  assert.deepEqual(parseMoves("RUDR’"), ["R", "U", "D", "R'"]);
  assert.deepEqual(parseMoves("rU2Rw’ x y' z2 M M′ M2 E S'"), [
    "r",
    "U2",
    "r'",
    "x",
    "y'",
    "z2",
    "M",
    "M'",
    "M2",
    "E",
    "S'",
  ]);
  for (const input of [
    "R U garbage",
    "(R U)3",
    "R3",
    "R22",
    "R''",
    "m",
    "X",
    "3Rw",
    Array(502).join("R "),
  ])
    assert.throws(() => parseMoves(input));
});

test("solver handles wide/slice turns and different centre frames", async () => {
  const { solveTransition, puzzle } = await engine();
  const pairs = [
    ["x", ""],
    ["", "y' z2"],
    ["M", ""],
    ["M2", "M'"],
    ["u r f d l b", "M E S"],
    ["x r U r' U' y M2 U M2 U2", "z' R U2 F'"],
    ["r U R' U' r' F R F'", "M2 U M2 U2 M2 U M2"],
    ["Rw U Rw' U' x'", "Fw2 D Lw2 y"],
  ];
  for (const [source, target] of pairs) {
    const result = await solveTransition(source, target);
    assert.ok(
      puzzle
        .defaultPattern()
        .applyAlg(source)
        .applyAlg(result)
        .isIdentical(puzzle.defaultPattern().applyAlg(target)),
      `${source} -> ${target}: ${result}`,
    );
  }
  // Check all 24 centre frames independently, including rotation-only results.
  const frames = [""];
  const seen = new Set([
    puzzle.defaultPattern().patternData.CENTERS.pieces.join(","),
  ]);
  for (let i = 0; i < frames.length; i++)
    for (const move of ["x", "y", "z"]) {
      const alg = `${frames[i]} ${move}`.trim();
      const key = puzzle
        .defaultPattern()
        .applyAlg(alg)
        .patternData.CENTERS.pieces.join(",");
      if (!seen.has(key)) {
        seen.add(key);
        frames.push(alg);
      }
    }
  assert.equal(frames.length, 24);
  for (const source of frames) {
    const result = await solveTransition(source, "");
    assert.ok(
      puzzle
        .defaultPattern()
        .applyAlg(source)
        .applyAlg(result)
        .isIdentical(puzzle.defaultPattern()),
    );
  }
});
test("equivalent states need no moves", async () => {
  const { solveTransition } = await engine();
  assert.equal((await solveTransition("", "")).toString(), "");
  assert.equal((await solveTransition("R R R R", "")).toString(), "");
  assert.equal((await solveTransition("R U R'", "R U R'")).toString(), "");
});
test("solver maps source to target including noncommuting histories", async () => {
  const { solveTransition, puzzle } = await engine();
  const pairs = [
    ["R", ""],
    ["", "F2 D"],
    ["R U R' U'", "F2 D L2"],
    ["R U", "U R"],
  ];
  let seed = 23;
  const faces = ["U", "R", "F", "D", "L", "B"],
    suffix = ["", "'", "2"];
  const rand = (n) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed % n;
  };
  const scramble = () =>
    Array.from({ length: 20 }, () => faces[rand(6)] + suffix[rand(3)]).join(
      " ",
    );
  for (let i = 0; i < 8; i++) pairs.push([scramble(), scramble()]);
  for (const [source, target] of pairs) {
    const result = await solveTransition(source, target);
    assert.ok(
      puzzle
        .defaultPattern()
        .applyAlg(source)
        .applyAlg(result)
        .isIdentical(puzzle.defaultPattern().applyAlg(target)),
      `${source} -> ${target}`,
    );
  }
});
