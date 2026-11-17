// ES modules and solver Workers must be served over HTTP, not file://.
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn, execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");

function probe(port, expected) {
  return new Promise((resolve) => {
    const request = http.get(
      { hostname: "127.0.0.1", port, path: "/index.html" },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
          if (body.length > expected.length + 1024) response.destroy();
        });
        response.on("end", () =>
          resolve(
            response.statusCode === 200 && body === expected
              ? "ready"
              : "occupied",
          ),
        );
        response.on("error", () => resolve("occupied"));
        response.on("close", () => resolve("occupied"));
      },
    );
    request.setTimeout(1000, () => request.destroy());
    request.on("error", (error) =>
      resolve(error.code === "ECONNREFUSED" ? "free" : "occupied"),
    );
  });
}

async function launch({ openBrowser = true, firstPort = 8765 } = {}) {
  if (!fs.existsSync(path.join(root, "vendor/cubing/twisty/index.js"))) {
    if (!fs.existsSync(path.join(root, "node_modules/cubing")))
      throw new Error(
        "Missing dependencies. Run npm ci in the project folder first.",
      );
    execFileSync(process.execPath, [path.join(__dirname, "prepare.cjs")], {
      cwd: root,
      stdio: "inherit",
      windowsHide: true,
    });
  }
  const expected = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (let port = firstPort; port < firstPort + 10; port++) {
    let state = await probe(port, expected);
    if (state === "occupied") continue;
    if (state === "free") {
      const child = spawn(
        process.execPath,
        [path.join(__dirname, "serve.cjs")],
        {
          cwd: root,
          env: { ...process.env, PORT: String(port) },
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        },
      );
      await new Promise((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
      child.unref();
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        state = await probe(port, expected);
        if (state !== "free") break;
      }
    }
    if (state !== "ready") continue;
    const url = `http://localhost:${port}/`;
    if (openBrowser) {
      const browser = spawn("cmd.exe", ["/d", "/c", "start", "", url], {
        windowsHide: true,
        stdio: "ignore",
      });
      await new Promise((resolve, reject) => {
        browser.once("error", reject);
        browser.once("exit", (code) =>
          code === 0 ? resolve() : reject(new Error(`Could not open ${url}`)),
        );
      });
    }
    console.log(`Cube Space: ${url}`);
    return url;
  }
  throw new Error(
    "Could not start the local server. Try npm start in the project folder.",
  );
}

module.exports = { launch };
if (require.main === module)
  launch({ openBrowser: !process.argv.includes("--no-open") }).catch(
    (error) => {
      console.error(error.message);
      process.exitCode = 1;
    },
  );
