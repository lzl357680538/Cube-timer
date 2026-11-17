const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const engine = () =>
  import(pathToFileURL(path.resolve(__dirname, "../js/state-engine.js")));
test("parse histories and reject unsupported or oversized input", async () => {
  const { parseMoves } = await engine();
  assert.deepEqual(parseMoves(" R  U2  F2'\nB' "), ["R", "U2", "F2", "B'"]);
  assert.deepEqual(parseMoves(""), []);
  for (const input of [
    "R U garbage",
    "x",
    "(R U)3",
    "R3",
    Array(502).join("R "),
  ])
    assert.throws(() => parseMoves(input));
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
