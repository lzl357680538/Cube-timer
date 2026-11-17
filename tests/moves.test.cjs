const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const load = (name) =>
  import(pathToFileURL(path.resolve(__dirname, "../" + name)));

test("inverse reverses order and inverts each move, including compact and Unicode input", async () => {
  const { invertAlgorithm } = await load("js/moves.js");
  assert.equal(invertAlgorithm("RUDR’"), "R D' U' R'");
  assert.equal(invertAlgorithm("r U2 x y’ M M2’"), "M2 M' y x' U2 r'");
  assert.equal(invertAlgorithm(""), "");
  assert.throws(() => invertAlgorithm("R ? U"));
});

test("algorithm followed by its inverse restores every piece and centre frame", async () => {
  const { invertAlgorithm, parseMoves } = await load("js/moves.js");
  const { puzzle } = await load("js/state-engine.js");
  const families = "U R F D L B u r f d l b x y z M E S".split(" ");
  let seed = 194;
  const random = (n) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed % n;
  };
  for (let i = 0; i < 32; i++) {
    const alg = Array.from(
      { length: 30 },
      () => families[random(families.length)] + ["", "'", "2"][random(3)],
    ).join(" ");
    const inverse = invertAlgorithm(alg);
    assert.ok(
      puzzle
        .defaultPattern()
        .applyAlg(alg)
        .applyAlg(inverse)
        .isIdentical(puzzle.defaultPattern()),
    );
    assert.equal(invertAlgorithm(inverse), parseMoves(alg).join(" "));
  }
});
