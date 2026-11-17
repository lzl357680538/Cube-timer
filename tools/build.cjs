const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
execFileSync(process.execPath, [path.join(__dirname, "prepare.cjs")], {
  stdio: "inherit",
});
// Only replace this project's generated directory; reject redirected paths.
if (path.relative(root, output) !== "dist")
  throw new Error("Invalid output path");
if (fs.existsSync(output)) {
  if (fs.realpathSync(output) !== output)
    throw new Error("Output must not be a symlink");
  fs.rmSync(output, { recursive: true, force: true });
}
fs.mkdirSync(output);
fs.writeFileSync(path.join(output, ".nojekyll"), "");
for (const file of ["index.html", "sq1-3d.html", "_headers"]) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
for (const directory of ["css", "js"]) {
  fs.cpSync(path.join(root, directory), path.join(output, directory), {
    recursive: true,
    filter: (source) => !source.endsWith(".bak"),
  });
}
for (const directory of ["cubing", "random", "legacy-three"]) {
  fs.cpSync(
    path.join(root, "vendor", directory),
    path.join(output, "vendor", directory),
    {
      recursive: true,
      filter: (source) => !source.endsWith(".d.ts"),
    },
  );
}
fs.mkdirSync(path.join(output, "vendor/three"), { recursive: true });
for (const file of ["three.module.js", "LICENSE"]) {
  fs.copyFileSync(
    path.join(root, "vendor/three", file),
    path.join(output, "vendor/three", file),
  );
}
for (const file of fs.readdirSync(path.join(root, "vendor"))) {
  if (file.endsWith("-LICENSE.txt"))
    fs.copyFileSync(
      path.join(root, "vendor", file),
      path.join(output, "vendor", file),
    );
}
console.log("Static site ready: " + output);
