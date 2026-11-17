// Prepare browser-native modules, including worker imports, without a CDN or bundler.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const dest = path.join(root, "vendor");
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(
  path.join(root, "node_modules/cubing/dist/lib/cubing"),
  path.join(dest, "cubing"),
  { recursive: true },
);
fs.mkdirSync(path.join(dest, "three"), { recursive: true });
fs.copyFileSync(
  path.join(
    root,
    "node_modules/cubing/node_modules/three/build/three.module.min.js",
  ),
  path.join(dest, "three/three.module.js"),
);
fs.copyFileSync(
  path.join(root, "node_modules/cubing/node_modules/three/LICENSE"),
  path.join(dest, "three/LICENSE"),
);
fs.cpSync(
  path.join(root, "node_modules/random-uint-below/dist/esm"),
  path.join(dest, "random"),
  { recursive: true },
);
fs.mkdirSync(path.join(dest, "legacy-three"), { recursive: true });
fs.copyFileSync(
  path.join(root, "node_modules/three/build/three.min.js"),
  path.join(dest, "legacy-three/three.min.js"),
);
fs.copyFileSync(
  path.join(root, "node_modules/three/examples/js/controls/OrbitControls.js"),
  path.join(dest, "legacy-three/OrbitControls.js"),
);
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith(".js")) {
      const text = fs
        .readFileSync(file, "utf8")
        .replace(
          /(["'])(three\/src\/[^"']+|random-uint-below)\1/g,
          (match, quote, spec) => {
            const target =
              spec === "random-uint-below"
                ? path.join(dest, "random/index.js")
                : path.join(dest, "three/three.module.js");
            let relative = path
              .relative(path.dirname(file), target)
              .split(path.sep)
              .join("/");
            if (!relative.startsWith(".")) relative = "./" + relative;
            return quote + relative + quote;
          },
        );
      fs.writeFileSync(file, text);
    }
  }
}
walk(path.join(dest, "cubing"));
for (const [pkg, name] of [
  ["cubing", "LICENSE.md"],
  ["three", "LICENSE"],
  ["random-uint-below", "LICENSE.md"],
]) {
  const file = path.join(root, "node_modules", pkg, name);
  if (fs.existsSync(file))
    fs.copyFileSync(
      file,
      path.join(dest, pkg.replaceAll("/", "-") + "-LICENSE.txt"),
    );
}
console.log("Local rendering and solver modules ready.");
